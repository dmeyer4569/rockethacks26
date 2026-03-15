# EconSim: Multi-Agent Economic Policy Deliberation Engine

## Full Technical Specification & 20-Hour Hackathon Plan

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  Dashboard: policy input, live rounds, scoring viz       │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                 BACKEND (Python / FastAPI)                │
│                                                          │
│  ┌─────────────┐      ┌──────────────┐     ┌──────────────┐  │
│  │  Mediator    │     │  Agent Mgr   │     │  Scoring     │  │
│  │  Controller  │──▶ │  (5 agents)  │──▶  │  Engine      │  │
│  └──────┬───── ┘      └──────────────┘     └──────────────┘  │
│         │                                                │
│  ┌──────▼──────┐   ┌──────────────┐                      │
│  │  Round Mgr  │   │  Gemini API  │                      │
│  │  (loop ctrl)│   │  Client      │                      │
│  └─────────────┘   └──────────────┘                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  MongoDB Atlas                           │
│  Collections: cases, rounds, agents, ratings, policies   │
└─────────────────────────────────────────────────────────┘
```

### Why This Stack

| Choice          | Reason                                                       |
|-----------------|--------------------------------------------------------------|
| **Python**      | Fastest prototyping, best AI SDK support, hackathon-optimal  |
| **FastAPI**     | Async-native (critical for parallel agent calls), auto-docs  |
| **Gemini API**  | Required for prize track; `google-genai` Python SDK is solid |
| **MongoDB Atlas**| Required for prize track; flexible schema fits evolving data |
| **React + Vite**| Fast scaffold, great charting libs (Recharts), live updates  |

---

## 2. The Gemini Agent System — How It Works

You are NOT using an "AI Agents framework" (no LangChain, no CrewAI). You are making **direct Gemini API calls with carefully structured prompts**. This is simpler, faster to build, and gives you full control. Each "agent" is just a Gemini API call with a different system prompt.

### Model Choice

Use **`gemini-2.0-flash`** (or `gemini-1.5-flash` if 2.0 isn't available on your key). Reasons:
- Fast inference (you're making 5+ parallel calls per round)
- Cheap / high rate limits on free tier
- Sufficient reasoning for this task
- Save `gemini-pro` for the mediator summarization if needed

### Agent Prompt Architecture

Each agent gets a system prompt like:

```
You are a simulated economic stakeholder participating in a policy
deliberation. You have been assigned the following identity:

IDENTITY: {persona_name}
BACKGROUND: {persona_description}
ECONOMIC PRIORITIES: {priorities}
RISK TOLERANCE: {risk_level}
VALUES: {values}

You must respond ONLY from this perspective. You are evaluating an
economic policy and suggesting changes that would benefit someone
in your position. Be specific and concise.
```

For the **proposal phase**, append:
```
Given the following policy, suggest 1-2 specific changes (max 2
sentences) that would make this policy more favorable for someone
in your position. Be concrete — reference specific numbers,
thresholds, or mechanisms where possible.

POLICY:
{current_policy_text}

SUPPORTING DATA:
{case_data}

Respond with ONLY your suggested changes in this JSON format:
{
  "changes": "Your 1-2 sentence change",
  "reasoning": "Brief justification (1 sentence)"
}
```

For the **rating phase**, append:
```
Rate the following proposed policy change on a scale from -1.00
to 1.00 (in 0.01 increments), where:
  -1.00 = catastrophically harmful to your interests
   0.00 = neutral / no impact
   1.00 = maximally beneficial to your interests

ORIGINAL POLICY:
{base_policy}

PROPOSED CHANGE:
{proposed_change}

Respond with ONLY this JSON:
{
  "score": <number between -1.00 and 1.00>,
  "justification": "One sentence explaining your rating"
}
```

### Parallel Execution

Use Python's `asyncio.gather()` to run all 5 agent calls simultaneously:

```python
import asyncio
from google import genai

client = genai.Client(api_key=GEMINI_API_KEY)

async def call_agent(persona, prompt):
    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "system_instruction": build_system_prompt(persona),
            "response_mime_type": "application/json",
        }
    )
    return json.loads(response.text)

# Run all 5 agents in parallel
results = await asyncio.gather(*[
    call_agent(personas[i], proposal_prompt)
    for i in range(5)
])
```

---

## 3. Persona System

### Persona Pool (randomize from this list each round)

Store these in MongoDB so you can expand them. Each persona has:

```json
{
  "name": "Blue Collar Manufacturing Worker",
  "description": "Works at an auto parts factory, 15 years experience. Union member. Two kids in public school. Household income $55K.",
  "priorities": ["job security", "wages", "healthcare costs", "trade protection"],
  "risk_tolerance": "low",
  "values": ["stability", "fairness", "community", "hard work"]
}
```

**Starter personas (build at least 12-15 so 5 can be randomly chosen each round):**

1. Blue collar factory worker
2. Tech startup CEO
3. Small business owner (restaurant)
4. Single parent / teacher
5. Retired pensioner on fixed income
6. Commercial real estate developer
7. Recent college grad with student debt
8. Agricultural farmer
9. Healthcare administrator
10. Gig economy / freelance worker
11. Investment banker
12. Local government official
13. Non-profit director
14. Immigrant small business owner
15. Military veteran transitioning to civilian life

### Randomization per round

Each generation, randomly sample 5 from the pool. This prevents any single persona from dominating across rounds and ensures the "surviving" policy has been tested against diverse stakeholders.

---

## 4. Scoring Engine — The Math

### Consensus-Adjusted Score (CAS)

For each proposed policy change, 4 agents rate it (the proposer is excluded). The score is:

```
CAS = mean(ratings) - λ × std_dev(ratings)
```

Where:
- `mean(ratings)` = average of the 4 ratings (-1 to 1)
- `std_dev(ratings)` = standard deviation of the 4 ratings
- `λ` (lambda) = variance penalty weight. **Start with 0.5, tune from there.**

### Why This Works

| Scenario                    | Ratings              | Mean  | StdDev | CAS (λ=0.5) |
|-----------------------------|----------------------|-------|--------|--------------|
| Strong consensus positive   | 0.7, 0.8, 0.7, 0.6  | 0.70  | 0.07   | **0.665**    |
| Polarized but high sum      | 1.0, 1.0, -0.5, 0.5  | 0.50  | 0.56   | **0.220**    |
| Weak consensus positive     | 0.3, 0.4, 0.3, 0.2  | 0.30  | 0.07   | **0.265**    |
| Universal mild approval     | 0.5, 0.5, 0.5, 0.5  | 0.50  | 0.00   | **0.500**    |

The universally mild approval beats the polarized-but-high-sum scenario. This is exactly what you want.

### Termination Criteria

The simulation stops when ANY of these conditions are met:

1. **Convergence:** CAS >= 0.60 AND std_dev <= 0.15 (strong consensus approval)
2. **Max rounds:** 10 rounds reached (prevent infinite loops)
3. **Stagnation:** CAS hasn't improved by more than 0.02 for 3 consecutive rounds

These thresholds map to your "3.0 with low variance" idea but on a normalized -1 to 1 scale. A CAS of 0.60 means broad approval with tight agreement. Tune after testing.

### Implementation

```python
import numpy as np

def calculate_cas(ratings: list[float], lam: float = 0.5) -> dict:
    arr = np.array(ratings)
    mean = float(np.mean(arr))
    std = float(np.std(arr))
    cas = mean - lam * std
    return {
        "cas": round(cas, 4),
        "mean": round(mean, 4),
        "std_dev": round(std, 4),
        "ratings": ratings,
        "converged": cas >= 0.60 and std <= 0.15
    }

def select_winner(proposals: list[dict]) -> dict:
    """Each proposal dict has a 'scores' field with CAS results."""
    return max(proposals, key=lambda p: p["scores"]["cas"])
```

---

## 5. MongoDB Atlas — Database Schema

### Collections

**`cases`** — The economic scenarios/policies to deliberate on
```json
{
  "_id": ObjectId,
  "title": "Federal Minimum Wage Increase Proposal",
  "description": "Proposal to raise the federal minimum wage from $7.25 to $15/hr over 3 years",
  "initial_policy": "The federal minimum wage shall increase to $15/hour, phased: $10 in Year 1, $12.50 in Year 2, $15 in Year 3.",
  "supporting_data": {
    "current_min_wage": 7.25,
    "median_household_income": 74580,
    "cpi_increase_5yr": "18.2%",
    "states_above_federal": 30,
    "affected_workers_pct": "1.1%"
  },
  "category": "labor",
  "created_at": ISODate
}
```

**`simulations`** — A full run of the deliberation process
```json
{
  "_id": ObjectId,
  "case_id": ObjectId,
  "status": "running" | "converged" | "max_rounds" | "stagnated",
  "config": {
    "num_agents": 5,
    "lambda": 0.5,
    "convergence_threshold": 0.60,
    "max_rounds": 10
  },
  "current_round": 3,
  "final_policy": "...",
  "final_cas": 0.64,
  "created_at": ISODate,
  "completed_at": ISODate
}
```

**`rounds`** — Each generation/iteration within a simulation
```json
{
  "_id": ObjectId,
  "simulation_id": ObjectId,
  "round_number": 1,
  "base_policy": "The current policy text going into this round...",
  "personas_used": [
    {
      "agent_index": 0,
      "persona_id": ObjectId,
      "persona_name": "Blue Collar Worker"
    }
  ],
  "proposals": [
    {
      "agent_index": 0,
      "change_text": "Phase the increase over 5 years instead of 3",
      "reasoning": "Rapid increases risk layoffs in manufacturing",
      "ratings": [
        {"rater_index": 1, "score": 0.4, "justification": "..."},
        {"rater_index": 2, "score": 0.6, "justification": "..."},
        {"rater_index": 3, "score": 0.3, "justification": "..."},
        {"rater_index": 4, "score": 0.5, "justification": "..."}
      ],
      "cas_result": {
        "cas": 0.42,
        "mean": 0.45,
        "std_dev": 0.11
      }
    }
  ],
  "winning_proposal_index": 2,
  "winning_cas": 0.55,
  "created_at": ISODate
}
```

**`personas`** — The persona pool
```json
{
  "_id": ObjectId,
  "name": "Tech Startup CEO",
  "description": "Founded a SaaS company 3 years ago, 45 employees...",
  "priorities": ["innovation", "low regulation", "talent acquisition"],
  "risk_tolerance": "high",
  "values": ["growth", "disruption", "meritocracy"]
}
```

### Indexes to Create

```javascript
// In MongoDB Atlas UI or via pymongo
db.rounds.createIndex({ "simulation_id": 1, "round_number": 1 })
db.simulations.createIndex({ "case_id": 1, "status": 1 })
db.personas.createIndex({ "name": 1 }, { unique: true })
```

---

## 6. Backend — FastAPI Structure

### Project Layout

```
backend/
├── main.py                  # FastAPI app, CORS, routes
├── config.py                # env vars, MongoDB URI, Gemini key
├── models/
│   ├── schemas.py           # Pydantic models for API req/res
│   └── database.py          # Motor (async MongoDB) connection
├── services/
│   ├── mediator.py          # Orchestrates the full round loop
│   ├── agent.py             # Gemini API calls for agents
│   ├── scoring.py           # CAS calculation, winner selection
│   └── persona.py           # Random persona assignment
├── routes/
│   ├── simulation.py        # POST /simulate, GET /simulation/{id}
│   └── cases.py             # CRUD for economic cases
└── requirements.txt
```

### Key Dependencies (requirements.txt)

```
fastapi==0.115.0
uvicorn==0.30.0
motor==3.6.0              # Async MongoDB driver
google-genai==1.0.0       # Gemini Python SDK
pydantic==2.9.0
numpy==2.1.0
python-dotenv==1.0.0
websockets==13.0          # For live round updates
```

### Core Mediator Loop (services/mediator.py)

```python
async def run_simulation(case_id: str, db) -> dict:
    case = await db.cases.find_one({"_id": ObjectId(case_id)})
    sim = await create_simulation(db, case)
    
    current_policy = case["initial_policy"]
    
    for round_num in range(1, sim["config"]["max_rounds"] + 1):
        # 1. Assign random personas
        personas = await get_random_personas(db, count=5)
        
        # 2. Proposal phase: all 5 agents suggest changes
        proposals = await asyncio.gather(*[
            generate_proposal(persona, current_policy, case)
            for persona in personas
        ])
        
        # 3. Rating phase: each agent rates others' proposals
        all_ratings = {}
        for prop_idx, proposal in enumerate(proposals):
            raters = [p for i, p in enumerate(personas) if i != prop_idx]
            ratings = await asyncio.gather(*[
                rate_proposal(rater, current_policy, proposal)
                for rater in raters
            ])
            all_ratings[prop_idx] = ratings
        
        # 4. Score and select winner
        scored = []
        for prop_idx, ratings in all_ratings.items():
            cas = calculate_cas([r["score"] for r in ratings])
            scored.append({
                "proposal": proposals[prop_idx],
                "ratings": ratings,
                "cas_result": cas
            })
        
        winner = max(scored, key=lambda s: s["cas_result"]["cas"])
        
        # 5. Save round to MongoDB
        await save_round(db, sim["_id"], round_num, personas,
                         scored, winner)
        
        # 6. Check convergence
        if winner["cas_result"]["converged"]:
            await finalize_simulation(db, sim["_id"], "converged",
                                       winner)
            break
        
        # 7. Evolve: winning change becomes the new base
        current_policy = apply_change(current_policy,
                                       winner["proposal"]["changes"])
    
    return await db.simulations.find_one({"_id": sim["_id"]})
```

### API Routes (routes/simulation.py)

```python
@router.post("/simulations")
async def start_simulation(req: SimulationRequest):
    """Kick off a new deliberation simulation."""
    result = await run_simulation(req.case_id, db)
    return result

@router.get("/simulations/{sim_id}")
async def get_simulation(sim_id: str):
    """Get full simulation state with all rounds."""
    sim = await db.simulations.find_one({"_id": ObjectId(sim_id)})
    rounds = await db.rounds.find(
        {"simulation_id": ObjectId(sim_id)}
    ).sort("round_number", 1).to_list(None)
    return {"simulation": sim, "rounds": rounds}

@router.get("/simulations/{sim_id}/live")
async def live_updates(sim_id: str, websocket: WebSocket):
    """WebSocket for real-time round updates to frontend."""
    ...
```

---

## 7. Frontend — React Dashboard

### Layout

```
┌──────────────────────────────────────────────────────┐
│  EconSim    [Cases ▼]  [New Simulation]   [History]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐  ┌───────────────────────────┐  │
│  │  CURRENT POLICY  │  │  ROUND PROGRESS           │  │
│  │  (text display)  │  │  ● ● ● ○ ○ ○ ○ ○ ○ ○    │  │
│  │                  │  │  Round 3 of 10             │  │
│  │                  │  │  Status: Running           │  │
│  └─────────────────┘  └───────────────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │  AGENT PROPOSALS & RATINGS (current round)       │  │
│  │                                                   │  │
│  │  Agent 1 (Factory Worker):                        │  │
│  │  "Phase increase over 5 years..."                 │  │
│  │  CAS: 0.42  █████████░░░  Ratings: ●●●●          │  │
│  │                                                   │  │
│  │  Agent 2 (Startup CEO):          ★ WINNER         │  │
│  │  "Exempt businesses under 20 employees..."        │  │
│  │  CAS: 0.55  ████████████░  Ratings: ●●●●         │  │
│  │  ...                                              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐  │
│  │  CONVERGENCE CHART (Recharts line graph)          │  │
│  │                                                   │  │
│  │  CAS ▲                                            │  │
│  │  0.8 │              ___                           │  │
│  │  0.6 │         ___/    ---- threshold             │  │
│  │  0.4 │    ___/                                    │  │
│  │  0.2 │___/                                        │  │
│  │      └──────────────────────▶ Round               │  │
│  │       1   2   3   4   5                           │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Key React Components

```
frontend/
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── PolicyDisplay.jsx       # Shows current policy text
│   │   ├── RoundTracker.jsx        # Progress dots + status
│   │   ├── ProposalCards.jsx       # Agent proposals with scores
│   │   ├── ConvergenceChart.jsx    # Recharts line graph
│   │   ├── PersonaBadges.jsx       # Shows which personas are active
│   │   ├── CaseSelector.jsx        # Pick or create a case
│   │   └── SimulationHistory.jsx   # Past simulation results
│   └── hooks/
│       └── useSimulation.js        # WebSocket + polling hook
```

### Scaffold Command

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install recharts axios
```

---

## 8. Development Timeline — 20 Hours

### Phase 1: Foundation (Hours 0-4) — ALL HANDS

**Hour 0-1: Setup & Scaffold**
- Person A: Create GitHub repo, set up Python backend with FastAPI skeleton
- Person B: Create React frontend with Vite, install deps
- Person C: Set up MongoDB Atlas cluster, create database, seed persona collection
- Person D: Get Gemini API key, test basic Gemini calls, write agent prompt templates

**Hour 1-3: Core Backend**
- Person A: Build MongoDB connection (Motor), Pydantic models, CRUD routes for cases
- Person B: Build `agent.py` — Gemini prompt construction + API calls
- Person C: Build `scoring.py` — CAS calculation, winner selection logic
- Person D: Build `persona.py` — random persona assignment, seed 15 personas into DB

**Hour 3-4: Integration**
- Person A + B: Wire up mediator loop (the core orchestration)
- Person C + D: Test end-to-end with one hardcoded case via CLI / Postman

**Milestone: Can run a full simulation from terminal and see results in MongoDB**

### Phase 2: Frontend + Polish (Hours 4-10)

**Hour 4-6: Frontend Core**
- Person A: PolicyDisplay + CaseSelector components
- Person B: ProposalCards + PersonaBadges components
- Person C: ConvergenceChart with Recharts
- Person D: Connect frontend to backend API, build useSimulation hook

**Hour 6-8: Live Experience**
- Person A + B: WebSocket integration for live round updates
- Person C: Simulation history page + past results viewer
- Person D: Add 5+ interesting economic cases to the database

**Hour 8-10: Visual Polish**
- All: Styling, animations, loading states, error handling
- Make the convergence chart animate as rounds complete
- Add persona avatars / icons

**Milestone: Full working demo — pick a case, watch simulation run, see results**

### Phase 3: Demo-Ready (Hours 10-16)

**Hour 10-12: Robustness**
- Error handling on Gemini API failures (retry logic)
- Input validation on all API endpoints
- Handle edge cases (all negative scores, ties, etc.)

**Hour 12-14: Demo Cases & Tuning**
- Run 10+ simulations, tune lambda and thresholds
- Create 3-4 compelling demo cases for judges
- Collect interesting outputs to showcase

**Hour 14-16: Wow Factor**
- Add a "personality radar chart" for each agent showing priorities
- Policy diff view showing how policy evolved across rounds
- Summary statistics dashboard

### Phase 4: Presentation (Hours 16-20)

**Hour 16-18: Demo Prep**
- Build a scripted demo flow (which case to show, what to highlight)
- Create slides explaining the algorithm and architecture
- Record a backup video of the demo working

**Hour 18-20: Practice & Buffer**
- Run through presentation 2-3 times
- Fix any last-minute bugs
- Deploy to a cloud instance if possible (Railway, Render, or just run local)

---

## 9. Key Implementation Tips

### Handling Gemini Rate Limits
The free tier of Gemini has rate limits. With 5 agents × (1 proposal + 4 ratings) = 25 API calls per round, and up to 10 rounds, that's 250 calls per simulation.

```python
# Add retry with exponential backoff
import asyncio
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3))
async def call_gemini(prompt, system_instruction):
    ...
```

### Forcing JSON Output from Gemini
Use `response_mime_type` to force JSON:

```python
response = await client.aio.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt,
    config=types.GenerateContentConfig(
        system_instruction=system_prompt,
        response_mime_type="application/json",
        temperature=0.7,  # Some creativity in proposals
    )
)
```

### The "Apply Change" Function
When the winning proposal is selected, you need to merge it with the base policy. Two approaches:

**Simple (recommended for hackathon):** Use Gemini itself to merge:
```python
async def apply_change(base_policy, change_text):
    prompt = f"""Merge this change into the policy. Return ONLY the
    updated policy text, nothing else.

    BASE POLICY: {base_policy}
    CHANGE TO APPLY: {change_text}"""

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash", contents=prompt
    )
    return response.text
```

### Testing Without Burning API Calls
Create a mock agent for development:

```python
async def mock_agent_proposal(persona, policy, case):
    return {
        "changes": f"Mock change from {persona['name']}",
        "reasoning": "Mock reasoning"
    }

async def mock_agent_rating(persona, policy, proposal):
    import random
    return {
        "score": round(random.uniform(-0.5, 1.0), 2),
        "justification": "Mock justification"
    }
```

---

## 10. Demo Case Ideas

Seed your database with these compelling scenarios:

1. **Federal Minimum Wage Hike** — $7.25 to $15/hr, phased over 3 years
2. **Universal Basic Income Pilot** — $1,000/mo for all adults in a mid-size city
3. **Corporate Tax Restructuring** — Shift from flat 21% to tiered by revenue
4. **Student Loan Forgiveness** — $50K forgiveness vs. income-based repayment
5. **Remote Work Tax Credit** — Tax incentives for companies maintaining remote positions
6. **Housing Zoning Reform** — Eliminate single-family zoning in metro areas
7. **Carbon Tax Implementation** — $50/ton CO2 with dividend payments to citizens
8. **Small Business Healthcare Mandate** — Require health coverage for 10+ employees

Each case should include 5-8 data points in `supporting_data` to ground the agent responses.

---

## 11. What to Show Judges

1. **The algorithm is novel** — evolutionary policy optimization through blind multi-stakeholder AI deliberation with consensus scoring
2. **MongoDB Atlas integration** — full simulation state, round history, persona pool, case library all persisted and queryable
3. **Gemini integration** — agents have genuine personality-driven reasoning, not just random scoring
4. **The convergence chart** — visually shows how policies evolve toward consensus
5. **Real insight** — the final policy genuinely tends toward compromise positions that a single perspective would never reach
6. **Reproducibility** — run the same case twice with different persona draws, show different convergence paths to similar conclusions

---

## 12. Environment Variables (.env)

```bash
GEMINI_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/econsim
DB_NAME=econsim
LAMBDA=0.5
CONVERGENCE_THRESHOLD=0.60
VARIANCE_THRESHOLD=0.15
MAX_ROUNDS=10
STAGNATION_ROUNDS=3
```

import os
import json
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash-lite"

def build_system_prompt(persona: dict, domain: str = "Policy") -> str:
    prompt = (
        f"You are a simulated stakeholder in a course-of-action deliberation.\n\n"
        f"POLICY DOMAIN: {domain}\n"
        f"IDENTITY: {persona['name']}\n"
        f"BACKGROUND: {persona['description']}\n"
        f"PRIORITIES: {', '.join(persona['priorities'])}\n"
        f"RISK TOLERANCE: {persona['risk_tolerance']}\n"
        f"VALUES: {', '.join(persona['values'])}\n"
    )

    stubbornness = persona.get("stubbornness")
    if stubbornness is not None:
        if stubbornness >= 70:
            flexibility = "You are highly firm in your position. Only accept or propose changes that strongly align with your core interests."
        elif stubbornness >= 40:
            flexibility = "You are moderately flexible. You can accept reasonable compromises that partially serve your interests."
        else:
            flexibility = "You are open-minded and flexible. You readily support changes that achieve broad consensus, even if they don't fully serve your interests."
        prompt += f"NEGOTIATION STYLE: {flexibility}\n"

    trait = persona.get("trait", "").strip()
    trait_desc = persona.get("trait_desc", "").strip()
    if trait:
        prompt += f"PERSONALITY TRAIT: {trait}"
        if trait_desc:
            prompt += f" — {trait_desc}"
        prompt += "\n"

    custom_prompt = persona.get("custom_prompt", "").strip()
    if custom_prompt:
        prompt += f"ADDITIONAL CONTEXT: {custom_prompt}\n"

    prompt += "\nYou must respond ONLY from this perspective. Be specific and concise."
    return prompt

async def generate_proposal(persona: dict, current_policy: str, case: dict, domain: str = "Policy") -> str:
    system_prompt = build_system_prompt(persona, domain)
    user_prompt = (
        f"Given the following course-of-action, suggest 1-2 specific changes (max 3 sentences) "
        f"that would make this course-of-action more favorable for someone in your position. "
        f"Be concrete — reference specific numbers, thresholds, timelines, conditions, or mechanisms where possible and appropriate.\n\n"
        f"COURSE-OF-ACTION:\n{current_policy}\n\n"
        f"SUPPORTING DATA:\n{case.get('supporting_data', {})}\n\n"
        f"Respond with ONLY this JSON:\n"
        f'{{"changes": "Your 1-2 sentence change", "reasoning": "Brief justification (max 2 sentences)"}}'
    )
    return await _call_gemini(system_prompt, user_prompt)

async def rate_proposal(persona: dict, current_policy: str, proposal: dict, domain: str = "Policy") -> str:
    system_prompt = build_system_prompt(persona, domain)
    user_prompt = (
        f"Rate the following proposed course-of-action change on a scale from -1.00 to 1.00 "
        f"(in 0.01 increments), where:\n"
        f"  -1.00 = catastrophically harmful to your interests\n"
        f"   0.00 = neutral / no impact\n"
        f"   1.00 = maximally beneficial to your interests\n\n"
        f"CURRENT COURSE OF ACTION:\n{current_policy}\n\n"
        f"PROPOSED CHANGE:\n{proposal['changes']}\n\n"
        f"Respond with ONLY this JSON:\n"
        f'{{"score": <number between -1.00 and 1.00>, "justification": "1-2 sentence(s) explaining your rating"}}'
    )
    return await _call_gemini(system_prompt, user_prompt)

async def apply_change(base_policy: str, change_text: str, supporting_data: dict, domain: str = "Policy") -> tuple[str, dict]:
    prompt = (
        f"A course-of-action change is being applied. Given the base course-of-action, the change, and the current supporting data, "
        f"return the updated course-of-action text AND how the supporting data would realistically change as a result.\n\n"
        f"BASE COURSE-OF-ACTION:\n{base_policy}\n\n"
        f"CHANGE TO APPLY:\n{change_text}\n\n"
        f"CURRENT SUPPORTING DATA:\n{json.dumps(supporting_data)}\n\n"
        f"Respond with ONLY this JSON:\n"
        f'{{"updated_policy": "...", "updated_supporting_data": {{...}}}}'
    )
    result = await _call_gemini(
        f"You are a course-of-action editor and domain expert in {domain}. Apply the change precisely and update the supporting data to reflect realistic downstream effects in the {domain} domain.",
        prompt,
    )
    parsed = json.loads(result)
    return parsed["updated_policy"], parsed["updated_supporting_data"]

def _extract_json(text: str) -> str:
    """Return the first complete JSON object from text, ignoring trailing garbage."""
    start = next((i for i, c in enumerate(text) if c in "{["), None)
    if start is None:
        return text
    opener, closer = ("{", "}") if text[start] == "{" else ("[", "]")
    depth, in_string, escape = 0, False, False
    for i, c in enumerate(text[start:], start):
        if escape:
            escape = False; continue
        if c == "\\" and in_string:
            escape = True; continue
        if c == '"':
            in_string = not in_string; continue
        if in_string:
            continue
        if c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return text[start:]

async def _call_gemini(system_prompt: str, user_prompt: str, retries: int = 3) -> str:
    last_err = None
    for attempt in range(retries):
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        result = _extract_json(response.text)
        try:
            json.loads(result)
            return result
        except json.JSONDecodeError as e:
            last_err = e
            print(f"  [Gemini] Invalid JSON on attempt {attempt + 1}/{retries}: {e}")
    raise last_err
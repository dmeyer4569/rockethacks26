import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.0-flash"


def build_system_prompt(persona: dict) -> str:
    return (
        f"You are a simulated economic stakeholder participating in a policy deliberation.\n\n"
        f"IDENTITY: {persona['name']}\n"
        f"BACKGROUND: {persona['description']}\n"
        f"ECONOMIC PRIORITIES: {', '.join(persona['priorities'])}\n"
        f"RISK TOLERANCE: {persona['risk_tolerance']}\n"
        f"VALUES: {', '.join(persona['values'])}\n\n"
        f"You must respond ONLY from this perspective. Be specific and concise."
    )


async def generate_proposal(persona: dict, current_policy: str, case: dict) -> str:
    system_prompt = build_system_prompt(persona)
    user_prompt = (
        f"Given the following policy, suggest 1-2 specific changes (max 3 sentences) "
        f"that would make this policy more favorable for someone in your position. "
        f"Be concrete — reference specific numbers, thresholds, or mechanisms where possible.\n\n"
        f"POLICY:\n{current_policy}\n\n"
        f"SUPPORTING DATA:\n{case.get('supporting_data', {})}\n\n"
        f"Respond with ONLY this JSON:\n"
        f'{{"changes": "Your 1-2 sentence change", "reasoning": "Brief justification (max 2 sentences)"}}'
    )
    return await _call_gemini(system_prompt, user_prompt)


async def rate_proposal(persona: dict, current_policy: str, proposal: dict) -> str:
    system_prompt = build_system_prompt(persona)
    user_prompt = (
        f"Rate the following proposed policy change on a scale from -1.00 to 1.00 "
        f"(in 0.01 increments), where:\n"
        f"  -1.00 = catastrophically harmful to your interests\n"
        f"   0.00 = neutral / no impact\n"
        f"   1.00 = maximally beneficial to your interests\n\n"
        f"CURRENT POLICY:\n{current_policy}\n\n"
        f"PROPOSED CHANGE:\n{proposal['changes']}\n\n"
        f"Respond with ONLY this JSON:\n"
        f'{{"score": <number between -1.00 and 1.00>, "justification": "1-2 sentence(s) explaining your rating"}}'
    )
    return await _call_gemini(system_prompt, user_prompt)


async def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )
    return response.text
import os
from groq import Groq

GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

COACH_SYSTEM = """You are CareerLens AI — an elite career coach and resume expert.
You have access to the user's resume and real job market data.
Always give specific, actionable advice grounded in their actual resume content.
Never be generic. Reference their skills, experience, and target role.
Suggest 2-3 concrete next steps at the end of every response.
Format your response in clean markdown."""

RESUME_IMPROVE_SYSTEM = """You are an expert resume writer. Rewrite the resume in Harvard resume format using strict markdown structure:

STRUCTURE RULES (follow exactly):
1. First line: `# FULL NAME` (all caps)
2. Second line: contact info as plain paragraph — City, State | email | phone | LinkedIn
3. Each section uses `## SECTION NAME` (all caps, e.g. ## EDUCATION, ## EXPERIENCE, ## SKILLS)
4. Each job/entry uses `### Company Name` followed immediately by the date range on the SAME line using a pipe: `### Company Name | City, ST | Jan 2022 – Present`
5. Job title on its own line in italics: `*Job Title*`
6. Bullet points using STAR method — Situation, Task, Action, Result
7. Bold quantifiable achievements: **Increased revenue by 40%**
8. Skills section: group by category, e.g. **Languages:** Python, JavaScript
9. Use strong action verbs (Led, Architected, Delivered, Scaled, Launched)
10. Output ONLY the resume markdown — no preamble, no commentary."""

COVER_LETTER_SYSTEM = """You are an expert cover letter writer.
Write a professional, personalized cover letter that:
1. Opens with today's date and proper salutation
2. Paragraph 1: Express genuine interest in the role and company
3. Paragraph 2: Connect the user's top 3 achievements to the job requirements
4. Paragraph 3: Why this company specifically, cultural fit
5. Closing: Call to action for interview
Keep it under 400 words. Output ONLY the cover letter in clean markdown."""


def get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable not set")
    return Groq(api_key=api_key)


def chat_with_coach(
    messages: list[dict],
    resume_text: str,
    context_snippets: list[str],
) -> str:
    client = get_client()
    context = "\n\n".join(context_snippets) if context_snippets else "No additional context."
    system = (
        COACH_SYSTEM
        + f"\n\n## USER'S RESUME:\n{resume_text[:3000]}"
        + f"\n\n## RELEVANT CONTEXT:\n{context[:1500]}"
    )
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": system}] + messages,
        temperature=0.7,
        max_tokens=1200,
    )
    return response.choices[0].message.content


def improve_resume_llm(resume_text: str, target_role: str, context_snippets: list[str]) -> str:
    client = get_client()
    context = "\n\n".join(context_snippets) if context_snippets else ""
    prompt = (
        f"TARGET ROLE: {target_role}\n\n"
        f"RESUME:\n{resume_text[:4000]}\n\n"
        f"JOB MARKET CONTEXT:\n{context[:1000]}"
    )
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": RESUME_IMPROVE_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=2000,
    )
    return response.choices[0].message.content


def generate_cover_letter_llm(
    resume_text: str,
    company_name: str,
    job_description: str,
    context_snippets: list[str],
) -> str:
    client = get_client()
    context = "\n\n".join(context_snippets) if context_snippets else ""
    prompt = (
        f"COMPANY: {company_name}\n\n"
        f"JOB DESCRIPTION:\n{job_description[:2000]}\n\n"
        f"MY RESUME:\n{resume_text[:2500]}\n\n"
        f"CONTEXT:\n{context[:500]}"
    )
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": COVER_LETTER_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
        max_tokens=1000,
    )
    return response.choices[0].message.content

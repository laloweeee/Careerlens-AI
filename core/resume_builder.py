from core.rag_engine import rag_engine
from core.llm_client import improve_resume_llm, generate_cover_letter_llm


def analyze_resume(parsed: dict) -> dict:
    skills = parsed.get("skills", [])
    score = parsed.get("score", 0)
    sections = parsed.get("sections", {})
    word_count = parsed.get("word_count", 0)

    feedback = []
    if score < 40:
        feedback.append("Your resume needs significant improvement — add quantifiable achievements and more detail.")
    elif score < 70:
        feedback.append("Good foundation. Strengthen bullet points with metrics and action verbs.")
    else:
        feedback.append("Strong resume! Fine-tune keywords for each specific role you apply to.")

    missing = []
    for s in ["summary", "objective", "experience", "work experience"]:
        if s not in sections:
            missing.append(s)
    if missing:
        feedback.append(f"Consider adding: {', '.join(missing[:2])} section(s).")

    if word_count < 250:
        feedback.append("Resume is too short. Expand your experience descriptions.")

    return {
        "score": score,
        "skills_found": skills,
        "sections_found": list(sections.keys()),
        "feedback": feedback,
        "word_count": word_count,
    }


def improve_resume(resume_text: str, target_role: str) -> str:
    context = rag_engine.retrieve_jobs(target_role, k=3)
    return improve_resume_llm(resume_text, target_role, context)


def generate_cover_letter(resume_text: str, company_name: str, job_description: str) -> str:
    context = rag_engine.retrieve_jobs(job_description[:200], k=3)
    return generate_cover_letter_llm(resume_text, company_name, job_description, context)

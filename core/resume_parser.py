import re
import pickle
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def _load_skill_keywords() -> list[str]:
    """Try to load skill keywords from the pre-trained pkl file."""
    path = DATA_DIR / "skill_keywords.pkl"
    try:
        if path.exists():
            with open(path, "rb") as f:
                kw = pickle.load(f)
            if isinstance(kw, list) and kw:
                return [str(k).lower() for k in kw]
    except Exception as e:
        print(f"[resume_parser] Could not load skill_keywords.pkl: {e}")
    return []


_FALLBACK_SKILL_KEYWORDS = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby", "php",
    "swift", "kotlin", "scala", "r", "matlab", "bash", "shell",
    # Frontend
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "html", "css", "sass", "tailwind",
    "webpack", "vite", "redux", "graphql",
    # Backend
    "node.js", "express", "fastapi", "django", "flask", "spring", "rails", "laravel", "asp.net",
    # Databases
    "postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch", "cassandra",
    "dynamodb", "firebase", "supabase",
    # Cloud / DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd", "github actions",
    "jenkins", "ansible", "linux",
    # AI / ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas",
    "numpy", "nlp", "computer vision", "llm", "openai", "langchain",
    # Soft Skills
    "leadership", "communication", "agile", "scrum", "project management", "mentoring",
]

# Merge pre-trained keywords with fallback list (deduped)
_pretrained = _load_skill_keywords()
SKILL_KEYWORDS: list[str] = list(dict.fromkeys(_pretrained + _FALLBACK_SKILL_KEYWORDS)) if _pretrained else _FALLBACK_SKILL_KEYWORDS

SECTION_HEADERS = [
    "summary", "objective", "experience", "work experience", "employment",
    "education", "skills", "technical skills", "projects", "certifications",
    "awards", "publications", "volunteer", "languages", "interests",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")


def extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for skill in SKILL_KEYWORDS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def identify_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    lines = text.split("\n")
    current_section = "header"
    current_content: list[str] = []

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower().rstrip(":")
        if lower in SECTION_HEADERS:
            sections[current_section] = "\n".join(current_content).strip()
            current_section = lower
            current_content = []
        else:
            current_content.append(line)

    sections[current_section] = "\n".join(current_content).strip()
    return sections


def score_resume(text: str, skills: list[str], sections: dict[str, str]) -> int:
    score = 0
    word_count = len(text.split())

    # Length (up to 20 pts)
    if word_count >= 400:
        score += 20
    elif word_count >= 200:
        score += 10
    else:
        score += 5

    # Skills (up to 20 pts)
    skill_score = min(len(skills) * 2, 20)
    score += skill_score

    # Sections present (up to 30 pts)
    key_sections = ["summary", "objective", "experience", "work experience", "education", "skills"]
    present = sum(1 for s in key_sections if s in sections)
    score += present * 5

    # Quantifiable achievements (up to 15 pts)
    numbers = re.findall(r'\d+\s?%|\$[\d,]+|\d+[x+]|\d+\s+(?:users|customers|projects|team)', text, re.I)
    score += min(len(numbers) * 3, 15)

    # Action verbs (up to 15 pts)
    action_verbs = ["led", "built", "developed", "designed", "managed", "improved", "increased",
                    "reduced", "launched", "created", "architected", "scaled", "delivered"]
    verb_count = sum(1 for v in action_verbs if re.search(r'\b' + v + r'\b', text, re.I))
    score += min(verb_count * 2, 15)

    return min(score, 100)


def parse_resume(file_bytes: bytes) -> dict:
    text = extract_text_from_pdf(file_bytes)
    skills = extract_skills(text)
    sections = identify_sections(text)
    score = score_resume(text, skills, sections)
    return {
        "text": text,
        "skills": skills,
        "sections": sections,
        "score": score,
        "word_count": len(text.split()),
    }

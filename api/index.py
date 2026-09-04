import os
import uuid
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.resume_parser import parse_resume
from core.resume_builder import analyze_resume, improve_resume, generate_cover_letter
from core.llm_client import chat_with_coach
from core.rag_engine import rag_engine

app = FastAPI(title="CareerLens AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# In-memory session store
sessions: dict[str, dict] = {}


# ── Models ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[dict] = []


class ImproveResumeRequest(BaseModel):
    session_id: str
    target_role: str


class CoverLetterRequest(BaseModel):
    session_id: str
    company_name: str
    job_description: str


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = STATIC_DIR / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>CareerLens AI</h1><p>Static files not found.</p>")


@app.get("/health")
async def health():
    return {"status": "ok", "rag_loaded": rag_engine._loaded}


@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    try:
        parsed = parse_resume(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    analysis = analyze_resume(parsed)
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": parsed["text"],
        "skills": parsed["skills"],
        "sections": parsed["sections"],
        "score": parsed["score"],
        "filename": file.filename,
    }

    return {
        "session_id": session_id,
        "filename": file.filename,
        **analysis,
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    session = sessions.get(req.session_id)
    resume_text = session["resume_text"] if session else "No resume uploaded."

    context = rag_engine.retrieve(req.message, k=4)
    messages = req.history + [{"role": "user", "content": req.message}]

    try:
        reply = chat_with_coach(messages, resume_text, context)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"reply": reply}


@app.post("/improve-resume")
async def improve_resume_endpoint(req: ImproveResumeRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please upload your resume first.")

    resume_text = session["resume_text"]
    try:
        improved = improve_resume(resume_text, req.target_role)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {
        "original": resume_text,
        "improved": improved,
        "target_role": req.target_role,
    }


@app.post("/generate-cover-letter")
async def cover_letter_endpoint(req: CoverLetterRequest):
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please upload your resume first.")

    resume_text = session["resume_text"]
    try:
        letter = generate_cover_letter(resume_text, req.company_name, req.job_description)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"cover_letter": letter, "company_name": req.company_name}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=8000, reload=True)

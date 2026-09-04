# CareerLens AI

An AI-powered career coach that analyzes your resume, suggests improvements, generates cover letters, and answers career questions using your professional background.

## Features

- **Resume Upload & Analysis** — Drag & drop PDF upload with instant scoring (1–100)
- **Improve My Resume** — AI rewrites your resume using STAR method and targeted keywords
- **Generate Cover Letter** — Paste a job description and get a tailored cover letter
- **Career Chat** — Ask anything about your career, skills, job market
- **Saved Conversations** — Start new chats and reopen recent conversations from this browser

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and add your Groq API key
3. Place your pre-trained FAISS index files in the `/data` folder
4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Run the server:

```bash
uvicorn api.index:app --reload
```

6. Open `http://localhost:8000`

## Project Structure

```
careerlens-ai/
├── api/index.py          # FastAPI app & endpoints
├── core/
│   ├── rag_engine.py     # FAISS retrieval
│   ├── resume_parser.py  # PDF parsing & skill extraction
│   ├── llm_client.py     # Groq API wrapper
│   └── resume_builder.py # Resume improvement & cover letters
├── static/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/                 # Place pre-trained .gz model files here
├── requirements.txt
├── vercel.json
└── .env.example
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key (get one at console.groq.com) |
| `GROQ_MODEL` | Groq model ID available to your account, such as `openai/gpt-oss-120b` |

## Data Folder

Place your pre-trained model files (`.faiss`, `.pkl`, `.gz`) from Google Colab into the `/data` folder before starting the server.

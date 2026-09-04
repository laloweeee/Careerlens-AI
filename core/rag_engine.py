import os
import gzip
import pickle
import numpy as np
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def _load_pkl(path: Path):
    """Load a pickle file, supporting optional .gz compression."""
    gz = Path(str(path) + ".gz")
    if gz.exists():
        with gzip.open(gz, "rb") as f:
            return pickle.load(f)
    if path.exists():
        with open(path, "rb") as f:
            return pickle.load(f)
    return None


def _load_faiss(path: Path):
    """Load a FAISS index, supporting optional .gz compression."""
    import faiss
    gz = Path(str(path) + ".gz")
    if gz.exists():
        with gzip.open(gz, "rb") as f:
            data = f.read()
        with open(path, "wb") as f:
            f.write(data)
    if path.exists():
        return faiss.read_index(str(path))
    return None


class RAGEngine:
    def __init__(self):
        self.index = None
        self.documents = []
        self.skills_index = None
        self.skill_keywords = []
        self.metadata = {}
        self._loaded = False
        self._load()

    def _load(self):
        try:
            import faiss  # noqa: F401 — verify faiss is importable

            # ── Main knowledge index ─────────────────────────────────────
            self.index = _load_faiss(DATA_DIR / "careerlens_index.faiss")
            docs = _load_pkl(DATA_DIR / "documents.pkl")
            if docs is not None:
                self.documents = docs if isinstance(docs, list) else list(docs)

            # ── Metadata ─────────────────────────────────────────────────
            meta = _load_pkl(DATA_DIR / "metadata.pkl")
            if meta is not None:
                self.metadata = meta

            # ── Skills index ─────────────────────────────────────────────
            self.skills_index = _load_faiss(DATA_DIR / "skills_index.faiss")
            kw = _load_pkl(DATA_DIR / "skill_keywords.pkl")
            if kw is not None:
                self.skill_keywords = kw if isinstance(kw, list) else list(kw)

            self._loaded = True
            print(
                f"[RAGEngine] Loaded — docs={len(self.documents)}, "
                f"skills={len(self.skill_keywords)}, "
                f"metadata_keys={len(self.metadata) if isinstance(self.metadata, dict) else 'n/a'}"
            )
        except Exception as e:
            print(f"[RAGEngine] Warning: Could not load FAISS index: {e}")
            self._loaded = False

    def _embed(self, text: str) -> np.ndarray:
        from sentence_transformers import SentenceTransformer
        if not hasattr(self, "_model") or self._model is None:
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        vec = self._model.encode([text], normalize_embeddings=True)
        return vec.astype("float32")

    def retrieve(self, query: str, k: int = 5) -> list[str]:
        """Retrieve relevant documents from the main knowledge index."""
        if not self._loaded or self.index is None or not self.documents:
            return []
        try:
            vec = self._embed(query)
            k = min(k, len(self.documents))
            _, indices = self.index.search(vec, k)
            return [self.documents[i] for i in indices[0] if i < len(self.documents)]
        except Exception as e:
            print(f"[RAGEngine] retrieve error: {e}")
            return []

    def retrieve_jobs(self, query: str, k: int = 5) -> list[str]:
        """Retrieve skill/job context. Falls back to main index if skills index unavailable."""
        if self._loaded and self.skills_index is not None and self.skill_keywords:
            try:
                vec = self._embed(query)
                k = min(k, len(self.skill_keywords))
                _, indices = self.skills_index.search(vec, k)
                return [self.skill_keywords[i] for i in indices[0] if i < len(self.skill_keywords)]
            except Exception as e:
                print(f"[RAGEngine] retrieve_jobs (skills) error: {e}")
        # Fallback to main index
        return self.retrieve(query, k)


rag_engine = RAGEngine()

"""
SVM-based Musical Compatibility Classifier
Predicts pairwise taste compatibility (0–100) from MusicDNA vectors.

Training pipeline:
  1. Label pairs where BOTH users rated >= 5 common tracks similarly (Δscore ≤ 2) → compatible=1
  2. Train SVC(kernel='rbf', probability=True) on pair features
  3. Persist model with joblib; reload on startup
  4. Retrain weekly via the /admin/retrain endpoint

Inference:
  Given two DNA embeddings, return compatibility score 0–100 with dimension breakdown.
"""

import numpy as np
import joblib
import os
from pathlib import Path
from dataclasses import dataclass
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

MODEL_PATH = Path(__file__).parent / "models" / "svm_compat.pkl"
MODEL_PATH.parent.mkdir(exist_ok=True)

# Feature slice indices in the 256-dim embedding
GENRE_SLICE    = slice(0, 50)
AUDIO_SLICE    = slice(50, 59)
BEHAV_SLICE    = slice(59, 64)
LANG_SLICE     = slice(64, 72)
ERA_SLICE      = slice(72, 80)
ARTIST_SLICE   = slice(80, 208)


@dataclass
class CompatibilityResult:
    taste_score: float        # 0–100 overall
    rhythm_match: float       # BPM + energy + danceability
    mood_match: float         # valence + acousticness
    genre_match: float        # genre vector cosine sim
    era_match: float          # era overlap
    language_match: float     # language overlap
    discovery_match: float    # behavioral similarity
    artist_match: float       # artist embedding cosine sim
    shared_genres: list[str]
    shared_artists: list[str]


def _pair_features(vec_a: np.ndarray, vec_b: np.ndarray) -> np.ndarray:
    """
    Build a feature vector for a pair of DNA embeddings.
    Uses element-wise difference magnitude + element-wise product
    (captures both distance and alignment).
    """
    diff    = np.abs(vec_a - vec_b)
    product = vec_a * vec_b
    cosine  = np.array([float(np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b) + 1e-9))])
    return np.concatenate([diff, product, cosine])  # 256+256+1 = 513 features


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / norm) if norm > 1e-9 else 0.0


def _dimension_scores(vec_a: np.ndarray, vec_b: np.ndarray) -> dict:
    """Compute interpretable per-dimension compatibility scores (0–100)."""
    genre_sim   = max(0, _cosine(vec_a[GENRE_SLICE], vec_b[GENRE_SLICE]))
    artist_sim  = max(0, _cosine(vec_a[ARTIST_SLICE], vec_b[ARTIST_SLICE]))

    # Audio sub-dims
    audio_a, audio_b = vec_a[AUDIO_SLICE], vec_b[AUDIO_SLICE]
    rhythm_diff  = np.mean(np.abs(audio_a[[0, 1, 3]] - audio_b[[0, 1, 3]]))   # bpm,energy,dance
    mood_diff    = np.mean(np.abs(audio_a[[2, 4]] - audio_b[[2, 4]]))          # valence,acoustic

    era_sim      = max(0, _cosine(vec_a[ERA_SLICE], vec_b[ERA_SLICE]))
    lang_sim     = max(0, _cosine(vec_a[LANG_SLICE], vec_b[LANG_SLICE]))
    behav_diff   = np.mean(np.abs(vec_a[BEHAV_SLICE] - vec_b[BEHAV_SLICE]))

    return {
        "rhythm_match":    round((1 - rhythm_diff) * 100, 1),
        "mood_match":      round((1 - mood_diff) * 100, 1),
        "genre_match":     round(genre_sim * 100, 1),
        "era_match":       round(era_sim * 100, 1),
        "language_match":  round(lang_sim * 100, 1),
        "discovery_match": round((1 - behav_diff) * 100, 1),
        "artist_match":    round(artist_sim * 100, 1),
    }


class CompatibilityModel:
    def __init__(self):
        self._pipeline: Pipeline | None = None
        self._load()

    def _load(self):
        if MODEL_PATH.exists():
            self._pipeline = joblib.load(MODEL_PATH)
            print(f"[SVM] Loaded model from {MODEL_PATH}")
        else:
            print("[SVM] No trained model found — using cosine fallback")

    def _cosine_fallback(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """Fallback before model is trained: weighted cosine similarity."""
        genre_w  = 0.30 * max(0, _cosine(vec_a[GENRE_SLICE],  vec_b[GENRE_SLICE]))
        audio_w  = 0.25 * max(0, _cosine(vec_a[AUDIO_SLICE],  vec_b[AUDIO_SLICE]))
        artist_w = 0.25 * max(0, _cosine(vec_a[ARTIST_SLICE], vec_b[ARTIST_SLICE]))
        era_w    = 0.10 * max(0, _cosine(vec_a[ERA_SLICE],     vec_b[ERA_SLICE]))
        lang_w   = 0.10 * max(0, _cosine(vec_a[LANG_SLICE],    vec_b[LANG_SLICE]))
        return round((genre_w + audio_w + artist_w + era_w + lang_w) * 100, 1)

    def predict(
        self,
        vec_a: np.ndarray,
        vec_b: np.ndarray,
        dna_a: dict | None = None,
        dna_b: dict | None = None,
    ) -> CompatibilityResult:
        dims = _dimension_scores(vec_a, vec_b)

        if self._pipeline is not None:
            features = _pair_features(vec_a, vec_b).reshape(1, -1)
            prob = self._pipeline.predict_proba(features)[0][1]
            taste_score = round(prob * 100, 1)
        else:
            taste_score = self._cosine_fallback(vec_a, vec_b)

        # Shared genres
        shared_genres = []
        if dna_a and dna_b:
            genres_a = {g["genre"] for g in (dna_a.get("top_genres") or [])[:5]}
            genres_b = {g["genre"] for g in (dna_b.get("top_genres") or [])[:5]}
            shared_genres = list(genres_a & genres_b)

            artists_a = {a["name"] for a in (dna_a.get("top_artists") or [])[:15]}
            artists_b = {a["name"] for a in (dna_b.get("top_artists") or [])[:15]}
            shared_artists = list(artists_a & artists_b)
        else:
            shared_artists = []

        return CompatibilityResult(
            taste_score=taste_score,
            shared_genres=shared_genres,
            shared_artists=shared_artists,
            **dims,
        )

    def train(self, X: np.ndarray, y: np.ndarray) -> dict:
        """
        X: array of pair feature vectors (shape N x 513)
        y: binary labels (1=compatible, 0=not)
        Returns CV accuracy dict.
        """
        pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("svm", SVC(
                kernel="rbf",
                C=5.0,
                gamma="scale",
                probability=True,
                class_weight="balanced",
                cache_size=500,
            )),
        ])
        cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="roc_auc")
        pipeline.fit(X, y)
        joblib.dump(pipeline, MODEL_PATH)
        self._pipeline = pipeline
        print(f"[SVM] Trained. AUC CV: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        return {"auc_mean": float(cv_scores.mean()), "auc_std": float(cv_scores.std()), "n_samples": len(y)}


def build_training_data(ratings_by_user: dict[str, list[dict]]) -> tuple[np.ndarray, np.ndarray]:
    """
    Build labeled pair dataset from rating history.
    Compatible = both users rated >= 3 common items, avg Δscore ≤ 2.5
    """
    from itertools import combinations
    user_ids = list(ratings_by_user.keys())
    X_rows, y_labels = [], []

    for uid_a, uid_b in combinations(user_ids, 2):
        ratings_a = {r["content_id"]: r["score"] for r in ratings_by_user[uid_a]}
        ratings_b = {r["content_id"]: r["score"] for r in ratings_by_user[uid_b]}
        common = set(ratings_a) & set(ratings_b)
        if len(common) < 3:
            continue
        deltas = [abs(ratings_a[cid] - ratings_b[cid]) for cid in common]
        avg_delta = np.mean(deltas)
        label = 1 if avg_delta <= 2.5 else 0
        # NOTE: embeddings must be retrieved separately; placeholder here
        y_labels.append(label)

    return np.array(X_rows), np.array(y_labels)


# Singleton
_model: CompatibilityModel | None = None


def get_model() -> CompatibilityModel:
    global _model
    if _model is None:
        _model = CompatibilityModel()
    return _model

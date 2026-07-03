# CreativeIQ AI — Backend

FastAPI backend that analyses a video file using **12 perceptual/technical features** and returns an AI-powered creative review via **VNPT SmartBot**.

## Architecture

```
BE/
├── main.py           # FastAPI app — POST /analyse, GET /health
├── analyzer.py       # Pipeline orchestrator (load → segment → extract → VNPT SmartBot)
├── schemas.py        # Pydantic models for request/response
├── extractor/
│   ├── __init__.py
│   ├── utils.py
│   ├── visual_dynamics.py   # Feature 1  — frame differencing
│   ├── motion_level.py      # Feature 2  — Farneback optical flow
│   ├── scene_variation.py   # Feature 3  — HSV histogram comparison
│   ├── cut_frequency.py     # Feature 4  — PySceneDetect
│   ├── text_density.py      # Feature 5  — EasyOCR bbox coverage
│   ├── readability.py       # Feature 6  — contrast + font size
│   ├── visual_focus.py      # Feature 7  — saliency concentration
│   ├── clutter_level.py     # Feature 8  — Canny edge density
│   ├── audio_energy.py      # Feature 9  — librosa RMS
│   ├── pitch_variation.py   # Feature 10 — librosa YIN pitch std
│   ├── speech_rate.py       # Feature 11 — Whisper word/min
│   └── sync_alignment.py    # Feature 12 — audio-visual cross-correlation
├── requirements.txt
├── .env.example
└── backend.md        # Feature specification
```

## Setup

### 1. Create virtual environment
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure API keys
```powershell
Copy-Item .env.example .env
# Edit .env and set VNPT_OCR_TOKEN_ID, VNPT_STT_TOKEN_KEY, etc.
```

### 3. Run the server
```powershell
.venv\Scripts\uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## API

### `POST /analyse`

Upload a video file (mp4/mov/avi/mkv/webm, max 500 MB).

**Response** (`AnalysisResponse`):
```json
{
  "payload": {
    "filename": "...",
    "duration_sec": 20.0,
    "segments": [
      {
        "segment_index": 0,
        "start_sec": 0,
        "end_sec": 5,
        "features": {
          "visual_dynamics": 6.4,
          "motion_level": 4.2,
          "scene_variation": 7.1,
          "cut_frequency": 3.0,
          "text_density": 2.5,
          "readability": 8.0,
          "visual_focus": 6.7,
          "clutter_level": 3.1,
          "audio_energy": 5.5,
          "pitch_variation": 4.8,
          "speech_rate": 5.2,
          "sync_alignment": 7.0
        },
        "derived": {
          "visual_engagement_score": 5.2,
          "cognitive_load_score": 3.1,
          "audio_engagement_score": 5.1,
          "retention_risk_score": 4.5
        }
      }
    ],
    "global_features": { "..." },
    "global_derived": { "..." }
  },
  "review": {
    "headline": "Solid visual energy but audio needs work",
    "overall_score": 6.5,
    "grade": "B",
    "insight": "...",
    "key_issues": [
      {
        "feature": "pitch_variation",
        "severity": "Medium",
        "description": "Narration is relatively monotone...",
        "recommendation": "Vary vocal tone especially at key moments..."
      }
    ],
    "segment_highlights": ["Segment 0-5s: strong opening", "..."],
    "suggested_fixes": ["Add B-roll cuts every 2-3s", "..."]
  }
}
```

### `GET /health`
```json
{ "status": "ok", "service": "CreativeIQ AI Backend" }
```

## Derived Scores

| Score | Formula |
|---|---|
| `visual_engagement_score` | avg(visual_dynamics, motion_level, scene_variation, cut_frequency) |
| `cognitive_load_score` | avg(text_density, 10−readability, clutter_level) |
| `audio_engagement_score` | avg(audio_energy, pitch_variation, 5−\|speech_rate−5\|) |
| `retention_risk_score` | avg(cognitive_load, 10−visual_engagement, 10−sync_alignment) |

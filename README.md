# Lecture Notes AI

Web app that accepts large lecture videos (up to **2GB**), splits them into time-based chunks, generates notes for each chunk with AI (including visual context from the video), and runs a final master consolidation pass.

## Features
- 2GB upload limit enforced server-side.
- Chunked ingestion pipeline for long (e.g., 2-hour) recordings.
- Per-chunk AI notes generation.
- Final master AI pass to produce cohesive lecture notes.
- Simple status polling UI.

## Run
```bash
npm install
npm start
```
Then open `http://localhost:3000`.

## Environment variables
- `OPENAI_API_KEY`: enables real multimodal note generation.
- `OPENAI_MODEL` (optional): defaults to `gpt-4.1-mini`.
- `CHUNK_SECONDS` (optional): chunk duration, defaults to `600` (10 min).

> The app uses `ffmpeg` for true video splicing. If `ffmpeg` is unavailable, it falls back to processing the whole file as one chunk.

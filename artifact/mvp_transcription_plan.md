# MVP Free Audio/Video → Text Pipeline for Hackathon

## Goal
Create a **zero‑cost** prototype that lets users drop a video/audio file, extracts the audio, transcribes it, and displays the text inside the existing React app (`classmind‑ai`).

---

## 1️⃣ High‑level Architecture (client‑only)
| Component | Responsibility |
|-----------|-----------------|
| **Dropzone** (`Dropzone.jsx`) | Accept file (video/audio) from user, preview thumbnail, pass `File` object to transcription logic. |
| **ffmpeg.wasm** (`@ffmpeg/ffmpeg`) | Run **in‑browser** FFmpeg to extract an audio track (e.g., 16 kHz mono WAV) from any video container. |
| **whisper.cpp compiled to WebAssembly** (`whisper-web` or `whisper-wasm`) | Perform speech‑to‑text **completely client‑side** – no API keys, no network calls, completely free. |
| **ProcessingState** (`ProcessingState.jsx`) | Show progress bar / spinner while the heavy transcription runs. |
| **Dashboard** (`Dashboard.jsx`) | Render the final transcript, optionally with timestamps. |

> **Why this works for a hackathon MVP**
- **Free** – all libraries run in the browser, no external paid services.
- **Privacy‑first** – audio never leaves the user’s machine.
- **No server** – you can host the static React build on GitHub Pages, Vercel, or Netlify (all free tiers). 

---

## 2️⃣ Library Choices (npm)
```bash
# Core React app (already present)
# Add audio extraction
npm i @ffmpeg/ffmpeg @ffmpeg/core

# Add Whisper‑WASM (lightweight, works without GPU)
npm i whisper-web   # or `whisper-wasm` depending on preference
```
- `@ffmpeg/ffmpeg` provides a **WebAssembly** version of FFmpeg that can run in the browser.
- `whisper-web` bundles the **tiny** Whisper model (≈75 MB) – good enough for short hackathon demos.  You can swap to `base` or `small` if you have a GPU‑enabled server later.

---

## 3️⃣ Code Sketches
### 3.1 `src/lib/ai.js` – Transcription Helper
```javascript
// src/lib/ai.js
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import Whisper from "whisper-web"; // default tiny model

const ffmpeg = createFFmpeg({ log: true });

/**
 * Convert any video/audio file to a 16kHz mono WAV using ffmpeg.wasm.
 * Returns a Blob that can be fed to Whisper.
 */
export async function extractWav(file) {
  if (!ffmpeg.isLoaded) await ffmpeg.load();
  ffmpeg.FS("writeFile", file.name, await fetchFile(file));
  const outName = "output.wav";
  // -ac 1 (mono) -ar 16000 (16 kHz) -vn (no video)
  await ffmpeg.run(
    "-i",
    file.name,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-vn",
    outName
  );
  const data = ffmpeg.FS("readFile", outName);
  return new Blob([data.buffer], { type: "audio/wav" });
}

/**
 * Run Whisper on a WAV Blob and return plain text.
 */
export async function transcribeWav(wavBlob) {
  const arrayBuffer = await wavBlob.arrayBuffer();
  const model = await Whisper.load(); // tiny model is default
  const result = await model.transcribe(new Uint8Array(arrayBuffer));
  // `result.segments` holds timestamps; we just need the text.
  return result.text;
}
```
> **Tip:** The first time the user runs the app the model will be downloaded (~75 MB). Show a friendly “Downloading model…” message in `ProcessingState`.

---

### 3.2 `Dropzone.jsx` – Hook into the helper
```javascript
// src/components/Dropzone.jsx
import React, { useState } from "react";
import { extractWav, transcribeWav } from "../lib/ai";
import ProcessingState from "./ProcessingState";

export default function Dropzone({ onResult }) {
  const [status, setStatus] = useState(null); // 'extract', 'transcribe', null

  const handleFiles = async (files) => {
    const file = files[0];
    try {
      setStatus("extract");
      const wav = await extractWav(file);
      setStatus("transcribe");
      const text = await transcribeWav(wav);
      setStatus(null);
      onResult(text);
    } catch (e) {
      console.error(e);
      setStatus(null);
      alert("Transcription failed – see console for details.");
    }
  };

  return (
    <div className="dropzone" onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
         onDragOver={e=>e.preventDefault()}>
      <p>Drag & drop a video/audio file here</p>
      {status && <ProcessingState step={status} />}
    </div>
  );
}
```

---

### 3.3 `ProcessingState.jsx` – Simple spinner
```javascript
// src/components/ProcessingState.jsx
export default function ProcessingState({ step }) {
  const messages = {
    extract: "Extracting audio…",
    transcribe: "Transcribing with Whisper (this may take a few seconds)…",
  };
  return (
    <div className="processing-state">
      <div className="spinner" /> {/* add CSS animation */}
      <p>{messages[step] || "Processing…"}</p>
    </div>
  );
}
```
Add a small CSS spinner (e.g., `border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;`).

---

### 3.4 `Dashboard.jsx` – Show transcript
```javascript
// src/components/Dashboard.jsx
import React, { useState } from "react";
import Dropzone from "./Dropzone";

export default function Dashboard() {
  const [transcript, setTranscript] = useState("");

  return (
    <div className="dashboard">
      <h1>ClassMind AI – Transcription Demo</h1>
      <Dropzone onResult={setTranscript} />
      {transcript && (
        <section className="result">
          <h2>Transcript</h2>
          <pre>{transcript}</pre>
        </section>
      )}
    </div>
  );
}
```
---

## 4️⃣ Styling (quick, premium‑looking) – `src/index.css`
```css
/* Glassmorphism dropzone */
.dropzone {
  border: 2px dashed rgba(255,255,255,0.3);
  backdrop-filter: blur(8px);
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: #fff;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
}

.processing-state {
  display: flex; align-items: center; gap: 0.8rem; margin-top: 1rem;
}

.spinner {
  width: 24px; height: 24px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top: 3px solid #00bfff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.result pre {
  background: rgba(0,0,0,0.5);
  padding: 1rem; border-radius: 8px; color: #e0ffe0;
  max-height: 60vh; overflow-y: auto;
}
```
Feel free to replace the colors with your brand palette – the glass‑morphism effect gives a premium look with almost no effort.

---

## 5️⃣ Deployment (completely free)
1. **GitHub repository** – push the code.
2. **GitHub Pages** (or Netlify/Vercel) – one‑click static hosting, **no backend needed**.
3. **Optional fallback** – if a user’s device is too weak for Whisper, you can‑switch to the free tier of **Google Speech‑to‑Text** (first 60 min/month) by calling the REST endpoint from the browser (requires an API key, but you can hide it in a Netlify function).

---

## 6️⃣ Checklist for Hackathon MVP
- [ ] Install `@ffmpeg/ffmpeg` and `whisper-web`.
- [ ] Add the extraction/transcription helpers to `src/lib/ai.js`.
- [ ] Wire up `Dropzone`, `ProcessingState`, and `Dashboard` as shown.
- [ ] Add CSS (glassmorphism, spinner) for a sleek UI.
- [ ] Test with a short (≤ 30 sec) video – ensure the model loads and transcript appears.
- [ ] Deploy to a free static host; share the live URL with judges.

---

## 7️⃣ Optional Enhancements (future, not required for MVP)
- **Speaker diarization** – use Whisper‑X or run a small clustering step on timestamps.
- **Chunked streaming** – break long files into 30‑second chunks to keep the UI responsive.
- **Summarization** – call Gemini API on the final transcript to produce a one‑sentence abstract (still free within the trial quota).
- **Download transcript** – add a “Download .txt” button in `Dashboard`.

---

**That’s the full free‑stack plan.** Let me know if you need a deeper dive into any part (e.g., bundling Whisper‑WASM, handling large files, or adding a summary step). Happy hacking!

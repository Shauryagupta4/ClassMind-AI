# 🎓 ClassMind AI — Intelligent Exam-Oriented Lecture Synthesizer

> **Turn any video, audio, or lecture transcript into structured revision notes, teacher intent exam radars, active recall quizzes, 3D flashcards, and instant PDF compendiums in seconds.**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq LPU](https://img.shields.io/badge/Groq-Inference%20Engine-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ⚡ Overview

**ClassMind AI** is an autonomous, exam-oriented lecture comprehension and revision platform built for students and educators. Instead of relying on a single slow LLM prompt, ClassMind utilizes a **distributed parallel multi-worker architecture** over Groq LPUs alongside **Groq Whisper Turbo** to deliver lightning-fast, high-yield academic study kits in real time.

---

## ✨ Key Features

### 1. 🎯 Teacher's Intent & Exam Radar (परीक्षा फोकस)
- **Pedagogical Emotion & Tone Detection**: Detects instructor vocal cues, repetitions, and pedagogical urgency (*"this is important"*, *"mark this 5 stars"*, *"ye pakka aayega"*, *"pay attention here"*).
- **High-Yield Exam Probables**: Flags guaranteed topics with the teacher's exact verbal cue quotes.
- **Teacher Warning Traps**: Identifies common exam pitfalls and confusing steps where students frequently lose marks.
- **Safe-to-Skim Topics**: Pinpoints optional reading and low-yield material so students can optimize revision time.

### 2. ⚡ Distributed Groq Parallel Compute Engine
- Tasks are fanned out concurrently across dedicated Groq workers:
  - **Worker 1 (Summary Key)**: Executive summary, glossary, and Teacher Intent detection.
  - **Worker 2 (Notes Key)**: Structured section breakdowns, high-yield points, and exhaustive detailed notes.
  - **Worker 3 (Quiz Key)**: Active recall quiz generation with custom parameters.
  - **Worker 4 (Flashcards Key)**: Cognitive active-recall 3D flashcard generation.
  - **Worker 5 (Whisper Key)**: High-speed speech-to-text with multilingual Indian classroom support (Hindi, Hinglish, English).
- Automatic model failover (`Qwen 2.5` ➔ `Llama 3.3 70B` ➔ `Llama 3.1 8B`) ensures zero downtime during peak capacity.

### 3. 📝 Active Recall Quiz Studio
- Fully customizable quiz generation:
  - **Difficulty Levels**: Easy (Foundations), Medium (Academic), Hard (Tricky Exam Edge-Cases).
  - **Question Count**: 3, 5, 8, or 10 questions.
  - **Scope**: All lecture topics or targeted section-by-section chips.
- Mid-quiz early submission with an interactive confirmation modal and score calculation.

### 4. 🃏 3D Interactive Flashcards Deck
- Smooth 3D flip card animations using Framer Motion.
- Categorized by Definition, Mechanism, Formula, Application, or Core Concept.
- Scrollable explanation boxes and active-recall confidence rating buttons.

### 5. 🎙️ Multilingual Speech & YouTube Ingestion
- Ingest local lecture recordings (MP3, WAV, M4A, MP4, WebM up to 25 MB).
- Ingest YouTube video links with automatic multitrack Hindi / English subtitle extraction.
- Client-side pre-flight size validation preventing browser upload stalls.

### 6. 📄 1-Click Formatted PDF Export
- Generates a beautifully formatted, multi-page revision PDF.
- Includes Teacher Intent radar, guaranteed exam probables, glossary definitions, and complete detailed notes.

---

## 🏗️ Architecture

```
[Lecture Media / YouTube / Text]
               │
               ▼
┌───────────────────────────────┐
│     Ingestion & Validation    │
│  - Pre-flight 25 MB Media Cap │
│  - YouTube Multitrack Server  │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│     Groq Whisper Turbo STT    │
│  (whisper-large-v3-turbo)     │
└──────────────┬────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│        Parallel Distributed Worker Pipeline             │
├─────────────┬─────────────┬──────────────┬──────────────┤
│  Summary &  │ Structured  │  Quiz Studio │ 3D Flashcards│
│ Teacher Tone│ Master Notes│   Worker     │    Worker    │
└──────┬──────┴──────┬──────┴──────┬───────┴──────┬───────┘
       │             │             │              │
       └─────────────┴──────┬──────┴──────────────┘
                            ▼
              ┌───────────────────────────┐
              │ ClassMind Neo-Brutalist UI│
              │  - Exam Intent Radar      │
              │  - Active Recall Studio   │
              │  - 1-Click PDF Generator  │
              └───────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Groq API Key](https://console.groq.com/)

### 1. Clone the repository
```bash
git clone https://github.com/Shauryagupta4/ClassMind-AI.git
cd ClassMind-AI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Add your Groq API keys:
```env
# Distributed Groq AI Keys (Can share one key or use multiple for higher rate limits)
VITE_GROQ_SUMMARY_KEY=your_groq_api_key_here
VITE_GROQ_NOTES_KEY=your_groq_api_key_here
VITE_GROQ_QUIZ_KEY=your_groq_api_key_here
VITE_GROQ_FLASHCARDS_KEY=your_groq_api_key_here
VITE_GROQ_WHISPER_KEY=your_groq_api_key_here

# Backend Transcript Server
PORT=3001
VITE_SERVER_URL=http://localhost:3001
```

### 4. Run the Application
In terminal 1 (Backend Transcript Service):
```bash
node server.js
```

In terminal 2 (Frontend Client):
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎨 Design Philosophy

ClassMind features a distinctive **Neo-Brutalist / Pastel Brutalist** design system:
- High-contrast 3px/4px solid black borders (`border-black`)
- Tactile hard-edge drop shadows (`shadow-[4px_4px_0px_#000]`)
- Calibrated pastel palettes (Rose, Mint, Butter Yellow, Lilac)
- Interactive micro-animations powered by Framer Motion

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

# 🎓 ClassMind AI — Intelligent Exam-Oriented Lecture Synthesizer

> **Turn any video, audio, or lecture transcript into structured revision notes, teacher intent exam radars, active recall quizzes, 3D flashcards, and instant PDF compendiums in seconds.**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq LPU](https://img.shields.io/badge/Groq-Inference%20Engine-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![TinyFish AI](https://img.shields.io/badge/TinyFish-Web%20%26%20Search%20Agent-0066FF?logo=target&logoColor=white)](https://tinyfish.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
---

## ⚡ Overview

**ClassMind AI** is an autonomous, exam-oriented lecture comprehension and revision platform built for students and educators. Instead of relying on a single slow LLM prompt, ClassMind utilizes a **distributed parallel multi-worker architecture** over Groq LPUs alongside **Groq Whisper Turbo** and **TinyFish Autonomous Web & Academic Search Agents** to deliver lightning-fast, high-yield academic study kits in real time.

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
- Automatic model failover (`Qwen 3.8 27B` ➔ `GPT-OSS 120B` ➔ `GPT-OSS 20B`) ensures zero downtime during peak capacity.

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

### 7. 🌐 TinyFish Autonomous Web Crawling & Live Academic Discovery
- **Autonomous Web & Syllabus Ingestion (`api.fetch.tinyfish.ai`)**: Paste any university lecture page, online syllabus, course blog, or Wikipedia article. TinyFish autonomously scrapes and cleans the content to markdown while bypassing anti-bot blockers and stripping web clutter.
- **Live Academic Search Agent (`api.search.tinyfish.ai`)**: Automatically scours verified academic databases, university portals, and online references for the lecture's core topic to provide students with relevant supplementary study materials, past question papers, and syllabus reference links.
- **Interactive In-Dashboard Search**: Students can run live queries directly within their lecture dashboard to discover external academic resources instantly.

---

## 🏗️ Architecture

```
[Lecture Media / YouTube / Syllabus URL]
               │
               ├─────────────────────────┐
               ▼                         ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│     Ingestion & Validation    │ │   TinyFish Web Crawler Agent  │
│  - Pre-flight 25 MB Media Cap │ │  (api.fetch.tinyfish.ai)      │
│  - YouTube Multitrack Server  │ │  - Clean Markdown Extractor   │
└──────────────┬────────────────┘ └──────────────┬────────────────┘
               │                                 │
               ▼                                 │
┌───────────────────────────────┐                 │
│     Groq Whisper Turbo STT    │                 │
│  (whisper-large-v3-turbo)     │                 │
└──────────────┬────────────────┘                 │
               │                                 │
               ▼◄────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│        Parallel Distributed Worker Pipeline             │
├─────────────┬─────────────┬──────────────┬──────────────┤
│  Worker 1:  │  Worker 2:  │  Worker 3:   │  Worker 4:   │
│  Summary &  │ Structured  │ Active Recall│3D Flashcards │
│ Teacher Tone│ Master Notes│  Quiz Studio │    Deck      │
└──────┬──────┴──────┬──────┴──────┬───────┴──────┬───────┘
       │             │             │              │
       └─────────────┴──────┬──────┴──────────────┘
                            ▼
              ┌───────────────────────────┐◄─── [ TinyFish Academic ]
              │ ClassMind Neo-Brutalist UI│     [    Search Agent   ]
              │  - Exam Intent Radar      │     [api.search.tinyfish]
              │  - Active Recall Studio   │
              │  - TinyFish Live Resources│
              │  - 1-Click PDF Generator  │
              └───────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Groq API Key](https://console.groq.com/)
- [TinyFish API Key](https://tinyfish.ai/) (Optional, for web crawling & academic search)

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

Add your API keys:
```env
# Distributed Groq AI Keys (Can share one key or use multiple for higher rate limits)
VITE_GROQ_SUMMARY_KEY=your_groq_api_key_here
VITE_GROQ_NOTES_KEY=your_groq_api_key_here
VITE_GROQ_QUIZ_KEY=your_groq_api_key_here
VITE_GROQ_FLASHCARDS_KEY=your_groq_api_key_here
VITE_GROQ_WHISPER_KEY=your_groq_api_key_here

# TinyFish Autonomous Web Agent API (Web Crawling & Academic Search)
VITE_TINYFISH_API_KEY=your_tinyfish_api_key_here

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

ClassMind features a distinctive **Neo-Brutalist High-Yield** design system:
- High-contrast 3px/4px solid black borders (`border-black`)
- Tactile hard-edge drop shadows (`shadow-[4px_4px_0px_#000]`)
- Calibrated focus palettes (Rose, Mint, Butter Yellow, Lilac)
- Interactive micro-animations powered by Framer Motion

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

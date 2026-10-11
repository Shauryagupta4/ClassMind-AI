# 🎓 ClassMind AI — Intelligent Exam-Oriented Lecture Synthesizer

> **Turn any video, audio, whiteboard photo, lecture slide, or transcript into structured revision notes, teacher intent exam radars, knowledge gap diagnostics, interactive mind maps, active recall quizzes, 3D flashcards, and instant PDF compendiums in seconds.**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq LPU](https://img.shields.io/badge/Groq-Distributed%20Inference-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20Gateway-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TinyFish AI](https://img.shields.io/badge/TinyFish-Web%20%26%20Search%20Agent-0066FF?logo=target&logoColor=white)](https://tinyfish.ai/)
[![Tesseract OCR](https://img.shields.io/badge/Tesseract.js-Client--Side%20OCR-5C6BC0?logo=tesseract&logoColor=white)](https://github.com/naptha/tesseract.js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%204-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## ⚡ Overview

**ClassMind AI** is an autonomous, exam-oriented lecture comprehension and revision platform built for students and educators. Instead of relying on a single slow LLM prompt, ClassMind utilizes a **distributed parallel multi-worker architecture** over Groq LPUs alongside **Groq Whisper Turbo**, **Tesseract.js Client-Side Vision OCR**, and **TinyFish Autonomous Web & Academic Search Agents** to deliver lightning-fast, high-yield academic study kits in real time.

---

## ✨ Key Features

### 1. 🎯 Teacher's Intent & Exam Radar (परीक्षा फोकस)
- **Pedagogical Emotion & Tone Detection**: Detects instructor vocal cues, repetitions, and pedagogical urgency (*"this is important"*, *"mark this 5 stars"*, *"ye pakka aayega"*, *"pay attention here"*).
- **High-Yield Exam Probables**: Flags guaranteed topics with the teacher's exact verbal cue quotes.
- **Teacher Warning Traps**: Identifies common exam pitfalls and confusing steps where students frequently lose marks.
- **Safe-to-Skim Topics**: Pinpoints optional reading and low-yield material so students can optimize revision time.

### 2. 📸 Whiteboard & Handwritten Notes OCR Vision
- **Zero-Latency In-Browser OCR**: Powered by `tesseract.js`, lecture whiteboard photos, blackboard derivations, and handwritten notebook snapshots are parsed directly in the student's browser with 0 server GPU cost.
- **Multi-Modal Lecture Synthesis**: Transcribed audio and extracted board notes merge into one cohesive academic summary.

### 3. 📁 Interactive Multi-File Staging Queue Tray
- **Batch Upload & Synthesis**: Upload multiple whiteboard photos, audio recordings, and lecture slides either at once or staged one-by-one.
- **Interactive Staging Tray**: Add, review, or remove individual file chips before triggering the unified synthesis pipeline.

### 4. ⚡ Distributed Groq 5-Worker Parallel Compute Engine
- Tasks are fanned out concurrently across dedicated Groq workers:
  - **Worker 1 (Summary Key)**: Executive summary, glossary, and Teacher Intent detection.
  - **Worker 2 (Notes Key)**: Structured section breakdowns, high-yield points, and exhaustive detailed notes.
  - **Worker 3 (Quiz Key)**: Active recall quiz generation with custom parameters.
  - **Worker 4 (Flashcards Key)**: Cognitive active-recall 3D flashcard generation.
  - **Worker 5 (Whisper Key)**: High-speed speech-to-text with multilingual Indian classroom support (Hindi, Hinglish, English).
- Automatic model failover (`Qwen 3.8 27B` ➔ `GPT-OSS 120B` ➔ `GPT-OSS 20B`) ensures zero downtime during peak capacity.

### 5. 🧠 Interactive Mind Map Studio
- **Radial Orbit & Hierarchical Tree Layouts**: Visualizes complex lecture concepts, formulas, and child definitions using Tony Buzan visual mnemonic principles.
- **Interactive Exploration**: Drag, pan, zoom, and collapse/expand branches in full screen.
- **Retina Export**: 1-click export to high-resolution PNG or vector SVG.

### 6. 📝 Active Recall Quiz Studio & Knowledge Gap Diagnostics
- **Customizable Quiz Configuration**:
  - **Difficulty Levels**: Easy (Foundations), Medium (Academic), Hard (Tricky Exam Edge-Cases).
  - **Question Count**: 3, 5, 8, or 10 questions.
  - **Scope**: All lecture topics or targeted section-by-section chips.
- **Knowledge Gap Detection**:
  - Automatically correlates every missed question back to the exact lecture section heading.
  - Generates targeted remedial notes highlighting why marks were lost.
  - **Targeted Practice Drills**: Instant 1-click generation of 3 focused practice questions exclusively on the student's weakest topic.

### 7. 🃏 3D Interactive Flashcards Deck
- Smooth 3D flip card animations using Framer Motion.
- Categorized by Definition, Mechanism, Formula, Application, or Core Concept.
- Scrollable explanation boxes and active-recall confidence rating buttons.

### 8. 🌐 TinyFish Autonomous Web Crawling & Live Academic Discovery
- **Autonomous Web Ingestion (`api.fetch.tinyfish.ai`)**: Paste any university lecture page, online syllabus, course blog, or Wikipedia article. TinyFish scrapes and cleans the content to markdown while bypassing anti-bot blockers and stripping web clutter.
- **Live Academic Search Agent (`api.search.tinyfish.ai`)**: Automatically scours verified academic databases, university portals, and online references for the lecture's core topic to provide students with past papers and reference links.
- **In-Dashboard Search**: Students can run live queries directly within their lecture dashboard to discover external academic resources instantly.

### 9. 🛡️ Enterprise Security & Decoupled Architecture
- **Firebase Auth Gateway**: Ultra-smooth 1-click Google Popup and Phone OTP authentication.
- **Supabase PostgreSQL with RLS**: Secure cloud database storing revision vaults, user lectures, and personalized knowledge gap profiles with Row-Level Security policies.
- **Refresh Resilience**: Retains current lecture state across `Ctrl+R` browser reloads with automatic error recovery via React `ErrorBoundary`.

---

## 🏗️ Architecture

```
[Audio / Video / Whiteboard Photo / YouTube / Web URL]
                       │
       ┌───────────────┼───────────────┬─────────────────┐
       ▼               ▼               ▼                 ▼
┌──────────────┐┌──────────────┐┌──────────────┐ ┌───────────────┐
│ Groq Whisper ││ Tesseract.js ││ YouTube STT  │ │ TinyFish Web  │
│  Turbo STT   ││ In-Browser   ││ Multitrack   │ │ Autonomous    │
│(multilingual)││ Vision OCR   ││ Extraction   │ │ Crawler       │
└──────┬───────┘└──────┬───────┘└──────┬───────┘ └──────┬────────┘
       │               │               │                │
       └───────────────┼───────────────┴────────────────┘
                       ▼
    [ Interactive Staging Queue & Merged Context ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│            Distributed Groq 5-Worker Parallel Pipeline       │
├──────────────┬──────────────┬───────────────┬────────────────┤
│  Worker 1:   │  Worker 2:   │  Worker 3:    │   Worker 4:    │
│  Summary &   │  Structured  │ Active Recall │  3D Flashcard  │
│ Teacher Tone │ Master Notes │  Quiz Studio  │     Deck       │
└──────┬───────┴──────┬───────┴───────┬───────┴────────┬───────┘
       │              │               │                │
       └──────────────┴───────┬───────┴────────────────┘
                              ▼
                ┌───────────────────────────┐
                │ ClassMind Neo-Brutalist UI│
                ├───────────────────────────┤
                │ • Exam Intent Radar       │
                │ • Knowledge Gap Remedial  │
                │ • Mind Map Studio (Retina)│
                │ • Active Recall Studio    │
                │ • 3D Flashcard Deck       │
                │ • TinyFish Live Academic  │
                │ • 1-Click PDF Compendium  │
                └─────────────┬─────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
     ┌───────────────────┐         ┌───────────────────┐
     │ Firebase 1-Click  │         │ Supabase Database │
     │ Identity Gateway  │         │  with RLS Vaults  │
     └───────────────────┘         └───────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Groq API Key](https://console.groq.com/)
- [Supabase Project](https://supabase.com/) (For cloud revision vault saving)
- [Firebase Project](https://firebase.google.com/) (For 1-click Google authentication)
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

# Supabase Authentication & Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Authentication Gateway (Optional custom project override)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
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
- Calibrated focus palettes (Rose, Mint, Butter Yellow, Lilac, Soft Lavender)
- Interactive micro-animations powered by Framer Motion

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

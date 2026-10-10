// Distributed Groq AI API Keys
const SUMMARY_KEY = import.meta.env.VITE_GROQ_SUMMARY_KEY || import.meta.env.VITE_GROQ_API_KEY || "";
const NOTES_KEY = import.meta.env.VITE_GROQ_NOTES_KEY || import.meta.env.VITE_GROQ_API_KEY || "";
const QUIZ_KEY = import.meta.env.VITE_GROQ_QUIZ_KEY || import.meta.env.VITE_GROQ_API_KEY || "";
const FLASHCARDS_KEY = import.meta.env.VITE_GROQ_FLASHCARDS_KEY || import.meta.env.VITE_GROQ_API_KEY || "";
const WHISPER_KEY = import.meta.env.VITE_GROQ_WHISPER_KEY || import.meta.env.VITE_GROQ_SUMMARY_KEY || import.meta.env.VITE_GROQ_API_KEY || "";

const RAW_MODEL = import.meta.env.VITE_GROQ_MODEL || "qwen/qwen3.8-27b";
const MODEL = (!RAW_MODEL || RAW_MODEL.includes("llama")) ? "qwen/qwen3.8-27b" : RAW_MODEL;

/**
 * Universal Groq Chat Completion caller with resilient model failover
 */
async function callGroq(prompt, apiKey, options = {}) {
  const cleanKey = (apiKey || "").trim();
  if (!cleanKey) {
    throw new Error("Missing Groq API Key! Please add VITE_GROQ_API_KEY in your Vercel Project Settings > Environment Variables, then Redeploy.");
  }

  let effectivePrimary = options.model || MODEL;
  if (!effectivePrimary || effectivePrimary.includes("llama")) {
    effectivePrimary = "qwen/qwen3.8-27b";
  }

  // Active, verified Groq models supported by the API
  const modelsToTry = [...new Set([effectivePrimary, "openai/gpt-oss-120b", "openai/gpt-oss-20b"])];

  let primaryError = null;
  let lastError = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: options.temperature ?? 0.7,
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Groq API Error on ${model}`);
      }
      return JSON.parse(data.choices[0].message.content);
    } catch (err) {
      if (i === 0) primaryError = err;
      lastError = err;
      console.warn(`Groq request with ${model} failed, trying failover:`, err.message);
    }
  }
  throw primaryError || lastError || new Error("All Groq models encountered errors.");
}

/**
 * Converts seconds into [MM:SS] or [HH:MM:SS] timestamp
 */
export function formatTimestamp(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${String(h).padStart(2, '0')}:${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
}

/**
 * Audio/Video Transcription using Groq Whisper (Supports Hindi, English & 90+ languages with timestamps)
 * Note: Groq Whisper has a hard 25 MB maximum payload limit.
 */
export async function transcribeAudio(file, language = null) {
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB limit
  if (file && file.size > MAX_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMB} MB) exceeds Groq Whisper's 25 MB limit. Please compress the file or convert to audio (.mp3 / .m4a).`);
  }

  const cleanWhisperKey = (WHISPER_KEY || "").trim();
  if (!cleanWhisperKey) {
    throw new Error("Missing Groq Whisper Key! Please add VITE_GROQ_WHISPER_KEY or VITE_GROQ_API_KEY in your Vercel Project Settings > Environment Variables, then Redeploy.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 75000); // 75s safety timeout

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cleanWhisperKey}`
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to transcribe audio file");
    }

    // Format segments into timestamped transcript lines
    if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
      const timestampedLines = data.segments.map(seg => {
        const start = formatTimestamp(seg.start || 0);
        return `[${start}] ${seg.text.trim()}`;
      });
      return timestampedLines.join('\n');
    }

    return data.text || "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("Transcription timed out. The file might be taking too long to upload over your connection.");
    }
    throw err;
  }
}


/**
 * Worker 1: Summary, Title, Academic Subject, Key Glossary & Teacher Intent Detection (Summary API Key)
 */
async function fetchSummaryWorker(transcript) {
  const prompt = `You are an elite multilingual academic professor, cognitive psychologist, and master examination strategist.
The lecture material may be in English, Hindi (हिंदी / Devanagari), Romanized Hinglish, or any other language.
Comprehend the lecture content and deeply analyze the TEACHER'S INTENT, PEDAGOGICAL TONE, AND EMOTIONAL EMPHASIS:
- Detect verbal emphasis cues: "this is important", "mark this 5 stars", "exam me zaroor aayega", "pay attention here", "concentrate on this formula", "students always mess this up".
- Detect de-emphasis cues: "just for reference", "won't be asked in finals", "skip this proof", "optional reading".
- Detect warnings and emotional urgency: places where the teacher shows heightened concern, warns of traps, or repeats a definition multiple times.

Format strictly in JSON:
{
  "title": "string (engaging, descriptive lecture title)",
  "subject": "string (academic discipline/field)",
  "summary": "string (concise 2-3 sentence executive overview capturing core objectives and findings)",
  "teacherIntent": {
    "overallTone": "string (e.g. 'Highly Exam-Oriented & Urging Focus', 'Concept-Building & Exploratory', 'Stern on Fundamentals', 'Fast-Paced Exam Sprint')",
    "examReadinessScore": 88,
    "highYieldTopics": [
      {
        "topic": "string (e.g. 'Photosynthesis Light Reactions' or 'Derivation of Bernoulli Equation')",
        "intentLevel": "MUST-KNOW | HIGH PRIORITY | FREQUENTLY TESTED",
        "verbalCues": "string (direct quote or paraphrase showing teacher's emphasis, e.g. 'Teacher stressed: Mark this 5 stars, repeated twice that this carries 5 marks in finals')",
        "whyImportant": "string (exact academic reason why teacher prioritized this for exams)",
        "timestamp": "string (e.g. '02:40' if identifiable from [MM:SS] markers in transcript)"
      }
    ],
    "warningTraps": [
      {
        "concept": "string (topic or step)",
        "warning": "string (teacher's explicit warning where students lose marks or confuse concepts)",
        "timestamp": "string (e.g. '05:15' if identifiable from transcript markers)"
      }
    ],
    "lowPriorityTopics": [
      {
        "topic": "string",
        "reason": "string (why the teacher indicated this is low weightage, supplementary, or safe to skim)"
      }
    ]
  },
  "briefNotes": [
    "string (high-yield key takeaway 1)",
    "string (high-yield key takeaway 2)",
    "string (high-yield key takeaway 3)"
  ],
  "keyTerms": [
    "string (Term 1: concise definition and significance)",
    "string (Term 2: concise definition and significance)",
    "string (Term 3: concise definition and significance)",
    "string (Term 4: concise definition and significance)"
  ]
}

Lecture Material:
${transcript}`;

  return await callGroq(prompt, SUMMARY_KEY);
}

/**
 * Worker 2: Structured Notes, Detailed Breakdown & In-Depth PDF Compendium (Notes & PDF Key)
 */
async function fetchNotesWorker(transcript) {
  const prompt = `You are a master academic notes compiler, university professor, and exam curriculum specialist.
The lecture material may be in English, Hindi (हिंदी / Devanagari), Romanized Hinglish, or any other language.
The lecture material may contain audio/video timeline markers formatted like [MM:SS] or [HH:MM:SS].

Understand the content completely in its original language and generate high-yield, exhaustive academic sections for both on-screen quick review and downloadable comprehensive master notes.
TIMESTAMPS: For every section, extract or calculate the start and end timestamp (e.g. "01:25 - 04:30" or "00:00 - 02:45") from the transcript time markers where this section's topic is covered in the audio/video.
For every section, evaluate the TEACHER'S INTENT and assign an exam intent badge along with a teacher's emphasis note.
IMPORTANT FOR DETAILED NOTES: Provide in-depth, thorough explanations in detailedContent and comprehensiveGuide so the resulting PDF reads like an authoritative textbook chapter with complete conceptual clarity.

Format strictly in JSON:
{
  "sections": [
    {
      "heading": "string (clear topic heading)",
      "timestamp": "string (e.g. '01:25 - 04:30' or '00:00 - 02:15' indicating when this topic occurs in the audio/video)",
      "intentBadge": "string (one of: '🔥 MUST-KNOW EXAM TOPIC', '⚠️ COMMON EXAM TRAP', '🎯 CORE MECHANISM', '📖 FOUNDATIONAL')",
      "teacherEmphasis": "string (concise quote or highlight of teacher's attitude towards this topic, e.g. 'Teacher highlighted: Crucial for numerical problems')",
      "points": [
        "string (concise bullet point for quick on-screen scanning)",
        "string (concise bullet point for quick on-screen scanning)"
      ],
      "detailedContent": "string (exhaustive, thorough multi-paragraph textbook-grade explanation. Must comprehensively break down underlying mechanisms, step-by-step logic, formulas/laws, technical architecture, real-world case studies, and deep conceptual nuances so a student can master the topic purely from these notes)"
    }
  ],
  "comprehensiveGuide": "string (extensive academic master study guide chapter formatted with clear markdown headings, deep dive conceptual breakdowns, formulas, common exam misconceptions, and comprehensive analysis)"
}

Lecture Material:
${transcript}`;

  return await callGroq(prompt, NOTES_KEY);
}

/**
 * Worker 3: Active Recall Quiz Generation (Quiz API Key)
 */
async function fetchQuizWorker(context, preferences = {}) {
  const {
    difficulty = 'medium',
    numQuestions = 4,
    selectedTopics = []
  } = preferences;

  const difficultyPrompt = {
    easy: "Difficulty Level: Beginner / Easy. Focus on foundational definitions, direct identification of core principles, and straightforward factual recall.",
    medium: "Difficulty Level: Intermediate / Standard Academic. Focus on conceptual understanding, cause-and-effect relationships, and key mechanisms.",
    hard: "Difficulty Level: Advanced / Exam Master. Focus on intricate multi-step problem solving, tricky scenario analysis, distinguishing subtle edge cases, formulas/laws, and deep conceptual deductions."
  }[difficulty] || "Difficulty Level: Intermediate / Standard Academic.";

  const topicPrompt = Array.isArray(selectedTopics) && selectedTopics.length > 0
    ? `Specific Topic Scope: Focus questions strictly on the following topic(s): ${selectedTopics.join(', ')}.`
    : `Topic Scope: Comprehensive coverage across all main sections of the lecture material.`;

  const prompt = `You are an elite academic professor and master examination creator.
The lecture material may be in English, Hindi (हिंदी), Hinglish, or other languages.
Comprehend the underlying academic concepts and formulate an active-recall multiple-choice quiz adhering strictly to the user preferences:
- Total Questions: Exactly ${numQuestions} questions.
- ${difficultyPrompt}
- ${topicPrompt}
- TEACHER'S INTENT & EXAM ALIGNMENT: Prioritize formulating questions around topics and formulas that the instructor verbally emphasized, highlighted with warnings, or marked as high-yield exam material.

Format strictly in JSON:
{
  "quizTitle": "string (engaging, descriptive quiz title reflecting difficulty and focus)",
  "difficulty": "${difficulty}",
  "questionCount": ${numQuestions},
  "questions": [
    {
      "id": 1,
      "question": "string (clear question matching the ${difficulty} difficulty level)",
      "options": ["string (Option A)", "string (Option B)", "string (Option C)", "string (Option D)"],
      "correctIndex": 0,
      "explanation": "string explaining why this answer is correct and connecting to teacher's core exam takeaway"
    }
  ]
}

Lecture Material:
${context}`;

  return await callGroq(prompt, QUIZ_KEY);
}

/**
 * Worker 4: Interactive Flashcards Generation (Flashcards API Key)
 */
async function fetchFlashcardsWorker(context) {
  const prompt = `You are an expert cognitive learning specialist, exam strategist, and memory retention coach.
The lecture material may be in English, Hindi (हिंदी), Hinglish, or other languages.
Comprehend the core mechanisms and create 6 to 8 high-yield interactive active-recall study flashcards.
Focus heavily on the TEACHER'S EMPHASIS: key definitions, must-know formulas, and tricky pitfalls the teacher warned students about.
Each flashcard must feature a thought-provoking front question/concept and a clear, thorough explanation or answer on the back (in 2-3 focused sentences).

Format strictly in JSON:
{
  "deckTitle": "string (e.g. Core Concepts Mastery Deck)",
  "flashcards": [
    {
      "id": 1,
      "front": "string (Core question, definition query, or conceptual scenario)",
      "back": "string (Crisp, high-yield explanation in 2-3 sentences explaining mechanisms, significance, or solution)",
      "category": "string (e.g. Definition, Mechanism, Formula, Application, or Key Concept)",
      "hint": "string (Short subtle memory clue or mnemonic)"
    }
  ]
}

Lecture Material:
${context}`;

  return await callGroq(prompt, FLASHCARDS_KEY);
}

/**
 * Distributed Parallel Lecture Processing
 * Distributes workload across 4 separate Groq API keys simultaneously:
 * - Summary Key     -> Title, Subject, Executive Summary, Brief Notes, Key Terms, Teacher Intent Detection
 * - Notes Key       -> Structured Sections, Points, Detailed Content, Intent Badges, Comprehensive Guide
 * - Quiz Key        -> Active Recall Quiz (pre-computed in parallel)
 * - Flashcards Key  -> Active Recall Flashcard Deck (pre-computed in parallel)
 */
export const processLecture = async (transcript) => {
  // Cap input text to ~14,000 characters to stay safely within token limits
  const safeTranscript = transcript && transcript.length > 14000 
    ? transcript.slice(0, 14000) + "\n\n[Content truncated to primary sections for optimal processing]" 
    : transcript;

  // Run all 4 workers simultaneously across the distributed API keys
  const [summaryOutcome, notesOutcome, quizOutcome, flashcardsOutcome] = await Promise.allSettled([
    fetchSummaryWorker(safeTranscript),
    fetchNotesWorker(safeTranscript),
    fetchQuizWorker(safeTranscript),
    fetchFlashcardsWorker(safeTranscript)
  ]);

  const summaryData = summaryOutcome.status === 'fulfilled' ? summaryOutcome.value : {};
  const notesData = notesOutcome.status === 'fulfilled' ? notesOutcome.value : {};
  const quizData = quizOutcome.status === 'fulfilled' ? quizOutcome.value : null;
  const flashcardsData = flashcardsOutcome.status === 'fulfilled' ? flashcardsOutcome.value : null;

  if (summaryOutcome.status === 'rejected' && notesOutcome.status === 'rejected') {
    throw new Error(summaryOutcome.reason?.message || notesOutcome.reason?.message || "Failed to process lecture across distributed workers");
  }

  // Normalize keyTerms to always guarantee a clean array of strings
  const rawTerms = summaryData.keyTerms || summaryData.key_terms || summaryData.keyterms || summaryData.keywords || [];
  let normalizedTerms = [];
  if (Array.isArray(rawTerms)) {
    normalizedTerms = rawTerms.map(t => {
      if (typeof t === 'object' && t !== null) {
        return t.term || t.name ? `${t.term || t.name}${t.definition ? `: ${t.definition}` : ''}` : JSON.stringify(t);
      }
      return String(t);
    }).filter(Boolean);
  } else if (typeof rawTerms === 'string') {
    normalizedTerms = rawTerms.split(/[,;\n]/).map(t => t.replace(/^[-*•\d.]+\s*/, '').trim()).filter(Boolean);
  }

  // Helper to parse "MM:SS" or "HH:MM:SS" to seconds for audio/video seeking
  const parseTimestampToSeconds = (ts) => {
    if (!ts || typeof ts !== 'string') return 0;
    const match = ts.match(/(\d+):(\d+)(?::(\d+))?/);
    if (!match) return 0;
    if (match[3]) {
      return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
    }
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  };

  // Normalize sections and guarantee structured audio/video timestamps
  const rawSections = notesData.sections || summaryData.sections || [];
  const sections = Array.isArray(rawSections) ? rawSections.map((sec, idx) => {
    let ts = sec.timestamp;
    if (!ts || typeof ts !== 'string' || !ts.includes(':')) {
      const startMin = idx * 3;
      const endMin = (idx + 1) * 3;
      ts = `${String(startMin).padStart(2, '0')}:00 - ${String(endMin).padStart(2, '0')}:00`;
    }
    return {
      ...sec,
      timestamp: ts,
      startSeconds: parseTimestampToSeconds(ts)
    };
  }) : [];

  // Fallback to extract terms from sections if empty
  if (normalizedTerms.length === 0 && Array.isArray(sections)) {
    normalizedTerms = sections.map(s => s.heading).filter(Boolean);
  }

  // Normalize Teacher Intent & Emotion Detection
  const rawIntent = summaryData.teacherIntent || {};
  const teacherIntent = {
    overallTone: rawIntent.overallTone || "Exam-Focused & Rigorous",
    examReadinessScore: typeof rawIntent.examReadinessScore === 'number' ? rawIntent.examReadinessScore : 88,
    highYieldTopics: Array.isArray(rawIntent.highYieldTopics) && rawIntent.highYieldTopics.length > 0
      ? rawIntent.highYieldTopics
      : (summaryData.briefNotes || []).slice(0, 3).map((note, i) => ({
          topic: note.split(/[:\-–—]/)[0]?.trim() || `Core Topic ${i + 1}`,
          intentLevel: "MUST-KNOW",
          verbalCues: "Instructor emphasized this concept for foundational exam mastery.",
          whyImportant: note
        })),
    warningTraps: Array.isArray(rawIntent.warningTraps) ? rawIntent.warningTraps : [],
    lowPriorityTopics: Array.isArray(rawIntent.lowPriorityTopics) ? rawIntent.lowPriorityTopics : []
  };

  return {
    title: summaryData.title || "Lecture Notes",
    subject: summaryData.subject || "General Studies",
    summary: summaryData.summary || "Summary generated from lecture transcript.",
    teacherIntent,
    briefNotes: summaryData.briefNotes || [],
    sections: sections,
    keyTerms: normalizedTerms,
    comprehensiveGuide: notesData.comprehensiveGuide || "",
    cachedQuiz: quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0 ? quizData : null,
    cachedFlashcards: flashcardsData && Array.isArray(flashcardsData.flashcards) && flashcardsData.flashcards.length > 0 ? flashcardsData : null,
    cachedMindMap: buildDeterministicMindMap({
      title: summaryData.title || "Lecture Notes",
      subject: summaryData.subject || "General Studies",
      summary: summaryData.summary || "",
      sections: sections,
      teacherIntent: teacherIntent,
      keyTerms: normalizedTerms
    })
  };
};

/**
 * Active Recall Quiz Generator (uses dedicated QUIZ_KEY with preferences support)
 */
export const generateQuiz = async (lectureData, preferences = null) => {
  if (!preferences && lectureData?.cachedQuiz && Array.isArray(lectureData.cachedQuiz.questions) && lectureData.cachedQuiz.questions.length > 0) {
    return lectureData.cachedQuiz;
  }

  const prefs = preferences || { difficulty: 'medium', numQuestions: 4, selectedTopics: [] };

  const context = typeof lectureData === 'string'
    ? lectureData
    : `Title: ${lectureData?.title || 'Lecture'}\nSubject: ${lectureData?.subject || 'General'}\nSummary: ${lectureData?.summary || ''}\nKey Terms: ${lectureData?.keyTerms?.join(', ') || ''}\nSections: ${JSON.stringify(lectureData?.sections || [])}`;

  try {
    const result = await fetchQuizWorker(context, prefs);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result;
    }
    throw new Error("Invalid quiz structure returned from API");
  } catch (err) {
    console.warn("Dedicated quiz API encountered issue, deploying contextual fallback:", err);
    return getFallbackQuiz(lectureData, prefs);
  }
};

/**
 * Interactive Flashcard Deck Generator (uses dedicated FLASHCARDS_KEY)
 */
export const generateFlashcards = async (lectureData) => {
  if (lectureData?.cachedFlashcards && Array.isArray(lectureData.cachedFlashcards.flashcards) && lectureData.cachedFlashcards.flashcards.length > 0) {
    return lectureData.cachedFlashcards;
  }

  const context = typeof lectureData === 'string'
    ? lectureData
    : `Title: ${lectureData?.title || 'Lecture'}\nSubject: ${lectureData?.subject || 'General'}\nSummary: ${lectureData?.summary || ''}\nKey Terms: ${lectureData?.keyTerms?.join(', ') || ''}\nSections: ${JSON.stringify(lectureData?.sections || [])}`;

  try {
    const result = await fetchFlashcardsWorker(context);
    if (result && Array.isArray(result.flashcards) && result.flashcards.length > 0) {
      return result;
    }
    throw new Error("Invalid flashcards structure returned from API");
  } catch (err) {
    console.warn("Dedicated flashcards API encountered issue, deploying contextual fallback:", err);
    return getFallbackFlashcards(lectureData);
  }
};

const getFallbackQuiz = (lectureData, prefs = {}) => {
  const count = Number(prefs?.numQuestions) || 4;
  const difficulty = prefs?.difficulty || "medium";
  const title = lectureData?.title || "Active Recall Quiz";
  const terms = Array.isArray(lectureData?.keyTerms) && lectureData.keyTerms.length > 0
    ? lectureData.keyTerms
    : ["Core Concept", "Key Definition", "Primary Principle", "Core Methodology", "Mechanism", "Application"];
  
  const sections = Array.isArray(lectureData?.sections) && lectureData.sections.length > 0
    ? (prefs?.selectedTopics?.length > 0 
        ? lectureData.sections.filter(s => prefs.selectedTopics.includes(s.heading))
        : lectureData.sections)
    : [{ heading: "Key Fundamentals", points: [lectureData?.summary || "Essential review concept"] }];

  const effectiveSections = sections.length > 0 ? sections : (lectureData?.sections || [{ heading: "Fundamentals", points: ["Core principle"] }]);

  return {
    quizTitle: `${title} - ${difficulty.toUpperCase()} Quiz`,
    difficulty: difficulty,
    questionCount: count,
    questions: Array.from({ length: Math.min(count, 10) }, (_, idx) => {
      const term = terms[idx % terms.length];
      const section = effectiveSections[idx % effectiveSections.length];
      const point = section.points?.[0] || `Understanding the role and application of ${term} in ${title}.`;
      return {
        id: idx + 1,
        question: `[${difficulty.toUpperCase()}] In the context of ${section.heading || title}, how is "${term}" defined or applied?`,
        options: [
          point,
          `An irrelevant secondary parameter not directly related to ${title}`,
          `An obsolete theory superseded in modern literature`,
          `A computational artifact with no physical interpretation`
        ],
        correctIndex: 0,
        explanation: `"${term}" directly relates to ${section.heading || title}: ${point}`
      };
    })
  };
};

const getFallbackFlashcards = (lectureData) => {
  const title = lectureData?.title || "Lecture Flashcards";
  const terms = Array.isArray(lectureData?.keyTerms) && lectureData.keyTerms.length > 0
    ? lectureData.keyTerms
    : ["Core Mechanism", "Primary Rule", "Underlying Principle", "Methodology"];
  
  const sections = Array.isArray(lectureData?.sections) && lectureData.sections.length > 0
    ? lectureData.sections
    : [{ heading: "Key Concept", points: [lectureData?.summary || "Fundamental study principle"] }];

  const cards = terms.slice(0, 6).map((term, idx) => {
    const section = sections[idx % sections.length];
    const point = section.points?.[0] || lectureData?.summary || `Crucial concept within ${title}.`;
    return {
      id: idx + 1,
      front: `What is the significance and definition of "${term}"?`,
      back: `${point}\n\nKey context from ${section.heading || title}.`,
      category: idx % 2 === 0 ? "Key Term" : "Core Mechanism",
      hint: `Pertains to ${section.heading || 'lecture core concepts'}`
    };
  });

  return {
    deckTitle: `${title} - Flashcard Deck`,
    flashcards: cards
  };
};

/**
 * Counts total nodes recursively in a mind map tree
 */
function countNodes(node) {
  if (!node) return 0;
  let count = 1;
  if (Array.isArray(node.children)) {
    node.children.forEach(c => {
      count += countNodes(c);
    });
  }
  return count;
}

/**
 * Recursively enriches an AI generated mind map tree with unique IDs, badges, and pastel palettes
 */
function enrichMindMapTree(node, lectureData, depth = 0, index = 0, parentColor = null) {
  const pastelColors = [
    '#FFCCD5', // Blush Rose
    '#C7E9DE', // Mint
    '#FFF1C5', // Buttercream
    '#E8D7F1', // Lavender
    '#BAE6FD', // Sky Blue
    '#FFD7BA'  // Peach
  ];

  const nodeColor = depth === 0 
    ? '#FFF1C5' 
    : depth === 1 
    ? pastelColors[index % pastelColors.length] 
    : parentColor || pastelColors[index % pastelColors.length];

  const id = `node-${depth}-${index}-${Math.random().toString(36).substr(2, 6)}`;

  return {
    id,
    title: node.title || `Concept ${index + 1}`,
    badge: node.badge || (depth === 0 ? (lectureData?.subject || 'CENTRAL HUB') : null),
    description: node.description || node.details || '',
    color: nodeColor,
    isRoot: depth === 0,
    depth,
    children: Array.isArray(node.children) 
      ? node.children.map((c, cIdx) => enrichMindMapTree(c, lectureData, depth + 1, cIdx, nodeColor))
      : []
  };
}

/**
 * Builds a deterministic, guaranteed mind map tree from existing lecture sections and metadata
 */
export const buildDeterministicMindMap = (lectureData) => {
  const title = lectureData?.title || "Central Lecture Topic";
  const subject = lectureData?.subject || "General Studies";
  const summary = lectureData?.summary || "";
  const sections = Array.isArray(lectureData?.sections) ? lectureData.sections : [];
  const teacherIntent = lectureData?.teacherIntent || {};
  const keyTerms = Array.isArray(lectureData?.keyTerms) ? lectureData.keyTerms : [];

  const pastelColors = [
    '#FFCCD5', // Blush Rose
    '#C7E9DE', // Mint
    '#FFF1C5', // Buttercream
    '#E8D7F1', // Lavender
    '#BAE6FD', // Sky Blue
    '#FFD7BA'  // Peach
  ];

  const root = {
    id: 'root',
    title: title,
    badge: subject.toUpperCase(),
    description: summary,
    color: '#FFF1C5',
    isRoot: true,
    depth: 0,
    children: []
  };

  // 1. Branches from lecture sections
  sections.forEach((sec, sIdx) => {
    const branchColor = pastelColors[sIdx % pastelColors.length];
    const cleanBadge = sec.intentBadge 
      ? sec.intentBadge.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
      : `MODULE ${sIdx + 1}`;

    const secNode = {
      id: `sec-${sIdx}`,
      title: sec.heading || `Core Topic ${sIdx + 1}`,
      badge: cleanBadge,
      teacherEmphasis: sec.teacherEmphasis || null,
      description: sec.detailedContent || sec.points?.join('. ') || '',
      color: branchColor,
      depth: 1,
      children: []
    };

    // Sub-branches from points
    if (Array.isArray(sec.points)) {
      sec.points.forEach((pt, pIdx) => {
        let ptTitle = pt;
        let ptDesc = '';
        if (pt.includes(':')) {
          const split = pt.split(':');
          ptTitle = split[0].trim();
          ptDesc = split.slice(1).join(':').trim();
        } else if (pt.includes(' - ')) {
          const split = pt.split(' - ');
          ptTitle = split[0].trim();
          ptDesc = split.slice(1).join(' - ').trim();
        }

        secNode.children.push({
          id: `pt-${sIdx}-${pIdx}`,
          title: ptTitle,
          description: ptDesc || pt,
          color: branchColor,
          depth: 2,
          children: []
        });
      });
    }

    root.children.push(secNode);
  });

  // 2. High-Yield Exam Topics Branch (if available)
  if (Array.isArray(teacherIntent.highYieldTopics) && teacherIntent.highYieldTopics.length > 0) {
    root.children.push({
      id: 'exam-probables',
      title: "Exam High-Yield Topics",
      badge: "EXAM RADAR",
      description: `Analysis of instructor vocal emphasis. Tone: ${teacherIntent.overallTone || 'Exam-Oriented'}`,
      color: '#FFCCD5',
      depth: 1,
      children: teacherIntent.highYieldTopics.slice(0, 4).map((item, idx) => ({
        id: `exam-topic-${idx}`,
        title: item.topic,
        badge: item.intentLevel || 'MUST-KNOW',
        description: item.whyImportant || item.verbalCues || 'Crucial for exams.',
        color: '#FFE4E6',
        depth: 2,
        children: []
      }))
    });
  }

  // 3. Warning Pitfalls & Traps Branch (if available)
  if (Array.isArray(teacherIntent.warningTraps) && teacherIntent.warningTraps.length > 0) {
    root.children.push({
      id: 'warning-traps',
      title: "Teacher Warning Traps",
      badge: "PITFALLS",
      description: "Critical areas where students commonly lose marks or confuse concepts.",
      color: '#FEF3C7',
      depth: 1,
      children: teacherIntent.warningTraps.slice(0, 4).map((trap, idx) => ({
        id: `trap-${idx}`,
        title: trap.concept || `Pitfall #${idx + 1}`,
        badge: "EXAM TRAP",
        description: trap.warning || 'Alert flagged by teacher.',
        color: '#FFFBEB',
        depth: 2,
        children: []
      }))
    });
  }

  // 4. Key Glossary Branch (if under 6 main branches)
  if (keyTerms.length > 0 && root.children.length < 6) {
    root.children.push({
      id: 'key-glossary',
      title: "Key Glossary Terms",
      badge: "GLOSSARY",
      description: "Fundamental terminology and academic definitions.",
      color: '#E8D7F1',
      depth: 1,
      children: keyTerms.slice(0, 5).map((term, idx) => {
        let tName = term;
        let tDef = '';
        if (typeof term === 'string' && term.includes(':')) {
          const parts = term.split(':');
          tName = parts[0].trim();
          tDef = parts.slice(1).join(':').trim();
        }
        return {
          id: `term-${idx}`,
          title: tName,
          description: tDef || `Key concept in ${title}`,
          color: '#F3E8FF',
          depth: 2,
          children: []
        };
      })
    });
  }

  return {
    root,
    totalNodes: countNodes(root)
  };
};

/**
 * Generates an interactive Mind Map tree using Groq AI with instant deterministic fallback
 */
export const generateMindMap = async (lectureData, forceRegenerate = false) => {
  if (!forceRegenerate && lectureData?.cachedMindMap?.root) {
    return lectureData.cachedMindMap;
  }

  const fallbackMap = buildDeterministicMindMap(lectureData);

  try {
    const prompt = `You are an elite educational cognitive psychologist and concept-mapping architect.
Synthesize the lecture material into a hierarchical conceptual mind map tree.

Lecture Material:
Title: ${lectureData?.title || 'Lecture'}
Subject: ${lectureData?.subject || 'General'}
Summary: ${lectureData?.summary || ''}
Sections: ${JSON.stringify((lectureData?.sections || []).map(s => ({ heading: s.heading, points: s.points, intent: s.intentBadge })))}

Format strictly in JSON:
{
  "root": {
    "title": "Central Topic Title",
    "badge": "MAIN THEME",
    "description": "Concise 1-sentence essence",
    "children": [
      {
        "title": "Pillar / Core Module Name",
        "badge": "CORE MECHANISM | MUST-KNOW | FOUNDATIONAL",
        "description": "Comprehensive explanation of this pillar",
        "children": [
          {
            "title": "Key Concept / Law / Mechanism",
            "description": "Detailed theoretical mechanics, formulas, or rules",
            "children": [
              {
                "title": "Application or Practical Case",
                "description": "Concrete example or common exam trap"
              }
            ]
          }
        ]
      }
    ]
  }
}`;

    const aiRes = await callGroq(prompt, NOTES_KEY);
    if (aiRes && aiRes.root && Array.isArray(aiRes.root.children) && aiRes.root.children.length > 0) {
      const enrichedRoot = enrichMindMapTree(aiRes.root, lectureData);
      return {
        root: enrichedRoot,
        totalNodes: countNodes(enrichedRoot)
      };
    }
  } catch (err) {
    console.warn("AI mind map synthesis failed, deploying structured fallback:", err);
  }

  return fallbackMap;
};

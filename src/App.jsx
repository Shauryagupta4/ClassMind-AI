import React, { useState, useMemo, useEffect } from 'react'
import Dropzone from './components/Dropzone'
import ProcessingState from './components/ProcessingState'
import Dashboard from './components/Dashboard'
import YouTubeInput from './components/YouTubeInput'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import SavedLecturesModal from './components/SavedLecturesModal'
import { processLecture, transcribeAudio } from './lib/ai'
import { saveLecture, getUserLectures } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'
import { useTheme } from './context/ThemeContext'

const defaultBadges = [
  { icon: '🧠', text: 'EXAM RADAR' },
  { icon: '⚡', text: 'HIGH CONTRAST' },
  { icon: '✦', text: '1-CLICK PDF' },
  { icon: '✨', text: 'ZERO NOISE' },
  { icon: '💡', text: '100% RECALL' },
  { icon: '🎯', text: 'MASTER SPEC' },
];

/**
 * Extracts concise 1-2 word keywords from lecture data to display on ambient floating badges
 */
const extractTopicWords = (data) => {
  if (!data) return [];
  const list = [];

  const cleanToShortWords = (str) => {
    if (!str || typeof str !== 'string') return null;
    const stripped = str
      .split(/[:\-–—(]/)[0]
      .replace(/^[0-9#\.\s*•]+/, '')
      .replace(/[^\w\s]/g, '')
      .trim();
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    return words.slice(0, 2).join(' ').toUpperCase();
  };

  // 1. From key terms (primary glossary)
  if (Array.isArray(data.keyTerms)) {
    data.keyTerms.forEach(t => {
      const termStr = typeof t === 'object' && t !== null ? (t.term || t.name) : t;
      const w = cleanToShortWords(termStr);
      if (w && w.length >= 2 && !list.includes(w)) list.push(w);
    });
  }

  // 2. From section headings
  if (Array.isArray(data.sections)) {
    data.sections.forEach(s => {
      const w = cleanToShortWords(s.heading);
      if (w && w.length >= 2 && !list.includes(w)) list.push(w);
    });
  }

  // 3. From subject
  if (data.subject) {
    const w = cleanToShortWords(data.subject);
    if (w && w.length >= 2 && !list.includes(w)) list.unshift(w);
  }

  return list;
};

function App() {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme] || styles.pastelBrutal;
  const { user } = useAuth();
  
  const [appState, setAppState] = useState('upload'); // 'upload' | 'processing' | 'dashboard'
  const [dashboardData, setDashboardData] = useState(null);
  const [sourceInfo, setSourceInfo] = useState({ type: 'file', name: 'Lecture' });
  const [isProcessingReady, setIsProcessingReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Sync count of saved lectures from Supabase / Local storage
  useEffect(() => {
    getUserLectures(user).then(list => setSavedCount(list?.length || 0));
  }, [user]);

  const handleLoadLecture = (lecture) => {
    setDashboardData(lecture);
    setAppState('dashboard');
  };

  // Dynamic floating background badges tailored to the specific lecture topic
  const topicBadges = useMemo(() => {
    if (appState !== 'dashboard' || !dashboardData) {
      return defaultBadges;
    }

    const words = extractTopicWords(dashboardData);
    if (!words || words.length === 0) return defaultBadges;

    const icons = ['🌿', '⚡', '✦', '✨', '💡', '🎯', '🔬', '🧠'];

    return [
      { icon: icons[0], text: words[0] || defaultBadges[0].text },
      { icon: icons[1], text: words[1] || defaultBadges[1].text },
      { icon: icons[2], text: words[2] || defaultBadges[2].text },
      { icon: icons[3], text: words[3] || defaultBadges[3].text },
      { icon: icons[4], text: words[4] || defaultBadges[4].text },
      { icon: icons[5], text: words[5] || defaultBadges[5].text },
    ];
  }, [appState, dashboardData]);

  const handleFileDrop = async (file) => {
    if (!file) return;
    if (!user) {
      setIsAuthModalOpen(true);
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return;
    }

    // Strict 25 MB limit for audio/video media (Groq Whisper requirement)
    const isMedia = file.type.startsWith('audio/') || 
                    file.type.startsWith('video/') || 
                    /\.(mp3|wav|m4a|ogg|aac|flac|mp4|webm|mkv|mov|avi)$/i.test(file.name);
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

    if (isMedia && file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(
        `File is ${sizeMB} MB! Groq Whisper maximum size is 25 MB.\nPlease extract audio (.mp3 / .m4a), compress the video, or paste a YouTube link.`,
        { duration: 7000 }
      );
      setAppState('upload');
      return;
    }

    setSourceInfo({ type: 'file', name: file.name });
    setIsProcessingReady(false);
    setAppState('processing');
    try {
      let content = '';
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.srt') || file.name.endsWith('.vtt')) {
        content = await file.text();
      } else if (isMedia) {
        toast.loading("Transcribing lecture with Groq Whisper (Supports Hindi, English & all languages)...", { id: 'transcribe' });
        try {
          content = await transcribeAudio(file);
          toast.success("Audio transcribed successfully!", { id: 'transcribe' });
        } catch (transcribeErr) {
          console.error("Audio transcription error:", transcribeErr);
          toast.error(transcribeErr.message || "Failed to transcribe audio file.", { id: 'transcribe', duration: 7000 });
          setAppState('upload');
          return;
        }
      } else {
        content = `Lecture file: ${file.name}\nPlease analyze and generate comprehensive revision notes, structured headings, and active-recall key terms based on this lecture topic: ${file.name.replace(/\.[^/.]+$/, "")}.`;
      }
      const result = await processLecture(content);
      const lectureId = `lec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      result.id = lectureId;
      result.sourceType = isMedia ? 'media' : 'file';
      result.sourceName = file.name;
      setDashboardData(result);
      setIsProcessingReady(true);

      // Immediately persist to Supabase for the authenticated user
      saveLecture(result, user).then(() => {
        console.log("✅ Lecture successfully saved to Supabase:", result.title);
        getUserLectures(user).then(list => setSavedCount(list?.length || 0));
      }).catch(err => {
        console.error("❌ Supabase save error:", err);
      });
    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.message || "Processing Failed"}`);
      setAppState('upload');
    }
  };

  const handleTranscriptSubmit = async (transcriptText, meta) => {
    if (!user) {
      setIsAuthModalOpen(true);
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return;
    }
    setSourceInfo(meta || { type: 'web', name: 'Online Source' });
    setIsProcessingReady(false);
    setAppState('processing');
    try {
      const result = await processLecture(transcriptText);
      const lectureId = `lec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      result.id = lectureId;
      result.sourceType = meta?.type || 'web';
      result.sourceUrl = meta?.url || null;
      result.sourceName = meta?.name || 'Online Source';
      setDashboardData(result);
      setIsProcessingReady(true);

      // Immediately persist to Supabase for the authenticated user
      saveLecture(result, user).then(() => {
        console.log("✅ Lecture successfully saved to Supabase:", result.title);
        getUserLectures(user).then(list => setSavedCount(list?.length || 0));
      }).catch(err => {
        console.error("❌ Supabase save error:", err);
      });
    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.message || "Processing Failed"}`);
      setAppState('upload');
    }
  };

  return (
    <div className={`min-h-screen ${currentStyles.bgMain} ${currentStyles.textPrimary} font-sans selection:${currentStyles.accentBg} selection:text-black overflow-x-hidden relative transition-colors duration-300`}>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: '#ffffff', 
            color: '#000000', 
            border: '3px solid #000000', 
            boxShadow: '4px 4px 0px #000000', 
            fontWeight: 'bold',
            borderRadius: '16px'
          } 
        }} 
      />

      {/* Top Navbar */}
      <Navbar 
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onResetHome={() => setAppState('upload')}
        savedCount={savedCount}
      />

      {/* Auth Modal (Login / Sign Up / Demo Student) */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Saved Lectures Vault Modal (Supabase Database) */}
      <SavedLecturesModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        onLoadLecture={handleLoadLecture}
      />

      {/* Brutal Pastel Background Overlay & Ambient Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Subtle grid layer */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        
        {/* Neo-brutalist dot pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,#000_1.5px,transparent_1.5px)] bg-[size:32px_32px] opacity-[0.08]" />
        
        {/* Ambient pastel gradient blobs */}
        <div className="absolute -top-12 -left-12 w-96 h-96 rounded-full bg-[#FFCCD5]/50 blur-3xl" />
        <div className="absolute top-1/3 -right-12 w-80 h-96 rounded-full bg-[#C7E9DE]/45 blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-[30rem] h-80 rounded-full bg-[#FFF1C5]/55 blur-3xl" />

        {/* Floating Pastel Neo-Brutalist Sticker Badges & Shapes - Dynamically tailored to lecture topic */}
        {/* Top Outer Margins */}
        <div className="absolute top-16 md:top-20 left-3 md:left-6 lg:left-10 bg-[#FFCCD5] border-3 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-mono font-black text-black rotate-[-6deg] animate-pastel-float select-none transition-all duration-500">
          {topicBadges[0].icon} {topicBadges[0].text}
        </div>
        <div className="absolute top-16 md:top-20 right-3 md:right-6 lg:right-10 bg-[#C7E9DE] border-3 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-mono font-black text-black rotate-[5deg] animate-pastel-float-alt select-none transition-all duration-500">
          {topicBadges[1].icon} {topicBadges[1].text}
        </div>

        {/* Side Gutters */}
        <div className="absolute top-1/2 -translate-y-1/2 left-2 md:left-4 lg:left-8 bg-[#FFF1C5] border-3 border-black shadow-[3px_3px_0px_#000] px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-mono font-black text-black rotate-[-8deg] animate-pastel-float select-none hidden sm:flex items-center gap-1.5 transition-all duration-500">
          {topicBadges[2].icon} {topicBadges[2].text}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 lg:right-8 bg-[#FFCCD5] border-3 border-black shadow-[3px_3px_0px_#000] px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-mono font-black text-black rotate-[7deg] animate-pastel-float-alt select-none hidden sm:flex items-center gap-1.5 transition-all duration-500">
          {topicBadges[3].icon} {topicBadges[3].text}
        </div>

        {/* Bottom Outer Margins */}
        <div className="absolute bottom-4 md:bottom-6 left-3 md:left-6 lg:left-10 bg-[#FFF1C5] border-3 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-mono font-black text-black rotate-[-4deg] animate-pastel-wiggle select-none transition-all duration-500">
          {topicBadges[4].icon} {topicBadges[4].text}
        </div>
        <div className="absolute bottom-4 md:bottom-6 right-3 md:right-6 lg:right-10 bg-[#E8D7F1] border-3 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-mono font-black text-black rotate-[6deg] animate-pastel-float select-none transition-all duration-500">
          {topicBadges[5].icon} {topicBadges[5].text}
        </div>

        {/* Playful Floating Geometric Accents in Outer Margins */}
        <div className="absolute top-[28%] left-[2%] lg:left-[4%] w-5 h-5 bg-[#C7E9DE] border-2 border-black rotate-45 shadow-[2px_2px_0px_#000] animate-pastel-float select-none hidden md:block" />
        <div className="absolute top-[32%] right-[2%] lg:right-[4%] w-5 h-5 bg-[#FFCCD5] border-2 border-black rounded-full shadow-[2px_2px_0px_#000] animate-pastel-float-alt select-none hidden md:block" />
        <div className="absolute bottom-[28%] left-[3%] w-4 h-4 bg-[#FFF1C5] border-2 border-black rotate-12 shadow-[2px_2px_0px_#000] animate-pastel-wiggle select-none hidden lg:block" />
        <div className="absolute bottom-[30%] right-[3%] w-5 h-5 bg-[#E8D7F1] border-2 border-black rounded-md rotate-[-15deg] shadow-[2px_2px_0px_#000] animate-pastel-float select-none hidden lg:block" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center pt-28 md:pt-32 px-6 pb-20">
        {/* Header Section (Only show on upload or processing) */}
        {appState !== 'dashboard' && (
          <div className="text-center mb-10 max-w-3xl">

            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 text-black leading-none uppercase">
              ClassMind <span className="bg-[#FFCCD5] px-4 py-0.5 border-4 border-black shadow-[5px_5px_0px_#000] inline-block rotate-[1deg]">AI</span>
            </h1>
            
            <p className="text-base md:text-lg text-zinc-900 font-bold max-w-xl mx-auto leading-relaxed mt-4 bg-white p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000]">
              Autonomous lecture intelligence engine. Transform classroom audio, YouTube lectures, and documents into high-yield exam summaries, teacher intent radars, interactive quizzes, and flashcards.
            </p>
          </div>
        )}

        {/* Dynamic Views */}
        {appState === 'upload' && (
          <div className="w-full flex flex-col items-center">
            <Dropzone 
              onFileDrop={handleFileDrop} 
              onRequireAuth={() => setIsAuthModalOpen(true)} 
            />
            <div className="w-full max-w-2xl mt-4">
              <YouTubeInput 
                onTranscriptReady={handleTranscriptSubmit} 
                onRequireAuth={() => setIsAuthModalOpen(true)} 
              />
            </div>
          </div>
        )}
        {appState === 'processing' && (
          <ProcessingState 
            sourceInfo={sourceInfo} 
            isReady={isProcessingReady} 
            data={dashboardData}
            onComplete={(finalData) => {
              setAppState('dashboard');
              toast.success("Analysis complete! Saved to Revision Vault 📚");
              const toSave = finalData || dashboardData;
              if (toSave) {
                saveLecture(toSave, user).then(() => {
                  getUserLectures(user).then(list => setSavedCount(list?.length || 0));
                });
              }
            }}
            onCancel={() => {
              toast.dismiss('transcribe');
              setAppState('upload');
              toast('Processing cancelled', { icon: '↩️' });
            }}
          />
        )}
        {appState === 'dashboard' && dashboardData && (
          <Dashboard 
            data={dashboardData} 
            user={user}
            onReset={() => setAppState('upload')} 
            onLectureUpdated={(updated) => {
              setDashboardData(updated);
              saveLecture(updated, user);
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App

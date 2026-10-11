import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ListChecks, Brain, Sparkles, FileText, ArrowLeft, Layers, CheckCircle2, Clock, ExternalLink, Network } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { generateQuiz, generateFlashcards, generateMindMap } from '../lib/ai';
import QuizModal from './QuizModal';
import FlashcardModal from './FlashcardModal';
import MindMapModal from './MindMapModal';
import TinyFishAcademicResources from './TinyFishAcademicResources';
import TeacherIntentRadar from './TeacherIntentRadar';
import { generateLecturePDF } from '../lib/pdfGenerator';
import toast from 'react-hot-toast';

const Dashboard = ({ data, onReset, onLectureUpdated, user }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme] || styles.pastelBrutal;

  // Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState(data?.cachedQuiz || null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Flashcards State
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [flashcardsData, setFlashcardsData] = useState(data?.cachedFlashcards || null);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);

  // Mind Map State
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [mindMapData, setMindMapData] = useState(data?.cachedMindMap || null);
  const [loadingMindMap, setLoadingMindMap] = useState(false);

  // Check if current lecture originated from real audio/video or YouTube
  const isMediaSource = data?.sourceType === 'audio' || 
                        data?.sourceType === 'video' || 
                        data?.sourceType === 'media' || 
                        data?.sourceType === 'youtube' ||
                        Boolean(data?.sourceUrl && (data.sourceUrl.includes('youtube.com') || data.sourceUrl.includes('youtu.be')));

  // Normalize keyTerms to ensure they always show reliably
  const rawTerms = data?.keyTerms || data?.key_terms || data?.keyterms || data?.keywords || data?.terms || [];
  const termsList = (
    Array.isArray(rawTerms)
      ? rawTerms.map(t => {
          if (typeof t === 'object' && t !== null) {
            return t.term || t.name ? `${t.term || t.name}${t.definition ? `: ${t.definition}` : ''}` : JSON.stringify(t);
          }
          return String(t);
        })
      : typeof rawTerms === 'string'
      ? rawTerms.split(/[,;\n]/).map(t => t.replace(/^[-*•\d.]+\s*/, '').trim())
      : []
  ).filter(t => t && t.trim().length > 0);

  // Fallback to extract from section headings if keyTerms array was empty
  const displayTerms = termsList.length > 0 
    ? termsList 
    : (data?.sections || []).map(s => s.heading).filter(Boolean);

  const handleGenerateQuiz = () => {
    setIsQuizOpen(true);
  };


  const handleGenerateFlashcards = async () => {
    setIsFlashcardsOpen(true);
    if (!flashcardsData) {
      if (data?.cachedFlashcards) {
        setFlashcardsData(data.cachedFlashcards);
        return;
      }
      setLoadingFlashcards(true);
      try {
        const generated = await generateFlashcards(data);
        setFlashcardsData(generated);
        if (onLectureUpdated) {
          onLectureUpdated({ ...data, cachedFlashcards: generated });
        }
      } catch (err) {
        console.error("Flashcards generation error:", err);
      } finally {
        setLoadingFlashcards(false);
      }
    }
  };

  const handleRetryFlashcards = async () => {
    setLoadingFlashcards(true);
    try {
      const regenerated = await generateFlashcards({ ...data, cachedFlashcards: null });
      setFlashcardsData(regenerated);
      if (onLectureUpdated) {
        onLectureUpdated({ ...data, cachedFlashcards: regenerated });
      }
    } catch (err) {
      console.error("Flashcards retry error:", err);
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const handleOpenMindMap = async () => {
    setIsMindMapOpen(true);
    if (!mindMapData) {
      if (data?.cachedMindMap) {
        setMindMapData(data.cachedMindMap);
        return;
      }
      setLoadingMindMap(true);
      try {
        const generated = await generateMindMap(data);
        setMindMapData(generated);
        if (onLectureUpdated) {
          onLectureUpdated({ ...data, cachedMindMap: generated });
        }
      } catch (err) {
        console.error("Mind map generation error:", err);
        toast.error("Failed to generate mind map");
      } finally {
        setLoadingMindMap(false);
      }
    }
  };

  const handleRegenerateMindMap = async () => {
    setLoadingMindMap(true);
    try {
      const regenerated = await generateMindMap(data, true);
      setMindMapData(regenerated);
      if (onLectureUpdated) {
        onLectureUpdated({ ...data, cachedMindMap: regenerated });
      }
      toast.success("AI Concept Mind Map re-synthesized!");
    } catch (err) {
      console.error("Mind map regeneration error:", err);
      toast.error("Failed to re-synthesize mind map");
    } finally {
      setLoadingMindMap(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateLecturePDF({
        ...data,
        keyTerms: displayTerms
      });
      toast.success("Detailed PDF notes downloaded!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto mt-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className={`text-4xl md:text-5xl font-black ${currentStyles.textPrimary} tracking-tight mb-2`}>
            {data.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-3 py-1 ${currentStyles.badgeClass} border rounded-full text-xs font-bold uppercase tracking-wider`}>
              {data.subject || 'General Studies'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#C7E9DE] border-2 border-black rounded-full text-xs font-mono font-black text-black shadow-[2px_2px_0px_#000]">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              <span>SYNCED TO SUPABASE</span>
            </span>
            {data?.sourceType === 'image' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF1C5] border-2 border-black rounded-full text-xs font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                <span>📸 WHITEBOARD VISION OCR</span>
              </span>
            )}
          </div>
        </div>
        
        {/* Navigation Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={handleOpenMindMap}
            className="px-4 py-2 rounded-2xl text-xs font-black text-black bg-[#C7E9DE] border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#b0ded2] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
            title="Launch Interactive Concept Mind Map"
          >
            <Network className="w-4 h-4 text-black" />
            <span>Mind Map 🧠</span>
          </button>
          <button 
            onClick={onReset}
            className="px-4 py-2 rounded-2xl text-xs font-bold text-zinc-900 bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Upload Another</span>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className={`p-6 rounded-3xl mb-8 ${currentStyles.cardClass}`}>
        <h3 className={`text-lg font-black ${currentStyles.textPrimary} mb-2 flex items-center gap-2`}>
          <Brain className={`w-5 h-5 ${currentStyles.accent}`} />
          Executive Summary
        </h3>
        <p className={`${currentStyles.textSecondary} leading-relaxed font-medium`}>{data.summary}</p>
      </div>

      {/* Teacher's Intent & Exam Radar (Dedicated Exam Focus Feature) */}
      {data.teacherIntent && (
        <TeacherIntentRadar intentData={data.teacherIntent} isMediaSource={isMediaSource} />
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Notes Column (Takes up 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Brief Notes Card */}
          <div className={`p-6 rounded-3xl ${currentStyles.cardClass}`}>
            <div className="border-b-4 border-black pb-4 mb-6">
              <h3 className={`text-xl font-black ${currentStyles.textPrimary} flex items-center gap-2`}>
                <BookOpen className={`w-6 h-6 ${currentStyles.accent}`} />
                Structured Brief Notes
              </h3>
            </div>
            
            <div className="space-y-6">
              {data.sections?.map((section, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FFF9F5] border-2 border-black">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-base font-black text-black flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#FFCCD5] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-xs font-mono font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span>{isMediaSource ? section.heading : (section.heading?.replace(/\s*[\(\[]?\b\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?\b[\)\]]?/g, '').trim() || section.heading)}</span>
                    </h4>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {isMediaSource && section.timestamp && (
                        data?.sourceUrl && (data?.sourceType === 'youtube' || data?.sourceUrl.includes('youtube.com') || data?.sourceUrl.includes('youtu.be')) ? (
                          <a
                            href={`${data.sourceUrl}${data.sourceUrl.includes('?') ? '&' : '?'}t=${section.startSeconds || 0}s`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Jump to ${section.timestamp} in YouTube video`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#C7E9DE] border-2 border-black text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000] hover:bg-[#a9ded0] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-black" />
                            <span>⏱️ {section.timestamp}</span>
                            <ExternalLink className="w-3 h-3 text-black opacity-70" />
                          </a>
                        ) : (
                          <span 
                            title={`Section timestamp: ${section.timestamp}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#C7E9DE] border-2 border-black text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]"
                          >
                            <Clock className="w-3.5 h-3.5 text-black" />
                            <span>⏱️ {section.timestamp}</span>
                          </span>
                        )
                      )}

                      {section.intentBadge && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF1C5] border border-black text-[10px] font-mono font-black uppercase text-black shadow-[1px_1px_0px_#000]">
                          {section.intentBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teacher's vocal note / emphasis if present */}
                  {section.teacherEmphasis && (
                    <div className="mb-3 px-3 py-1.5 rounded-xl bg-white border border-dashed border-zinc-400 text-xs font-bold text-zinc-800 italic flex items-center gap-2">
                      <span className="text-xs">🎙️</span>
                      <span>{section.teacherEmphasis}</span>
                    </div>
                  )}
                  
                  {/* Brief key takeaways */}
                  <ul className="space-y-2">
                    {section.points?.map((point, i) => (
                      <li key={i} className="text-sm font-bold text-zinc-900 flex items-start gap-3">
                        <span className="w-2 h-2 rounded-sm bg-[#FFCCD5] border-2 border-black mt-1.5 flex-shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Download Detailed PDF Card (Positioned directly below the short notes) */}
          <div className="p-6 rounded-3xl bg-[#FFCCD5] border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-black text-black flex items-center gap-2">
                <FileText className="w-5 h-5 text-black" />
                Download Detailed PDF Notes
              </h4>
              <p className="text-xs font-bold text-zinc-900 mt-1 leading-relaxed">
                Contains the complete comprehensive master notes with in-depth conceptual breakdowns, formulas, definitions, and deep dives.
              </p>
            </div>
            <button 
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-white text-black border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-[#FFF1C5] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              title="Download Full Detailed Notes as Formatted PDF Document"
            >
              <FileText className="w-4 h-4 text-black" />
              <span>Download Detailed PDF</span>
            </button>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6 md:rotate-1">
          {/* Key Terms */}
          <div className={`p-6 rounded-3xl ${currentStyles.cardClass}`}>
            <h3 className={`text-xl font-black ${currentStyles.textPrimary} mb-4 flex items-center gap-2`}>
              <ListChecks className={`w-6 h-6 ${currentStyles.accent}`} />
              Key Terms & Glossary
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {displayTerms.map((term, i) => {
                const pastelFills = [
                  'bg-[#FFCCD5]',
                  'bg-[#C7E9DE]',
                  'bg-[#FFF1C5]',
                  'bg-[#E8D7F1]',
                  'bg-[#FFD7BA]'
                ];
                const rotStyles = ['rotate-[-2deg]', 'rotate-[2deg]', 'rotate-[-1.5deg]', 'rotate-[1deg]'];
                return (
                  <span 
                    key={i} 
                    className={`px-3 py-1.5 text-xs transition-transform hover:scale-105 ${pastelFills[i % pastelFills.length]} ${rotStyles[i % rotStyles.length]} font-mono font-bold text-black border-2 border-black rounded-xl shadow-[2px_2px_0px_#000]`}
                  >
                    {term}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Interactive Learning Tools (Mind Map, Flashcards & Quiz) */}
          <div className="space-y-3">
            {/* Interactive Concept Mind Map Button */}
            <button 
              onClick={handleOpenMindMap}
              className="w-full py-4 px-5 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider bg-[#C7E9DE] text-black border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-[#aee0d4] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Network className="w-4 h-4 text-black" />
              <span>Interactive Concept Mind Map 🧠 →</span>
            </button>

            {/* Interactive Flashcards 3D Deck Button */}
            <button 
              onClick={handleGenerateFlashcards}
              className="w-full py-4 px-5 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider bg-[#E8D7F1] text-black border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-[#d8c2e6] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-black" />
              <span>Study 3D Flashcards Deck →</span>
            </button>

            {/* Active Recall Quiz Button */}
            <button 
              onClick={handleGenerateQuiz}
              className={`w-full ${currentStyles.buttonClass} flex items-center justify-center gap-2 cursor-pointer`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Active Recall Quiz →</span>
            </button>
          </div>
        </div>

      </div>
      
      {/* Live Academic Exam Questions & Syllabus Sources powered by TinyFish */}
      <TinyFishAcademicResources topic={data.title} keyTerms={displayTerms} />

      {/* Interactive Active Recall Quiz Modal with Custom Preferences Studio */}
      <QuizModal 
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        quizData={quizData}
        loading={loadingQuiz}
        lectureData={data}
        onGenerateQuiz={async (preferences) => {
          setLoadingQuiz(true);
          try {
            const res = await generateQuiz(data, preferences);
            setQuizData(res);
            if (onLectureUpdated) {
              onLectureUpdated({ ...data, cachedQuiz: res });
            }
            return res;
          } catch (err) {
            console.error("Custom quiz generation error:", err);
            toast.error("Failed to generate custom quiz");
            return null;
          } finally {
            setLoadingQuiz(false);
          }
        }}
      />

      {/* Interactive 3D Active Recall Flashcard Modal */}
      <FlashcardModal 
        isOpen={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        flashcardsData={flashcardsData}
        loading={loadingFlashcards}
        onRetry={handleRetryFlashcards}
      />

      {/* Interactive Concept Mind Map Studio Modal */}
      <MindMapModal 
        isOpen={isMindMapOpen}
        onClose={() => setIsMindMapOpen(false)}
        lectureData={data}
        mindMapData={mindMapData}
        loading={loadingMindMap}
        onRegenerate={handleRegenerateMindMap}
      />
    </motion.div>
  );
};

export default Dashboard;

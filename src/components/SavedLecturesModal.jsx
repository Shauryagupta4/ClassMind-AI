import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Trash2, Calendar, Target, ArrowRight, RefreshCw, Sparkles, FolderArchive } from 'lucide-react';
import { getUserLectures, deleteLecture } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SavedLecturesModal({ isOpen, onClose, onLoadLecture }) {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const data = await getUserLectures(user);
      setLectures(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLectures();
    }
  }, [isOpen, user]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteLecture(id, user);
      setLectures(prev => prev.filter(l => l.id !== id));
      toast.success('Lecture removed from history');
    } catch (err) {
      toast.error('Failed to delete lecture');
    }
  };

  const handleSelect = (lecture) => {
    // Reconstruct full lecture object for Dashboard
    const formatted = {
      id: lecture.id,
      title: lecture.title,
      subject: lecture.subject,
      summary: lecture.summary,
      teacherIntent: lecture.teacher_intent || lecture.teacherIntent,
      sections: lecture.sections || [],
      keyTerms: lecture.key_terms || lecture.keyTerms || [],
      cachedQuiz: lecture.cached_quiz || lecture.cachedQuiz,
      cachedFlashcards: lecture.cached_flashcards || lecture.cachedFlashcards
    };
    onLoadLecture(formatted);
    onClose();
    toast.success(`Loaded "${lecture.title}"!`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#FFF9F5] border-4 border-black rounded-3xl p-6 md:p-8 shadow-[8px_8px_0px_#000] max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-black/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#E8D7F1] border-2 border-black text-xs font-mono font-bold mb-2 shadow-[2px_2px_0px_#000]">
                <FolderArchive className="w-3.5 h-3.5 text-black" />
                <span>SUPABASE REVISION VAULT</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase text-black tracking-tight">
                My Saved Lectures ({lectures.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLectures}
                disabled={loading}
                title="Refresh saved lectures"
                className="p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFF1C5] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-black ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFCCD5] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>

          {/* Lectures List */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-black animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-600">Syncing lectures from database...</p>
              </div>
            ) : !user ? (
              <div className="text-center py-12 bg-white rounded-2xl border-3 border-dashed border-zinc-300 p-8">
                <FolderArchive className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                <h3 className="text-base font-black uppercase text-black mb-1">Please Sign In</h3>
                <p className="text-xs text-zinc-600 font-bold max-w-sm mx-auto mb-4">
                  Log in or continue with Google to view and sync your personal lecture vault.
                </p>
              </div>
            ) : lectures.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-3 border-dashed border-zinc-300 p-8">
                <BookOpen className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                <h3 className="text-base font-black uppercase text-black mb-1">No Saved Lectures Yet</h3>
                <p className="text-xs text-zinc-600 font-bold max-w-sm mx-auto">
                  Upload audio or paste a lecture link to generate your first revision kit for this account!
                </p>
              </div>
            ) : (
              lectures.map((lec) => {
                const readinessScore = lec.exam_readiness_score || lec.teacher_intent?.examReadinessScore || 85;
                const formattedDate = lec.created_at ? new Date(lec.created_at).toLocaleDateString() : 'Recent';

                return (
                  <div
                    key={lec.id}
                    onClick={() => handleSelect(lec)}
                    className="group p-4 md:p-5 rounded-2xl bg-white border-3 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFF1C5] border border-black text-black">
                          {lec.subject || 'Lecture'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-600">
                          <Calendar className="w-3 h-3" /> {formattedDate}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-[#C7E9DE] border border-black text-black">
                          <Target className="w-3 h-3 text-emerald-600" /> {readinessScore}% Exam Ready
                        </span>
                      </div>

                      <h4 className="text-base font-black text-black truncate group-hover:text-blue-600 transition-colors">
                        {lec.title}
                      </h4>

                      <p className="text-xs text-zinc-600 font-bold line-clamp-1 mt-0.5">
                        {lec.summary || 'Exam revision notes, teacher intent radar & active recall questions.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(lec.id, e)}
                        title="Delete from archive"
                        className="p-2 rounded-xl bg-white border-2 border-black hover:bg-[#FFCCD5] text-black shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>

                      <div className="px-3.5 py-2 rounded-xl bg-[#FFCCD5] border-2 border-black text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000] group-hover:bg-[#ffb3c1] flex items-center gap-1.5">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

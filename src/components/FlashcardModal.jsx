import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Shuffle, 
  CheckCircle2, 
  HelpCircle, 
  Trophy, 
  Sparkles, 
  Loader2, 
  Layers, 
  Flame, 
  Lightbulb, 
  RotateCcw 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const FlashcardModal = ({ isOpen, onClose, flashcardsData, loading, onRetry }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme] || styles.pastelBrutal;

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredIds, setMasteredIds] = useState(new Set());
  const [reviewIds, setReviewIds] = useState(new Set());
  const [isFinished, setIsFinished] = useState(false);

  // Sync cards when data changes
  useEffect(() => {
    if (flashcardsData?.flashcards && Array.isArray(flashcardsData.flashcards)) {
      setCards(flashcardsData.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setMasteredIds(new Set());
      setReviewIds(new Set());
      setIsFinished(false);
    }
  }, [flashcardsData]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isFinished || loading || cards.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, loading, cards.length, currentIndex, isFlipped]);

  if (!isOpen) return null;

  const total = cards.length;
  const currentCard = cards[currentIndex] || null;

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleMarkMastered = () => {
    if (!currentCard) return;
    setMasteredIds(prev => new Set(prev).add(currentCard.id));
    setReviewIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  };

  const handleMarkReview = () => {
    if (!currentCard) return;
    setReviewIds(prev => new Set(prev).add(currentCard.id));
    setMasteredIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setMasteredIds(new Set());
    setReviewIds(new Set());
    setIsFinished(false);
  };

  const handleReviewUnmastered = () => {
    const unmastered = cards.filter(c => !masteredIds.has(c.id));
    if (unmastered.length > 0) {
      setCards(unmastered);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setIsFinished(false);
    } else {
      handleRestart();
    }
  };

  const isCurrentMastered = currentCard && masteredIds.has(currentCard.id);
  const isCurrentReview = currentCard && reviewIds.has(currentCard.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto relative ${currentStyles.cardClass} p-6 md:p-8 flex flex-col justify-between`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-black mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E8D7F1] border-2 border-black shadow-[2px_2px_0px_#000]">
              <Layers className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black flex items-center gap-2">
                {flashcardsData?.deckTitle || "Interactive Flashcards"}
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFF1C5] border-2 border-black rounded-lg shadow-[1px_1px_0px_#000]">
                  ACTIVE RECALL
                </span>
              </h2>
              <p className="text-xs font-bold text-zinc-700">
                Flip to reveal answers • Space to flip • Arrows to navigate
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:bg-[#FFCCD5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            aria-label="Close Flashcards"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-[#E8D7F1] border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce">
              <Loader2 className="w-10 h-10 text-black animate-spin" />
            </div>
            <h3 className="text-2xl font-black text-black">
              Generating High-Yield Flashcards...
            </h3>
            <p className="text-sm font-bold text-zinc-700 max-w-md">
              Synthesizing core definitions, active recall challenges, and key mechanisms using dedicated Groq LPU compute.
            </p>
          </div>
        ) : isFinished ? (
          /* COMPLETION / STATS SCREEN */
          <div className="py-8 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[#C7E9DE] border-4 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center rotate-[-3deg]">
              <Trophy className="w-10 h-10 text-black" />
            </div>

            <div>
              <h3 className="text-3xl font-black text-black mb-1">
                Deck Completed!
              </h3>
              <p className="text-sm font-bold text-zinc-800">
                Great active recall session. Here is your mastery summary:
              </p>
            </div>

            {/* Score Stats */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="p-4 rounded-2xl bg-[#C7E9DE] border-3 border-black shadow-[3px_3px_0px_#000] text-center">
                <span className="text-xs font-black uppercase text-zinc-800">Mastered</span>
                <p className="text-3xl font-black text-black mt-1">{masteredIds.size}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFCCD5] border-3 border-black shadow-[3px_3px_0px_#000] text-center">
                <span className="text-xs font-black uppercase text-zinc-800">Needs Review</span>
                <p className="text-3xl font-black text-black mt-1">{reviewIds.size || (total - masteredIds.size)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              {reviewIds.size > 0 && (
                <button
                  onClick={handleReviewUnmastered}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#FFCCD5] text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#ffb6c4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>Review Unmastered ({reviewIds.size})</span>
                </button>
              )}
              <button
                onClick={handleRestart}
                className="flex-1 py-3 px-4 rounded-2xl bg-white text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#FFF1C5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart All</span>
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="py-3 px-4 rounded-2xl bg-[#E8D7F1] text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#d9bfe6] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Generate a completely fresh deck"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Fresh Deck</span>
                </button>
              )}
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-base font-bold text-zinc-800">No flashcards available in this deck.</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="py-3 px-6 rounded-2xl bg-[#FFF1C5] text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-200 cursor-pointer"
              >
                Generate Flashcards Now
              </button>
            )}
          </div>
        ) : (
          /* ACTIVE CARD INTERFACE */
          <div className="flex flex-col space-y-5">
            {/* Top Tracker & Deck Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white border-2 border-black rounded-xl text-xs font-mono font-black shadow-[2px_2px_0px_#000]">
                  {currentIndex + 1} / {total}
                </span>
                {currentCard?.category && (
                  <span className="px-3 py-1 bg-[#FFCCD5] border-2 border-black rounded-xl text-[11px] font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
                    {currentCard.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-zinc-800 hidden sm:inline">
                  Mastered: <b className="text-emerald-700">{masteredIds.size}</b>
                </span>
                <button
                  onClick={handleShuffle}
                  className="p-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#FFF1C5] shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Shuffle Flashcards"
                >
                  <Shuffle className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-zinc-200 border-2 border-black rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#C7E9DE] transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              />
            </div>

            {/* THE 3D FLIP FLASHCARD */}
            <div 
              className="w-full h-[320px] md:h-[360px] cursor-pointer perspective-1000 select-none"
              onClick={handleFlip}
            >
              <motion.div
                className="w-full h-full relative"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* FRONT SIDE (Question / Prompt) */}
                <div 
                  className={`w-full h-full p-6 md:p-7 rounded-3xl border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col justify-between overflow-hidden transition-colors ${
                    isCurrentMastered 
                      ? 'bg-[#EBFBF5]' 
                      : isCurrentReview 
                      ? 'bg-[#FFF0F2]' 
                      : 'bg-white'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="flex-shrink-0 flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-black uppercase text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-lg border border-black/40">
                      FRONT • PROMPT
                    </span>
                    {currentCard?.hint && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowHint(prev => !prev);
                        }}
                        className="px-2.5 py-1 text-[11px] font-mono font-black uppercase rounded-lg border-2 border-black bg-[#FFF1C5] hover:bg-yellow-200 shadow-[1px_1px_0px_#000] flex items-center gap-1 cursor-pointer"
                      >
                        <Lightbulb className="w-3 h-3 text-black" />
                        <span>{showHint ? "Hide Hint" : "Hint"}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 my-1 flex flex-col justify-center">
                    <h4 className="text-lg md:text-2xl font-black text-black leading-snug">
                      {currentCard?.front}
                    </h4>

                    {showHint && currentCard?.hint && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-3 rounded-xl bg-[#FFF1C5] border-2 border-black text-xs font-bold text-zinc-900"
                      >
                        💡 <b>Clue:</b> {currentCard.hint}
                      </motion.div>
                    )}
                  </div>

                  <div className="flex-shrink-0 pt-3 border-t-2 border-dashed border-zinc-300 flex items-center justify-between text-xs font-bold text-zinc-500">
                    <span className="flex items-center gap-1.5 text-zinc-700">
                      <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                      Click card or press Space to reveal
                    </span>
                    <span className="text-[11px] font-mono text-zinc-600 hidden sm:inline">
                      100% Active Recall
                    </span>
                  </div>
                </div>

                {/* BACK SIDE (Answer / Detailed Breakdown) */}
                <div 
                  className="w-full h-full p-6 md:p-7 rounded-3xl border-4 border-black shadow-[6px_6px_0px_#000] flex flex-col justify-between bg-[#FFF9E6] overflow-hidden absolute inset-0"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="flex-shrink-0 flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-black uppercase text-zinc-800 bg-[#FFF1C5] px-2.5 py-1 rounded-lg border-2 border-black shadow-[1px_1px_0px_#000]">
                      BACK • ANSWER & EXPLANATION
                    </span>
                    <span className="text-[11px] font-mono font-bold text-zinc-600">
                      {currentCard?.category}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 my-1">
                    <div className="text-sm md:text-base font-bold text-zinc-900 leading-relaxed whitespace-pre-line">
                      {currentCard?.back}
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-3 border-t-2 border-dashed border-zinc-300 flex items-center justify-between text-xs font-bold text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5" />
                      Click card or press Space to flip back
                    </span>
                    <span className="text-emerald-700 font-black">
                      ✓ Concept Decoded
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom Actions & Mastery Controls */}
            <div className="space-y-3 pt-2">
              {/* Mastery Feedback Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleMarkReview}
                  className="py-3 px-4 rounded-2xl bg-[#FFCCD5] text-black font-black text-xs md:text-sm uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#ffb6c4] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>Review Again (Struggled)</span>
                </button>

                <button
                  onClick={handleMarkMastered}
                  className="py-3 px-4 rounded-2xl bg-[#C7E9DE] text-black font-black text-xs md:text-sm uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#b2e2d3] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Got It! (Mastered)</span>
                </button>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`px-4 py-2.5 rounded-xl border-2 border-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    currentIndex === 0 
                      ? 'bg-zinc-100 text-zinc-400 opacity-60 cursor-not-allowed' 
                      : 'bg-white text-black shadow-[2px_2px_0px_#000] hover:bg-[#FFF1C5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={handleFlip}
                  className="px-5 py-2.5 rounded-xl border-2 border-black bg-white text-black font-black text-xs shadow-[2px_2px_0px_#000] hover:bg-[#E8D7F1] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isFlipped ? "Flip to Front" : "Flip to Back"}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="px-4 py-2.5 rounded-xl border-2 border-black bg-white text-black font-bold text-xs shadow-[2px_2px_0px_#000] hover:bg-[#FFF1C5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{currentIndex === total - 1 ? "Finish Deck" : "Next"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FlashcardModal;

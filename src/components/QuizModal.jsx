import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Trophy, 
  RotateCcw, 
  X, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Sliders, 
  BookOpen, 
  Flame, 
  Target, 
  Check, 
  Settings2,
  Layers
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const QuizModal = ({ 
  isOpen, 
  onClose, 
  quizData, 
  loading, 
  lectureData, 
  onGenerateQuiz 
}) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme] || styles.pastelBrutal;

  // View state: 'configure' | 'taking' | 'results'
  const [viewState, setViewState] = useState('configure');

  // Preferences State
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [numQuestions, setNumQuestions] = useState(5); // 3 | 5 | 8 | 10
  const [scopeType, setScopeType] = useState('all'); // 'all' | 'specific'
  const [selectedTopics, setSelectedTopics] = useState([]);

  // Quiz Taking State
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Available topics extracted from lecture sections and terms
  const availableSections = Array.isArray(lectureData?.sections) ? lectureData.sections : [];
  const topicList = availableSections.map(s => s.heading).filter(Boolean);

  // Sync quiz data when it arrives
  useEffect(() => {
    if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      setCurrentQuiz(quizData);
    }
  }, [quizData]);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      if (topicList.length > 0 && selectedTopics.length === 0) {
        setSelectedTopics([topicList[0]]);
      }
      // If quizData already exists and we're just opening, we can allow user to start directly or configure
      if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0 && !currentQuiz) {
        setCurrentQuiz(quizData);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const questions = currentQuiz?.questions || [];
  const currentQ = questions[currentIndex];
  const total = questions.length;

  const handleToggleTopic = (topic) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        const next = prev.filter(t => t !== topic);
        return next.length > 0 ? next : [topic]; // Keep at least one
      } else {
        return [...prev, topic];
      }
    });
  };

  const handleSelectAllTopics = () => {
    setSelectedTopics([...topicList]);
  };

  const handleStartCustomQuiz = async () => {
    const preferences = {
      difficulty,
      numQuestions,
      selectedTopics: scopeType === 'specific' ? selectedTopics : []
    };

    if (onGenerateQuiz) {
      const generated = await onGenerateQuiz(preferences);
      if (generated && Array.isArray(generated.questions) && generated.questions.length > 0) {
        setCurrentQuiz(generated);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setScore(0);
        setUserAnswers([]);
        setShowSubmitConfirm(false);
        setViewState('taking');
      }
    }
  };

  const handleQuickStartDefault = () => {
    setShowSubmitConfirm(false);
    if (currentQuiz && currentQuiz.questions?.length > 0) {
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setUserAnswers([]);
      setViewState('taking');
    } else {
      handleStartCustomQuiz();
    }
  };

  const handleSelectOption = (index) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setUserAnswers(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        selected: index,
        correct: currentQ.correctIndex,
        isCorrect
      }
    ]);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setViewState('results');
    }
  };

  const handleRetakeSame = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setUserAnswers([]);
    setShowSubmitConfirm(false);
    setViewState('taking');
  };

  const handleConfigureNew = () => {
    setShowSubmitConfirm(false);
    setViewState('configure');
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto relative ${currentStyles.cardClass} p-6 md:p-8 flex flex-col justify-between`}
      >
        {/* Early Submit Confirmation Modal Overlay */}
        <AnimatePresence>
          {showSubmitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 15 }}
                className="w-full max-w-sm p-6 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_#000] text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FFF1C5] border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto">
                  <HelpCircle className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">
                    Submit Quiz Early?
                  </h3>
                  <p className="text-xs font-bold text-zinc-700 mt-1.5 leading-relaxed">
                    You have answered <b>{userAnswers.length}</b> of <b>{total}</b> questions.
                    <br />
                    Are you sure you want to finish and calculate your score now?
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 py-3 px-3 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    Keep Answering
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      setViewState('results');
                    }}
                    className="flex-1 py-3 px-3 rounded-xl border-2 border-black bg-[#C7E9DE] hover:bg-[#aee0d1] text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    Yes, Submit Now
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-black mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFCCD5] border-2 border-black shadow-[2px_2px_0px_#000]">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black flex items-center gap-2">
                Active Recall Quiz Studio
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFF1C5] border-2 border-black rounded-lg shadow-[1px_1px_0px_#000]">
                  CUSTOM PARAMS
                </span>
              </h2>
              <p className="text-xs font-bold text-zinc-700">
                Tailored difficulty • Question count • Topic-specific precision
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewState === 'taking' && (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="py-1.5 px-3 rounded-xl border-2 border-black bg-[#C7E9DE] hover:bg-[#aee0d1] shadow-[2px_2px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 text-xs font-black text-black cursor-pointer"
                title="Submit Quiz Now"
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
                <span className="hidden sm:inline">Submit Quiz</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:bg-[#FFCCD5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              aria-label="Close Quiz"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-[#FFF1C5] border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce">
              <Loader2 className="w-10 h-10 text-black animate-spin" />
            </div>
            <h3 className="text-2xl font-black text-black">
              Generating Custom Quiz...
            </h3>
            <p className="text-sm font-bold text-zinc-700 max-w-sm">
              Formulating {numQuestions} targeted {difficulty.toUpperCase()} questions {scopeType === 'specific' ? `on: ${selectedTopics.join(', ')}` : 'across all lecture topics'} using dedicated Groq LPU compute.
            </p>
          </div>
        ) : viewState === 'configure' ? (
          /* =========================================================================
             1. QUIZ PREFERENCE CONFIGURATION STUDIO
             ========================================================================= */
          <div className="space-y-6">
            {/* Difficulty Level */}
            <div>
              <label className="text-xs font-mono font-black uppercase text-zinc-700 flex items-center gap-1.5 mb-2.5">
                <Flame className="w-4 h-4 text-rose-600" />
                1. Select Question Difficulty Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'easy',
                    name: 'Easy / Foundational',
                    desc: 'Core definitions & direct facts',
                    bg: 'bg-[#C7E9DE]',
                    badge: '🟢 Beginner'
                  },
                  {
                    id: 'medium',
                    name: 'Medium / Academic',
                    desc: 'Concepts, cause & effect',
                    bg: 'bg-[#FFF1C5]',
                    badge: '🟡 Standard'
                  },
                  {
                    id: 'hard',
                    name: 'Hard / Exam Master',
                    desc: 'Tricky edge-cases & deep reasoning',
                    bg: 'bg-[#FFCCD5]',
                    badge: '🔴 Advanced'
                  }
                ].map((lvl) => {
                  const isSelected = difficulty === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setDifficulty(lvl.id)}
                      className={`p-3.5 rounded-2xl border-3 border-black text-left transition-all cursor-pointer relative ${
                        isSelected 
                          ? `${lvl.bg} shadow-[4px_4px_0px_#000] -translate-y-0.5` 
                          : 'bg-white opacity-80 hover:opacity-100 hover:bg-zinc-50 shadow-[2px_2px_0px_#000]'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-black uppercase block mb-1 text-zinc-800">
                        {lvl.badge}
                      </span>
                      <h4 className="text-sm font-black text-black leading-tight mb-1">
                        {lvl.name}
                      </h4>
                      <p className="text-[11px] font-bold text-zinc-700 leading-snug">
                        {lvl.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className="text-xs font-mono font-black uppercase text-zinc-700 flex items-center gap-1.5 mb-2.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                2. Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {[3, 5, 8, 10].map((count) => {
                  const isSelected = numQuestions === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setNumQuestions(count)}
                      className={`py-3 px-2 rounded-2xl border-3 border-black font-black text-xs md:text-sm text-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#E8D7F1] text-black shadow-[4px_4px_0px_#000] -translate-y-0.5' 
                          : 'bg-white text-zinc-800 hover:bg-zinc-50 shadow-[2px_2px_0px_#000]'
                      }`}
                    >
                      {count} Questions
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topic Scope Selection */}
            <div>
              <label className="text-xs font-mono font-black uppercase text-zinc-700 flex items-center gap-1.5 mb-2.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                3. Topic Scope (All Topics or Topic-Wise)
              </label>

              {/* Scope Switcher */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setScopeType('all')}
                  className={`p-3 rounded-2xl border-3 border-black text-xs md:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    scopeType === 'all'
                      ? 'bg-[#C7E9DE] text-black shadow-[3px_3px_0px_#000] -translate-y-0.5'
                      : 'bg-white text-zinc-700 hover:bg-zinc-50 shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <span>🌐 All Lecture Topics</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeType('specific')}
                  className={`p-3 rounded-2xl border-3 border-black text-xs md:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    scopeType === 'specific'
                      ? 'bg-[#FFF1C5] text-black shadow-[3px_3px_0px_#000] -translate-y-0.5'
                      : 'bg-white text-zinc-700 hover:bg-zinc-50 shadow-[2px_2px_0px_#000]'
                  }`}
                >
                  <span>🎯 Topic-Wise Focus</span>
                </button>
              </div>

              {/* If Specific Topic Scope Selected: Render Topic Chips */}
              {scopeType === 'specific' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-2xl bg-[#FFF9F5] border-3 border-black space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">
                      Choose which topic(s) to test ({selectedTopics.length} selected):
                    </span>
                    {topicList.length > 1 && (
                      <button
                        type="button"
                        onClick={handleSelectAllTopics}
                        className="text-[11px] font-black underline hover:text-indigo-600 cursor-pointer"
                      >
                        Select All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {topicList.length > 0 ? (
                      topicList.map((topic, i) => {
                        const isChosen = selectedTopics.includes(topic);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleToggleTopic(topic)}
                            className={`px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isChosen
                                ? 'bg-[#FFCCD5] text-black shadow-[2px_2px_0px_#000] font-black -translate-y-0.5'
                                : 'bg-white text-zinc-700 hover:bg-zinc-100 shadow-[1px_1px_0px_#000]'
                            }`}
                          >
                            {isChosen && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{topic}</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs font-bold text-zinc-500">
                        {lectureData?.title || 'General Topics'}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Launch Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleStartCustomQuiz}
                className="flex-1 py-4 px-6 rounded-2xl bg-[#FFCCD5] text-black font-black text-sm uppercase tracking-wider border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-[#ffb6c4] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>Generate Custom Quiz ({numQuestions} Qs) →</span>
              </button>

              {currentQuiz && (
                <button
                  type="button"
                  onClick={handleQuickStartDefault}
                  className="py-4 px-5 rounded-2xl bg-white text-black font-bold text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#FFF1C5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
                  title="Launch existing pre-generated quiz immediately"
                >
                  Quick Start ({currentQuiz.questions?.length || 4} Qs)
                </button>
              )}
            </div>
          </div>
        ) : viewState === 'taking' && currentQ ? (
          /* =========================================================================
             2. ACTIVE QUIZ TAKING VIEW
             ========================================================================= */
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white border-2 border-black rounded-xl text-xs font-mono font-black shadow-[2px_2px_0px_#000]">
                  Question {currentIndex + 1} of {total}
                </span>
                <span className="px-2.5 py-1 bg-[#FFF1C5] border-2 border-black rounded-xl text-[11px] font-mono font-black uppercase shadow-[2px_2px_0px_#000]">
                  {difficulty}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-700">
                Score: {score}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-zinc-200 border-2 border-black rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FFCCD5] transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="p-5 md:p-6 rounded-3xl bg-[#FFF9F5] border-3 border-black shadow-[4px_4px_0px_#000]">
              <h3 className="text-lg md:text-xl font-black text-black leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options?.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;
                
                let btnStyle = "bg-white text-black hover:bg-zinc-50 border-3 border-black shadow-[3px_3px_0px_#000]";
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = "bg-[#C7E9DE] text-black border-3 border-black shadow-[4px_4px_0px_#000] font-black";
                  } else if (isSelected && !isCorrect) {
                    btnStyle = "bg-[#FFCCD5] text-black border-3 border-black shadow-[4px_4px_0px_#000]";
                  } else {
                    btnStyle = "bg-zinc-100 text-zinc-500 border-2 border-zinc-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full p-4 rounded-2xl text-left font-bold text-sm md:text-base flex items-start gap-3 transition-all cursor-pointer ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-black text-white font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {optionLabels[idx] || idx + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{option}</span>
                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box on answer */}
            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[#FFF1C5] border-3 border-black text-xs md:text-sm font-bold text-zinc-900 leading-relaxed"
              >
                💡 <b>Explanation:</b> {currentQ.explanation}
              </motion.div>
            )}

            {/* Bottom Actions: Submit Early & Next Question */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="py-2.5 px-3.5 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                title="Submit Quiz Early"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Submit Quiz Early</span>
              </button>

              {isAnswered && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-3 px-6 rounded-2xl bg-black text-white font-black text-xs md:text-sm uppercase tracking-wider shadow-[4px_4px_0px_#888] hover:bg-zinc-800 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{currentIndex === total - 1 ? "View Results →" : "Next Question →"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
             3. QUIZ RESULTS SUMMARY SCREEN
             ========================================================================= */
          <div className="py-8 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-[#FFF1C5] border-4 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center rotate-[-3deg]">
              <Trophy className="w-10 h-10 text-black" />
            </div>

            <div>
              <h3 className="text-3xl font-black text-black mb-1">
                Quiz Complete!
              </h3>
              <p className="text-sm font-bold text-zinc-800">
                Difficulty: <b className="uppercase">{difficulty}</b> • Scope: {scopeType === 'specific' ? selectedTopics.join(', ') : 'All Topics'}
              </p>
            </div>

            {/* Score Stats */}
            <div className="p-6 rounded-3xl bg-white border-4 border-black shadow-[5px_5px_0px_#000] w-full max-w-sm">
              <span className="text-xs font-black uppercase text-zinc-600 block mb-1">Final Score</span>
              <div className="text-5xl font-black text-black">
                {score} <span className="text-2xl text-zinc-500 font-bold">/ {total}</span>
              </div>
              <p className="text-xs font-bold text-zinc-700 mt-2">
                {Math.round((score / total) * 100)}% Active Recall Mastery
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                onClick={handleRetakeSame}
                className="flex-1 py-3 px-4 rounded-2xl bg-white text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#FFF1C5] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Quiz</span>
              </button>
              <button
                onClick={handleConfigureNew}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#FFCCD5] text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#ffb6c4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                <span>New Custom Quiz</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default QuizModal;

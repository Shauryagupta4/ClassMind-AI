import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  AlertTriangle, 
  BookMarked, 
  Compass, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  EyeOff,
  Quote,
  Target,
  Clock
} from 'lucide-react';

const TeacherIntentRadar = ({ intentData }) => {
  const [activeTab, setActiveTab] = useState('highYield'); // 'highYield' | 'traps' | 'lowPriority'

  if (!intentData) return null;

  const {
    overallTone = "Exam-Focused & Emphatic",
    examReadinessScore = 88,
    highYieldTopics = [],
    warningTraps = [],
    lowPriorityTopics = []
  } = intentData;

  const tabs = [
    {
      id: 'highYield',
      label: '🔥 High-Yield Exam Probables',
      count: highYieldTopics.length,
      color: 'bg-[#FFCCD5]',
      badgeColor: 'bg-rose-200'
    },
    {
      id: 'traps',
      label: '⚠️ Teacher Warning Traps',
      count: warningTraps.length,
      color: 'bg-[#FFF1C5]',
      badgeColor: 'bg-amber-200'
    },
    {
      id: 'lowPriority',
      label: '💤 Safe-to-Skim Topics',
      count: lowPriorityTopics.length,
      color: 'bg-[#C7E9DE]',
      badgeColor: 'bg-emerald-200'
    }
  ];

  return (
    <div className="w-full p-6 md:p-8 rounded-3xl bg-white border-4 border-black shadow-[8px_8px_0px_#000] mb-8 relative overflow-hidden">
      
      {/* Top Banner & Exam Urgency Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b-4 border-black mb-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFCCD5] border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 text-black" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl md:text-3xl font-black text-black tracking-tight">
                Teacher's Intent & Exam Radar
              </h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF1C5] border-2 border-black text-[11px] font-mono font-black uppercase shadow-[1px_1px_0px_#000]">
                EXAM ORIENTED
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-700 mt-0.5">
              AI analysis of vocal emphasis, teacher's emotion, guaranteed exam topics & warnings
            </p>
          </div>
        </div>

        {/* Dynamic Badges: Tone & Exam Weightage */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-[#E8D7F1] shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <span className="text-xs">🎙️</span>
            <span className="text-xs font-mono font-black text-black">
              Tone: {overallTone}
            </span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-[#C7E9DE] shadow-[2px_2px_0px_#000] flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-600 fill-rose-600" />
            <span className="text-xs font-mono font-black text-black">
              {examReadinessScore}% Exam Weight
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Buttons */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-3.5 rounded-xl border-2 border-black text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? `${tab.color} text-black shadow-[3px_3px_0px_#000] -translate-y-0.5`
                  : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 shadow-[1px_1px_0px_#000]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white border border-black text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <AnimatePresence mode="wait">
        {activeTab === 'highYield' && (
          <motion.div
            key="highYield"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {highYieldTopics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highYieldTopics.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FFF9F5] border-3 border-black shadow-[4px_4px_0px_#000] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-[#FFCCD5] border border-black shadow-[1px_1px_0px_#000]">
                            🔥 {item.intentLevel || 'MUST-KNOW'}
                          </span>
                          {item.timestamp && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-[#C7E9DE] border border-black text-black shadow-[1px_1px_0px_#000]">
                              <Clock className="w-2.5 h-2.5 text-black" />
                              <span>⏱️ {item.timestamp}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-500">
                          Priority #{idx + 1}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-black leading-snug mb-2">
                        {item.topic}
                      </h4>
                      
                      {/* Teacher's verbal cue quote */}
                      {item.verbalCues && (
                        <div className="p-2.5 rounded-xl bg-white border-2 border-dashed border-zinc-400 mb-2 flex items-start gap-2">
                          <Quote className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-zinc-900 italic leading-snug">
                            {item.verbalCues}
                          </p>
                        </div>
                      )}

                      {/* Why important */}
                      {item.whyImportant && (
                        <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                          <b className="text-black font-black">Exam Relevance:</b> {item.whyImportant}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-50 border-2 border-black text-center text-xs font-bold text-zinc-600">
                General coverage detected across foundational topics.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'traps' && (
          <motion.div
            key="traps"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {warningTraps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warningTraps.map((trap, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FFF9E6] border-3 border-black shadow-[4px_4px_0px_#000]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-200 border border-black text-[10px] font-mono font-black uppercase text-amber-950">
                          ⚠️ PITFALL TRAP
                        </span>
                        {trap.timestamp && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-[#C7E9DE] border border-black text-black shadow-[1px_1px_0px_#000]">
                            <Clock className="w-2.5 h-2.5 text-black" />
                            <span>⏱️ {trap.timestamp}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-black">
                        {trap.concept || 'Common Confusion'}
                      </h4>
                    </div>
                    <p className="text-xs font-bold text-zinc-800 leading-relaxed bg-white p-2.5 rounded-xl border border-black">
                      {trap.warning}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#FFF9F5] border-2 border-black text-center text-xs font-bold text-zinc-600">
                No acute warning traps or negative marking pitfalls flagged by the instructor in this lecture.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'lowPriority' && (
          <motion.div
            key="lowPriority"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {lowPriorityTopics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowPriorityTopics.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl bg-[#F0FAF7] border-3 border-black shadow-[4px_4px_0px_#000]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-black text-[10px] font-mono font-black uppercase text-emerald-950">
                        💤 SKIM CANDIDATE
                      </span>
                      <h4 className="text-sm font-black text-black">
                        {item.topic}
                      </h4>
                    </div>
                    <p className="text-xs font-medium text-zinc-700 leading-snug">
                      <b className="text-black font-bold">Instructor Note:</b> {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-zinc-50 border-2 border-black text-center text-xs font-bold text-zinc-600">
                All topics covered in this lecture carry significant examination weightage. Skimming is not advised.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Pro-Tip */}
      <div className="mt-6 pt-4 border-t-2 border-dashed border-zinc-300 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-600">
        <span>💡 PRO-TIP: Focus on 🔥 High-Yield topics first during revision sprints</span>
        <span className="hidden sm:inline">ClassMind Intent AI Engine</span>
      </div>

    </div>
  );
};

export default TeacherIntentRadar;

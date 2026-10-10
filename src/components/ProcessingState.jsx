import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Loader2, Sparkles, FileAudio, Video, Globe, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ProcessingState = ({ sourceInfo, isReady, data, onComplete, onCancel }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme] || styles.pastelBrutal;

  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const sourceType = sourceInfo?.type || 'file';
  const sourceName = sourceInfo?.name || 'Lecture Material';

  const steps = [
    {
      id: 0,
      title: 'Source Ingestion',
      activeText: `Connecting & verifying ${sourceType === 'youtube' ? 'YouTube video stream' : sourceType === 'web' ? 'web article link' : 'lecture file'}...`,
      doneText: `Received ${sourceName} successfully!`,
      icon: sourceType === 'youtube' ? Video : sourceType === 'web' ? Globe : FileAudio,
      color: 'bg-[#FFCCD5]',
    },
    {
      id: 1,
      title: 'Content & Dialogue Extraction',
      activeText: 'Parsing lecture speech segments and transcript...',
      doneText: 'Extracted speech & dialogue content successfully!',
      icon: Sparkles,
      color: 'bg-[#FFF1C5]',
    },
    {
      id: 2,
      title: 'AI Cognitive Synthesis',
      activeText: 'Extracting teacher intents, core definitions & key principles...',
      doneText: 'Synthesized high-yield concepts & terminology successfully!',
      icon: BrainCircuit,
      color: 'bg-[#C7E9DE]',
    },
    {
      id: 3,
      title: 'Compiling Master Compendium',
      activeText: 'Structuring brief review notes & comprehensive deep dives...',
      doneText: 'Master revision notes & glossary compiled successfully!',
      icon: CheckCircle2,
      color: 'bg-[#E8D7F1]',
    },
  ];

  // Progressive step advancement
  useEffect(() => {
    // Step 0 -> Step 1 after 800ms
    const timer0 = setTimeout(() => {
      setCompletedSteps(prev => [...prev, 0]);
      setActiveStep(1);
    }, 800);

    // Step 1 -> Step 2 after 1800ms
    const timer1 = setTimeout(() => {
      setCompletedSteps(prev => [...prev, 1]);
      setActiveStep(2);
    }, 1800);

    // Step 2 -> Step 3 after 2900ms
    const timer2 = setTimeout(() => {
      setCompletedSteps(prev => [...prev, 2]);
      setActiveStep(3);
    }, 2900);

    return () => {
      clearTimeout(timer0);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // When step 3 is reached AND backend data is ready, wrap up and trigger onComplete
  useEffect(() => {
    if (activeStep >= 3 && isReady) {
      const finishTimer = setTimeout(() => {
        setCompletedSteps([0, 1, 2, 3]);
        const exitTimer = setTimeout(() => {
          if (onComplete) onComplete(data);
        }, 500);
        return () => clearTimeout(exitTimer);
      }, 400);

      return () => clearTimeout(finishTimer);
    }
  }, [activeStep, isReady, data, onComplete]);

  const progressPercent = Math.min(100, Math.round(((completedSteps.length + 0.3) / steps.length) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="w-full max-w-xl mx-auto py-10 px-4"
    >
      <div className="p-8 rounded-3xl bg-white border-4 border-black shadow-[10px_10px_0px_#000] relative overflow-hidden">
        
        {/* Header Stage Badge */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#FFF1C5] border-2 border-black shadow-[3px_3px_0px_#000]">
            <BrainCircuit className="w-4 h-4 text-black animate-spin" style={{ animationDuration: '5s' }} />
            <span className="text-xs font-mono font-black uppercase text-black tracking-wider">
              MULTI-STAGE PIPELINE
            </span>
          </div>

          <span className="px-3 py-1 rounded-xl bg-[#C7E9DE] border-2 border-black text-xs font-mono font-black text-black shadow-[2px_2px_0px_#000]">
            {progressPercent}% READY
          </span>
        </div>

        {/* Title */}
        <h3 className="text-2xl md:text-3xl font-black text-black tracking-tight mb-2">
          Processing Lecture
        </h3>
        
        <p className="text-xs font-bold text-zinc-700 mb-6 flex items-center gap-2">
          <span className="truncate max-w-[280px] bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-400 font-mono">
            {sourceName}
          </span>
          <span>• Initializing high-yield synthesis</span>
        </p>

        {/* Neo-brutalist Progress Bar */}
        <div className="w-full h-5 bg-[#FFF9F5] border-2 border-black rounded-full overflow-hidden p-0.5 mb-8 shadow-[3px_3px_0px_#000]">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#FFCCD5] via-[#FFF1C5] to-[#C7E9DE] border border-black rounded-full"
            initial={{ width: '10%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isDone = completedSteps.includes(step.id);
            const isCurrent = activeStep === step.id && !isDone;
            const IconComponent = step.icon;

            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-3.5 rounded-2xl border-2 border-black transition-all duration-300 flex items-start gap-3.5 ${
                  isDone 
                    ? 'bg-[#F2FAF7] shadow-[3px_3px_0px_#000]' 
                    : isCurrent 
                    ? `${step.color} shadow-[4px_4px_0px_#000] -translate-y-0.5` 
                    : 'bg-zinc-50 border-zinc-300 opacity-60'
                }`}
              >
                {/* Status Indicator Icon */}
                <div className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center shrink-0 mt-0.5 shadow-[2px_2px_0px_#000] ${
                  isDone 
                    ? 'bg-[#C7E9DE] text-black' 
                    : isCurrent 
                    ? 'bg-white text-black' 
                    : 'bg-zinc-200 text-zinc-400 border-zinc-400'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                  ) : (
                    <IconComponent className="w-4 h-4 text-zinc-400" />
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-mono font-black uppercase tracking-wider ${
                      isDone || isCurrent ? 'text-black' : 'text-zinc-500'
                    }`}>
                      Stage {idx + 1}: {step.title}
                    </h4>
                    {isDone && (
                      <span className="text-[10px] font-mono font-black text-black px-1.5 py-0.2 rounded bg-[#C7E9DE] border border-black">
                        DONE ✓
                      </span>
                    )}
                  </div>

                  <p className={`text-xs font-bold mt-0.5 leading-snug ${
                    isDone 
                      ? 'text-zinc-900' 
                      : isCurrent 
                      ? 'text-black font-extrabold' 
                      : 'text-zinc-500'
                  }`}>
                    {isDone ? step.doneText : isCurrent ? step.activeText : 'Pending previous step...'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Note & Cancel Option */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-zinc-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] font-mono font-bold text-zinc-600">
            Powered by ClassMind Autonomous Pipeline • Groq Fast Inference
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-mono font-black text-rose-600 hover:text-rose-800 hover:underline px-2.5 py-1 rounded-lg border border-black bg-rose-50 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              ✕ Cancel
            </button>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default ProcessingState;

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileAudio, FolderOpen, AlertCircle, Camera, Layers, Sparkles, X, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB limit for Groq Whisper

const Dropzone = ({ onFileDrop, onRequireAuth }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [sizeError, setSizeError] = useState(null);
  const fileInputRef = useRef(null);

  const handleBrowseClick = (e) => {
    if (e) e.stopPropagation();
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return;
    }
    fileInputRef.current?.click();
  };

  const validateAndAddFiles = (newFiles) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return false;
    }
    if (!newFiles || newFiles.length === 0) return false;
    setSizeError(null);

    const validFiles = [];
    for (const file of newFiles) {
      const isMedia = file.type.startsWith('audio/') || 
                      file.type.startsWith('video/') || 
                      /\.(mp3|wav|m4a|ogg|aac|flac|mp4|webm|mkv|mov|avi)$/i.test(file.name);

      if (isMedia && file.size > MAX_MEDIA_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const errMsg = `"${file.name}" is ${sizeMB} MB. Maximum allowed size for audio/video transcription is 25 MB.`;
        setSizeError(errMsg);
        toast.error(
          `"${file.name}" exceeds 25 MB limit for transcription.\nPlease compress or use a YouTube link.`,
          { duration: 7000 }
        );
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setStagedFiles(prev => {
        // Prevent duplicate files with same name and size
        const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
        const fresh = validFiles.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
        return [...prev, ...fresh];
      });
      toast.success(
        validFiles.length === 1 
          ? `Added "${validFiles[0].name}"! Add more or click Synthesize.` 
          : `Added ${validFiles.length} files to queue!`
      );
    }

    // Reset file input value so selecting the same file again triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
    return true;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovered(false);
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index, e) => {
    if (e) e.stopPropagation();
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartSynthesis = (e) => {
    if (e) e.stopPropagation();
    if (stagedFiles.length === 0) return;
    if (onFileDrop) {
      onFileDrop(stagedFiles);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto mt-12"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        accept="audio/*,video/*,image/*,.txt,.md,.srt,.vtt,.pdf,.png,.jpg,.jpeg,.webp" 
        multiple
        className="hidden" 
      />

      {/* The container */}
      <motion.div
        className={`relative group rounded-3xl border-4 border-dashed border-black bg-[#FFF0F5] shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 p-8 md:p-10 transition-all duration-300 ${
          isHovered ? 'bg-[#FFE2EC]' : 'bg-[#FFF0F5]'
        }`}
        onClick={stagedFiles.length === 0 ? handleBrowseClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          {stagedFiles.length > 0 ? (
            /* Staged Files Tray */
            <div className="w-full flex flex-col items-center">
              {/* Staging Header */}
              <div className="w-full flex items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-[#C7E9DE] border-2 border-black flex items-center justify-center font-black text-xs text-black shadow-[2px_2px_0px_#000]">
                    {stagedFiles.length}
                  </span>
                  <span className="font-black text-xs md:text-sm uppercase tracking-tight text-black text-left">
                    {stagedFiles.length === 1 ? '1 File Ready' : `${stagedFiles.length} Lecture Files Staged`}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setStagedFiles([]); }}
                  className="text-xs font-mono font-black text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              {/* File Chips Queue */}
              <div className="w-full flex flex-wrap justify-center gap-2 mb-6 max-h-52 overflow-y-auto p-1">
                <AnimatePresence>
                  {stagedFiles.map((file, idx) => {
                    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(file.name);
                    const isAud = file.type.startsWith('audio/') || file.type.startsWith('video/') || /\.(mp3|wav|m4a|mp4|webm)$/i.test(file.name);
                    return (
                      <motion.div 
                        key={`${file.name}_${idx}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-mono font-bold"
                      >
                        <span>{isImg ? '📸' : isAud ? '🎙️' : '📄'}</span>
                        <span className="max-w-[160px] truncate text-black" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(idx, e)}
                          className="ml-1 w-4 h-4 rounded-full bg-red-100 hover:bg-red-400 text-red-900 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                          title="Remove this file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Action Buttons: Add More Files + Synthesize Now */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white border-2 border-black text-xs font-mono font-black uppercase tracking-wider text-black shadow-[3px_3px_0px_#000] hover:bg-[#FFF1C5] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>+ Add Another File / Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartSynthesis}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#C7E9DE] border-3 border-black text-xs md:text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_#000] hover:bg-[#b0ded2] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 fill-current" />
                  <span>⚡ Synthesize {stagedFiles.length === 1 ? 'Lecture' : `${stagedFiles.length} Files Combined`} →</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty Dropzone Initial View */
            <>
              <motion.div 
                animate={{ y: isHovered ? -10 : 0 }}
                className={`w-24 h-24 ${currentStyles.iconContainerClass} flex items-center justify-center mb-6 group-hover:${currentStyles.accentBg} transition-all duration-300`}
              >
                <Upload className={`w-12 h-12 ${isHovered ? currentStyles.buttonTextClass : currentStyles.accent}`} />
              </motion.div>
              <h3 className={`text-3xl font-black ${currentStyles.textPrimary} tracking-tight mb-4`}>
                Feed me a lecture.
              </h3>
              {sizeError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-100 border-3 border-black shadow-[4px_4px_0px_#000] text-left flex items-start gap-3 max-w-md animate-shake">
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-mono font-black text-rose-950 uppercase tracking-wide">
                      File Too Large (Max 25 MB)
                    </h4>
                    <p className="text-xs font-bold text-rose-900 mt-1">
                      {sizeError}
                    </p>
                    <p className="text-[11px] font-medium text-rose-800 mt-1">
                      💡 Tip: Convert video to <code className="font-mono bg-rose-200 px-1 rounded">.mp3</code>, compress it under 25MB, or paste a YouTube link below!
                    </p>
                  </div>
                </div>
              )}

              <p className={`${currentStyles.textSecondary} text-base md:text-lg font-medium mb-4 max-w-md`}>
                Drag and drop single or multiple whiteboard photos, notes, audio, or video files here.
              </p>

              {/* Neo-brutalist media format badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#C7E9DE] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  📸 Multi-Whiteboard Photos (OCR Vision)
                </span>
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF1C5] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  ⚡ Audio / Video (Whisper: 25 MB)
                </span>
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFCCD5] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  📄 Text & Documents (Unlimited)
                </span>
              </div>
              
              <button 
                type="button"
                onClick={handleBrowseClick}
                className={`${currentStyles.buttonClass} flex items-center gap-2 cursor-pointer`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>Browse Files / Photos</span>
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dropzone;

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileAudio, FolderOpen, AlertCircle, Camera, Layers, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB limit for Groq Whisper

const Dropzone = ({ onFileDrop, onRequireAuth }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
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

  const validateAndHandleFiles = (filesList) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return false;
    }
    if (!filesList || filesList.length === 0) return false;
    setSizeError(null);

    // Validate size for each media file
    for (const file of filesList) {
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
        setSelectedFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return false;
      }
    }

    setSelectedFiles(filesList);
    if (onFileDrop) setTimeout(() => onFileDrop(filesList), 500);
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
      validateAndHandleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFiles(Array.from(e.target.files));
    }
  };

  const singleFile = selectedFiles && selectedFiles.length === 1 ? selectedFiles[0] : null;
  const isSingleImage = singleFile && (singleFile.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(singleFile.name));

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
        className={`relative group rounded-3xl border-4 border-dashed border-black bg-[#FFF0F5] shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 p-10 transition-all duration-300 cursor-pointer ${
          isHovered ? 'bg-[#FFE2EC]' : 'bg-[#FFF0F5]'
        }`}
        onClick={handleBrowseClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          {selectedFiles && selectedFiles.length > 0 ? (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-[#FFCCD5] border-4 border-black rounded-3xl shadow-[4px_4px_0px_#000] flex items-center justify-center mb-6">
                {selectedFiles.length > 1 ? (
                  <Layers className="w-10 h-10 text-black animate-bounce" />
                ) : isSingleImage ? (
                  <Camera className="w-10 h-10 text-black animate-pulse" />
                ) : (
                  <FileAudio className="w-10 h-10 text-black" />
                )}
              </div>
              <h3 className={`text-2xl font-black ${currentStyles.textPrimary} tracking-tight mb-2`}>
                {selectedFiles.length > 1 ? `${selectedFiles.length} Lecture Files Selected` : singleFile.name}
              </h3>
              <p className={`${currentStyles.accent} font-bold uppercase tracking-widest text-sm mb-3`}>
                {selectedFiles.length > 1 
                  ? '⚡ Multi-File Ingestion Ready (Combined Synthesis)' 
                  : isSingleImage 
                  ? '📸 Whiteboard Photo Ready (OCR Vision)' 
                  : '⚡ Ready to Process'}
              </p>
              {selectedFiles.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                  {selectedFiles.slice(0, 4).map((f, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-lg bg-white border border-black text-[11px] font-mono font-bold truncate max-w-[150px]">
                      {f.name}
                    </span>
                  ))}
                  {selectedFiles.length > 4 && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#FFF1C5] border border-black text-[11px] font-mono font-bold">
                      +{selectedFiles.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
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
                Drag and drop your audio, video, whiteboard photo, handwritten notes, or transcript file here.
              </p>

              {/* Neo-brutalist media format badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#C7E9DE] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  📸 Whiteboard & Notes Photo (OCR Vision)
                </span>
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFF1C5] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  ⚡ Audio / Video (Whisper: 25 MB)
                </span>
                <span className="px-3 py-1 rounded-xl border-2 border-black bg-[#FFCCD5] text-[11px] font-mono font-black text-black shadow-[2px_2px_0px_#000]">
                  📄 Text & SRT (Unlimited)
                </span>
              </div>
              
              <button 
                type="button"
                onClick={handleBrowseClick}
                className={`${currentStyles.buttonClass} flex items-center gap-2`}
              >
                <FolderOpen className="w-5 h-5" />
                Browse Lecture File
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dropzone;

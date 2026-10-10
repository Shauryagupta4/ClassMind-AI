import React, { useState } from 'react';
import { Loader2, Video, Globe, Sparkles, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchWebContent } from '../lib/tinyfish';

const YouTubeInput = ({ onTranscriptReady }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];
  
  const [mode, setMode] = useState('youtube'); // 'youtube' | 'web'
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disabledCaptionMeta, setDisabledCaptionMeta] = useState(null);

  const handleSynthesizeFromTopic = (topicName) => {
    if (onTranscriptReady) {
      const promptText = `Educational and Technical Subject: ${topicName}\n\nPlease generate a master academic synthesis including structured revision notes, foundational principles, teacher's intent exam radar, and active-recall key terms based on this subject.`;
      onTranscriptReady(promptText, {
        type: 'youtube',
        name: topicName,
        language: 'auto-detected'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    setDisabledCaptionMeta(null);

    try {
      if (mode === 'youtube') {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const resp = await fetch(`${serverUrl}/api/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        
        if (!resp.ok) {
          const errData = await resp.json();
          if (errData.disabledCaptions) {
            setDisabledCaptionMeta(errData);
            return;
          }
          throw new Error(errData.error || 'Failed to fetch transcript. Video might not have subtitles.');
        }
        
        const { transcript, language } = await resp.json();
        if (onTranscriptReady) {
          onTranscriptReady(transcript, { 
            type: 'youtube', 
            name: url,
            language: language || 'auto-detected'
          });
        }
      } else {
        // Mode === 'web' using TinyFish Fetch API
        const markdown = await fetchWebContent(url);
        if (!markdown || markdown.trim().length < 50) {
          throw new Error('TinyFish fetched the page, but content was too short or empty.');
        }
        if (onTranscriptReady) onTranscriptReady(markdown, { type: 'web', name: url });
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 w-full max-w-lg mx-auto">
      {/* Tab Switcher */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => { setMode('youtube'); setError(null); }}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            mode === 'youtube'
              ? `${currentStyles.accentBg} ${currentStyles.buttonTextClass} shadow-md`
              : `${currentStyles.bgCard} ${currentStyles.textSecondary} border ${currentStyles.borderCard}`
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          YouTube Video (Hindi & All Languages)
        </button>

        <button
          type="button"
          onClick={() => { setMode('web'); setError(null); }}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
            mode === 'web'
              ? `${currentStyles.accentBg} ${currentStyles.buttonTextClass} shadow-md`
              : `${currentStyles.bgCard} ${currentStyles.textSecondary} border ${currentStyles.borderCard}`
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Web Article / Syllabus
          <span className="text-[10px] font-mono px-1 py-0.2 bg-blue-600/30 text-blue-400 rounded">
            TinyFish
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label className={`block text-xs font-semibold ${currentStyles.textSecondary} mb-3 text-center`}>
          {mode === 'youtube' 
            ? 'Paste any YouTube URL (Auto-detects Hindi हिंदी, Hinglish, English & multilingual subtitles)' 
            : 'Paste any course link, Wikipedia, or syllabus URL (Ingested by TinyFish)'}
        </label>
        
        <div className="flex gap-2">
          <input
            type="url"
            required
            placeholder={mode === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://en.wikipedia.org/wiki/Photosynthesis'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`flex-1 px-4 py-2 ${currentStyles.inputClass} transition-all duration-200 text-sm`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`${currentStyles.buttonSmallClass} flex items-center gap-1.5 px-4 cursor-pointer`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'youtube' ? 'Extracting...' : 'TinyFish Crawling...'}</span>
              </>
            ) : (
              <>
                {mode === 'youtube' ? <Video className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>Process</span>
              </>
            )}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500 text-center font-medium">{error}</p>}

        {disabledCaptionMeta && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border-3 border-black shadow-[4px_4px_0px_#000] text-left">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-mono font-black text-amber-950 uppercase tracking-wide">
                  Subtitles / Captions Disabled by Creator
                </h4>
                <p className="text-xs font-bold text-amber-900 mt-1 leading-snug">
                  The creator of <b>"{disabledCaptionMeta.videoTitle || 'this video'}"</b> did not enable subtitles/captions on YouTube.
                </p>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSynthesizeFromTopic(disabledCaptionMeta.videoTitle || url)}
                    className="px-3.5 py-2 rounded-xl border-2 border-black bg-[#FFCCD5] hover:bg-[#ffb6c4] text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✨ Generate Master Notes on this Topic Anyway →</span>
                  </button>
                </div>
                
                <p className="text-[11px] font-bold text-amber-800 mt-2.5">
                  💡 Tip: If you have the lecture video or audio (.mp3), upload it to the Dropzone above — Groq Whisper will transcribe the raw sound directly!
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default YouTubeInput;

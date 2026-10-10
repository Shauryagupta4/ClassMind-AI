import React, { useState } from 'react';
import { Loader2, Video, Globe, Sparkles, Languages } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchWebContent } from '../lib/tinyfish';

const YouTubeInput = ({ onTranscriptReady }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];
  
  const [mode, setMode] = useState('youtube'); // 'youtube' | 'web'
  const [url, setUrl] = useState('');
  const [langPreference, setLangPreference] = useState('auto'); // 'auto' | 'hi' | 'en'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'youtube') {
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const resp = await fetch(`${serverUrl}/api/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url,
            lang: langPreference === 'auto' ? null : langPreference
          }),
        });
        
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Failed to fetch transcript. Video might not have subtitles.');
        }
        
        const { transcript, language } = await resp.json();
        if (onTranscriptReady) {
          onTranscriptReady(transcript, { 
            type: 'youtube', 
            name: url,
            language: language || langPreference
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
        <label className={`block text-xs font-semibold ${currentStyles.textSecondary} mb-2 text-center`}>
          {mode === 'youtube' 
            ? 'Paste any YouTube URL (Supports Hindi हिंदी, Hinglish, English & multilingual subtitles)' 
            : 'Paste any course link, Wikipedia, or syllabus URL (Ingested by TinyFish)'}
        </label>

        {/* Language selector in YouTube mode */}
        {mode === 'youtube' && (
          <div className="flex items-center justify-center gap-1.5 mb-2.5">
            <span className="text-[11px] font-mono font-bold text-zinc-700 flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />
              Language:
            </span>
            {[
              { id: 'auto', label: '🌐 Auto / Any Language' },
              { id: 'hi', label: '🇮🇳 Hindi (हिंदी)' },
              { id: 'en', label: '🇬🇧 English' }
            ].map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLangPreference(l.id)}
                className={`px-2 py-0.5 text-[10px] md:text-[11px] font-bold rounded-lg border-2 border-black transition-all cursor-pointer ${
                  langPreference === l.id
                    ? 'bg-[#FFCCD5] text-black shadow-[2px_2px_0px_#000] -translate-y-0.5 font-black'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 shadow-[1px_1px_0px_#000]'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
        
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
      </form>
    </div>
  );
};

export default YouTubeInput;

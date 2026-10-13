import React, { useState } from 'react';
import { Loader2, Video, Globe, Sparkles, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fetchWebContent, fetchTinyFishAcademicContext } from '../lib/tinyfish';
import toast from 'react-hot-toast';

const YouTubeInput = ({ onTranscriptReady, onRequireAuth }) => {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];
  const { user } = useAuth();
  
  const [mode, setMode] = useState('youtube'); // 'youtube' | 'web'
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disabledCaptionMeta, setDisabledCaptionMeta] = useState(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const [showManualPaste, setShowManualPaste] = useState(false);

  const checkAuth = () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      toast('Please log in or continue as a Demo Student first!', { icon: '🔐' });
      return false;
    }
    return true;
  };

  const handleSynthesizeFromTopic = async (topicName) => {
    if (!checkAuth()) return;
    if (onTranscriptReady) {
      const cleanTitle = (topicName || '').replace(/^https?:\/\/\S+/i, '').trim() || 'Comprehensive Academic Lecture';
      toast.loading(`TinyFish is discovering syllabus & reference material for "${cleanTitle}"...`, { id: 'tf-synthesis' });

      // Fetch verified academic syllabus & reference text via TinyFish crawler
      let crawledMaterial = '';
      try {
        crawledMaterial = await fetchTinyFishAcademicContext(cleanTitle);
      } catch (e) {
        console.warn('TinyFish crawl fallback notice:', e);
      }

      toast.dismiss('tf-synthesis');
      toast.success(`Synthesizing master course curriculum on: "${cleanTitle}"`, { icon: '🎓', duration: 4000 });

      const promptText = `ACADEMIC SUBJECT & LECTURE TOPIC: "${cleanTitle}"
Source Reference: YouTube Educational Lecture (${url.trim()})

${crawledMaterial ? `VERIFIED REFERENCE MATERIAL & SYLLABUS DISCOVERED BY TINYFISH AI:
${crawledMaterial}

` : ''}PEDAGOGICAL DIRECTIVE & CURRICULUM BLUEPRINT:
This is an exhaustive academic masterclass on "${cleanTitle}".
Please generate a complete, rigorous, examination-grade academic compendium covering this subject with total pedagogical depth.

REQUIRED CURRICULUM COVERAGE:
1. Primary Principles & Theoretical Framework: Exhaustive breakdown of core mechanisms, definitions, and underlying laws of ${cleanTitle}.
2. Mathematical Derivations, Formulas, or Technical Architecture: Step-by-step logic and quantitative rules.
3. Teacher's Exam Radar & Common Student Pitfalls: Key focus areas marked 5-stars by examiners, common misconception traps, and calculation hazards.
4. Comprehensive Textbook Guide: Thorough multi-paragraph sections that explain every sub-module with complete conceptual clarity so students can achieve 100% mastery.
5. High-Yield Key Glossary, Active-Recall Revision Notes, Quizzes, and Flashcards.`;

      onTranscriptReady(promptText, {
        type: 'youtube',
        name: cleanTitle,
        url: url.trim(),
        language: 'auto-detected'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkAuth()) return;
    if (!url) return;
    setLoading(true);
    setError(null);
    setDisabledCaptionMeta(null);

    const trimmedUrl = url.trim();
    const isYouTubeUrl = /(?:youtu\.be\/|youtube\.com\/)/i.test(trimmedUrl);

    // Smart auto-switching: route YouTube links to YouTube engine, and web links to web engine
    let effectiveMode = mode;
    if (effectiveMode === 'web' && isYouTubeUrl) {
      effectiveMode = 'youtube';
      setMode('youtube');
      toast('Switched to YouTube mode for optimal lecture synthesis!', { icon: '🎥' });
    } else if (effectiveMode === 'youtube' && !isYouTubeUrl && /^https?:\/\//i.test(trimmedUrl)) {
      effectiveMode = 'web';
      setMode('web');
      toast('Switched to Web Article / Syllabus mode!', { icon: '🌐' });
    }

    try {
      if (effectiveMode === 'youtube') {
        const configuredUrl = import.meta.env.VITE_SERVER_URL;
        const candidateEndpoints = [
          '/api/transcript',
          (configuredUrl?.startsWith('http') ? `${configuredUrl}/api/transcript` : null),
          'http://localhost:3001/api/transcript'
        ].filter(Boolean);

        const uniqueEndpoints = [...new Set(candidateEndpoints)];
        let transcriptResult = null;
        let lastErrorJson = null;

        for (const ep of uniqueEndpoints) {
          try {
            // Try POST first
            let resp = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: trimmedUrl }),
            });

            // If POST failed with 404 or method not allowed, try GET
            if (!resp.ok && resp.status !== 422) {
              try {
                const getResp = await fetch(`${ep}?url=${encodeURIComponent(trimmedUrl)}`);
                if (getResp.ok) resp = getResp;
              } catch (getErr) {}
            }

            if (resp.ok) {
              const data = await resp.json();
              if (data?.transcript) {
                transcriptResult = data;
                break;
              }
            } else {
              try {
                lastErrorJson = await resp.json();
              } catch (e) {}
            }
          } catch (fetchErr) {
            console.warn(`Transcript endpoint [${ep}] unreachable:`, fetchErr.message);
          }
        }
        
        if (transcriptResult && transcriptResult.transcript) {
          const displayTitle = transcriptResult.title || trimmedUrl;
          toast.success(`Video Transcribed Successfully! (${transcriptResult.language || 'auto'})`, { icon: '🎬' });
          if (onTranscriptReady) {
            onTranscriptReady(transcriptResult.transcript, { 
              type: 'youtube', 
              name: displayTitle,
              url: trimmedUrl,
              language: transcriptResult.language || 'auto-detected'
            });
            return;
          }
        }

        // If subtitles are disabled or could not be extracted, fetch video metadata to present informed choice
        let videoTitle = lastErrorJson?.videoTitle;
        let author = lastErrorJson?.author;

        if (!videoTitle) {
          try {
            const oembedResp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(trimmedUrl)}&format=json`);
            if (oembedResp.ok) {
              const oembedData = await oembedResp.json();
              videoTitle = oembedData.title || null;
              author = oembedData.author_name || null;
            }
          } catch (oembedErr) {
            console.warn('oEmbed check notice:', oembedErr);
          }
        }

        const effectiveTitle = videoTitle || trimmedUrl;
        setDisabledCaptionMeta({
          videoTitle: effectiveTitle,
          author: author
        });
        setError(lastErrorJson?.error || `The creator has disabled subtitles/closed captions on "${effectiveTitle}".`);
      } else {
        // Mode === 'web' using enhanced Wikipedia API & TinyFish Fetch API
        const markdown = await fetchWebContent(trimmedUrl);
        if (!markdown || markdown.trim().length < 40) {
          throw new Error('Web page was empty or protected. Please try another article link or paste text.');
        }
        if (onTranscriptReady) {
          onTranscriptReady(markdown, { type: 'web', name: trimmedUrl, url: trimmedUrl });
        }
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process web resource.');
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
                  YouTube Subtitles Restricted or Closed by Creator
                </h4>
                <p className="text-xs font-bold text-amber-900 mt-1 leading-snug">
                  For <b>"{disabledCaptionMeta.videoTitle || 'this video'}"</b>, YouTube restricted cloud subtitle download. Choose how you would like to proceed:
                </p>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSynthesizeFromTopic(disabledCaptionMeta.videoTitle || url)}
                    className="px-3.5 py-2 rounded-xl border-2 border-black bg-[#FFCCD5] hover:bg-[#ffb6c4] text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>✨ Generate Master Notes on this Topic Anyway →</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualPaste(!showManualPaste)}
                    className="px-3 py-2 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <span>{showManualPaste ? 'Hide Paste Box' : '📝 Paste Transcript Manually'}</span>
                  </button>
                </div>

                {showManualPaste && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={4}
                      placeholder="Paste video transcript / Hindi subtitles here..."
                      value={manualTranscript}
                      onChange={(e) => setManualTranscript(e.target.value)}
                      className="w-full p-2.5 text-xs font-medium bg-white rounded-xl border-2 border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={!manualTranscript.trim()}
                      onClick={() => {
                        if (onTranscriptReady && manualTranscript.trim()) {
                          onTranscriptReady(manualTranscript.trim(), {
                            type: 'youtube',
                            name: disabledCaptionMeta.videoTitle || url,
                            url: url,
                            language: 'hindi-or-manual'
                          });
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl border-2 border-black bg-[#C7E9DE] hover:bg-[#aee0d1] text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span>⚡ Synthesize Pasted Transcript</span>
                    </button>
                  </div>
                )}
                
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

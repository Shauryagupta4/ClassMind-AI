import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink, Search, Sparkles, RefreshCw, BookOpen, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { searchAcademicResources } from '../lib/tinyfish';

export default function TinyFishAcademicResources({ topic, keyTerms = [] }) {
  const { theme, styles } = useTheme();
  const currentStyles = styles[theme];

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [lastSearched, setLastSearched] = useState('');

  // Extract quick-search suggestions from terms
  const suggestions = React.useMemo(() => {
    const list = [];
    if (topic) {
      const clean = topic.replace(/[|#_–—:🔥✨✦⚡[\]()]/g, '').trim();
      if (clean && clean.length > 3) list.push(clean.slice(0, 30));
    }
    if (Array.isArray(keyTerms)) {
      keyTerms.slice(0, 4).forEach(t => {
        const str = typeof t === 'object' && t !== null ? (t.term || t.name) : String(t);
        const head = str ? str.split(/[:\-–—(]/)[0].trim() : '';
        if (head && head.length > 2 && !list.includes(head)) {
          list.push(head);
        }
      });
    }
    return list.slice(0, 5);
  }, [topic, keyTerms]);

  const loadResources = async (queryTopic = topic, terms = keyTerms) => {
    if (!queryTopic && (!terms || terms.length === 0)) return;
    setLoading(true);
    try {
      const results = await searchAcademicResources(queryTopic, terms);
      setResources(results);
      setLastSearched(queryTopic);
    } catch (err) {
      console.error("Failed to load TinyFish resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (topic || (keyTerms && keyTerms.length > 0)) {
      loadResources(topic, keyTerms);
    }
  }, [topic, keyTerms?.length]);

  const handleCustomSearch = (e) => {
    if (e) e.preventDefault();
    if (!customQuery.trim()) return;
    loadResources(customQuery, []);
  };

  const handleChipSearch = (query) => {
    setCustomQuery(query);
    loadResources(query, []);
  };

  return (
    <div className={`mt-10 p-6 md:p-8 rounded-3xl ${currentStyles.bgCard} ${currentStyles.borderCard} border shadow-lg relative overflow-hidden transition-all duration-300`}>
      {/* Sponsor Tech Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-full bg-[#C7E9DE] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
              Live Autonomous Web Agent
            </span>
            <span className={`text-xs font-bold ${currentStyles.textSecondary}`}>
              Powered by <span className="font-extrabold text-blue-500">TinyFish AI</span>
            </span>
          </div>
          <h3 className={`text-2xl font-black ${currentStyles.textPrimary} tracking-tight flex items-center gap-2`}>
            <BookOpen className={`w-6 h-6 ${currentStyles.accent}`} />
            Curated Academic Resources & Web References
          </h3>
          <p className={`text-sm ${currentStyles.textSecondary} mt-1`}>
            TinyFish scours verified academic databases, university portals, and online references to discover curated study materials and guides for this lecture.
          </p>
        </div>

        <button
          onClick={() => loadResources(topic, keyTerms)}
          disabled={loading}
          className={`${currentStyles.buttonSmallClass} flex items-center gap-2 shrink-0 self-start md:self-auto`}
          title="Refresh resources from TinyFish"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Crawling Web...' : 'Refresh Sources'}
        </button>
      </div>

      {/* Custom live search bar using TinyFish */}
      <form onSubmit={handleCustomSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${currentStyles.textSecondary}`} />
          <input
            type="text"
            placeholder={`Search syllabus notes or practice papers (e.g. "${suggestions[0] || topic || 'topic'} practice questions")`}
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 text-sm ${currentStyles.inputClass} transition-all duration-200`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`${currentStyles.buttonSmallClass} shrink-0 px-5 cursor-pointer`}
        >
          Search
        </button>
      </form>

      {/* Suggested Quick Search Chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-600">Quick Search:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipSearch(`${s} practice exam questions`)}
              disabled={loading}
              className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFF1C5] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border ${currentStyles.borderCard} ${currentStyles.bgCard} animate-pulse flex flex-col gap-2`}
            >
              <div className="h-4 bg-zinc-700/30 rounded w-1/3 mb-1" />
              <div className="h-5 bg-zinc-700/40 rounded w-3/4 mb-1" />
              <div className="h-12 bg-zinc-700/20 rounded w-full" />
            </div>
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {resources.map((item, idx) => (
              <motion.a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`group p-4 rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFCCD5] text-black border border-black">
                      {item.site_name || 'Academic Web'}
                    </span>
                    <ExternalLink className={`w-3.5 h-3.5 ${currentStyles.textSecondary} group-hover:${currentStyles.accent} transition-colors`} />
                  </div>

                  <h4 className={`text-base font-bold ${currentStyles.textPrimary} group-hover:${currentStyles.accent} line-clamp-2 mb-2 transition-colors`}>
                    {item.title}
                  </h4>

                  <p className={`text-xs ${currentStyles.textSecondary} line-clamp-3 leading-relaxed`}>
                    {item.snippet}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-500/10 flex items-center justify-between text-[11px] font-medium text-emerald-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified Source
                  </span>
                  <span className="group-hover:underline">View Source &rarr;</span>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-8 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-300 p-6">
          <p className={`${currentStyles.textSecondary} text-sm font-medium mb-3`}>
            No live resources returned for the exact query. Click a quick topic below to explore:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipSearch(s)}
                className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-[#FFF1C5] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:scale-105 transition-all cursor-pointer"
              >
                🔍 Search "{s}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

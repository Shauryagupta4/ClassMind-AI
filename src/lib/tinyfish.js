// TinyFish API Integration for ClassMind AI
// Provides live academic search, exam past-paper retrieval, and web scraping.

const TINYFISH_API_KEY = import.meta.env.VITE_TINYFISH_API_KEY || "sk-tinyfish-9aIk4_Wt4XAiFAZjjvO5imiQAuP3TpGI";

// In-memory cache to ensure instant loading and prevent flickering for the same lecture
const resourceCache = new Map();

/**
 * Strips title noise, emojis, chapter boilerplate, and URLs
 */
function cleanTopic(rawTopic) {
  if (!rawTopic || typeof rawTopic !== 'string') return '';
  return rawTopic
    .replace(/^https?:\/\/\S+/i, '')
    .replace(/\b(one shot|full chapter|full lecture|lecture \d+|class \d+|chapter \d+|boards \d+|exam prep|shorts|video|tutorial|revision)\b/gi, ' ')
    .replace(/[\[\](){}|#_–—:🔥✨✦⚡\/*"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts concise 1-3 word term names without long definitions
 */
function cleanTerms(terms) {
  if (!Array.isArray(terms)) return [];
  return terms
    .map(t => {
      if (typeof t === 'object' && t !== null) return (t.term || t.name || '').trim();
      if (typeof t === 'string') return t.split(/[:\-–—(]/)[0].replace(/[^\w\s]/g, '').trim();
      return '';
    })
    .filter(t => t.length >= 2 && t.length <= 40)
    .slice(0, 3);
}

/**
 * Internal search executor with exponential backoff on 429
 */
async function executeTinyFishSearch(query) {
  if (!query) return [];
  const cleanKey = (TINYFISH_API_KEY || "").trim();
  if (!cleanKey) {
    console.warn("TinyFish API Key is missing or empty.");
    return [];
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(`https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'X-API-Key': cleanKey,
          'Accept': 'application/json'
        }
      });

      if (response.status === 429 && attempt === 1) {
        // Wait 900ms and retry if rate limited
        await new Promise(r => setTimeout(r, 900));
        continue;
      }

      if (!response.ok) {
        throw new Error(`TinyFish Search HTTP ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
      return [];
    } catch (err) {
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 600));
      } else {
        console.warn(`TinyFish query '${query}' failed:`, err.message);
      }
    }
  }
  return [];
}

/**
 * Searches the live web for academic papers, past exam questions, and study guides.
 * Uses a resilient multi-tier fallback strategy (Specific -> Broad -> Core Terms).
 * @param {string} topic - Title or main concept of the lecture.
 * @param {string[]} keyTerms - Optional key terms extracted by Groq.
 * @returns {Promise<Array<{ title: string, snippet: string, url: string, site_name: string }>>}
 */
export async function searchAcademicResources(topic, keyTerms = []) {
  if (!topic && (!keyTerms || keyTerms.length === 0)) return [];

  const sanitizedTopic = cleanTopic(topic);
  const sanitizedTerms = cleanTerms(keyTerms);
  const cacheKey = `${sanitizedTopic}__${sanitizedTerms.join('_')}`.toLowerCase();

  // Return cached results if previously loaded successfully
  if (resourceCache.has(cacheKey) && resourceCache.get(cacheKey).length > 0) {
    return resourceCache.get(cacheKey);
  }

  // Tier 1: Clean Topic + Top Key Terms + Exam Intent
  const termsPart = sanitizedTerms.join(' ');
  const q1 = `${sanitizedTopic} ${termsPart} past exam questions practice questions`.trim();
  let results = await executeTinyFishSearch(q1);

  // Tier 2: If Tier 1 returned 0 results, search clean topic with general study guides
  if (!results || results.length === 0) {
    const q2 = `${sanitizedTopic} syllabus notes study guide`.trim();
    if (q2 && q2 !== q1) {
      results = await executeTinyFishSearch(q2);
    }
  }

  // Tier 3: If still empty, search using the extracted academic terms directly
  if ((!results || results.length === 0) && sanitizedTerms.length > 0) {
    const q3 = `${sanitizedTerms.join(' ')} lecture notes practice questions`.trim();
    if (q3 && q3 !== q1 && q3 !== q2) {
      results = await executeTinyFishSearch(q3);
    }
  }

  // Tier 4: Broad academic topic fallback
  if ((!results || results.length === 0) && sanitizedTopic) {
    const q4 = `${sanitizedTopic} exam questions`.trim();
    if (q4 && q4 !== q1 && q4 !== q2) {
      results = await executeTinyFishSearch(q4);
    }
  }

  // Tier 5: Direct core topic fallback
  if ((!results || results.length === 0) && sanitizedTopic) {
    results = await executeTinyFishSearch(sanitizedTopic);
  }

  if (Array.isArray(results) && results.length > 0) {
    resourceCache.set(cacheKey, results);
  }

  return results || [];
}

/**
 * Ingests external web content (e.g. university lecture page, syllabus, article)
 * using TinyFish Fetch API (bypasses bot detection and cleans HTML to markdown).
 * @param {string} url - Web page URL to scrape.
 * @returns {Promise<string>} Clean extracted text.
 */
export async function fetchWebContent(url) {
  try {
    const response = await fetch('https://api.fetch.tinyfish.ai', {
      method: 'POST',
      headers: {
        'X-API-Key': TINYFISH_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ urls: [url] })
    });

    if (!response.ok) {
      throw new Error(`TinyFish Fetch HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].content || data.results[0].markdown || data.results[0].text || '';
    }
    return '';
  } catch (error) {
    console.error("TinyFish Fetch Error:", error);
    throw error;
  }
}

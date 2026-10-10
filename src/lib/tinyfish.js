// TinyFish API Integration for ClassMind AI
// Provides live academic search, exam past-paper retrieval, and web scraping.

const TINYFISH_API_KEY = import.meta.env.VITE_TINYFISH_API_KEY || "";

/**
 * Searches the live web for academic papers, past exam questions, and study guides.
 * Uses TinyFish Search API.
 * @param {string} topic - Title or main concept of the lecture.
 * @param {string[]} keyTerms - Optional key terms extracted by Groq.
 * @returns {Promise<Array<{ title: string, snippet: string, url: string, site_name: string }>>}
 */
export async function searchAcademicResources(topic, keyTerms = []) {
  try {
    const termsQuery = keyTerms && keyTerms.length > 0 ? keyTerms.slice(0, 3).join(' ') : '';
    const query = `${topic} ${termsQuery} past exam questions practice questions syllabus notes`.trim();
    
    const response = await fetch(`https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': TINYFISH_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`TinyFish Search HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("TinyFish Search Error:", error);
    return [];
  }
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

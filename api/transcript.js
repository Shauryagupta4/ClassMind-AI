import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Decodes escaped XML / HTML entities from YouTube caption output
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;#39;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts seconds into [MM:SS] or [HH:MM:SS] timestamp
 */
function formatTimestamp(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${String(h).padStart(2, '0')}:${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
}

/**
 * Multilingual YouTube transcript retriever with Audio/Video Timestamps
 */
async function fetchMultilingualTranscript(url, preferredLang = null) {
  const attempts = [];
  if (preferredLang) attempts.push(preferredLang);
  
  // Hindi & English candidate languages
  const candidates = ['hi', 'hi-IN', 'hi-Latn', 'en', 'en-US', 'en-IN', 'en-GB', null];
  for (const c of candidates) {
    if (!attempts.includes(c)) attempts.push(c);
  }

  let lastError = null;
  for (const lang of attempts) {
    try {
      const config = lang ? { lang } : undefined;
      const res = await YoutubeTranscript.fetchTranscript(url, config);
      if (Array.isArray(res) && res.length > 0) {
        const timestampedLines = [];
        let currentChunk = [];
        let chunkStartTime = 0;

        for (let i = 0; i < res.length; i++) {
          const item = res[i];
          const offsetSec = (item.offset || 0) / 1000;
          if (currentChunk.length === 0) {
            chunkStartTime = offsetSec;
          }
          currentChunk.push(decodeHtmlEntities(item.text));

          if (offsetSec - chunkStartTime >= 35 || i === res.length - 1) {
            timestampedLines.push(`[${formatTimestamp(chunkStartTime)}] ${currentChunk.join(' ')}`);
            currentChunk = [];
          }
        }

        const formattedTranscript = timestampedLines.join('\n');
        if (formattedTranscript.length > 10) {
          return {
            transcript: formattedTranscript,
            language: lang || 'auto-detected',
            hasTimestamps: true
          };
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No transcripts found for this video in any supported language.');
}

/**
 * Fetches video metadata via YouTube oEmbed
 */
async function getYouTubeMetadata(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || null,
        author: data.author_name || null
      };
    }
  } catch (e) {
    // Ignore fallback errors
  }
  return null;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { url, lang } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const result = await fetchMultilingualTranscript(url, lang);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Serverless transcript error:', error.message || error);
    const meta = await getYouTubeMetadata(req.body?.url);
    const videoTitle = meta?.title;
    const author = meta?.author;

    return res.status(422).json({
      error: videoTitle 
        ? `The YouTube creator has disabled closed captions/subtitles on "${videoTitle}".`
        : 'Failed to extract transcript. Closed captions/subtitles may be disabled on this video.',
      videoTitle,
      author,
      disabledCaptions: true
    });
  }
}

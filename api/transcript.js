import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Robust YouTube Video ID extractor (handles watch, shorts, live, embed, youtu.be, query params)
 */
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  if (/^[\w-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Decodes escaped XML / HTML entities
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts seconds to [MM:SS] or [HH:MM:SS]
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
 * Parses XML transcript supporting srv3 (<p t="ms">) and classic (<text start="s">)
 */
function parseTranscriptXml(xml, defaultLang = 'auto-detected') {
  if (!xml) return [];
  const results = [];

  // 1. Try srv3 format (<p t="ms" d="ms">)
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durMs = match[2] ? parseInt(match[2], 10) : 0;
    let text = match[3];
    text = text.replace(/<s[^>]*>([^<]*)<\/s>/g, '$1');
    text = text.replace(/<[^>]+>/g, '');
    text = decodeHtmlEntities(text);
    if (text) {
      results.push({ text, offset: startMs, duration: durMs, lang: defaultLang });
    }
  }

  if (results.length > 0) return results;

  // 2. Try classic format (<text start="s" dur="s">)
  const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  while ((match = textRegex.exec(xml)) !== null) {
    const startSec = parseFloat(match[1]);
    const durSec = match[2] ? parseFloat(match[2]) : 0;
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ''));
    if (text) {
      results.push({ text, offset: Math.round(startSec * 1000), duration: Math.round(durSec * 1000), lang: defaultLang });
    }
  }

  return results;
}

/**
 * Format raw transcript items into timeline paragraphs with timestamps
 */
function formatTimelineParagraphs(items) {
  if (!items || items.length === 0) return '';
  const timestampedLines = [];
  let currentChunk = [];
  let chunkStartTime = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const offsetSec = (item.offset || 0) / 1000;
    if (currentChunk.length === 0) {
      chunkStartTime = offsetSec;
    }
    currentChunk.push(item.text);

    if (offsetSec - chunkStartTime >= 35 || i === items.length - 1) {
      timestampedLines.push(`[${formatTimestamp(chunkStartTime)}] ${currentChunk.join(' ')}`);
      currentChunk = [];
    }
  }

  return timestampedLines.join('\n');
}

/**
 * Multilingual YouTube transcript retriever using multi-layer extraction
 */
async function fetchMultilingualTranscript(urlOrId, preferredLang = null) {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID');
  }

  // Layer 1: Direct InnerTube API across Android, iOS, Web clients
  const clients = [
    { name: 'ANDROID', version: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
    { name: 'IOS', version: '19.45.4', ua: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X)' },
    { name: 'WEB', version: '2.20240210.01.00', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  ];

  let captionTracks = null;

  for (const c of clients) {
    try {
      const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': c.ua
        },
        body: JSON.stringify({
          context: { client: { clientName: c.name, clientVersion: c.version } },
          videoId
        })
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        captionTracks = tracks;
        break;
      }
    } catch (e) {
      // try next client
    }
  }

  if (Array.isArray(captionTracks) && captionTracks.length > 0) {
    // Select best track: Hindi first, or English, or first available track
    let selectedTrack = captionTracks.find(t => 
      (t.languageCode && t.languageCode.toLowerCase().startsWith('hi')) ||
      (t.vssId && t.vssId.toLowerCase().includes('hi')) ||
      (t.name?.runs?.[0]?.text && /hindi|हिंदी/i.test(t.name.runs[0].text)) ||
      (t.name?.simpleText && /hindi|हिंदी/i.test(t.name.simpleText))
    );

    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t => t.languageCode && t.languageCode.startsWith('en')) || captionTracks[0];
    }

    if (selectedTrack?.baseUrl) {
      try {
        const xmlResp = await fetch(selectedTrack.baseUrl);
        if (xmlResp.ok) {
          const xml = await xmlResp.text();
          const items = parseTranscriptXml(xml, selectedTrack.languageCode);
          if (items.length > 0) {
            const formatted = formatTimelineParagraphs(items);
            if (formatted.length > 10) {
              return {
                transcript: formatted,
                language: selectedTrack.languageCode || 'auto-detected',
                hasTimestamps: true
              };
            }
          }
        }
      } catch (xmlErr) {
        console.warn('InnerTube XML fetch failed, trying library fallback:', xmlErr);
      }
    }
  }

  // Layer 2: youtube-transcript package fallback (default language)
  try {
    const rawItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const items = rawItems.map(item => ({
        text: decodeHtmlEntities(item.text),
        offset: item.offset || 0,
        duration: item.duration || 0,
        lang: item.lang || 'auto-detected'
      }));
      const formatted = formatTimelineParagraphs(items);
      if (formatted.length > 10) {
        return {
          transcript: formatted,
          language: items[0]?.lang || 'auto-detected',
          hasTimestamps: true
        };
      }
    }
  } catch (ytErr) {
    console.warn('youtube-transcript fallback failed:', ytErr.message);
  }

  // Layer 3: Web scraping player response fallback
  try {
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'hi,en-US;q=0.9,en;q=0.8'
      }
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      const match = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/s);
      if (match) {
        const playerObj = JSON.parse(match[1]);
        const tracks = playerObj?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          const track = tracks.find(t => t.languageCode?.startsWith('hi')) || tracks[0];
          if (track?.baseUrl) {
            const xmlResp = await fetch(track.baseUrl);
            const xml = await xmlResp.text();
            const items = parseTranscriptXml(xml, track.languageCode);
            if (items.length > 0) {
              const formatted = formatTimelineParagraphs(items);
              return {
                transcript: formatted,
                language: track.languageCode || 'auto-detected',
                hasTimestamps: true
              };
            }
          }
        }
      }
    }
  } catch (pageErr) {
    console.warn('Page scraping fallback failed:', pageErr.message);
  }

  throw new Error('No transcripts or closed captions were found for this video on YouTube.');
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
  // CORS configuration
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

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  } else if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString()); } catch (e) {}
  }

  const url = body?.url || req.query?.url;
  const lang = body?.lang || req.query?.lang;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const result = await fetchMultilingualTranscript(url, lang);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Serverless transcript extraction notice:', error.message || error);
    const meta = await getYouTubeMetadata(url);
    const videoTitle = meta?.title;
    const author = meta?.author;

    return res.status(422).json({
      error: videoTitle 
        ? `The YouTube creator has disabled closed captions/subtitles on "${videoTitle}".`
        : 'Closed captions or subtitles are unavailable on this video.',
      videoTitle,
      author,
      disabledCaptions: true
    });
  }
}

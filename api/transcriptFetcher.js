import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Robust YouTube Video ID extractor (handles watch, shorts, live, embed, youtu.be, query params)
 */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  const str = String(urlOrId).trim();
  if (/^[\w-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Decodes escaped XML / HTML entities
 */
export function decodeHtmlEntities(str) {
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
export function formatTimestamp(seconds) {
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
 * Parses XML & JSON transcript formats:
 * - JSON3 ({ events: [ { tStartMs, segs: [...] } ] })
 * - srv3 XML (<p t="ms" d="ms">...<s>...</s>...</p>)
 * - classic XML (<text start="sec" dur="sec">...</text>)
 */
export function parseTranscriptContent(rawContent, defaultLang = 'auto-detected') {
  if (!rawContent) return [];
  const str = typeof rawContent === 'string' ? rawContent.trim() : '';

  // 1. Try JSON3 format
  if (str.startsWith('{')) {
    try {
      const data = JSON.parse(str);
      if (Array.isArray(data.events)) {
        const results = [];
        for (const ev of data.events) {
          if (!ev.segs || !Array.isArray(ev.segs)) continue;
          const text = ev.segs.map(s => s.utf8 || '').join('').trim();
          if (text) {
            results.push({
              text: decodeHtmlEntities(text),
              offset: ev.tStartMs || 0,
              duration: ev.dDurationMs || 0,
              lang: defaultLang
            });
          }
        }
        if (results.length > 0) return results;
      }
    } catch (e) {
      // not valid JSON, proceed to XML parsing
    }
  }

  const results = [];

  // 2. Try srv3 format (<p t="ms" d="ms">)
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(str)) !== null) {
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

  // 3. Try classic format (<text start="s" dur="s">)
  const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  while ((match = textRegex.exec(str)) !== null) {
    const startSec = parseFloat(match[1]);
    const durSec = match[2] ? parseFloat(match[2]) : 0;
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ''));
    if (text) {
      results.push({
        text,
        offset: Math.round(startSec * 1000),
        duration: Math.round(durSec * 1000),
        lang: defaultLang
      });
    }
  }

  return results;
}

/**
 * Format raw transcript items into timeline paragraphs with timestamps
 */
export function formatTimelineParagraphs(items) {
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
 * Fetches video metadata via YouTube oEmbed
 */
export async function getYouTubeMetadata(urlOrId) {
  const videoId = extractYouTubeId(urlOrId);
  const targetUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : urlOrId;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || null,
        author: data.author_name || null,
        thumbnail: data.thumbnail_url || null
      };
    }
  } catch (e) {
    // Ignore fallback errors
  }
  return null;
}

/**
 * Multilingual YouTube transcript retriever using multi-layer extraction:
 * 1. InnerTube API (Android, iOS, Web, MWeb, TV)
 * 2. youtube-transcript NPM package (with language retry)
 * 3. YouTube timedtext direct endpoints
 * 4. HTML scraping for ytInitialPlayerResponse
 */
export async function fetchMultilingualTranscript(urlOrId, preferredLang = null) {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID');
  }

  // Shared cookies — CONSENT+SOCS bypasses YouTube's consent gate on cloud/Vercel IPs
  const YT_COOKIES = 'CONSENT=YES+cb.20210328-17-p0.en+FX+294; SOCS=CAESEwgDEgk2NjAzMTUyMjIaAmVuIAEaBgiA_LiaBg';

  // Pre-fetch metadata in parallel for richer returned details
  let metaPromise = getYouTubeMetadata(videoId).catch(() => null);

  // Layer 1: InnerTube API across diverse client configurations
  // NOTE: Clients ordered by reliability on cloud/server IPs (Vercel, etc.)
  // ANDROID_EMBEDDED_PLAYER and TVHTML5_SIMPLY_EMBEDDED_PLAYER bypass most bot-detection
  const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  const clients = [
    { name: 'ANDROID', version: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
    { name: 'ANDROID_EMBEDDED_PLAYER', version: '20.10.38', ua: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)' },
    { name: 'IOS', version: '19.45.4', ua: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X)' },
    { name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', version: '2.0', ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/5.0 TV Safari/538.1' },
    { name: 'WEB', version: '2.20240210.01.00', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
    { name: 'MWEB', version: '2.20240210.01.00', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' },
    { name: 'TVHTML5', version: '7.20240210.01.00', ua: 'Mozilla/5.0 (ChromiumStylePlatform; Linux) Cobalt/23.lts.4-gold (unlike Gecko) v8/8.8.278.14 gabi/1.0.0 TV' }
  ];

  let captionTracks = null;
  let videoDetails = null;

  for (const c of clients) {
    try {
      const resp = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': c.ua,
            'X-YouTube-Client-Name': '3',
            'X-YouTube-Client-Version': c.version,
            'Origin': 'https://www.youtube.com',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`,
            'Cookie': YT_COOKIES
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: c.name,
                clientVersion: c.version,
                hl: 'en',
                gl: 'US'
              }
            },
            videoId
          })
        }
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data?.videoDetails) {
        videoDetails = data.videoDetails;
      }
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
    // Rank tracks:
    // 1. Preferred language (if specified)
    // 2. Hindi if Hindi lecture
    // 3. English
    // 4. Any original / primary track
    const sortedTracks = [...captionTracks].sort((a, b) => {
      const aLang = (a.languageCode || '').toLowerCase();
      const bLang = (b.languageCode || '').toLowerCase();
      if (preferredLang) {
        const p = preferredLang.toLowerCase();
        if (aLang.startsWith(p)) return -1;
        if (bLang.startsWith(p)) return 1;
      }
      if (aLang.startsWith('hi')) return -1;
      if (bLang.startsWith('hi')) return 1;
      if (aLang.startsWith('en')) return -1;
      if (bLang.startsWith('en')) return 1;
      return 0;
    });

    for (const track of sortedTracks) {
      if (!track?.baseUrl) continue;
      try {
        const trackResp = await fetch(track.baseUrl);
        if (trackResp.ok) {
          const rawText = await trackResp.text();
          const items = parseTranscriptContent(rawText, track.languageCode);
          if (items.length > 0) {
            const formatted = formatTimelineParagraphs(items);
            if (formatted.length > 10) {
              const meta = await metaPromise;
              return {
                transcript: formatted,
                language: track.languageCode || 'auto-detected',
                title: videoDetails?.title || meta?.title || null,
                author: videoDetails?.author || meta?.author || null,
                hasTimestamps: true
              };
            }
          }
        }
      } catch (trackErr) {
        // try next candidate track
      }
    }
  }

  // Layer 2: youtube-transcript package fallback
  // Note: Don't pass `undefined` as second arg — call without arg for auto-detect
  try {
    const langCodes = preferredLang 
      ? [preferredLang, 'en', 'hi'] 
      : ['en', 'hi'];

    // Try auto-detect first (no lang specified)
    const autoAttempts = [
      YoutubeTranscript.fetchTranscript(videoId)
    ];
    // Then try specific languages
    const langAttempts = langCodes.map(lang => 
      YoutubeTranscript.fetchTranscript(videoId, { lang })
    );
    const allAttempts = [...autoAttempts, ...langAttempts];

    for (const attempt of allAttempts) {
      try {
        const rawItems = await attempt;
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const items = rawItems.map(item => ({
            text: decodeHtmlEntities(item.text),
            offset: item.offset || 0,
            duration: item.duration || 0,
            lang: item.lang || 'auto-detected'
          }));
          const formatted = formatTimelineParagraphs(items);
          if (formatted.length > 10) {
            const meta = await metaPromise;
            return {
              transcript: formatted,
              language: items[0]?.lang || 'auto-detected',
              title: videoDetails?.title || meta?.title || null,
              author: videoDetails?.author || meta?.author || null,
              hasTimestamps: true
            };
          }
        }
      } catch (innerErr) {
        // continue to next attempt
      }
    }
  } catch (ytErr) {
    console.warn('youtube-transcript fallback failed:', ytErr.message);
  }

  // Layer 3: Direct timedtext endpoint attempt
  try {
    const timedTextUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=hi&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=hi`
    ];

    for (const ttUrl of timedTextUrls) {
      try {
        const res = await fetch(ttUrl);
        if (res.ok) {
          const content = await res.text();
          const items = parseTranscriptContent(content);
          if (items.length > 0) {
            const formatted = formatTimelineParagraphs(items);
            if (formatted.length > 10) {
              const meta = await metaPromise;
              return {
                transcript: formatted,
                language: 'auto-detected',
                title: videoDetails?.title || meta?.title || null,
                author: videoDetails?.author || meta?.author || null,
                hasTimestamps: true
              };
            }
          }
        }
      } catch (e) {}
    }
  } catch (ttErr) {}

  // Layer 4: Web scraping player response fallback
  // IMPORTANT: Must include CONSENT/SOCS cookies — without them Vercel/cloud IPs
  // get a consent gate page instead of the actual YouTube page content.
  try {
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': YT_COOKIES
      }
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      // Try multiple regex patterns — YouTube page format varies by region/version
      const playerPatterns = [
        /var ytInitialPlayerResponse\s*=\s*({.+?});(?:var |\s*<\/script>)/s,
        /ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var |<\/script>|window\[)/s,
        /"playerResponse":({.+?}),"playerYtConfigData"/s
      ];
      let playerObj = null;
      for (const pattern of playerPatterns) {
        try {
          const m = html.match(pattern);
          if (m?.[1]) {
            playerObj = JSON.parse(m[1]);
            if (playerObj?.captions || playerObj?.videoDetails) break;
          }
        } catch (_) {}
      }
      if (playerObj) {
        const tracks = playerObj?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          for (const track of tracks) {
            if (!track?.baseUrl) continue;
            try {
              const xmlResp = await fetch(track.baseUrl, {
                headers: { 'Cookie': YT_COOKIES }
              });
              if (xmlResp.ok) {
                const xml = await xmlResp.text();
                const items = parseTranscriptContent(xml, track.languageCode);
                if (items.length > 0) {
                  const formatted = formatTimelineParagraphs(items);
                  const meta = await metaPromise;
                  return {
                    transcript: formatted,
                    language: track.languageCode || 'auto-detected',
                    title: playerObj?.videoDetails?.title || meta?.title || null,
                    author: playerObj?.videoDetails?.author || meta?.author || null,
                    hasTimestamps: true
                  };
                }
              }
            } catch (_trackErr) {}
          }
        }
      } else {
        console.warn('Layer 4: ytInitialPlayerResponse not found in page (consent gate or bot block active)');
      }
    } else {
      console.warn('Layer 4: YouTube page fetch returned status', pageResp.status);
    }
  } catch (pageErr) {
    console.warn('Layer 4 page scraping fallback failed:', pageErr.message);
  }

  // If completely failed, collect metadata and throw with context
  const meta = await metaPromise;
  const error = new Error('No transcripts or closed captions were found for this video on YouTube.');
  error.videoTitle = videoDetails?.title || meta?.title || null;
  error.author = videoDetails?.author || meta?.author || null;
  error.disabledCaptions = true;
  throw error;
}

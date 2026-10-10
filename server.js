import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
app.use(cors());
app.use(express.json());

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
 * Multilingual YouTube transcript retriever
 * Attempts to retrieve transcripts across prioritized language tracks:
 * 1. User preferred language (if provided)
 * 2. Hindi (hi, hi-IN, hi-Latn)
 * 3. English (en, en-US, en-IN, en-GB)
 * 4. Any default/auto-detected track available on the video
 */
async function fetchMultilingualTranscript(url, preferredLang = null) {
  const attempts = [];
  if (preferredLang) attempts.push(preferredLang);
  
  // Hindi & English variants
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
        const rawText = res.map(t => t.text).join(' ');
        const cleanedText = decodeHtmlEntities(rawText);
        if (cleanedText.length > 10) {
          return {
            transcript: cleanedText,
            language: lang || 'auto-detected'
          };
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No transcripts found for this video in any supported language.');
}

app.post('/api/transcript', async (req, res) => {
  try {
    const { url, lang } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await fetchMultilingualTranscript(url, lang);
    console.log(`Successfully fetched transcript for ${url} (Language: ${result.language}, Length: ${result.transcript.length})`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transcript:', error.message || error);
    res.status(500).json({ 
      error: 'Failed to extract transcript. Please make sure the video has captions enabled (Hindi, English, or any language). You can also upload a lecture file, audio, or paste text directly.' 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with multilingual transcript support (Hindi, English & auto-detect)`);
});

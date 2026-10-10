import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import { createClient } from '@supabase/supabase-js';

try {
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf-8').split('\n');
    lines.forEach(l => {
      const idx = l.indexOf('=');
      if (idx > 0 && !l.startsWith('#')) {
        const k = l.slice(0, idx).trim();
        const v = l.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (e) {}

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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
        // Group transcript items into timeline chunks with [MM:SS] timestamps
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
 * Fetches video metadata via YouTube oEmbed to identify title and creator
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'ClassMind Server' });
});

/**
 * Ensures user exists in Supabase auth.users and synchronizes to 'profiles' table
 */
app.post('/api/sync-profile', async (req, res) => {
  try {
    const { id, email, fullName, role = 'student' } = req.body;
    if (!email && !id) {
      return res.status(400).json({ error: 'Email or User ID is required' });
    }

    const effectiveEmail = (email || `${id}@classmind.ai`).toLowerCase().trim();
    const effectiveName = fullName || effectiveEmail.split('@')[0] || 'Student';

    // 1. Check if user already exists in auth.users
    let supaUserId = null;
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users?.find(u => 
      (effectiveEmail && u.email?.toLowerCase() === effectiveEmail) || 
      (id && u.id === id)
    );

    if (existing) {
      supaUserId = existing.id;
    } else {
      // Create user in auth.users via admin client
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: effectiveEmail,
        email_confirm: true,
        user_metadata: { full_name: effectiveName }
      });
      if (createErr) {
        console.warn('Admin createUser notice:', createErr.message);
        // Fallback: search again
        const retryList = await supabaseAdmin.auth.admin.listUsers();
        const found = retryList.data?.users?.find(u => u.email?.toLowerCase() === effectiveEmail);
        if (found) supaUserId = found.id;
      } else {
        supaUserId = created?.user?.id;
      }
    }

    if (!supaUserId) {
      return res.status(500).json({ error: 'Could not create or find auth user in Supabase' });
    }

    // 2. Upsert into profiles table with valid auth.users UUID
    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: supaUserId,
        email: effectiveEmail,
        full_name: effectiveName,
        role: role,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (profileErr) {
      console.error('Admin profile upsert error:', profileErr.message);
      return res.status(500).json({ error: profileErr.message });
    }

    console.log(`✅ Profile synchronized in Supabase profiles table for: ${effectiveEmail} (${supaUserId})`);
    return res.json({
      success: true,
      profile: profileData?.[0] || { id: supaUserId, email: effectiveEmail, full_name: effectiveName }
    });
  } catch (err) {
    console.error('Server sync-profile error:', err);
    return res.status(500).json({ error: err.message });
  }
});

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
    const meta = await getYouTubeMetadata(req.body.url);
    const videoTitle = meta?.title;
    const author = meta?.author;

    res.status(422).json({ 
      error: videoTitle 
        ? `The YouTube creator has disabled closed captions/subtitles on "${videoTitle}".`
        : 'Failed to extract transcript. Closed captions/subtitles are disabled on this video by the creator.',
      videoTitle,
      author,
      disabledCaptions: true
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with multilingual transcript support (Hindi, English & auto-detect)`);
});

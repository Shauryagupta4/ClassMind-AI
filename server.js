import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { fetchMultilingualTranscript, getYouTubeMetadata } from './api/transcriptFetcher.js';

// Resolve .env robustly
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'classmind-ai', '.env')
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      lines.forEach(l => {
        const idx = l.indexOf('=');
        if (idx > 0 && !l.startsWith('#')) {
          const k = l.slice(0, idx).trim();
          const v = l.slice(idx + 1).trim();
          if (k && !process.env[k]) process.env[k] = v;
        }
      });
      break;
    }
  }
} catch (e) {}

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || '';

const supabaseAdmin = (supabaseUrl && supabaseSecret) ? createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;

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

    if (!supabaseAdmin) {
      return res.status(200).json({
        success: true,
        message: 'Dev mode: Supabase Admin bypassed',
        profile: { id: id || 'local-user', email, full_name: fullName || 'Student' }
      });
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

app.all('/api/transcript', async (req, res) => {
  const url = req.body?.url || req.query?.url;
  const lang = req.body?.lang || req.query?.lang;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const result = await fetchMultilingualTranscript(url, lang);
    console.log(`Successfully fetched transcript for ${url} (Language: ${result.language}, Length: ${result.transcript.length})`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transcript:', error.message || error);
    const meta = await getYouTubeMetadata(url);
    const videoTitle = error.videoTitle || meta?.title;
    const author = error.author || meta?.author;

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

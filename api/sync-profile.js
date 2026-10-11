import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

// Admin client (bypasses RLS and manages auth.users)
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SECRET_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

// Anon client fallback
const supabaseAnon = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  } else if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString()); } catch (e) {}
  }

  try {
    const { id, email, fullName, role = 'student' } = body || {};
    if (!email && !id) {
      return res.status(400).json({ error: 'Email or User ID is required' });
    }

    const effectiveEmail = (email || `${id}@classmind.ai`).toLowerCase().trim();
    const effectiveName = fullName || effectiveEmail.split('@')[0] || 'Student';

    // Strategy A: If Admin client is available, verify in auth.users and upsert into profiles
    if (supabaseAdmin) {
      let supaUserId = null;
      try {
        const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (!listErr && listData?.users) {
          const existing = listData.users.find(u => 
            (effectiveEmail && u.email?.toLowerCase() === effectiveEmail) || 
            (id && u.id === id)
          );
          if (existing) {
            supaUserId = existing.id;
          }
        }
      } catch (listCatchErr) {
        console.warn('Error listing users:', listCatchErr.message);
      }

      // If not found, create user in auth.users
      if (!supaUserId) {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: effectiveEmail,
          email_confirm: true,
          user_metadata: { full_name: effectiveName }
        });

        if (createErr) {
          console.warn('Admin createUser notice:', createErr.message);
          const retryList = await supabaseAdmin.auth.admin.listUsers();
          const found = retryList.data?.users?.find(u => u.email?.toLowerCase() === effectiveEmail);
          if (found) supaUserId = found.id;
        } else {
          supaUserId = created?.user?.id;
        }
      }

      if (supaUserId) {
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

        if (!profileErr) {
          console.log(`✅ Profile synchronized in Supabase profiles table for: ${effectiveEmail} (${supaUserId})`);
          return res.status(200).json({
            success: true,
            profile: profileData?.[0] || { id: supaUserId, email: effectiveEmail, full_name: effectiveName }
          });
        }
      }
    }

    // Strategy B: Client upsert fallback with anon client
    const client = supabaseAdmin || supabaseAnon;
    if (client) {
      const { data: profileData, error: profileErr } = await client
        .from('profiles')
        .upsert({
          id: id,
          email: effectiveEmail,
          full_name: effectiveName,
          role: role,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select();

      if (!profileErr) {
        return res.status(200).json({
          success: true,
          profile: profileData?.[0] || { id, email: effectiveEmail, full_name: effectiveName }
        });
      }
    }

    return res.status(200).json({
      success: true,
      profile: { id, email: effectiveEmail, full_name: effectiveName, role }
    });
  } catch (err) {
    console.error('Serverless sync-profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}

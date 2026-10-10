import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://smqxscaimdyvalelrfdx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nnAPTpTI5QynT6C1APIptA_iltQtr91';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

function getStorageKeyForUser(user) {
  if (!user || !user.id) return null;
  const validUuid = ensureValidUuid(user.id);
  return `classmind_saved_lectures_${validUuid}`;
}

function getLocalLectures(user = null) {
  const key = getStorageKeyForUser(user);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalLectures(list, user = null) {
  const key = getStorageKeyForUser(user);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Converts any user ID string (Firebase, Demo, OAuth) into a valid RFC 4122 UUID for PostgreSQL
 */
export function ensureValidUuid(str) {
  if (!str) return null;
  // If already standard 8-4-4-4-12 UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  // Generate deterministic RFC 4122 compliant UUID hash from string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Creates or updates user profile in 'profiles' table
 */
export async function syncUserProfile(user) {
  if (!user || (!user.id && !user.email)) return null;
  const email = user.email || (user.phone ? `${user.phone.replace(/\D/g, '')}@classmind.ai` : null);
  const fullName = user.user_metadata?.full_name || user.displayName || email?.split('@')[0] || (user.phone ? `Phone User (${user.phone})` : 'Student');

  // 1. Primary: sync via backend endpoint with Supabase service credentials (creates user in auth.users + profiles)
  try {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const resp = await fetch(`${serverUrl}/api/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        email: email,
        fullName: fullName,
        role: 'student'
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.profile) {
        console.log('✅ User profile successfully synchronized to Supabase profiles table:', data.profile);
        if (data.profile.id) {
          user.supabase_id = data.profile.id;
          try {
            const currentCache = localStorage.getItem('classmind_active_user');
            if (currentCache) {
              const parsed = JSON.parse(currentCache);
              parsed.supabase_id = data.profile.id;
              localStorage.setItem('classmind_active_user', JSON.stringify(parsed));
            }
          } catch (e) {}
        }
        return data.profile;
      }
    }
  } catch (err) {
    console.warn('Backend sync-profile notice, falling back to direct client upsert:', err.message);
  }

  // 2. Direct client-side upsert fallback
  const validUuid = user.supabase_id || ensureValidUuid(user.id);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: validUuid,
        email: email || `${validUuid}@classmind.ai`,
        full_name: fullName,
        role: 'student',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (!error) {
      console.log('✅ User profile successfully synchronized to Supabase:', fullName);
      return data?.[0] || null;
    } else {
      console.warn('Direct profiles upsert notice:', error.message);
    }
  } catch (err) {
    // Graceful fallback
  }
  return null;
}

/**
 * Saves a lecture into normalized relational tables:
 * 1. 'lectures' (Core metadata)
 * 2. 'teacher_intents' (Pedagogical emotion & exam radar)
 * 3. 'lecture_sections' (Structured breakdown notes)
 * 4. 'quizzes' (Active recall quizzes)
 * 5. 'flashcards' (Cognitive 3D flashcards)
 */
export async function saveLecture(lectureData, user = null) {
  if (!lectureData || !lectureData.title) return null;

  const lectureId = lectureData.id || `lec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  lectureData.id = lectureId;
  const now = new Date().toISOString();

  // If user wasn't passed directly, resolve from active storage
  let activeUser = user;
  if (!activeUser || !activeUser.id) {
    try {
      const stored = localStorage.getItem('classmind_active_user') || localStorage.getItem('classmind_demo_user');
      if (stored) activeUser = JSON.parse(stored);
    } catch (e) {}
  }

  const validUserUuid = activeUser?.supabase_id || (activeUser?.id ? ensureValidUuid(activeUser.id) : null);
  const userEmail = activeUser?.email || (activeUser?.phone ? `${activeUser.phone}@classmind.ai` : 'student@classmind.ai');

  // Local snapshot object for immediate zero-latency client use
  const localSnapshot = {
    id: lectureId,
    user_id: validUserUuid,
    user_email: userEmail,
    title: lectureData.title,
    subject: lectureData.subject || 'General Academic',
    summary: lectureData.summary || '',
    exam_readiness_score: lectureData.teacherIntent?.examReadinessScore || 85,
    teacher_intent: lectureData.teacherIntent || null,
    sections: lectureData.sections || [],
    key_terms: lectureData.keyTerms || [],
    cached_quiz: lectureData.cachedQuiz || null,
    cached_flashcards: lectureData.cachedFlashcards || null,
    created_at: now
  };

  // Always update user-specific local cache first
  const localList = getLocalLectures(activeUser).filter(item => item.id !== lectureId);
  localList.unshift(localSnapshot);
  setLocalLectures(localList.slice(0, 30), activeUser);

  // Sync to normalized relational Supabase tables + core table
  try {
    // Table 1: lectures (Core Metadata + JSON documents for instant indexing)
    const { error: lectureError } = await supabase
      .from('lectures')
      .upsert({
        id: lectureId,
        user_id: validUserUuid,
        user_email: userEmail,
        title: localSnapshot.title,
        subject: localSnapshot.subject,
        summary: localSnapshot.summary,
        exam_readiness_score: localSnapshot.exam_readiness_score,
        teacher_intent: localSnapshot.teacher_intent,
        sections: localSnapshot.sections,
        key_terms: localSnapshot.key_terms,
        cached_quiz: localSnapshot.cached_quiz,
        cached_flashcards: localSnapshot.cached_flashcards,
        created_at: now
      });

    if (lectureError) {
      console.error("❌ Supabase table 'lectures' upsert error:", lectureError.message);
      return localSnapshot;
    }
    console.log("✅ Lecture successfully stored in Supabase 'lectures' table:", lectureId, "User:", validUserUuid);

    // Table 2: teacher_intents (Pedagogical Tone & Exam Probables)
    if (lectureData.teacherIntent) {
      const { error: intentError } = await supabase
        .from('teacher_intents')
        .upsert({
          id: `intent_${lectureId}`,
          lecture_id: lectureId,
          overall_tone: lectureData.teacherIntent.overallTone || 'Exam-Oriented',
          exam_readiness_score: lectureData.teacherIntent.examReadinessScore || 85,
          high_yield_topics: lectureData.teacherIntent.highYieldTopics || [],
          warning_traps: lectureData.teacherIntent.warningTraps || [],
          low_priority_topics: lectureData.teacherIntent.lowPriorityTopics || [],
          created_at: now
        });
      if (intentError) console.warn("Supabase teacher_intents notice:", intentError.message);
    }

    // Table 3: lecture_sections (Structured Notes)
    if (Array.isArray(lectureData.sections) && lectureData.sections.length > 0) {
      const sectionRows = lectureData.sections.map((s, idx) => ({
        id: `sec_${lectureId}_${idx}`,
        lecture_id: lectureId,
        heading: s.heading || `Section ${idx + 1}`,
        summary: s.summary || '',
        detailed_notes: s.notes || s.detailed_notes || (Array.isArray(s.points) ? s.points.join('\n') : ''),
        section_order: idx + 1,
        created_at: now
      }));
      const { error: secError } = await supabase.from('lecture_sections').upsert(sectionRows);
      if (secError) console.warn("Supabase lecture_sections notice:", secError.message);
    }

    // Table 4: quizzes (Active Recall Studio)
    if (lectureData.cachedQuiz) {
      const { error: quizError } = await supabase
        .from('quizzes')
        .upsert({
          id: `quiz_${lectureId}`,
          lecture_id: lectureId,
          questions: lectureData.cachedQuiz.questions || lectureData.cachedQuiz,
          created_at: now
        });
      if (quizError) console.warn("Supabase quizzes notice:", quizError.message);
    }

    // Table 5: flashcards (Cognitive Flashcard Decks)
    if (lectureData.cachedFlashcards) {
      const { error: fcError } = await supabase
        .from('flashcards')
        .upsert({
          id: `fc_${lectureId}`,
          lecture_id: lectureId,
          cards: lectureData.cachedFlashcards.flashcards || lectureData.cachedFlashcards,
          created_at: now
        });
      if (fcError) console.warn("Supabase flashcards notice:", fcError.message);
    }
  } catch (err) {
    console.error('Relational sync notice:', err.message);
  }

  return localSnapshot;
}

/**
 * Retrieves all saved lectures by querying relational tables (with fallback)
 */
export async function getUserLectures(user = null) {
  // If not logged in, resolve from active storage or return empty
  let activeUser = user;
  if (!activeUser || !activeUser.id) {
    try {
      const stored = localStorage.getItem('classmind_active_user') || localStorage.getItem('classmind_demo_user');
      if (stored) activeUser = JSON.parse(stored);
    } catch (e) {}
  }

  if (!activeUser || !activeUser.id) {
    return [];
  }

  const validUuid = activeUser?.supabase_id || ensureValidUuid(activeUser.id);
  const localList = getLocalLectures(activeUser);

  try {
    const { data, error } = await supabase
      .from('lectures')
      .select(`
        *,
        teacher_intents (*),
        lecture_sections (*),
        quizzes (*),
        flashcards (*)
      `)
      .eq('user_id', validUuid)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn("Supabase getUserLectures query notice:", error.message);
    }

    if (!error && Array.isArray(data) && data.length > 0) {
      // Format relational rows into Dashboard-ready lecture objects
      const cloudFormatted = data.map(item => {
        const intentRow = Array.isArray(item.teacher_intents) && item.teacher_intents.length > 0
          ? item.teacher_intents[0] 
          : (item.teacher_intent || null);
        const quizRow = Array.isArray(item.quizzes) && item.quizzes.length > 0 
          ? item.quizzes[0] 
          : (item.cached_quiz || null);
        const fcRow = Array.isArray(item.flashcards) && item.flashcards.length > 0 
          ? item.flashcards[0] 
          : (item.cached_flashcards || null);

        const sortedSections = Array.isArray(item.lecture_sections) && item.lecture_sections.length > 0
          ? [...item.lecture_sections].sort((a, b) => (a.section_order || 0) - (b.section_order || 0)).map(s => ({
              heading: s.heading,
              summary: s.summary,
              notes: s.detailed_notes
            }))
          : (Array.isArray(item.sections) ? item.sections : []);

        return {
          id: item.id,
          title: item.title,
          subject: item.subject,
          summary: item.summary,
          exam_readiness_score: item.exam_readiness_score,
          teacher_intent: intentRow?.overall_tone ? {
            overallTone: intentRow.overall_tone,
            examReadinessScore: intentRow.exam_readiness_score,
            highYieldTopics: intentRow.high_yield_topics,
            warningTraps: intentRow.warning_traps,
            lowPriorityTopics: intentRow.low_priority_topics
          } : (item.teacher_intent || null),
          sections: sortedSections,
          key_terms: item.key_terms || [],
          cached_quiz: quizRow?.questions ? { questions: quizRow.questions } : (item.cached_quiz || null),
          cached_flashcards: fcRow?.cards ? { flashcards: fcRow.cards } : (item.cached_flashcards || null),
          created_at: item.created_at
        };
      });

      // Merge cloud and local snapshot avoiding duplicates
      const map = new Map();
      cloudFormatted.forEach(c => map.set(c.id, c));
      localList.forEach(l => {
        if (!map.has(l.id)) map.set(l.id, l);
      });
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn("getUserLectures query error, falling back to local list:", err);
  }

  return localList;
}

/**
 * Deletes a lecture and its relational children (via cascade)
 */
export async function deleteLecture(lectureId, user = null) {
  // 1. Delete from user local cache
  const localList = getLocalLectures(user).filter(item => item.id !== lectureId);
  setLocalLectures(localList, user);

  // 2. Delete from Supabase
  try {
    await supabase.from('lectures').delete().eq('id', lectureId);
  } catch (e) {
    // Ignore error
  }
  return true;
}

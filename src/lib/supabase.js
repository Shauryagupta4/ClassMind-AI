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
  const validUuid = ensureValidUuid(user.id);
  const fullName = user.user_metadata?.full_name || user.displayName || user.email?.split('@')[0] || 'Student';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: validUuid,
        email: user.email || `${validUuid}@classmind.ai`,
        full_name: fullName,
        role: 'student',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('Profiles table sync notice:', error.message);
    } else {
      console.log('✅ User profile successfully synchronized to Supabase:', fullName);
    }
    return data?.[0] || null;
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
  const now = new Date().toISOString();
  const validUserUuid = user?.id ? ensureValidUuid(user.id) : null;

  // Local snapshot object for immediate zero-latency client use
  const localSnapshot = {
    id: lectureId,
    user_id: validUserUuid,
    user_email: user?.email || 'guest@classmind.ai',
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
  const localList = getLocalLectures(user).filter(item => item.id !== lectureId);
  localList.unshift(localSnapshot);
  setLocalLectures(localList.slice(0, 30), user);

  // Sync to normalized relational Supabase tables
  try {
    // Table 1: lectures (Core Metadata)
    const { error: lectureError } = await supabase
      .from('lectures')
      .upsert({
        id: lectureId,
        user_id: validUserUuid,
        title: localSnapshot.title,
        subject: localSnapshot.subject,
        summary: localSnapshot.summary,
        exam_readiness_score: localSnapshot.exam_readiness_score,
        created_at: now
      });

    if (lectureError) {
      console.warn("Table 'lectures' sync notice:", lectureError.message);
      return localSnapshot;
    }
    console.log("✅ Lecture successfully stored in Supabase 'lectures' table:", lectureId);

    // Table 2: teacher_intents (Pedagogical Tone & Exam Probables)
    if (lectureData.teacherIntent) {
      await supabase
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
        })
        .catch(() => {});
    }

    // Table 3: lecture_sections (Structured Notes)
    if (Array.isArray(lectureData.sections) && lectureData.sections.length > 0) {
      const sectionRows = lectureData.sections.map((s, idx) => ({
        id: `sec_${lectureId}_${idx}`,
        lecture_id: lectureId,
        heading: s.heading || `Section ${idx + 1}`,
        summary: s.summary || '',
        detailed_notes: s.notes || s.detailed_notes || '',
        section_order: idx + 1,
        created_at: now
      }));
      await supabase.from('lecture_sections').upsert(sectionRows).catch(() => {});
    }

    // Table 4: quizzes (Active Recall Studio)
    if (lectureData.cachedQuiz) {
      await supabase
        .from('quizzes')
        .upsert({
          id: `quiz_${lectureId}`,
          lecture_id: lectureId,
          questions: lectureData.cachedQuiz.questions || lectureData.cachedQuiz,
          created_at: now
        })
        .catch(() => {});
    }

    // Table 5: flashcards (Cognitive Flashcard Decks)
    if (lectureData.cachedFlashcards) {
      await supabase
        .from('flashcards')
        .upsert({
          id: `fc_${lectureId}`,
          lecture_id: lectureId,
          cards: lectureData.cachedFlashcards.flashcards || lectureData.cachedFlashcards,
          created_at: now
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('Relational sync notice:', err.message);
  }

  return localSnapshot;
}

/**
 * Retrieves all saved lectures by querying relational tables (with fallback)
 */
export async function getUserLectures(user = null) {
  // If not logged in, Revision Vault is strictly empty (0 lectures)
  if (!user || !user.id) {
    return [];
  }

  const validUuid = ensureValidUuid(user.id);
  const localList = getLocalLectures(user);

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
    if (!error && Array.isArray(data) && data.length > 0) {
      // Format relational rows into Dashboard-ready lecture objects
      const cloudFormatted = data.map(item => {
        const intentRow = Array.isArray(item.teacher_intents) ? item.teacher_intents[0] : item.teacher_intents;
        const quizRow = Array.isArray(item.quizzes) ? item.quizzes[0] : item.quizzes;
        const fcRow = Array.isArray(item.flashcards) ? item.flashcards[0] : item.flashcards;

        const sortedSections = Array.isArray(item.lecture_sections) 
          ? [...item.lecture_sections].sort((a, b) => (a.section_order || 0) - (b.section_order || 0)).map(s => ({
              heading: s.heading,
              summary: s.summary,
              notes: s.detailed_notes
            }))
          : [];

        return {
          id: item.id,
          title: item.title,
          subject: item.subject,
          summary: item.summary,
          exam_readiness_score: item.exam_readiness_score,
          teacher_intent: intentRow ? {
            overallTone: intentRow.overall_tone,
            examReadinessScore: intentRow.exam_readiness_score,
            highYieldTopics: intentRow.high_yield_topics,
            warningTraps: intentRow.warning_traps,
            lowPriorityTopics: intentRow.low_priority_topics
          } : null,
          sections: sortedSections,
          key_terms: [],
          cached_quiz: quizRow?.questions ? { questions: quizRow.questions } : null,
          cached_flashcards: fcRow?.cards ? { flashcards: fcRow.cards } : null,
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
    // If relational query has schema mismatch or table doesn't exist, local storage handles it
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

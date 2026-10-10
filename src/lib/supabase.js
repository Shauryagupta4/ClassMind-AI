import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://smqxscaimdyvalelrfdx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nnAPTpTI5QynT6C1APIptA_iltQtr91';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

const LOCAL_STORAGE_KEY = 'classmind_saved_lectures';

/**
 * Gets lectures from local cache
 */
function getLocalLectures() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves lectures to local cache
 */
function setLocalLectures(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Saves a lecture into Supabase (with resilient local storage backup)
 */
export async function saveLecture(lectureData, user = null) {
  if (!lectureData || !lectureData.title) return null;

  const id = lectureData.id || `lec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id,
    user_id: user?.id || null,
    user_email: user?.email || 'guest@classmind.ai',
    title: lectureData.title,
    subject: lectureData.subject || 'General Study',
    summary: lectureData.summary || '',
    exam_readiness_score: lectureData.teacherIntent?.examReadinessScore || 85,
    teacher_intent: lectureData.teacherIntent || null,
    sections: lectureData.sections || [],
    key_terms: lectureData.keyTerms || [],
    cached_quiz: lectureData.cachedQuiz || null,
    cached_flashcards: lectureData.cachedFlashcards || null,
    created_at: new Date().toISOString()
  };

  // 1. Always save to local cache for instant zero-latency retrieval
  const localList = getLocalLectures().filter(item => item.id !== id);
  localList.unshift(record);
  setLocalLectures(localList.slice(0, 30)); // keep last 30

  // 2. If Supabase is available, sync to cloud table
  try {
    const { data, error } = await supabase
      .from('lectures')
      .upsert({
        id,
        user_id: user?.id || null,
        user_email: user?.email || 'guest@classmind.ai',
        title: record.title,
        subject: record.subject,
        summary: record.summary,
        exam_readiness_score: record.exam_readiness_score,
        teacher_intent: record.teacher_intent,
        sections: record.sections,
        key_terms: record.key_terms,
        created_at: record.created_at
      })
      .select();

    if (error) {
      // Table may not exist yet in user's Supabase project, local storage gracefully protects it
      console.warn('Supabase lectures table sync notice:', error.message);
    } else {
      return data?.[0] || record;
    }
  } catch (err) {
    console.warn('Supabase sync network fallback:', err.message);
  }

  return record;
}

/**
 * Retrieves all saved lectures for the current user
 */
export async function getUserLectures(user = null) {
  const localList = getLocalLectures();

  // Try fetching from Supabase
  try {
    let query = supabase.from('lectures').select('*').order('created_at', { ascending: false }).limit(30);
    if (user?.id) {
      query = query.eq('user_id', user.id);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      // Merge cloud and local items avoiding duplicates
      const map = new Map();
      data.forEach(item => map.set(item.id, item));
      localList.forEach(item => {
        if (!map.has(item.id)) map.set(item.id, item);
      });
      return Array.from(map.values());
    }
  } catch (err) {
    // Graceful fallback to local cache
  }

  return localList;
}

/**
 * Deletes a saved lecture by ID
 */
export async function deleteLecture(lectureId, user = null) {
  // Delete from local
  const localList = getLocalLectures().filter(item => item.id !== lectureId);
  setLocalLectures(localList);

  // Delete from Supabase
  try {
    await supabase.from('lectures').delete().eq('id', lectureId);
  } catch (e) {
    // Ignore error
  }
  return true;
}

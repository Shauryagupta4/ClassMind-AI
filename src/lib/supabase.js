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

function getLocalLectures() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalLectures(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Creates or updates user profile in 'profiles' table
 */
export async function syncUserProfile(user) {
  if (!user || !user.id) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
        role: 'student',
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.warn('Profiles table sync notice:', error.message);
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

  // Local snapshot object for immediate zero-latency client use
  const localSnapshot = {
    id: lectureId,
    user_id: user?.id || null,
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

  // Always update local cache first
  const localList = getLocalLectures().filter(item => item.id !== lectureId);
  localList.unshift(localSnapshot);
  setLocalLectures(localList.slice(0, 30));

  // Sync to normalized relational Supabase tables
  try {
    // Table 1: lectures (Core Metadata)
    const { error: lectureError } = await supabase
      .from('lectures')
      .upsert({
        id: lectureId,
        user_id: user?.id || null,
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
  const localList = getLocalLectures();

  try {
    let query = supabase.from('lectures').select(`
      *,
      teacher_intents (*),
      lecture_sections (*),
      quizzes (*),
      flashcards (*)
    `).order('created_at', { ascending: false }).limit(30);

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
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
  // 1. Delete from local cache
  const localList = getLocalLectures().filter(item => item.id !== lectureId);
  setLocalLectures(localList);

  // 2. Delete from Supabase
  try {
    await supabase.from('lectures').delete().eq('id', lectureId);
  } catch (e) {
    // Ignore error
  }
  return true;
}

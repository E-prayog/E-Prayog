import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { quizData, QuizQuestion, CognitiveLevel } from '../data/quizData';
import { SUBJECTS } from '../constants';

export const LAB_ID_TO_QUIZ_KEY: Record<string, string> = {
  // Physics
  p1: 'vernierCalipers',
  p2: 'simplePendulum',
  p3: 'screwGauge',
  p4: 'ohmsLaw',
  p5: 'concaveMirror',
  p6: 'convexLens',
  p7: 'glassPrism',
  p8: 'sonometer',
  p9: 'metreBridge',
  p10: 'potentiometer',
  p11: 'zenerDiode',
  p12: 'hookesLaw',

  // Chemistry
  c1: 'acidBaseTitration',
  c2: 'kmno4Titration',
  c3: 'phOfSolutions',
  c4: 'saltAnalysis',
  c5: 'paperChromatography',
  c6: 'enthalpyNeutralisation',
  c7: 'rateOfReaction',
  c8: 'cationAnalysis',
  c9: 'anionAnalysis',
  c10: 'crystallisation',

  // Biology
  b1: 'mitosis',
  b2: 'stomata',
  b3: 'osmosis',
  b4: 'photosynthesis',
  b5: 'dnaIsolation',
  b6: 'benedictTest',
  b7: 'bloodGroup',
  b8: 'seedGermination',

  // Math
  m1: 'unitCircle',
  m2: 'binomialTheorem',
  m3: 'statistics',
  m4: 'matrixOperations',
  m5: 'probability',
  m6: 'conicSections',

  // CS
  cs1: 'bubbleSort',
  cs2: 'insertionSort',
  cs3: 'binarySearch',
  cs4: 'stackOperations',
  cs5: 'queueOperations',
  cs6: 'logicGates',
};

const LOCAL_STORAGE_PREFIX = 'eprayog_custom_quiz_';

/**
 * Get default hardcoded questions for a given lab ID.
 */
export const getDefaultQuizQuestions = (labId: string): QuizQuestion[] => {
  if (!labId) return [];
  const key = LAB_ID_TO_QUIZ_KEY[labId];
  if (key && quizData[key] && quizData[key].length > 0) {
    return JSON.parse(JSON.stringify(quizData[key]));
  }

  // Fallback to searching subject lab definitions if any
  for (const sub of SUBJECTS) {
    const lab = sub.labs.find((l) => l.id === labId);
    if (lab?.content?.quizQuestions && lab.content.quizQuestions.length > 0) {
      return lab.content.quizQuestions.map((q, idx) => ({
        id: `${labId}_q${idx + 1}`,
        question: q.question,
        options: (q.options.length === 4
          ? q.options
          : [...q.options, 'None of the above'].slice(0, 4)) as [string, string, string, string],
        correctAnswer: (q.correctIndex ?? 0) as 0 | 1 | 2 | 3,
        explanation: q.explanation || '',
        level: 'Cognitive' as CognitiveLevel,
      }));
    }
  }

  return [];
};

/**
 * Get cached custom questions from LocalStorage (synchronous fast fallback).
 */
export const getLocalCustomQuiz = (labId: string): QuizQuestion[] | null => {
  try {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${labId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`Failed to read local custom quiz for ${labId}:`, err);
  }
  return null;
};

/**
 * Subscribe in real-time to the quiz for a given lab.
 * Invokes callback with (questions, isCustom).
 */
export const subscribeToLabQuiz = (
  labId: string,
  callback: (questions: QuizQuestion[], isCustom: boolean) => void
): (() => void) => {
  if (!labId) {
    callback([], false);
    return () => {};
  }

  // Check local cache first
  const localCustom = getLocalCustomQuiz(labId);
  const defaultQuestions = getDefaultQuizQuestions(labId);

  if (localCustom) {
    callback(localCustom, true);
  } else {
    callback(defaultQuestions, false);
  }

  try {
    const quizDocRef = doc(db, 'customQuizzes', labId);
    const unsubscribe = onSnapshot(
      quizDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.questions)) {
            try {
              localStorage.setItem(
                `${LOCAL_STORAGE_PREFIX}${labId}`,
                JSON.stringify(data.questions)
              );
            } catch {}
            callback(data.questions, true);
            return;
          }
        }
        // No custom override in Firestore: remove local cache and emit defaults
        try {
          localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${labId}`);
        } catch {}
        callback(defaultQuestions, false);
      },
      (error) => {
        console.warn(`Firestore subscription failed for custom quiz ${labId}:`, error);
        // Fallback to local or default
        if (localCustom) {
          callback(localCustom, true);
        } else {
          callback(defaultQuestions, false);
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn(`Error setting up Firestore listener for ${labId}:`, err);
    return () => {};
  }
};

/**
 * Save custom questions for an experiment to Firestore and LocalStorage.
 */
export const saveCustomQuiz = async (
  labId: string,
  questions: QuizQuestion[],
  authorInfo?: { uid?: string; name?: string; email?: string }
): Promise<void> => {
  if (!labId) throw new Error('Lab ID is required');

  // Update localStorage immediately
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${labId}`, JSON.stringify(questions));
  } catch (err) {
    console.warn('Failed to save custom quiz to localStorage:', err);
  }

  // Update Firestore
  const quizDocRef = doc(db, 'customQuizzes', labId);
  await setDoc(quizDocRef, {
    labId,
    questions,
    totalQuestions: questions.length,
    updatedAt: new Date().toISOString(),
    updatedBy: authorInfo?.email || authorInfo?.name || authorInfo?.uid || 'Admin',
  });
};

/**
 * Reset a lab's quiz back to original defaults.
 * Removes the Firestore custom doc and localStorage cache.
 */
export const resetQuizToDefault = async (labId: string): Promise<void> => {
  if (!labId) throw new Error('Lab ID is required');

  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${labId}`);
  } catch (err) {
    console.warn('Failed to clear local custom quiz:', err);
  }

  try {
    const quizDocRef = doc(db, 'customQuizzes', labId);
    await deleteDoc(quizDocRef);
  } catch (err) {
    console.warn('Failed to delete custom quiz in Firestore:', err);
    throw err;
  }
};

/**
 * Subscribe to all custom quiz statuses (which labIds are customized).
 */
export const subscribeToCustomQuizList = (
  callback: (customLabIds: string[]) => void
): (() => void) => {
  try {
    const colRef = collection(db, 'customQuizzes');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const customIds = snapshot.docs.map((d) => d.id);
        callback(customIds);
      },
      (err) => {
        console.warn('Error subscribing to custom quizzes list:', err);
        callback([]);
      }
    );
  } catch (e) {
    console.warn('subscribeToCustomQuizList error:', e);
    callback([]);
    return () => {};
  }
};

import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { experimentVideos, SingleVideo } from '../data/experimentVideos';

const COLLECTION_NAME = 'experiment_videos';
const LOCAL_STORAGE_KEY = 'eprayog_custom_videos';

/**
 * Extracts a YouTube video ID from various URL formats or plain ID.
 * Returns 11-character video ID or null if invalid.
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regular YouTube URLs (watch?v=, embed/, v/, /shorts/)
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Get cached custom videos from localStorage for offline/instant access.
 */
function getCachedVideos(): Record<string, SingleVideo> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Set cached custom videos to localStorage.
 */
function setCachedVideos(videos: Record<string, SingleVideo>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(videos));
  } catch {
    // ignore storage quota issues
  }
}

/**
 * Get video for an experiment:
 * 1. Checks memory/localStorage custom videos.
 * 2. Checks static experimentVideos map.
 */
export function getVideoSync(labId: string, lang = 'en'): SingleVideo | null {
  const cached = getCachedVideos();
  if (cached[labId]) {
    return cached[labId];
  }

  const staticEntry = experimentVideos[labId];
  if (!staticEntry) return null;

  if ('videoId' in staticEntry) {
    return staticEntry.videoId ? staticEntry : null;
  }

  const langEntry = (staticEntry as any)[lang] || (staticEntry as any).en;
  if (langEntry && langEntry.videoId) {
    return langEntry;
  }

  return null;
}

/**
 * Fetch video from Firestore with fallback to cached/static.
 */
export async function getVideoForExperiment(labId: string): Promise<SingleVideo | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, labId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SingleVideo;
      if (data.videoId) {
        const cached = getCachedVideos();
        cached[labId] = data;
        setCachedVideos(cached);
        return data;
      }
    }
  } catch (err) {
    console.warn(`Firestore video lookup failed for ${labId}, using local fallback:`, err);
  }

  return getVideoSync(labId);
}

/**
 * Save or update experiment video in Firestore and local storage.
 * Only callable by Admin in UI.
 */
export async function saveExperimentVideo(
  labId: string,
  video: { videoId: string; title: string }
): Promise<void> {
  const cleanId = extractYouTubeId(video.videoId);
  if (!cleanId) {
    throw new Error('Invalid YouTube video ID or URL.');
  }

  const data: SingleVideo = {
    videoId: cleanId,
    title: video.title.trim() || `Experiment ${labId}`,
  };

  // 1. Update local cache immediately for zero latency
  const cached = getCachedVideos();
  cached[labId] = data;
  setCachedVideos(cached);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, labId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.error('Failed to save video to Firestore:', err);
    // Still saved to local cache
  }
}

/**
 * Remove an experiment video.
 */
export async function deleteExperimentVideo(labId: string): Promise<void> {
  const cached = getCachedVideos();
  delete cached[labId];
  setCachedVideos(cached);

  try {
    const docRef = doc(db, COLLECTION_NAME, labId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete video from Firestore:', err);
  }
}

/**
 * Subscribe to all custom videos from Firestore.
 */
export function subscribeToCustomVideos(
  callback: (videos: Record<string, SingleVideo>) => void
): () => void {
  // Fire initial cached version immediately
  callback(getCachedVideos());

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const result: Record<string, SingleVideo> = {};
        snapshot.forEach((d) => {
          const item = d.data() as SingleVideo;
          if (item && item.videoId) {
            result[d.id] = item;
          }
        });
        setCachedVideos(result);
        callback(result);
      },
      (err) => {
        console.warn('Custom videos subscription warning:', err);
        callback(getCachedVideos());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach snapshot listener for videos:', err);
    return () => {};
  }
}

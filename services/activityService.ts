import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type ActivityEventType =
  | 'user_signup'
  | 'user_login'
  | 'user_role_changed'
  | 'student_joined_class'
  | 'student_left_class'
  | 'quiz_completed'
  | 'lab_visited'
  | 'lab_completed'
  | 'teacher_code_generated'
  | 'admin_role_change'
  | 'new_teacher_registered'
  | 'platform_feedback'
  | 'custom_quiz_updated'
  | 'custom_quiz_reset';

export interface ActivityEvent {
  id?: string;
  type: ActivityEventType;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: string; // 'Student' | 'Teacher' | 'Admin'
  targetUid?: string;
  targetName?: string;
  metadata: Record<string, any>;
  timestamp?: string;
  read?: boolean;
  visibility: 'admin' | 'teacher' | 'both';
}

// Local rate limiter to prevent spamming
const activityLogCache: number[] = [];

export const logActivity = async (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'read'>) => {
  try {
    const now = Date.now();
    // Clean up cache (keep only last 60 seconds)
    while (activityLogCache.length > 0 && now - activityLogCache[0] > 60000) {
      activityLogCache.shift();
    }
    
    // Prevent more than 10 logs per minute from a single client session
    if (activityLogCache.length >= 10) {
      console.warn('Activity log rate limit exceeded. Ignoring.');
      return;
    }
    
    activityLogCache.push(now);

    const payload = {
      type: event.type,
      actorUid: event.actorUid,
      actorName: event.actorName,
      actorEmail: event.actorEmail,
      actorRole: event.actorRole,
      targetUid: event.targetUid || null,
      targetName: event.targetName || null,
      metadata: event.metadata,
      timestamp: new Date().toISOString(),
      read: false,
      visibility: event.visibility
    };

    // Write to both legacy and new collection names
    await Promise.all([
      addDoc(collection(db, 'activity_feed'), payload),
      addDoc(collection(db, 'activityFeed'), payload),
    ]);
  } catch (e) {
    console.warn('Activity log failed silently:', e);
  }
};

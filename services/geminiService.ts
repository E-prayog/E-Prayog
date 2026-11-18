import { auth } from './firebase';
import { getClientEnv } from './env';

export interface ChatSession {
  history: { role: string; text: string }[];
  contextString: string | null;
}

export function createChatSession(labContext?: string): ChatSession {
  return { history: [], contextString: labContext ?? null };
}

type TutorResponse = { text?: string; error?: string };

async function callTutorApi(message: string, session?: ChatSession): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in required');
  }
  const token = await user.getIdToken();
  const env = getClientEnv();
  const url = env.VITE_TUTOR_API_URL || '/api/tutor';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      labContext: session?.contextString || undefined,
      history: (session?.history || []).map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        text: h.text,
      })),
    }),
  });

  let data: TutorResponse = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || 'AI Tutor is unavailable');
  }
  return data.text || 'I could not generate a response. Please try again.';
}

export async function sendMessageToGemini(
  session: ChatSession,
  message: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  session.history.push({ role: 'user', text: message });
  try {
    const fullText = await callTutorApi(message, session);
    onChunk(fullText);
    session.history.push({ role: 'model', text: fullText });
  } catch (e) {
    session.history.pop();
    throw e;
  }
}

export async function askTutor(question: string, labContext?: string): Promise<string> {
  try {
    return await callTutorApi(question, createChatSession(labContext === 'General' ? undefined : labContext));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '';
    if (message.includes('429') || message.toLowerCase().includes('too many')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (message.toLowerCase().includes('sign in')) {
      return 'Please sign in to use AI Tutor.';
    }
    return 'AI Tutor is unavailable. Please try again.';
  }
}

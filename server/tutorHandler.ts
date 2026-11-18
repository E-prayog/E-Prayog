import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { allowedOrigins, firebaseWebApiKey, getServerEnv } from './env';

const SYSTEM_PROMPT = `You are E-Prayog AI Tutor — a friendly, expert science tutor built into the E-Prayog Virtual Science Lab platform for Karnataka PUC (Pre-University Course) students.

Your role:
- Help students understand Physics, Chemistry, Biology, Mathematics, and Computer Science experiments.
- Provide clear, step-by-step explanations aligned with the Karnataka PUC syllabus.
- When a student is inside a specific experiment, you will be provided context about that experiment (aim, theory, procedure, formulas, viva questions). Use this context to give highly relevant answers.
- Use simple language. Offer analogies and real-world examples familiar to Indian students.
- When asked about formulas, write them clearly. Use markdown formatting for emphasis.
- If asked about something outside science/academics, politely redirect.
- Be encouraging and patient. Use occasional Kannada phrases where appropriate.

Always respond in markdown format.`;

const historyItemSchema = z.object({
  role: z.enum(['user', 'model', 'assistant']),
  text: z.string().max(8000),
});

const tutorBodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  labContext: z.string().max(6000).optional(),
  history: z.array(historyItemSchema).max(24).optional(),
});

const AUTH_WINDOW_MS = 60_000;
const AUTH_LIMIT = 20;
const DAILY_LIMIT = 40;

type Bucket = { count: number; resetAt: number };
const authBuckets = new Map<string, Bucket>();
const dailyBuckets = new Map<string, Bucket>();

function takeToken(map: Map<string, Bucket>, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || now >= existing.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allow = allowedOrigins();
  const matched = origin && allow.includes(origin) ? origin : allow[0] || 'http://localhost:3000';
  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(status: number, body: Record<string, unknown>, origin?: string): TutorResult {
  return {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
    body: JSON.stringify(body),
  };
}

async function verifyIdToken(idToken: string): Promise<string | null> {
  const key = firebaseWebApiKey();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { users?: { localId?: string }[] };
  return data.users?.[0]?.localId || null;
}

export type TutorResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export async function handleTutorRequest(input: {
  method: string;
  origin?: string;
  authorization?: string;
  ip?: string;
  bodyText: string;
}): Promise<TutorResult> {
  const origin = input.origin;
  if (input.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders(origin), body: '' };
  }
  if (input.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, origin);
  }

  let env;
  try {
    env = getServerEnv();
  } catch {
    return json(503, { error: 'AI Tutor is unavailable' }, origin);
  }

  const token = input.authorization?.startsWith('Bearer ')
    ? input.authorization.slice(7).trim()
    : '';
  if (!token) {
    return json(401, { error: 'Sign in required' }, origin);
  }

  let uid: string | null = null;
  try {
    uid = await verifyIdToken(token);
  } catch {
    uid = null;
  }
  if (!uid) {
    return json(401, { error: 'Sign in required' }, origin);
  }

  const ip = input.ip || 'unknown';
  if (!takeToken(authBuckets, uid, AUTH_LIMIT, AUTH_WINDOW_MS)) {
    return json(429, { error: 'Too many requests. Please wait and try again.' }, origin);
  }
  if (!takeToken(authBuckets, `ip:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS)) {
    return json(429, { error: 'Too many requests. Please wait and try again.' }, origin);
  }
  const dayKey = `${uid}:${new Date().toISOString().slice(0, 10)}`;
  if (!takeToken(dailyBuckets, dayKey, DAILY_LIMIT, 86_400_000)) {
    return json(429, { error: 'Daily tutor limit reached. Try again tomorrow.' }, origin);
  }

  let parsedBody: z.infer<typeof tutorBodySchema>;
  try {
    const raw = input.bodyText ? JSON.parse(input.bodyText) : {};
    parsedBody = tutorBodySchema.parse(raw);
  } catch {
    return json(400, { error: 'Invalid request' }, origin);
  }

  let systemPrompt = SYSTEM_PROMPT;
  if (parsedBody.labContext) {
    systemPrompt += `\n\n--- CURRENT EXPERIMENT CONTEXT ---\n${parsedBody.labContext}\n--- END CONTEXT ---\n`;
  }

  const historyText = (parsedBody.history || [])
    .map((h) => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.text}`)
    .join('\n');
  const fullPrompt = historyText
    ? `${historyText}\nStudent: ${parsedBody.message}`
    : parsedBody.message;

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    const text = response.text?.trim() || 'I could not generate a response. Please try again.';
    return json(200, { text }, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('429')) {
      return json(429, { error: 'Too many requests. Please wait and try again.' }, origin);
    }
    console.error('[tutor] upstream error');
    return json(502, { error: 'AI Tutor is unavailable' }, origin);
  }
}

export function readNodeBody(req: { on: Function }): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

import { z } from 'zod';

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(8, 'GEMINI_API_KEY is required'),
  FIREBASE_WEB_API_KEY: z.string().min(8).optional(),
  VITE_FIREBASE_API_KEY: z.string().min(8).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** Validates server env. Never logs values. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FIREBASE_WEB_API_KEY: process.env.FIREBASE_WEB_API_KEY,
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid server environment (${fields})`);
  }
  const firebaseKey = parsed.data.FIREBASE_WEB_API_KEY || parsed.data.VITE_FIREBASE_API_KEY;
  if (!firebaseKey) {
    throw new Error('Invalid server environment (FIREBASE_WEB_API_KEY)');
  }
  cached = parsed.data;
  return cached;
}

export function firebaseWebApiKey(): string {
  const env = getServerEnv();
  return env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || '';
}

export function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,https://e-prayog09.netlify.app';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

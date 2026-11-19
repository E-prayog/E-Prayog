import { z } from 'zod';

const clientEnvSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(8),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(3),
  VITE_FIREBASE_PROJECT_ID: z.string().min(3),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(3),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().min(3),
  VITE_FIREBASE_APP_ID: z.string().min(8),
  VITE_TUTOR_API_URL: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

let cached: ClientEnv | null = null;

/** Validates public Vite env. Never logs values. Fails fast if Firebase config is missing. */
export function getClientEnv(): ClientEnv {
  if (cached) return cached;
  const parsed = clientEnvSchema.safeParse({
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_TUTOR_API_URL: import.meta.env.VITE_TUTOR_API_URL,
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`[E-Prayog] Missing or invalid environment: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

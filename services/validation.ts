import { z } from 'zod';

export const feedbackSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  role: z.enum(['Student', 'Teacher', 'Admin']).or(z.string().max(32)),
  category: z.enum(['general', 'bug', 'content', 'suggestion']),
  message: z.string().trim().min(20).max(4000),
  rating: z.number().int().min(1).max(5),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  full_name: z.string().trim().min(1).max(120).optional(),
  grade: z.string().trim().max(80).optional(),
  syllabus: z.string().trim().max(80).optional(),
  institution: z.string().trim().max(160).optional(),
  language: z.string().trim().max(40).optional(),
  avatar: z.string().trim().max(80).optional(),
  photoURL: z.string().url().max(2000).optional(),
  notes: z.string().max(8000).optional(),
}).strict();

export const teacherCodeSchema = z.string().trim().regex(/^[A-Z0-9]{6}$/, 'Teacher code must be 6 uppercase alphanumeric characters');

export const labIdSchema = z.string().trim().regex(
  /^(p([1-9]|1[0-2])|c([1-9]|10)|b[1-8]|m[1-6]|cs[1-6])$/,
  'Invalid lab ID. Expected format: p1-p12, c1-c10, b1-b8, m1-m6, or cs1-cs6'
);

export const loginIdSchema = z.string().trim().min(3).max(200);

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function assertSafeImageFile(file: File): void {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, or WebP images are allowed.');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Image must be 2 MB or smaller.');
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

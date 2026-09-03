import { z } from 'zod';
import { AppError } from './errors';

const ALLOWED_HOSTS = [
  'animasu.love',
  'www.animasu.love',
  'www.sankavollerei.web.id',
  'sankavollerei.web.id',
  'v2.samehadaku.how',
  'samehadaku.how',
  'www.blogger.com',
  'blogger.com',
];

export const slugSchema = z
  .string()
  .min(1, 'Slug cannot be empty')
  .max(150, 'Slug is too long')
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Slug contains invalid characters');

export const searchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(100, 'Search query is too long')
  .transform((val) => val.trim());

export const pageSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val) return 1;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, 100);
  });

export function validateAllowedUrl(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      throw new AppError(
        'INVALID_INPUT',
        `Access to external domain ${parsed.hostname} is prohibited.`,
        400,
      );
    }
    return parsed.toString();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('INVALID_INPUT', 'Invalid URL provided', 400);
  }
}

export function sanitizeSlug(slug: string): string {
  const result = slugSchema.safeParse(slug);
  if (!result.success) {
    throw new AppError('INVALID_INPUT', result.error.errors[0]?.message || 'Invalid slug', 400);
  }
  return result.data;
}

export function sanitizeQuery(query: string): string {
  const result = searchQuerySchema.safeParse(query);
  if (!result.success) {
    throw new AppError('INVALID_INPUT', result.error.errors[0]?.message || 'Invalid query', 400);
  }
  return result.data;
}

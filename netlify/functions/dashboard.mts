import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Config, Context } from '@netlify/functions';
import { validSession } from '../lib/access.mjs';

export default async (request: Request, context: Context) => {
  const headers = {
    'Cache-Control': 'private, no-store',
    'Netlify-CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers });
  try {
    if (!await validSession(context)) return new Response(null, { status: 303, headers: { ...headers, Location: '/' } });
    const html = await readFile(join(process.cwd(), 'private/dashboard.html'), 'utf8');
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return new Response('Access service unavailable. Please try again later.', { status: 503, headers });
  }
};

export const config: Config = { path: ['/dashboard', '/dashboard/'] };

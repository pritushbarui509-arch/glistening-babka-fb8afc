import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import type { Context } from '@netlify/functions';
import { database } from '../../db/index.js';
import { accessAttempts, accessKeys, accessSessions } from '../../db/schema.js';

export function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashKey(key: string, salt = randomBytes(16).toString('hex')) {
  const derived = await promisify(scrypt)(key, salt, 64) as Buffer;
  return `${salt}.${derived.toString('hex')}`;
}

export async function matchesKey(key: string, stored: string) {
  const [salt, expected] = stored.split('.');
  if (!/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false;
  const candidate = (await hashKey(key, salt)).split('.')[1];
  return timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expected, 'hex'));
}

export function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'Netlify-CDN-Cache-Control': 'no-store' },
  });
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid input');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid input');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new Error('Invalid input');
    }
    chunks.push(chunk.value);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid input');
  return body;
}

export async function allowAttempt(context: Context) {
  const now = Date.now();
  const bucket = Math.floor(now / 300000);
  const id = digest(`${context.site.id}:${context.ip}:${bucket}`);
  const db = database();
  const [attempt] = await db.insert(accessAttempts).values({
    id, count: 1, expiresAt: new Date(now + 600000),
  }).onConflictDoUpdate({
    target: accessAttempts.id,
    set: { count: sql`${accessAttempts.count} + 1` },
  }).returning({ count: accessAttempts.count });
  await db.delete(accessAttempts).where(lt(accessAttempts.expiresAt, new Date(now)));
  return attempt.count <= 10;
}

export async function validSession(context: Context) {
  const token = context.cookies.get('vip_session');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const [session] = await database().select({ tokenHash: accessSessions.tokenHash })
    .from(accessSessions).innerJoin(accessKeys, eq(accessSessions.keyVersion, accessKeys.version))
    .where(and(eq(accessKeys.id, 'dashboard'), eq(accessSessions.tokenHash, digest(token)),
      gt(accessSessions.expiresAt, new Date()))).limit(1);
  return Boolean(session);
}

export async function createSession(context: Context, request: Request, keyVersion: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const db = database();
  const previous = context.cookies.get('vip_session');
  if (previous) await db.delete(accessSessions).where(eq(accessSessions.tokenHash, digest(previous)));
  await db.delete(accessSessions).where(lt(accessSessions.expiresAt, new Date()));
  await db.insert(accessSessions).values({ tokenHash: digest(token), keyVersion, expiresAt });
  context.cookies.set({
    name: 'vip_session', value: token, path: '/', httpOnly: true,
    secure: new URL(request.url).protocol === 'https:', sameSite: 'Strict', expires: expiresAt,
  });
}

export async function removeSession(context: Context) {
  const token = context.cookies.get('vip_session');
  if (token) await database().delete(accessSessions).where(eq(accessSessions.tokenHash, digest(token)));
  context.cookies.set({ name: 'vip_session', value: '', path: '/', httpOnly: true, sameSite: 'Strict', expires: new Date(0) });
}

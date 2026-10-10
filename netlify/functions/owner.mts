import { randomUUID } from 'node:crypto';
import { getUser, login, logout, verifyRequestOrigin } from '@netlify/identity';
import { eq } from 'drizzle-orm';
import type { Config, Context } from '@netlify/functions';
import { database } from '../../db/index.js';
import { accessKeys } from '../../db/schema.js';
import { allowAttempt, hashKey, jsonBody, response } from '../lib/access.mjs';

export default async (request: Request, context: Context) => {
  const action = new URL(request.url).pathname;
  try {
    if (request.method !== 'POST' && !(request.method === 'GET' && action === '/api/owner/status')) {
      return response({ error: 'Method not allowed.' }, 405);
    }
    if (request.method === 'POST') {
      try { verifyRequestOrigin(request); } catch { return response({ error: 'Request not allowed.' }, 403); }
    }
    if (action === '/api/owner/logout') {
      await logout();
      return response({ success: true });
    }
    if (action === '/api/owner/login' || action === '/api/owner/invite') {
      if (!await allowAttempt(context)) return response({ error: 'Too many attempts. Try again in 5 minutes.' }, 429);
      let body;
      try { body = await jsonBody(request); } catch { return response({ error: 'Invalid input.' }, 400); }
      if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 256) {
        return response({ error: 'Enter a password of 8–256 characters.' }, 400);
      }
      let user;
      try {
        if (action === '/api/owner/invite') {
          if (typeof body.token !== 'string' || body.token.length > 1024) return response({ error: 'Invalid invitation.' }, 400);
          const verification = await fetch(new URL('/.netlify/identity/verify', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'invite', token: body.token, password: body.password }),
            signal: AbortSignal.timeout(10000),
          });
          if (!verification.ok) return response({ error: 'Unable to accept this invitation.' }, 401);
          const verified = await verification.json();
          const email = verified.user?.email ?? verified.email;
          if (typeof email !== 'string') return response({ error: 'Invitation accepted. Sign in with your owner email and new password.' }, 401);
          user = await login(email, body.password);
        } else {
          if (typeof body.email !== 'string' || body.email.length > 254) return response({ error: 'Enter your email.' }, 400);
          user = await login(body.email, body.password);
        }
      } catch { return response({ error: 'Unable to sign in. Check your credentials or invitation.' }, 401); }
      if (!user.roles?.includes('admin')) {
        await logout();
        return response({ error: 'Only an owner with the admin role can manage access.' }, 403);
      }
      return response({ authorized: true });
    }
    const user = await getUser();
    if (!user?.roles?.includes('admin')) return response({ error: 'Owner login required.' }, 403);
    const db = database();
    if (action === '/api/owner/status') {
      const [key] = await db.select({ updatedAt: accessKeys.updatedAt }).from(accessKeys)
        .where(eq(accessKeys.id, 'dashboard')).limit(1);
      return response({ authorized: true, configured: Boolean(key), updatedAt: key?.updatedAt });
    }
    if (action === '/api/owner/key') {
      let body;
      try { body = await jsonBody(request); } catch { return response({ error: 'Invalid input.' }, 400); }
      if (typeof body.key !== 'string' || body.key.length < 16 || body.key.length > 256 || body.key.trim() !== body.key) {
        return response({ error: 'Use 16–256 characters without spaces at either end.' }, 400);
      }
      const keyHash = await hashKey(body.key);
      const version = randomUUID();
      const updatedAt = new Date();
      await db.insert(accessKeys).values({ id: 'dashboard', keyHash, version, updatedAt })
        .onConflictDoUpdate({ target: accessKeys.id, set: { keyHash, version, updatedAt } });
      return response({ success: true });
    }
    if (action === '/api/owner/revoke') {
      await db.delete(accessKeys).where(eq(accessKeys.id, 'dashboard'));
      return response({ success: true });
    }
    return response({ error: 'Not found.' }, 404);
  } catch {
    return response({ error: 'Service unavailable. Please try again later.' }, 503);
  }
};

export const config: Config = {
  path: ['/api/owner/login', '/api/owner/invite', '/api/owner/logout', '/api/owner/status', '/api/owner/key', '/api/owner/revoke'],
};

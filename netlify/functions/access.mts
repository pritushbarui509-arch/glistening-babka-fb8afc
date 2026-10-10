import { verifyRequestOrigin } from '@netlify/identity';
import { eq } from 'drizzle-orm';
import type { Config, Context } from '@netlify/functions';
import { database } from '../../db/index.js';
import { accessKeys } from '../../db/schema.js';
import { allowAttempt, createSession, jsonBody, matchesKey, removeSession, response, validSession } from '../lib/access.mjs';

export default async (request: Request, context: Context) => {
  const action = new URL(request.url).pathname;
  try {
    if (action === '/api/access/session' && request.method === 'GET') {
      return response({ unlocked: await validSession(context) });
    }
    if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
    try { verifyRequestOrigin(request); } catch { return response({ error: 'Request not allowed.' }, 403); }
    if (action === '/api/access/logout') {
      await removeSession(context);
      return new Response(null, { status: 303, headers: { Location: '/', 'Cache-Control': 'no-store' } });
    }
    if (action !== '/api/access/unlock') return response({ error: 'Not found.' }, 404);
    if (!await allowAttempt(context)) return response({ error: 'Bahut saare attempts. 5 minute baad try karein.' }, 429);
    let body;
    try { body = await jsonBody(request); } catch { return response({ error: 'Valid key enter karein.' }, 400); }
    if (typeof body.key !== 'string' || body.key.length < 16 || body.key.length > 256) {
      return response({ error: 'Key sahi nahi hai. Owner se valid key lein.' }, 401);
    }
    const [configured] = await database().select().from(accessKeys).where(eq(accessKeys.id, 'dashboard')).limit(1);
    if (!configured) return response({ error: 'Access abhi ready nahi hai. Owner ko key set karni hogi.' }, 503);
    if (!await matchesKey(body.key, configured.keyHash)) {
      return response({ error: 'Key sahi nahi hai. Owner se valid key lein.' }, 401);
    }
    await createSession(context, request, configured.version);
    return response({ unlocked: true });
  } catch {
    return response({ error: 'Access service abhi available nahi hai. Thodi der baad try karein.' }, 503);
  }
};

export const config: Config = {
  path: ['/api/access/unlock', '/api/access/logout', '/api/access/session'],
};

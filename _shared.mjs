import { createClient } from '@supabase/supabase-js';

export function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(payload)
  };
}

export function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server database configuration is missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function parseBody(event) {
  if (!event.body || event.body.length > 20000) throw new Error('Invalid request body');
  let data;
  try { data = JSON.parse(event.body); } catch { throw new Error('Invalid JSON'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid request');
  return data;
}

export function text(value, max, required = false) {
  if (typeof value !== 'string') {
    if (required) throw new Error('Please complete all required fields');
    return '';
  }
  const v = value.trim();
  if (required && !v) throw new Error('Please complete all required fields');
  if (v.length > max) throw new Error('One of the fields is too long');
  return v;
}

export async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error('Spam protection is not configured yet');
  if (typeof token !== 'string' || token.length < 10 || token.length > 4096) throw new Error('Please complete the anti-spam check');
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
  });
  if (!response.ok) throw new Error('Spam protection could not be verified');
  const result = await response.json();
  if (!result.success) throw new Error('Anti-spam verification failed. Please try again.');
  const allowedHosts = (process.env.TURNSTILE_ALLOWED_HOSTS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (allowedHosts.length && result.hostname && !allowedHosts.includes(result.hostname)) throw new Error('Request host is not authorised');
}

export function clientIp(event) {
  // Netlify provides this header; used only for Turnstile verification, not stored in member records.
  return event.headers?.['x-nf-client-connection-ip'] || '';
}

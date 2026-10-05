const encoder = new TextEncoder();

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function getSigningKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return null;

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createAdminSession() {
  const key = await getSigningKey();
  if (!key) throw new Error('ADMIN_PASSWORD is not configured');

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const payload = `v1.${expiresAt}.${encodeBase64Url(nonce)}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function isValidAdminSession(token) {
  if (typeof token !== 'string') return false;

  const [version, expiresAtText, nonce, signature, extra] = token.split('.');
  if (version !== 'v1' || !expiresAtText || !nonce || !signature || extra !== undefined) return false;

  const expiresAt = Number(expiresAtText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + ADMIN_SESSION_TTL_SECONDS) {
    return false;
  }

  try {
    const key = await getSigningKey();
    if (!key) return false;
    const payload = `v1.${expiresAtText}.${nonce}`;
    return await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

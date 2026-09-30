import crypto from 'crypto';

const SCOPES = 'openid profile email User.Read';

export const OAUTH_COOKIE = {
  state: 'ms_oauth_state',
  verifier: 'ms_oauth_verifier',
  redirect: 'ms_oauth_redirect',
};

export const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 600,
  path: '/',
};

export function getAllowedEmailDomain() {
  return (process.env.MICROSOFT_ALLOWED_DOMAIN || 'thinknet.co.th').toLowerCase().replace(/^@/, '');
}

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

export function isAllowedEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return false;
  const parts = normalized.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  return parts[1] === getAllowedEmailDomain();
}

export function callbackRedirectUri(request, storedRedirect) {
  if (storedRedirect) return storedRedirect;
  if (request) return `${new URL(request.url).origin}/api/auth/microsoft/callback`;
  return process.env.MICROSOFT_REDIRECT_URI || null;
}

export function getMicrosoftConfig(request, storedRedirect) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const redirectUri = callbackRedirectUri(request, storedRedirect);
  if (!clientId || !clientSecret || !tenantId || !redirectUri) return null;
  return { clientId, clientSecret, tenantId, redirectUri };
}

export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateState() {
  return crypto.randomBytes(16).toString('base64url');
}

export function codeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function buildAuthorizeUrl({ state, challenge, config }) {
  const url = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function exchangeCodeForTokens(code, verifier, config) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || 'token_exchange_failed');
    err.code = 'oauth';
    throw err;
  }
  return data;
}

export async function fetchGraphProfile(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('graph_failed');
    err.code = 'oauth';
    throw err;
  }
  return data;
}

export function resolveWorkEmail(profile) {
  const candidates = [profile.mail, profile.userPrincipalName]
    .map(normalizeEmail)
    .filter(Boolean);
  return candidates.find(isAllowedEmail) || null;
}

export function nameFromProfile(profile, email) {
  let first = (profile.givenName || '').trim();
  let last = (profile.surname || '').trim();
  if (!first || !last) {
    const display = (profile.displayName || '').trim();
    if (display) {
      const parts = display.split(/\s+/);
      if (!first) first = parts[0] || '';
      if (!last) last = parts.slice(1).join(' ') || '';
    }
  }
  const fallback = email.split('@')[0];
  return {
    first_name: first || fallback,
    last_name: last || '-',
  };
}

export function usernameFromEmail(email) {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return local || 'user';
}

import { NextResponse } from 'next/server';
import { setSessionCookieOnResponse } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import {
  exchangeCodeForTokens,
  fetchGraphProfile,
  getMicrosoftConfig,
  nameFromProfile,
  OAUTH_COOKIE,
  resolveWorkEmail,
  usernameFromEmail,
} from '@/lib/microsoft-auth';

export async function GET(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const errorParam = url.searchParams.get('error');
  console.log('===errorParam', errorParam);
  if (errorParam === 'access_denied') {
    return loginError(origin, 'denied');
  }
  if (errorParam) {
    return loginError(origin, 'oauth');
  }


  console.log('===url.searchParams.', url.searchParams);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = request.cookies.get(OAUTH_COOKIE.state)?.value;
  const verifier = request.cookies.get(OAUTH_COOKIE.verifier)?.value;
  const storedRedirect = request.cookies.get(OAUTH_COOKIE.redirect)?.value;

  if (!code || !state || !storedState || !verifier || state !== storedState) {
    return loginError(origin, 'state');
  }

  const config = getMicrosoftConfig(request, storedRedirect);
  if (!config) {
    return loginError(origin, 'config');
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier, config);
    const profile = await fetchGraphProfile(tokens.access_token);
    const email = resolveWorkEmail(profile);
    if (!email) {
      return loginError(origin, 'domain');
    }

    const oid = profile.id;
    if (!oid) {
      return loginError(origin, 'oauth');
    }

    const member = await findOrProvisionMember(profile, email, oid);
    const res = NextResponse.redirect(new URL('/login?ms=1', origin));
    setSessionCookieOnResponse(res, member.id, member.role);
    clearOauthCookies(res);
    return res;
  } catch (err) {
    console.error('[Auth] Microsoft callback error:', err);
    return loginError(origin, 'oauth');
  }
}

function loginError(origin, code) {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
  clearOauthCookies(res);
  return res;
}

function clearOauthCookies(res) {
  res.cookies.set(OAUTH_COOKIE.state, '', { httpOnly: true, maxAge: 0, path: '/' });
  res.cookies.set(OAUTH_COOKIE.verifier, '', { httpOnly: true, maxAge: 0, path: '/' });
  res.cookies.set(OAUTH_COOKIE.redirect, '', { httpOnly: true, maxAge: 0, path: '/' });
}

async function findOrProvisionMember(profile, email, oid) {
  const byOid = await pool.query(
    'SELECT id, prefix, first_name, last_name, nickname, team, username, role, email, microsoft_oid FROM members WHERE microsoft_oid = $1',
    [oid]
  );
  let member = byOid.rows[0];

  if (member) {
    if (member.email !== email) {
      const taken = await pool.query(
        'SELECT id FROM members WHERE email = $1 AND id <> $2',
        [email, member.id]
      );
      if (!taken.rows[0]) {
        await pool.query(
          'UPDATE members SET email = $1, updated_at = NOW() WHERE id = $2',
          [email, member.id]
        );
        member.email = email;
      }
    }
    return member;
  }

  const byEmail = await pool.query(
    'SELECT id, prefix, first_name, last_name, nickname, team, username, role, email, microsoft_oid FROM members WHERE email = $1',
    [email]
  );
  member = byEmail.rows[0];
  if (member) {
    await pool.query(
      'UPDATE members SET microsoft_oid = $1, email = $2, updated_at = NOW() WHERE id = $3',
      [oid, email, member.id]
    );
    member.microsoft_oid = oid;
    member.email = email;
    return member;
  }

  const username = await uniqueUsername(email);
  const { first_name, last_name } = nameFromProfile(profile, email);
  const inserted = await pool.query(
    `INSERT INTO members (first_name, last_name, username, email, microsoft_oid, role, password_hash)
     VALUES ($1, $2, $3, $4, $5, 'user', NULL)
     RETURNING id, prefix, first_name, last_name, nickname, team, username, role, email, microsoft_oid`,
    [first_name, last_name, username, email, oid]
  );
  return inserted.rows[0];
}

async function uniqueUsername(email) {
  const base = usernameFromEmail(email);
  let username = base;
  let n = 0;
  while (n < 1000) {
    const existing = await pool.query('SELECT id FROM members WHERE username = $1', [username]);
    if (!existing.rows[0]) return username;
    n += 1;
    username = `${base}${n}`;
  }
  return `${base}-${Date.now()}`;
}

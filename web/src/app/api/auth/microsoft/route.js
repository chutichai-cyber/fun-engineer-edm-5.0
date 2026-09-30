import { NextResponse } from 'next/server';
import {
  buildAuthorizeUrl,
  codeChallenge,
  generateCodeVerifier,
  generateState,
  getMicrosoftConfig,
  OAUTH_COOKIE,
  oauthCookieOptions,
} from '@/lib/microsoft-auth';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const config = getMicrosoftConfig(request);
  if (!config) {
    return NextResponse.redirect(new URL('/login?error=config', origin));
  }

  const state = generateState();
  const verifier = generateCodeVerifier();
  const authorizeUrl = buildAuthorizeUrl({
    state,
    challenge: codeChallenge(verifier),
    config,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_COOKIE.state, state, oauthCookieOptions);
  response.cookies.set(OAUTH_COOKIE.verifier, verifier, oauthCookieOptions);
  response.cookies.set(OAUTH_COOKIE.redirect, config.redirectUri, oauthCookieOptions);
  return response;
}

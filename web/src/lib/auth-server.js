import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(handler) {
  return async (req, ctx) => {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }
    return handler(req, ctx, user);
  };
}

export function requireRole(...roles) {
  return (handler) => requireAuth(async (req, ctx, user) => {
    if (!roles.includes(user.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }
    return handler(req, ctx, user);
  });
}

export async function mintSessionCookie(memberId, role) {
  const token = jwt.sign(
    { sub: memberId, role },
    process.env.SUPABASE_JWT_SECRET,
    { expiresIn: '1h' }
  );
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600,
    path: '/',
  });
  return token;
}

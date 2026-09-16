import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return NextResponse.json({ error: 'ไม่มี session' }, { status: 401 });

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const newToken = jwt.sign(
      { sub: payload.sub, role: payload.role },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: '1h' }
    );
    cookieStore.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    });
    return NextResponse.json({ success: true });
  } catch {
    const cs = await cookies();
    cs.set('session', '', { httpOnly: true, maxAge: 0, path: '/' });
    return NextResponse.json({ error: 'Session หมดอายุ กรุณา login ใหม่' }, { status: 401 });
  }
}

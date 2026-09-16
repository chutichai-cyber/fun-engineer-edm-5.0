import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    // Look up member (include password_hash for local fallback)
    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role, password_hash FROM members WHERE username = $1',
      [username]
    );
    const member = result.rows[0];
    if (!member) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Verify password: ถ้ามี CORP_AUTH_API_URL ใช้ corporate auth, ไม่มีให้ตรวจ bcrypt จาก DB
    if (process.env.CORP_AUTH_API_URL) {
      const authRes = await fetch(process.env.CORP_AUTH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!authRes.ok) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }
    } else {
      // Local fallback: ตรวจ bcrypt จาก password_hash ในฐานข้อมูล
      const valid = member.password_hash && await bcrypt.compare(password, member.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }
    }

    // Mint JWT with Supabase JWT secret
    const token = jwt.sign(
      { sub: member.id, role: member.role },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set httpOnly session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: member.id,
        username: member.username,
        role: member.role,
        prefix: member.prefix,
        firstName: member.first_name,
        lastName: member.last_name,
        nickname: member.nickname,
        team: member.team,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

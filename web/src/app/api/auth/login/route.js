import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { mintSessionCookie, toClientUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role, email, password_hash FROM members WHERE username = $1',
      [username]
    );
    const member = result.rows[0];
    if (!member) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

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
      const valid = member.password_hash && await bcrypt.compare(password, member.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }
    }

    await mintSessionCookie(member.id, member.role);

    return NextResponse.json({ user: toClientUser(member) });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

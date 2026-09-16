import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  try {
    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role, created_at FROM members ORDER BY team, first_name'
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (user.role !== 'superadmin') return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });

  try {
    const { prefix, first_name, last_name, nickname, team, username, password, role } = await request.json();
    if (!prefix || !first_name || !last_name || !username || !password || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    if (!['superadmin', 'admin', 'leader', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Role ไม่ถูกต้อง' }, { status: 400 });
    }

    const existing = await pool.query('SELECT id FROM members WHERE username = $1', [username]);
    if (existing.rows[0]) return NextResponse.json({ error: 'Username นี้มีอยู่ในระบบแล้ว' }, { status: 409 });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO members (prefix, first_name, last_name, nickname, team, username, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, prefix, first_name, last_name, nickname, team, username, role`,
      [prefix, first_name, last_name, nickname || null, team || null, username, password_hash, role]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

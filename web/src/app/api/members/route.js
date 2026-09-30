import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAllowedEmailDomain, isAllowedEmail, normalizeEmail } from '@/lib/microsoft-auth';

const MEMBER_COLUMNS = 'id, prefix, first_name, last_name, nickname, team, username, role, email, created_at';

function uniqueViolation(err) {
  if (err?.code !== '23505') return null;
  const detail = `${err.constraint || ''} ${err.detail || ''}`.toLowerCase();
  if (detail.includes('email')) return 'อีเมลนี้มีอยู่ในระบบแล้ว';
  if (detail.includes('username')) return 'Username นี้มีอยู่ในระบบแล้ว';
  return 'ข้อมูลซ้ำกับที่มีอยู่ในระบบ';
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  try {
    const result = await pool.query(
      `SELECT ${MEMBER_COLUMNS} FROM members ORDER BY team, first_name`
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
    const { prefix, first_name, last_name, nickname, team, username, password, role, email } = await request.json();
    if (!prefix || !first_name || !last_name || !username || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }
    if (!password && !email) {
      return NextResponse.json({ error: 'กรุณาตั้งรหัสผ่าน หรือกรอกอีเมลบริษัทสำหรับ Microsoft login' }, { status: 400 });
    }
    if (!['superadmin', 'admin', 'leader', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Role ไม่ถูกต้อง' }, { status: 400 });
    }

    const normalizedEmail = email ? normalizeEmail(email) : null;
    if (email && !isAllowedEmail(normalizedEmail)) {
      return NextResponse.json({ error: `อีเมลต้องเป็น @${getAllowedEmailDomain()}` }, { status: 400 });
    }

    const existing = await pool.query('SELECT id FROM members WHERE username = $1', [username]);
    if (existing.rows[0]) return NextResponse.json({ error: 'Username นี้มีอยู่ในระบบแล้ว' }, { status: 409 });

    if (normalizedEmail) {
      const existingEmail = await pool.query('SELECT id FROM members WHERE email = $1', [normalizedEmail]);
      if (existingEmail.rows[0]) return NextResponse.json({ error: 'อีเมลนี้มีอยู่ในระบบแล้ว' }, { status: 409 });
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO members (prefix, first_name, last_name, nickname, team, username, password_hash, role, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${MEMBER_COLUMNS}`,
      [prefix, first_name, last_name, nickname || null, team || null, username, password_hash, role, normalizedEmail]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    const dup = uniqueViolation(err);
    if (dup) return NextResponse.json({ error: dup }, { status: 409 });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

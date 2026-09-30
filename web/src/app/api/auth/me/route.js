import { NextResponse } from 'next/server';
import { getSessionUser, toClientUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  try {
    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role, email FROM members WHERE id = $1',
      [user.sub]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'ไม่พบข้อมูลสมาชิก' }, { status: 404 });
    return NextResponse.json(toClientUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

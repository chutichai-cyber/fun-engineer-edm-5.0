import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  try {
    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role FROM members WHERE id = $1',
      [user.sub]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'ไม่พบข้อมูลสมาชิก' }, { status: 404 });
    const m = result.rows[0];
    return NextResponse.json({
      id: m.id,
      username: m.username,
      role: m.role,
      prefix: m.prefix,
      firstName: m.first_name,
      lastName: m.last_name,
      nickname: m.nickname,
      team: m.team,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

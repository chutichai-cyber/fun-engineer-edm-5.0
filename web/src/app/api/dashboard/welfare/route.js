import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const settingResult = await pool.query(
      "SELECT value FROM system_settings WHERE key = 'welfare_budget_per_person'"
    );
    const budget = parseFloat(settingResult.rows[0]?.value || 1800);

    const result = await pool.query(
      `SELECT m.id, m.prefix, m.first_name, m.last_name, m.nickname, m.team, m.role,
         COALESCE(w.accumulated_60_percent, 0) AS accumulated_60_percent,
         COALESCE(w.claimable_amount, 0) AS claimable_amount,
         COALESCE(w.balance_amount, $1) AS balance_amount,
         w.last_updated_at
       FROM members m
       LEFT JOIN welfare_budget_snapshots w ON w.member_id = m.id
       ORDER BY m.first_name, m.last_name`,
      [budget]
    );

    return NextResponse.json({ members: result.rows, budget });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

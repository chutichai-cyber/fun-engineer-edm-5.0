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
    const [projectStats, expenseStats, topProjects] = await Promise.all([
      pool.query('SELECT status, COUNT(*) AS count FROM projects GROUP BY status'),
      pool.query(`
        SELECT ed.status, ed.sent_to_member,
          COUNT(*) AS count,
          COALESCE(SUM(ed.total_amount), 0) AS total
        FROM expense_documents ed GROUP BY ed.status, ed.sent_to_member
      `),
      pool.query(`
        SELECT p.id, p.name, p.status, ed.total_amount, ed.status AS expense_status,
          m.prefix || m.first_name || ' ' || m.last_name AS lead_name
        FROM projects p
        LEFT JOIN expense_documents ed ON ed.project_id = p.id
        JOIN members m ON m.id = p.lead_id
        ORDER BY p.created_at DESC LIMIT 10
      `),
    ]);

    return NextResponse.json({
      projectStats: projectStats.rows,
      expenseStats: expenseStats.rows,
      recentProjects: topProjects.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

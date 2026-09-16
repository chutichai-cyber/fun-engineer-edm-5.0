import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['leader', 'admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  const leadId = user.role === 'leader' ? user.sub : null;

  try {
    const projectsResult = await pool.query(
      `SELECT p.id, p.name, p.status, p.activity_date,
         (SELECT COUNT(*) FROM project_participants WHERE project_id = p.id) AS participant_count,
         ed.id AS document_id, ed.status AS expense_status, ed.sent_to_member, ed.total_amount
       FROM projects p
       LEFT JOIN expense_documents ed ON ed.project_id = p.id
       WHERE ($1::int IS NULL OR p.lead_id = $1)
       ORDER BY p.created_at DESC`,
      [leadId]
    );

    const totalBudget = projectsResult.rows.reduce(
      (sum, p) => sum + (parseFloat(p.total_amount) || 0),
      0
    );

    return NextResponse.json({ projects: projectsResult.rows, totalBudget });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

function canManageExpense(user, project) {
  if (['superadmin', 'admin'].includes(user.role)) return true;
  if (user.role === 'leader' && project.lead_id === user.sub) return true;
  return false;
}

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { projectId: projectIdParam } = await params;

  const projectId = parseInt(projectIdParam);
  try {
    const pResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!pResult.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });

    if (user.role === 'user') {
      const pp = await pool.query(
        'SELECT 1 FROM project_participants WHERE project_id = $1 AND member_id = $2',
        [projectId, user.sub]
      );
      if (!pp.rows[0]) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const edResult = await pool.query('SELECT id FROM expense_documents WHERE project_id = $1', [projectId]);
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ยังไม่มีเอกสารเบิกจ่าย' }, { status: 404 });
    return NextResponse.json({ id: edResult.rows[0].id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { projectId: projectIdParam } = await params;

  const projectId = parseInt(projectIdParam);
  try {
    const pResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!pResult.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    const project = pResult.rows[0];

    if (!canManageExpense(user, project)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างเอกสารเบิกจ่าย' }, { status: 403 });
    }
    if (['cancelled', 'rejected'].includes(project.status)) {
      return NextResponse.json({ error: 'ไม่สามารถสร้างเอกสารสำหรับโครงการที่ยกเลิกหรือปฏิเสธแล้ว' }, { status: 400 });
    }

    const existing = await pool.query('SELECT id FROM expense_documents WHERE project_id = $1', [projectId]);
    if (existing.rows[0]) {
      return NextResponse.json({ error: 'มีเอกสารเบิกจ่ายสำหรับโครงการนี้แล้ว', id: existing.rows[0].id }, { status: 409 });
    }

    const result = await pool.query(
      "INSERT INTO expense_documents (project_id, status, sent_to_member) VALUES ($1, 'pending_review', false) RETURNING *",
      [projectId]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

function canManageProject(user, project) {
  if (['superadmin', 'admin'].includes(user.role)) return true;
  if (user.role === 'leader' && project.lead_id === user.sub) return true;
  return false;
}

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const projectId = parseInt(id);
  try {
    const result = await pool.query(
      `SELECT p.*, m.prefix || m.first_name || ' ' || m.last_name AS lead_name,
        m.nickname AS lead_nickname, m.team AS lead_team
       FROM projects p JOIN members m ON m.id = p.lead_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    const project = result.rows[0];

    if (user.role === 'user') {
      if (!['active', 'completed', 'pending'].includes(project.status)) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโครงการนี้' }, { status: 403 });
      }
      const pp = await pool.query(
        'SELECT 1 FROM project_participants WHERE project_id = $1 AND member_id = $2',
        [projectId, user.sub]
      );
      if (!pp.rows[0]) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงโครงการนี้' }, { status: 403 });
    }

    const [participants, expenseDoc] = await Promise.all([
      pool.query(
        `SELECT m.id, m.prefix, m.first_name, m.last_name, m.nickname, m.team, m.role
         FROM project_participants pp JOIN members m ON m.id = pp.member_id
         WHERE pp.project_id = $1 ORDER BY m.first_name`,
        [projectId]
      ),
      pool.query(
        'SELECT id, status, sent_to_member, total_amount, remainder_amount FROM expense_documents WHERE project_id = $1',
        [projectId]
      ),
    ]);

    return NextResponse.json({
      ...project,
      participants: participants.rows,
      expense_document: expenseDoc.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const projectId = parseInt(id);
  try {
    const pResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!pResult.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    const project = pResult.rows[0];

    if (!canManageProject(user, project)) return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขโครงการนี้' }, { status: 403 });
    if (project.status === 'completed') return NextResponse.json({ error: 'ไม่สามารถแก้ไขโครงการที่เสร็จสิ้นแล้ว' }, { status: 400 });

    const { name, lead_id, activity_date, activity_date_end, location, estimated_cost } = await request.json();

    let finalLeadId = project.lead_id;
    if (lead_id && ['superadmin', 'admin'].includes(user.role)) {
      const leadCheck = await pool.query(
        "SELECT id FROM members WHERE id = $1 AND role IN ('leader', 'admin', 'superadmin')",
        [lead_id]
      );
      if (!leadCheck.rows[0]) return NextResponse.json({ error: 'หัวหน้าโครงการต้องมีสิทธิ์ leader ขึ้นไป' }, { status: 400 });
      finalLeadId = lead_id;
    }

    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name), lead_id = $2,
        activity_date = COALESCE($3, activity_date), activity_date_end = $4,
        location = COALESCE($5, location), estimated_cost = COALESCE($6, estimated_cost),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name || null, finalLeadId, activity_date || null, activity_date_end || null, location || null, estimated_cost || null, projectId]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['superadmin', 'admin'].includes(user.role)) return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบโครงการ' }, { status: 403 });
  const { id } = await params;

  const projectId = parseInt(id);
  try {
    const pResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!pResult.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    if (!['draft', 'cancelled'].includes(pResult.rows[0].status)) {
      return NextResponse.json({ error: 'ลบได้เฉพาะโครงการที่อยู่ในสถานะร่างหรือยกเลิกเท่านั้น' }, { status: 400 });
    }
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

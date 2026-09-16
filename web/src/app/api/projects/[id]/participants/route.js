import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { recalculateDocument } from '@/lib/recalculate';
import { updateWelfareSnapshots } from '@/lib/welfare';

function canManageProject(user, project) {
  if (['superadmin', 'admin'].includes(user.role)) return true;
  if (user.role === 'leader' && project.lead_id === user.sub) return true;
  return false;
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
    if (project.status === 'completed') return NextResponse.json({ error: 'ไม่สามารถแก้ไขรายชื่อโครงการที่เสร็จสิ้นแล้ว' }, { status: 400 });

    const { participant_ids } = await request.json();
    if (!Array.isArray(participant_ids)) return NextResponse.json({ error: 'participant_ids ต้องเป็น array' }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const oldPpResult = await client.query('SELECT member_id FROM project_participants WHERE project_id = $1', [projectId]);
      const oldMemberIds = oldPpResult.rows.map((r) => r.member_id);

      await client.query('DELETE FROM project_participants WHERE project_id = $1', [projectId]);
      const uniqueIds = [...new Set(participant_ids.map(Number))];
      for (const mid of uniqueIds) {
        await client.query(
          'INSERT INTO project_participants (project_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [projectId, mid]
        );
      }

      const edResult = await client.query('SELECT id, status FROM expense_documents WHERE project_id = $1', [projectId]);
      if (edResult.rows[0]) {
        const ed = edResult.rows[0];
        await recalculateDocument(client, ed.id);
        if (['approved', 'closed'].includes(ed.status)) {
          await client.query(
            "UPDATE expense_documents SET status = 'pending_review', sent_to_member = false, updated_at = NOW() WHERE id = $1",
            [ed.id]
          );
        }
      }

      await client.query('COMMIT');

      const participants = await pool.query(
        `SELECT m.id, m.prefix, m.first_name, m.last_name, m.nickname, m.team, m.role
         FROM project_participants pp JOIN members m ON m.id = pp.member_id WHERE pp.project_id = $1`,
        [projectId]
      );

      const allAffected = [...new Set([...oldMemberIds, ...uniqueIds])];
      updateWelfareSnapshots(pool, allAffected).catch((e) => console.error('[Welfare]', e));

      return NextResponse.json(participants.rows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

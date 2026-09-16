import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

const ALLOWED_TRANSITIONS = {
  draft: ['pending', 'cancelled'],
  pending: ['active', 'draft', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: ['draft'],
};

function canManageProject(user, project) {
  if (['superadmin', 'admin'].includes(user.role)) return true;
  if (user.role === 'leader' && project.lead_id === user.sub) return true;
  return false;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  try {
    let query, params;
    const { role, sub: userId } = user;

    if (['superadmin', 'admin'].includes(role)) {
      query = `
        SELECT p.*, m.prefix || m.first_name || ' ' || m.last_name AS lead_name,
          m.nickname AS lead_nickname,
          (SELECT COUNT(*) FROM project_participants WHERE project_id = p.id) AS participant_count,
          (SELECT status FROM expense_documents WHERE project_id = p.id) AS expense_status
        FROM projects p JOIN members m ON m.id = p.lead_id
        ORDER BY p.created_at DESC
      `;
      params = [];
    } else if (role === 'leader') {
      query = `
        SELECT p.*, m.prefix || m.first_name || ' ' || m.last_name AS lead_name,
          m.nickname AS lead_nickname,
          (SELECT COUNT(*) FROM project_participants WHERE project_id = p.id) AS participant_count,
          (SELECT status FROM expense_documents WHERE project_id = p.id) AS expense_status
        FROM projects p JOIN members m ON m.id = p.lead_id
        WHERE p.lead_id = $1
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT p.id, p.name, p.status, p.lead_id,
          m.prefix || m.first_name || ' ' || m.last_name AS lead_name,
          m.nickname AS lead_nickname
        FROM projects p JOIN members m ON m.id = p.lead_id
        WHERE EXISTS (SELECT 1 FROM project_participants WHERE project_id = p.id AND member_id = $1)
          AND p.status IN ('pending', 'active', 'completed')
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (user.role === 'user') return NextResponse.json({ error: 'ไม่มีสิทธิ์สร้างโครงการ' }, { status: 403 });

  try {
    const { name, lead_id, activity_date, activity_date_end, location, estimated_cost, participant_ids } = await request.json();
    if (!name) return NextResponse.json({ error: 'กรุณากรอกชื่อกิจกรรม' }, { status: 400 });

    let finalLeadId = lead_id;
    if (user.role === 'leader') {
      finalLeadId = user.sub;
    } else {
      if (!finalLeadId) return NextResponse.json({ error: 'กรุณาระบุหัวหน้าโครงการ' }, { status: 400 });
      const leadCheck = await pool.query(
        "SELECT id FROM members WHERE id = $1 AND role IN ('leader', 'admin', 'superadmin')",
        [finalLeadId]
      );
      if (!leadCheck.rows[0]) return NextResponse.json({ error: 'หัวหน้าโครงการต้องมีสิทธิ์ leader ขึ้นไป' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const pResult = await client.query(
        `INSERT INTO projects (name, lead_id, activity_date, activity_date_end, location, estimated_cost, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7) RETURNING *`,
        [name, finalLeadId, activity_date || null, activity_date_end || null, location || null, estimated_cost || null, user.sub]
      );
      const project = pResult.rows[0];

      if (Array.isArray(participant_ids) && participant_ids.length > 0) {
        const uniqueIds = [...new Set(participant_ids.map(Number))];
        for (const mid of uniqueIds) {
          await client.query(
            'INSERT INTO project_participants (project_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [project.id, mid]
          );
        }
      }
      await client.query('COMMIT');
      return NextResponse.json(project, { status: 201 });
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

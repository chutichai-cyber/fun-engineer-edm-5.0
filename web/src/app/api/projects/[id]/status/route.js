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

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const projectId = parseInt(id);
  const { status: newStatus } = await request.json();
  if (!newStatus) return NextResponse.json({ error: 'กรุณาระบุสถานะใหม่' }, { status: 400 });

  try {
    const pResult = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!pResult.rows[0]) return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    const project = pResult.rows[0];

    const allowed = ALLOWED_TRANSITIONS[project.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({ error: `ไม่สามารถเปลี่ยนจาก "${project.status}" เป็น "${newStatus}" ได้` }, { status: 400 });
    }

    // approve/complete: admin/superadmin only
    if (['active', 'completed'].includes(newStatus) && !['superadmin', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'เฉพาะ admin/superadmin เท่านั้นที่สามารถดำเนินการนี้ได้' }, { status: 403 });
    }

    // reject (pending→draft): admin/superadmin only
    if (project.status === 'pending' && newStatus === 'draft' && !['superadmin', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ปฏิเสธโครงการ' }, { status: 403 });
    }

    // submit (draft→pending): lead or admin+
    if (project.status === 'draft' && newStatus === 'pending' && !canManageProject(user, project)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ส่งอนุมัติโครงการนี้' }, { status: 403 });
    }

    // cancel: lead or admin+
    if (newStatus === 'cancelled' && !canManageProject(user, project)) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์ยกเลิกโครงการนี้' }, { status: 403 });
    }

    const result = await pool.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, projectId]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

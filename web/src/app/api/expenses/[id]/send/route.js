import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { updateWelfareSnapshots } from '@/lib/welfare';

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
  }
  const { id } = await params;

  const docId = parseInt(id);
  try {
    const edResult = await pool.query('SELECT * FROM expense_documents WHERE id = $1', [docId]);
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (doc.status !== 'approved') {
      return NextResponse.json({ error: 'สามารถส่งยอดได้เฉพาะเอกสารที่อนุมัติแล้ว' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE expense_documents SET sent_to_member = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [docId]
    );

    pool.query('SELECT member_id FROM project_participants WHERE project_id = $1', [doc.project_id])
      .then((pp) => updateWelfareSnapshots(pool, pp.rows.map((r) => r.member_id)))
      .catch((e) => console.error('[Welfare]', e));

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { recalculateDocument } from '@/lib/recalculate';

export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์กำหนดยอดเศษ' }, { status: 403 });
  }
  const { id } = await params;

  const docId = parseInt(id);
  const { member_id } = await request.json();

  try {
    const edResult = await pool.query(
      'SELECT ed.*, p.lead_id FROM expense_documents ed JOIN projects p ON p.id = ed.project_id WHERE ed.id = $1',
      [docId]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (doc.status === 'closed') {
      return NextResponse.json({ error: 'ไม่สามารถแก้ไขเอกสารที่ปิดแล้ว' }, { status: 400 });
    }

    if (member_id) {
      const pp = await pool.query(
        'SELECT 1 FROM project_participants WHERE project_id = $1 AND member_id = $2',
        [doc.project_id, member_id]
      );
      if (!pp.rows[0]) return NextResponse.json({ error: 'สมาชิกไม่ได้อยู่ในโครงการนี้' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE expense_documents SET remainder_member_id = $1, updated_at = NOW() WHERE id = $2',
        [member_id || null, docId]
      );
      await recalculateDocument(client, docId);
      await client.query('COMMIT');

      const result = await pool.query('SELECT * FROM expense_documents WHERE id = $1', [docId]);
      return NextResponse.json(result.rows[0]);
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

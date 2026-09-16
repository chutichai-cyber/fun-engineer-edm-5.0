import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

const ALLOWED = {
  pending_review: ['approved', 'returned'],
  returned: ['pending_review'],
  approved: ['closed'],
  closed: [],
};

export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!['superadmin', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'เฉพาะ admin/superadmin เท่านั้นที่สามารถเปลี่ยนสถานะเอกสารได้' }, { status: 403 });
  }
  const { id } = await params;

  const docId = parseInt(id);
  const { status: newStatus } = await request.json();

  try {
    const edResult = await pool.query('SELECT * FROM expense_documents WHERE id = $1', [docId]);
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (!ALLOWED[doc.status]?.includes(newStatus)) {
      return NextResponse.json({ error: `ไม่สามารถเปลี่ยนจาก "${doc.status}" เป็น "${newStatus}" ได้` }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE expense_documents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, docId]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

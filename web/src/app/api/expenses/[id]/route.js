import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const docId = parseInt(id);
  try {
    const edResult = await pool.query(
      `SELECT ed.*, p.name AS project_name, p.lead_id, p.status AS project_status
       FROM expense_documents ed
       JOIN projects p ON p.id = ed.project_id
       WHERE ed.id = $1`,
      [docId]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสารเบิกจ่าย' }, { status: 404 });
    const doc = edResult.rows[0];

    if (user.role === 'user') {
      const isParticipant = await pool.query(
        'SELECT 1 FROM project_participants WHERE project_id = $1 AND member_id = $2',
        [doc.project_id, user.sub]
      );
      if (!isParticipant.rows[0]) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
      const canView = doc.status === 'closed' || (doc.status === 'approved' && doc.sent_to_member);
      if (!canView) return NextResponse.json({ error: 'ยังไม่สามารถดูเอกสารนี้ได้' }, { status: 403 });
    }

    const [items, sharesResult, participants] = await Promise.all([
      pool.query('SELECT * FROM expense_items WHERE document_id = $1 ORDER BY sequence', [docId]),
      pool.query(
        `SELECT mes.*, m.prefix, m.first_name, m.last_name, m.nickname, m.team
         FROM member_expense_shares mes
         JOIN members m ON m.id = mes.member_id
         WHERE mes.document_id = $1 ORDER BY m.first_name`,
        [docId]
      ),
      pool.query(
        `SELECT m.id, m.prefix, m.first_name, m.last_name, m.nickname, m.team
         FROM project_participants pp JOIN members m ON m.id = pp.member_id
         WHERE pp.project_id = $1 ORDER BY m.first_name`,
        [doc.project_id]
      ),
    ]);

    return NextResponse.json({
      ...doc,
      items: items.rows,
      shares: sharesResult.rows,
      participants: participants.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

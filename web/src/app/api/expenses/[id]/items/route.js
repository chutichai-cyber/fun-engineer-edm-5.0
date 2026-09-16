import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { recalculateDocument } from '@/lib/recalculate';
import { updateWelfareSnapshots } from '@/lib/welfare';

function canEditItems(user, project, doc) {
  if (['superadmin', 'admin'].includes(user.role)) return true;
  if (user.role === 'leader' && project.lead_id === user.sub) {
    return !['approved', 'closed'].includes(doc.status);
  }
  return false;
}

async function handleSentReset(client, docId, originalDoc) {
  if (originalDoc.sent_to_member) {
    await client.query(
      "UPDATE expense_documents SET status = 'pending_review', sent_to_member = false, updated_at = NOW() WHERE id = $1",
      [docId]
    );
  } else if (['approved', 'returned'].includes(originalDoc.status)) {
    await client.query(
      "UPDATE expense_documents SET status = 'pending_review', updated_at = NOW() WHERE id = $1",
      [docId]
    );
  }
}

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const docId = parseInt(id);
  try {
    const edResult = await pool.query(
      'SELECT ed.*, p.lead_id FROM expense_documents ed JOIN projects p ON p.id = ed.project_id WHERE ed.id = $1',
      [docId]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (!canEditItems(user, { lead_id: doc.lead_id }, doc)) {
      const leaderBlocked = user.role === 'leader' && ['approved', 'closed'].includes(doc.status);
      return NextResponse.json({
        error: leaderBlocked
          ? 'ไม่สามารถแก้ไขเอกสารที่อนุมัติหรือปิดแล้ว กรุณาติดต่อ admin เพื่อเปิดแก้ไขใหม่'
          : 'ไม่มีสิทธิ์แก้ไขเอกสาร',
      }, { status: 403 });
    }

    const { description, amount, notes, sequence, attachment_path, attachment_name, attachment_size } = await request.json();
    if (!description || !amount) {
      return NextResponse.json({ error: 'กรุณากรอกรายการและจำนวนเงิน' }, { status: 400 });
    }

    const seqResult = await pool.query(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM expense_items WHERE document_id = $1',
      [docId]
    );
    const nextSeq = sequence ? parseInt(sequence) : seqResult.rows[0].next_seq;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const itemResult = await client.query(
        `INSERT INTO expense_items (document_id, sequence, description, amount, attachment_path, attachment_name, attachment_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [docId, nextSeq, description, parseFloat(amount), attachment_path || null, attachment_name || null, attachment_size || null, notes || null]
      );
      await recalculateDocument(client, docId);
      await handleSentReset(client, docId, doc);
      await client.query('COMMIT');

      pool.query('SELECT member_id FROM project_participants WHERE project_id = $1', [doc.project_id])
        .then((pp) => updateWelfareSnapshots(pool, pp.rows.map((r) => r.member_id)))
        .catch((e) => console.error('[Welfare]', e));

      return NextResponse.json(itemResult.rows[0], { status: 201 });
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

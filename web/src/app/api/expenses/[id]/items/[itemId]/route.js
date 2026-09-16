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

function blockedError(user, doc) {
  const leaderBlocked = user.role === 'leader' && ['approved', 'closed'].includes(doc.status);
  return NextResponse.json({
    error: leaderBlocked
      ? 'ไม่สามารถแก้ไขเอกสารที่อนุมัติหรือปิดแล้ว กรุณาติดต่อ admin เพื่อเปิดแก้ไขใหม่'
      : 'ไม่มีสิทธิ์แก้ไขเอกสาร',
  }, { status: 403 });
}

export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id, itemId: itemIdParam } = await params;

  const docId = parseInt(id);
  const itemId = parseInt(itemIdParam);
  try {
    const edResult = await pool.query(
      'SELECT ed.*, p.lead_id FROM expense_documents ed JOIN projects p ON p.id = ed.project_id WHERE ed.id = $1',
      [docId]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (!canEditItems(user, { lead_id: doc.lead_id }, doc)) return blockedError(user, doc);

    const existingItem = await pool.query('SELECT * FROM expense_items WHERE id = $1 AND document_id = $2', [itemId, docId]);
    if (!existingItem.rows[0]) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });
    const oldItem = existingItem.rows[0];

    const { description, amount, notes, sequence, attachment_path, attachment_name, attachment_size } = await request.json();

    const finalPath = attachment_path !== undefined ? attachment_path : oldItem.attachment_path;
    const finalName = attachment_name !== undefined ? attachment_name : oldItem.attachment_name;
    const finalSize = attachment_size !== undefined ? attachment_size : oldItem.attachment_size;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const itemResult = await client.query(
        `UPDATE expense_items SET
          description = COALESCE($1, description),
          amount = COALESCE($2, amount),
          sequence = COALESCE($3, sequence),
          attachment_path = $4, attachment_name = $5, attachment_size = $6,
          notes = COALESCE($7, notes),
          updated_at = NOW()
         WHERE id = $8 AND document_id = $9 RETURNING *`,
        [
          description || null, amount ? parseFloat(amount) : null,
          sequence ? parseInt(sequence) : null,
          finalPath, finalName, finalSize,
          notes !== undefined ? notes : null,
          itemId, docId,
        ]
      );
      await recalculateDocument(client, docId);
      await handleSentReset(client, docId, doc);
      await client.query('COMMIT');

      pool.query('SELECT member_id FROM project_participants WHERE project_id = $1', [doc.project_id])
        .then((pp) => updateWelfareSnapshots(pool, pp.rows.map((r) => r.member_id)))
        .catch((e) => console.error('[Welfare]', e));

      return NextResponse.json(itemResult.rows[0]);
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

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id, itemId: itemIdParam } = await params;

  const docId = parseInt(id);
  const itemId = parseInt(itemIdParam);
  try {
    const edResult = await pool.query(
      'SELECT ed.*, p.lead_id FROM expense_documents ed JOIN projects p ON p.id = ed.project_id WHERE ed.id = $1',
      [docId]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    if (!canEditItems(user, { lead_id: doc.lead_id }, doc)) return blockedError(user, doc);

    const item = await pool.query('SELECT * FROM expense_items WHERE id = $1 AND document_id = $2', [itemId, docId]);
    if (!item.rows[0]) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM expense_items WHERE id = $1', [itemId]);
      await recalculateDocument(client, docId);
      await handleSentReset(client, docId, doc);
      await client.query('COMMIT');

      pool.query('SELECT member_id FROM project_participants WHERE project_id = $1', [doc.project_id])
        .then((pp) => updateWelfareSnapshots(pool, pp.rows.map((r) => r.member_id)))
        .catch((e) => console.error('[Welfare]', e));

      return NextResponse.json({ success: true });
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

import { calculateShares, roundHalfUp } from './calculation.js';

export async function recalculateDocument(db, documentId) {
  const docResult = await db.query(
    'SELECT ed.id, ed.project_id, ed.remainder_member_id FROM expense_documents ed WHERE ed.id = $1',
    [documentId]
  );
  if (!docResult.rows[0]) throw new Error('Document not found');
  const { project_id } = docResult.rows[0];
  let remainderMemberId = docResult.rows[0].remainder_member_id;

  const itemsResult = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM expense_items WHERE document_id = $1',
    [documentId]
  );
  const participantsResult = await db.query(
    'SELECT member_id FROM project_participants WHERE project_id = $1',
    [project_id]
  );

  const total = parseFloat(itemsResult.rows[0].total);
  const participantIds = participantsResult.rows.map((r) => r.member_id);
  const participantCount = participantIds.length;

  const { perPerson60, perPerson40, totalPerPerson, documentRemainder } = calculateShares(total, participantCount);

  if (remainderMemberId && !participantIds.includes(remainderMemberId)) {
    await db.query('UPDATE expense_documents SET remainder_member_id = NULL WHERE id = $1', [documentId]);
    remainderMemberId = null;
  }

  await db.query('DELETE FROM member_expense_shares WHERE document_id = $1', [documentId]);

  for (const memberId of participantIds) {
    const isRemainderHolder = remainderMemberId !== null && memberId === remainderMemberId;
    const remainderShare = isRemainderHolder ? documentRemainder : 0;
    const totalShare = isRemainderHolder
      ? roundHalfUp(perPerson60 + perPerson40 + documentRemainder)
      : totalPerPerson;

    await db.query(
      `INSERT INTO member_expense_shares (document_id, member_id, share_60, share_40, remainder_share, total_share)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [documentId, memberId, perPerson60, perPerson40, remainderShare, totalShare]
    );
  }

  await db.query(
    'UPDATE expense_documents SET total_amount = $1, remainder_amount = $2, updated_at = NOW() WHERE id = $3',
    [total, documentRemainder, documentId]
  );

  return { total, perPerson60, perPerson40, totalPerPerson, documentRemainder, participantCount, remainderMemberId };
}

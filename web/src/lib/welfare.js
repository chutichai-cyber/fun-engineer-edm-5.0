export async function updateWelfareSnapshots(db, memberIds) {
  if (!memberIds || memberIds.length === 0) return;

  const settingResult = await db.query(
    "SELECT value FROM system_settings WHERE key = 'welfare_budget_per_person'"
  );
  const budget = parseFloat(settingResult.rows[0]?.value ?? 1800);

  for (const memberId of memberIds) {
    const shareResult = await db.query(
      `SELECT COALESCE(SUM(mes.share_60), 0) AS total_60
       FROM member_expense_shares mes
       JOIN expense_documents ed ON ed.id = mes.document_id
       WHERE mes.member_id = $1 AND ed.sent_to_member = true`,
      [memberId]
    );

    const accumulated = parseFloat(shareResult.rows[0].total_60);
    const claimable = Math.min(accumulated, budget);
    const balance = budget - accumulated;

    await db.query(
      `INSERT INTO welfare_budget_snapshots
        (member_id, accumulated_60_percent, claimable_amount, budget_amount, balance_amount, last_updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (member_id) DO UPDATE SET
        accumulated_60_percent = EXCLUDED.accumulated_60_percent,
        claimable_amount       = EXCLUDED.claimable_amount,
        budget_amount          = EXCLUDED.budget_amount,
        balance_amount         = EXCLUDED.balance_amount,
        last_updated_at        = NOW()`,
      [memberId, accumulated, claimable, budget, balance]
    );
  }
}

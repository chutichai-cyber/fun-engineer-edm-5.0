import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { memberId: memberIdParam } = await params;

  const memberId = parseInt(memberIdParam);
  if (user.role === 'user' && memberId !== user.sub) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลของสมาชิกคนอื่น' }, { status: 403 });
  }

  try {
    const memberResult = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, role FROM members WHERE id = $1',
      [memberId]
    );
    if (!memberResult.rows[0]) return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });

    const sharesResult = await pool.query(
      `SELECT
        mes.share_60, mes.share_40, mes.total_share,
        ed.id AS document_id, ed.total_amount, ed.status AS expense_status, ed.sent_to_member,
        p.id AS project_id, p.name AS project_name, p.status AS project_status, p.activity_date
       FROM member_expense_shares mes
       JOIN expense_documents ed ON ed.id = mes.document_id
       JOIN projects p ON p.id = ed.project_id
       WHERE mes.member_id = $1
         AND (ed.status = 'closed' OR (ed.status = 'approved' AND ed.sent_to_member = true))
       ORDER BY p.activity_date DESC`,
      [memberId]
    );

    const totals = sharesResult.rows.reduce(
      (acc, row) => ({
        total60: acc.total60 + parseFloat(row.share_60),
        total40: acc.total40 + parseFloat(row.share_40),
        totalShare: acc.totalShare + parseFloat(row.total_share),
      }),
      { total60: 0, total40: 0, totalShare: 0 }
    );

    const welfareResult = await pool.query(
      'SELECT * FROM welfare_budget_snapshots WHERE member_id = $1',
      [memberId]
    );

    return NextResponse.json({
      member: memberResult.rows[0],
      shares: sharesResult.rows,
      totals,
      welfare: welfareResult.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

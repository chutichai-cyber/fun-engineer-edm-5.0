import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { createStorageClient } from '@/lib/supabase-server';

const BUCKET = 'expense-attachments';

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get('path');
  if (!storagePath) return NextResponse.json({ error: 'กรุณาระบุ path' }, { status: 400 });

  try {
    const itemResult = await pool.query(
      `SELECT ei.*, ed.project_id, ed.status AS doc_status, ed.sent_to_member, p.lead_id
       FROM expense_items ei
       JOIN expense_documents ed ON ed.id = ei.document_id
       JOIN projects p ON p.id = ed.project_id
       WHERE ei.attachment_path = $1`,
      [storagePath]
    );
    if (!itemResult.rows[0]) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    const item = itemResult.rows[0];

    if (user.role === 'user') {
      const pp = await pool.query(
        'SELECT 1 FROM project_participants WHERE project_id = $1 AND member_id = $2',
        [item.project_id, user.sub]
      );
      if (!pp.rows[0]) return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
      const canView =
        item.doc_status === 'closed' || (item.doc_status === 'approved' && item.sent_to_member);
      if (!canView) return NextResponse.json({ error: 'ยังไม่สามารถดาวน์โหลดไฟล์นี้ได้' }, { status: 403 });
    }

    const supabase = createStorageClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);

    if (error) {
      console.error('[Storage sign-download]', error);
      return NextResponse.json({ error: 'ไม่สามารถสร้าง download URL ได้' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

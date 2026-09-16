import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import { createStorageClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const BUCKET = 'expense-attachments';

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

  const { fileName, fileType, docId } = await request.json();
  if (!fileName || !fileType || !docId) {
    return NextResponse.json({ error: 'กรุณาระบุ fileName, fileType และ docId' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'ประเภทไฟล์ไม่รองรับ' }, { status: 400 });
  }

  try {
    const edResult = await pool.query(
      'SELECT ed.*, p.lead_id FROM expense_documents ed JOIN projects p ON p.id = ed.project_id WHERE ed.id = $1',
      [parseInt(docId)]
    );
    if (!edResult.rows[0]) return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    const doc = edResult.rows[0];

    const canEdit =
      ['superadmin', 'admin'].includes(user.role) ||
      (user.role === 'leader' && doc.lead_id === user.sub && !['approved', 'closed'].includes(doc.status));

    if (!canEdit) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์อัปโหลดไฟล์สำหรับเอกสารนี้' }, { status: 403 });
    }

    const ext = path.extname(fileName);
    const storagePath = `attachments/${docId}/${uuidv4()}${ext}`;

    const supabase = createStorageClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, { expiresIn: 60 });

    if (error) {
      console.error('[Storage sign-upload]', error);
      return NextResponse.json({ error: 'ไม่สามารถสร้าง upload URL ได้' }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path: storagePath, token: data.token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

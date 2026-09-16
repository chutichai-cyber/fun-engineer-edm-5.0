import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  try {
    const result = await pool.query(
      'SELECT id, prefix, first_name, last_name, nickname, team, username, role, created_at FROM members WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  const callerRole = user.role;
  const callerId = user.sub;
  const targetId = parseInt(id);

  try {
    const target = await pool.query('SELECT * FROM members WHERE id = $1', [targetId]);
    if (!target.rows[0]) return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });
    const targetMember = target.rows[0];

    if (callerRole === 'user' || callerRole === 'leader') {
      if (callerId !== targetId) return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไข' }, { status: 403 });
    } else if (callerRole === 'admin') {
      if (callerId !== targetId && ['admin', 'superadmin'].includes(targetMember.role)) {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขสมาชิก role นี้' }, { status: 403 });
      }
    }

    const { prefix, first_name, last_name, nickname, team, role: newRole, password } = await request.json();

    if (newRole && newRole !== targetMember.role) {
      if (callerRole === 'admin') {
        if (['admin', 'superadmin'].includes(newRole)) {
          return NextResponse.json({ error: 'admin ไม่สามารถกำหนด role admin หรือ superadmin ได้' }, { status: 403 });
        }
      } else if (callerRole !== 'superadmin') {
        return NextResponse.json({ error: 'ไม่มีสิทธิ์เปลี่ยน role' }, { status: 403 });
      }
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (prefix !== undefined) { updates.push(`prefix = $${idx++}`); values.push(prefix); }
    if (first_name !== undefined) { updates.push(`first_name = $${idx++}`); values.push(first_name); }
    if (last_name !== undefined) { updates.push(`last_name = $${idx++}`); values.push(last_name); }
    if (nickname !== undefined) { updates.push(`nickname = $${idx++}`); values.push(nickname); }
    if (team !== undefined) { updates.push(`team = $${idx++}`); values.push(team); }
    if (newRole && callerRole === 'superadmin') { updates.push(`role = $${idx++}`); values.push(newRole); }
    if (newRole && callerRole === 'admin' && !['admin', 'superadmin'].includes(newRole)) {
      updates.push(`role = $${idx++}`); values.push(newRole);
    }
    if (password && (callerRole === 'superadmin' || callerId === targetId)) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องการแก้ไข' }, { status: 400 });

    updates.push(`updated_at = NOW()`);
    values.push(targetId);

    const result = await pool.query(
      `UPDATE members SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, prefix, first_name, last_name, nickname, team, username, role`,
      values
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (user.role !== 'superadmin') return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  const { id } = await params;

  const targetId = parseInt(id);
  if (targetId === user.sub) return NextResponse.json({ error: 'ไม่สามารถลบตัวเองได้' }, { status: 400 });

  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING id', [targetId]);
    if (!result.rows[0]) return NextResponse.json({ error: 'ไม่พบสมาชิก' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}

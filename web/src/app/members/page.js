'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, isSuperAdmin, getRoleLabel, getFullName } from '@/lib/auth';
import { RoleBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { MagnifyingGlassIcon, PlusIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/outline';

const PREFIXES = ['นาย', 'นางสาว', 'นาง'];
const ROLES = ['user', 'leader', 'admin', 'superadmin'];
const TEAMS = ['ทีมพัฒนาระบบ', 'ทีมการตลาด', 'ทีมปฏิบัติการ', 'ทีมบริหาร'];

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-boxdark mb-1.5">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function MembersPage() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ prefix: 'นาย', first_name: '', last_name: '', nickname: '', team: '', username: '', password: '', email: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { const u = getUser(); setUser(u); loadMembers(); }, []);

  async function loadMembers() {
    try { const data = await api.getMembers(); setMembers(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditMember(null);
    setForm({ prefix: 'นาย', first_name: '', last_name: '', nickname: '', team: '', username: '', password: '', email: '', role: 'user' });
    setError(''); setShowModal(true);
  }

  function openEdit(m) {
    setEditMember(m);
    setForm({ prefix: m.prefix, first_name: m.first_name, last_name: m.last_name, nickname: m.nickname || '', team: m.team || '', username: m.username, password: '', email: m.email || '', role: m.role });
    setError(''); setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editMember) {
        const body = { ...form };
        if (!body.password) delete body.password;
        delete body.username;
        await api.updateMember(editMember.id, body);
      } else {
        if (!form.password && !form.email) {
          setError('กรุณาตั้งรหัสผ่าน หรือกรอกอีเมล @thinknet.co.th สำหรับ Microsoft login');
          setSaving(false);
          return;
        }
        await api.createMember(form);
      }
      setShowModal(false); await loadMembers();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(m) {
    if (!confirm(`ยืนยันการลบสมาชิก "${getFullName(m)}"?`)) return;
    try { await api.deleteMember(m.id); await loadMembers(); }
    catch (err) { alert(err.message); }
  }

  const filtered = members.filter((m) =>
    !search || getFullName(m).includes(search) || m.username.includes(search) || (m.email || '').includes(search) || (m.team || '').includes(search)
  );

  if (!user) return null;

  const availableRoles = isSuperAdmin(user)
    ? ROLES : ROLES.filter((r) => r !== 'superadmin' && r !== 'admin');

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-boxdark">สมาชิกทั้งหมด</h1>
            <p className="text-body text-sm mt-0.5">{members.length} คน</p>
          </div>
          {isSuperAdmin(user) && (
            <button onClick={openCreate} className="btn-primary">
              <PlusIcon className="w-4 h-4" />เพิ่มสมาชิก
            </button>
          )}
        </div>

        <div className="mb-5 relative max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bodydark" />
          <input type="text" placeholder="ค้นหาชื่อ, username, อีเมล, ทีม..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stroke rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-bodydark">
            <div className="flex items-center gap-3"><div className="spinner" /><span className="text-sm">กำลังโหลด...</span></div>
          </div>
        ) : (
          <div className="card">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['ชื่อ-นามสกุล','ชื่อเล่น','ทีม','Username','อีเมล','สิทธิ์','ยอดสะสม'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-bodydark uppercase tracking-wide bg-whiter border-b border-stroke">{h}</th>
                  ))}
                  {isAdmin(user) && <th className="px-5 py-3 bg-whiter border-b border-stroke w-24" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="table-row">
                    <td className="px-5 py-4 font-medium text-boxdark">{getFullName(m)}</td>
                    <td className="px-5 py-4 text-body">{m.nickname || <span className="text-bodydark">-</span>}</td>
                    <td className="px-5 py-4 text-body text-xs">{m.team || <span className="text-bodydark">-</span>}</td>
                    <td className="px-5 py-4 text-bodydark font-mono text-xs">{m.username}</td>
                    <td className="px-5 py-4 text-body text-xs">{m.email || <span className="text-bodydark">-</span>}</td>
                    <td className="px-5 py-4"><RoleBadge role={m.role} /></td>
                    <td className="px-5 py-4">
                      <Link href={`/members/${m.id}/summary`} className="text-xs text-primary hover:underline font-medium">ดูยอด →</Link>
                    </td>
                    {isAdmin(user) && (
                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          {(isSuperAdmin(user) || (isAdmin(user) && !['admin','superadmin'].includes(m.role))) && (
                            <button onClick={() => openEdit(m)} className="text-xs text-primary hover:underline font-medium">แก้ไข</button>
                          )}
                          {isSuperAdmin(user) && m.id !== user.id && (
                            <button onClick={() => handleDelete(m)} className="text-xs text-danger hover:underline font-medium">ลบ</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="8">
                    <div className="flex flex-col items-center justify-center py-16 text-bodydark">
                      <UsersIcon className="w-12 h-12 mb-3 text-meta-9" />
                      <p className="text-sm">ไม่พบสมาชิก</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stroke">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h2 className="font-semibold text-boxdark">{editMember ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-bodydark hover:text-body rounded-lg hover:bg-whiten">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <FormField label="คำนำหน้า" required>
                  <select value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))} className="form-select">
                    {PREFIXES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </FormField>
                <FormField label="ชื่อ" required>
                  <input type="text" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className="form-input" required />
                </FormField>
                <FormField label="นามสกุล" required>
                  <input type="text" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className="form-input" required />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="ชื่อเล่น">
                  <input type="text" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} className="form-input" />
                </FormField>
                <FormField label="ทีม">
                  <input type="text" list="teams" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} className="form-input" />
                  <datalist id="teams">{TEAMS.map((t) => <option key={t} value={t} />)}</datalist>
                </FormField>
              </div>
              {!editMember && (
                <FormField label="Username" required>
                  <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="form-input" required />
                </FormField>
              )}
              <FormField label="อีเมล Microsoft">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="form-input"
                  placeholder="name@thinknet.co.th"
                />
                <p className="text-xs text-bodydark mt-1">ต้องเป็น @thinknet.co.th เพื่อผูกกับ Microsoft login</p>
              </FormField>
              <FormField label={editMember ? 'รหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)' : 'รหัสผ่าน'}>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="form-input" />
                {!editMember && <p className="text-xs text-bodydark mt-1">ไม่บังคับถ้ามีอีเมลบริษัท สำหรับเข้าด้วย Microsoft</p>}
              </FormField>
              <FormField label="สิทธิ์" required>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="form-select">
                  {availableRoles.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                </select>
              </FormField>
              {error && <div className="alert-error"><span>⚠</span><span>{error}</span></div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 justify-center">ยกเลิก</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

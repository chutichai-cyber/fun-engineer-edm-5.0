'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, isSuperAdmin, getRoleLabel, getFullName } from '@/lib/auth';
import { RoleBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const PREFIXES = ['นาย', 'นางสาว', 'นาง'];
const ROLES = ['user', 'leader', 'admin', 'superadmin'];
const TEAMS = ['ทีมพัฒนาระบบ', 'ทีมการตลาด', 'ทีมปฏิบัติการ', 'ทีมบริหาร'];

export default function MembersPage() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({
    prefix: 'นาย', first_name: '', last_name: '', nickname: '',
    team: '', username: '', password: '', role: 'user',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditMember(null);
    setForm({ prefix: 'นาย', first_name: '', last_name: '', nickname: '', team: '', username: '', password: '', role: 'user' });
    setError('');
    setShowModal(true);
  }

  function openEdit(m) {
    setEditMember(m);
    setForm({
      prefix: m.prefix, first_name: m.first_name, last_name: m.last_name,
      nickname: m.nickname || '', team: m.team || '', username: m.username, password: '', role: m.role,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editMember) {
        const body = { ...form };
        if (!body.password) delete body.password;
        delete body.username;
        await api.updateMember(editMember.id, body);
      } else {
        if (!form.password) return setError('กรุณาตั้งรหัสผ่าน');
        await api.createMember(form);
      }
      setShowModal(false);
      await loadMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m) {
    if (!confirm(`ยืนยันการลบสมาชิก "${getFullName(m)}"?`)) return;
    try {
      await api.deleteMember(m.id);
      await loadMembers();
    } catch (err) {
      alert(err.message);
    }
  }

  const filtered = members.filter((m) =>
    !search ||
    getFullName(m).includes(search) ||
    m.username.includes(search) ||
    (m.team || '').includes(search)
  );

  if (!user) return null;

  const availableRoles = isSuperAdmin(user)
    ? ROLES
    : ROLES.filter((r) => r !== 'superadmin' && r !== 'admin');

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">สมาชิกทั้งหมด</h1>
            <p className="text-gray-500 text-sm mt-0.5">{members.length} คน</p>
          </div>
          {isSuperAdmin(user) && (
            <button onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + เพิ่มสมาชิก
            </button>
          )}
        </div>

        <div className="mb-4">
          <input type="text" placeholder="ค้นหาชื่อ, username, ทีม..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full max-w-xs focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ-นามสกุล</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อเล่น</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ทีม</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สิทธิ์</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ยอดสะสม</th>
                  {isAdmin(user) && <th className="px-4 py-3 w-24"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{getFullName(m)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.nickname || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.team || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.username}</td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/members/${m.id}/summary`}
                        className="text-xs text-blue-600 hover:underline">ดูยอด</Link>
                    </td>
                    {isAdmin(user) && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(isSuperAdmin(user) || (isAdmin(user) && !['admin', 'superadmin'].includes(m.role))) && (
                            <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline">แก้ไข</button>
                          )}
                          {isSuperAdmin(user) && m.id !== user.id && (
                            <button onClick={() => handleDelete(m)} className="text-xs text-red-500 hover:underline">ลบ</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-gray-400">ไม่พบสมาชิก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editMember ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">คำนำหน้า *</label>
                  <select value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {PREFIXES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ *</label>
                  <input type="text" value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล *</label>
                  <input type="text" value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อเล่น</label>
                  <input type="text" value={form.nickname}
                    onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ทีม</label>
                  <input type="text" list="teams" value={form.team}
                    onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <datalist id="teams">{TEAMS.map((t) => <option key={t} value={t} />)}</datalist>
                </div>
              </div>

              {!editMember && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
                  <input type="text" value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {editMember ? 'รหัสผ่านใหม่ (ว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน *'}
                </label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required={!editMember} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สิทธิ์ *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{getRoleLabel(r)}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
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

'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ParticipantPicker from '@/components/ParticipantPicker';
import { api } from '@/lib/api';
import { getUser, isAdmin, getFullName } from '@/lib/auth';
import { ProjectStatusBadge, ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const STATUS_ACTIONS = {
  draft: [
    { label: 'ส่งอนุมัติ', status: 'pending', color: 'bg-yellow-500 hover:bg-yellow-600', roles: ['superadmin', 'admin', 'leader'] },
    { label: 'ยกเลิก', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600', roles: ['superadmin', 'admin', 'leader'] },
  ],
  pending: [
    { label: 'อนุมัติ', status: 'active', color: 'bg-green-600 hover:bg-green-700', roles: ['superadmin', 'admin'] },
    { label: 'ปฏิเสธ (กลับร่าง)', status: 'draft', color: 'bg-orange-500 hover:bg-orange-600', roles: ['superadmin', 'admin'] },
    { label: 'ยกเลิก', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600', roles: ['superadmin', 'admin'] },
  ],
  active: [
    { label: 'เสร็จสิ้น', status: 'completed', color: 'bg-green-600 hover:bg-green-700', roles: ['superadmin', 'admin'] },
    { label: 'ยกเลิก', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600', roles: ['superadmin', 'admin'] },
  ],
  completed: [],
  cancelled: [],
  rejected: [
    { label: 'กลับร่าง', status: 'draft', color: 'bg-gray-500 hover:bg-gray-600', roles: ['superadmin', 'admin'] },
  ],
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editParticipants, setEditParticipants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editForm, setEditForm] = useState({});
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    loadData();
    loadMembers();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.getProject(params.id);
      setProject(data);
      setSelectedParticipants(data.participants.map((p) => p.id));
      setEditForm({
        name: data.name,
        lead_id: data.lead_id,
        activity_date: data.activity_date ? data.activity_date.slice(0, 10) : '',
        activity_date_end: data.activity_date_end ? data.activity_date_end.slice(0, 10) : '',
        location: data.location || '',
        estimated_cost: data.estimated_cost || '',
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const data = await api.getMembers();
      setMembers(data);
      setLeaders(data.filter((m) => ['leader', 'admin', 'superadmin'].includes(m.role)));
    } catch {}
  }

  function canManage() {
    if (!user || !project) return false;
    if (isAdmin(user)) return true;
    if (user.role === 'leader' && project.lead_id === user.id) return true;
    return false;
  }

  async function handleStatusChange(newStatus) {
    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น "${newStatus}"?`)) return;
    setError('');
    try {
      const updated = await api.changeProjectStatus(params.id, newStatus);
      setProject((p) => ({ ...p, status: updated.status }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveInfo(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProject(params.id, {
        ...editForm,
        lead_id: editForm.lead_id ? parseInt(editForm.lead_id) : undefined,
      });
      setProject((p) => ({ ...p, ...updated }));
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveParticipants() {
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateParticipants(params.id, selectedParticipants);
      setProject((p) => ({ ...p, participants: updated }));
      // Reload to get fresh expense doc status
      await loadData();
      setEditParticipants(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateExpenseDoc() {
    setError('');
    try {
      const doc = await api.createExpenseDoc(params.id);
      router.push(`/expenses/${doc.id}`);
    } catch (err) {
      if (err.message.includes('มีเอกสาร')) {
        // Already exists, fetch it
        const existing = await api.getExpenseByProject(params.id);
        router.push(`/expenses/${existing.id}`);
      } else {
        setError(err.message);
      }
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">กำลังโหลด...</div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-500">{error || 'ไม่พบโครงการ'}</div>
      </Layout>
    );
  }

  const actions = (STATUS_ACTIONS[project.status] || []).filter((a) =>
    user && a.roles.includes(user.role)
  );

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button onClick={() => router.push('/projects')} className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
              ← กลับ
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <ProjectStatusBadge status={project.status} />
              {project.expense_document && (
                <ExpenseStatusBadge
                  status={project.expense_document.status}
                  sentToMember={project.expense_document.sent_to_member}
                />
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => handleStatusChange(a.status)}
                className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${a.color}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">รายละเอียดโครงการ</h2>
            {canManage() && project.status !== 'completed' && !editMode && (
              <button onClick={() => setEditMode(true)} className="text-sm text-blue-600 hover:underline">
                แก้ไข
              </button>
            )}
          </div>

          {editMode ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกิจกรรม *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {isAdmin(user) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หัวหน้าโครงการ</label>
                  <select
                    value={editForm.lead_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, lead_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {leaders.map((m) => (
                      <option key={m.id} value={m.id}>{getFullName(m)} ({m.role})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ดำเนินกิจกรรม</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">วันเริ่ม</label>
                    <input type="date" value={editForm.activity_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, activity_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">วันสิ้นสุด (ถ้ามี)</label>
                    <input type="date" value={editForm.activity_date_end}
                      min={editForm.activity_date || undefined}
                      onChange={(e) => setEditForm((f) => ({ ...f, activity_date_end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่</label>
                <input type="text" value={editForm.location}
                  onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าใช้จ่ายโดยประมาณ</label>
                <textarea value={editForm.estimated_cost}
                  onChange={(e) => setEditForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">หัวหน้าโครงการ</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.lead_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ทีม</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.lead_team || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">วันที่ดำเนินกิจกรรม</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {project.activity_date
                    ? (() => {
                        const fmt = (d) => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                        return project.activity_date_end
                          ? `${fmt(project.activity_date)} – ${fmt(project.activity_date_end)}`
                          : fmt(project.activity_date);
                      })()
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">สถานที่</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.location || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">ค่าใช้จ่ายโดยประมาณ</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{project.estimated_cost || '-'}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              ผู้เข้าร่วม ({editParticipants ? selectedParticipants.length : project.participants.length} คน)
            </h2>
            {canManage() && project.status !== 'completed' && (
              editParticipants ? null : (
                <button onClick={() => setEditParticipants(true)} className="text-sm text-blue-600 hover:underline">
                  แก้ไขรายชื่อ
                </button>
              )
            )}
          </div>

          {editParticipants ? (
            <div className="space-y-4">
              <ParticipantPicker
                members={members}
                selected={selectedParticipants}
                onChange={setSelectedParticipants}
              />
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setEditParticipants(false);
                    setSelectedParticipants(project.participants.map((p) => p.id));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveParticipants}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : `บันทึก (${selectedParticipants.length} คน)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {project.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    {(p.nickname || p.first_name).slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getFullName(p)}</p>
                    <p className="text-xs text-gray-400">{p.team || '-'}</p>
                  </div>
                </div>
              ))}
              {project.participants.length === 0 && (
                <p className="col-span-3 text-gray-400 text-sm py-2">ยังไม่มีผู้เข้าร่วม</p>
              )}
            </div>
          )}
        </div>

        {/* Expense Document */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">เอกสารเบิกจ่าย</h2>

          {project.expense_document ? (
            <div className="flex items-center justify-between">
              <div>
                <ExpenseStatusBadge
                  status={project.expense_document.status}
                  sentToMember={project.expense_document.sent_to_member}
                />
                {project.expense_document.total_amount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    ยอดรวม:{' '}
                    <span className="font-semibold">
                      ฿{Number(project.expense_document.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                )}
              </div>
              <Link
                href={`/expenses/${project.expense_document.id}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                ดูเอกสาร →
              </Link>
            </div>
          ) : canManage() && !['draft', 'cancelled', 'rejected'].includes(project.status) ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">ยังไม่มีเอกสารเบิกจ่ายสำหรับโครงการนี้</p>
              <button
                onClick={handleCreateExpenseDoc}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                สร้างเอกสารเบิกจ่าย
              </button>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">ยังไม่มีเอกสารเบิกจ่าย</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ParticipantPicker from '@/components/ParticipantPicker';
import { api } from '@/lib/api';
import { getUser, isAdmin, getFullName } from '@/lib/auth';

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    lead_id: '',
    activity_date: '',
    activity_date_end: '',
    location: '',
    estimated_cost: '',
    participant_ids: [],
  });

  useEffect(() => {
    const u = getUser();
    if (!u || u.role === 'user') {
      router.replace('/projects');
      return;
    }
    setUser(u);
    if (u.role === 'leader') {
      setForm((f) => ({ ...f, lead_id: u.id }));
    }
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await api.getMembers();
      setMembers(data);
      setLeaders(data.filter((m) => ['leader', 'admin', 'superadmin'].includes(m.role)));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        ...form,
        lead_id: form.lead_id ? parseInt(form.lead_id) : undefined,
        participant_ids: form.participant_ids,
      };
      const project = await api.createProject(body);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            ← กลับ
          </button>
          <h1 className="text-xl font-bold text-gray-800">สร้างโครงการใหม่</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 border-b pb-2">ข้อมูลโครงการ</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อกิจกรรม *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            {isAdmin(user) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หัวหน้าโครงการ *</label>
                <select
                  value={form.lead_id}
                  onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">-- เลือกหัวหน้าโครงการ --</option>
                  {leaders.map((m) => (
                    <option key={m.id} value={m.id}>
                      {getFullName(m)} ({m.nickname}) - {m.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user.role === 'leader' && (
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                หัวหน้าโครงการ: {user.prefix}{user.firstName} {user.lastName} (ตัวท่านเอง)
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ดำเนินกิจกรรม</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">วันเริ่ม</label>
                  <input
                    type="date"
                    value={form.activity_date}
                    onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">วันสิ้นสุด (ถ้ามี)</label>
                  <input
                    type="date"
                    value={form.activity_date_end}
                    min={form.activity_date || undefined}
                    onChange={(e) => setForm((f) => ({ ...f, activity_date_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ค่าใช้จ่ายโดยประมาณ</label>
              <textarea
                value={form.estimated_cost}
                onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                placeholder="เช่น 10,000 บาท หรือรายละเอียดค่าใช้จ่าย"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">รายชื่อผู้เข้าร่วม</h2>
            <ParticipantPicker
              members={members}
              selected={form.participant_ids}
              onChange={(ids) => setForm((f) => ({ ...f, participant_ids: ids }))}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              {loading ? 'กำลังสร้าง...' : 'สร้างโครงการ'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

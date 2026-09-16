'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ParticipantPicker from '@/components/ParticipantPicker';
import { api } from '@/lib/api';
import { getUser, isAdmin, getFullName } from '@/lib/auth';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function FormSection({ title, children }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-stroke">
        <span className="block w-1 h-5 bg-primary rounded-full" />
        <h2 className="font-semibold text-boxdark">{title}</h2>
      </div>
      {children}
    </div>
  );
}

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

export default function NewProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', lead_id: '', activity_date: '', activity_date_end: '', location: '', estimated_cost: '', participant_ids: [] });

  useEffect(() => {
    const u = getUser();
    if (!u || u.role === 'user') { router.replace('/projects'); return; }
    setUser(u);
    if (u.role === 'leader') setForm((f) => ({ ...f, lead_id: u.id }));
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await api.getMembers();
      setMembers(data);
      setLeaders(data.filter((m) => ['leader', 'admin', 'superadmin'].includes(m.role)));
    } catch (err) { console.error(err); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const body = { ...form, lead_id: form.lead_id ? parseInt(form.lead_id) : undefined };
      const project = await api.createProject(body);
      router.push(`/projects/${project.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-body hover:text-boxdark mb-6 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />กลับ
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSection title="ข้อมูลโครงการ">
            <FormField label="ชื่อกิจกรรม" required>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input" placeholder="ระบุชื่อกิจกรรมหรือโครงการ" required />
            </FormField>

            {isAdmin(user) && (
              <FormField label="หัวหน้าโครงการ" required>
                <select value={form.lead_id} onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))} className="form-select" required>
                  <option value="">-- เลือกหัวหน้าโครงการ --</option>
                  {leaders.map((m) => (
                    <option key={m.id} value={m.id}>{getFullName(m)}{m.nickname ? ` (${m.nickname})` : ''} · {m.role}</option>
                  ))}
                </select>
              </FormField>
            )}

            {user.role === 'leader' && (
              <div className="alert-info">
                หัวหน้าโครงการ: <span className="font-semibold">{user.prefix}{user.firstName} {user.lastName}</span> (ตัวท่านเอง)
              </div>
            )}

            <FormField label="วันที่ดำเนินกิจกรรม">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-bodydark mb-1">วันเริ่ม</p>
                  <input type="date" value={form.activity_date} onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))} className="form-input" />
                </div>
                <div>
                  <p className="text-xs text-bodydark mb-1">วันสิ้นสุด (ถ้ามี)</p>
                  <input type="date" value={form.activity_date_end} min={form.activity_date || undefined}
                    onChange={(e) => setForm((f) => ({ ...f, activity_date_end: e.target.value }))} className="form-input" />
                </div>
              </div>
            </FormField>

            <FormField label="สถานที่">
              <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="form-input" placeholder="เช่น โรงแรม A กรุงเทพฯ" />
            </FormField>

            <FormField label="ค่าใช้จ่ายโดยประมาณ">
              <textarea value={form.estimated_cost} onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                placeholder="เช่น 10,000 บาท หรือรายละเอียด" rows={3} className="form-input resize-none" />
            </FormField>
          </FormSection>

          <FormSection title="รายชื่อผู้เข้าร่วม">
            <ParticipantPicker members={members} selected={form.participant_ids}
              onChange={(ids) => setForm((f) => ({ ...f, participant_ids: ids }))} />
          </FormSection>

          {error && <div className="alert-error"><span>⚠</span><span>{error}</span></div>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="btn-outline flex-1 justify-center">ยกเลิก</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />กำลังสร้าง...</>
              ) : 'สร้างโครงการ'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

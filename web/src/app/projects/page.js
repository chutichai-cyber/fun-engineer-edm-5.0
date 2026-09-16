'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, isLeader } from '@/lib/auth';
import { ProjectStatusBadge, ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    setUser(getUser());
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = projects.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = user && (isAdmin(user) || user.role === 'leader');
  const isUserRole = user && user.role === 'user';

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">โครงการทั้งหมด</h1>
            <p className="text-gray-500 text-sm mt-0.5">{projects.length} โครงการ</p>
          </div>
          {canCreate && (
            <Link
              href="/projects/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + สร้างโครงการใหม่
            </Link>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="ค้นหาชื่อโครงการ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full max-w-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : isUserRole ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อกิจกรรม</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ผู้ดูแลโครงการ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะโครงการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                    <td className="px-4 py-3 font-medium text-blue-600">{p.name}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <span>{p.lead_name}</span>
                      {p.lead_nickname && <span className="text-gray-400 ml-1">({p.lead_nickname})</span>}
                      {p.lead_id === user?.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">ฉัน</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="3" className="px-4 py-12 text-center text-gray-400">
                      {search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อกิจกรรม</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">หัวหน้า</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">วันที่</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">ผู้เข้าร่วม</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะโครงการ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะเอกสาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-blue-600">{p.name}</p>
                      {p.location && <p className="text-xs text-gray-400 mt-0.5">{p.location}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span>{p.lead_name}</span>
                      {p.lead_nickname && <span className="text-gray-400 ml-1">({p.lead_nickname})</span>}
                      {p.lead_id === user?.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">ฉัน</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.activity_date
                        ? new Date(p.activity_date).toLocaleDateString('th-TH')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.participant_count}</td>
                    <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.expense_status ? (
                        <ExpenseStatusBadge status={p.expense_status} sentToMember={p.sent_to_member} />
                      ) : (
                        <span className="text-gray-400 text-xs">ไม่มี</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                      {search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

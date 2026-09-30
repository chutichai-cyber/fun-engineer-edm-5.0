'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin } from '@/lib/auth';
import { ProjectStatusBadge, ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, PlusIcon, FolderOpenIcon } from '@heroicons/react/24/outline';

export default function ProjectsPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => { setUser(getUser()); loadProjects(); }, []);

  async function loadProjects() {
    try { const data = await api.getProjects(); setProjects(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
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
            <h1 className="text-xl font-bold text-boxdark">
              {isUserRole ? 'โครงการที่เข้าร่วม' : 'โครงการทั้งหมด'}
            </h1>
            <p className="text-body text-sm mt-0.5">{projects.length} โครงการ</p>
          </div>
          {canCreate && (
            <Link href="/projects/new" className="btn-primary">
              <PlusIcon className="w-4 h-4" />สร้างโครงการใหม่
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-5 relative max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bodydark" />
          <input
            type="text" placeholder="ค้นหาชื่อโครงการ..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stroke rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
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
                  <th className="table-head px-5 py-3 text-left">ชื่อกิจกรรม</th>
                  <th className="table-head px-5 py-3 text-left">ผู้ดูแลโครงการ</th>
                  {!isUserRole && (
                    <>
                      <th className="table-head px-5 py-3 text-left">วันที่</th>
                      <th className="table-head px-5 py-3 text-center">ผู้เข้าร่วม</th>
                    </>
                  )}
                  <th className="table-head px-5 py-3 text-left">สถานะโครงการ</th>
                  {!isUserRole && <th className="table-head px-5 py-3 text-left">สถานะเอกสาร</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="table-row cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-primary">{p.name}</p>
                      {p.location && <p className="text-xs text-bodydark mt-0.5">{p.location}</p>}
                    </td>
                    <td className="px-5 py-4 text-body">
                      <span>{p.lead_name}</span>
                      {p.lead_nickname && <span className="text-bodydark ml-1">({p.lead_nickname})</span>}
                      {p.lead_id === user?.id && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">ฉัน</span>
                      )}
                    </td>
                    {!isUserRole && (
                      <>
                        <td className="px-5 py-4 text-body text-xs">
                          {p.activity_date ? new Date(p.activity_date).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="px-5 py-4 text-center text-body">{p.participant_count}</td>
                      </>
                    )}
                    <td className="px-5 py-4"><ProjectStatusBadge status={p.status} /></td>
                    {!isUserRole && (
                      <td className="px-5 py-4">
                        {p.expense_status
                          ? <ExpenseStatusBadge status={p.expense_status} sentToMember={p.sent_to_member} />
                          : <span className="text-bodydark text-xs">ไม่มี</span>}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isUserRole ? 3 : 6}>
                      <div className="flex flex-col items-center justify-center py-16 text-bodydark">
                        <FolderOpenIcon className="w-12 h-12 mb-3 text-meta-9" />
                        <p className="text-sm">{search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ'}</p>
                      </div>
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

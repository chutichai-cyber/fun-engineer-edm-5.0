'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, getRoleLabel } from '@/lib/auth';
import { ProjectStatusBadge, ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [leaderStats, setLeaderStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    loadData(u);
  }, []);

  async function loadData(u) {
    if (!u) return;
    setLoading(true);
    try {
      const promises = [api.getMyDashboard()];
      if (isAdmin(u)) promises.push(api.getDashboardOverview());
      if (u.role === 'leader') promises.push(api.getLeaderDashboard());

      const [myData, ...rest] = await Promise.all(promises);
      setMyStats(myData);
      if (isAdmin(u)) setOverview(rest[0]);
      if (u.role === 'leader') setLeaderStats(rest[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const statusLabels = {
    draft: 'ร่าง', pending: 'รออนุมัติ', active: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก', rejected: 'ปฏิเสธ',
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">แดชบอร์ด</h1>
          <p className="text-gray-500 text-sm mt-1">
            ยินดีต้อนรับ {user.prefix}{user.firstName} ({getRoleLabel(user.role)})
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : (
          <div className="space-y-6">
            {/* Admin overview */}
            {isAdmin(user) && overview && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">ภาพรวมระบบ</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {overview.projectStats.map((s) => (
                    <div key={s.status} className="bg-white rounded-xl p-4 shadow-sm">
                      <p className="text-2xl font-bold text-gray-800">{s.count}</p>
                      <p className="text-sm text-gray-500 mt-0.5">โครงการ{statusLabels[s.status] || s.status}</p>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-gray-600 mb-2">โครงการล่าสุด</h3>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อโครงการ</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">หัวหน้า</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overview.recentProjects.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <ProjectStatusBadge status={p.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">{p.lead_name}</td>
                          <td className="px-4 py-3 text-right text-gray-800">
                            {p.total_amount ? `฿${fmt(p.total_amount)}` : '-'}
                          </td>
                        </tr>
                      ))}
                      {overview.recentProjects.length === 0 && (
                        <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-400">ไม่มีโครงการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Leader stats */}
            {user.role === 'leader' && leaderStats && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">โครงการที่ดูแล</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{leaderStats.projects.length}</p>
                    <p className="text-sm text-gray-500 mt-0.5">โครงการทั้งหมด</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-2xl font-bold text-green-600">฿{fmt(leaderStats.totalBudget)}</p>
                    <p className="text-sm text-gray-500 mt-0.5">ยอดรวมทุกโครงการ</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อโครงการ</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะโครงการ</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะเอกสาร</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaderStats.projects.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">
                              {p.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            {p.expense_status
                              ? <ExpenseStatusBadge status={p.expense_status} sentToMember={p.sent_to_member} />
                              : <span className="text-gray-400 text-xs">ยังไม่มีเอกสาร</span>}
                          </td>
                          <td className="px-4 py-3 text-right">{p.total_amount ? `฿${fmt(p.total_amount)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* My projects (user role only) */}
            {user.role === 'user' && myStats?.projects && (
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">โครงการที่เข้าร่วม</h2>
                {myStats.projects.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
                    ยังไม่มีโครงการที่เข้าร่วม
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อกิจกรรม</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะโครงการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {myStats.projects.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                                {p.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* My expense summary */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">สรุปยอดของฉัน</h2>
              {myStats && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
                      <p className="text-xl font-bold text-blue-600">฿{fmt(myStats.totals.total60)}</p>
                      <p className="text-sm text-gray-500 mt-0.5">ยอดสะสม 60%</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
                      <p className="text-xl font-bold text-purple-600">฿{fmt(myStats.totals.total40)}</p>
                      <p className="text-sm text-gray-500 mt-0.5">ยอดสะสม 40%</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
                      <p className="text-xl font-bold text-green-600">฿{fmt(myStats.totals.totalShare)}</p>
                      <p className="text-sm text-gray-500 mt-0.5">ยอดรวมสะสม</p>
                    </div>
                  </div>

                  {/* Welfare budget cards */}
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">งบประมาณสวัสดิการ</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-xs text-blue-600">ยอดสะสม (60%)</p>
                      <p className="text-lg font-bold text-blue-700 mt-0.5">
                        ฿{fmt(myStats.welfare?.accumulated_60_percent)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                      <p className="text-xs text-green-600">ยอดเบิกได้ตามสวัสดิการ</p>
                      <p className="text-lg font-bold text-green-700 mt-0.5">
                        ฿{fmt(myStats.welfare?.claimable_amount)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">งบประมาณสวัสดิการ</p>
                      <p className="text-lg font-bold text-gray-700 mt-0.5">
                        ฿{fmt(myStats.welfare?.budget_amount || 1800)}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 border ${Number(myStats.welfare?.balance_amount) < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs text-gray-500">Balance คงเหลือ</p>
                      {Number(myStats.welfare?.balance_amount) < 0 ? (
                        <p className="text-lg font-bold text-red-500 mt-0.5">฿0.00</p>
                      ) : (
                        <p className="text-lg font-bold text-gray-700 mt-0.5">
                          ฿{fmt(myStats.welfare?.balance_amount ?? (myStats.welfare?.budget_amount || 1800))}
                        </p>
                      )}
                    </div>
                  </div>

                  {myStats.shares.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-gray-600">โครงการ</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-600">ส่วน 60%</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-600">ส่วน 40%</th>
                            <th className="text-right px-4 py-3 font-medium text-gray-600">รวม</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {myStats.shares.map((s) => (
                            <tr key={s.document_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Link href={`/expenses/${s.document_id}`} className="text-blue-600 hover:underline font-medium">
                                  {s.project_name}
                                </Link>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {s.activity_date && (
                                    <p className="text-xs text-gray-400">
                                      {new Date(s.activity_date).toLocaleDateString('th-TH')}
                                    </p>
                                  )}
                                  <ExpenseStatusBadge status={s.expense_status} sentToMember={s.sent_to_member} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">฿{fmt(s.share_60)}</td>
                              <td className="px-4 py-3 text-right">฿{fmt(s.share_40)}</td>
                              <td className="px-4 py-3 text-right font-semibold">฿{fmt(s.total_share)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
                      ยังไม่มียอดที่ส่งให้
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}

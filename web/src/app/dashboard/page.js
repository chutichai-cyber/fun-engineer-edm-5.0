'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, getRoleLabel } from '@/lib/auth';
import { ProjectStatusBadge, ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { FolderOpenIcon, BanknotesIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({ label, value, sub, icon: Icon, color = 'primary' }) {
  const palette = {
    primary: { ring: 'bg-primary',   text: 'text-primary' },
    success: { ring: 'bg-success',   text: 'text-success' },
    warning: { ring: 'bg-warning',   text: 'text-warning' },
    meta5:   { ring: 'bg-meta-5',    text: 'text-meta-5' },
    body:    { ring: 'bg-bodydark2', text: 'text-boxdark' },
  };
  const c = palette[color] || palette.primary;
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`w-12 h-12 ${c.ring} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-body mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${c.text} leading-tight truncate`}>{value}</p>
        {sub && <p className="text-xs text-bodydark mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="block w-1 h-5 bg-primary rounded-full" />
      <h2 className="text-base font-semibold text-boxdark">{children}</h2>
    </div>
  );
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr>
        {cols.map((c, i) => (
          <th key={i} className={`px-5 py-3 text-xs font-semibold text-bodydark uppercase tracking-wide bg-whiter border-b border-stroke ${c.right ? 'text-right' : 'text-left'}`}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

const statusLabels = {
  draft: 'ร่าง', pending: 'รออนุมัติ', active: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก', rejected: 'ปฏิเสธ',
};
const statColors = ['primary', 'warning', 'success', 'meta5', 'body'];

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

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* Welcome */}
        <div>
          <p className="text-body text-sm">ยินดีต้อนรับกลับมา 👋</p>
          <h2 className="text-2xl font-bold text-boxdark mt-0.5">
            {user.prefix}{user.firstName} {user.lastName}
          </h2>
          <p className="text-sm text-bodydark mt-0.5">
            {getRoleLabel(user.role)}{user.team ? ` · ${user.team}` : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-bodydark">
            <div className="flex items-center gap-3"><div className="spinner" /><span className="text-sm">กำลังโหลด...</span></div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Admin overview */}
            {isAdmin(user) && overview && (
              <section>
                <SectionTitle>ภาพรวมระบบ</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {overview.projectStats.map((s, i) => (
                    <StatCard key={s.status} label={`โครงการ${statusLabels[s.status] || s.status}`}
                      value={s.count} icon={FolderOpenIcon} color={statColors[i % statColors.length]} />
                  ))}
                </div>
                <SectionTitle>โครงการล่าสุด</SectionTitle>
                <div className="card">
                  <table className="w-full text-sm">
                    <TableHead cols={[{ label: 'ชื่อโครงการ' }, { label: 'สถานะ' }, { label: 'หัวหน้า' }, { label: 'ยอดรวม', right: true }]} />
                    <tbody>
                      {overview.recentProjects.map((p) => (
                        <tr key={p.id} className="table-row">
                          <td className="px-5 py-3.5">
                            <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                          </td>
                          <td className="px-5 py-3.5"><ProjectStatusBadge status={p.status} /></td>
                          <td className="px-5 py-3.5 text-body">{p.lead_name}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-boxdark">
                            {p.total_amount ? `฿${fmt(p.total_amount)}` : <span className="text-bodydark">-</span>}
                          </td>
                        </tr>
                      ))}
                      {overview.recentProjects.length === 0 && (
                        <tr><td colSpan="4" className="px-5 py-10 text-center text-bodydark">ไม่มีโครงการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Leader stats */}
            {user.role === 'leader' && leaderStats && (
              <section>
                <SectionTitle>โครงการที่ดูแล</SectionTitle>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <StatCard label="โครงการทั้งหมด" value={leaderStats.projects.length} icon={FolderOpenIcon} color="primary" />
                  <StatCard label="ยอดรวมทุกโครงการ" value={`฿${fmt(leaderStats.totalBudget)}`} icon={BanknotesIcon} color="success" />
                </div>
                <div className="card">
                  <table className="w-full text-sm">
                    <TableHead cols={[{ label: 'ชื่อโครงการ' }, { label: 'สถานะโครงการ' }, { label: 'สถานะเอกสาร' }, { label: 'ยอดรวม', right: true }]} />
                    <tbody>
                      {leaderStats.projects.map((p) => (
                        <tr key={p.id} className="table-row">
                          <td className="px-5 py-3.5">
                            <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                          </td>
                          <td className="px-5 py-3.5"><ProjectStatusBadge status={p.status} /></td>
                          <td className="px-5 py-3.5">
                            {p.expense_status
                              ? <ExpenseStatusBadge status={p.expense_status} sentToMember={p.sent_to_member} />
                              : <span className="text-bodydark text-xs">ยังไม่มีเอกสาร</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-boxdark">
                            {p.total_amount ? `฿${fmt(p.total_amount)}` : <span className="text-bodydark">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* User participated projects */}
            {user.role === 'user' && myStats?.projects && (
              <section>
                <SectionTitle>โครงการที่เข้าร่วม</SectionTitle>
                {myStats.projects.length === 0 ? (
                  <div className="card p-10 text-center text-bodydark">ยังไม่มีโครงการที่เข้าร่วม</div>
                ) : (
                  <div className="card">
                    <table className="w-full text-sm">
                      <TableHead cols={[{ label: 'ชื่อกิจกรรม' }, { label: 'สถานะโครงการ' }]} />
                      <tbody>
                        {myStats.projects.map((p) => (
                          <tr key={p.id} className="table-row">
                            <td className="px-5 py-3.5">
                              <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                            </td>
                            <td className="px-5 py-3.5"><ProjectStatusBadge status={p.status} /></td>
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
              <SectionTitle>สรุปยอดของฉัน</SectionTitle>
              {myStats && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <StatCard label="ยอดสะสม 60%" value={`฿${fmt(myStats.totals.total60)}`} icon={ChartBarIcon} color="primary" />
                    <StatCard label="ยอดสะสม 40%" value={`฿${fmt(myStats.totals.total40)}`} icon={ArrowTrendingUpIcon} color="meta5" />
                    <StatCard label="ยอดรวมสะสม" value={`฿${fmt(myStats.totals.totalShare)}`} icon={BanknotesIcon} color="success" />
                  </div>

                  {/* Welfare mini cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'ยอดสะสม (60%)', val: fmt(myStats.welfare?.accumulated_60_percent), cls: 'bg-primary/10 border-primary/20 text-primary' },
                      { label: 'ยอดเบิกได้ตามสวัสดิการ', val: fmt(myStats.welfare?.claimable_amount), cls: 'bg-success/10 border-success/20 text-success' },
                      { label: 'งบประมาณสวัสดิการ', val: fmt(myStats.welfare?.budget_amount || 1800), cls: 'bg-whiter border-stroke text-boxdark' },
                      {
                        label: 'Balance คงเหลือ',
                        val: Number(myStats.welfare?.balance_amount) < 0 ? '0.00' : fmt(myStats.welfare?.balance_amount ?? (myStats.welfare?.budget_amount || 1800)),
                        cls: Number(myStats.welfare?.balance_amount) < 0 ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-whiter border-stroke text-boxdark',
                      },
                    ].map((w) => (
                      <div key={w.label} className={`rounded-xl p-4 border ${w.cls}`}>
                        <p className="text-xs opacity-70 mb-1">{w.label}</p>
                        <p className="text-lg font-bold">฿{w.val}</p>
                      </div>
                    ))}
                  </div>

                  {myStats.shares.length > 0 ? (
                    <div className="card">
                      <table className="w-full text-sm">
                        <TableHead cols={[
                          { label: 'โครงการ' },
                          { label: 'ส่วน 60%', right: true },
                          { label: 'ส่วน 40%', right: true },
                          { label: 'รวม', right: true },
                        ]} />
                        <tbody>
                          {myStats.shares.map((s) => (
                            <tr key={s.document_id} className="table-row">
                              <td className="px-5 py-3.5">
                                <Link href={`/expenses/${s.document_id}`} className="font-medium text-primary hover:underline">{s.project_name}</Link>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {s.activity_date && <p className="text-xs text-bodydark">{new Date(s.activity_date).toLocaleDateString('th-TH')}</p>}
                                  <ExpenseStatusBadge status={s.expense_status} sentToMember={s.sent_to_member} />
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right text-body">฿{fmt(s.share_60)}</td>
                              <td className="px-5 py-3.5 text-right text-body">฿{fmt(s.share_40)}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-boxdark">฿{fmt(s.total_share)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="card p-10 text-center text-bodydark">ยังไม่มียอดที่ส่งให้</div>
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

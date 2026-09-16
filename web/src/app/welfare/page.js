'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin } from '@/lib/auth';
import { BanknotesIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({ label, value, sub, icon: Icon, color = 'primary' }) {
  const palette = {
    primary: { ring: 'bg-primary', text: 'text-primary' },
    success: { ring: 'bg-success', text: 'text-success' },
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
        <p className={`text-2xl font-bold ${c.text} leading-tight`}>{value}</p>
        {sub && <p className="text-xs text-bodydark mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BalanceCell({ balance }) {
  const val = Number(balance);
  if (val < 0) return (
    <span className="font-bold text-danger">
      ฿0.00 <span className="text-xs font-normal text-danger/70">(เกิน {fmt(Math.abs(val))})</span>
    </span>
  );
  return <span className="font-bold text-success">฿{fmt(val)}</span>;
}

export default function WelfarePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdmin(u)) { router.replace('/dashboard'); return; }
    api.getWelfareDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalAccumulated = data?.members.reduce((s, m) => s + Number(m.accumulated_60_percent), 0) || 0;
  const totalClaimable = data?.members.reduce((s, m) => s + Number(m.claimable_amount), 0) || 0;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-boxdark">งบประมาณสวัสดิการ</h1>
          <p className="text-body text-sm mt-0.5">
            สะสมจากยอด 60% ทุกโครงการที่ส่งยอดแล้ว · ไม่มีรีเซ็ตรายปี
            {data && ` · งบ ฿${fmt(data.budget)} / คน`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-bodydark">
            <div className="flex items-center gap-3"><div className="spinner" /><span className="text-sm">กำลังโหลด...</span></div>
          </div>
        ) : data && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <StatCard label="ยอดสะสม 60% รวมทั้งระบบ" value={`฿${fmt(totalAccumulated)}`} icon={ChartBarIcon} color="primary" />
              <StatCard label="ยอดเบิกได้รวมทั้งระบบ" value={`฿${fmt(totalClaimable)}`} icon={BanknotesIcon} color="success" sub="หลังหัก cap งบประมาณ" />
              <StatCard label="จำนวนสมาชิก" value={`${data.members.length} คน`} icon={UserGroupIcon} color="body" />
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-boxdark">รายละเอียดงบสวัสดิการรายบุคคล</h2>
                <p className="text-xs text-body mt-0.5">งบประมาณ ฿{fmt(data.budget)} / คน · Balance = งบประมาณ − ยอดสะสม</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      { l: 'ชื่อสมาชิก', r: false },
                      { l: 'ทีม', r: false },
                      { l: 'ยอดสะสม 60%', r: true, cls: 'text-primary' },
                      { l: 'ยอดเบิกได้', r: true, cls: 'text-success' },
                      { l: 'งบประมาณ', r: true },
                      { l: 'Balance คงเหลือ', r: true },
                      { l: 'อัปเดต', r: false },
                    ].map(({ l, r, cls }) => (
                      <th key={l} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide bg-whiter border-b border-stroke ${cls || 'text-bodydark'} ${r ? 'text-right' : 'text-left'}`}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.id} className="table-row">
                      <td className="px-5 py-4 font-medium text-boxdark">
                        {m.prefix}{m.first_name} {m.last_name}
                        {m.nickname && <span className="text-bodydark text-xs ml-1.5">({m.nickname})</span>}
                      </td>
                      <td className="px-5 py-4 text-bodydark text-xs">{m.team || '-'}</td>
                      <td className="px-5 py-4 text-right font-semibold text-primary">฿{fmt(m.accumulated_60_percent)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-success">฿{fmt(m.claimable_amount)}</td>
                      <td className="px-5 py-4 text-right text-body">฿{fmt(data.budget)}</td>
                      <td className="px-5 py-4 text-right"><BalanceCell balance={m.balance_amount} /></td>
                      <td className="px-5 py-4 text-bodydark text-xs">
                        {m.last_updated_at
                          ? new Date(m.last_updated_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : <span className="text-meta-9">ยังไม่มีข้อมูล</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

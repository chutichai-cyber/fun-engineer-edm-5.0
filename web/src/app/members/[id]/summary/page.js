'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function MiniCard({ label, value, cls }) {
  return (
    <div className={`rounded-xl p-4 border ${cls}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

export default function MemberSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, [params.id]);

  async function loadData() {
    setLoading(true);
    try { setData(await api.getMemberDashboard(params.id)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-body hover:text-boxdark mb-6 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />กลับ
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-bodydark">
            <div className="flex items-center gap-3"><div className="spinner" /><span className="text-sm">กำลังโหลด...</span></div>
          </div>
        ) : error ? (
          <div className="alert-error"><span>⚠</span><span>{error}</span></div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-boxdark">
                {data.member.prefix}{data.member.first_name} {data.member.last_name}
              </h1>
              <p className="text-body text-sm mt-0.5">
                {data.member.team || 'ไม่ระบุทีม'}{data.member.nickname && ` · ${data.member.nickname}`}
              </p>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <MiniCard label="รวม 60%" value={`฿${fmt(data.totals.total60)}`} cls="bg-primary/10 border-primary/20 text-primary" />
              <MiniCard label="รวม 40%" value={`฿${fmt(data.totals.total40)}`} cls="bg-meta-5/10 border-meta-5/20 text-meta-5" />
              <MiniCard label="รวมทั้งหมด" value={`฿${fmt(data.totals.totalShare)}`} cls="bg-success/10 border-success/20 text-success" />
            </div>

            {/* Welfare */}
            <div className="flex items-center gap-2 mb-3">
              <span className="block w-1 h-5 bg-primary rounded-full" />
              <h2 className="text-sm font-semibold text-boxdark">งบประมาณสวัสดิการ</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MiniCard label="ยอดสะสม (60%)" value={`฿${fmt(data.welfare?.accumulated_60_percent)}`} cls="bg-primary/10 border-primary/20 text-primary" />
              <MiniCard label="ยอดเบิกได้ตามสวัสดิการ" value={`฿${fmt(data.welfare?.claimable_amount)}`} cls="bg-success/10 border-success/20 text-success" />
              <MiniCard label="งบประมาณสวัสดิการ" value={`฿${fmt(data.welfare?.budget_amount || 1800)}`} cls="bg-whiter border-stroke text-boxdark" />
              <MiniCard
                label="Balance คงเหลือ"
                value={Number(data.welfare?.balance_amount) < 0 ? '฿0.00' : `฿${fmt(data.welfare?.balance_amount ?? (data.welfare?.budget_amount || 1800))}`}
                cls={Number(data.welfare?.balance_amount) < 0 ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-whiter border-stroke text-boxdark'}
              />
            </div>

            {/* History */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-boxdark">ประวัติยอดรายโครงการ</h2>
                <p className="text-xs text-body mt-0.5">เฉพาะเอกสารที่อนุมัติและส่งยอดแล้ว</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {[
                      { l: 'โครงการ', r: false },
                      { l: 'วันที่', r: false },
                      { l: 'ส่วน 60%', r: true, cls: 'text-primary' },
                      { l: 'ส่วน 40%', r: true, cls: 'text-meta-5' },
                      { l: 'รวม', r: true },
                    ].map(({ l, r, cls }) => (
                      <th key={l} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide bg-whiter border-b border-stroke ${cls || 'text-bodydark'} ${r ? 'text-right' : 'text-left'}`}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.shares.map((s) => (
                    <tr key={s.document_id} className="table-row">
                      <td className="px-5 py-4">
                        <Link href={`/projects/${s.project_id}`} className="font-medium text-primary hover:underline">{s.project_name}</Link>
                      </td>
                      <td className="px-5 py-4 text-bodydark text-xs">
                        {s.activity_date ? new Date(s.activity_date).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-primary">฿{fmt(s.share_60)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-meta-5">฿{fmt(s.share_40)}</td>
                      <td className="px-5 py-4 text-right font-bold text-boxdark">฿{fmt(s.total_share)}</td>
                    </tr>
                  ))}
                  {data.shares.length === 0 && (
                    <tr><td colSpan="5" className="px-5 py-10 text-center text-bodydark">ยังไม่มียอดที่ส่งให้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

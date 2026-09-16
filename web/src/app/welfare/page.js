'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser, isAdmin, getFullName } from '@/lib/auth';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function BalanceCell({ balance }) {
  const val = Number(balance);
  if (val < 0) {
    return (
      <span className="font-bold text-red-500">
        ฿0.00 <span className="text-xs font-normal">(เกิน {fmt(Math.abs(val))})</span>
      </span>
    );
  }
  return <span className="font-bold text-green-600">฿{fmt(val)}</span>;
}

export default function WelfarePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdmin(u)) {
      router.replace('/dashboard');
      return;
    }
    api.getWelfareDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalAccumulated = data?.members.reduce((s, m) => s + Number(m.accumulated_60_percent), 0) || 0;
  const totalClaimable = data?.members.reduce((s, m) => s + Number(m.claimable_amount), 0) || 0;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">งบประมาณสวัสดิการ</h1>
          <p className="text-gray-500 text-sm mt-1">
            งบสวัสดิการ{data ? ` ฿${fmt(data.budget)}` : ' ...'} บาทต่อคน · สะสมจากยอด 60% ทุกโครงการที่ส่งยอดแล้ว · ไม่มีรีเซ็ตรายปี
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
                <p className="text-xs text-gray-500">ยอดสะสม 60% รวมทั้งระบบ</p>
                <p className="text-xl font-bold text-blue-600 mt-1">฿{fmt(totalAccumulated)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
                <p className="text-xs text-gray-500">ยอดเบิกได้รวมทั้งระบบ (capped)</p>
                <p className="text-xl font-bold text-green-600 mt-1">฿{fmt(totalClaimable)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-gray-400">
                <p className="text-xs text-gray-500">จำนวนสมาชิก</p>
                <p className="text-xl font-bold text-gray-700 mt-1">{data.members.length} คน</p>
              </div>
            </div>

            {/* Members table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">รายละเอียดงบสวัสดิการรายบุคคล</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  งบประมาณ ฿{fmt(data.budget)} / คน · Balance = งบประมาณ − ยอดสะสม (แสดง ฿0.00 สีแดงเมื่อเกินงบ)
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อสมาชิก</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ทีม</th>
                    <th className="text-right px-4 py-3 font-medium text-blue-600">ยอดสะสม 60%</th>
                    <th className="text-right px-4 py-3 font-medium text-green-600">ยอดเบิกได้</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">งบประมาณ</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Balance คงเหลือ</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">อัปเดตล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {m.prefix}{m.first_name} {m.last_name}
                        <span className="text-gray-400 text-xs ml-1">({m.nickname})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.team || '-'}</td>
                      <td className="px-4 py-3 text-right text-blue-600">฿{fmt(m.accumulated_60_percent)}</td>
                      <td className="px-4 py-3 text-right text-green-600">฿{fmt(m.claimable_amount)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">฿{fmt(data.budget)}</td>
                      <td className="px-4 py-3 text-right">
                        <BalanceCell balance={m.balance_amount} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {m.last_updated_at
                          ? new Date(m.last_updated_at).toLocaleString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : 'ยังไม่มีข้อมูล'}
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

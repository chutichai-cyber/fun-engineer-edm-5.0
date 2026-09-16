'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import Link from 'next/link';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MemberSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    loadData(u);
  }, [params.id]);

  async function loadData(u) {
    setLoading(true);
    try {
      const result = await api.getMemberDashboard(params.id);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">
          ← กลับ
        </button>

        {loading ? (
          <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">
                สรุปยอด: {data.member.prefix}{data.member.first_name} {data.member.last_name}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{data.member.team}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500">
                <p className="text-xs text-gray-500">รวม 60%</p>
                <p className="text-xl font-bold text-blue-600 mt-1">฿{fmt(data.totals.total60)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
                <p className="text-xs text-gray-500">รวม 40%</p>
                <p className="text-xl font-bold text-purple-600 mt-1">฿{fmt(data.totals.total40)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
                <p className="text-xs text-gray-500">รวมทั้งหมด</p>
                <p className="text-xl font-bold text-green-600 mt-1">฿{fmt(data.totals.totalShare)}</p>
              </div>
            </div>

            {/* Welfare budget */}
            <h2 className="text-sm font-semibold text-gray-600 mb-2">งบประมาณสวัสดิการ</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs text-blue-600">ยอดสะสม (60%)</p>
                <p className="text-lg font-bold text-blue-700 mt-0.5">
                  ฿{fmt(data.welfare?.accumulated_60_percent)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-xs text-green-600">ยอดเบิกได้ตามสวัสดิการ</p>
                <p className="text-lg font-bold text-green-700 mt-0.5">
                  ฿{fmt(data.welfare?.claimable_amount)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500">งบประมาณสวัสดิการ</p>
                <p className="text-lg font-bold text-gray-700 mt-0.5">
                  ฿{fmt(data.welfare?.budget_amount || 1800)}
                </p>
              </div>
              <div className={`rounded-xl p-3 border ${Number(data.welfare?.balance_amount) < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-gray-500">Balance คงเหลือ</p>
                {Number(data.welfare?.balance_amount) < 0 ? (
                  <p className="text-lg font-bold text-red-500 mt-0.5">฿0.00</p>
                ) : (
                  <p className="text-lg font-bold text-gray-700 mt-0.5">
                    ฿{fmt(data.welfare?.balance_amount ?? (data.welfare?.budget_amount || 1800))}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">ประวัติยอดรายโครงการ</h2>
                <p className="text-xs text-gray-500 mt-0.5">เฉพาะเอกสารที่อนุมัติและส่งยอดแล้ว</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">โครงการ</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">วันที่</th>
                    <th className="text-right px-6 py-3 font-medium text-blue-600">ส่วน 60%</th>
                    <th className="text-right px-6 py-3 font-medium text-purple-600">ส่วน 40%</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-700">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.shares.map((s) => (
                    <tr key={s.document_id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/projects/${s.project_id}`} className="text-blue-600 hover:underline font-medium">
                          {s.project_name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {s.activity_date ? new Date(s.activity_date).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-6 py-3 text-right text-blue-600">฿{fmt(s.share_60)}</td>
                      <td className="px-6 py-3 text-right text-purple-600">฿{fmt(s.share_40)}</td>
                      <td className="px-6 py-3 text-right font-bold">฿{fmt(s.total_share)}</td>
                    </tr>
                  ))}
                  {data.shares.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                        ยังไม่มียอดที่ส่งให้
                      </td>
                    </tr>
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

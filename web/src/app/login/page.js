'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setUser, getUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) router.replace('/dashboard');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ username, password });
      setUser(data.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-boxdark-2 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[45%] text-white">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-8">
          <span className="text-white font-bold text-xl">B</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">ระบบบริหารโครงการ</h1>
        <p className="text-bodydark text-base leading-relaxed">
          จัดการโครงการ ผู้เข้าร่วม และเบิกจ่ายค่าใช้จ่าย<br />
          พร้อมระบบสวัสดิการสะสมอัตโนมัติ
        </p>
        <div className="mt-12 space-y-3">
          {[
            'จัดการโครงการและผู้เข้าร่วมได้ง่าย',
            'คำนวณยอดแบ่ง 60/40 อัตโนมัติ',
            'ติดตามงบสวัสดิการรายบุคคล',
          ].map((t) => (
            <div key={t} className="flex items-center gap-3 text-bodydark2 text-sm">
              <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-whiten">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <h1 className="text-xl font-bold text-boxdark">ระบบบริหารโครงการ</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-stroke p-8">
            <h2 className="text-xl font-bold text-boxdark mb-1">เข้าสู่ระบบ</h2>
            <p className="text-body text-sm mb-6">กรอกข้อมูลเพื่อเข้าใช้งานระบบ</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-boxdark mb-1.5">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="กรอก username"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-boxdark mb-1.5">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>

              {error && (
                <div className="alert-error">
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-stroke">
              <p className="text-xs text-bodydark mb-2 font-medium">บัญชีสำหรับทดสอบ (password: password123)</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-body">
                <span><span className="font-semibold text-boxdark">somsakdi</span> · superadmin</span>
                <span><span className="font-semibold text-boxdark">anucha</span> · admin</span>
                <span><span className="font-semibold text-boxdark">wichai</span> · leader</span>
                <span><span className="font-semibold text-boxdark">thanakorn</span> · user</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

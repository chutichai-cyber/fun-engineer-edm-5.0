'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, getRoleLabel, isAdmin } from '@/lib/auth';

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
    } else {
      setUser(u);
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: '📊' },
    { href: '/projects', label: 'โครงการ', icon: '📋' },
    ...(isAdmin(user) || user.role === 'leader' ? [{ href: '/members', label: 'สมาชิก', icon: '👥' }] : []),
    ...(isAdmin(user) ? [{ href: '/welfare', label: 'งบสวัสดิการ', icon: '🏥' }] : []),
  ];

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-slate-700">
          <h1 className="text-base font-bold leading-tight">ระบบบริหาร</h1>
          <p className="text-xs text-slate-400 mt-0.5">โครงการและเบิกจ่าย</p>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <p className="text-sm font-medium text-white truncate">
            {user.prefix}{user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{getRoleLabel(user.role)}</p>
          {user.team && <p className="text-xs text-slate-500 mt-0.5">{user.team}</p>}
          <button
            onClick={handleLogout}
            className="mt-3 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, getRoleLabel, isAdmin } from '@/lib/auth';
import {
  Squares2X2Icon,
  FolderOpenIcon,
  UsersIcon,
  HeartIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  BellIcon,
} from '@heroicons/react/24/outline';

function Avatar({ name, size = 'md' }) {
  const initials = name ? name.slice(0, 2) : '??';
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-primary flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); } else { setUser(u); }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-whiten">
        <div className="flex items-center gap-3 text-bodydark">
          <div className="spinner" />
          <span className="text-sm">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'แดชบอร์ด',    icon: Squares2X2Icon },
    { href: '/projects',  label: 'โครงการ',      icon: FolderOpenIcon },
    ...(isAdmin(user) || user.role === 'leader'
      ? [{ href: '/members', label: 'สมาชิก', icon: UsersIcon }] : []),
    ...(isAdmin(user)
      ? [{ href: '/welfare', label: 'งบสวัสดิการ', icon: HeartIcon }] : []),
  ];

  const pageTitle = navItems.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + '/')
  )?.label ?? '';

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">ระบบบริหาร</p>
          <p className="text-xs text-bodydark leading-tight">โครงการและเบิกจ่าย</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-bodydark hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={user.firstName} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user.prefix}{user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-bodydark truncate">{getRoleLabel(user.role)}</p>
          </div>
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="p-1.5 text-bodydark hover:text-meta-1 transition-colors rounded-lg hover:bg-white/10"
          >
            <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-whiten overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-boxdark-2 text-white shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-72 h-full bg-boxdark-2 text-white flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-stroke px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-body hover:text-boxdark rounded-lg hover:bg-whiten transition-colors"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
            {pageTitle && (
              <h1 className="text-lg font-semibold text-boxdark">{pageTitle}</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-bodydark hover:text-body rounded-lg hover:bg-whiten transition-colors">
              <BellIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <Avatar name={user.firstName} size="sm" />
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-medium text-boxdark">{user.firstName}</p>
                <p className="text-xs text-body">{getRoleLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

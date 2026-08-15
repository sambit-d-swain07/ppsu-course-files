'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(async (res) => {
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      if (data.user?.role !== 'ADMIN') throw new Error('Forbidden');
      setUser(data.user);
    }).catch(() => router.replace('/login'));
  }, [router, pathname]);

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); router.refresh(); };
  const title = pathname.includes('/assignments') ? 'Faculty Assignments' : 'Admin Dashboard';
  const initials = user?.name?.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'A';

  return (
    <div className="layout-wrapper">
      <aside className="sidebar">
        <div className="sidebar-brand text-center py-3 bg-white">
          <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: 55, objectFit: 'contain' }} />
          <div className="mt-1 fw-bold text-dark font-mono-ppsu" style={{ fontSize: '0.8rem' }}>Admin Portal</div>
        </div>
        <nav className="sidebar-menu">
          <Link href="/admin/dashboard" className={`sidebar-nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>▦ <span>Dashboard</span></Link>
          <Link href="/admin/assignments" className={`sidebar-nav-link ${pathname.includes('/assignments') ? 'active' : ''}`}>♙ <span>Faculty Assignments</span></Link>
        </nav>
        <div className="sidebar-footer"><button onClick={logout} className="btn btn-sm btn-outline-light w-100">Sign Out</button><div className="mt-2">PPSU Admin · v0.1</div></div>
      </aside>
      <div className="main-content-wrapper">
        <header className="top-header"><h2 className="header-page-title">{title}</h2><div className="d-flex align-items-center gap-2"><div className="user-avatar-circle" style={{ background: 'var(--ppsu-secondary)', color: '#fff' }}>{initials}</div><span className="user-info-name">{user?.name || 'Administrator'}</span></div></header>
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Get user details
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));

    // Get notifications
    fetch('/api/notifications')
      .then((res) => res.ok ? res.json() : { notifications: [] })
      .then((data) => {
        const unread = data.notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve page title
  let pageTitle = 'Evaluator Dashboard';
  if (pathname.includes('/faculty-review')) {
    pageTitle = 'Faculty Review Search';
  } else if (/\/coordinator\/review\/[a-zA-Z0-9-]+/.test(pathname)) {
    pageTitle = 'Course File Evaluation & Grading';
  } else if (pathname.includes('/course-files')) {
    pageTitle = 'All Course Files';
  } else if (pathname.includes('/pending-reviews')) {
    pageTitle = 'Pending Reviews';
  } else if (pathname.includes('/completed-reviews')) {
    pageTitle = 'Completed Reviews';
  } else if (pathname.includes('/my-faculty')) {
    pageTitle = 'My Assigned Faculty';
  } else if (pathname.includes('/reports')) {
    pageTitle = 'Evaluation Reports';
  } else if (pathname.includes('/notifications')) {
    pageTitle = 'Notifications';
  } else if (pathname.includes('/profile')) {
    pageTitle = 'My Profile';
  }

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const navLinks = [
    {
      href: '/coordinator/dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-grid-fill" viewBox="0 0 16 16">
          <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h-3A1.5 1.5 0 0 1 1 10.5v3A1.5 1.5 0 0 1 2.5 15h3A1.5 1.5 0 0 1 7 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/faculty-review',
      label: 'Faculty Review',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/my-faculty',
      label: 'My Faculty',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M7 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-4 8a4 4 0 0 1 8 0H3Zm9.5-7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM13 14a3 3 0 0 0-2.25-2.9A3.99 3.99 0 0 1 12 14h1Z"/></svg>
      )
    },
    {
      href: '/coordinator/course-files',
      label: 'Course Files',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-folder-fill" viewBox="0 0 16 16">
          <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.542 5.084A1 1 0 0 0 0 6v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a1 1 0 0 0-.542-.894l-1.104-.55A2 2 0 0 0 12.828 4H9.828l-2-2H2a2 2 0 0 0-2 2v1h1.586l2-2h4.242z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/pending-reviews',
      label: 'Pending Reviews',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-clock-fill" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/completed-reviews',
      label: 'Completed Reviews',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check-circle-fill" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/reports',
      label: 'Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-bar-chart-fill" viewBox="0 0 16 16">
          <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/notifications',
      label: (
        <span className="d-flex align-items-center w-100 justify-content-between">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="badge bg-danger rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>{unreadCount}</span>}
        </span>
      ),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-bell-fill" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
        </svg>
      )
    },
    {
      href: '/coordinator/profile',
      label: 'Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person-fill" viewBox="0 0 16 16">
          <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="layout-wrapper">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand text-center py-3 bg-white" style={{ borderBottom: '1px solid var(--ppsu-border)' }}>
          <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: '55px', objectFit: 'contain' }} />
          <div className="mt-1 fw-bold text-dark font-mono-ppsu" style={{ fontSize: '0.8rem' }}>Course Files Portal</div>
        </div>

        <nav className="sidebar-menu">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-nav-icon">{link.icon}</span>
                <span className="flex-grow-1">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="mb-2">
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-light border-0 w-100 d-flex align-items-center justify-content-center gap-2 py-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontSize: '0.8rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-box-arrow-right" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="d-flex align-items-center gap-2">
            <button className="mobile-menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>
            <div className="header-title-section">
            <h2 className="header-page-title">{pageTitle}</h2>
            </div>
          </div>

          <div className="header-user-profile">
            <Link href="/coordinator/notifications" className="notification-bell-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-bell" viewBox="0 0 16 16">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
              </svg>
              {unreadCount > 0 && <span className="notification-badge-dot" />}
            </Link>

            {user && (
              <div className="d-flex align-items-center gap-2">
                <div className="user-avatar-circle" style={{ backgroundColor: 'var(--ppsu-gold-100)', color: 'var(--ppsu-gold-600)' }}>
                  {getInitials(user.name)}
                </div>
                <div className="user-info-text d-none d-md-flex">
                  <span className="user-info-name">{user.name}</span>
                  <span className="user-info-role">{user.designation || 'Faculty Evaluator'}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}

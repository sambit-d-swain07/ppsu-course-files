'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppShell, { NavLinkItem } from '@/components/layout/AppShell';

type ActiveTab = 'coordinator' | 'faculty';
const TAB_STORAGE_KEY = 'ppsu_active_role_tab';

interface NavDef {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
}

const COORD_NAV_DEFS: NavDef[] = [

  {
    href: '/coordinator/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/faculty-review',
    label: 'Faculty Review',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/my-faculty',
    label: 'My Faculty',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/shared-documents',
    label: 'Shared Documents',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  {
    href: '/coordinator/course-files',
    label: 'Course Files',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/pending-reviews',
    label: 'Pending Reviews',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/completed-reviews',
    label: 'Completed Reviews',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/reports',
    label: 'Reports',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/coordinator/notifications',
    label: 'Notifications',
    badge: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: '/coordinator/profile',
    label: 'Profile',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

const FACULTY_NAV_DEFS: NavDef[] = [
  {
    href: '/faculty/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/faculty/my-courses',
    label: 'My Courses',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/faculty/course-files',
    label: 'Course Files',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    href: '/faculty/submissions',
    label: 'Submissions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/faculty/profile',
    label: 'My Profile',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDualRole, setIsDualRole] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('coordinator');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => router.push('/login'));

    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((data) => {
        const unread = data.notifications ? data.notifications.filter((n: any) => !n.read).length : 0;
        setUnreadCount(unread);
      })
      .catch(() => {});

    fetch('/api/coordinator/my-teaching-subjects')
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((data) => {
        if ((data.subjects?.length ?? 0) > 0) setIsDualRole(true);
      })
      .catch(() => {});
  }, [router, pathname]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(TAB_STORAGE_KEY) as ActiveTab | null;
      if (stored === 'faculty' || stored === 'coordinator') setActiveTab(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/faculty/')) {
      setActiveTab('faculty');
      try {
        sessionStorage.setItem(TAB_STORAGE_KEY, 'faculty');
      } catch {
        /**/
      }
    } else if (pathname.startsWith('/coordinator/')) {
      setActiveTab('coordinator');
      try {
        sessionStorage.setItem(TAB_STORAGE_KEY, 'coordinator');
      } catch {
        /**/
      }
    }
  }, [pathname]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /**/
    }
    if (tab === 'faculty') router.push('/faculty/dashboard');
    else router.push('/coordinator/dashboard');
  };

  const getPageTitle = () => {
    if (pathname.startsWith('/faculty/')) {
      if (pathname.includes('/my-courses')) return 'My Courses';
      if (/\/faculty\/course-files\/[a-zA-Z0-9-]+/.test(pathname)) return 'Course File Checklist';
      if (pathname.includes('/course-files')) return 'Course Files';
      if (pathname.includes('/submissions')) return 'Submissions';
      if (pathname.includes('/profile')) return 'My Profile';
      return 'Faculty Dashboard';
    }
    if (pathname.includes('/faculty-review')) return 'Faculty Review Search';
    if (/\/coordinator\/review\/[a-zA-Z0-9-]+/.test(pathname)) return 'Course File Evaluation & Grading';
    if (pathname.includes('/course-files')) return 'All Course Files';
    if (pathname.includes('/pending-reviews')) return 'Pending Reviews';
    if (pathname.includes('/completed-reviews')) return 'Completed Reviews';
    if (pathname.includes('/my-faculty')) return 'My Assigned Faculty';
    if (pathname.includes('/reports')) return 'Evaluation Reports';
    if (pathname.includes('/notifications')) return 'Notifications';
    if (pathname.includes('/profile')) return 'My Profile';
    if (pathname.includes('/shared-documents')) return 'Shared Documents';
    return 'Evaluator Dashboard';
  };

  const isFacultyTab = activeTab === 'faculty';
  const navDefs = isFacultyTab ? FACULTY_NAV_DEFS : COORD_NAV_DEFS;

  const navLinks: NavLinkItem[] = navDefs.map((link) => ({
    ...link,
    badgeCount: link.badge ? unreadCount : undefined,
  }));

  const profileMenuItems = [
    {
      href: '/coordinator/profile',
      label: 'My Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      href: '/coordinator/my-faculty',
      label: 'Assigned Faculty',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: '/coordinator/reports',
      label: 'Evaluation Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  const subHeaderContent = isDualRole ? (
    <div
      style={{
        background: 'var(--ppsu-primary)',
        borderBottom: '2px solid rgba(255,255,255,0.08)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Active Role:
      </span>

      <div
        style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 4,
          gap: 4,
        }}
      >
        <button
          id="tab-coordinator"
          onClick={() => switchTab('coordinator')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 18px',
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: !isFacultyTab ? 'var(--ppsu-accent)' : 'transparent',
            color: !isFacultyTab ? '#fff' : 'rgba(255,255,255,0.55)',
            boxShadow: !isFacultyTab ? '0 2px 8px rgba(245,158,11,0.35)' : 'none',
            transition: 'all 0.22s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Course Coordinator
        </button>

        <button
          id="tab-my-courses"
          onClick={() => switchTab('faculty')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 18px',
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: isFacultyTab ? '#10b981' : 'transparent',
            color: isFacultyTab ? '#fff' : 'rgba(255,255,255,0.55)',
            boxShadow: isFacultyTab ? '0 2px 8px rgba(16,185,129,0.35)' : 'none',
            transition: 'all 0.22s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          My Courses
        </button>
      </div>

      <span
        style={{
          marginLeft: 'auto',
          background: !isFacultyTab ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          color: !isFacultyTab ? '#FCD34D' : '#6EE7B7',
          borderRadius: 20,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 600,
          transition: 'all 0.25s ease',
        }}
      >
        {!isFacultyTab ? '🎓 Evaluating faculty course files' : '📚 Managing your own teaching subjects'}
      </span>
    </div>
  ) : null;

  return (
    <AppShell
      pageTitle={getPageTitle()}
      portalBadgeText={isFacultyTab ? '📚 Faculty Mode' : '🎓 Evaluator Portal'}
      portalBadgeColor={isFacultyTab ? '#6EE7B7' : '#FCD34D'}
      portalBadgeBg={isFacultyTab ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}
      navLinks={navLinks}
      user={user}
      userRoleBadge={isFacultyTab ? 'Course Teacher' : 'Course Evaluator'}
      userRoleBadgeClass={isFacultyTab ? 'badge-custom-approved' : 'badge-custom-review'}
      userAvatarClass={isFacultyTab ? 'user-avatar-faculty' : 'user-avatar-coordinator'}
      userDefaultInitials="E"
      subHeaderContent={subHeaderContent}
      profileMenuItems={profileMenuItems}
    >
      {children}
    </AppShell>
  );
}

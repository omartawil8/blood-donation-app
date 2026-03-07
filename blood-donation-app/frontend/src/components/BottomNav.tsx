import { useLocation, useNavigate } from 'react-router-dom';
import styles from './BottomNav.module.css';

type Tab = {
  id: string;
  label: string;
  path?: string;
  action?: () => void;
  icon: (active: boolean) => React.ReactNode;
};

export default function BottomNav({ onRequest }: { onRequest: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (pathname: string) => {
    if (pathname === '/') return 'donate';
    if (pathname === '/top-donors') return 'top-donors';
    if (pathname === '/profile') return 'profile';
    return 'donate';
  };

  const activeTab = getActiveTab(location.pathname);

  const tabs: Tab[] = [
    {
      id: 'donate',
      label: 'Donate',
      path: '/',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      ),
    },
    {
      id: 'request',
      label: 'Request',
      action: onRequest,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
      ),
    },
    {
      id: 'top-donors',
      label: 'Top Donors',
      path: '/top-donors',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={styles.nav} role="tablist" aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            className={isActive ? styles.tabActive : styles.tab}
            onClick={() => tab.action ? tab.action() : tab.path && navigate(tab.path)}
          >
            <span className={styles.icon}>{tab.icon(isActive)}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

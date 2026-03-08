import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { users } from '../api/client';
import ChangeTypeModal from './ChangeTypeModal';
import ImportantNoteModal from './ImportantNoteModal';
import RequestBloodSheet from '../pages/RequestBlood';
import BottomNav from './BottomNav';
import { useNavDirection } from './NavDirection';
import styles from './Layout.module.css';

const COOLDOWN_DAYS = 60;

const PAGE_TITLES: Record<string, string> = {
  '/donate': 'Donate',
  '/top-donors': 'Top Donors',
  '/hospitals': 'Select Hospital',
  '/profile': 'Profile',
  '/past-donations': 'My Past Donations',
  '/past-requests': 'My Past Requests',
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/request/')) return 'Request Details';
  return PAGE_TITLES[pathname] ?? '';
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<{
    bloodType: string;
    daysUntilCanDonate: number | null;
    lastDonationDate: string | null;
    optOut: boolean;
  } | null>(null);
  const [stats, setStats] = useState<{ activeDonors: number } | null>(null);
  const [showChangeType, setShowChangeType] = useState(false);
  const [showRequestBlood, setShowRequestBlood] = useState(false);
  const [showImportantNote, setShowImportantNote] = useState(false);

  const path = location.pathname;
  const navDirection = useNavDirection();
  const isHome = path === '/';
  const isSubPage = path.startsWith('/request/') || path === '/hospitals' || path === '/past-donations' || path === '/past-requests';
  const isDonate = path === '/donate';
  const isTopDonors = path === '/top-donors';
  const isProfile = path === '/profile';
  const isPastRequests = path === '/past-requests';
  const isPastDonations = path === '/past-donations';
  const isMinimalHeader = isTopDonors || isProfile || isPastRequests || isPastDonations;
  const pageTitle = getPageTitle(path);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, statsRes] = await Promise.all([
          users.me().catch(() => null),
          users.stats().catch(() => null),
        ]);
        if (!cancelled) {
          setMe(meRes);
          setStats(statsRes);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [showChangeType]);

  const handleToggleOptOut = async () => {
    if (!me) return;
    try {
      if (me.optOut) await users.optIn();
      else await users.optOut();
      setMe((prev) => prev ? { ...prev, optOut: !prev.optOut } : null);
      users.stats().then(setStats).catch(() => {});
    } catch { /* ignore */ }
  };

  const handleBack = () => {
    if (path === '/hospitals' || path.startsWith('/request/')) navigate(-1);
    else navigate('/');
  };

  const handleRequestBlood = () => setShowRequestBlood(true);

  return (
    <div className={styles.layout}>
      {/* No header on the Home page */}
      {!isHome && (
        <header className={`${styles.header} ${isMinimalHeader ? styles.headerMinimal : ''}`}>
          {isSubPage ? (
            <div className={styles.headerTop}>
              <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="Back">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              {!isMinimalHeader && <h1 className={styles.title}>{pageTitle}</h1>}
              <div className={styles.headerSpacer} />
            </div>
          ) : isDonate ? (
            <>
              <div className={styles.headerTop}>
                <button type="button" className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className={styles.headerSpacer} />
              </div>
              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <div className={styles.donorCircles} aria-hidden>
                    <span className={styles.circle1} />
                    <span className={styles.circle2} />
                    <span className={styles.circle3} />
                    <span className={styles.circle4} />
                  </div>
                  <div className={styles.statBlock}>
                    <span className={styles.statLabel}>Active Donors</span>
                    <span className={styles.statValue}>{stats?.activeDonors != null ? stats.activeDonors.toLocaleString() : '—'}</span>
                  </div>
                </div>
                {me && !me.optOut && me.lastDonationDate != null ? (
                  me.daysUntilCanDonate != null && me.daysUntilCanDonate > 0 ? (
                    <div className={`${styles.stat} ${styles.statRight} ${styles.statFadeIn}`}>
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Can donate again in</span>
                        <span className={styles.statValueDays}>
                          {me.daysUntilCanDonate} days
                          <button type="button" className={styles.infoBtn} onClick={() => setShowImportantNote(true)} aria-label="Info">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1.5"/>
                              <rect x="7.25" y="7" width="1.5" height="4.5" rx="0.75" fill="currentColor"/>
                              <circle cx="8" cy="4.75" r="0.85" fill="currentColor"/>
                            </svg>
                          </button>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`${styles.stat} ${styles.statRight} ${styles.statFadeIn}`}>
                      <div className={styles.statBlock}>
                        <span className={styles.statLabel}>Donation status</span>
                        <span className={styles.statValueDays}>Ready</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className={styles.statRight} />
                )}
              </div>
            </>
          ) : isMinimalHeader ? (
            <div className={styles.headerTopMinimal} aria-label={isTopDonors ? 'Top Donors' : isPastRequests ? 'My Past Requests' : isPastDonations ? 'My Past Donations' : 'Profile'} />
          ) : (
            <div className={styles.headerTop}>
              <div className={styles.headerSpacer} />
              <h1 className={styles.title}>{pageTitle}</h1>
              <div className={styles.headerSpacer} />
            </div>
          )}
        </header>
      )}

      <main className={`${styles.main} ${isHome ? styles.mainNoHeader : ''}`}>
        <div
          key={path}
          className={`${styles.pageSlide} ${navDirection === 'forward' ? styles.slideInRight : navDirection === 'back' ? styles.slideInLeft : ''}`}
        >
          <Outlet context={{ onRequestBlood: handleRequestBlood }} />
        </div>
      </main>

      <BottomNav onRequest={handleRequestBlood} />

      {showChangeType && (
        <ChangeTypeModal
          currentBloodType={me?.bloodType ?? 'A+'}
          hasSession={me != null}
          onClose={() => setShowChangeType(false)}
          onSaved={() => setMe((prev) => prev ? { ...prev } : null)}
        />
      )}

      {showImportantNote && me && me.daysUntilCanDonate != null && me.daysUntilCanDonate > 0 && (
        <ImportantNoteModal
          daysSinceLastDonation={COOLDOWN_DAYS - me.daysUntilCanDonate}
          daysUntilCanDonate={me.daysUntilCanDonate}
          cooldownDays={COOLDOWN_DAYS}
          onClose={() => setShowImportantNote(false)}
        />
      )}

      {/* Request Blood bottom sheet */}
      {showRequestBlood && (
        <div className={styles.sheetBackdrop} onClick={() => setShowRequestBlood(false)} />
      )}
      <div className={`${styles.sheet} ${showRequestBlood ? styles.sheetOpen : ''}`}>
        <RequestBloodSheet onClose={() => setShowRequestBlood(false)} />
      </div>
    </div>
  );
}

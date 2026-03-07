import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { users } from '../api/client';
import ChangeTypeModal from './ChangeTypeModal';
import ImportantNoteModal from './ImportantNoteModal';
import RequestBloodSheet from '../pages/RequestBlood';
import BottomNav from './BottomNav';
import styles from './Layout.module.css';

const COOLDOWN_DAYS = 60;

const PAGE_TITLES: Record<string, string> = {
  '/request-blood': 'Request Blood',
  '/top-donors': 'Top Donors',
  '/hospitals': 'Select Hospital',
  '/profile': 'Profile',
};

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Blood Donor';
  if (pathname === '/request-blood') return 'Request Blood';
  if (pathname.startsWith('/request/')) return 'Request Details';
  return PAGE_TITLES[pathname] ?? 'Blood Donor';
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
  const isSubPage = path.startsWith('/request/') || path === '/hospitals';
  const isHome = path === '/';
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
      } catch {
        // ignore
      }
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
    } catch {
      // ignore
    }
  };

  const handleCloseImportantNote = () => setShowImportantNote(false);

  const handleBack = () => {
    if (path === '/hospitals') navigate(-1);
    else navigate('/');
  };

  const handleRequestBlood = () => {
    setShowRequestBlood(true);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        {isSubPage ? (
          <div className={styles.headerTop}>
            <button type="button" className={styles.backBtn} onClick={handleBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h1 className={styles.title}>{pageTitle}</h1>
            <div className={styles.headerSpacer} />
          </div>
        ) : isHome ? (
          <>
            <div className={styles.headerTop}>
              <h1 className={styles.appName}>Blood Donor</h1>
              <button
                type="button"
                className={styles.toggle}
                onClick={handleToggleOptOut}
                aria-label={me?.optOut ? 'Opt in to receive requests' : 'Opt out of requests'}
                aria-pressed={me ? !me.optOut : false}
              >
                <span className={styles.toggleLabel}>
                  {me?.optOut ? 'Inactive' : (me?.lastDonationDate && me.daysUntilCanDonate != null && me.daysUntilCanDonate > 0) ? 'Recovering' : 'Active'}
                </span>
                <span className={`${styles.toggleTrack} ${me && !me.optOut ? (me.lastDonationDate && me.daysUntilCanDonate != null && me.daysUntilCanDonate > 0 ? styles.toggleTrackRecovering : styles.toggleTrackOn) : ''}`}>
                  <span className={me?.optOut ? styles.toggleThumbOff : styles.toggleThumbOn} />
                </span>
              </button>
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
                        <button
                          type="button"
                          className={styles.infoBtn}
                          onClick={() => setShowImportantNote(true)}
                          aria-label="Important note about donation frequency"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        ) : (
          <div className={styles.headerTop}>
            <div className={styles.headerSpacer} />
            <h1 className={styles.title}>{pageTitle}</h1>
            <div className={styles.headerSpacer} />
          </div>
        )}
      </header>

      <main className={styles.main}>
        <Outlet />
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
          onClose={handleCloseImportantNote}
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

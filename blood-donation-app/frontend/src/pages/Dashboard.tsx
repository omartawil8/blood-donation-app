import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requests, users, dev } from '../api/client';
import { useGeo } from '../hooks/useGeo';
import styles from './Dashboard.module.css';

type RequestItem = {
  _id: string;
  patientName: string;
  bloodTypeNeeded: string;
  hospitalId: { name: string; address: string };
  distanceKm?: number;
  createdAt: string;
};

const COMPAT: Record<string, string[]> = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

function isCompatible(myBloodType: string | null, bloodTypeNeeded: string): boolean {
  if (!myBloodType) return false;
  return (COMPAT[bloodTypeNeeded] ?? []).includes(myBloodType);
}

const FALLBACK_LNG = -0.12;
const FALLBACK_LAT = 51.5;

export default function Dashboard() {
  const { lng, lat } = useGeo();
  const [activeRequests, setActiveRequests] = useState<RequestItem[]>([]);
  const [myBloodType, setMyBloodType] = useState<string | null>(null);
  const [sort, setSort] = useState<'all' | 'bloodType' | 'distance'>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    users.me().then((me) => setMyBloodType(me.bloodType)).catch(() => {});
  }, []);

  const handleReset = async () => {
    setResetting(true);
    try {
      await dev.reset();
      localStorage.removeItem('bloodDonorUserId');
      window.location.href = '/login';
    } catch {
      setResetting(false);
    }
  };

  const fetchLng = lng ?? FALLBACK_LNG;
  const fetchLat = lat ?? FALLBACK_LAT;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { requests: list } = await requests.active(fetchLng, fetchLat, {
          sort: sort === 'bloodType' ? 'distance' : sort,
        });
        if (!cancelled) setActiveRequests(list);
      } catch {
        if (!cancelled) setActiveRequests([]);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchLng, fetchLat, sort]);

  const byDistance = (a: RequestItem, b: RequestItem) =>
    (a.distanceKm ?? 999) - (b.distanceKm ?? 999);

  const displayedRequests = (() => {
    if (sort === 'bloodType' && myBloodType) {
      const compat = activeRequests
        .filter((r) => isCompatible(myBloodType, r.bloodTypeNeeded))
        .sort(byDistance);
      const incomp = activeRequests
        .filter((r) => !isCompatible(myBloodType, r.bloodTypeNeeded))
        .sort(byDistance);
      return [...compat, ...incomp];
    }
    return activeRequests;
  })();

  return (
    <div className={styles.dashboard}>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadRow}>
            <div className={styles.sectionTitleGroup}>
              <h2 className={styles.sectionTitle}>
                Active Requests
                {activeRequests.length > 0 && (
                  <span className={styles.sectionCount} aria-label={`${activeRequests.length} requests`}>
                    {activeRequests.length}
                  </span>
                )}
              </h2>
            </div>
            <div className={styles.sortWrapper}>
            <button
              type="button"
              className={sort !== 'all' ? styles.sortTabActive : styles.sortTab}
              onClick={() => setSortOpen((o) => !o)}
            >
              {sort === 'bloodType' ? 'Blood Type' : sort === 'distance' ? 'Distance' : '↑↓ All'}
              <span className={styles.sortChevron}>▾</span>
            </button>
            {sortOpen && (
              <>
                <div className={styles.sortBackdrop} onClick={() => setSortOpen(false)} />
                <div className={styles.sortDropdown}>
                  <button type="button" className={`${styles.sortOption} ${sort === 'all' ? styles.sortOptionActive : ''}`} onClick={() => { setSort('all'); setSortOpen(false); }}>All</button>
                  <button type="button" className={`${styles.sortOption} ${sort === 'bloodType' ? styles.sortOptionActive : ''}`} onClick={() => { setSort('bloodType'); setSortOpen(false); }}>Blood Type</button>
                  <button type="button" className={`${styles.sortOption} ${sort === 'distance' ? styles.sortOptionActive : ''}`} onClick={() => { setSort('distance'); setSortOpen(false); }}>Distance</button>
                </div>
              </>
            )}
            </div>
          </div>
          {myBloodType && (
            <div className={styles.legend}>
              <span className={styles.legendDotCompat} aria-hidden />
              <span className={styles.legendEquals}>=</span>
              <span className={styles.legendLabel}>Compatible</span>
            </div>
          )}
        </div>

        {displayedRequests.length === 0 ? (
          <p className={styles.empty}>No active requests in your area.</p>
        ) : (
          <ul className={styles.list}>
            {displayedRequests.map((r) => {
              const compat = isCompatible(myBloodType, r.bloodTypeNeeded);
              return (
                <li key={r._id} className={`${styles.card} ${compat ? styles.cardCompat : ''}`}>
                  <Link to={`/request/${r._id}`} className={styles.cardLink}>
                    <div
                      className={styles.cardBloodType}
                      style={{ fontSize: r.bloodTypeNeeded.startsWith('AB') ? '0.75rem' : '1rem' }}
                    >
                      {r.bloodTypeNeeded.replace(/[+-]/, '')}<sup>{r.bloodTypeNeeded.match(/[+-]/)?.[0]}</sup>
                    </div>
                    <div className={styles.cardBody}>
                      <span className={styles.cardName}>{r.patientName}</span>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardHospital}>{r.hospitalId?.name ?? 'Hospital'}</span>
                        {r.distanceKm != null && (
                          <>
                            <span className={styles.cardSeparator} aria-hidden />
                            <span className={styles.cardDistance}>{r.distanceKm.toFixed(1)}km</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.cardAction}
                      aria-label="Share request"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const url = `${window.location.origin}/request/${r._id}`;
                        const text = `Urgent: ${r.bloodTypeNeeded} blood needed for ${r.patientName} at ${r.hospitalId?.name ?? 'hospital'}`;
                        if (navigator.share) {
                          navigator.share({ title: 'Blood donation request', text, url }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(`${text}\n${url}`)
                            .then(() => alert('Link copied to clipboard!'))
                            .catch(() => {});
                        }
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4L22 2Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className={styles.resetRow}>
        <button type="button" className={styles.resetBtn} onClick={handleReset} disabled={resetting}>
          {resetting ? 'Resetting…' : '⟳ Reset demo data'}
        </button>
      </div>
    </div>
  );
}

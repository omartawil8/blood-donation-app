import { useEffect, useState } from 'react';
import { users } from '../api/client';
import styles from './TopDonors.module.css';

type Entry = { rank: number; username: string; donations: number; points: number };

function TrophyIcon({ color, number }: { color: 'gold' | 'silver' | 'bronze'; number: number }) {
  const colors = {
    gold:   { body: '#F5A623', shine: '#F7C25E', shadow: '#C27C0E', text: '#7A4F00' },
    silver: { body: '#B0BEC5', shine: '#CFD8DC', shadow: '#78909C', text: '#37474F' },
    bronze: { body: '#CD8B4A', shine: '#E5AE76', shadow: '#9C5E1F', text: '#5D3510' },
  };
  const c = colors[color];
  return (
    <span className={styles.trophyWrap} aria-hidden>
      <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Cup body */}
        <path d="M8 2h16v14c0 5-3.6 9-8 9s-8-4-8-9V2z" fill={c.body} />
        {/* Shine */}
        <path d="M10 3h4v10c0 1.5-.8 2.8-2 3.5V3z" fill={c.shine} opacity="0.5" />
        {/* Handles */}
        <path d="M8 5H4a3 3 0 0 0 0 6h4" stroke={c.shadow} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M24 5h4a3 3 0 0 1 0 6h-4" stroke={c.shadow} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Stem */}
        <rect x="14" y="25" width="4" height="4" fill={c.body} />
        {/* Base */}
        <rect x="10" y="29" width="12" height="3" rx="1.5" fill={c.shadow} />
        {/* Number */}
        <text x="16" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill={c.text}>{number}</text>
      </svg>
    </span>
  );
}

function RankNum({ rank }: { rank: number }) {
  return <span className={styles.rankNum}>{rank}</span>;
}

function TrendArrow({ rank }: { rank: number }) {
  if (rank <= 2) {
    return (
      <svg className={styles.trendUp} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  }
  if (rank === 3) {
    return (
      <svg className={styles.trendDown} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    );
  }
  return <span className={styles.trendNeutral}>—</span>;
}

export default function TopDonors() {
  const [period, setPeriod] = useState<'year' | 'all'>('year');
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [me, setMe] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [lbRes, meRes] = await Promise.all([
          users.leaderboard(period === 'year' ? 'year' : undefined),
          users.me().catch(() => null),
        ]);
        if (!cancelled) {
          setLeaderboard(lbRes.leaderboard);
          setMe(meRes ? { username: meRes.username } : null);
        }
      } catch {
        if (!cancelled) setLeaderboard([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  const top10Raw = leaderboard.slice(0, 10);
  const placeholderNames: string[] = ['Layla H.', 'Omar K.', 'Nadia M.', 'Youssef A.', 'Rania S.', 'Karim T.', 'Sara F.', 'Adam D.', 'Lina N.', 'Jad C.'];
  const top10: (Entry & { placeholder?: boolean })[] = [];
  for (let i = 0; i < 10; i++) {
    top10.push(
      top10Raw[i] ?? {
        rank: i + 1,
        username: placeholderNames[i] ?? '—',
        donations: 0,
        points: 0,
        placeholder: true,
      }
    );
  }
  const myEntry = leaderboard.find((e) => e.username === me?.username);
  const showYouAtBottom = me && (!myEntry || myEntry.rank > 10);

  return (
    <div className={styles.page}>
      <div className={styles.stickyHeader}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Top Donors</h2>
          <span className={styles.periodLabel}>{period === 'year' ? 'This Year' : 'All Time'}</span>
        </div>

        <div className={styles.toggle}>
          <button
            type="button"
            className={period === 'year' ? styles.toggleActive : styles.toggleBtn}
            onClick={() => setPeriod('year')}
          >
            This Year
          </button>
          <button
            type="button"
            className={period === 'all' ? styles.toggleActive : styles.toggleBtn}
            onClick={() => setPeriod('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading…</p>
      ) : (
        <>
          <ul className={styles.list}>
            {top10.map((e, i) => (
              <li
                key={e.placeholder ? `placeholder-${i}` : `${e.username}-${i}`}
                className={`${styles.row} ${e.username === me?.username ? styles.rowYou : ''}`}
              >
                <span className={styles.medal}>
                  {e.rank === 1 && !e.placeholder && <TrophyIcon color="gold" number={1} />}
                  {e.rank === 2 && !e.placeholder && <TrophyIcon color="silver" number={2} />}
                  {e.rank === 3 && !e.placeholder && <TrophyIcon color="bronze" number={3} />}
                  {(e.rank > 3 || e.placeholder) && <RankNum rank={e.rank} />}
                </span>
                <span className={styles.name}>{e.username}</span>
                <TrendArrow rank={e.placeholder ? 0 : e.rank} />
              </li>
            ))}
          </ul>
          {showYouAtBottom && (
            <div className={styles.youSection}>
              <p className={styles.youLabel}>Your rank</p>
              <div className={`${styles.row} ${styles.rowYouHighlight}`}>
                <span className={styles.medal}>
                  {myEntry && myEntry.rank > 3 && <RankNum rank={myEntry.rank} />}
                  {myEntry && myEntry.rank <= 3 && myEntry.rank === 1 && <TrophyIcon color="gold" number={1} />}
                  {myEntry && myEntry.rank <= 3 && myEntry.rank === 2 && <TrophyIcon color="silver" number={2} />}
                  {myEntry && myEntry.rank <= 3 && myEntry.rank === 3 && <TrophyIcon color="bronze" number={3} />}
                  {!myEntry && <span className={styles.rankNum}>—</span>}
                </span>
                <span className={styles.name}>{me?.username ?? 'You'}</span>
                {myEntry ? <TrendArrow rank={myEntry.rank} /> : <span className={styles.trendNeutral}>—</span>}
              </div>
            </div>
          )}
        </>
      )}
      {!loading && leaderboard.length === 0 && (
        <p className={styles.empty}>No donors yet.</p>
      )}
    </div>
  );
}

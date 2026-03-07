import { useEffect, useState } from 'react';
import { hospitals } from '../api/client';
import styles from './SelectHospital.module.css';

type Hospital = { _id: string; name: string; address: string };

type Props = {
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
};

export default function SelectHospital({ onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { hospitals: h } = await hospitals.list(q || undefined);
        if (!cancelled) setList(h);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div className={styles.page}>
      <div className={styles.handle} aria-hidden />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="Back">←</button>
        <h2 className={styles.title}>Select Hospital</h2>
      </div>
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search hospital name"
          className={styles.search}
          autoFocus
        />
      </div>
      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : list.length === 0 ? (
        <p className={styles.hint}>No hospitals found.</p>
      ) : (
        <ul className={styles.list}>
          {list.map((h) => (
            <li key={h._id}>
              <button
                type="button"
                className={styles.itemBtn}
                onClick={() => { onSelect(h._id, h.name); }}
              >
                <span className={styles.itemName}>{h.name}</span>
                <span className={styles.itemAddress}>{h.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

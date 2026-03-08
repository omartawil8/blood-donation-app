import { useEffect, useState } from 'react';
import { donations } from '../api/client';
import styles from './PastDonations.module.css';

type PastDonation = {
  _id: string;
  requestId: string;
  patientName: string;
  bloodTypeNeeded: string;
  hospitalName: string;
  donatedAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PastDonations() {
  const [list, setList] = useState<PastDonation[] | null>(null);

  useEffect(() => {
    donations.myPast()
      .then(res => setList(res.donations))
      .catch(() => setList([]));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.stickyHeader}>
        <h2 className={styles.pageTitle}>My Past Donations</h2>
      </div>
      {list === null ? (
        <div className={styles.loading}>
          <span className={styles.spinner} />
        </div>
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M12 7v5l4 2"/>
          </svg>
          <span className={styles.emptyTitle}>No past donations</span>
          <span className={styles.emptySub}>Your donation history will appear here.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {list.map(d => (
            <li key={d._id} className={styles.item}>
              <div className={styles.itemLeft}>
                <span className={styles.bloodBadge}>{d.bloodTypeNeeded}</span>
              </div>
              <div className={styles.itemBody}>
                <span className={styles.itemName}>{d.patientName}</span>
                <span className={styles.itemHospital}>{d.hospitalName}</span>
              </div>
              <div className={styles.itemRight}>
                <span className={styles.itemDate}>{formatDate(d.donatedAt)}</span>
                <span className={styles.itemDone}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Donated
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

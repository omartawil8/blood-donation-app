import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requests } from '../api/client';
import styles from './PastDonations.module.css';

type PastRequest = {
  _id: string;
  patientName: string;
  bloodTypeNeeded: string;
  hospitalName: string;
  status: string;
  createdAt: string;
  activeDonationStatus?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PastRequests() {
  const [list, setList] = useState<PastRequest[] | null>(null);

  useEffect(() => {
    requests.myPast()
      .then(res => setList(res.requests))
      .catch(() => setList([]));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.stickyHeader}>
        <h2 className={styles.pageTitle}>My Past Requests</h2>
      </div>
      {list === null ? (
        <div className={styles.loading}>
          <span className={styles.spinner} />
        </div>
      ) : list.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
          <span className={styles.emptyTitle}>No past requests</span>
          <span className={styles.emptySub}>Blood requests you created will appear here.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {list.map(r => (
            <li key={r._id} className={styles.item}>
              <Link to={`/request/${r._id}`} className={styles.itemLink}>
                <div className={styles.itemLeft}>
                  <span className={styles.bloodBadge}>{r.bloodTypeNeeded}</span>
                </div>
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{r.patientName}</span>
                  <span className={styles.itemHospital}>{r.hospitalName}</span>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.itemDate}>{formatDate(r.createdAt)}</span>
                  <span className={r.status === 'fulfilled' ? styles.itemDone : r.status === 'cancelled' ? styles.itemStatus : styles.itemStatus}>
                    {r.status === 'fulfilled' ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Fulfilled
                      </>
                    ) : r.status === 'cancelled' ? (
                      'Cancelled'
                    ) : r.activeDonationStatus === 'on_the_way' ? (
                      'On the way'
                    ) : r.activeDonationStatus === 'pledged' ? (
                      'Pledged'
                    ) : (
                      'Pending'
                    )}
                  </span>
                </div>
                <svg className={styles.itemChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

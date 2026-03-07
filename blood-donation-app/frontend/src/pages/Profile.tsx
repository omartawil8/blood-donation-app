import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { users, donations } from '../api/client';
import ChangeTypeModal from '../components/ChangeTypeModal';
import styles from './Profile.module.css';

type Me = {
  _id: string;
  username: string;
  bloodType: string;
  points: number;
  lastDonationDate: string | null;
  daysUntilCanDonate: number | null;
  optOut: boolean;
};

type ActiveDonation = {
  _id: string;
  status: string;
  requestId: string;
  patientName: string;
  bloodTypeNeeded: string;
  hospitalName: string;
  pledgedAt: string;
};

const STEPS = ['pledged', 'on_the_way', 'donated'] as const;
const STEP_LABELS: Record<string, string> = {
  pledged: 'Pledged',
  on_the_way: 'On the way',
  donated: 'Donated',
};

export default function Profile() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [myDonations, setMyDonations] = useState<number | null>(null);
  const [activeDonation, setActiveDonation] = useState<ActiveDonation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangeType, setShowChangeType] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      try {
        const [meRes, lbRes, donRes] = await Promise.all([
          users.me().catch(() => null),
          users.leaderboard().catch(() => null),
          donations.myActive().catch(() => null),
        ]);
        if (!cancelledRef.current) {
          setMe(meRes);
          if (meRes && lbRes) {
            const entry = lbRes.leaderboard.find((e) => e.username === meRes.username);
            setMyDonations(entry ? entry.donations : Math.floor(meRes.points / 100));
          } else if (meRes) {
            setMyDonations(Math.floor(meRes.points / 100));
          }
          setActiveDonation(donRes?.donations[0] ?? null);
        }
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
    return () => { cancelledRef.current = true; };
  }, [showChangeType]);

  const handleToggleOptOut = async () => {
    if (!me) return;
    try {
      if (me.optOut) await users.optIn();
      else await users.optOut();
      setMe((prev) => prev ? { ...prev, optOut: !prev.optOut } : null);
    } catch {
      // ignore
    }
  };

  const startEditName = () => {
    setNameInput(me?.username ?? '');
    setNameError('');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameError('');
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameError('Name cannot be empty'); return; }
    if (trimmed === me?.username) { setEditingName(false); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const res = await users.updateUsername(trimmed);
      setMe((prev) => prev ? { ...prev, username: res.username } : null);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNameSaving(false);
    }
  };

  const bloodLetter = me?.bloodType.replace(/[+-]/, '') ?? '';
  const bloodSign = me?.bloodType.match(/[+-]/)?.[0] ?? '';
  const isTwoLetter = bloodLetter.length > 1;

  return (
    <div className={styles.page}>
      {loading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : (
        <>
          {/* Blood type hero */}
          <div className={styles.hero}>
            <div
              className={styles.bloodBadge}
              style={{ fontSize: isTwoLetter ? '1.6rem' : '2.1rem' }}
            >
              {bloodLetter}<sup>{bloodSign}</sup>
            </div>
            <div className={styles.heroInfo}>
              {editingName ? (
                <div className={styles.nameEditRow}>
                  <input
                    ref={nameInputRef}
                    className={styles.nameInput}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                    maxLength={32}
                    disabled={nameSaving}
                  />
                  <button type="button" className={styles.nameSaveBtn} onClick={saveName} disabled={nameSaving}>
                    {nameSaving ? '…' : 'Save'}
                  </button>
                  <button type="button" className={styles.nameCancelBtn} onClick={cancelEditName} disabled={nameSaving}>
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.nameRow} onClick={startEditName}>
                  <p className={styles.username}>{me?.username ?? '—'}</p>
                  <span className={styles.editIcon}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </span>
                </button>
              )}
              {nameError && <p className={styles.nameError}>{nameError}</p>}
              <p className={styles.subline}>
                {me?.points != null ? `${me.points.toLocaleString()} pts` : '—'}
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {myDonations != null ? myDonations.toLocaleString() : '—'}
              </span>
              <span className={styles.statLabel}>Your Donations</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>
                {me?.daysUntilCanDonate != null && me.daysUntilCanDonate > 0
                  ? `${me.daysUntilCanDonate}d`
                  : me && !me.optOut ? 'Ready' : '—'}
              </span>
              <span className={styles.statLabel}>Next Donation</span>
            </div>
          </div>

          {/* Donor status toggle */}
          <div className={styles.section}>
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <span className={styles.rowTitle}>Available to Donate</span>
                <span className={styles.rowSub}>
                  {me?.optOut ? 'You are currently inactive' : 'You appear in donor lists'}
                </span>
              </div>
              <button
                type="button"
                className={styles.toggle}
                onClick={handleToggleOptOut}
                aria-label={me?.optOut ? 'Opt in' : 'Opt out'}
                aria-pressed={me ? !me.optOut : false}
              >
                <span className={`${styles.toggleTrack} ${me && !me.optOut ? styles.toggleTrackOn : ''}`}>
                  <span className={me?.optOut ? styles.toggleThumbOff : styles.toggleThumbOn} />
                </span>
              </button>
            </div>
          </div>

          {/* Change blood type */}
          <div className={styles.section}>
            <button
              type="button"
              className={styles.changeTypeBtn}
              onClick={() => setShowChangeType(true)}
            >
              <span className={styles.changeTypeIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-13-7-13z"/>
                </svg>
              </span>
              <span className={styles.changeTypeLabel}>Change Blood Type</span>
              <span className={styles.changeTypeChevron}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          </div>

          {/* Active donation status */}
          {activeDonation && (
            <div className={styles.section}>
              <div className={styles.donationStatusCard}>
                <div className={styles.donationStatusTop}>
                  <div className={styles.donationStatusInfo}>
                    <span className={styles.donationStatusTitle}>Active Donation</span>
                    <span className={styles.donationStatusSub}>
                      {activeDonation.patientName} · {activeDonation.hospitalName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.donationStatusLink}
                    onClick={() => navigate(`/request/${activeDonation.requestId}`)}
                  >
                    View
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>

                {/* Progress steps */}
                <div className={styles.progressRow}>
                  {STEPS.map((step, i) => {
                    const currentIdx = STEPS.indexOf(activeDonation.status as typeof STEPS[number]);
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} className={styles.progressStep}>
                        <div className={`${styles.progressDot} ${done ? styles.progressDotDone : ''} ${active ? styles.progressDotActive : ''}`}>
                          {done && !active && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <span className={`${styles.progressLabel} ${active ? styles.progressLabelActive : ''}`}>
                          {STEP_LABELS[step]}
                        </span>
                        {i < STEPS.length - 1 && (
                          <div className={`${styles.progressLine} ${i < currentIdx ? styles.progressLineDone : ''}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Last donation */}
          {me?.lastDonationDate && (
            <div className={styles.section}>
              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <span className={styles.rowTitle}>Last Donation</span>
                  <span className={styles.rowSub}>
                    {new Date(me.lastDonationDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showChangeType && (
        <ChangeTypeModal
          currentBloodType={me?.bloodType ?? 'A+'}
          hasSession={me != null}
          onClose={() => setShowChangeType(false)}
          onSaved={() => setMe((prev) => prev ? { ...prev } : null)}
        />
      )}
    </div>
  );
}

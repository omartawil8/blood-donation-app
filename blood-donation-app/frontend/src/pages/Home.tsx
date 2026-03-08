import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { users, donations, requests } from '../api/client';
import ChangeTypeModal from '../components/ChangeTypeModal';
import styles from './Home.module.css';

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

type ActiveRequest = {
  _id: string;
  patientName: string;
  bloodTypeNeeded: string;
  hospitalName: string;
  createdAt: string;
  activeDonationStatus?: string | null;
};

const STEPS = ['pledged', 'on_the_way', 'donated'] as const;
const STEP_LABELS: Record<string, string> = {
  pledged: 'Pledged',
  on_the_way: 'On the way',
  donated: 'Donated',
};

function DammiLogoCard({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 3C24 3 5 22 5 36C5 47.4 13.9 55 24 55C34.1 55 43 47.4 43 36C43 22 24 3 24 3Z" fill="white"/>
        {/* Tree uses currentColor so it matches the card/background behind the logo */}
        <path d="M23,51 L23,44 L9,44 L13,41 L22,42 L22,37 L12,37 L16,34 L22,35 L22,30 L16,30 L19,27 L22,28 L22,24 L20,23 L24,18 L28,23 L26,24 L26,28 L29,27 L32,30 L26,30 L26,35 L32,34 L36,37 L26,37 L26,42 L35,41 L39,44 L25,44 L25,51 Z" fill="currentColor"/>
      </svg>
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { onRequestBlood } = useOutletContext<{ onRequestBlood: () => void }>();
  const [me, setMe] = useState<Me | null>(null);
  const [activeDonation, setActiveDonation] = useState<ActiveDonation | null>(null);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);
  const [activeRequestCount, setActiveRequestCount] = useState<number | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [showChangeType, setShowChangeType] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cardSlotRef = useRef<HTMLDivElement>(null);
  const [slotHeightPx, setSlotHeightPx] = useState<number>(0);

  /* Keep slot height in sync when collapsed so when we expand, buttons move zero */
  useLayoutEffect(() => {
    if (cardExpanded) return;
    const el = cardSlotRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (h > 0) setSlotHeightPx(h);
  }, [cardExpanded, me]);

  const fetchMe = () => {
    users.me()
      .then((meRes) => setMe(meRes))
      .catch(() => setMe(null));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, donRes, reqRes, myPastRes] = await Promise.all([
          users.me().catch(() => null),
          donations.myActive().catch(() => null),
          requests.active(0, 0, {}).catch(() => null),
          requests.myPast().catch(() => ({ requests: [] })),
        ]);
        if (!cancelled) {
          setMe(meRes);
          setActiveDonation(donRes?.donations[0] ?? null);
          setActiveRequestCount(reqRes?.requests?.length ?? null);
          const pending = myPastRes.requests.find(r => r.status === 'pending');
          setActiveRequest(pending ? { _id: pending._id, patientName: pending.patientName, bloodTypeNeeded: pending.bloodTypeNeeded, hospitalName: pending.hospitalName, createdAt: pending.createdAt, activeDonationStatus: pending.activeDonationStatus ?? null } : null);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [showChangeType]);

  useEffect(() => {
    const onRequestCreated = () => {
      fetchMe();
      requests.myPast()
        .then(res => {
          const pending = res.requests.find(r => r.status === 'pending');
          setActiveRequest(pending ? { _id: pending._id, patientName: pending.patientName, bloodTypeNeeded: pending.bloodTypeNeeded, hospitalName: pending.hospitalName, createdAt: pending.createdAt, activeDonationStatus: pending.activeDonationStatus ?? null } : null);
        })
        .catch(() => setActiveRequest(null));
    };
    window.addEventListener('blood-request-created', onRequestCreated);
    return () => window.removeEventListener('blood-request-created', onRequestCreated);
  }, []);

  const handleToggle = async () => {
    if (!me) return;
    try {
      if (me.optOut) await users.optIn();
      else await users.optOut();
      setMe(prev => prev ? { ...prev, optOut: !prev.optOut } : null);
    } catch { /* ignore */ }
  };

  const startEditName = () => {
    setNameInput(me?.username ?? '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === me?.username) { setEditingName(false); return; }
    setNameSaving(true);
    try {
      const res = await users.updateUsername(trimmed);
      setMe(prev => prev ? { ...prev, username: res.username } : null);
      setEditingName(false);
    } catch { /* ignore */ }
    finally { setNameSaving(false); }
  };

  const bloodLetter = me?.bloodType.replace(/[+-]/, '') ?? '';
  const bloodSign = me?.bloodType.match(/[+-]/)?.[0] ?? '';
  const isRecovering = !me?.optOut && !!me?.lastDonationDate && (me?.daysUntilCanDonate ?? 0) > 0;

  return (
    <>
    <div className={styles.page}>
      {/* Backdrop when card is lifted (Apple Pay style) */}
      {cardExpanded && (
        <div
          className={styles.cardBackdrop}
          onClick={() => setCardExpanded(false)}
          aria-hidden
        />
      )}

      {/* ── Donor ID Card (lifts out when expanded; slot keeps buttons in place) ── */}
      <div
        ref={cardSlotRef}
        className={styles.cardSlot}
        style={cardExpanded ? { height: slotHeightPx || 110 } : undefined}
      >
      <div className={`${styles.cardWrapper} ${cardExpanded ? styles.cardWrapperLifted : ''}`}>
      <div
        className={`${styles.card} ${cardExpanded ? styles.cardLifted : ''}`}
        style={{ background: 'linear-gradient(135deg, #c0172a 0%, #7a0d1a 100%)' }}
      >
        {cardExpanded && (
          <div className={styles.cardWatermark} aria-hidden>
            <svg viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Drop: low opacity so tree shows through */}
              <path d="M24 3C24 3 5 22 5 36C5 47.4 13.9 55 24 55C34.1 55 43 47.4 43 36C43 22 24 3 24 3Z" fill="white" opacity="0.08"/>
              {/* Tree: higher opacity so it’s visible */}
              <path d="M23,51 L23,44 L9,44 L13,41 L22,42 L22,37 L12,37 L16,34 L22,35 L22,30 L16,30 L19,27 L22,28 L22,24 L20,23 L24,18 L28,23 L26,24 L26,28 L29,27 L32,30 L26,30 L26,35 L32,34 L36,37 L26,37 L26,42 L35,41 L39,44 L25,44 L25,51 Z" fill="white" opacity="0.22"/>
            </svg>
          </div>
        )}
        {/* Card face — fused style: blood type circle | name + Blood Donor | Active/Inactive pill + chevron */}
        <button
          type="button"
          className={styles.cardFace}
          onClick={() => setCardExpanded(e => !e)}
          aria-expanded={cardExpanded}
          aria-label="Expand donor card"
        >
          <div className={styles.cardFaceRow}>
            {/* Left: blood type circle */}
            <div className={styles.cardBloodCircle}>
              <span
                className={styles.cardBloodCircleText}
                style={{ fontSize: me?.bloodType.startsWith('AB') ? '0.9rem' : '1.1rem' }}
              >
                {bloodLetter}<sup className={styles.cardStatSup}>{bloodSign}</sup>
              </span>
            </div>

            {/* Center: name + Blood Donor */}
            <div className={styles.cardFaceCenter}>
              <span className={styles.cardName}>{me?.username ?? '—'}</span>
              <span className={styles.cardRole}>Blood Donor</span>
            </div>

            {/* Right: Active/Recovering/Inactive pill + chevron */}
            <div className={styles.cardFaceRight}>
              <span
                className={`${styles.statusPillFace} ${me?.optOut ? styles.statusPillInactive : isRecovering ? styles.statusPillRecovering : styles.statusPillActive}`}
              >
                {me?.optOut ? 'Inactive' : isRecovering ? 'Recovering' : 'Active'}
              </span>
              <svg
                className={`${styles.chevron} ${cardExpanded ? styles.chevronUp : ''}`}
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
          <div className={styles.cardBranding}>
            <DammiLogoCard className={styles.cardLogo} />
            <span className={styles.cardBrandName}>Dammi</span>
          </div>
        </button>

        {/* Expanded details — Apple Wallet style */}
        {cardExpanded && (
          <div className={styles.cardDetails}>
            <div className={styles.divider} />

            {/* Name edit */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Name</span>
              {editingName ? (
                <div className={styles.nameEditRow}>
                  <input
                    ref={nameInputRef}
                    className={styles.nameInput}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                    disabled={nameSaving}
                    maxLength={32}
                  />
                  <button type="button" className={styles.nameSaveBtn} onClick={saveName} disabled={nameSaving}>
                    {nameSaving ? '…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.detailValueBtn} onClick={startEditName}>
                  {me?.username ?? '—'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Blood type edit */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Blood type</span>
              <button type="button" className={styles.detailValueBtn} onClick={() => setShowChangeType(true)}>
                {me?.bloodType ?? '—'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>

            {/* Donor status toggle */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Donor status</span>
              <button
                type="button"
                className={styles.toggle}
                onClick={handleToggle}
                aria-pressed={!me?.optOut}
              >
                <span className={`${styles.toggleTrack} ${!me?.optOut ? (isRecovering ? styles.toggleRecovering : styles.toggleOn) : ''}`}>
                  <span className={me?.optOut ? styles.thumbOff : styles.thumbOn} />
                </span>
              </button>
            </div>

            {/* Points */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Points</span>
              <span className={styles.detailValue}>{me?.points?.toLocaleString() ?? '0'}</span>
            </div>

            {isRecovering && me?.daysUntilCanDonate != null && (
              <div className={styles.recoveringBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14.5"/></svg>
                Can donate again in <strong>{me.daysUntilCanDonate} days</strong>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      </div>

      {/* ── Main Action Buttons ── */}
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionBtnPrimary} ${styles.actionBtnHero}`}
          onClick={() => navigate('/donate')}
        >
          <span className={styles.actionBtnLabel}>
            <span className={styles.actionBtnIcon}>
              <svg width="18" height="22" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 3C24 3 5 22 5 36C5 47.4 13.9 55 24 55C34.1 55 43 47.4 43 36C43 22 24 3 24 3Z" fill="#FF0000"/>
              </svg>
            </span>
            Active Donation Requests
            {activeRequestCount != null && (
              <span className={styles.badge}>{activeRequestCount}</span>
            )}
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={() => navigate('/past-donations')}
        >
          <span className={styles.actionBtnLabel}>
            <span className={`${styles.actionBtnIcon} ${styles.actionBtnIconGrey}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M12 7v5l4 2"/>
              </svg>
            </span>
            My Past Donations
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

        <button
          type="button"
          className={styles.actionBtnPrimary}
          onClick={() => navigate('/past-requests')}
        >
          <span className={styles.actionBtnLabel}>
            <span className={`${styles.actionBtnIcon} ${styles.actionBtnIconGrey}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
              </svg>
            </span>
            My Past Requests
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

        <button
          type="button"
          className={styles.actionBtnSecondary}
          onClick={onRequestBlood}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Request Blood
        </button>
      </div>

      {/* ── Active Donation Status ── */}
      {activeDonation && (
        <div className={styles.statusCard}>
          <div className={styles.statusCardTop}>
            <div>
              <span className={styles.statusTitle}>Your Active Donation</span>
              <span className={styles.statusSub}>{activeDonation.patientName} · {activeDonation.hospitalName}</span>
            </div>
            <button
              type="button"
              className={styles.statusViewBtn}
              onClick={() => navigate(`/request/${activeDonation.requestId}`)}
            >
              View
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div className={styles.progressRow}>
            {STEPS.map((step, i) => {
              const currentIdx = STEPS.indexOf(activeDonation.status as typeof STEPS[number]);
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step} className={styles.progressStep}>
                  <div className={`${styles.dot} ${done ? styles.dotDone : ''} ${active ? styles.dotActive : ''}`}>
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className={`${styles.dotLabel} ${active ? styles.dotLabelActive : ''}`}>
                    {STEP_LABELS[step]}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`${styles.line} ${done ? styles.lineDone : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Request (your blood request waiting for donors) ── */}
      {activeRequest && (
        <div className={styles.statusCard}>
          <div className={styles.statusCardTop}>
            <div>
              <span className={styles.statusTitle}>Your Active Request</span>
              <span className={styles.statusSub}>{activeRequest.patientName} · {activeRequest.hospitalName} · {activeRequest.bloodTypeNeeded}</span>
            </div>
            <button
              type="button"
              className={styles.statusViewBtn}
              onClick={() => navigate(`/request/${activeRequest._id}`)}
            >
              View
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <span className={styles.statusPillPending}>
            {activeRequest.activeDonationStatus === 'on_the_way' ? 'On the way' : activeRequest.activeDonationStatus === 'pledged' ? 'Pledged' : 'Pending'}
          </span>
        </div>
      )}
    </div>

    {showChangeType && (
      <ChangeTypeModal
        currentBloodType={me?.bloodType ?? 'A+'}
        hasSession={me != null}
        onClose={() => setShowChangeType(false)}
        onSaved={() => setMe(prev => prev ? { ...prev } : null)}
      />
    )}
    </>
  );
}

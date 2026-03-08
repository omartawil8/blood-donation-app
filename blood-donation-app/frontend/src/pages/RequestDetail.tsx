import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requests, donations, users } from '../api/client';
import { useGeo } from '../hooks/useGeo';
import { isCompatible, compatibleDonorTypes } from '../utils/compatibility';
import PointsEarnedModal from '../components/PointsEarnedModal';
import styles from './RequestDetail.module.css';

type DonationStatus = 'pledged' | 'on_the_way' | 'donated' | 'cancelled';
const POINTS_LABEL = '1,000 pts';

export default function RequestDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { lng, lat } = useGeo();
  // Snapshot coords once on mount so GPS updates don't re-trigger the fetch
  const [coords] = useState(() => ({ lng: lng ?? -0.12, lat: lat ?? 51.5 }));
  const [request, setRequest] = useState<{
    _id: string;
    patientName: string;
    patientAge?: number;
    bloodTypeNeeded: string;
    hospitalId: { name: string; address: string };
    distanceKm?: number;
    createdAt: string;
    notes?: string;
    requiredBy?: string;
    activeDonationStatus?: string | null;
  } | null>(null);
  const [myBloodType, setMyBloodType] = useState<string>('');
  const [donation, setDonation] = useState<{ _id: string; status: DonationStatus } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    (async () => {
      try {
        const [meRes, reqData, donData] = await Promise.all([
          users.me().catch(() => null),
          requests.get(requestId, coords.lng, coords.lat),
          donations.byRequest(requestId).catch(() => null),
        ]);
        if (!cancelled) {
          setMyBloodType(meRes?.bloodType ?? '');
          setRequest(reqData);
          setDonation(
            donData ? { _id: donData._id, status: donData.status as DonationStatus } : null
          );
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  const compatible = request ? isCompatible(myBloodType, request.bloodTypeNeeded) : false;
  const compatibleTypes = request ? compatibleDonorTypes(request.bloodTypeNeeded) : [];
  const isExpired =
    request?.requiredBy && new Date(request.requiredBy) < new Date();

  const handlePledge = async () => {
    if (!requestId || !compatible) return;
    setActionLoading(true);
    try {
      const d = await donations.pledge(requestId);
      setDonation({ _id: d._id, status: d.status as DonationStatus });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatus = async (status: DonationStatus) => {
    if (!donation) return;
    setActionLoading(true);
    try {
      const res = await donations.updateStatus(donation._id, status);
      setDonation((prev) => (prev ? { ...prev, status } : null));
      if (res.pointsEarned != null) {
        setPointsEarned(res.pointsEarned);
        setShowPointsModal(true);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!donation) return;
    setActionLoading(true);
    try {
      const res = await donations.confirm(donation._id);
      setDonation((prev) => (prev ? { ...prev, status: 'donated' } : null));
      setPointsEarned(res.pointsEarned);
      setShowPointsModal(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const directionsUrl = request
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [request.hospitalId?.address, request.hospitalId?.name].filter(Boolean).join(', ')
      )}`
    : '#';

  if (loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (error || !request) {
    return (
      <div className={styles.loading}>
        <p>Could not load request.</p>
        <button type="button" onClick={() => navigate(-1)} style={{ marginTop: '1rem', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', textDecoration: 'underline' }}>
          Go back
        </button>
      </div>
    );
  }

  const donorStatusLabel = request.activeDonationStatus === 'on_the_way' ? 'Donor is on the way' : request.activeDonationStatus === 'pledged' ? 'A donor has pledged' : null;

  return (
    <div className={styles.page}>
      {donorStatusLabel && !donation && (
        <div className={styles.donorStatusBanner}>
          <span className={styles.donorStatusBannerText}>{donorStatusLabel}</span>
        </div>
      )}
      <section className={styles.recipientCard}>
        <div className={styles.bloodTypeCircle}>{request.bloodTypeNeeded}</div>
        <div className={styles.recipientInfo}>
          <span className={styles.patientName}>{request.patientName}</span>
          {request.patientAge != null && (
            <span className={styles.patientAge}>{request.patientAge} yrs</span>
          )}
        </div>
        {isExpired && <span className={styles.expiredTag}>Expired</span>}
      </section>

      <section className={styles.card}>
        <div className={styles.compatHeader}>
          <h3 className={styles.cardTitle}>Compatible Donors</h3>
          {compatible ? (
            <span className={styles.compatPillYes}>You&apos;re compatible</span>
          ) : (
            <span className={styles.compatPillNo}>You&apos;re not compatible</span>
          )}
        </div>
        <p className={styles.compatSubtitle}>
          The following blood types can donate to {request.bloodTypeNeeded}
        </p>
        <div className={styles.compatPills}>
          {compatibleTypes.map((t) => (
            <span key={t} className={styles.compatPill}>{t}</span>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Details</h3>
        <div className={styles.detailRow}>
          <span className={styles.detailIcon} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </span>
          <div className={styles.detailText}>
            <p className={styles.detailPrimary}>{request.hospitalId?.name}</p>
            <p className={styles.detailSecondary}>{request.hospitalId?.address}</p>
          </div>
        </div>
        {request.distanceKm != null && (
          <div className={styles.detailRow}>
            <span className={styles.detailIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/></svg>
            </span>
            <div className={styles.detailText}>
              <p className={styles.detailPrimary}>{request.distanceKm.toFixed(1)} km Away</p>
              <p className={styles.detailSecondary}>From your location</p>
            </div>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.detailIcon} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </span>
          <div className={styles.detailText}>
            <p className={styles.detailPrimary}>Requested</p>
            <p className={styles.detailSecondary}>{formatTime(request.createdAt)}</p>
          </div>
        </div>
      </section>

      {request.notes && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Additional Notes</h3>
          <p className={styles.notes}>{request.notes}</p>
        </section>
      )}

      <div className={styles.actions}>
        {!donation && (
          <>
            {compatible && (
              <p className={styles.ptsHint}>You&apos;ll earn 🔥 {POINTS_LABEL}</p>
            )}
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!compatible || actionLoading}
              onClick={handlePledge}
            >
              {actionLoading ? '…' : 'I Can Donate'}
            </button>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.getDirections}
            >
              Get Directions
            </a>
          </>
        )}

        {donation && donation.status === 'pledged' && (
          <>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={actionLoading}
              onClick={() => handleStatus('on_the_way')}
            >
              I&apos;m on the way
            </button>
            <button
              type="button"
              className={styles.linkCancel}
              onClick={() => handleStatus('cancelled')}
              disabled={actionLoading}
            >
              Can&apos;t make it this time
            </button>
          </>
        )}

        {donation && donation.status === 'on_the_way' && (
          <>
            <p className={styles.ptsHint}>You&apos;ll earn 🔥 {POINTS_LABEL}</p>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={actionLoading}
              onClick={() => handleStatus('donated')}
            >
              I donated
            </button>
            <button
              type="button"
              className={styles.linkCancel}
              onClick={() => handleStatus('cancelled')}
              disabled={actionLoading}
            >
              Transportation issue
            </button>
          </>
        )}

        {donation && donation.status === 'donated' && pointsEarned == null && (
          <>
            <p className={styles.ptsHint}>You&apos;ll earn 🔥 {POINTS_LABEL}</p>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={actionLoading}
              onClick={handleConfirm}
            >
              Confirm Donation
            </button>
          </>
        )}
      </div>

      {showPointsModal && pointsEarned != null && (
        <PointsEarnedModal
          points={pointsEarned}
          onBack={() => {
            setShowPointsModal(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { users } from '../api/client';
import styles from './ChangeTypeModal.module.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

type Props = {
  currentBloodType: string;
  hasSession: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function ChangeTypeModal({ currentBloodType, hasSession, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState(currentBloodType || 'A+');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Sync selected when currentBloodType loads (me arrives after modal opens)
  useEffect(() => {
    if (currentBloodType && selected === '') {
      setSelected(currentBloodType);
    }
  }, [currentBloodType]);

  const dismiss = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onCloseRef.current(), 300);
    return () => clearTimeout(t);
  }, [closing]);

  const handleConfirm = async () => {
    if (!hasSession) {
      localStorage.removeItem('bloodDonorUserId');
      window.location.href = '/login';
      return;
    }
    if (selected === currentBloodType) {
      dismiss();
      return;
    }
    setLoading(true);
    try {
      await users.updateBloodType(selected);
      onSaved();
      dismiss();
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('not found') || msg.includes('404') || msg.includes('userId')) {
        localStorage.removeItem('bloodDonorUserId');
        window.location.href = '/login';
      } else {
        alert(msg || 'Could not update blood type.');
      }
    }
  };

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayOut : ''}`} onClick={dismiss} role="presentation">
      <div className={`${styles.sheet} ${closing ? styles.sheetOut : ''}`} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className={styles.handle} />
        <div className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={dismiss} aria-label="Back">
            ←
          </button>
          <h2 className={styles.title}>Change Blood Type</h2>
        </div>
        <p className={styles.instruction}>Select new blood type</p>
        <div className={styles.grid}>
          {BLOOD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={
                selected === t
                  ? styles.pillActive
                  : t === currentBloodType && selected !== currentBloodType
                  ? styles.pillPrev
                  : styles.pill
              }
              onClick={() => setSelected(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.confirm}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

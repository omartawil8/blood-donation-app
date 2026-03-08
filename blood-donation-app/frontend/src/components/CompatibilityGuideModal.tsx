import { useState, useEffect, useRef } from 'react';
import styles from './CompatibilityGuideModal.module.css';

const COMPAT: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

const ORDER: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type Props = {
  onClose: () => void;
};

export default function CompatibilityGuideModal({ onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dismiss = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onCloseRef.current(), 300);
    return () => clearTimeout(t);
  }, [closing]);

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayOut : ''}`}
      onClick={dismiss}
      role="presentation"
    >
      <div
        className={`${styles.sheet} ${closing ? styles.sheetOut : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="compat-guide-title"
      >
        <div className={styles.handle} />
        <div className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={dismiss} aria-label="Back">
            ←
          </button>
          <h2 id="compat-guide-title" className={styles.title}>
            Blood Compatibility Guide
          </h2>
        </div>
        <p className={styles.subtitle}>
          Who can donate to whom. Recipients can receive from the types listed.
        </p>
        <div className={styles.diagram}>
          {ORDER.map((recipient) => (
            <div key={recipient} className={styles.row}>
              <span className={styles.recipient}>{recipient}</span>
              <span className={styles.arrow} aria-hidden>
                ←
              </span>
              <span className={styles.donors}>
                {(COMPAT[recipient] ?? []).join(', ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

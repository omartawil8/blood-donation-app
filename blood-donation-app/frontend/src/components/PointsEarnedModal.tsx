import styles from './PointsEarnedModal.module.css';

type Props = {
  points: number;
  onBack: () => void;
};

export default function PointsEarnedModal({ points, onBack }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog">
        <div className={styles.iconWrap}>
          <span className={styles.drop} aria-hidden>🩸</span>
        </div>
        <p className={styles.ptsValue}>{points.toLocaleString()} Pts</p>
        <p className={styles.text}>
          You earned {points.toLocaleString()} points for donating blood and helping others!
        </p>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

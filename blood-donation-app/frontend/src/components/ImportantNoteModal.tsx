import styles from './ImportantNoteModal.module.css';

type Props = {
  daysSinceLastDonation: number;
  daysUntilCanDonate: number;
  cooldownDays: number;
  onClose: () => void;
};

export default function ImportantNoteModal({
  daysSinceLastDonation,
  daysUntilCanDonate,
  cooldownDays,
  onClose,
}: Props) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className={styles.header}>
          <h3 className={styles.title}>Important Note</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.text}>
          Based on medical guidelines, you shouldn&apos;t donate more than once every {cooldownDays} days.
          You last donated {daysSinceLastDonation} days ago. You can donate again in {daysUntilCanDonate} days.
        </p>
      </div>
    </div>
  );
}

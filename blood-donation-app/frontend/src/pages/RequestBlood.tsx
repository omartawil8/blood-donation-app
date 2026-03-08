import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requests } from '../api/client';
import SelectHospital from './SelectHospital';
import styles from './RequestBlood.module.css';

const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function RequestBlood({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [bloodTypeNeeded, setBloodTypeNeeded] = useState('');
  const [unitsNeeded, setUnitsNeeded] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const blood = bloodTypeNeeded || (await Promise.reject(new Error('Please select a blood type')));
      await requests.create({
        patientName: patientName.trim() || undefined,
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
        hospitalId: hospitalId || (await Promise.reject(new Error('Please select a hospital'))),
        bloodTypeNeeded: blood,
        unitsNeeded: unitsNeeded ? parseInt(unitsNeeded, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      window.dispatchEvent(new CustomEvent('blood-request-created'));
      navigate('/', { replace: true });
      onClose?.();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Submit failed']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.stickyTop}>
        <div className={styles.handle} aria-hidden />
        <div className={styles.sheetHeader}>
          <button type="button" className={styles.backBtn} onClick={() => { navigate('/'); onClose?.(); }} aria-label="Back">
            ←
          </button>
          <h2 className={styles.title}>Request Blood</h2>
        </div>
      </div>

      <div className={styles.formScroll}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Hospital *</label>
            <div className={styles.hospitalRow} onClick={() => setShowHospitals(true)} onKeyDown={(e) => e.key === 'Enter' && setShowHospitals(true)} role="button" tabIndex={0}>
              <input
                type="text"
                value={hospitalName}
                readOnly
                placeholder="Enter hospital name"
                className={styles.input}
                tabIndex={-1}
              />
              <span className={styles.dropdownIcon} aria-hidden>▼</span>
            </div>
            <input type="hidden" value={hospitalId} readOnly />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Blood type needed *</label>
            <div className={styles.bloodGrid}>
              {BLOOD_OPTIONS.map((t) => (
                <label key={t} className={bloodTypeNeeded === t ? styles.pillActive : styles.pill}>
                  <input
                    type="radio"
                    name="bloodType"
                    value={t}
                    checked={bloodTypeNeeded === t}
                    onChange={() => setBloodTypeNeeded(t)}
                    className={styles.radioHidden}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name (optional)"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Patient Age</label>
            <input
              type="number"
              min={1}
              max={120}
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="Age"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Number of Units</label>
            <input
              type="number"
              min={1}
              value={unitsNeeded}
              onChange={(e) => setUnitsNeeded(e.target.value)}
              placeholder="Enter Number of Units"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
          <label className={styles.label}>Notes</label>
          <div className={styles.textareaWrap}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 150))}
              placeholder="Enter note for the requester..."
              rows={3}
              maxLength={150}
              className={styles.textarea}
            />
            <span className={styles.charCount}>{notes.length}/150</span>
          </div>
        </div>

        {errors.length > 0 && (
          <div className={styles.errors}>{errors.join(', ')}</div>
        )}

          <button type="submit" disabled={loading || !hospitalId || !bloodTypeNeeded} className={styles.submit}>
            {loading ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </div>

      {/* Hospital selector nested sheet */}
      {showHospitals && (
        <div className={styles.hospitalSheet}>
          <SelectHospital
            onSelect={(id, name) => { setHospitalId(id); setHospitalName(name); setShowHospitals(false); }}
            onClose={() => setShowHospitals(false)}
          />
        </div>
      )}
    </div>
  );
}

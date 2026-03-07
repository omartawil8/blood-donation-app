import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { users } from '../api/client';
import styles from './Login.module.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [bloodType, setBloodType] = useState<string>(BLOOD_TYPES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await users.create({ username: username.trim(), bloodType });
      localStorage.setItem('bloodDonorUserId', res._id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Blood Donor</h1>
        <p className={styles.subtitle}>Enroll to receive blood requests near you</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              required
              autoFocus
            />
          </label>
          <label>
            Blood type
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
              {BLOOD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? 'Joining…' : 'Join as donor'}
          </button>
        </form>
      </div>
    </div>
  );
}

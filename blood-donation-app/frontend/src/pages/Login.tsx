import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { users } from '../api/client';
import styles from './Login.module.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

type Lang = 'en' | 'ar' | 'fr';

const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English',  dir: 'ltr' },
  { code: 'ar', label: 'العربية',  dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
];

const COPY: Record<Lang, {
  tagline: string;
  langPrompt: string;
  cardTitle: string;
  cardSubtitle: string;
  namePlaceholder: string;
  nameLabel: string;
  bloodLabel: string;
  join: string;
  joining: string;
}> = {
  en: {
    tagline: 'Save lives in your community',
    langPrompt: 'Choose your language',
    cardTitle: 'Get started',
    cardSubtitle: 'Donate blood or make requests to hospitals near you',
    namePlaceholder: 'Nour M.',
    nameLabel: 'Name',
    bloodLabel: 'Blood type',
    join: 'Join',
    joining: 'Joining…',
  },
  ar: {
    tagline: 'أنقذ الأرواح في مجتمعك',
    langPrompt: 'اختر لغتك',
    cardTitle: 'ابدأ الآن',
    cardSubtitle: 'تبرع بالدم أو قدّم طلبات للمستشفيات القريبة منك',
    namePlaceholder: 'نور ك.',
    nameLabel: 'الاسم',
    bloodLabel: 'فصيلة الدم',
    join: 'انضم',
    joining: 'جارٍ الانضمام…',
  },
  fr: {
    tagline: 'Sauvez des vies dans votre communauté',
    langPrompt: 'Choisissez votre langue',
    cardTitle: 'Commencer',
    cardSubtitle: 'Donnez du sang ou faites des demandes aux hôpitaux près de chez vous',
    namePlaceholder: 'Nour M.',
    nameLabel: 'Nom',
    bloodLabel: 'Groupe sanguin',
    join: 'Rejoindre',
    joining: 'En cours…',
  },
};

const CAROUSEL_INTERVAL_MS = 2200;
const ARROW_DELAY_MS = 1800;

const BloodDropLogo = () => (
  <svg className={styles.heroIcon} viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 3C24 3 5 22 5 36C5 47.4 13.9 55 24 55C34.1 55 43 47.4 43 36C43 22 24 3 24 3Z" fill="white"/>
    <path d="M23,51 L23,44 L9,44 L13,41 L22,42 L22,37 L12,37 L16,34 L22,35 L22,30 L16,30 L19,27 L22,28 L22,24 L20,23 L24,18 L28,23 L26,24 L26,28 L29,27 L32,30 L26,30 L26,35 L32,34 L36,37 L26,37 L26,42 L35,41 L39,44 L25,44 L25,51 Z" fill="#b01525"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [carouselFade, setCarouselFade] = useState(true);
  const [showArrow, setShowArrow] = useState(false);
  const [lang, setLang] = useState<Lang | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [bloodType, setBloodType] = useState<string>(BLOOD_TYPES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameRowRef = useRef<HTMLDivElement>(null);

  // Gradient and scroll lock: body-level so phone bottom is never white; extend into safe area
  const gradient = 'linear-gradient(170deg, #FF0000 0%, #990000 100%)';
  const minHeightWithSafeArea = 'calc(100dvh + env(safe-area-inset-bottom, 0px))';
  useEffect(() => {
    const html = document.documentElement;
    const root = document.getElementById('root');
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevHtmlMinH = html.style.minHeight;
    const prevBg = body.style.background;
    const prevRootBg = root?.style.background ?? '';
    const prevPadding = body.style.padding;
    const prevMinH = body.style.minHeight;
    const prevOverflow = body.style.overflow;
    const prevOvX = body.style.overflowX;
    const prevOvY = body.style.overflowY;
    html.style.background = gradient;
    html.style.backgroundSize = 'cover';
    html.style.minHeight = minHeightWithSafeArea;
    body.style.background = gradient;
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
    body.style.minHeight = minHeightWithSafeArea;
    body.style.padding = '0';
    if (root) root.style.background = 'transparent';
    body.style.overflow = 'hidden';
    body.style.overflowX = 'hidden';
    body.style.overflowY = 'hidden';
    return () => {
      html.style.background = prevHtmlBg;
      html.style.backgroundSize = '';
      html.style.minHeight = prevHtmlMinH;
      body.style.background = prevBg;
      body.style.backgroundSize = '';
      body.style.backgroundAttachment = '';
      body.style.minHeight = prevMinH;
      body.style.padding = prevPadding;
      if (root) root.style.background = prevRootBg;
      body.style.overflow = prevOverflow;
      body.style.overflowX = prevOvX;
      body.style.overflowY = prevOvY;
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!localStorage.getItem('bloodDonorUserId')) return;
    users.me()
      .then(() => navigate('/', { replace: true }))
      .catch(() => localStorage.removeItem('bloodDonorUserId'));
  }, [navigate]);

  // Rotate carousel until language is selected
  useEffect(() => {
    if (lang) return;
    const interval = setInterval(() => {
      setCarouselFade(false);
      setTimeout(() => {
        setCarouselIdx(i => (i + 1) % LANGS.length);
        setCarouselFade(true);
      }, 300);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [lang]);

  // Show arrow after delay
  useEffect(() => {
    const t = setTimeout(() => setShowArrow(true), ARROW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const handleSelectLang = (l: Lang) => {
    setLang(l);
    setCarouselFade(true);
    setShowSignup(true);
  };

  const handleBackToLang = () => {
    setShowSignup(false);
    setLang(null);
  };

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

  const activeLang = lang ?? LANGS[carouselIdx].code;
  const copy = COPY[activeLang];
  const dir = LANGS.find(l => l.code === activeLang)?.dir ?? 'ltr';

  const taglineText = lang !== null ? copy.tagline : COPY[LANGS[carouselIdx].code].tagline;
  const taglineDir = lang !== null ? dir : LANGS[carouselIdx].dir;
  const taglineVisible = lang !== null || carouselFade;

  return (
    <>
      {/* Gradient rendered into body so it’s never clipped by #root (fixes white bottom on phone) */}
      {createPortal(
        <div className={styles.gradientLayer} aria-hidden />,
        document.body
      )}
      <div className={styles.page} data-signup-open={showSignup}>
        <div className={styles.hero}>
          <BloodDropLogo />

          <h1 className={styles.appName}>Dammi</h1>
          {/* Single tagline only — no crossfade, avoids glitch on phone when changing language */}
          <p
            key={lang ?? 'carousel'}
            className={
              lang !== null
                ? styles.taglineSingle
                : `${styles.taglineSingle} ${taglineVisible ? styles.taglineVisible : styles.taglineHidden}`
            }
            dir={taglineDir}
          >
            {taglineText}
          </p>

          {/* Language picker or arrow */}
        {!lang && showArrow && !showSignup && (
          <div className={styles.langPicker}>
            {LANGS.map(l => (
              <button
                key={l.code}
                type="button"
                className={`${styles.langBtn} ${lang === l.code ? styles.langBtnActive : ''}`}
                onClick={() => handleSelectLang(l.code)}
                dir={l.dir}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showSignup && lang && (
        <div className={styles.cardWrap}>
          <div className={styles.card} dir={dir}>
            <div className={styles.cardHandle} />
            <button
              type="button"
              className={styles.cardBackBtn}
              onClick={handleBackToLang}
              aria-label="Back to language selection"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{copy.cardTitle}</h2>
              <p className={styles.cardSubtitle}>{copy.cardSubtitle}</p>
            </div>
            <form
              onSubmit={handleSubmit}
              className={styles.form}
              onTouchStartCapture={(e) => {
                const row = nameRowRef.current;
                const t = e.touches[0];
                if (!row || !t) return;
                const rect = row.getBoundingClientRect();
                if (t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom) {
                  e.preventDefault();
                  e.stopPropagation();
                  nameInputRef.current?.focus();
                }
              }}
              onPointerDownCapture={(e) => {
                const row = nameRowRef.current;
                if (!row || e.clientX == null) return;
                const rect = row.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                  e.preventDefault();
                  e.stopPropagation();
                  nameInputRef.current?.focus();
                }
              }}
            >
              <div className={styles.inputGroup}>
                <div
                  ref={nameRowRef}
                  className={`${styles.inputRow} ${styles.inputRowFirst}`}
                >
                  <label htmlFor="name" className={styles.inputLabel}>{copy.nameLabel}</label>
                  <input
                    ref={nameInputRef}
                    id="name"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={copy.namePlaceholder}
                    required
                    className={styles.input}
                    autoComplete="name"
                  />
                </div>
                <div className={styles.inputRow}>
                  <span className={styles.inputLabel}>{copy.bloodLabel}</span>
                  <div className={styles.selectWrap}>
                    <select
                      id="bloodType"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className={styles.select}
                    >
                      {BLOOD_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <svg className={styles.selectChevron} viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" disabled={loading} className={styles.btn}>
                {loading ? copy.joining : copy.join}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

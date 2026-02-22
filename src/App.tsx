import { FormEvent, useEffect, useRef, useState } from 'react';
import { animated, to, useSpring } from '@react-spring/web';
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform
} from 'framer-motion';

type TrailPoint = {
  x: number;
  y: number;
  angle: number;
};

type RideCard = {
  title: string;
  date: string;
  time?: string;
  level: string;
  km: string;
};

type RideDisplayCard = RideCard & {
  placeholder?: boolean;
  icon?: string;
};

const bikeImage = '/dirtbike.png';

const images = [
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1564429097439-e4003829f6e7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?auto=format&fit=crop&w=900&q=80'
];

const defaultRideCards: RideCard[] = [
  { title: 'Kathmandu Dust Loop', date: 'Mar 9', level: 'Intermediate', km: '90 km' },
  { title: 'Shivapuri Ridge Climb', date: 'Mar 23', level: 'Advanced', km: '70 km' },
  { title: 'Pokhara Valley Enduro', date: 'Apr 6', level: 'Mixed Group', km: '130 km' }
];

const placeholderRideCards: RideDisplayCard[] = [
  {
    title: 'Ride Board Warming Up',
    date: '\u{1F5D3}\u{FE0F} TBD',
    level: '\u{1F6E0}\u{FE0F} Syncing',
    km: '\u{1F4CD} -- km',
    placeholder: true,
    icon: '\u{1F3CD}\u{FE0F}'
  },
  {
    title: 'Next Himalayan Drop',
    date: '\u{1F304} Coming Soon',
    level: '\u{1F465} Open Group',
    km: '\u{1F4CD} -- km',
    placeholder: true,
    icon: '\u{1F3D4}\u{FE0F}'
  },
  {
    title: 'Dust Run Preview',
    date: '\u{2728} Stay Tuned',
    level: '\u{1F3AF} Trail Mix',
    km: '\u{1F4CD} -- km',
    placeholder: true,
    icon: '\u{1F6A9}'
  }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseRideCards(payload: unknown): RideCard[] {
  const isHeaderLike = (value: string, tokens: string[]) =>
    tokens.some((token) => value.toLowerCase() === token.toLowerCase());

  const normalizeFromObject = (item: Record<string, unknown>): RideCard | null => {
    const title = pickString(item, ['title', 'ride', 'name']);
    const date = pickString(item, ['date', 'rideDate']);
    const time = pickString(item, ['time', 'rideTime']);
    const level = pickString(item, ['level', 'difficulty', 'group']);
    const km = pickString(item, ['km', 'distance']);

    if (!title || !date || !level || !km) return null;
    if (
      isHeaderLike(title, ['title', 'ride', 'name']) ||
      isHeaderLike(date, ['date']) ||
      isHeaderLike(level, ['level', 'difficulty', 'group']) ||
      isHeaderLike(km, ['km', 'distance'])
    ) {
      return null;
    }

    return { title, date, time, level, km };
  };

  const normalizeFromArray = (item: unknown[]): RideCard | null => {
    const hasFiveCols = item.length >= 5;
    const date = item[0];
    const time = hasFiveCols ? item[1] : '';
    const title = hasFiveCols ? item[2] : item[1];
    const level = hasFiveCols ? item[3] : item[2];
    const km = hasFiveCols ? item[4] : item[3];
    if (
      typeof title !== 'string' ||
      typeof date !== 'string' ||
      typeof level !== 'string' ||
      typeof km !== 'string'
    ) {
      return null;
    }

    if (!title.trim() || !date.trim() || !level.trim() || !km.trim()) return null;
    if (
      isHeaderLike(title.trim(), ['title', 'ride', 'name']) ||
      isHeaderLike(date.trim(), ['date']) ||
      isHeaderLike(level.trim(), ['level', 'difficulty', 'group']) ||
      isHeaderLike(km.trim(), ['km', 'distance'])
    ) {
      return null;
    }

    return {
      title: title.trim(),
      date: date.trim(),
      time: typeof time === 'string' ? time.trim() : '',
      level: level.trim(),
      km: km.trim()
    };
  };

  let rawList: unknown[] = [];
  if (Array.isArray(payload)) rawList = payload;
  if (isRecord(payload) && Array.isArray(payload.rides)) rawList = payload.rides;
  if (isRecord(payload) && Array.isArray(payload.data)) rawList = payload.data;

  const rides = rawList
    .map((item) => {
      if (Array.isArray(item)) return normalizeFromArray(item);
      if (isRecord(item)) return normalizeFromObject(item);
      return null;
    })
    .filter((item): item is RideCard => item !== null);

  return rides;
}

function parseGalleryImages(payload: unknown): string[] {
  const normalize = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (isRecord(value)) {
      const url = pickString(value, ['url', 'link', 'src', 'image']);
      if (url) return url;
    }
    return null;
  };

  let rawList: unknown[] = [];
  if (Array.isArray(payload)) rawList = payload;
  if (isRecord(payload) && Array.isArray(payload.images)) rawList = payload.images;
  if (isRecord(payload) && Array.isArray(payload.data)) rawList = payload.data;

  return rawList.map(normalize).filter((item): item is string => item !== null);
}

function formatRideDateNpt(dateValue: string, timeValue?: string): string {
  const dateTrimmed = dateValue.trim();
  const timeTrimmed = (timeValue ?? '').trim();
  if (!dateTrimmed) return 'TBD';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateTrimmed);
  const timeOnlyMatch = /^(\d{1,2}):(\d{2})$/.exec(timeTrimmed);

  const dateBase = dateOnlyMatch
    ? new Date(`${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}T00:00:00+05:45`)
    : new Date(dateTrimmed);
  if (Number.isNaN(dateBase.getTime())) return dateTrimmed;

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateBase);

  if (!timeTrimmed) return dateLabel;

  const amPmTimeMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeTrimmed);
  if (amPmTimeMatch) {
    const hour = Number(amPmTimeMatch[1]);
    const minute = amPmTimeMatch[2];
    const suffix = amPmTimeMatch[3].toUpperCase();
    const normalizedHour = hour >= 1 && hour <= 12 ? hour : ((hour % 12) || 12);
    return `${dateLabel} · ${normalizedHour}:${minute} ${suffix} NPT`;
  }

  const legacyClockMatch = /\b(\d{1,2}):(\d{2})(?::\d{2})?\b/.exec(timeTrimmed);
  if (legacyClockMatch) {
    const hour24 = Number(legacyClockMatch[1]);
    const minute = legacyClockMatch[2];
    if (hour24 >= 0 && hour24 <= 23) {
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = (hour24 % 12) || 12;
      return `${dateLabel} · ${hour12}:${minute} ${suffix} NPT`;
    }
  }

  if (timeOnlyMatch) {
    const hh = timeOnlyMatch[1].padStart(2, '0');
    const mm = timeOnlyMatch[2];
    const dateStamp = dateOnlyMatch
      ? `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`
      : '2000-01-01';
    const withTime = new Date(`${dateStamp}T${hh}:${mm}:00+05:45`);
    if (!Number.isNaN(withTime.getTime())) {
      const timeLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kathmandu',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(withTime);
      return `${dateLabel} · ${timeLabel} NPT`;
    }
  }

  return dateLabel;
}

function useRouteBike(scrollProgress: MotionValue<number>) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [point, setPoint] = useState<TrailPoint>({ x: 30, y: 250, angle: 0 });

  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    const path = pathRef.current;
    if (!path) return;

    const total = path.getTotalLength();
    const clamped = Math.max(0, Math.min(1, latest));
    const current = path.getPointAtLength(total * clamped);
    const lookAhead = path.getPointAtLength(Math.min(total, total * clamped + 1));
    const angle = Math.atan2(lookAhead.y - current.y, lookAhead.x - current.x) * (180 / Math.PI);

    setPoint({ x: current.x, y: current.y, angle });
  });

  return { pathRef, point };
}

function TiltCard({ title, text }: { title: string; text: string }) {
  const [spring, api] = useSpring(() => ({ rx: 0, ry: 0, s: 1 }));

  return (
    <animated.article
      className="stat-card"
      style={{
        transform: to(
          [spring.rx, spring.ry, spring.s],
          (rx, ry, s) => `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`
        )
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        api.start({
          ry: (px - 0.5) * 12,
          rx: (0.5 - py) * 10,
          s: 1.02,
          config: { mass: 2, tension: 240, friction: 24 }
        });
      }}
      onPointerLeave={() => {
        api.start({ rx: 0, ry: 0, s: 1, config: { tension: 200, friction: 20 } });
      }}
    >
      <h3>{title}</h3>
      <p>{text}</p>
    </animated.article>
  );
}

function RealBikeImage({ className }: { className?: string }) {
  return (
    <img className={className} src={bikeImage} alt="" aria-hidden="true" loading="eager" decoding="async" />
  );
}

function PrayerFlagSection({ className }: { className?: string }) {
  return (
    <section className={`flag-section${className ? ` ${className}` : ''}`} aria-label="Buddhist prayer flags">
      <div className="flag-row row-a">
        <span className="flag blue" /><span className="flag white" /><span className="flag red" />
        <span className="flag green" /><span className="flag yellow" /><span className="flag blue" />
        <span className="flag white" /><span className="flag red" /><span className="flag green" />
        <span className="flag yellow" />
      </div>
      <div className="flag-row row-b">
        <span className="flag yellow" /><span className="flag blue" /><span className="flag white" />
        <span className="flag red" /><span className="flag green" /><span className="flag yellow" />
        <span className="flag blue" /><span className="flag white" /><span className="flag red" />
        <span className="flag green" />
      </div>
      <div className="flag-row row-c">
        <span className="flag green" /><span className="flag yellow" /><span className="flag blue" />
        <span className="flag white" /><span className="flag red" /><span className="flag green" />
        <span className="flag yellow" /><span className="flag blue" /><span className="flag white" />
        <span className="flag red" />
      </div>
    </section>
  );
}

function App() {
  const sheetsWebhookUrl = import.meta.env.VITE_SHEETS_WEBHOOK_URL as string | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [rideCards, setRideCards] = useState<RideCard[]>(sheetsWebhookUrl ? [] : defaultRideCards);
  const [rideSource, setRideSource] = useState<'loading' | 'sheet' | 'fallback' | 'empty' | 'error'>(
    sheetsWebhookUrl ? 'loading' : 'fallback'
  );
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [gallerySource, setGallerySource] = useState<'loading' | 'sheet' | 'empty' | 'error'>(
    sheetsWebhookUrl ? 'loading' : 'empty'
  );
  const [rideCarouselIndex, setRideCarouselIndex] = useState(0);
  const { scrollYProgress } = useScroll();

  const bikeX = useTransform(scrollYProgress, [0, 1], ['-22vw', '108vw']);
  const bikeY = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [4, -10, 8, -6, 4]);
  const dustScale = useTransform(scrollYProgress, [0, 1], [0.8, 1.45]);
  const dustOpacity = useTransform(scrollYProgress, [0, 1], [0.3, 0.6]);
  const trailProgressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const blobYAlt = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroRotate = useTransform(scrollYProgress, [0, 1], [0, -2.5]);
  const mountainDepth = useTransform(scrollYProgress, [0, 1], [0, 35]);

  const { pathRef, point } = useRouteBike(scrollYProgress);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 1700);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.body.style.overflow = loading || menuOpen ? 'hidden' : '';
  }, [loading, menuOpen]);

  useEffect(() => {
    let active = true;

    async function loadRides() {
      if (!sheetsWebhookUrl) {
        setRideCards(defaultRideCards);
        setRideSource('fallback');
        return;
      }

      try {
        setRideCards([]);
        setRideSource('loading');
        const ridesUrl = `${sheetsWebhookUrl}${sheetsWebhookUrl.includes('?') ? '&' : '?'}type=rides`;
        const response = await fetch(ridesUrl, { method: 'GET' });
        if (!response.ok) {
          if (!active) return;
          setRideCards([]);
          setRideSource('error');
          return;
        }

        const rawText = await response.text();
        let payload: unknown = null;
        try {
          payload = JSON.parse(rawText);
        } catch {
          if (!active) return;
          setRideCards([]);
          setRideSource('error');
          return;
        }

        const parsed = parseRideCards(payload);
        if (!active) return;
        if (parsed.length === 0) {
          setRideCards([]);
          setRideSource('empty');
          return;
        }

        setRideCards(
          parsed.map((ride) => ({
            ...ride,
            date: formatRideDateNpt(ride.date, ride.time)
          }))
        );
        setRideSource('sheet');
      } catch {
        if (!active) return;
        setRideCards([]);
        setRideSource('error');
      }
    }

    loadRides();

    return () => {
      active = false;
    };
  }, [sheetsWebhookUrl]);

  useEffect(() => {
    let active = true;

    async function loadGalleryImages() {
      if (!sheetsWebhookUrl) {
        setGalleryImages([]);
        setGallerySource('empty');
        return;
      }

      try {
        setGalleryImages([]);
        setGallerySource('loading');
        const galleryUrl = `${sheetsWebhookUrl}${sheetsWebhookUrl.includes('?') ? '&' : '?'}type=gallery`;
        const response = await fetch(galleryUrl, { method: 'GET' });
        if (!response.ok) {
          if (!active) return;
          setGalleryImages([]);
          setGallerySource('error');
          return;
        }

        const rawText = await response.text();
        const payload = JSON.parse(rawText) as unknown;
        const parsed = parseGalleryImages(payload);
        if (!active) return;
        if (parsed.length === 0) {
          setGalleryImages([]);
          setGallerySource('empty');
          return;
        }

        setGalleryImages(parsed);
        setGallerySource('sheet');
      } catch {
        if (!active) return;
        setGalleryImages([]);
        setGallerySource('error');
      }
    }

    loadGalleryImages();

    return () => {
      active = false;
    };
  }, [sheetsWebhookUrl]);

  const gallerySkeletonHeights = [220, 310, 260, 340, 230, 300, 250, 320];
  const galleryEmptyTiles = [
    { icon: '\u{1F4F8}', label: 'Trail photos coming soon' },
    { icon: '\u{1F3D4}\u{FE0F}', label: 'Add ride moments to your sheet' },
    { icon: '\u{1F6A9}', label: 'No gallery uploads yet' }
  ];

  useEffect(() => {
    if (rideCards.length <= 3) {
      setRideCarouselIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRideCarouselIndex((prev) => (prev + 1) % rideCards.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [rideCards]);

  const visibleRideCards: RideDisplayCard[] =
    rideCards.length <= 3
      ? rideCards
      : Array.from({ length: 3 }, (_, offset) => rideCards[(rideCarouselIndex + offset) % rideCards.length]);

  const displayRideCards =
    (rideSource === 'error' || rideSource === 'empty') && visibleRideCards.length === 0
      ? placeholderRideCards
      : visibleRideCards;

  const skeletonRideCards = [0, 1, 2];
  const hasRideCarousel = rideSource !== 'loading' && rideCards.length > 3;

  function handleRidePrev() {
    if (!hasRideCarousel) return;
    setRideCarouselIndex((prev) => (prev - 1 + rideCards.length) % rideCards.length);
  }

  function handleRideNext() {
    if (!hasRideCarousel) return;
    setRideCarouselIndex((prev) => (prev + 1) % rideCards.length);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      level: String(formData.get('level') ?? ''),
      message: String(formData.get('message') ?? ''),
      submittedAt: new Date().toISOString(),
      source: 'highlandmoto-site'
    };

    if (!sheetsWebhookUrl) {
      setSubmitState('error');
      setSubmitMessage('Google Sheet webhook is not configured.');
      return;
    }

    try {
      setSubmitState('sending');
      setSubmitMessage('');

      await fetch(sheetsWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      setSubmitState('success');
      setSubmitMessage('Request sent. Highland Moto will contact you soon.');
      form.reset();
      window.setTimeout(() => setSubmitState('idle'), 3200);
    } catch {
      setSubmitState('error');
      setSubmitMessage('Submission failed. Please try again.');
    }
  }

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            className="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="loader-bike"
              animate={{ x: [-140, 140, -140], rotate: [0, 2, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <RealBikeImage className="real-bike loader-bike-img" />
            </motion.div>
            <p>Revving Highland Moto</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="app">
        <motion.div className="progress-bar" style={{ scaleX: scrollYProgress, transformOrigin: '0% 50%' }} />
        <motion.div className="noise" style={{ opacity: dustOpacity }} />
        <motion.div className="bg-blob blob-a" style={{ y: blobY }} />
        <motion.div className="bg-blob blob-b" style={{ y: blobYAlt }} />

        <header className="topbar">
          <a className="brand" href="#home" onClick={() => setMenuOpen(false)}>
            {!logoError && (
              <img
                className="brand-logo"
                src="/highland-moto-logo.png"
                alt="Highland Moto logo"
                onError={() => setLogoError(true)}
              />
            )}
            <span>HIGHLAND MOTO</span>
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#about">About</a>
            <a href="#route">Route</a>
            <a href="#rides">Rides</a>
            <a href="#gallery">Gallery</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="topbar-right">
            <a href="https://instagram.com/highlandmoto.np" target="_blank" rel="noreferrer">
              @highlandmoto.np
            </a>
            <button
              type="button"
              className="menu-btn"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.button
                type="button"
                className="menu-backdrop"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.aside
                className="mobile-menu"
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              >
                <a href="#home" onClick={() => setMenuOpen(false)}>
                  Home
                </a>
                <a href="#about" onClick={() => setMenuOpen(false)}>
                  About
                </a>
                <a href="#route" onClick={() => setMenuOpen(false)}>
                  Route
                </a>
                <a href="#rides" onClick={() => setMenuOpen(false)}>
                  Rides
                </a>
                <a href="#gallery" onClick={() => setMenuOpen(false)}>
                  Gallery
                </a>
                <a href="#contact" onClick={() => setMenuOpen(false)}>
                  Contact
                </a>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <motion.div className="floating-bike" style={{ x: bikeX, y: bikeY }}>
          <RealBikeImage className="real-bike floating-bike-img" />
        </motion.div>

        <main>
          <section id="home" className="hero">
            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.8 }}
            >
              {!logoError && (
                <img
                  className="hero-logo"
                  src="/highland-moto-logo.png"
                  alt="Highland Moto"
                  onError={() => setLogoError(true)}
                />
              )}
              <p className="tag">Nepal - Dirt Adventure - Trail Community</p>
              <h1>RIDE WILD IN THE HIGHLANDS</h1>
              <p>
                Highland Moto Nepal brings riders together for raw dirt routes, steep climbs, and mountain
                freedom.
              </p>
              <div className="hero-buttons">
                <a className="btn solid" href="#gallery">
                  Explore Rides
                </a>
                <a className="btn ghost" href="#contact">
                  Join Ride List
                </a>
              </div>
            </motion.div>

            <motion.div
              className="hero-art"
              style={{ rotate: heroRotate }}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
            >
              <motion.div className="sun" style={{ scale: dustScale }} />
              <div className="moon" aria-hidden="true" />
              <PrayerFlagSection className="hero-flags" />
              <div className="mountain mountain-a" />
              <motion.div className="mountain mountain-b" style={{ y: mountainDepth }} />
              <motion.div
                className="hero-bike"
                animate={{ y: [0, -8, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <RealBikeImage className="real-bike hero-bike-img" />
              </motion.div>
            </motion.div>
          </section>

          <section id="about" className="stats">
            <TiltCard title="01" text="Steep Nepal trail loops with mixed terrain and technical dirt." />
            <TiltCard title="02" text="Interactive group rides with mountain viewpoints and ridge climbs." />
            <TiltCard title="03" text="Enduro-inspired culture, stunts, dust tracks, and weekend packs." />
          </section>

          <section id="route" className="route-section">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.7 }}
            >
              <p className="tag">Trail Progress Tracker</p>
              <h2>SCROLL THE TRAIL</h2>
              <p className="muted">The mini-bike tracks your scroll progress from valley base to ridge top.</p>
            </motion.div>

            <div className="route-map">
              <motion.div className="route-progress" style={{ width: trailProgressWidth }} />
              <svg viewBox="0 0 900 300" preserveAspectRatio="none" aria-hidden="true">
                <path
                  ref={pathRef}
                  d="M30 250 C 170 80, 290 240, 430 130 C 560 30, 700 220, 860 70"
                  className="trail"
                />
              </svg>
              <div
                className="route-bike"
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                  transform: `translate(-50%, -50%) rotate(${point.angle}deg)`
                }}
              >
                <RealBikeImage className="real-bike route-bike-img" />
              </div>
            </div>
          </section>

          <section id="rides" className="rides-section">
            <motion.div
              className="rides-head"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
            >
              <p className="tag">Ride Dispatch Board</p>
              <div className="rides-head-row">
                <h2>UPCOMING RIDES</h2>
                {hasRideCarousel && (
                  <div className="rides-nav" aria-label="Upcoming rides controls">
                    <button type="button" className="ride-nav-btn" onClick={handleRidePrev} aria-label="Previous rides">
                      Prev
                    </button>
                    <button type="button" className="ride-nav-btn" onClick={handleRideNext} aria-label="Next rides">
                      Next
                    </button>
                  </div>
                )}
              </div>
              {hasRideCarousel && (
                <div className="rides-dots" aria-label="Ride pages">
                  {rideCards.map((ride, index) => (
                    <button
                      key={`ride-dot-${ride.title}-${index}`}
                      type="button"
                      className={`ride-dot${index === rideCarouselIndex ? ' active' : ''}`}
                      aria-label={`Go to ride ${index + 1}`}
                      onClick={() => setRideCarouselIndex(index)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
            <div className="rides-grid">
              {rideSource === 'loading' &&
                skeletonRideCards.map((item) => (
                  <article key={`ride-skeleton-${item}`} className="ride-card loading" aria-hidden="true">
                    <span className="skel skel-date" />
                    <span className="skel skel-title" />
                    <div className="ride-meta">
                      <span className="skel skel-meta" />
                      <span className="skel skel-meta skel-meta-right" />
                    </div>
                  </article>
                ))}

              {rideSource !== 'loading' &&
                displayRideCards.map((ride, index) => (
                  <motion.article
                    key={`${ride.title}-${ride.date}-${index}-${rideCarouselIndex}`}
                    className={`ride-card${ride.placeholder ? ' placeholder' : ''}`}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: index * 0.06 }}
                    whileHover={{ y: -6, rotate: index % 2 === 0 ? -1 : 1 }}
                  >
                    {ride.placeholder && <p className="ride-icon">{ride.icon}</p>}
                    <p>{ride.date}</p>
                    <h3>{ride.title}</h3>
                    <div className="ride-meta">
                      <span>{ride.level}</span>
                      <span>{ride.km}</span>
                    </div>
                  </motion.article>
                ))}
            </div>
          </section>

          <section id="gallery" className="gallery">
            <motion.div
              className="gallery-head"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
            >
              <p className="tag">Trail Memory Grid</p>
              <h2>RIDE MOMENTS</h2>
            </motion.div>

            <div className="masonry-grid">
              {gallerySource === 'loading' &&
                gallerySkeletonHeights.map((height, index) => (
                  <div
                    key={`gallery-skeleton-${index}`}
                    className="masonry-item gallery-skel"
                    style={{ height: `${height}px` }}
                    aria-hidden="true"
                  />
                ))}

              {gallerySource !== 'loading' && galleryImages.length > 0 &&
                galleryImages.map((src, index) => (
                  <motion.img
                    key={src}
                    src={src}
                    loading="lazy"
                    alt={`Dirt ride ${index + 1}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.55, delay: index * 0.03 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                  />
                ))}

              {gallerySource !== 'loading' && galleryImages.length === 0 &&
                galleryEmptyTiles.map((tile, index) => (
                  <article key={`gallery-empty-${index}`} className="masonry-item gallery-empty">
                    <p className="gallery-empty-icon">{tile.icon}</p>
                    <p>{tile.label}</p>
                  </article>
                ))}
            </div>
          </section>

          <motion.section
            id="contact"
            className="contact"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div>
              <p className="tag">Contact Form</p>
              <h2>JOIN THE NEXT TRAIL DROP</h2>
              <p className="muted">Send your details and preferred riding level. We will DM you ride plans.</p>
            </div>
            <form className="contact-form" onSubmit={onSubmit}>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required placeholder="Your name" />

              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" required placeholder="98XXXXXXXX" />

              <label htmlFor="level">Riding level</label>
              <select id="level" name="level" defaultValue="" required>
                <option value="" disabled>
                  Select level
                </option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" rows={4} placeholder="Preferred locations, dates, bike type" />

              <button type="submit" className="btn solid" disabled={submitState === 'sending'}>
                {submitState === 'sending' ? 'Sending...' : 'Send Request'}
              </button>

              <AnimatePresence>
                {(submitState === 'success' || submitState === 'error') && (
                  <motion.p
                    className={`sent-msg ${submitState === 'error' ? 'sent-error' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {submitMessage}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>
          </motion.section>

          <motion.section
            className="cta"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
          >
            <h2>READY FOR THE NEXT DIRT RUN?</h2>
            <p>Message Highland Moto Nepal and join the next ride drop.</p>
            <a href="https://instagram.com/highlandmoto.np" target="_blank" rel="noreferrer" className="btn solid">
              DM Now
            </a>
          </motion.section>
        </main>
      </div>
    </>
  );
}

export default App;




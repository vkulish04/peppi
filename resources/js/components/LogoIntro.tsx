import { useEffect, useState, type ReactNode } from 'react';

const FRAME_BASE = '/images/peppi';
const FRAMES = [1, 2, 3, 4].map((number) => `${FRAME_BASE}/frame-${number}.png`);
const SEQUENCE = [0, 1, 1, 0, 2, 2, 0, 3, 3, 2, 1, 0];
const SESSION_KEY = 'peppi-logo-intro-played';

function hasPlayed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // Animation still finishes when browser storage is unavailable.
  }
}

export function LogoIntro({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(() => !hasPlayed());
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let completed = false;
    let timer: number | undefined;
    let fallbackTimer: number | undefined;

    const finish = () => {
      if (cancelled || completed) return;
      completed = true;
      markPlayed();
      setVisible(false);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    const preload = FRAMES.map((src) => new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    }));

    fallbackTimer = window.setTimeout(finish, 3500);

    void Promise.all(preload).then((loaded) => {
      if (cancelled || completed) return;
      window.clearTimeout(fallbackTimer);
      if (loaded.some((ok) => !ok)) {
        timer = window.setTimeout(finish, 500);
        return;
      }

      let step = 0;
      timer = window.setInterval(() => {
        step += 1;
        if (step >= SEQUENCE.length) {
          window.clearInterval(timer);
          finish();
        } else {
          setFrame(SEQUENCE[step]);
        }
      }, 100);
    });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
    };
  }, [visible]);

  return (
    <>
      {children}
      {visible && (
        <div className="logo-intro" role="status" aria-label="Завантаження сторінки">
          <img
            className="logo-intro-image"
            src={FRAMES[frame]}
            alt="Пеппі — дитячий простір"
            width="600"
            height="600"
            onError={(event) => { event.currentTarget.src = `${FRAME_BASE}/source-logo.jpeg`; }}
          />
        </div>
      )}
    </>
  );
}

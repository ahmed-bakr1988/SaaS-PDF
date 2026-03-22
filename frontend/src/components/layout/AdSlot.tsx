import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface AdSlotProps {
  /** AdSense ad slot ID */
  slot: string;
  /** Ad format: 'auto', 'rectangle', 'horizontal', 'vertical' */
  format?: string;
  /** Responsive mode */
  responsive?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Google AdSense ad slot component.
 * Loads the ad unit once and handles cleanup.
 */
export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}: AdSlotProps) {
  const user = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const [canLoad, setCanLoad] = useState(false);
  const clientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID || '').trim();
  const slotMap: Record<string, string | undefined> = {
    'home-top': import.meta.env.VITE_ADSENSE_SLOT_HOME_TOP,
    'home-bottom': import.meta.env.VITE_ADSENSE_SLOT_HOME_BOTTOM,
    'top-banner': import.meta.env.VITE_ADSENSE_SLOT_TOP_BANNER,
    'bottom-banner': import.meta.env.VITE_ADSENSE_SLOT_BOTTOM_BANNER,
  };
  const resolvedSlot = /^\d+$/.test(slot) ? slot : slotMap[slot];

  useEffect(() => {
    if (canLoad || !containerRef.current) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setCanLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCanLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canLoad]);

  useEffect(() => {
    if (isLoaded.current || !canLoad || !clientId || !resolvedSlot) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-adsense-client="${clientId}"]`
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-adsense-client', clientId);
      document.head.appendChild(script);
    }

    try {
      // Push ad to AdSense queue
      const adsWindow = window as Window & { adsbygoogle?: unknown[] };
      const adsbygoogle = adsWindow.adsbygoogle || [];
      adsbygoogle.push({});
      adsWindow.adsbygoogle = adsbygoogle;
      isLoaded.current = true;
    } catch {
      // AdSense not loaded (e.g., ad blocker)
    }
  }, [canLoad, clientId, resolvedSlot]);

  if (!clientId || !resolvedSlot) return null;

  // Pro users see no ads
  if (user?.plan === 'pro') return null;

  return (
    <div ref={containerRef} className={`ad-slot ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={resolvedSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

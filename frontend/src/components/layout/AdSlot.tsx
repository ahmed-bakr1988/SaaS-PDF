import { useEffect, useRef } from 'react';

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
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;

    try {
      // Push ad to AdSense queue
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      isLoaded.current = true;
    } catch {
      // AdSense not loaded (e.g., ad blocker)
    }
  }, []);

  return (
    <div className={`ad-slot ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID || ''}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

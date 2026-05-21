import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-[max(6rem,env(safe-area-inset-bottom)+5rem)] left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-zinc-200 transition-all duration-500 hover:-translate-y-1 hover:bg-zinc-950 hover:text-white dark:bg-zinc-900 dark:text-white dark:ring-zinc-800 dark:hover:bg-white dark:hover:text-zinc-950 md:bottom-8',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

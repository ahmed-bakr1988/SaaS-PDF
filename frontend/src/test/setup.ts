import '@testing-library/jest-dom/vitest';
import '@/i18n';

if (typeof window !== 'undefined') {
  window.localStorage.setItem('i18nextLng', 'en');
}

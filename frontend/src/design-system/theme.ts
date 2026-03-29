/**
 * Design System Theme Configuration
 * Centralized theme utilities and token system
 */

import colors, { colorAssignments, getColorClass } from './colors';

/**
 * Typography Scale
 * Matches Tailwind CSS + custom adjustments for accessibility
 */
export const typography = {
  // Headings
  h1: {
    fontSize: '3rem', // 48px
    fontWeight: 700,
    lineHeight: '3.5rem', // 56px
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2.25rem', // 36px
    fontWeight: 700,
    lineHeight: '2.5rem', // 40px
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.875rem', // 30px
    fontWeight: 600,
    lineHeight: '2.25rem', // 36px
    letterSpacing: '-0.01em',
  },
  h4: {
    fontSize: '1.5rem', // 24px
    fontWeight: 600,
    lineHeight: '2rem', // 32px
  },
  h5: {
    fontSize: '1.25rem', // 20px
    fontWeight: 600,
    lineHeight: '1.75rem', // 28px
  },
  h6: {
    fontSize: '1rem', // 16px
    fontWeight: 600,
    lineHeight: '1.5rem', // 24px
  },

  // Body text
  body: {
    large: {
      fontSize: '1.125rem', // 18px
      fontWeight: 400,
      lineHeight: '1.75rem', // 28px
    },
    base: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      lineHeight: '1.5rem', // 24px
    },
    small: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: '1.25rem', // 20px
    },
    xs: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
      lineHeight: '1rem', // 16px
    },
  },

  // Labels & UI text
  label: {
    fontSize: '0.875rem', // 14px
    fontWeight: 500,
    lineHeight: '1.25rem', // 20px
  },
  caption: {
    fontSize: '0.75rem', // 12px
    fontWeight: 500,
    lineHeight: '1rem', // 16px
  },
} as const;

/**
 * Spacing Scale
 * 4px base unit (Tailwind default)
 */
export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem', // 48px
  '4xl': '4rem', // 64px
  '5xl': '5rem', // 80px
  '6xl': '6rem', // 96px
} as const;

/**
 * Border Radius Scale
 */
export const borderRadius = {
  none: '0',
  sm: '0.375rem', // 6px
  base: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Shadow Scale
 */
export const shadows = {
  none: '0 0 #0000',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  lg_dark: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Z-Index Scale
 * Structured layering system
 */
export const zIndex = {
  auto: 'auto',
  hide: '-1',
  base: '0',
  dropdown: '1000',
  sticky: '1010',
  fixed: '1020',
  backdrop: '1030',
  offcanvas: '1040',
  modal: '1050',
  popover: '1060',
  tooltip: '1070',
  notification: '1080',
} as const;

/**
 * Transitions & Animations
 */
export const transitions = {
  fast: '0.15s',
  base: '0.2s',
  slow: '0.3s',
  slower: '0.5s',

  easing: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Breakpoints (matching Tailwind)
 */
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Container Width
 */
export const containers = {
  sm: '24rem', // 384px
  md: '28rem', // 448px
  lg: '32rem', // 512px
  xl: '36rem', // 576px
  '2xl': '42rem', // 672px
  '3xl': '48rem', // 768px
  '4xl': '56rem', // 896px
  '5xl': '64rem', // 1024px
  '6xl': '72rem', // 1152px
  '7xl': '80rem', // 1280px
} as const;

/**
 * Component Size Presets
 */
export const componentSizes = {
  // Button sizes
  button: {
    xs: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.75rem',
      height: '1.5rem',
    },
    sm: {
      padding: '0.5rem 1rem',
      fontSize: '0.875rem',
      height: '2rem',
    },
    md: {
      padding: '0.75rem 1.5rem',
      fontSize: '1rem',
      height: '2.5rem',
    },
    lg: {
      padding: '1rem 2rem',
      fontSize: '1.125rem',
      height: '3rem',
    },
    xl: {
      padding: '1.25rem 2.5rem',
      fontSize: '1.25rem',
      height: '3.5rem',
    },
  },

  // Input sizes
  input: {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
    md: { padding: '0.75rem 1rem', fontSize: '1rem' },
    lg: { padding: '1rem 1.25rem', fontSize: '1.125rem' },
  },

  // Icon sizes
  icon: {
    xs: '1rem', // 16px
    sm: '1.25rem', // 20px
    md: '1.5rem', // 24px
    lg: '2rem', // 32px
    xl: '2.5rem', // 40px
    '2xl': '3rem', // 48px
  },
} as const;

/**
 * Responsive Utilities
 */
export const responsive = {
  // Stack direction
  stackMobile: 'flex flex-col',
  stackDesktop: 'lg:flex-row',

  // Grid column count
  gridAuto: 'grid gap-4',
  grid2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  grid4: 'grid grid-cols-2 lg:grid-cols-4 gap-4',

  // Common padding
  pagePaddingX: 'px-4 sm:px-6 lg:px-8',
  pagePaddingY: 'py-8 sm:py-12 lg:py-16',
  sectionPadding: 'px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16',

  // Container width
  containerMax: 'max-w-7xl',
  containerContent: 'max-w-4xl',
  containerSmall: 'max-w-2xl',
} as const;

/**
 * Complete Theme Object
 */
export const theme = {
  colors,
  colorAssignments,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  transitions,
  breakpoints,
  containers,
  componentSizes,
  responsive,
} as const;

/**
 * Utility: Get CSS variable or Tailwind class for a color
 */
export const useColor = (semantic: string, mode: 'light' | 'dark' = 'light') => {
  const colorObj = mode === 'light' ? colors.light : colors.dark;
  return colorObj[semantic as keyof typeof colorObj];
};

export default theme;

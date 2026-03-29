/**
 * Color Design System for Dociva
 * Comprehensive color palette matching competitive standards
 * References: PDFSimpli (bright blues), Smallpdf (modern purple), ILovePDF (bold oranges)
 */

export const colors = {
  // Primary Palette (Main brand color - Blue)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb', // Primary brand color (buttons, links, highlights)
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Accent Palette (Secondary accent - Purple/Fuchsia for CTAs)
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3', // Accent for premium tier, special offers
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },

  // Success Palette (For positive feedback, completed actions)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a', // Success button/feedback
    700: '#15803d',
    800: '#166534',
    900: '#145231',
  },

  // Warning Palette (For alerts, warnings, secondary actions)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706', // Warning alerts
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error Palette (For errors, destructive actions)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Error states
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Info Palette (For informational messages)
  info: {
    50: '#ecf0ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5', // Info messages
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Neutral Grayscale (For text, borders, backgrounds)
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    150: '#efefef', // Custom: between 100 and 200
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Slate Grayscale (Alternative neutral - used in current design)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic Colors (Light mode)
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceHover: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    borderHover: '#cbd5e1',
  },

  // Semantic Colors (Dark mode)
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    border: '#334155',
    borderHover: '#475569',
  },

  // Tool Category Colors (for visual differentiation)
  tools: {
    pdf: '#dc2626', // Red for PDF tools
    image: '#f59e0b', // Amber for image tools
    video: '#06b6d4', // Cyan for video tools
    document: '#3b82f6', // Blue for document tools
    text: '#8b5cf6', // Violet for text tools
    convert: '#ec4899', // Pink for conversion tools
    edit: '#10b981', // Emerald for editing tools
    secure: '#f97316', // Orange for security tools
  },

  // Premium Gradient (for Pro/Business badges)
  gradients: {
    premium: {
      from: '#f59e0b',
      to: '#d97706',
    },
    business: {
      from: '#8b5cf6',
      to: '#6366f1',
    },
    featured: {
      from: '#06b6d4',
      to: '#0ea5e9',
    },
  },
} as const;

/**
 * Color Assignments for UI Elements
 * These are semantic usage guidelines
 */
export const colorAssignments = {
  // Button Colors
  buttons: {
    primary: 'primary-600', // Main CTAs
    secondary: 'slate-600', // Secondary actions
    success: 'success-600', // Confirm/accept
    danger: 'error-600', // Delete/destructive
    ghost: 'slate-500', // Tertiary/icon buttons
  },

  // Badge/Pill Colors
  badges: {
    default: 'slate-100',
    success: 'success-100',
    warning: 'warning-100',
    error: 'error-100',
    info: 'info-100',
    pro: 'accent-100',
  },

  // Alert/Toast Colors
  alerts: {
    success: 'success-600',
    warning: 'warning-600',
    error: 'error-600',
    info: 'info-600',
  },

  // Text Colors
  text: {
    primary: 'slate-900',
    secondary: 'slate-600',
    tertiary: 'slate-500',
    muted: 'slate-400',
    link: 'primary-600',
    linkHover: 'primary-700',
  },

  // Border Colors
  borders: {
    default: 'slate-200',
    focus: 'primary-500',
    error: 'error-400',
    success: 'success-400',
  },

  // Background Colors
  backgrounds: {
    page: 'white',
    surface: 'slate-50',
    surfaceAlt: 'slate-100',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

/**
 * Utility function to get color with proper contrast
 * @param colorName - The color name (e.g., 'primary', 'error')
 * @param lightValue - Shade number for light mode (e.g., 600)
 * @param darkValue - Shade number for dark mode (e.g., 500)
 */
export function getColorClass(
  colorName: keyof typeof colors,
  lightValue: number = 600,
  darkValue: number = 500
): string {
  return `${colorName}-${lightValue} dark:${colorName}-${darkValue}`;
}

export default colors;

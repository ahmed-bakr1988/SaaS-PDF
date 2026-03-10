/**
 * Feature flag utilities for the frontend.
 *
 * Feature flags are read from VITE_FEATURE_* environment variables.
 * When a flag is absent or set to "true", the feature is ENABLED (opt-out model).
 * Set a flag to "false" to disable a feature.
 *
 * Usage:
 *   import { isFeatureEnabled } from '@/config/featureFlags';
 *   if (isFeatureEnabled('EDITOR')) { ... }
 */

type FeatureName = 'EDITOR' | 'OCR' | 'REMOVEBG';

/**
 * Check whether a feature is enabled.
 * Defaults to `true` if the env var is not set.
 */
export function isFeatureEnabled(feature: FeatureName): boolean {
  const value = import.meta.env[`VITE_FEATURE_${feature}`];
  if (value === undefined || value === '') return true; // enabled by default
  return value.toLowerCase() !== 'false';
}

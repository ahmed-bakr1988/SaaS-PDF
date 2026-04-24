import api from './apiClient';
import { ensureCsrfToken } from './apiClient';
import type {
  AuthUser,
  CreditSummary,
  SocialAuthProviderOption,
} from './apiTypes';

interface AuthResponse {
  message: string;
  user: AuthUser;
  credits?: CreditSummary;
  is_new_account?: boolean;
}

interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  credits?: CreditSummary;
  is_new_account?: boolean;
}

interface SocialAuthProvidersResponse {
  providers: SocialAuthProviderOption[];
}

/**
 * Create a new account and return the auth response.
 */
export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', { email, password });
  await ensureCsrfToken(true);
  return response.data;
}

/**
 * Sign in and return the auth response.
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  await ensureCsrfToken(true);
  return response.data;
}

/**
 * End the current authenticated session.
 */
export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
  await ensureCsrfToken(true);
}

/**
 * Return the current authenticated user, if any.
 */
export async function getCurrentUser(): Promise<AuthSessionResponse> {
  const response = await api.get<AuthSessionResponse>('/auth/me');
  return response.data;
}

/**
 * Return available social auth providers for the account screen.
 */
export async function getSocialAuthProviders(): Promise<SocialAuthProviderOption[]> {
  const response = await api.get<SocialAuthProvidersResponse>('/auth/providers');
  return response.data.providers;
}

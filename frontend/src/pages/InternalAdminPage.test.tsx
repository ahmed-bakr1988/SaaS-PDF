import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import InternalAdminPage from './InternalAdminPage';
import { useAuthStore } from '@/stores/authStore';
import {
  getAdminPlanInterest,
  getAdminSystemHealth,
  getAdminUserStats,
  getInternalAdminContacts,
  getInternalAdminOverview,
  listInternalAdminUsers,
  markInternalAdminContactRead,
  updateInternalAdminUserPlan,
  updateAdminUserRole,
} from '@/services/api';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getAdminPlanInterest: vi.fn(),
  getAdminSystemHealth: vi.fn(),
  getAdminUserStats: vi.fn(),
  getInternalAdminContacts: vi.fn(),
  getInternalAdminOverview: vi.fn(),
  listInternalAdminUsers: vi.fn(),
  markInternalAdminContactRead: vi.fn(),
  updateInternalAdminUserPlan: vi.fn(),
  updateAdminUserRole: vi.fn(),
}));

const authState = {
  user: null as null | { email: string; role: string },
  initialized: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <InternalAdminPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('InternalAdminPage', () => {
  beforeEach(() => {
    authState.user = null;
    authState.initialized = true;
    authState.isLoading = false;
    authState.login = vi.fn();
    authState.logout = vi.fn();

    ((useAuthStore as unknown) as Mock).mockImplementation(
      (selector: (state: typeof authState) => unknown) => selector(authState)
    );
    (getInternalAdminOverview as Mock).mockReset();
    (getAdminSystemHealth as Mock).mockReset();
    (getAdminPlanInterest as Mock).mockReset();
    (getAdminUserStats as Mock).mockReset();
    (listInternalAdminUsers as Mock).mockReset();
    (getInternalAdminContacts as Mock).mockReset();
    (markInternalAdminContactRead as Mock).mockReset();
    (updateInternalAdminUserPlan as Mock).mockReset();
    (updateAdminUserRole as Mock).mockReset();

    (getAdminSystemHealth as Mock).mockResolvedValue({
      ai_configured: true,
      ai_model: 'nvidia/nemotron-3-super-120b-a12b:free',
      ai_budget_used_percent: 25,
      error_rate_1h: 0,
      tasks_last_1h: 0,
      failures_last_1h: 0,
      database_size_mb: 1.5,
    });
    (getAdminPlanInterest as Mock).mockResolvedValue({
      total_clicks: 0,
      unique_users: 0,
      clicks_last_7d: 0,
      clicks_last_30d: 0,
      by_plan: [],
      recent: [],
    });
    (getAdminUserStats as Mock).mockResolvedValue({
      total_users: 2,
      new_last_7d: 1,
      new_last_30d: 2,
      pro_users: 1,
      free_users: 1,
      daily_registrations: [{ day: '2026-03-16', count: 1 }],
      most_active_users: [
        {
          id: 2,
          email: 'operator@example.com',
          plan: 'free',
          created_at: '2026-03-16T10:00:00Z',
          total_tasks: 3,
        },
      ],
    });
  });

  it('shows the admin sign-in form for anonymous users', () => {
    renderPage();

    expect(screen.getByText('Admin sign in')).toBeTruthy();
    expect(screen.getByPlaceholderText('admin@example.com')).toBeTruthy();
  });

  it('shows the permission warning for signed-in non-admin users', () => {
    authState.user = { email: 'member@example.com', role: 'user' };

    renderPage();

    expect(screen.getByText('No admin permission')).toBeTruthy();
    expect(screen.getAllByText(/member@example.com/)).toHaveLength(2);
  });

  it('loads dashboard data for admins and allows promoting a user role', async () => {
    authState.user = { email: 'admin@example.com', role: 'admin' };
    (getInternalAdminOverview as Mock).mockResolvedValue({
      users: { total: 2, pro: 1, free: 1 },
      processing: {
        total_files_processed: 5,
        completed_files: 4,
        failed_files: 1,
        files_last_24h: 2,
        success_rate: 80,
      },
      ratings: { average_rating: 4.8, rating_count: 14 },
      ai_cost: { month: '2026-03', total_usd: 12.5, budget_usd: 50, percent_used: 25 },
      contacts: { total_messages: 1, unread_messages: 1, recent: [] },
      top_tools: [{ tool: 'compress-pdf', total_runs: 10, failed_runs: 1 }],
      recent_failures: [],
      recent_users: [],
    });
    (listInternalAdminUsers as Mock).mockResolvedValue([
      {
        id: 2,
        email: 'operator@example.com',
        plan: 'free',
        role: 'user',
        is_allowlisted_admin: false,
        created_at: '2026-03-16T10:00:00Z',
        total_tasks: 3,
        completed_tasks: 2,
        failed_tasks: 1,
        active_api_keys: 0,
      },
    ]);
    (getInternalAdminContacts as Mock).mockResolvedValue({
      items: [],
      page: 1,
      per_page: 12,
      total: 0,
      unread: 0,
    });
    (updateAdminUserRole as Mock).mockResolvedValue({
      id: 2,
      email: 'operator@example.com',
      plan: 'free',
      role: 'admin',
      created_at: '2026-03-16T10:00:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Top tools')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));

    await waitFor(() => {
      expect(screen.getByText('User management')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));

    await waitFor(() => {
      expect(updateAdminUserRole).toHaveBeenCalledWith(2, 'admin');
    });
  });
});

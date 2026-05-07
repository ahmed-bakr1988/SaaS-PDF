import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it, vi } from 'vitest';
import WordCounter from './WordCounter';

vi.mock('@/components/layout/AdSlot', () => ({
  default: () => null,
}));

vi.mock('@/services/socialTextApi', () => ({
  analyzeSocialText: vi.fn().mockResolvedValue({
    input: { text: 'hello world #launch', max_length: 20000 },
    stats: {
      words: 3,
      characters: 19,
      characters_no_spaces: 17,
      sentences: 1,
      paragraphs: 1,
      hashtags: 1,
      mentions: 0,
      links: 0,
      emojis: 0,
      reading_time_seconds: 5,
      tone: 'concise',
      has_cta: true,
    },
    overall_score: 82,
    platforms: [
      {
        id: 'x',
        name: 'X',
        hard_limit: 280,
        remaining_characters: 261,
        optimal_range: { min: 71, max: 180 },
        recommended_hashtags: { min: 0, max: 2 },
        status: 'ready',
        score: 90,
        recommendations: ['Copy length and structure are in a strong range for X.'],
      },
    ],
    suggestions: {
      top_priority: 'X',
      lowest_priority: 'LinkedIn',
      summary: 'Ready for publishing with minor optimization.',
    },
  }),
}));

describe('WordCounter', () => {
  it('renders analysis results after entering text', async () => {
    render(
      <HelmetProvider>
        <WordCounter />
      </HelmetProvider>
    );

    fireEvent.change(screen.getByPlaceholderText(/Paste your social media caption/i), {
      target: { value: 'hello world #launch' },
    });

    await waitFor(() => {
      expect(screen.getByText('Ready for publishing with minor optimization.')).toBeTruthy();
    });

    expect(screen.getAllByText('X').length).toBeGreaterThan(0);
    expect(screen.getByText('Result')).toBeTruthy();
    expect(screen.getByText('Perfect Your Text in Seconds')).toBeTruthy();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('./apiClient', () => ({
  default: {
    post: postMock,
  },
}));

describe('socialTextApi', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('posts text to the social analyzer endpoint', async () => {
    postMock.mockResolvedValue({
      data: {
        input: { text: 'hello', max_length: 20000 },
        stats: {
          words: 1,
          characters: 5,
          characters_no_spaces: 5,
          sentences: 1,
          paragraphs: 1,
          hashtags: 0,
          mentions: 0,
          links: 0,
          emojis: 0,
          reading_time_seconds: 5,
          tone: 'concise',
          has_cta: false,
        },
        overall_score: 80,
        platforms: [],
        suggestions: {
          top_priority: 'X',
          lowest_priority: 'LinkedIn',
          summary: 'Ready for publishing with minor optimization.',
        },
      },
    });

    const { analyzeSocialText } = await import('./socialTextApi');
    const response = await analyzeSocialText('hello');

    expect(postMock).toHaveBeenCalledWith('/text/social-analyzer', { text: 'hello' });
    expect(response.overall_score).toBe(80);
  });
});

import api from './apiClient';
import type { SocialTextAnalysisResponse } from './apiTypes';

export async function analyzeSocialText(text: string): Promise<SocialTextAnalysisResponse> {
  const response = await api.post<SocialTextAnalysisResponse>('/text/social-analyzer', { text });
  return response.data;
}

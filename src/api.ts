/**
 * api.ts — CreativeIQ backend service layer.
 * All calls go through the Vite dev proxy at /api → http://localhost:8000
 */

import {
  AnalysisPayload, VnptBotReview, AnalysisResponse,
  TokenResponse, AnalysisRecord, AnalysisRecordDetail, AnalyticsSummary,
} from './types';

const BASE = '/api';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('ciq_access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('ciq_refresh_token');
}

export function saveTokens(resp: TokenResponse): void {
  localStorage.setItem('ciq_access_token', resp.access_token);
  localStorage.setItem('ciq_refresh_token', resp.refresh_token);
  localStorage.setItem('ciq_user', JSON.stringify(resp.user));
}

export function clearTokens(): void {
  localStorage.removeItem('ciq_access_token');
  localStorage.removeItem('ciq_refresh_token');
  localStorage.removeItem('ciq_user');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function register(email: string, username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await handleResponse<TokenResponse>(res);
  saveTokens(data);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<TokenResponse>(res);
  saveTokens(data);
  return data;
}

export async function refreshTokens(): Promise<TokenResponse | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const data = await handleResponse<TokenResponse>(res);
    saveTokens(data);
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

export function logout(): void {
  clearTokens();
}

// ─── Stage 1: Feature Extraction ─────────────────────────────────────────────

export interface StreamEvent {
  type: 'video_info' | 'segment_start' | 'segment_done' | 'done' | 'error';
  duration_sec?: number;
  total_segments?: number;
  index?: number;
  total?: number;
  start?: number;
  end?: number;
  result?: unknown;
  payload?: AnalysisPayload;
  record_id?: number | null;  // DB record ID emitted with done event
  message?: string;
}

export async function extractFeaturesStream(
  file: File,
  onEvent: (event: StreamEvent) => void,
): Promise<{ payload: AnalysisPayload; recordId: number | null }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/extract/stream`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Stream failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let payload: AnalysisPayload | null = null;
  let recordId: number | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));
          onEvent(event);
          if (event.type === 'done' && event.payload) {
            payload = event.payload;
            recordId = event.record_id ?? null;
          }
          if (event.type === 'error') throw new Error(event.message ?? 'Backend error');
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  if (!payload) throw new Error('Stream ended without a done event');
  return { payload, recordId };
}

export async function extractFeatures(file: File): Promise<AnalysisPayload> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/extract`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
  });
  return handleResponse<AnalysisPayload>(res);
}

// ─── Stage 2: VNPT SmartBot Review ──────────────────────────────────────────────

export async function getReview(payload: AnalysisPayload): Promise<VnptBotReview> {
  const res = await fetch(`${BASE}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleResponse<VnptBotReview>(res);
}

export async function patchReview(recordId: number, review: VnptBotReview): Promise<void> {
  const res = await fetch(`${BASE}/analyses/${recordId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Patch review failed: ${res.status}`);
  }
}

// ─── Combined ─────────────────────────────────────────────────────────────────

export async function analyseVideo(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/analyse`, {
    method: 'POST',
    body: form,
    headers: authHeaders(),
  });
  return handleResponse<AnalysisResponse>(res);
}

// ─── History API ──────────────────────────────────────────────────────────────

export async function listAnalyses(limit = 20, offset = 0): Promise<AnalysisRecord[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${BASE}/analyses?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalysisRecord[]>(res);
}

export async function getAnalysis(id: number): Promise<AnalysisRecordDetail> {
  const res = await fetch(`${BASE}/analyses/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalysisRecordDetail>(res);
}

export async function deleteAnalysis(id: number): Promise<void> {
  const res = await fetch(`${BASE}/analyses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `Delete failed: ${res.status}`);
  }
}

// Dùng video-stream qua FastAPI (local disk) — thêm token vào query param vì <video> không set Auth header
export async function getVideoUrl(id: number): Promise<string> {
  const res = await fetch(`${BASE}/analyses/${id}/video-url`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<{ url: string }>(res);
  const token = getToken();
  // Nhúng token vào URL để video element có thể authenticate
  return token ? `${data.url}?token=${encodeURIComponent(token)}` : data.url;
}


export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${BASE}/analytics/summary`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalyticsSummary>(res);
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}


// ─── Base types (shared with BE schemas) ─────────────────────────────────────

export interface AnalysisContext {
  video_type?: string;
  goal?: string;
  audience?: string | null;
}

export type ViewMode = 'dashboard' | 'processing' | 'detail' | 'history';
export type ProcessingState = 'idle' | 'processing' | 'done';
export type IssueSeverity = 'High' | 'Medium' | 'Low';

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserProfile;
}

// ─── BE response types (mirrors BE schemas.py) ────────────────────────────────

export interface FeatureScores {
  // Visual
  visual_dynamics: number | null;
  motion_level:    number | null;
  scene_variation: number | null;
  cut_frequency:   number | null;
  // Text / OCR
  text_density:  number | null;
  readability:   number | null;
  visual_focus:  number | null;
  clutter_level: number | null;
  // Audio
  audio_energy:    number | null;
  pitch_variation: number | null;
  speech_rate:     number | null;
  // Sync
  sync_alignment: number | null;
}

export interface DerivedScores {
  visual_engagement_score: number;
  cognitive_load_score: number;
  audio_engagement_score: number;
  retention_risk_score: number;
  overall_quality_score?: number;
}

export interface SegmentResult {
  segment_index: number;
  start_sec: number;
  end_sec: number;
  features: FeatureScores;
  derived: DerivedScores;
  person_count?: number;
  face_count?: number;
  vehicle_count?: number;
  license_plates?: string[];
}

export interface AnalysisPayload {
  filename: string;
  duration_sec: number;
  segments: SegmentResult[];
  global_features: FeatureScores;
  global_derived: DerivedScores;
  summary?: string;
  person_count?: number;
  face_count?: number;
  vehicle_count?: number;
  license_plates?: string[];
}

export interface IssueItem {
  feature: string;
  severity: IssueSeverity;
  description: string;
  recommendation: string;
}

export interface SegmentReviewItem {
  segment_index: number;
  impact: string;
  feedback: string;
  suggested_fix: string;
}

export interface VnptBotReview {
  headline: string;
  overall_score: number;
  grade: string;
  insight: string;
  key_issues: IssueItem[];
  segment_highlights: string[];
  suggested_fixes: string[];
  segment_reviews?: SegmentReviewItem[];
}

export interface AnalysisResponse {
  payload: AnalysisPayload;
  review: VnptBotReview;
}

// ─── History / DB record types ────────────────────────────────────────────────

export interface AnalysisRecord {
  id: number;
  filename: string;
  duration_sec: number;
  headline: string | null;
  overall_score: number | null;
  grade: string | null;
  insight: string | null;
  created_at: string;
  user_id: number | null;
}

export interface AnalysisRecordDetail extends AnalysisRecord {
  payload: AnalysisPayload | null;
  review: VnptBotReview | null;
  has_video: boolean;
}

export interface AnalyticsSummary {
  total: number;
  avg_score: number | null;
  grade_distribution: Record<string, number>;
  recent: AnalysisRecord[];
}

// ─── Legacy types (kept for backward-compat) ─────────────────────────────────

export type SegmentFeatures = FeatureScores & {
  visual_dynamic?: number;
};

export interface SegmentIssue {
  type: string;
  severity: IssueSeverity;
  description?: string;
  recommendation?: string;
}

export interface SegmentData {
  start: number;
  end: number;
  score: number;
  features: SegmentFeatures;
  derived?: DerivedScores;
  issues: SegmentIssue[];
  impact: string;
  feedback: string;
  suggestedFix: string;
}

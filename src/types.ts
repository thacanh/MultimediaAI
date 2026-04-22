export interface AnalysisContext {
  video_type: string;
  goal: string;
  audience: string | null;
}

export type ViewMode = 'dashboard' | 'processing' | 'detail';

export type ProcessingState = 'idle' | 'processing' | 'done';

export interface SegmentFeatures {
  visual_dynamic: number;
  motion_level: number;
  text_density: number;
  audio_energy: number;
}

export type IssueSeverity = 'High' | 'Medium' | 'Low';

export interface SegmentIssue {
  type: string;
  severity: IssueSeverity;
}

export interface SegmentData {
  start: number;
  end: number;
  score: number;
  features: SegmentFeatures;
  issues: SegmentIssue[];
  impact: string;
  feedback: string;
  suggestedFix: string;
}

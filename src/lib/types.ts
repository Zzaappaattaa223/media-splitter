export type MediaType = 'video' | 'audio';

export type SupportedFormat = 'mp4' | 'mov' | 'webm' | 'mp3' | 'wav' | 'aac' | 'ogg' | 'unknown';

export interface KeyframeInfo {
  timestamp: number; // in seconds
  byteOffset?: number;
}

export interface MediaMetadata {
  filename: string;
  filesize: number; // in bytes
  format: SupportedFormat;
  type: MediaType;
  duration: number; // in seconds
  bitrate: number; // in bits per second
  width?: number;
  height?: number;
  sampleRate?: number;
  channels?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  keyframes: KeyframeInfo[];
  rawMimeType: string;
}

export type SplitMode = 'duration' | 'size' | 'parts';
export type CutPrecision = 'fast' | 'exact';

export interface SplitConfig {
  mode: SplitMode;
  durationSeconds?: number;
  targetSizeBytes?: number;
  numParts?: number;
  precision: CutPrecision;
  tolerancePercent: number; // default 5%
}

export interface SegmentInfo {
  index: number;
  filename: string;
  startTime: number;
  endTime: number;
  duration: number;
  startByte?: number;
  endByte?: number;
  estimatedBytes: number;
  actualBytes?: number;
  blob?: Blob;
}

export interface SegmentPlan {
  totalSegments: number;
  estimatedSegmentSize: number;
  segments: SegmentInfo[];
  precision: CutPrecision;
}

export type JobStatus = 'idle' | 'inspecting' | 'planned' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface JobProgress {
  status: JobStatus;
  currentSegmentIndex: number;
  totalSegments: number;
  overallPercent: number;
  bytesProcessed: number;
  totalBytes: number;
  speedMBps: number;
  elapsedSeconds: number;
  etaSeconds: number;
  memoryHeapMB: number;
  currentSegmentName: string;
  errorMessage?: string;
}

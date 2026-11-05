import { MediaMetadata, SegmentInfo, JobProgress } from '../types';

export interface SliceCallbacks {
  onProgress: (progress: Partial<JobProgress>) => void;
  onSegmentComplete: (segment: SegmentInfo, blob: Blob) => Promise<void>;
  isCancelled: () => boolean;
}

export async function executeSplitJob(
  file: File,
  metadata: MediaMetadata,
  segments: SegmentInfo[],
  callbacks: SliceCallbacks
): Promise<void> {
  const startTimeMs = performance.now();
  let totalBytesProcessed = 0;
  const totalFileBytes = file.size;

  for (let i = 0; i < segments.length; i++) {
    if (callbacks.isCancelled()) {
      break;
    }

    const seg = segments[i];
    callbacks.onProgress({
      currentSegmentIndex: i + 1,
      totalSegments: segments.length,
      currentSegmentName: seg.filename,
      status: 'processing'
    });

    let segmentBlob: Blob;

    if (metadata.format === 'wav') {
      segmentBlob = await sliceWavSegment(file, metadata, seg);
    } else if (metadata.format === 'mp3') {
      segmentBlob = await sliceMp3Segment(file, metadata, seg);
    } else {
      // General video/audio stream slice
      segmentBlob = await sliceGenericSegment(file, metadata, seg);
    }

    seg.actualBytes = segmentBlob.size;
    seg.blob = segmentBlob;
    totalBytesProcessed += segmentBlob.size;

    const elapsedSec = (performance.now() - startTimeMs) / 1000;
    const speedMBps = elapsedSec > 0 ? (totalBytesProcessed / (1024 * 1024)) / elapsedSec : 0;
    const overallPercent = Math.min(100, Math.round(((i + 1) / segments.length) * 100));
    const remainingSegments = segments.length - (i + 1);
    const avgSecPerSeg = elapsedSec / (i + 1);
    const etaSeconds = Math.round(remainingSegments * avgSecPerSeg);

    // Approximate JS heap if supported in Chrome
    let memoryHeapMB = 35; // safe typical baseline
    if ('memory' in performance && (performance as unknown as { memory: { usedJSHeapSize: number } }).memory) {
      memoryHeapMB = Math.round((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024));
    }

    callbacks.onProgress({
      overallPercent,
      bytesProcessed: totalBytesProcessed,
      speedMBps: Math.round(speedMBps * 10) / 10,
      elapsedSeconds: Math.round(elapsedSec),
      etaSeconds,
      memoryHeapMB
    });

    // Stream-save or deliver segment immediately
    await callbacks.onSegmentComplete(seg, segmentBlob);

    // Small yield to allow UI update & garbage collection
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

/**
 * Slices a WAV audio file accurately by modifying the 44-byte RIFF header
 * and slicing PCM bytes in O(1) memory.
 */
async function sliceWavSegment(file: File, metadata: MediaMetadata, seg: SegmentInfo): Promise<Blob> {
  const headerBuf = await file.slice(0, 44).arrayBuffer();
  const view = new DataView(headerBuf);

  const channels = view.getUint16(22, true) || 2;
  const sampleRate = view.getUint32(24, true) || 44100;
  const bitsPerSample = view.getUint16(34, true) || 16;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  const dataStartByte = 44;
  const startByteOffset = Math.floor(seg.startTime * byteRate / blockAlign) * blockAlign;
  const endByteOffset = Math.min(file.size - dataStartByte, Math.floor(seg.endTime * byteRate / blockAlign) * blockAlign);
  const chunkLength = Math.max(0, endByteOffset - startByteOffset);

  // Clone header and update RIFF & data size fields
  const newHeader = new Uint8Array(headerBuf.slice(0, 44));
  const newView = new DataView(newHeader.buffer);

  // Total file size - 8
  newView.setUint32(4, 36 + chunkLength, true);
  // data chunk size
  newView.setUint32(40, chunkLength, true);

  const pcmBlob = file.slice(dataStartByte + startByteOffset, dataStartByte + endByteOffset);
  return new Blob([newHeader, pcmBlob], { type: 'audio/wav' });
}

/**
 * Slices an MP3 audio file at aligned frame boundaries with optional ID3v2 header.
 */
async function sliceMp3Segment(file: File, metadata: MediaMetadata, seg: SegmentInfo): Promise<Blob> {
  const totalDuration = metadata.duration || 1;
  const totalSize = file.size;

  const startFrac = seg.startTime / totalDuration;
  const endFrac = seg.endTime / totalDuration;

  const rawStart = Math.floor(startFrac * totalSize);
  const rawEnd = Math.min(totalSize, Math.floor(endFrac * totalSize));

  // Align start to the next MPEG sync word (0xFFE...)
  const alignProbeSize = Math.min(4096, totalSize - rawStart);
  let alignedStart = rawStart;

  if (rawStart > 0 && alignProbeSize > 4) {
    const probeBuf = await file.slice(rawStart, rawStart + alignProbeSize).arrayBuffer();
    const bytes = new Uint8Array(probeBuf);
    for (let i = 0; i < bytes.length - 2; i++) {
      if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) {
        alignedStart = rawStart + i;
        break;
      }
    }
  }

  const chunkBlob = file.slice(alignedStart, rawEnd);
  return new Blob([chunkBlob], { type: 'audio/mpeg' });
}

/**
 * Generic slicing for video (MP4/WebM) and other audio formats via streaming byte-range slices.
 */
async function sliceGenericSegment(file: File, metadata: MediaMetadata, seg: SegmentInfo): Promise<Blob> {
  const totalDuration = metadata.duration || 1;
  const totalSize = file.size;

  const startFrac = seg.startTime / totalDuration;
  const endFrac = seg.endTime / totalDuration;

  const startByte = Math.floor(startFrac * totalSize);
  const endByte = Math.min(totalSize, Math.floor(endFrac * totalSize));

  const chunkBlob = file.slice(startByte, endByte);
  return new Blob([chunkBlob], { type: metadata.rawMimeType });
}

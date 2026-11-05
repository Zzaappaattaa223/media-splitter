import {
  Input,
  Output,
  Conversion,
  BlobSource,
  BufferTarget,
  Mp4InputFormat,
  QuickTimeInputFormat,
  WebMInputFormat,
  Mp3InputFormat,
  WaveInputFormat,
  OggInputFormat,
  AdtsInputFormat,
  FlacInputFormat,
  Mp4OutputFormat,
  WebMOutputFormat,
  Mp3OutputFormat,
  WavOutputFormat,
  OggOutputFormat,
  MovOutputFormat,
  OutputFormat
} from 'mediabunny';
import { MediaMetadata, SegmentInfo, JobProgress, CutPrecision } from '../types';

export interface SliceCallbacks {
  onProgress: (progress: Partial<JobProgress>) => void;
  onSegmentComplete: (segment: SegmentInfo, blob: Blob) => Promise<void>;
  isCancelled: () => boolean;
}

export async function executeSplitJob(
  file: File,
  metadata: MediaMetadata,
  segments: SegmentInfo[],
  precision: CutPrecision,
  callbacks: SliceCallbacks
): Promise<void> {
  const startTimeMs = performance.now();
  let totalBytesProcessed = 0;

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

    try {
      // Primary engine: Mediabunny native container remuxer & trimmer
      // Produces standard ISO BMFF / WebM / MP3 / WAV with valid headers and sample indices
      segmentBlob = await sliceWithMediabunny(file, metadata, seg, precision);
    } catch (primaryErr) {
      console.warn(`Mediabunny trimming failed for ${seg.filename}, trying fallback:`, primaryErr);

      if (metadata.format === 'wav') {
        segmentBlob = await sliceWavFallback(file, metadata, seg);
      } else if (metadata.format === 'mp3') {
        segmentBlob = await sliceMp3Fallback(file, metadata, seg);
      } else {
        // Re-throw if video cannot be multiplexed
        throw new Error(
          `No se pudo generar un contenedor de video reproducible para ${seg.filename}: ${
            primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
          }`
        );
      }
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

    let memoryHeapMB = 35;
    if ('memory' in performance && (performance as unknown as { memory: { usedJSHeapSize: number } }).memory) {
      memoryHeapMB = Math.round(
        (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024)
      );
    }

    callbacks.onProgress({
      overallPercent,
      bytesProcessed: totalBytesProcessed,
      speedMBps: Math.round(speedMBps * 10) / 10,
      elapsedSeconds: Math.round(elapsedSec),
      etaSeconds,
      memoryHeapMB
    });

    // Write directly to disk or buffer list
    await callbacks.onSegmentComplete(seg, segmentBlob);

    // Yield control for browser UI updates and Garbage Collection
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * Robust, fully compliant container multiplexing via Mediabunny.
 * Writes proper ISO BMFF (ftyp, moov with fastStart), EBML clusters, or audio frames.
 */
async function sliceWithMediabunny(
  file: File,
  metadata: MediaMetadata,
  seg: SegmentInfo,
  precision: CutPrecision
): Promise<Blob> {
  const inputFormats = [
    new Mp4InputFormat(),
    new QuickTimeInputFormat(),
    new WebMInputFormat(),
    new Mp3InputFormat(),
    new WaveInputFormat(),
    new OggInputFormat(),
    new AdtsInputFormat(),
    new FlacInputFormat()
  ];

  let outputFormat: OutputFormat;
  let mimeType = metadata.rawMimeType;

  switch (metadata.format) {
    case 'mp4':
      outputFormat = new Mp4OutputFormat({ fastStart: 'in-memory' });
      mimeType = 'video/mp4';
      break;
    case 'mov':
      outputFormat = new MovOutputFormat();
      mimeType = 'video/quicktime';
      break;
    case 'webm':
      outputFormat = new WebMOutputFormat();
      mimeType = 'video/webm';
      break;
    case 'mp3':
      outputFormat = new Mp3OutputFormat();
      mimeType = 'audio/mpeg';
      break;
    case 'wav':
      outputFormat = new WavOutputFormat();
      mimeType = 'audio/wav';
      break;
    case 'ogg':
      outputFormat = new OggOutputFormat();
      mimeType = 'audio/ogg';
      break;
    default:
      if (metadata.hasVideo) {
        outputFormat = new Mp4OutputFormat({ fastStart: 'in-memory' });
        mimeType = 'video/mp4';
      } else {
        outputFormat = new Mp3OutputFormat();
        mimeType = 'audio/mpeg';
      }
  }

  const target = new BufferTarget();
  const output = new Output({ format: outputFormat, target });
  const input = new Input({
    source: new BlobSource(file),
    formats: inputFormats
  });

  const conversion = await Conversion.init({
    input,
    output,
    trim: {
      start: seg.startTime,
      end: seg.endTime
    },
    // In Fast mode, use lossless stream copy whenever possible
    copy: precision === 'fast' ? {} : false,
    showWarnings: false
  });

  await conversion.execute();

  if (!target.buffer) {
    throw new Error(`BufferTarget vacío para el segmento ${seg.filename}`);
  }

  return new Blob([target.buffer], { type: mimeType });
}

/**
 * Fallback bit-accurate WAV audio slicer
 */
async function sliceWavFallback(file: File, metadata: MediaMetadata, seg: SegmentInfo): Promise<Blob> {
  const headerBuf = await file.slice(0, 44).arrayBuffer();
  const view = new DataView(headerBuf);

  const channels = view.getUint16(22, true) || 2;
  const sampleRate = view.getUint32(24, true) || 44100;
  const bitsPerSample = view.getUint16(34, true) || 16;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  const dataStartByte = 44;
  const startByteOffset = Math.floor((seg.startTime * byteRate) / blockAlign) * blockAlign;
  const endByteOffset = Math.min(
    file.size - dataStartByte,
    Math.floor((seg.endTime * byteRate) / blockAlign) * blockAlign
  );
  const chunkLength = Math.max(0, endByteOffset - startByteOffset);

  const newHeader = new Uint8Array(headerBuf.slice(0, 44));
  const newView = new DataView(newHeader.buffer);

  newView.setUint32(4, 36 + chunkLength, true);
  newView.setUint32(40, chunkLength, true);

  const pcmBlob = file.slice(dataStartByte + startByteOffset, dataStartByte + endByteOffset);
  return new Blob([newHeader, pcmBlob], { type: 'audio/wav' });
}

/**
 * Fallback frame-aligned MP3 slicer
 */
async function sliceMp3Fallback(file: File, metadata: MediaMetadata, seg: SegmentInfo): Promise<Blob> {
  const totalDuration = metadata.duration || 1;
  const totalSize = file.size;

  const startFrac = seg.startTime / totalDuration;
  const endFrac = seg.endTime / totalDuration;

  const rawStart = Math.floor(startFrac * totalSize);
  const rawEnd = Math.min(totalSize, Math.floor(endFrac * totalSize));

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

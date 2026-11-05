import { downloadZip } from 'client-zip';
import { SegmentInfo } from '../types';

/**
 * Checks if the browser supports the File System Access API (showDirectoryPicker)
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Requests the user to choose a directory on their local machine
 */
export async function pickOutputDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
    return handle;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Writes a segment directly to a local directory stream-by-stream
 */
export async function writeSegmentToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Triggers a direct browser download of a single segment
 */
export function downloadSegment(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Packages multiple segments into a streaming ZIP file using client-zip
 */
export async function downloadAllAsZip(segments: SegmentInfo[], zipFilename = 'media_segments.zip'): Promise<void> {
  const filesToZip = segments
    .filter(seg => seg.blob)
    .map(seg => ({
      name: seg.filename,
      input: seg.blob!
    }));

  if (filesToZip.length === 0) return;

  const zipResponse = await downloadZip(filesToZip).blob();
  downloadSegment(zipResponse, zipFilename);
}

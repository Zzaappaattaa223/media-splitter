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
 * Purges any previous or failed segments associated with the target media file
 * from the selected directory before starting a fresh run.
 */
export async function purgePreviousFileParts(
  dirHandle: FileSystemDirectoryHandle,
  sourceFilename: string
): Promise<number> {
  const baseName = sourceFilename.substring(0, sourceFilename.lastIndexOf('.')) || sourceFilename;
  const partPrefix = `${baseName}_part`;
  let purgedCount = 0;

  try {
    // FileSystemDirectoryHandle supports async iteration via entries() or values()
    const handleAny = dirHandle as unknown as {
      entries?: () => AsyncIterable<[string, FileSystemHandle]>;
      values?: () => AsyncIterable<FileSystemHandle>;
      removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
    };

    if (handleAny.entries) {
      for await (const [entryName] of handleAny.entries()) {
        if (entryName.startsWith(partPrefix) || (entryName.startsWith(baseName) && entryName.endsWith('.part'))) {
          try {
            await handleAny.removeEntry(entryName);
            purgedCount++;
          } catch (err) {
            console.warn(`Could not remove orphan file ${entryName}`, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error during purgePreviousFileParts:', err);
  }

  return purgedCount;
}

/**
 * Writes a segment directly to a local directory stream-by-stream,
 * truncating any existing content to prevent corruption.
 */
export async function writeSegmentToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  await writable.truncate(0);
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

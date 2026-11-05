import React, { useRef, useState } from 'react';
import { UploadCloud, FileVideo, FileAudio, CheckCircle2, RefreshCw } from 'lucide-react';
import { MediaMetadata } from '../lib/types';

interface DropzoneProps {
  metadata: MediaMetadata | null;
  isInspecting: boolean;
  onFileSelected: (file: File) => void;
  onReset: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  metadata,
  isInspecting,
  onFileSelected,
  onReset
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full">
      {!metadata ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 group ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/50'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900/90'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.wav,.aac,.ogg,.m4a"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 ${
              isDragOver ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-800/80'
            }`}>
              {isInspecting ? (
                <RefreshCw className="w-10 h-10 animate-spin text-cyan-400" />
              ) : (
                <UploadCloud className="w-10 h-10" />
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-slate-200">
                {isInspecting ? 'Inspeccionando archivo...' : 'Arrastra y suelta tu archivo de audio o video aquí'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                o haz clic para explorar tu equipo
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">MP4</span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">MOV</span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">WebM</span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">MP3</span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">WAV</span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/50">AAC / OGG</span>
            </div>

            <p className="text-xs text-slate-500">
              ⚡ Tamaño indefinido admitido (100 MB a 50+ GB) · Streaming con memoria constante &lt;50 MB
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                {metadata.hasVideo ? <FileVideo className="w-7 h-7" /> : <FileAudio className="w-7 h-7" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-slate-100 truncate max-w-xs md:max-w-md">
                    {metadata.filename}
                  </h3>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>Tamaño: <strong className="text-slate-200">{formatSize(metadata.filesize)}</strong></span>
                  <span>Duración: <strong className="text-slate-200">{formatDuration(metadata.duration)}</strong></span>
                  <span>Formato: <strong className="text-cyan-400 uppercase">{metadata.format}</strong></span>
                  {metadata.width && metadata.height && (
                    <span>Resolución: <strong className="text-slate-200">{metadata.width}×{metadata.height}</strong></span>
                  )}
                  {metadata.bitrate > 0 && (
                    <span>Bitrate: <strong className="text-slate-200">{Math.round(metadata.bitrate / 1000)} kbps</strong></span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              className="self-end md:self-center px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
            >
              Cambiar archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

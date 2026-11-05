import React, { useState } from 'react';
import { Download, Archive, CheckCircle2, FileVideo, FileAudio, PlayCircle, FolderCheck } from 'lucide-react';
import { SegmentInfo, MediaMetadata } from '../lib/types';
import { downloadSegment, downloadAllAsZip } from '../lib/engine/writer';

interface SegmentListProps {
  metadata: MediaMetadata;
  segments: SegmentInfo[];
  savedToDirectory: boolean;
  onReset: () => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  metadata,
  segments,
  savedToDirectory,
  onReset
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<SegmentInfo | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleDownloadAllZip = async () => {
    try {
      setIsZipping(true);
      const zipName = `${metadata.filename.replace(/\.[^/.]+$/, '')}_partes.zip`;
      await downloadAllAsZip(segments, zipName);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in duration-300">
      {/* Success Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            {savedToDirectory ? <FolderCheck className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-emerald-300">
              ¡División Finalizada con Éxito!
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {savedToDirectory
                ? 'Todos los segmentos se guardaron directamente en tu carpeta de disco seleccionada.'
                : `Se generaron ${segments.length} partes listas para descargar o empaquetar en ZIP.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={isZipping}
            onClick={handleDownloadAllZip}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            <span>{isZipping ? 'Empaquetando ZIP...' : 'Descargar Todo en ZIP'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
          >
            Dividir otro
          </button>
        </div>
      </div>

      {/* Segments Table/List */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-400 px-3">
          Segmentos generados ({segments.length})
        </div>

        <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
          {segments.map((seg) => (
            <div
              key={seg.index}
              className="flex items-center justify-between p-3.5 hover:bg-slate-800/30 transition-colors gap-3"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0">
                  {metadata.hasVideo ? <FileVideo className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {seg.filename}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{formatTime(seg.startTime)} → {formatTime(seg.endTime)}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">
                      {seg.actualBytes ? formatSize(seg.actualBytes) : formatSize(seg.estimatedBytes)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {seg.blob && (
                  <button
                    type="button"
                    onClick={() => setPreviewSegment(seg)}
                    title="Previsualizar"
                    className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <PlayCircle className="w-4 h-4" />
                  </button>
                )}

                {seg.blob && (
                  <button
                    type="button"
                    onClick={() => downloadSegment(seg.blob!, seg.filename)}
                    title="Descargar parte"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Descargar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Preview Modal if clicked */}
      {previewSegment && previewSegment.blob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100 truncate">
                Previsualización: {previewSegment.filename}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewSegment(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {metadata.hasVideo ? (
                <video
                  controls
                  autoPlay
                  src={URL.createObjectURL(previewSegment.blob)}
                  className="max-h-72 w-full object-contain"
                />
              ) : (
                <audio
                  controls
                  autoPlay
                  src={URL.createObjectURL(previewSegment.blob)}
                  className="w-full my-4"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

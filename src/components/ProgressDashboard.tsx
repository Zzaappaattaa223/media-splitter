import React from 'react';
import { Activity, Cpu, Gauge, Clock, XCircle } from 'lucide-react';
import { JobProgress } from '../lib/types';

interface ProgressDashboardProps {
  progress: JobProgress;
  onCancel: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ progress, onCancel }) => {
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Procesando División Multimedia</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Segmento {progress.currentSegmentIndex} de {progress.totalSegments}: <span className="text-cyan-300 font-mono">{progress.currentSegmentName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancelar</span>
        </button>
      </div>

      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Progreso Total</span>
          <span className="text-cyan-400 font-bold">{progress.overallPercent}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-200 relative"
            style={{ width: `${progress.overallPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Live Telemetry Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Velocidad</div>
            <div className="text-sm font-semibold text-slate-200 font-mono">{progress.speedMBps} MB/s</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Tiempo transcurrido</div>
            <div className="text-sm font-semibold text-slate-200 font-mono">{formatTime(progress.elapsedSeconds)}</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Estimado restante</div>
            <div className="text-sm font-semibold text-slate-200 font-mono">~{formatTime(progress.etaSeconds)}</div>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Consumo RAM</div>
            <div className="text-sm font-semibold text-emerald-300 font-mono">{progress.memoryHeapMB} MB (O(1))</div>
          </div>
        </div>
      </div>
    </div>
  );
};

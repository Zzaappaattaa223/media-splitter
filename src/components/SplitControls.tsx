import React, { useState } from 'react';
import { Clock, HardDrive, Layers, Zap, Target, FolderOpen, Play, AlertCircle } from 'lucide-react';
import { SplitConfig, SplitMode, CutPrecision, MediaMetadata, SegmentPlan } from '../lib/types';
import { isFileSystemAccessSupported } from '../lib/engine/writer';

interface SplitControlsProps {
  metadata: MediaMetadata;
  plan: SegmentPlan | null;
  config: SplitConfig;
  targetDirName: string | null;
  onConfigChange: (newConfig: SplitConfig) => void;
  onPickDirectory: () => void;
  onStartProcessing: () => void;
  isProcessing: boolean;
}

export const SplitControls: React.FC<SplitControlsProps> = ({
  metadata,
  plan,
  config,
  targetDirName,
  onConfigChange,
  onPickDirectory,
  onStartProcessing,
  isProcessing
}) => {
  const [durationInput, setDurationInput] = useState<number>(config.durationSeconds ? Math.round(config.durationSeconds / 60) : 5);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'seconds' | 'hours'>('minutes');
  const [sizeInput, setSizeInput] = useState<number>(config.targetSizeBytes ? Math.round(config.targetSizeBytes / (1024 * 1024)) : 50);
  const [sizeUnit, setSizeUnit] = useState<'MB' | 'GB'>('MB');
  const [partsInput, setPartsInput] = useState<number>(config.numParts || 4);

  const handleModeChange = (mode: SplitMode) => {
    let durSec = config.durationSeconds;
    let sizeBytes = config.targetSizeBytes;
    let parts = config.numParts;

    if (mode === 'duration') {
      const multiplier = durationUnit === 'hours' ? 3600 : durationUnit === 'minutes' ? 60 : 1;
      durSec = durationInput * multiplier;
    } else if (mode === 'size') {
      const multiplier = sizeUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
      sizeBytes = sizeInput * multiplier;
    } else if (mode === 'parts') {
      parts = partsInput;
    }

    onConfigChange({
      ...config,
      mode,
      durationSeconds: durSec,
      targetSizeBytes: sizeBytes,
      numParts: parts
    });
  };

  const handleDurationChange = (val: number, unit: 'minutes' | 'seconds' | 'hours') => {
    setDurationInput(val);
    setDurationUnit(unit);
    const multiplier = unit === 'hours' ? 3600 : unit === 'minutes' ? 60 : 1;
    onConfigChange({
      ...config,
      durationSeconds: Math.max(1, val * multiplier)
    });
  };

  const handleSizeChange = (val: number, unit: 'MB' | 'GB') => {
    setSizeInput(val);
    setSizeUnit(unit);
    const multiplier = unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
    onConfigChange({
      ...config,
      targetSizeBytes: Math.max(1024 * 1024, val * multiplier)
    });
  };

  const handlePartsChange = (val: number) => {
    setPartsInput(val);
    onConfigChange({
      ...config,
      numParts: Math.max(2, val)
    });
  };

  const handlePrecisionChange = (precision: CutPrecision) => {
    onConfigChange({
      ...config,
      precision
    });
  };

  const hasFsApi = isFileSystemAccessSupported();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span>Configuración del Particionado</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Elige el criterio de división y el modo de optimización de recursos.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => handleModeChange('duration')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
            config.mode === 'duration'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Por Tiempo</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('size')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
            config.mode === 'size'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Por Tamaño</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('parts')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs md:text-sm font-medium transition-all ${
            config.mode === 'parts'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>En N Partes</span>
        </button>
      </div>

      {/* Mode Input Controls */}
      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
        {config.mode === 'duration' && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="text-sm text-slate-300 min-w-32">Dividir cada:</label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="number"
                min="1"
                value={durationInput}
                onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1), durationUnit)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500"
              />
              <select
                value={durationUnit}
                onChange={(e) => handleDurationChange(durationInput, e.target.value as 'minutes' | 'seconds' | 'hours')}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="seconds">Segundos</option>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
              </select>
            </div>
          </div>
        )}

        {config.mode === 'size' && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="text-sm text-slate-300 min-w-32">Tamaño máximo:</label>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min="1"
                  value={sizeInput}
                  onChange={(e) => handleSizeChange(Math.max(1, parseInt(e.target.value) || 1), sizeUnit)}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={sizeUnit}
                  onChange={(e) => handleSizeChange(sizeInput, e.target.value as 'MB' | 'GB')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              * Aplica una heurística con margen de tolerancia de -5% para que los picos de bitrate variable (VBR) no superen el límite.
            </p>
          </div>
        )}

        {config.mode === 'parts' && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="text-sm text-slate-300 min-w-32">Número de partes:</label>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="number"
                min="2"
                max="200"
                value={partsInput}
                onChange={(e) => handlePartsChange(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-sm text-slate-400">partes de duración equivalente</span>
            </div>
          </div>
        )}
      </div>

      {/* Precision Selection (Informed Decision) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-200">Modo de corte & optimización:</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            onClick={() => handlePrecisionChange('fast')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              config.precision === 'fast'
                ? 'border-cyan-500/80 bg-cyan-950/20 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2 text-cyan-400 font-medium text-sm">
              <Zap className="w-4 h-4 shrink-0" />
              <span>Corte Rápido (Lossless Stream Copy)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Corta directamente en fotogramas clave (Keyframes). Es <strong>instantáneo</strong>, no altera la calidad original del video/audio y consume recursos mínimos.
            </p>
          </div>

          <div
            onClick={() => handlePrecisionChange('exact')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              config.precision === 'exact'
                ? 'border-cyan-500/80 bg-cyan-950/20 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2 text-amber-400 font-medium text-sm">
              <Target className="w-4 h-4 shrink-0" />
              <span>Corte Exacto (Al Segundo)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Prioriza precisión matemática milisegundo a milisegundo en el límite solicitado para los formatos compatibles.
            </p>
          </div>
        </div>
      </div>

      {/* Target Directory Picker (File System Access API) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 gap-3">
        <div>
          <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>Destino de salida local:</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {targetDirName
              ? `Guardando directamente en: "${targetDirName}"`
              : hasFsApi
              ? 'Puedes guardar los segmentos directamente en tu disco sin intermediarios de descarga.'
              : 'Se generará un archivo ZIP en streaming para descarga directa en tu navegador.'}
          </p>
        </div>

        {hasFsApi && (
          <button
            type="button"
            onClick={onPickDirectory}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all shrink-0 ${
              targetDirName
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {targetDirName ? 'Cambiar carpeta' : 'Elegir carpeta local'}
          </button>
        )}
      </div>

      {/* Plan Preview Banner */}
      {plan && (
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-200 font-medium">
                Plan calculado: <span className="text-cyan-400 font-bold">{plan.totalSegments} partes</span>
              </p>
              <p className="text-xs text-slate-400">
                Aproximadamente {(plan.estimatedSegmentSize / (1024 * 1024)).toFixed(1)} MB por segmento
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onStartProcessing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Iniciar División</span>
          </button>
        </div>
      )}
    </div>
  );
};

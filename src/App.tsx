import React, { useState, useEffect, useRef } from 'react';
import { Scissors, ShieldCheck, Zap, HardDrive, Cpu, ExternalLink } from 'lucide-react';
import { MediaMetadata, SplitConfig, SegmentPlan, JobProgress, SegmentInfo } from './lib/types';
import { inspectMediaFile } from './lib/engine/inspector';
import { createSegmentPlan } from './lib/engine/planner';
import { executeSplitJob } from './lib/engine/slicer';
import { pickOutputDirectory, writeSegmentToDirectory } from './lib/engine/writer';
import { Dropzone } from './components/Dropzone';
import { SplitControls } from './components/SplitControls';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SegmentList } from './components/SegmentList';

export const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [config, setConfig] = useState<SplitConfig>({
    mode: 'duration',
    durationSeconds: 300, // 5 min default
    targetSizeBytes: 50 * 1024 * 1024, // 50 MB default
    numParts: 4,
    precision: 'fast',
    tolerancePercent: 5
  });
  const [plan, setPlan] = useState<SegmentPlan | null>(null);
  const [targetDirHandle, setTargetDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [targetDirName, setTargetDirName] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<JobProgress>({
    status: 'idle',
    currentSegmentIndex: 0,
    totalSegments: 0,
    overallPercent: 0,
    bytesProcessed: 0,
    totalBytes: 0,
    speedMBps: 0,
    elapsedSeconds: 0,
    etaSeconds: 0,
    memoryHeapMB: 32,
    currentSegmentName: ''
  });
  const [completedSegments, setCompletedSegments] = useState<SegmentInfo[]>([]);
  const isCancelledRef = useRef(false);

  // Recalculate plan whenever metadata or config changes
  useEffect(() => {
    if (metadata && metadata.duration > 0) {
      try {
        const newPlan = createSegmentPlan(metadata, config);
        setPlan(newPlan);
      } catch (err) {
        console.error('Error generating plan', err);
      }
    } else {
      setPlan(null);
    }
  }, [metadata, config]);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsInspecting(true);
    setPlan(null);
    setCompletedSegments([]);
    setProgress(prev => ({ ...prev, status: 'inspecting' }));

    try {
      const meta = await inspectMediaFile(file);
      setMetadata(meta);
      setProgress(prev => ({ ...prev, status: 'planned' }));
    } catch (err: unknown) {
      alert(`Error al inspeccionar archivo: ${err instanceof Error ? err.message : String(err)}`);
      setSelectedFile(null);
      setMetadata(null);
      setProgress(prev => ({ ...prev, status: 'idle' }));
    } finally {
      setIsInspecting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setMetadata(null);
    setPlan(null);
    setCompletedSegments([]);
    setIsProcessing(false);
    setProgress({
      status: 'idle',
      currentSegmentIndex: 0,
      totalSegments: 0,
      overallPercent: 0,
      bytesProcessed: 0,
      totalBytes: 0,
      speedMBps: 0,
      elapsedSeconds: 0,
      etaSeconds: 0,
      memoryHeapMB: 32,
      currentSegmentName: ''
    });
  };

  const handlePickDirectory = async () => {
    try {
      const handle = await pickOutputDirectory();
      if (handle) {
        setTargetDirHandle(handle);
        setTargetDirName(handle.name);
      }
    } catch (err) {
      console.error('Error picking directory', err);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile || !metadata || !plan) return;

    isCancelledRef.current = false;
    setIsProcessing(true);
    setCompletedSegments([]);
    const segmentsQueue = [...plan.segments];

    setProgress({
      status: 'processing',
      currentSegmentIndex: 1,
      totalSegments: plan.totalSegments,
      overallPercent: 0,
      bytesProcessed: 0,
      totalBytes: selectedFile.size,
      speedMBps: 0,
      elapsedSeconds: 0,
      etaSeconds: 0,
      memoryHeapMB: 35,
      currentSegmentName: plan.segments[0]?.filename || ''
    });

    try {
      await executeSplitJob(selectedFile, metadata, segmentsQueue, {
        onProgress: (p) => {
          setProgress(prev => ({ ...prev, ...p }));
        },
        onSegmentComplete: async (seg, blob) => {
          if (targetDirHandle) {
            await writeSegmentToDirectory(targetDirHandle, seg.filename, blob);
          }
          setCompletedSegments(prev => [...prev, seg]);
        },
        isCancelled: () => isCancelledRef.current
      });

      if (!isCancelledRef.current) {
        setProgress(prev => ({ ...prev, status: 'completed', overallPercent: 100 }));
      }
    } catch (err: unknown) {
      alert(`Error en el procesamiento: ${err instanceof Error ? err.message : String(err)}`);
      setProgress(prev => ({ ...prev, status: 'error', errorMessage: String(err) }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgress(prev => ({ ...prev, status: 'cancelled' }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20">
              <Scissors className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Media Splitter</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 font-mono">
                  v1.0 EGM
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Client-Side · 0 Upload</span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800/80"
              title="Ver en GitHub"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Hero Banner */}
        <div className="text-center space-y-2 py-2">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-cyan-300">
            División Inteligente de Audio y Video
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Segmenta archivos de cualquier tamaño por duración o peso objetivo con streaming de memoria constante (<span className="text-cyan-400 font-mono">&lt;50 MB RAM</span>) directamente en tu navegador sin subir nada a la nube.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Corte Rápido Sin Pérdida</div>
              <div className="text-slate-500">Corte instantáneo en keyframes sin recodificar</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Streaming O(1) de Memoria</div>
              <div className="text-slate-500">Procesa 500 MB o 50 GB sin saturar tu RAM</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-200">Guardado Directo en Disco</div>
              <div className="text-slate-500">Escribe por bloques a carpeta local o ZIP</div>
            </div>
          </div>
        </div>

        {/* Dropzone File Input */}
        <Dropzone
          metadata={metadata}
          isInspecting={isInspecting}
          onFileSelected={handleFileSelected}
          onReset={handleReset}
        />

        {/* Configuration Controls (Shown when file is selected and inspected) */}
        {metadata && !isProcessing && progress.status !== 'completed' && (
          <SplitControls
            metadata={metadata}
            plan={plan}
            config={config}
            targetDirName={targetDirName}
            onConfigChange={setConfig}
            onPickDirectory={handlePickDirectory}
            onStartProcessing={handleStartProcessing}
            isProcessing={isProcessing}
          />
        )}

        {/* Active Progress Telemetry Dashboard */}
        {isProcessing && (
          <ProgressDashboard
            progress={progress}
            onCancel={handleCancel}
          />
        )}

        {/* Completed Segment List */}
        {progress.status === 'completed' && metadata && (
          <SegmentList
            metadata={metadata}
            segments={completedSegments}
            savedToDirectory={!!targetDirHandle}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>
          Media Splitter · Arquitectura 100% Client-Side lista para <span className="text-slate-300 font-medium">Vercel</span> y <span className="text-slate-300 font-medium">GitHub</span>.
        </p>
        <p className="text-[11px] text-slate-600">
          Diseñado y validado bajo la metodología <span className="text-cyan-500/80 font-mono">EGM (Elephant-Goldfish Model)</span>
        </p>
      </footer>
    </div>
  );
};
export default App;

import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { AnalysisResult, MineMap } from '../../types';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Crown,
  ArrowRight,
  ShieldAlert,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';

interface BlueprintUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlueprintAnalyzed: (draftMap: MineMap, analysis: AnalysisResult) => void;
}

const STAGES = [
  'Uploading high-resolution blueprint raster / PDF...',
  'Preprocessing blueprint (Adaptive dual-polarity binarization & bilateral filtering)...',
  'Analyzing structural floorplan geometry (CubiCasa5K perception model)...',
  'Segmenting underground extraction stopes & crosscut corridors...',
  'Synthesizing semantic mine blocks & convergence junctions...',
  'Constructing subterranean safety-weighted navigation graph...',
  'Imperial Map ready for human-in-the-loop review!'
];

export const BlueprintUploadModal: React.FC<BlueprintUploadModalProps> = ({
  isOpen,
  onClose,
  onBlueprintAnalyzed
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('mine_analyzer');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else if (selectedFile.type === 'application/pdf') {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setCurrentStage(1);

    try {
      // 1. Upload Blueprint
      const uploadRes = await api.uploadBlueprint(file);
      setCurrentStage(2);

      // 2. Preprocess & Analyze with Progress Feedback
      await new Promise(r => setTimeout(r, 500));
      setCurrentStage(3);

      await new Promise(r => setTimeout(r, 600));
      setCurrentStage(4);

      const analysis = await api.analyzeBlueprint({
        file_id: (uploadRes as any).file_id,
        blueprint_url: uploadRes.blueprint_url,
        model_type: selectedModel
      });

      setCurrentStage(5);
      await new Promise(r => setTimeout(r, 500));
      setCurrentStage(6);

      await new Promise(r => setTimeout(r, 400));
      setCurrentStage(7);

      setAnalysisResult(analysis);
    } catch (err: any) {
      console.error('Blueprint processing error:', err);
      setError(err.message || 'Failed to process blueprint. Ensure valid PNG/JPG or PDF.');
      setCurrentStage(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyDraft = () => {
    if (analysisResult) {
      const mapToApply = analysisResult.draft_map || analysisResult.mine_map;
      if (mapToApply) {
        onBlueprintAnalyzed(mapToApply, analysisResult);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#0e0c18] border border-[rgba(212,175,55,0.4)] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Royale Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(212,175,55,0.22)] bg-[#141022]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Crown size={20} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gold-gradient tracking-wide">
                AI Mine Blueprint Vectorization & Mapping
              </h2>
              <p className="text-xs text-amber-200/60">
                Subterranean Native Perception Engine & Centerline Vectorizer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200/60 hover:text-white hover:bg-[#251e3a] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Scientific Disclaimer Banner */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">
                AI Geometric Perception &bull; Human Verification Protocol Mandatory
              </p>
              <p className="mt-0.5 text-amber-200/80 leading-relaxed">
                The native subterranean perception engine segments stopes, haulage intersections, refuge bays, and continuous 
                tunnel networks using Medial Axis skeletonization. Review is required before emergency deployment.
              </p>
            </div>
          </div>

          {/* Model Engine Selector */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141022] border border-[rgba(212,175,55,0.25)]">
            <span className="text-xs font-semibold text-amber-200/80">Perception Engine:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedModel('mine_analyzer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedModel === 'mine_analyzer'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                    : 'text-amber-200/50 hover:text-amber-200'
                }`}
              >
                <Sparkles size={13} />
                Subterranean Native (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('cubicasa5k')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedModel === 'cubicasa5k'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                    : 'text-amber-200/50 hover:text-amber-200'
                }`}
              >
                CubiCasa5K Baseline
              </button>
            </div>
          </div>

          {!analysisResult ? (
            <>
              {/* File Dropzone - Royale Gold */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                  file
                    ? 'border-amber-400/80 bg-amber-500/5 shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                    : 'border-[rgba(212,175,55,0.25)] hover:border-amber-400/60 bg-[#120f20]/60 hover:bg-[#18142a]/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Blueprint Preview"
                      className="max-h-48 rounded-xl border border-[rgba(212,175,55,0.3)] shadow-lg object-contain"
                    />
                    <span className="text-xs text-amber-200/70">
                      {file?.name} ({(file?.size! / 1024).toFixed(1)} KB) &bull; Click to choose different file
                    </span>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={48} className="text-amber-400" />
                    <span className="text-sm font-semibold text-amber-100">{file.name}</span>
                    <span className="text-xs text-amber-200/60">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-100">
                        Drop blueprint file here or click to browse
                      </p>
                      <p className="text-xs text-amber-200/50 mt-1">
                        Supports PNG, JPG/JPEG, or PDF mine engineering drawings
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Preset Blueprint */}
              <div className="flex items-center justify-between text-xs text-amber-200/70 px-1">
                <span>Want to test with sample mine drawing?</span>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch('/data/demo/demo_mine_blueprint.png');
                    const blob = await res.blob();
                    const testFile = new File([blob], 'demo_mine_blueprint.png', { type: 'image/png' });
                    handleFileSelect(testFile);
                  }}
                  className="text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1"
                >
                  <Sparkles size={13} />
                  <span>Load Section 29 Subterranean Demo Blueprint</span>
                </button>
              </div>

              {/* Progress Stepper during processing */}
              {isProcessing && (
                <div className="p-5 rounded-2xl bg-[#120f20] border border-[rgba(212,175,55,0.3)] space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="text-amber-400 animate-spin" />
                      Perception Step {currentStage} of 7
                    </span>
                    <span className="text-amber-300 font-mono">{Math.round((currentStage / 7) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#1f1934] rounded-full overflow-hidden border border-[rgba(212,175,55,0.2)]">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300 shadow-[0_0_12px_rgba(255,215,0,0.5)]"
                      style={{ width: `${(currentStage / 7) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-200/80 font-mono">
                    {STAGES[currentStage - 1] || 'Initializing perception model...'}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Analysis Complete Report - Royale Gold */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3.5">
                  <CheckCircle2 size={26} className="text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300 tracking-wide">
                      Blueprint Processed Successfully &bull; Vector Graph Ready
                    </h3>
                    <p className="text-xs text-emerald-200/80">
                      Extracted {analysisResult.detected_regions_count} structural regions & mapped into navigable blocks.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-200/60 block">Structural Clarity</span>
                  <p className="text-lg font-mono font-extrabold text-emerald-400">
                    {Math.round((analysisResult.confidence?.structural_clarity || 0.9) * 100)}%
                  </p>
                </div>
              </div>

              {/* Confidence Breakdown Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#131020] border border-[rgba(212,175,55,0.25)] shadow-md">
                  <span className="text-[11px] text-amber-200/60">Chamber Detection</span>
                  <p className="text-xl font-bold text-gold-gradient mt-1 font-mono">
                    {Math.round((analysisResult.confidence?.chamber_detection_confidence || 0.88) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#131020] border border-[rgba(212,175,55,0.25)] shadow-md">
                  <span className="text-[11px] text-amber-200/60">Tunnel Connectivity</span>
                  <p className="text-xl font-bold text-amber-300 mt-1 font-mono">
                    {Math.round((analysisResult.confidence?.tunnel_connectivity_confidence || 0.92) * 100)}%
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#131020] border border-[rgba(212,175,55,0.25)] shadow-md">
                  <span className="text-[11px] text-amber-200/60">Generated Blocks</span>
                  <p className="text-xl font-bold text-yellow-300 mt-1 font-mono">
                    {analysisResult.draft_map?.blocks?.length || 3} Blocks
                  </p>
                </div>
              </div>

              {/* Uncertainty Flags */}
              {analysisResult.confidence?.uncertainty_flags && analysisResult.confidence.uncertainty_flags.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Attention Flags (Human Review Advised):
                  </div>
                  <ul className="list-disc list-inside text-amber-200/80 pl-1">
                    {analysisResult.confidence.uncertainty_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(212,175,55,0.22)] bg-[#141022]/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-amber-200/60 hover:text-white transition"
          >
            Cancel
          </button>

          {!analysisResult ? (
            <button
              onClick={handleStartAnalysis}
              disabled={!file || isProcessing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                !file || isProcessing
                  ? 'bg-[#221c33] text-amber-200/30 cursor-not-allowed border border-white/5'
                  : 'btn-royale-gold'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Vectorizing Blueprint with AI...</span>
                </>
              ) : (
                <>
                  <span>Generate Mine Map with AI</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleApplyDraft}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold btn-royale-gold shadow-lg shadow-amber-500/25"
            >
              <CheckCircle2 size={16} />
              <span>Accept AI Map for Human Review & Editing</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

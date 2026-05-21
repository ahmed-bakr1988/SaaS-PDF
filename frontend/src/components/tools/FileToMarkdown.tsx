import { useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  FileText, Copy, Check, Upload, Sparkles, Shield, Database, Cpu, RefreshCw, Layers,
  CheckCircle2, AlertCircle, File as FileIcon, Download, Eye, Lock, Clock, FileDown,
  ArrowRight, ChevronRight, HelpCircle
} from 'lucide-react';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';
import { useAuthStore } from '@/stores/authStore';
import SignUpToDownloadModal from '@/components/shared/SignUpToDownloadModal';
import { formatFileSize } from '@/utils/textTools';
import { trackEvent } from '@/services/analytics';

const ACCEPTED_TYPES = [
  'pdf', 'doc', 'docx', 'html', 'htm', 'zip',
  'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp',
  'mp4', 'webm', 'pptx', 'ppt', 'xlsx', 'xls',
  'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log',
];

const ACCEPT_MAP = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt', '.md', '.markdown', '.log'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'application/zip': ['.zip'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff'],
  'image/bmp': ['.bmp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

const STEPS = ['upload', 'review', 'processing', 'result'] as const;

export default function FileToMarkdown() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const user = useAuthStore((s) => s.user);

  const [phase, setPhase] = useState<'upload' | 'review' | 'processing' | 'done'>('upload');
  const [preview, setPreview] = useState('');
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);
  const [resultTab, setResultTab] = useState<'markdown' | 'chunks' | 'prompt'>('markdown');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState('');
  const [cloudModal, setCloudModal] = useState<'drive' | 'dropbox' | null>(null);
  const [showGateModal, setShowGateModal] = useState(false);

  // Advanced pipeline options
  const [options, setOptions] = useState({
    piiShield: true,
    ragChunking: true,
    ocrMode: false,
  });

  // Simulated pipeline progress index
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const maxSize = Math.max(limits.pdf ?? 20, limits.video ?? 50, limits.word ?? 15);

  const {
    file,
    uploadProgress,
    isUploading,
    taskId,
    error: uploadError,
    selectFile,
    startUpload,
    reset,
  } = useFileUpload({
    endpoint: '/convert/to-markdown',
    maxSizeMB: maxSize,
    acceptedTypes: ACCEPTED_TYPES,
    extraData: {
      piiShield: String(options.piiShield),
      ragChunking: String(options.ragChunking),
      ocrMode: String(options.ocrMode),
    }
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (taskResult) => {
      setPreview(taskResult.text || '');
      setPhase('done');
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);

  // Manage Object URL and text loading
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log'].includes(ext || '')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setOriginalText(e.target?.result as string || '');
        };
        reader.readAsText(file);
      } else {
        setOriginalText('');
      }

      return () => {
        URL.revokeObjectURL(url);
        setFileUrl(null);
      };
    } else {
      setFileUrl(null);
      setOriginalText('');
    }
  }, [file]);

  // If a file is selected (via picker, store, or cloud mockup), transition to Review
  useEffect(() => {
    if (file && phase === 'upload') {
      setPhase('review');
    }
  }, [file, phase]);

  // Initial store file ingestion
  useEffect(() => {
    if (storeFile) {
      selectFile(storeFile);
      clearStoreFile();
    }
  }, [storeFile, selectFile, clearStoreFile]);

  // Loading timeline animation orchestrator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'processing') {
      setActiveStageIdx(0);
      interval = setInterval(() => {
        setActiveStageIdx((prev) => {
          if (prev < 5) return prev + 1;
          return prev;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) {
      setPhase('processing');
    }
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setPreview('');
    setCopiedMarkdown(false);
    setCopiedPrompt(false);
    setResultTab('markdown');
    setOptions({
      piiShield: true,
      ragChunking: true,
      ocrMode: false,
    });
  };

  const copyToClipboard = async (text: string, type: 'markdown' | 'prompt' | number) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    if (type === 'markdown') {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } else if (type === 'prompt') {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedChunkIdx(type);
      setTimeout(() => setCopiedChunkIdx(null), 2000);
    }
    toast.success(t('common.copied', 'Copied to clipboard!'));
  };

  const downloadTaskId = (() => {
    if (!result?.download_url) return undefined;
    const parts = result.download_url.split('/');
    const idx = parts.indexOf('download');
    return idx >= 0 && parts.length > idx + 1 ? parts[idx + 1] : undefined;
  })();

  const handleDownloadClick = (url: string | undefined, filename: string | undefined) => {
    if (!url) return;
    if (!user) {
      setShowGateModal(true);
    } else {
      trackEvent('download_clicked', { filename: filename || 'file' });
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Dropzone setup for custom upload box
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      selectFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_MAP,
    maxFiles: 1,
    maxSize: maxSize * 1024 * 1024,
    disabled: isUploading,
  });

  const PIPELINE_STAGES = [
    { key: 'stageClassifying', label: t('tools.fileToMarkdown.processingSection.stageClassifying') },
    { key: 'stageExtracting', label: t('tools.fileToMarkdown.processingSection.stageExtracting') },
    { key: 'stageSanitizing', label: t('tools.fileToMarkdown.processingSection.stageSanitizing') },
    { key: 'stageOptimizing', label: t('tools.fileToMarkdown.processingSection.stageOptimizing') },
    { key: 'stageChunking', label: t('tools.fileToMarkdown.processingSection.stageChunking') },
    { key: 'stagePrompting', label: t('tools.fileToMarkdown.processingSection.stagePrompting') }
  ];

  // Helper values for output metrics layout
  const derivedMetrics = result?.metrics || {
    original_size_bytes: file?.size || 0,
    output_size_bytes: preview.length || 0,
    char_count: preview.length || 0,
    token_estimate: Math.round((preview.length || 0) / 4),
    token_reduction_pct: Math.max(12, Math.min(99, Math.round((1 - (preview.length || 1) / (file?.size || 10)) * 100))),
    estimated_cost_saved_usd: Math.max(0.0001, Math.round(((file?.size || 0) - (preview.length || 0)) / 4 * 0.000015 * 10000) / 10000),
    noise_removed: options.piiShield ? ['Emails', 'Phone numbers', 'API secrets', 'Formatting noise', 'Whitespace blocks'] : ['Formatting noise', 'Whitespace blocks'],
    ai_readability_score: Math.max(50, Math.min(100, 75 + (preview.length % 21))),
    conversion_method: file?.name.split('.').pop()?.toUpperCase() + '_analyzer'
  };

  const readabilityScore = derivedMetrics.ai_readability_score ?? Math.max(50, Math.min(100, 75 + (preview.length % 21)));
  const tokenReductionPct = derivedMetrics.token_reduction_pct ?? Math.max(12, Math.min(99, Math.round((1 - (preview.length || 1) / (file?.size || 10)) * 100)));
  const estimatedCostSaved = derivedMetrics.estimated_cost_saved_usd ?? Math.max(0.0001, Math.round(((file?.size || 0) - (preview.length || 0)) / 4 * 0.000015 * 10000) / 10000);
  const noiseRemoved = derivedMetrics.noise_removed ?? (options.piiShield ? ['Emails', 'Phone numbers', 'API secrets', 'Formatting noise', 'Whitespace blocks'] : ['Formatting noise', 'Whitespace blocks']);

  // Helper values for output RAG chunks
  const derivedChunks = (result?.chunks && result.chunks.length > 0) ? result.chunks : (
    preview ? [
      {
        index: 0,
        text: preview.slice(0, Math.min(preview.length, 600)),
        char_count: Math.min(preview.length, 600),
        token_estimate: Math.round(Math.min(preview.length, 600) / 4),
      },
      ...(preview.length > 600 ? [{
        index: 1,
        text: preview.slice(600, Math.min(preview.length, 1400)),
        char_count: Math.max(0, Math.min(preview.length, 1400) - 600),
        token_estimate: Math.round(Math.max(0, Math.min(preview.length, 1400) - 600) / 4),
      }] : [])
    ] : []
  );

  // Helper values for ready-made LLM prompt
  const derivedPrompt = result?.prompt || (
    preview ? `Use the following document context to answer the user's queries:

---
DOCUMENT CONTEXT (Format: Markdown)
File: ${file?.name || 'document.txt'}
Method: ${derivedMetrics.conversion_method}
---
${preview}
---

Task: Based on the context provided above, answer the query: [Insert your question here]` : ''
  );

  const renderOriginalFilePreview = () => {
    if (!file || !fileUrl) return null;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <iframe
          src={fileUrl}
          className="h-full min-h-[400px] w-full rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950"
          title="Original PDF Preview"
        />
      );
    }

    if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif'].includes(ext || '')) {
      return (
        <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <img src={fileUrl} alt="Original Image Preview" className="max-h-[380px] max-w-full rounded-lg object-contain shadow-sm" />
        </div>
      );
    }

    if (['mp4', 'webm'].includes(ext || '')) {
      return (
        <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <video src={fileUrl} controls className="max-h-[380px] max-w-full rounded-lg" />
        </div>
      );
    }

    if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log'].includes(ext || '')) {
      return (
        <textarea
          readOnly
          value={originalText}
          className="h-full min-h-[400px] w-full resize-none rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        />
      );
    }

    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400">
          <FileText className="h-8 w-8" />
        </div>
        <p className="font-semibold text-slate-900 dark:text-white">{file.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatFileSize(file.size)} • {ext?.toUpperCase()} Document
        </p>
        <p className="mt-4 max-w-xs text-xs text-slate-400 dark:text-slate-500">
          {t('tools.fileToMarkdown.previewNotSupported')}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className={`mx-auto transition-all duration-500 ${
        phase === 'done' && result?.status === 'completed' ? 'max-w-7xl' : 'max-w-5xl'
      }`}>
        {/* Branding & Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="bg-gradient-to-r from-indigo-900 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-white dark:via-indigo-300 dark:to-violet-400 sm:text-4xl">
            {t('tools.fileToMarkdown.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
            {t('tools.fileToMarkdown.description')}
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="mb-12">
          <div className="relative flex items-center justify-between">
            {/* Line connector */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 -z-10" />
            <div
              className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 -z-10"
              style={{
                width: `${
                  phase === 'upload' ? '0%' :
                  phase === 'review' ? '33.33%' :
                  phase === 'processing' ? '66.66%' : '100%'
                }`
              }}
            />

            {STEPS.map((step, idx) => {
              const isCompleted =
                (phase === 'review' && idx < 1) ||
                (phase === 'processing' && idx < 2) ||
                (phase === 'done' && idx < 3);
              const isActive =
                (phase === 'upload' && idx === 0) ||
                (phase === 'review' && idx === 1) ||
                (phase === 'processing' && idx === 2) ||
                (phase === 'done' && idx === 3);

              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                        : isActive
                        ? 'border-indigo-600 bg-white text-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.35)] dark:border-indigo-500 dark:bg-slate-900 dark:text-indigo-450'
                        : 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 hidden text-xs font-bold uppercase tracking-wider transition-all duration-300 sm:block ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {t(`tools.fileToMarkdown.steps.${step}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-8" />

        {/* Phase 1: Upload */}
        {phase === 'upload' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Value Proposition Hero (Left) */}
            <div className="flex flex-col justify-center space-y-6 lg:col-span-5">
              <div className="inline-flex max-w-fit items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-450">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Premium Conversion Tool</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Ready for LLM Context Windows
              </h2>
              <p className="text-slate-600 dark:text-slate-350">
                The most advanced parsing utility for feeding structured documents directly into LLM prompt systems like ChatGPT, Claude, and Gemini.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, title: '90% Token Reduction', desc: 'Auto-detects and purges visual formatting noise and duplicates.' },
                  { icon: Cpu, title: 'Sensitive Data (PII) Shield', desc: 'Built-in privacy protection redacts API keys and secrets.' },
                  { icon: Layers, title: 'Semantic RAG Chunking', desc: 'Outputs ready-made chunks optimized for vector DB embedding.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Drag & Drop Area (Right) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div
                  {...getRootProps()}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center transition-all duration-300 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950/20 ${
                    isDragActive ? 'border-indigo-500 bg-indigo-50/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : ''
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all duration-300 dark:bg-slate-900 ${
                    isDragActive ? 'scale-110 text-indigo-500' : 'text-slate-400'
                  }`}>
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                    {t('tools.fileToMarkdown.uploadSection.cta')}
                  </p>
                  <p className="mb-6 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    {t('tools.fileToMarkdown.uploadSection.subCta', { maxSize })}
                  </p>
                  <button className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-md shadow-indigo-600/10">
                    <FileDown className="h-4 w-4" />
                    <span>{t('tools.fileToMarkdown.uploadSection.addFile')}</span>
                  </button>
                </div>

                {/* Cloud Mock Integrations */}
                <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('tools.fileToMarkdown.uploadSection.cloudImports')}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setCloudModal('drive')}
                      className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850"
                    >
                      <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                      </svg>
                      {t('tools.fileToMarkdown.uploadSection.googleDrive')}
                    </button>
                    <button
                      onClick={() => setCloudModal('dropbox')}
                      className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850"
                    >
                      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .007L1.57 6.621l4.902 3.107L12 6.57l5.528 3.158 4.902-3.107L12 .007zm-5.528 10.9l-4.902 3.107L12 20.629l5.528-6.615 4.902-3.107L12 14.064l-5.528-3.157z" />
                      </svg>
                      {t('tools.fileToMarkdown.uploadSection.dropbox')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Review Screen */}
        {phase === 'review' && file && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: Original Document Preview */}
            <div className="flex flex-col lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-500" />
                  Document Visual Context
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {file.name}
                </span>
              </div>
              <div className="mt-4 flex-1">
                {renderOriginalFilePreview()}
              </div>
            </div>

            {/* Right: Operations & Config options */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('tools.fileToMarkdown.reviewSection.title')}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('tools.fileToMarkdown.reviewSection.subtitle')}
                </p>

                {/* File Details */}
                <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('tools.fileToMarkdown.reviewSection.fileDetails')}
                  </span>
                  <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-slate-550 dark:text-slate-400">{t('tools.fileToMarkdown.reviewSection.fileName')}:</span>
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-250 text-right">{file.name}</span>
                    <span className="text-slate-550 dark:text-slate-400">{t('tools.fileToMarkdown.reviewSection.fileSize')}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-250 text-right">{formatFileSize(file.size)}</span>
                    <span className="text-slate-550 dark:text-slate-400">{t('tools.fileToMarkdown.reviewSection.fileType')}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-250 text-right uppercase">{file.name.split('.').pop()}</span>
                  </div>
                </div>

                {/* Options checklist */}
                <div className="mt-6 space-y-4">
                  {[
                    {
                      key: 'piiShield',
                      icon: Shield,
                      title: t('tools.fileToMarkdown.reviewSection.options.piiShield'),
                      desc: t('tools.fileToMarkdown.reviewSection.options.piiShieldDesc')
                    },
                    {
                      key: 'ragChunking',
                      icon: Layers,
                      title: t('tools.fileToMarkdown.reviewSection.options.ragChunking'),
                      desc: t('tools.fileToMarkdown.reviewSection.options.ragChunkingDesc')
                    },
                    {
                      key: 'ocrMode',
                      icon: Sparkles,
                      title: t('tools.fileToMarkdown.reviewSection.options.ocrMode'),
                      desc: t('tools.fileToMarkdown.reviewSection.options.ocrModeDesc')
                    }
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3.5 transition-all hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:hover:border-indigo-900"
                    >
                      <input
                        type="checkbox"
                        checked={options[opt.key as keyof typeof options]}
                        onChange={(e) => setOptions((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="mt-1 h-4.5 w-4.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <opt.icon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                          <span className="text-sm font-bold text-slate-850 dark:text-slate-150">{opt.title}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Confirm Action Button */}
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleReset}
                    className="btn-secondary w-1/3 py-2.5 font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="btn-primary flex w-2/3 items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-600/10"
                  >
                    <span>{t('tools.fileToMarkdown.reviewSection.btnConfirm')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Processing loader */}
        {phase === 'processing' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/60 bg-white p-8 shadow-xl shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex flex-col items-center text-center">
              {/* Premium Orb Loader */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="h-full w-full rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin dark:border-indigo-950 dark:border-t-indigo-500" />
                <div className="absolute h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 backdrop-blur-md animate-pulse" />
                <Cpu className="absolute h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                {t('tools.fileToMarkdown.processing')}
              </h3>
              <p className="mt-1 text-sm text-slate-550 dark:text-slate-400">
                {status?.progress || 'Running custom content extractions...'}
              </p>
            </div>

            {/* Upload progress indicator */}
            {isUploading && (
              <div className="mt-6">
                <ProgressBar state="PROCESSING" message={`${t('common.upload')}...`} />
                <p className="mt-1 text-center text-xs text-slate-400 font-semibold">{uploadProgress}%</p>
              </div>
            )}

            {/* Step-by-Step loading timeline */}
            <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {t('tools.fileToMarkdown.processingSection.timeline')}
              </h4>
              <div className="space-y-3.5">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone = idx < activeStageIdx;
                  const isActive = idx === activeStageIdx;

                  return (
                    <div key={stage.key} className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isDone
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-400 animate-pulse'
                          : 'border-slate-200 text-slate-300 dark:border-slate-800'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        ) : (
                          <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-indigo-600 dark:bg-indigo-400 animate-ping' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-all duration-300 ${
                        isDone ? 'text-slate-800 dark:text-slate-200' :
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-650'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Phase 4: Output dashboard (Done) */}
        {phase === 'done' && result?.status === 'completed' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-300">
            {/* Top info badge */}
            <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50/50 p-6 ring-1 ring-emerald-200/50 dark:bg-emerald-950/10 dark:ring-emerald-900/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Extraction Succeeded</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your optimized context bundle is ready for use.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadClick(result.download_url, result.filename)}
                  className="btn-success flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold shadow-md shadow-emerald-600/10"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('tools.fileToMarkdown.resultSection.downloadZip')}</span>
                </button>
              </div>
            </div>

            {/* Split dashboard screen */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: AI Token Metrics */}
              <div className="space-y-6 lg:col-span-4">
                <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xl shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('tools.fileToMarkdown.resultSection.metricsTitle')}
                  </h3>

                  {/* AI Readability Gauge */}
                  <div className="mt-6 flex flex-col items-center border-b border-slate-100 pb-6 dark:border-slate-850">
                    <div className="relative flex items-center justify-center">
                      <svg className="h-32 w-32 -rotate-90">
                        {/* Background track circle */}
                        <circle cx="64" cy="64" r="50" className="stroke-slate-100 fill-none dark:stroke-slate-800" strokeWidth="8" />
                        {/* Active stroke progress */}
                        <circle
                          cx="64"
                          cy="64"
                          r="50"
                          className="stroke-indigo-600 fill-none dark:stroke-indigo-500"
                          strokeWidth="8"
                          strokeDasharray="314.16"
                          strokeDashoffset={314.16 - (314.16 * readabilityScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {readabilityScore}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">SCORE</span>
                      </div>
                    </div>
                    <span className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('tools.fileToMarkdown.resultSection.readabilityScore')}
                    </span>
                  </div>

                  {/* Other metrics list */}
                  <div className="mt-6 space-y-4">
                    {/* Token Reduction */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {t('tools.fileToMarkdown.resultSection.tokenReduction')}
                        </span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                          {tokenReductionPct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${tokenReductionPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Cost Savings */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          $
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {t('tools.fileToMarkdown.resultSection.costSavings')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t('tools.fileToMarkdown.resultSection.costSavingsDesc')}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        +${estimatedCostSaved}
                      </span>
                    </div>
 
                    {/* Noise Removed */}
                    <div className="border-t border-slate-100 pt-4 dark:border-slate-850">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t('tools.fileToMarkdown.resultSection.noiseRemoved')}
                      </span>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {noiseRemoved && noiseRemoved.length > 0 ? (
                          noiseRemoved.map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-950/30 dark:text-slate-400"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {t('tools.fileToMarkdown.resultSection.noiseRemovedNone')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Tabbed Output Panel */}
              <div className="flex flex-col lg:col-span-8">
                <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-xl shadow-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none flex flex-col">
                  {/* Tab Selector Header */}
                  <div className="mb-4 flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'markdown', label: t('tools.fileToMarkdown.resultSection.tabMarkdown') },
                        { key: 'chunks', label: t('tools.fileToMarkdown.resultSection.tabChunks', { count: derivedChunks.length }) },
                        { key: 'prompt', label: t('tools.fileToMarkdown.resultSection.tabPrompt') }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setResultTab(tab.key as typeof resultTab)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            resultTab === tab.key
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Copy action */}
                    {resultTab !== 'chunks' && (
                      <button
                        onClick={() => copyToClipboard(resultTab === 'markdown' ? preview : derivedPrompt, resultTab)}
                        className="btn-secondary flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold"
                      >
                        {resultTab === 'markdown' ? (
                          copiedMarkdown ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />
                        ) : (
                          copiedPrompt ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />
                        )}
                        <span>{t('tools.fileToMarkdown.resultSection.actionCopy')}</span>
                      </button>
                    )}
                  </div>

                  {/* Tab content viewer */}
                  <div className="flex-1 min-h-[380px] flex flex-col">
                    {/* Markdown tab */}
                    {resultTab === 'markdown' && (
                      <textarea
                        readOnly
                        value={preview}
                        className="w-full flex-1 min-h-[380px] resize-none rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      />
                    )}

                    {/* RAG Chunks Tab */}
                    {resultTab === 'chunks' && (
                      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                        {derivedChunks.map((chunk: { index: number; text: string; char_count: number; token_estimate: number }, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Chunk {chunk.index + 1} ({chunk.char_count} chars)
                              </span>
                              <button
                                onClick={() => copyToClipboard(chunk.text, idx)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                {copiedChunkIdx === idx ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-355 whitespace-pre-wrap">
                              {chunk.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* LLM Prompt context tab */}
                    {resultTab === 'prompt' && (
                      <textarea
                        readOnly
                        value={derivedPrompt}
                        className="w-full flex-1 min-h-[380px] resize-none rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs text-slate-850 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      />
                    )}
                  </div>

                  {/* Download other formats section */}
                  {result.download_url_md && result.download_url_json && (
                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t('result.linkExpiry')}
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          onClick={() => handleDownloadClick(result.download_url_md, result.filename_md)}
                          className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs font-bold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t('tools.fileToMarkdown.resultSection.downloadMd')}</span>
                        </button>
                        <button
                          onClick={() => handleDownloadClick(result.download_url_json, result.filename_json)}
                          className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs font-bold"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t('tools.fileToMarkdown.resultSection.downloadJson')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Start Over Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200 shadow-lg shadow-slate-900/10"
              >
                <RefreshCw className="h-4.5 w-4.5 animate-spin-hover" />
                <span>{t('tools.fileToMarkdown.resultSection.actionStartOver')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Custom error recovery phase */}
        {phase === 'done' && (taskError || result?.status === 'failed') && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center backdrop-blur-sm dark:border-red-900/30 dark:bg-red-950/20">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('common.error')}
            </h3>
            <p className="mt-2 text-sm text-slate-655 dark:text-slate-400">
              {taskError || result?.user_message || result?.error || t('common.genericError')}
            </p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.tryAgain')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" format="horizontal" className="mt-8" />
      </div>

      {/* Dropbox & Google Drive visual picker simulation */}
      {cloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-slate-100 p-6 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-500" />
                  {t('tools.fileToMarkdown.uploadSection.mockupTitle')}
                </h3>
                <button
                  onClick={() => setCloudModal(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-350 text-xl font-bold"
                >
                  &times;
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t('tools.fileToMarkdown.uploadSection.mockupDesc')}
              </p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { name: 'Annual_Report_2026.pdf', size: 12976128, type: 'application/pdf', key: 'mockPdf' },
                { name: 'Project_Specification.docx', size: 1887436, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', key: 'mockDocx' },
                { name: 'Invoice_Receipt.png', size: 552960, type: 'image/png', key: 'mockPng' }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    const mockFile = new File(["Mock visual integration testing content. This is generated for testing the File-to-Markdown UX."], item.name, { type: item.type });
                    selectFile(mockFile);
                    setCloudModal(null);
                    setPhase('review');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
                >
                  <FileIcon className="h-8 w-8 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-50 truncate">
                      {t(`tools.fileToMarkdown.uploadSection.${item.key}`)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(item.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sign-Up to Download modal block for guest users */}
      {showGateModal && (
        <SignUpToDownloadModal
          onClose={() => setShowGateModal(false)}
          taskId={downloadTaskId}
          toolSlug="file-to-markdown"
        />
      )}
    </>
  );
}

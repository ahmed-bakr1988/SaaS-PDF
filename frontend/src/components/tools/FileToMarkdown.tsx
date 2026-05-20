import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Copy, Check } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';
import { formatFileSize } from '@/utils/textTools';

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

export default function FileToMarkdown() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState('');

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

  const jsonPreview = result ? JSON.stringify(result, null, 2) : '';

  const storeFileEffect = useFileStore((s) => s.file);
  useEffect(() => {
    if (storeFileEffect) {
      selectFile(storeFileEffect);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setPreview('');
    setCopied(false);
    setActiveTab('markdown');
  };

  const handleCopy = async () => {
    const textToCopy = activeTab === 'markdown' ? preview : jsonPreview;
    if (!textToCopy) return;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderOriginalFilePreview = () => {
    if (!file || !fileUrl) return null;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <iframe
          src={fileUrl}
          className="h-[500px] w-full rounded-lg border border-slate-200 dark:border-slate-800"
          title="Original PDF Preview"
        />
      );
    }

    if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp', 'gif'].includes(ext || '')) {
      return (
        <div className="flex h-[500px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <img src={fileUrl} alt="Original Image Preview" className="max-h-full max-w-full object-contain" />
        </div>
      );
    }

    if (['mp4', 'webm'].includes(ext || '')) {
      return (
        <div className="flex h-[500px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <video src={fileUrl} controls className="max-h-full max-w-full" />
        </div>
      );
    }

    if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log'].includes(ext || '')) {
      return (
        <textarea
          readOnly
          value={originalText}
          className="h-[500px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        />
      );
    }

    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <FileText className="mb-3 h-16 w-16 text-slate-400 dark:text-slate-600" />
        <p className="font-semibold text-slate-900 dark:text-white">{file.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatFileSize(file.size)} • {ext?.toUpperCase()} Document
        </p>
        <p className="mt-4 max-w-xs text-xs text-slate-400 dark:text-slate-500">
          {t('tools.fileToMarkdown.previewNotSupported', 'Previews for Office documents are not supported directly in the browser.')}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className={`mx-auto transition-all duration-300 ${
        phase === 'done' && result?.status === 'completed' ? 'max-w-6xl' : 'max-w-3xl'
      }`}>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
            <FileText className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="section-heading">{t('tools.fileToMarkdown.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.fileToMarkdown.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-5">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={ACCEPT_MAP}
              maxSizeMB={maxSize}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel={t('tools.fileToMarkdown.acceptLabel')}
            />

            {file && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-white">{t('tools.fileToMarkdown.outputTitle')}</p>
                <p className="mt-1">{t('tools.fileToMarkdown.outputDesc')}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isUploading ? t('common.uploading') : t('tools.fileToMarkdown.convert')}
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <ProgressBar
            state={status?.state || 'PENDING'}
            message={status?.progress || t('tools.fileToMarkdown.processing')}
          />
        )}

        {phase === 'done' && result?.status === 'completed' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column: Original File Preview */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {t('tools.fileToMarkdown.originalFile', 'Original File')}
                </p>
                <div className="flex-1">
                  {renderOriginalFilePreview()}
                </div>
              </div>

              {/* Right Column: Extracted Content Preview */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('markdown')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'markdown'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      Markdown
                    </button>
                    <button
                      onClick={() => setActiveTab('json')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'json'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                  <button onClick={handleCopy} className="btn-secondary shrink-0 py-1.5 px-3 text-xs flex items-center gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                  </button>
                </div>
                <div className="flex-1 flex flex-col">
                  {activeTab === 'markdown' ? (
                    <textarea
                      readOnly
                      value={preview}
                      className="w-full flex-1 min-h-[456px] resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    />
                  ) : (
                    <textarea
                      readOnly
                      value={jsonPreview}
                      className="w-full flex-1 min-h-[456px] resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    />
                  )}
                </div>
              </div>
            </div>

            <DownloadButton result={result} onStartOver={handleReset} />
          </div>
        )}

        {phase === 'done' && (taskError || result?.status === 'failed') && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {taskError || result?.user_message || result?.error || t('common.genericError')}
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.tryAgain')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" format="horizontal" className="mt-6" />
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MessageSquare } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { dispatchRatingPrompt } from '@/utils/ratingPrompt';

export default function ChatPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState('');

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-ai/chat',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { question },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (r) => {
      setPhase('done');
      setReply(r.reply || '');
      dispatchRatingPrompt('chat-pdf');
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (!question.trim()) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => { reset(); setPhase('upload'); setQuestion(''); setReply(''); };

  const schema = generateToolSchema({
    name: t('tools.chatPdf.title'),
    description: t('tools.chatPdf.description'),
    url: `${window.location.origin}/tools/chat-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.chatPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.chatPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/chat-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="section-heading">{t('tools.chatPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.chatPdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel="PDF (.pdf)"
            />
            {file && !isUploading && (
              <>
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.chatPdf.questionLabel')}
                  </label>
                  <textarea
                    value={question} onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('tools.chatPdf.questionPlaceholder')}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                </div>
                <button onClick={handleUpload} disabled={!question.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('tools.chatPdf.shortDesc')}
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'processing' && !result && (
          <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
        )}

        {phase === 'done' && reply && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('tools.chatPdf.answer')}
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                {reply}
              </div>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        {phase === 'done' && taskError && !reply && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}

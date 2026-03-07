import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { GitBranch } from 'lucide-react';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { startTask, uploadFile } from '@/services/api';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

import type { Procedure, Flowchart, PDFPage, WizardStep } from './pdf-flowchart/types';
import StepProgress from './pdf-flowchart/StepProgress';
import FlowUpload from './pdf-flowchart/FlowUpload';
import ProcedureSelection from './pdf-flowchart/ProcedureSelection';
import DocumentViewer from './pdf-flowchart/DocumentViewer';
import ManualProcedure from './pdf-flowchart/ManualProcedure';
import FlowGeneration from './pdf-flowchart/FlowGeneration';
import FlowChart from './pdf-flowchart/FlowChart';
import FlowChat from './pdf-flowchart/FlowChat';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PdfFlowchart() {
  const { t } = useTranslation();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(0);
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Data
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [rejectedProcedures, setRejectedProcedures] = useState<Procedure[]>([]);
  const [flowcharts, setFlowcharts] = useState<Flowchart[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);

  // Sub-views
  const [viewingProcedure, setViewingProcedure] = useState<Procedure | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [viewingFlow, setViewingFlow] = useState<Flowchart | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Accept file from homepage smart-upload
  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile && storeFile.type === 'application/pdf') {
      setFile(storeFile);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Task polling for extraction
  const { error: taskError } = useTaskPolling({
    taskId,
    onComplete: (res) => {
      if (res?.procedures) {
        setProcedures(res.procedures);
        setFlowcharts((res.flowcharts || []) as unknown as Flowchart[]);
        if (res.pages) setPages(res.pages as unknown as PDFPage[]);
        setStep(1);
        setUploading(false);
      }
    },
    onError: (err) => {
      setError(err || t('common.error'));
      setStep(0);
      setUploading(false);
    },
  });

  // ------ Handlers ------
  const handleFileSelect = (f: File) => {
    if (f.type === 'application/pdf') {
      setFile(f);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const data = await uploadFile('/flowchart/extract', file);
      setTaskId(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setUploading(false);
    }
  };

  const handleTrySample = async () => {
    setUploading(true);
    setError(null);

    try {
      const data = await startTask('/flowchart/extract-sample');
      setTaskId(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sample failed.');
      setUploading(false);
    }
  };

  const handleRejectProcedure = (id: string) => {
    const proc = procedures.find((p) => p.id === id);
    if (!proc) return;
    setProcedures((prev) => prev.filter((p) => p.id !== id));
    setRejectedProcedures((prev) => [...prev, proc]);
  };

  const handleRestoreProcedure = (id: string) => {
    const proc = rejectedProcedures.find((p) => p.id === id);
    if (!proc) return;
    setRejectedProcedures((prev) => prev.filter((p) => p.id !== id));
    setProcedures((prev) => [...prev, proc]);
  };

  const handleContinueToGenerate = (selectedIds: string[]) => {
    setSelectedCount(selectedIds.length);
    // Filter flowcharts to selected procedures
    const ids = new Set(selectedIds);
    const selected = flowcharts.filter((fc) => ids.has(fc.procedureId));
    setFlowcharts(selected);
    setStep(2);
  };

  const handleManualProcedureCreated = (proc: Procedure) => {
    setProcedures((prev) => [...prev, proc]);
    // Generate a simple flowchart for the manual procedure
    const manualFlow: Flowchart = {
      id: `flow-${proc.id}`,
      procedureId: proc.id,
      title: proc.title,
      steps: [
        { id: '1', type: 'start', title: `Begin: ${proc.title.slice(0, 40)}`, description: 'Start of procedure', connections: ['2'] },
        { id: '2', type: 'process', title: proc.description.slice(0, 60) || 'Manual step', description: proc.description.slice(0, 150), connections: ['3'] },
        { id: '3', type: 'end', title: 'Procedure Complete', description: 'End of procedure', connections: [] },
      ],
    };
    setFlowcharts((prev) => [...prev, manualFlow]);
    setAddingManual(false);
  };

  const handleGenerationDone = () => {
    setStep(3);
  };

  const handleFlowUpdate = (updated: Flowchart) => {
    setFlowcharts((prev) => prev.map((fc) => (fc.id === updated.id ? updated : fc)));
    if (viewingFlow?.id === updated.id) setViewingFlow(updated);
  };

  const handleReset = () => {
    setFile(null);
    setStep(0);
    setTaskId(null);
    setError(null);
    setUploading(false);
    setPages([]);
    setProcedures([]);
    setRejectedProcedures([]);
    setFlowcharts([]);
    setSelectedCount(0);
    setViewingProcedure(null);
    setAddingManual(false);
    setViewingFlow(null);
    setChatOpen(false);
  };

  // ------ SEO ------
  const schema = generateToolSchema({
    name: t('tools.pdfFlowchart.title'),
    description: t('tools.pdfFlowchart.description'),
    url: `${window.location.origin}/tools/pdf-flowchart`,
  });

  // === SUB-VIEWS (full-screen overlays) ===
  if (viewingFlow) {
    return (
      <>
        <Helmet>
          <title>{viewingFlow.title} — {t('common.appName')}</title>
        </Helmet>
        <div className="mx-auto max-w-4xl space-y-6">
          <FlowChart
            flow={viewingFlow}
            onBack={() => setViewingFlow(null)}
            onOpenChat={() => setChatOpen(true)}
          />
          {chatOpen && (
            <FlowChat
              flow={viewingFlow}
              onClose={() => setChatOpen(false)}
              onFlowUpdate={handleFlowUpdate}
            />
          )}
        </div>
      </>
    );
  }

  if (viewingProcedure) {
    return (
      <div className="mx-auto max-w-3xl">
        <DocumentViewer
          procedure={viewingProcedure}
          pages={pages}
          onClose={() => setViewingProcedure(null)}
        />
      </div>
    );
  }

  if (addingManual) {
    return (
      <div className="mx-auto max-w-4xl">
        <ManualProcedure
          pages={pages}
          onProcedureCreated={handleManualProcedureCreated}
          onBack={() => setAddingManual(false)}
        />
      </div>
    );
  }

  // === MAIN VIEW ===
  return (
    <>
      <Helmet>
        <title>{t('tools.pdfFlowchart.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfFlowchart.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-flowchart`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
            <GitBranch className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="section-heading">{t('tools.pdfFlowchart.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('tools.pdfFlowchart.description')}
          </p>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={step} className="mb-8" />

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {/* Step 0: Upload */}
        {step === 0 && (
          <FlowUpload
            file={file}
            onFileSelect={handleFileSelect}
            onClearFile={() => setFile(null)}
            onUpload={handleUpload}
            onTrySample={handleTrySample}
            uploading={uploading}
            error={error}
          />
        )}

        {/* Step 1: Select Procedures */}
        {step === 1 && (
          <ProcedureSelection
            procedures={procedures}
            rejectedProcedures={rejectedProcedures}
            pages={pages}
            onContinue={handleContinueToGenerate}
            onManualAdd={() => setAddingManual(true)}
            onReject={handleRejectProcedure}
            onRestore={handleRestoreProcedure}
            onViewProcedure={setViewingProcedure}
            onBack={handleReset}
          />
        )}

        {/* Step 2: Generation */}
        {step === 2 && (
          <FlowGeneration
            flowcharts={flowcharts}
            selectedCount={selectedCount}
            onDone={handleGenerationDone}
          />
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 text-center dark:bg-slate-800 dark:ring-slate-700">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <GitBranch className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {t('tools.pdfFlowchart.flowReady')}
              </h2>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {t('tools.pdfFlowchart.flowReadyCount', { count: flowcharts.length })}
              </p>
            </div>

            {flowcharts.map((flow) => (
              <div
                key={flow.id}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">
                      {flow.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('tools.pdfFlowchart.steps', { count: flow.steps.length })}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingFlow(flow)}
                    className="btn-primary text-sm"
                  >
                    {t('tools.pdfFlowchart.viewFlow')}
                  </button>
                </div>
              </div>
            ))}

            <div className="text-center pt-2">
              <button onClick={handleReset} className="btn-secondary">
                {t('common.startOver')}
              </button>
            </div>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}

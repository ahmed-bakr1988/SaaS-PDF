// Shared types for the PDF Flowchart tool
// -----------------------------------------------------------

export interface PDFPage {
  page: number;
  text: string;
  title?: string;
}

export interface Procedure {
  id: string;
  title: string;
  description: string;
  pages: number[];
  step_count: number;
}

export interface FlowStep {
  id: string;
  type: 'start' | 'process' | 'decision' | 'end';
  title: string;
  description: string;
  connections: string[];
}

export interface Flowchart {
  id: string;
  procedureId: string;
  title: string;
  steps: FlowStep[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** Wizard step index (0-based) */
export type WizardStep = 0 | 1 | 2 | 3;

export const WIZARD_STEPS = [
  { key: 'upload',    labelKey: 'tools.pdfFlowchart.wizard.upload' },
  { key: 'select',    labelKey: 'tools.pdfFlowchart.wizard.select' },
  { key: 'create',    labelKey: 'tools.pdfFlowchart.wizard.create' },
  { key: 'results',   labelKey: 'tools.pdfFlowchart.wizard.results' },
] as const;

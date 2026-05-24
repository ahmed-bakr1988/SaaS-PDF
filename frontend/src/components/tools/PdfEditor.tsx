/**
 * PdfEditor — full-featured visual PDF annotation editor.
 *
 * Uses react-pdf for rendering and Fabric.js for the interactive canvas
 * overlay.  Edits are serialised as percentage-based coordinates and sent
 * to the backend where PyMuPDF applies them to the actual PDF.
 *
 * Reference UI: PDFAid (https://pdfaid.com) — single toolbar + wide preview.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, AlertTriangle, Brush, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Minus,
  MousePointer2,
  PenLine,
  PenTool,
  Pencil,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Canvas,
  Ellipse,
  FabricImage,
  Line,
  PencilBrush,
  Rect,
  Textbox,
  type FabricObject,
} from 'fabric';
import { toast } from 'sonner';

import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import {
  useEditorSessionRecovery,
  hasRecoverableSession as checkRecoverableSession,
  recoverSession,
  clearSession,
  type EditorSessionMeta,
} from '@/hooks/useEditorSessionRecovery';
import { useFileStore } from '@/stores/fileStore';
import api, { type TaskResponse, getTaskErrorMessage } from '@/services/api';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Phase = 'upload' | 'edit' | 'processing' | 'done';
type EditorTool = 'select' | 'draw';

interface PageSize {
  width: number;
  height: number;
}

interface SerializedCanvasObject {
  type?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  src?: string;
  editorKind?: string;
  bgFill?: string;
  bgOpacity?: number;
  linkUrl?: string;
  path?: unknown[];
  rx?: number;
  ry?: number;
}

interface SerializedCanvasState {
  objects?: SerializedCanvasObject[];
}

interface PdfEditOperation {
  type: string;
  page: number;
  x_pct?: number;
  y_pct?: number;
  width_pct?: number;
  height_pct?: number;
  x1_pct?: number;
  y1_pct?: number;
  x2_pct?: number;
  y2_pct?: number;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  opacity?: number;
  fill_opacity?: number;
  text?: string;
  font_size?: number;
  font_family?: string;
  align?: string;
  data_url?: string;
  bg_fill?: string;
  bg_opacity?: number;
  link_url?: string;
  path_data?: string;
}

interface PageHistory {
  undo: string[];
  redo: string[];
}

const CUSTOM_PROPS = ['src', 'editorKind', 'bgFill', 'bgOpacity', 'linkUrl'];
const EMPTY_CANVAS_STATE = JSON.stringify({ objects: [] });
const DEFAULT_FILL = '#2563eb';
const DEFAULT_STROKE = '#1e40af';

/** Clamp a numeric value to the 0–100 percentage range with 4-decimal precision. */
function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(4))));
}

/** Serialise the current Fabric.js canvas state (including custom props) to a JSON string.
 *  IMPORTANT: Fabric.js v6 made toJSON() async. We use toObject() which is synchronous. */
function serializeCanvas(canvas: Canvas | null): string {
  if (!canvas) return EMPTY_CANVAS_STATE;
  return JSON.stringify(canvas.toObject(CUSTOM_PROPS));
}

/** Safely parse a serialised canvas JSON string, returning an empty state on failure. */
function parseSerializedState(raw: string | null | undefined): SerializedCanvasState {
  if (!raw) return { objects: [] };
  try {
    return JSON.parse(raw) as SerializedCanvasState;
  } catch {
    return { objects: [] };
  }
}

/** Convert a Fabric object's absolute position/size into percentage-based coordinates. */
function objectRectPercent(object: SerializedCanvasObject, pageSize: PageSize) {
  const left = Number(object.left ?? 0);
  const top = Number(object.top ?? 0);
  const width = Number((object.width ?? 0) * (object.scaleX ?? 1));
  const height = Number((object.height ?? 0) * (object.scaleY ?? 1));
  return {
    x_pct: clampPercent((left / pageSize.width) * 100),
    y_pct: clampPercent((top / pageSize.height) * 100),
    width_pct: clampPercent((width / pageSize.width) * 100),
    height_pct: clampPercent((height / pageSize.height) * 100),
  };
}

/** Walk all objects in a serialised canvas state and convert them to backend edit operations. */
function collectOperationsFromState(raw: string | null | undefined, page: number, pageSize: PageSize): PdfEditOperation[] {
  const state = parseSerializedState(raw);
  const objects = state.objects ?? [];
  const operations: PdfEditOperation[] = [];

  for (const object of objects) {
    const type = (object.type ?? '').toLowerCase();
    const editorKind = (object.editorKind ?? type).toLowerCase();

    if (type === 'textbox' || type === 'i-text' || type === 'text') {
      const rect = objectRectPercent(object, pageSize);
      const baseText: PdfEditOperation = {
        type: editorKind === 'link' ? 'link' : 'text',
        page,
        ...rect,
        text: object.text ?? '',
        fill: object.fill ?? '#111827',
        opacity: object.opacity ?? 1,
        font_size: object.fontSize ?? 18,
        font_family: object.fontFamily ?? 'Helvetica',
        align: object.textAlign ?? 'left',
      };

      if (editorKind === 'note') {
        baseText.bg_fill = object.bgFill ?? '#fff4b8';
        baseText.bg_opacity = object.bgOpacity ?? 0.95;
      }
      if (editorKind === 'link' && object.linkUrl) {
        baseText.link_url = object.linkUrl;
      }

      operations.push(baseText);
      continue;
    }

    if (type === 'rect') {
      const rect = objectRectPercent(object, pageSize);
      operations.push({
        type: 'rect',
        page,
        ...rect,
        stroke: object.stroke ?? DEFAULT_STROKE,
        fill: object.fill ?? DEFAULT_FILL,
        stroke_width: object.strokeWidth ?? 2,
        opacity: object.opacity ?? 1,
        fill_opacity: object.opacity ?? 0.18,
      });
      continue;
    }

    if (type === 'ellipse') {
      const rect = objectRectPercent(object, pageSize);
      operations.push({
        type: 'ellipse',
        page,
        ...rect,
        stroke: object.stroke ?? DEFAULT_STROKE,
        fill: object.fill ?? DEFAULT_FILL,
        stroke_width: object.strokeWidth ?? 2,
        opacity: object.opacity ?? 1,
        fill_opacity: object.opacity ?? 0.18,
      });
      continue;
    }

    if (type === 'line') {
      operations.push({
        type: editorKind === 'arrow' ? 'arrow' : 'line',
        page,
        x1_pct: clampPercent((Number(object.x1 ?? 0) / pageSize.width) * 100),
        y1_pct: clampPercent((Number(object.y1 ?? 0) / pageSize.height) * 100),
        x2_pct: clampPercent((Number(object.x2 ?? 0) / pageSize.width) * 100),
        y2_pct: clampPercent((Number(object.y2 ?? 0) / pageSize.height) * 100),
        stroke: object.stroke ?? DEFAULT_STROKE,
        stroke_width: object.strokeWidth ?? 3,
        opacity: object.opacity ?? 1,
      });
      continue;
    }

    if (type === 'image' || type === 'fabricimage') {
      if (typeof object.src === 'string' && object.src.startsWith('data:')) {
        const rect = objectRectPercent(object, pageSize);
        operations.push({
          type: 'image',
          page,
          ...rect,
          data_url: object.src,
        });
      }
      continue;
    }

    // Freehand drawing paths — send raw canvas-pixel dims so the backend
    // can set the correct SVG viewBox for coordinate mapping.
    if (type === 'path') {
      const rect = objectRectPercent(object, pageSize);
      const leftPx = Number(object.left ?? 0);
      const topPx = Number(object.top ?? 0);
      const widthPx = Number((object.width ?? 0) * (object.scaleX ?? 1));
      const heightPx = Number((object.height ?? 0) * (object.scaleY ?? 1));
      let pathStr = '';
      if (Array.isArray(object.path)) {
        pathStr = object.path.map((seg: unknown) => {
          if (Array.isArray(seg)) return seg.join(' ');
          return String(seg);
        }).join(' ');
      }
      if (pathStr) {
        operations.push({
          type: 'path',
          page,
          ...rect,
          path_data: pathStr,
          stroke: object.stroke ?? '#111827',
          stroke_width: object.strokeWidth ?? 2,
          opacity: object.opacity ?? 1,
          fill: object.fill ?? '',
          // Canvas-pixel bounding-box metadata for SVG viewBox calculation
          left_px: leftPx,
          top_px: topPx,
          width_px: widthPx,
          height_px: heightPx,
        } as PdfEditOperation);
      }
    }
  }

  return operations;
}

/** Apply consistent selection-handle styling (blue handles, white corners) to a Fabric object. */
function styleEditorObject<T extends FabricObject>(object: T): T {
  object.set({
    borderColor: '#2563eb',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#2563eb',
    transparentCorners: false,
    cornerSize: 10,
    padding: 4,
  });
  return object;
}

/**
 * Synchronise the Fabric.js canvas wrapper and internal canvases so they
 * perfectly overlay the react-pdf rendered page.
 */
function syncFabricOverlay(canvas: Canvas, size: PageSize) {
  const wrapper = canvas.wrapperEl as HTMLDivElement | undefined;
  if (wrapper) {
    wrapper.style.position = 'absolute';
    wrapper.style.inset = '0';
    wrapper.style.width = `${size.width}px`;
    wrapper.style.height = `${size.height}px`;
    wrapper.style.zIndex = '20';
  }

  const lower = canvas.lowerCanvasEl;
  const upper = canvas.upperCanvasEl;
  if (lower) {
    lower.style.position = 'absolute';
    lower.style.inset = '0';
    lower.style.width = `${size.width}px`;
    lower.style.height = `${size.height}px`;
  }
  if (upper) {
    upper.style.position = 'absolute';
    upper.style.inset = '0';
    upper.style.width = `${size.width}px`;
    upper.style.height = `${size.height}px`;
    upper.style.zIndex = '21';
  }
}

/** Create a Fabric Line with a custom arrowhead renderer at the endpoint. */
function buildArrowLine(pageSize: PageSize) {
  const line = new Line(
    [
      pageSize.width * 0.2,
      pageSize.height * 0.3,
      pageSize.width * 0.48,
      pageSize.height * 0.3,
    ],
    {
      stroke: '#dc2626',
      strokeWidth: 3,
      opacity: 1,
      lockRotation: true,
    }
  );

  (line as any).editorKind = 'arrow';
  const originalRender = (line as any)._render.bind(line);
  (line as any)._render = function _renderArrow(ctx: CanvasRenderingContext2D) {
    originalRender(ctx);
    const x1 = this.x1 ?? 0;
    const y1 = this.y1 ?? 0;
    const x2 = this.x2 ?? 0;
    const y2 = this.y2 ?? 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const size = Math.max(10, Number(this.strokeWidth ?? 2) * 4);
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.fillStyle = this.stroke || '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size / 2);
    ctx.lineTo(-size, -size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  return styleEditorObject(line);
}

export default function PdfEditor() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const [phase, setPhase] = useState<Phase>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewWidth, setPreviewWidth] = useState(900);
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  /** Current zoom level as a percentage (50–200). */
  const [zoomLevel, setZoomLevel] = useState(100);
  /** Whether the mobile page-thumbnails drawer is visible. */
  const [showMobilePages, setShowMobilePages] = useState(false);
  /** Whether a recoverable session banner is shown. */
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  /** Metadata of the recoverable session (for display). */
  const [recoveryMeta, setRecoveryMeta] = useState<EditorSessionMeta | null>(null);
  /** Email-send UI state. */
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const pageStatesRef = useRef<Record<number, string>>({});
  const pageSizesRef = useRef<Record<number, PageSize>>({});
  const pageHistoryRef = useRef<Record<number, PageHistory>>({});
  const currentPageRef = useRef(1);
  const isRestoringRef = useRef(false);

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);

  /* ── Session recovery hook — auto-saves & beforeunload guard ── */
  const getCanvasStates = useCallback(() => ({
    pageStates: { ...pageStatesRef.current },
    pageSizes: { ...pageSizesRef.current },
  }), []);

  const { persistNow } = useEditorSessionRecovery({
    isEditing: phase === 'edit',
    file,
    currentPage,
    numPages,
    zoomLevel,
    getCanvasStates,
  });

  /* ── Check for recoverable session on mount ── */
  useEffect(() => {
    if (phase === 'upload' && checkRecoverableSession()) {
      import('@/hooks/useEditorSessionRecovery').then(({ getSessionMeta }) => {
        const meta = getSessionMeta();
        if (meta) {
          setRecoveryMeta(meta);
          setShowRecoveryBanner(true);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Restore a previously saved editing session. */
  const handleRecoverSession = useCallback(async () => {
    const session = await recoverSession();
    if (!session) {
      toast.error(t('tools.pdfEditor.recoveryFailed', 'Could not recover the previous session.'));
      setShowRecoveryBanner(false);
      return;
    }

    // Restore file & PDF URL
    const url = URL.createObjectURL(session.file);
    setFile(session.file);
    setPdfUrl(url);
    setCurrentPage(session.meta.currentPage || 1);
    setZoomLevel(session.meta.zoomLevel || 100);
    setPhase('edit');

    // Restore canvas states
    pageStatesRef.current = session.canvasStates.pageStates || {};
    pageSizesRef.current = session.canvasStates.pageSizes || {};
    pageHistoryRef.current = {};

    setShowRecoveryBanner(false);
    toast.success(t('tools.pdfEditor.sessionRestored', 'Your previous editing session has been restored.'));
  }, [t]);

  /** Dismiss the recovery banner and clear the saved session. */
  const handleDismissRecovery = useCallback(async () => {
    setShowRecoveryBanner(false);
    setRecoveryMeta(null);
    await clearSession();
  }, []);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (storeFile) {
      handleFileSelect(storeFile);
      clearStoreFile();
    }
  }, [storeFile, clearStoreFile]);

  useEffect(() => {
    const updateWidth = () => {
      if (!previewRef.current) return;
      const nextWidth = Math.max(360, Math.min(previewRef.current.clientWidth - 40, 980));
      setPreviewWidth(nextWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (previewRef.current) observer.observe(previewRef.current);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    if (numPages > 0 && currentPage > numPages) {
      setCurrentPage(numPages);
    }
  }, [numPages, currentPage]);

  /* ── Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Ctrl+S) ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'edit') return;
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName ?? '');
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void undoLast();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        void redoLast();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObject) {
          e.preventDefault();
          removeSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedObject]);


  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      fabricCanvasRef.current?.dispose();
    };
  }, [pdfUrl]);

  /** Initialise or retrieve per-page undo/redo history stacks. */
  const ensurePageHistory = (pageNumber: number) => {
    if (!pageHistoryRef.current[pageNumber]) {
      const initial = pageStatesRef.current[pageNumber] ?? EMPTY_CANVAS_STATE;
      pageStatesRef.current[pageNumber] = initial;
      pageHistoryRef.current[pageNumber] = { undo: [initial], redo: [] };
    }
    return pageHistoryRef.current[pageNumber];
  };

  /** Push a canvas snapshot into the current page's undo stack. */
  const pushSnapshotForPage = (pageNumber: number, snapshot: string) => {
    const history = ensurePageHistory(pageNumber);
    if (history.undo[history.undo.length - 1] === snapshot) {
      pageStatesRef.current[pageNumber] = snapshot;
      return;
    }
    history.undo.push(snapshot);
    if (history.undo.length > 80) history.undo.shift();
    history.redo = [];
    pageStatesRef.current[pageNumber] = snapshot;
  };

  /** Restore a previously saved canvas snapshot (for undo/redo). */
  const restoreSnapshot = async (pageNumber: number, snapshot: string) => {
    const canvas = fabricCanvasRef.current;
    const size = pageSizesRef.current[pageNumber] ?? pageSize;
    if (!canvas || !size) return;

    isRestoringRef.current = true;
    await canvas.loadFromJSON(JSON.parse(snapshot));
    syncFabricOverlay(canvas, size);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    pageStatesRef.current[pageNumber] = snapshot;
    setSelectedObject(null);
    isRestoringRef.current = false;
  };

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    if (!canvasElement || !pageSize || phase !== 'edit') return;

    let disposed = false;

    const setup = async () => {
      let canvas = fabricCanvasRef.current;
      if (!canvas) {
        canvas = new Canvas(canvasElement, {
          width: pageSize.width,
          height: pageSize.height,
          preserveObjectStacking: true,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        const syncSelection = () => setSelectedObject(canvas?.getActiveObject() ?? null);
        const persistState = () => {
          if (isRestoringRef.current) return;
          const snapshot = serializeCanvas(canvas);
          pushSnapshotForPage(currentPageRef.current, snapshot);
          syncSelection();
        };

        canvas.on('selection:created', syncSelection);
        canvas.on('selection:updated', syncSelection);
        canvas.on('selection:cleared', () => setSelectedObject(null));
        canvas.on('object:added', persistState);
        canvas.on('object:modified', persistState);
        canvas.on('object:removed', persistState);
        canvas.on('text:changed', persistState);
      }

      canvas.setDimensions({ width: pageSize.width, height: pageSize.height });
      syncFabricOverlay(canvas, pageSize);
      const history = ensurePageHistory(currentPage);
      const snapshot = pageStatesRef.current[currentPage] ?? history.undo[history.undo.length - 1] ?? EMPTY_CANVAS_STATE;
      await restoreSnapshot(currentPage, snapshot);
      if (disposed) return;
      syncFabricOverlay(canvas, pageSize);
    };

    void setup();
    return () => {
      disposed = true;
    };
  }, [currentPage, pageSize, phase]);

  /** Handle file selection: reset all editor state and create an object URL for the PDF. */
  const handleFileSelect = (nextFile: File | null) => {
    setError(null);
    setTaskId(null);
    setNumPages(0);
    setCurrentPage(1);
    setSelectedObject(null);
    setPageSize(null);
    setPdfLoadError(null);
    setTool('select');
    pageStatesRef.current = {};
    pageSizesRef.current = {};
    pageHistoryRef.current = {};

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    setFile(nextFile);
    if (nextFile) {
      setPdfUrl(URL.createObjectURL(nextFile));
      setPhase('edit');
    } else {
      setPhase('upload');
    }
  };

  /** Guard helper — returns the Fabric canvas or shows an error toast.
   *  Also exits drawing mode so shape/text tools work correctly. */
  const ensureCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pageSize) {
      toast.error(t('tools.pdfEditor.previewNotReady', 'Wait for the page preview to finish loading first.'));
      return null;
    }
    // Auto-exit drawing mode when using non-draw tools
    if (canvas.isDrawingMode) {
      canvas.isDrawingMode = false;
      setTool('select');
    }
    return canvas;
  };

  /** Activate freehand drawing mode with PencilBrush. */
  const activateDrawingMode = () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const brush = new PencilBrush(canvas);
    brush.color = '#111827';
    brush.width = 2;
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setTool('draw');
  };

  /** Switch back to select/pointer mode. */
  const activateSelectMode = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.isDrawingMode = false;
      canvas.requestRenderAll();
    }
    setTool('select');
  };

  /** Add a text box (plain text or sticky-note style) to the canvas. */
  const addTextbox = (kind: 'text' | 'note' = 'text') => {
    const canvas = ensureCanvas();
    if (!canvas || !pageSize) return;

    const textbox = new Textbox(
      kind === 'note'
        ? t('tools.pdfEditor.placeholderNote', 'Add your note')
        : t('tools.pdfEditor.placeholderText', 'Edit this text'),
      {
        left: pageSize.width * 0.14,
        top: pageSize.height * 0.16,
        width: pageSize.width * 0.36,
        fontSize: 22,
        fill: kind === 'note' ? '#92400e' : '#111827',
        fontFamily: isRtl ? '"Noto Kufi Arabic", "Amiri", sans-serif' : 'Helvetica',
        editable: true,
        textAlign: isRtl ? 'right' : 'left',
        backgroundColor: kind === 'note' ? '#fff4b8' : undefined,
        lockRotation: true,
      }
    );

    (textbox as any).editorKind = kind;
    if (kind === 'note') {
      (textbox as any).bgFill = '#fff4b8';
      (textbox as any).bgOpacity = 0.95;
    }

    styleEditorObject(textbox);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    textbox.enterEditing();
    textbox.selectAll();
    canvas.requestRenderAll();
  };

  /** Enter inline editing mode on the currently selected text object. */
  const editSelectedText = () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || (active.type ?? '').toLowerCase() !== 'textbox') {
      toast.error(t('tools.pdfEditor.selectTextFirst', 'Select a text element first.'));
      return;
    }

    // Exit drawing mode if active
    if (canvas.isDrawingMode) {
      canvas.isDrawingMode = false;
      setTool('select');
    }

    const textbox = active as Textbox;
    canvas.setActiveObject(textbox);
    textbox.enterEditing();
    textbox.selectAll();
    canvas.requestRenderAll();
  };

  /** Add a rectangle shape to the canvas with configurable fill/stroke. */
  const addRect = (fill = 'rgba(37,99,235,0.16)', stroke = DEFAULT_STROKE) => {
    const canvas = ensureCanvas();
    if (!canvas || !pageSize) return;
    const rect = styleEditorObject(new Rect({
      left: pageSize.width * 0.16,
      top: pageSize.height * 0.2,
      width: pageSize.width * 0.25,
      height: pageSize.height * 0.12,
      fill,
      stroke,
      strokeWidth: 2,
      opacity: 1,
      lockRotation: true,
    }));
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
  };

  /** Add an ellipse shape to the canvas. */
  const addEllipse = () => {
    const canvas = ensureCanvas();
    if (!canvas || !pageSize) return;
    const ellipse = styleEditorObject(new Ellipse({
      left: pageSize.width * 0.18,
      top: pageSize.height * 0.22,
      rx: pageSize.width * 0.12,
      ry: pageSize.height * 0.06,
      fill: 'rgba(16,185,129,0.16)',
      stroke: '#047857',
      strokeWidth: 2,
      opacity: 1,
      lockRotation: true,
    }));
    canvas.add(ellipse);
    canvas.setActiveObject(ellipse);
    canvas.requestRenderAll();
  };

  /** Add a line or arrow to the canvas. */
  const addLine = (kind: 'line' | 'arrow' = 'line') => {
    const canvas = ensureCanvas();
    if (!canvas || !pageSize) return;

    const line = kind === 'arrow'
      ? buildArrowLine(pageSize)
      : styleEditorObject(new Line(
        [pageSize.width * 0.18, pageSize.height * 0.3, pageSize.width * 0.48, pageSize.height * 0.3],
        { stroke: '#dc2626', strokeWidth: 3, opacity: 1, lockRotation: true }
      ));

    (line as any).editorKind = kind;
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.requestRenderAll();
  };

  /** Prompt the user for a URL and label, then insert a clickable link annotation. */
  const promptAndAddLink = () => {
    const canvas = ensureCanvas();
    if (!canvas || !pageSize) return;

    const linkUrl = window.prompt(t('tools.pdfEditor.linkPrompt', 'Enter the link URL'))?.trim();
    if (!linkUrl) return;

    const linkLabel = window.prompt(t('tools.pdfEditor.linkLabelPrompt', 'Link text'), linkUrl)?.trim() || linkUrl;
    const linkText = new Textbox(linkLabel, {
      left: pageSize.width * 0.14,
      top: pageSize.height * 0.18,
      width: pageSize.width * 0.34,
      fontSize: 20,
      fill: '#2563eb',
      fontFamily: isRtl ? '"Noto Kufi Arabic", "Amiri", sans-serif' : 'Helvetica',
      editable: true,
      textAlign: isRtl ? 'right' : 'left',
      underline: true,
      lockRotation: true,
    });

    (linkText as any).editorKind = 'link';
    (linkText as any).linkUrl = linkUrl;
    styleEditorObject(linkText);
    canvas.add(linkText);
    canvas.setActiveObject(linkText);
    canvas.requestRenderAll();
  };

  /** Remove the currently selected Fabric object from the canvas. */
  const removeSelected = () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  /** Undo the last canvas modification on the current page. */
  const undoLast = async () => {
    const history = ensurePageHistory(currentPage);
    if (history.undo.length <= 1) return;
    const currentSnapshot = history.undo.pop();
    if (currentSnapshot) history.redo.push(currentSnapshot);
    const previousSnapshot = history.undo[history.undo.length - 1] ?? EMPTY_CANVAS_STATE;
    await restoreSnapshot(currentPage, previousSnapshot);
  };

  /** Redo the last undone modification on the current page. */
  const redoLast = async () => {
    const history = ensurePageHistory(currentPage);
    if (!history.redo.length) return;
    const snapshot = history.redo.pop()!;
    history.undo.push(snapshot);
    await restoreSnapshot(currentPage, snapshot);
  };

  /** Clear all annotations from the current page. */
  const clearPage = async () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const empty = EMPTY_CANVAS_STATE;
    await restoreSnapshot(currentPage, empty);
    pushSnapshotForPage(currentPage, empty);
  };

  /** Apply a mutation to the currently selected Fabric object and persist the change. */
  const updateSelectedObject = (mutator: (object: FabricObject) => void) => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    mutator(active);
    active.setCoords();
    canvas.requestRenderAll();
    pushSnapshotForPage(currentPage, serializeCanvas(canvas));
    setSelectedObject(active);
  };

  /** Read an image file via FileReader and add it to the canvas as a FabricImage. */
  const addImageFile = async (nextFile: File | null) => {
    if (!nextFile || !pageSize) return;
    const canvas = ensureCanvas();
    if (!canvas) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(nextFile);
    });

    const image = await FabricImage.fromURL(dataUrl);
    image.set({
      left: pageSize.width * 0.18,
      top: pageSize.height * 0.2,
      scaleX: Math.min(1, (pageSize.width * 0.28) / Math.max(1, image.width ?? 1)),
      scaleY: Math.min(1, (pageSize.height * 0.18) / Math.max(1, image.height ?? 1)),
      lockRotation: true,
    });
    (image as any).src = dataUrl;
    styleEditorObject(image);
    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
  };

  /** Switch to a different page, persisting the current page's canvas state. */
  const changePage = (nextPage: number) => {
    if (numPages < 1) return;
    if (nextPage < 1 || nextPage > numPages) return;
    pageStatesRef.current[currentPage] = serializeCanvas(fabricCanvasRef.current);
    setCurrentPage(nextPage);
    setSelectedObject(null);
    // Persist session on page change so recovery captures all pages
    void persistNow();
  };

  /** Collect all edits across all pages, serialise them, and submit to the backend. */
  const handleSave = async () => {
    if (!file) return;

    // Exit drawing mode to finalize any in-progress strokes
    const canvas = fabricCanvasRef.current;
    if (canvas?.isDrawingMode) {
      canvas.isDrawingMode = false;
      setTool('select');
    }

    pageStatesRef.current[currentPage] = serializeCanvas(fabricCanvasRef.current);

    const operations: PdfEditOperation[] = [];
    for (const [pageNumberText, state] of Object.entries(pageStatesRef.current)) {
      const pageNumber = Number(pageNumberText);
      const thisPageSize = pageSizesRef.current[pageNumber];
      if (!thisPageSize) continue;
      operations.push(...collectOperationsFromState(state, pageNumber, thisPageSize));
    }

    // Empty save checking removed to allow saving without edits

    setError(null);
    setPhase('processing');
    // Clear the recovery session — we are submitting edits to the backend now
    void clearSession();
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('edits', JSON.stringify(operations));

      const res = await api.post<TaskResponse>('/pdf-editor/edit', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = getTaskErrorMessage(err, t('tools.pdfEditor.processingFailed', 'Failed to save the edited PDF.'));
      setError(msg);
      toast.error(msg);
      setPhase('edit');
    }
  };

  /** Reset the editor back to the upload phase. */
  const handleReset = () => {
    void clearSession();
    setEmailAddress('');
    setEmailSent(false);
    setEmailError(null);
    handleFileSelect(null);
  };

  /** Send the completed PDF to the user-supplied email address. */
  const handleSendEmail = async () => {
    if (!result?.download_url) return;
    const trimmed = emailAddress.trim();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setEmailError(t('tools.pdfEditor.invalidEmail', 'Please enter a valid email address.'));
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    try {
      // Fetch the PDF blob from the download URL, then post it to the email endpoint.
      const pdfBlob = await fetch(result.download_url).then((r) => r.blob());
      const fd = new FormData();
      fd.append('file', pdfBlob, result.filename ?? 'edited.pdf');
      fd.append('email', trimmed);
      fd.append('filename', result.filename ?? 'edited.pdf');
      await api.post('/pdf-editor/email', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEmailSent(true);
      toast.success(t('tools.pdfEditor.emailSent', 'PDF sent to {{email}}!', { email: trimmed }));
    } catch {
      const msg = t('tools.pdfEditor.emailFailed', 'Could not send the email. Please try downloading instead.');
      setEmailError(msg);
      toast.error(msg);
    } finally {
      setEmailSending(false);
    }
  };

  /** Adjust zoom level by a delta, clamped to 50–200%. */
  const adjustZoom = useCallback((delta: number) => {
    setZoomLevel((prev) => Math.max(50, Math.min(200, prev + delta)));
  }, []);

  /** Effective preview width after applying zoom. */
  const effectivePreviewWidth = Math.round(previewWidth * (zoomLevel / 100));

  const selectedFill = String(selectedObject?.get('fill') ?? '#111827');
  const selectedStroke = String(selectedObject?.get('stroke') ?? DEFAULT_STROKE);
  const selectedStrokeWidth = Number(selectedObject?.get('strokeWidth') ?? 2);
  const selectedFontSize = Number(selectedObject?.get('fontSize') ?? 22);
  const canUndo = (pageHistoryRef.current[currentPage]?.undo.length ?? 0) > 1;
  const canRedo = (pageHistoryRef.current[currentPage]?.redo.length ?? 0) > 0;

  return (
    <>
      <Helmet>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30">
            <Pencil className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="section-heading">{t('tools.pdfEditor.title', 'Edit PDF')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('tools.pdfEditor.description', 'Open a PDF, add text, images and shapes visually, then save the edited file online.')}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.pdfEditor.trustVisual', 'Visual editing for notes, text, links, and signatures')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.pdfEditor.trustRecover', 'Session recovery enabled')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.pdfEditor.trustAsync', 'Saving runs asynchronously')}</span>
          </div>
        </div>
        {/* ═══ SESSION RECOVERY BANNER ═══ */}
        {showRecoveryBanner && recoveryMeta && phase === 'upload' && (
          <div className="mx-auto mb-6 max-w-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg dark:border-amber-800/50 dark:from-amber-950/40 dark:to-orange-950/30">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjQ1LDE1OCwxMSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {t('tools.pdfEditor.unsavedSession', 'Unsaved editing session found')}
                  </h3>
                  <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
                    {t('tools.pdfEditor.recoveryDescription', 'You were editing "{{fileName}}" ({{pages}} pages). Would you like to continue where you left off?', {
                      fileName: recoveryMeta.fileName,
                      pages: recoveryMeta.numPages,
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-600/60 dark:text-amber-400/50">
                    {t('tools.pdfEditor.recoverySavedAt', 'Last saved: {{time}}', {
                      time: new Date(recoveryMeta.savedAt).toLocaleString(),
                    })}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecoverSession}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.97]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('tools.pdfEditor.restoreSession', 'Restore session')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissRecovery}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                    >
                      {t('tools.pdfEditor.discardSession', 'Discard')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'upload' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20}
              acceptLabel="PDF (.pdf)"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{t('tools.pdfEditor.stepUpload', '1. Upload your PDF')}</p>
                <p className="mt-2">{t('tools.pdfEditor.stepUploadDesc', 'Open the file in the browser and start editing without waiting for background processing first.')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{t('tools.pdfEditor.stepAnnotate', '2. Add text, notes, images, or signatures')}</p>
                <p className="mt-2">{t('tools.pdfEditor.stepAnnotateDesc', 'Best for overlays, annotations, links, highlights, and signing workflows.')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">{t('tools.pdfEditor.stepSave', '3. Save a fresh edited PDF')}</p>
                <p className="mt-2">{t('tools.pdfEditor.stepSaveDesc', 'When you are done, Dociva generates a new PDF file in the processing queue.')}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="font-semibold">{t('tools.pdfEditor.scannedDocsTitle', 'Working with a scanned PDF?')}</p>
              <p className="mt-1">{t('tools.pdfEditor.scannedDocsDesc', 'If the document is a scan, OCR will usually give better results before editing text-heavy pages.')}</p>
              <Link to="/tools/ocr" className="mt-3 inline-flex text-sm font-semibold text-amber-700 underline dark:text-amber-300">
                {t('tools.pdfEditor.goToOcr', 'Open OCR tool')}
              </Link>
            </div>
          </div>
        )}

        {phase === 'edit' && pdfUrl && (
          <div className="flex flex-col">
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900 dark:border-sky-800/50 dark:bg-sky-900/20 dark:text-sky-100">
              <p className="font-semibold">{t('tools.pdfEditor.editHintTitle', 'Best fit for this editor')}</p>
              <p className="mt-1">{t('tools.pdfEditor.editHintDesc', 'Use this editor to add or place content visually: text, notes, signatures, links, shapes, highlights, and images. For scanned documents, run OCR first if you need text extraction.')}</p>
            </div>

            {/* ═══ ACTION BAR ═══ */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-4 sm:py-2.5">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleReset} className="btn-secondary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm" title={t('common.startOver')}>
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  <span className="hidden sm:inline">{t('common.startOver')}</span>
                </button>
                <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                <button type="button" onClick={undoLast} disabled={!canUndo} className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm" title="Ctrl+Z">
                  <Undo2 className="h-4 w-4 rtl:rotate-180" />
                  <span className="hidden md:inline">{t('tools.pdfEditor.undo', 'Undo')}</span>
                </button>
                <button type="button" onClick={redoLast} disabled={!canRedo} className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm" title="Ctrl+Y">
                  <Redo2 className="h-4 w-4 rtl:rotate-180" />
                  <span className="hidden md:inline">{t('tools.pdfEditor.redo', 'Redo')}</span>
                </button>
                <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                <button type="button" onClick={removeSelected} className="btn-secondary px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" title="Delete">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden md:inline">{t('tools.pdfEditor.deleteSelected', 'Delete')}</span>
                </button>
              </div>
              <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.97]" title="Ctrl+S">
                <Save className="h-4 w-4" />
                {t('tools.pdfEditor.confirm', 'Done')}
              </button>
            </div>

            <div className="border border-t-0 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {/* ═══ TOOLBAR — scrollable with grouped tools ═══ */}
              <div className="overflow-x-auto border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
                <div className="flex items-center gap-1 min-w-max">
                  {/* ── Text tools ── */}
                  <button type="button" onClick={activateSelectMode} title={t('tools.pdfEditor.select', 'Select')} className={`flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium transition ${tool === 'select' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-800' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                    <MousePointer2 className="h-5 w-5" /><span>{t('tools.pdfEditor.select', 'Select')}</span>
                  </button>
                  <button type="button" onClick={() => addTextbox()} title={t('tools.pdfEditor.addText', 'Text')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Type className="h-5 w-5" /><span>{t('tools.pdfEditor.addText', 'Text')}</span>
                  </button>
                  <button type="button" onClick={editSelectedText} title={t('tools.pdfEditor.editText', 'Edit text')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <PenLine className="h-5 w-5" /><span>{t('tools.pdfEditor.editText', 'Edit text')}</span>
                  </button>

                  <div className="mx-1 h-10 w-px bg-slate-200 dark:bg-slate-700" />

                  {/* ── Freehand drawing ── */}
                  <button type="button" onClick={activateDrawingMode} title={t('tools.pdfEditor.draw', 'Draw')} className={`flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium transition ${tool === 'draw' ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-300 dark:bg-violet-900/20 dark:text-violet-200 dark:ring-violet-800' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                    <Brush className="h-5 w-5" /><span>{t('tools.pdfEditor.draw', 'Draw')}</span>
                  </button>

                  {/* ── Drawing tools ── */}
                  <button type="button" onClick={() => signatureInputRef.current?.click()} title={t('tools.pdfEditor.addSignature', 'Signature')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <PenTool className="h-5 w-5" /><span>{t('tools.pdfEditor.addSignature', 'Sign')}</span>
                  </button>
                  <button type="button" onClick={() => addLine('line')} title={t('tools.pdfEditor.addLine', 'Line')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Minus className="h-5 w-5" /><span>{t('tools.pdfEditor.addLine', 'Line')}</span>
                  </button>
                  <button type="button" onClick={() => addLine('arrow')} title={t('tools.pdfEditor.addArrow', 'Arrow')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <ArrowRight className="h-5 w-5 rtl:rotate-180" /><span>{t('tools.pdfEditor.addArrow', 'Arrow')}</span>
                  </button>

                  <div className="mx-1 h-10 w-px bg-slate-200 dark:bg-slate-700" />

                  {/* ── Shape tools ── */}
                  <button type="button" onClick={() => addRect()} title={t('tools.pdfEditor.addRect', 'Rectangle')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Square className="h-5 w-5" /><span>{t('tools.pdfEditor.addRect', 'Rect')}</span>
                  </button>
                  <button type="button" onClick={addEllipse} title={t('tools.pdfEditor.addEllipse', 'Ellipse')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Circle className="h-5 w-5" /><span>{t('tools.pdfEditor.addEllipse', 'Ellipse')}</span>
                  </button>

                  <div className="mx-1 h-10 w-px bg-slate-200 dark:bg-slate-700" />

                  {/* ── Annotation tools ── */}
                  <button type="button" onClick={() => addRect('rgba(250,204,21,0.35)', '#ca8a04')} title={t('tools.pdfEditor.highlight', 'Highlight')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Highlighter className="h-5 w-5" /><span>{t('tools.pdfEditor.highlight', 'Highlight')}</span>
                  </button>
                  <button type="button" onClick={() => addRect('#ffffff', '#ffffff')} title={t('tools.pdfEditor.whiteout', 'Whiteout')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Eraser className="h-5 w-5" /><span>{t('tools.pdfEditor.whiteout', 'Whiteout')}</span>
                  </button>

                  <div className="mx-1 h-10 w-px bg-slate-200 dark:bg-slate-700" />

                  {/* ── Insert tools ── */}
                  <button type="button" onClick={() => addTextbox('note')} title={t('tools.pdfEditor.addNote', 'Note')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <MessageSquare className="h-5 w-5" /><span>{t('tools.pdfEditor.addNote', 'Note')}</span>
                  </button>
                  <button type="button" onClick={promptAndAddLink} title={t('tools.pdfEditor.addLink', 'Link')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Link2 className="h-5 w-5" /><span>{t('tools.pdfEditor.addLink', 'Link')}</span>
                  </button>
                  <button type="button" onClick={() => imageInputRef.current?.click()} title={t('tools.pdfEditor.addImage', 'Image')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <ImageIcon className="h-5 w-5" /><span>{t('tools.pdfEditor.addImage', 'Image')}</span>
                  </button>
                </div>
              </div>

              {/* ═══ PROPERTIES BAR — only when an object is selected ═══ */}
              {selectedObject && (
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>{t('tools.pdfEditor.fillColor', 'Fill')}</span>
                  <input type="color" value={selectedFill.startsWith('#') ? selectedFill : '#2563eb'} onChange={(event) => updateSelectedObject((object) => object.set('fill', event.target.value))} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>{t('tools.pdfEditor.strokeColor', 'Stroke')}</span>
                  <input type="color" value={selectedStroke.startsWith('#') ? selectedStroke : '#1e40af'} onChange={(event) => updateSelectedObject((object) => object.set('stroke', event.target.value))} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>{t('tools.pdfEditor.strokeWidth', 'Width')}</span>
                  <input type="range" min={1} max={12} step={1} value={selectedStrokeWidth} onChange={(event) => updateSelectedObject((object) => object.set('strokeWidth', Number(event.target.value)))} className="w-20 accent-primary-600" />
                  <span className="w-5 text-xs text-slate-500">{selectedStrokeWidth}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>{t('tools.pdfEditor.fontSize', 'Font')}</span>
                  <input type="range" min={10} max={72} step={1} value={selectedFontSize} onChange={(event) => updateSelectedObject((object) => object.set('fontSize', Number(event.target.value)))} className="w-20 accent-primary-600" />
                  <span className="w-5 text-xs text-slate-500">{selectedFontSize}</span>
                </label>
              </div>
              )}

              {/* ═══ ZOOM CONTROLS ═══ */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => adjustZoom(-10)} disabled={zoomLevel <= 50} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800" title="Zoom out"><ZoomOut className="h-4 w-4" /></button>
                  <span className="min-w-[3rem] text-center text-xs font-medium text-slate-600 dark:text-slate-300">{zoomLevel}%</span>
                  <button type="button" onClick={() => adjustZoom(10)} disabled={zoomLevel >= 200} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800" title="Zoom in"><ZoomIn className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => setShowMobilePages((v) => !v)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800" title="Pages">
                  <Square className="h-4 w-4" />
                </button>
              </div>

              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void addImageFile(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
              <input ref={signatureInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void addImageFile(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />

              <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] lg:min-h-[720px]">
                {/* ═══ SIDEBAR — page thumbnails (hidden on mobile) ═══ */}
                <aside className="hidden border-e border-slate-200 bg-slate-50 p-3 md:block dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('tools.pdfEditor.pagesPanel', 'Pages')}</p>
                    <button type="button" onClick={clearPage} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">{t('tools.pdfEditor.clearPage', 'Clear')}</button>
                  </div>
                  <div className="max-h-[640px] space-y-3 overflow-y-auto pe-1">
                    <Document key={`thumbs-${pdfUrl}`} file={pdfUrl}>
                      {Array.from({ length: numPages || 0 }, (_, index) => {
                        const pageNumber = index + 1;
                        const isActive = currentPage === pageNumber;
                        return (
                          <button key={`thumb-${pageNumber}`} type="button" onClick={() => changePage(pageNumber)} className={`block w-full rounded-xl border p-1.5 text-center transition ${isActive ? 'border-primary-400 bg-white shadow dark:border-primary-500 dark:bg-slate-900' : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60'}`}>
                            <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
                              <Page pageNumber={pageNumber} width={136} renderTextLayer={false} renderAnnotationLayer={false} />
                            </div>
                            <span className={`mt-1.5 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{pageNumber}</span>
                          </button>
                        );
                      })}
                    </Document>
                  </div>
                </aside>

                {/* ═══ PREVIEW AREA ═══ */}
                <section className="relative flex flex-col bg-[#f0f4f8] dark:bg-slate-900/70">
                  <div ref={previewRef} className="flex-1 overflow-auto p-3 sm:p-5">
                    <div className="mx-auto w-fit">
                      <div className="relative mx-auto w-fit rounded-lg bg-white shadow-lg dark:bg-slate-800">
                        <Document
                          key={`main-${pdfUrl}`}
                          file={pdfUrl}
                          onLoadSuccess={({ numPages: totalPages }) => {
                            setNumPages(totalPages);
                            setPdfLoadError(null);
                            if (currentPage > totalPages) setCurrentPage(totalPages || 1);
                          }}
                          onLoadError={(err) => {
                            setPdfLoadError(err instanceof Error ? err.message : String(err));
                          }}
                        >
                          {pdfLoadError ? (
                            <div className="flex min-h-[360px] items-center justify-center rounded-lg bg-red-50 p-8 text-center dark:bg-red-900/20">
                              <div>
                                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                                  {t('tools.pdfEditor.previewFailed', 'Could not preview this PDF.')}
                                </p>
                                <p className="mt-1 text-xs text-red-600/70 dark:text-red-300/50">
                                  {pdfLoadError}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Page
                              key={`page-${currentPage}-${effectivePreviewWidth}`}
                              pageNumber={currentPage}
                              width={effectivePreviewWidth}
                              onLoadSuccess={(pageProxy) => {
                                const viewport = pageProxy.getViewport({ scale: 1 });
                                const scale = effectivePreviewWidth / viewport.width;
                                const nextPageSize = { width: effectivePreviewWidth, height: viewport.height * scale };
                                pageSizesRef.current[currentPage] = nextPageSize;
                                setPageSize(nextPageSize);
                              }}
                            />
                          )}
                        </Document>

                        {pageSize && (
                          <canvas ref={canvasElementRef} width={pageSize.width} height={pageSize.height} className="absolute inset-0 z-20 h-full w-full" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Floating page navigator ── */}
                  <div className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-slate-200 bg-white/90 px-4 py-2 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
                    <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1} className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
                      <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                    </button>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('tools.pdfEditor.pageCounter', 'Page {{current}} of {{total}}', { current: currentPage, total: numPages || 1 })}
                    </span>
                    <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= numPages} className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </button>
                  </div>
                </section>
              </div>

              {/* ═══ MOBILE PAGE STRIP ═══ */}
              {showMobilePages && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 md:hidden dark:border-slate-700 dark:bg-slate-950/30">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <Document key={`mobile-thumbs-${pdfUrl}`} file={pdfUrl}>
                    {Array.from({ length: numPages || 0 }, (_, index) => {
                      const pageNumber = index + 1;
                      const isActive = currentPage === pageNumber;
                      return (
                        <button key={`mt-${pageNumber}`} type="button" onClick={() => { changePage(pageNumber); setShowMobilePages(false); }} className={`flex-shrink-0 rounded-lg border p-1 transition ${isActive ? 'border-primary-400 shadow' : 'border-slate-200 dark:border-slate-700'}`}>
                          <Page pageNumber={pageNumber} width={80} renderTextLayer={false} renderAnnotationLayer={false} />
                        </button>
                      );
                    })}
                  </Document>
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {phase === 'processing' && !result && (
          <div className="mx-auto max-w-2xl space-y-3">
            <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('tools.pdfEditor.applyingChangesSub', 'Applying your visual edits and generating a new PDF file.')}
            </p>
          </div>
        )}

        {phase === 'done' && result && result.status === 'completed' && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* ── Success header ── */}
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/40 dark:to-teal-950/30">
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    {t('tools.pdfEditor.doneTitle', 'Your PDF is ready!')}
                  </h2>
                  <p className="mt-0.5 text-sm text-emerald-700/80 dark:text-emerald-300/70">
                    {t('tools.pdfEditor.doneStats', '{{edits}} edits applied across {{pages}} page(s)', {
                      edits: result.edits_applied ?? 0,
                      pages: result.page_count ?? 1,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Download button ── */}
            <DownloadButton result={result} onStartOver={handleReset} />

            {/* ── Send via email ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t('tools.pdfEditor.sendByEmail', 'Send to email')}
                </h3>
              </div>
              {emailSent ? (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {t('tools.pdfEditor.emailSentConfirm', 'PDF sent to {{email}}!', { email: emailAddress })}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      id="pdf-email-input"
                      type="email"
                      value={emailAddress}
                      onChange={(e) => { setEmailAddress(e.target.value); setEmailError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleSendEmail(); }}
                      placeholder={t('tools.pdfEditor.emailPlaceholder', 'your@email.com')}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30"
                      disabled={emailSending}
                      autoComplete="email"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendEmail()}
                      disabled={emailSending || !emailAddress.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {emailSending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Mail className="h-4 w-4" />}
                      {emailSending
                        ? t('tools.pdfEditor.sending', 'Sending…')
                        : t('tools.pdfEditor.send', 'Send')}
                    </button>
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{emailError}</p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t('tools.pdfEditor.emailNote', 'The PDF will be sent as an email attachment.')}
                  </p>
                </div>
              )}
            </div>

            {/* ── Edit again ── */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('tools.pdfEditor.editAnotherFile', 'Edit another PDF')}
            </button>
          </div>
        )}

        {((phase === 'done' && (taskError || error)) || (phase === 'edit' && error)) && (
          <div className="mx-auto mt-4 max-w-2xl space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                {typeof taskError === 'string' ? taskError : error}
              </p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}      </div>
    </>
  );
}

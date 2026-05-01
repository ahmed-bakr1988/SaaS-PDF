/**
 * PdfEditor — full-featured visual PDF annotation editor.
 *
 * Uses react-pdf for rendering and Fabric.js for the interactive canvas
 * overlay.  Edits are serialised as percentage-based coordinates and sent
 * to the backend where PyMuPDF applies them to the actual PDF.
 *
 * Reference UI: PDFAid (https://pdfaid.com) — single toolbar + wide preview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
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
import {
  Canvas,
  Ellipse,
  FabricImage,
  Line,
  Rect,
  Textbox,
  type FabricObject,
} from 'fabric';
import { toast } from 'sonner';

import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import api, { type TaskResponse, getTaskErrorMessage } from '@/services/api';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Phase = 'upload' | 'edit' | 'processing' | 'done';
type EditorTool = 'select';

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

/** Serialise the current Fabric.js canvas state (including custom props) to a JSON string. */
function serializeCanvas(canvas: Canvas | null): string {
  if (!canvas) return EMPTY_CANVAS_STATE;
  return JSON.stringify((canvas as any).toJSON(CUSTOM_PROPS));
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
    const type = object.type ?? '';
    const editorKind = object.editorKind ?? type;

    if (type === 'textbox') {
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

    if (type === 'image' && typeof object.src === 'string' && object.src.startsWith('data:')) {
      const rect = objectRectPercent(object, pageSize);
      operations.push({
        type: 'image',
        page,
        ...rect,
        data_url: object.src,
      });
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
  const [tool, setTool] = useState<EditorTool>('select');
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  /** Current zoom level as a percentage (50–200). */
  const [zoomLevel, setZoomLevel] = useState(100);
  /** Whether the mobile page-thumbnails drawer is visible. */
  const [showMobilePages, setShowMobilePages] = useState(false);

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

  const schema = useMemo(() => generateToolSchema({
    name: t('tools.pdfEditor.title', 'Edit PDF'),
    description: t('tools.pdfEditor.description', 'Open a PDF, add text, images and shapes visually, then save the edited file online.'),
    url: `${window.location.origin}/tools/pdf-editor`,
  }), [t]);

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

  /** Guard helper — returns the Fabric canvas or shows an error toast. */
  const ensureCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pageSize) {
      toast.error(t('tools.pdfEditor.previewNotReady', 'Wait for the page preview to finish loading first.'));
      return null;
    }
    return canvas;
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
    if (!active || active.type !== 'textbox') {
      toast.error(t('tools.pdfEditor.selectTextFirst', 'Select a text element first.'));
      return;
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
  };

  /** Collect all edits across all pages, serialise them, and submit to the backend. */
  const handleSave = async () => {
    if (!file) return;
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
    handleFileSelect(null);
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
        <title>{t('tools.pdfEditor.title', 'Edit PDF')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfEditor.description', 'Open a PDF, add text, images and shapes visually, then save the edited file online.')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-editor`} />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
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
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20}
              acceptLabel="PDF (.pdf)"
            />
          </div>
        )}

        {phase === 'edit' && pdfUrl && (
          <div className="flex flex-col">
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
                  <button type="button" onClick={() => setTool('select')} title={t('tools.pdfEditor.select', 'Select')} className={`flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium transition ${tool === 'select' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-800' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                    <MousePointer2 className="h-5 w-5" /><span>{t('tools.pdfEditor.select', 'Select')}</span>
                  </button>
                  <button type="button" onClick={() => addTextbox()} title={t('tools.pdfEditor.addText', 'Text')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Type className="h-5 w-5" /><span>{t('tools.pdfEditor.addText', 'Text')}</span>
                  </button>
                  <button type="button" onClick={editSelectedText} title={t('tools.pdfEditor.editText', 'Edit text')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <PenLine className="h-5 w-5" /><span>{t('tools.pdfEditor.editText', 'Edit text')}</span>
                  </button>

                  <div className="mx-1 h-10 w-px bg-slate-200 dark:bg-slate-700" />

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
                  <button type="button" onClick={() => addRect('#ffffff', '#e2e8f0')} title={t('tools.pdfEditor.whiteout', 'Whiteout')} className="flex flex-col min-w-[60px] items-center gap-1 rounded-xl p-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
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
                            if (currentPage > totalPages) setCurrentPage(totalPages || 1);
                          }}
                        >
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
          <div className="mx-auto max-w-2xl space-y-4">
            <DownloadButton result={result} onStartOver={handleReset} />
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
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}

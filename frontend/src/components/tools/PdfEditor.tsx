import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
// Replaced lucide-react icons with inline SVG-based icons for a
// more professional and customizable appearance.
// import {
//   ArrowRight,
//   ChevronLeft,
//   ChevronRight,
//   Circle,
//   Eraser,
//   FileImage,
//   Highlighter,
//   ImagePlus,
//   Link2,
//   MessageSquare,
//   Minus,
//   MousePointer2,
//   PenLine,
//   PenTool,
//   Pencil,
//   Redo2,
//   RotateCcw,
//   Save,
//   Square,
//   Trash2,
//   Type,
//   Undo2,
// } from 'lucide-react';
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

// Inline SVG Icon set to replace lucide-react icons for a more
// polished and consistent visual language across the editor.
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const common = {
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  } as any;

  switch (name) {
    case 'save':
      return (
        <svg {...common} className={className}>
          <path d="M5 7h7l3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a0 0 0 0 0 0z" />
          <path d="M9 3h6v4H9z" />
        </svg>
      );
    case 'undo':
      return (
        <svg {...common} className={className}>
          <path d="M9 14H5a2 2 0 0 1-2-2V4" />
          <path d="M9 10L4 15L9 20" />
        </svg>
      );
    case 'redo':
      return (
        <svg {...common} className={className}>
          <path d="M15 14h4a2 2 0 0 0 2-2V4" />
          <path d="M15 10l5-5l-5-5" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common} className={className}>
          <path d="M3 6h18" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    case 'select':
      return (
        <svg {...common} className={className}>
          <path d="M3 11l6-6l6 6" />
          <path d="M9 5v14" />
        </svg>
      );
    case 'text':
      return (
        <svg {...common} className={className}>
          <path d="M4 7h16" />
          <path d="M7 7v10" />
          <path d="M13 7v10" />
          <path d="M19 7v10" />
        </svg>
      );
    case 'link':
      return (
        <svg {...common} className={className}>
          <path d="M10 13a5 5 0 0 1-7 0l-1-1a5 5 0 0 1 0-7l2-2" />
          <path d="M14 11a5 5 0 0 1 7 0l1 1a5 5 0 0 1 0 7l-2 2" />
        </svg>
      );
    case 'image':
      return (
        <svg {...common} className={className}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9l4-4l4 4l4-4l4 4" />
          <circle cx="8.5" cy="13.5" r="1.5" />
        </svg>
      );
    case 'line':
      return (
        <svg {...common} className={className}>
          <path d="M5 12h14" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg {...common} className={className}>
          <path d="M15 6L9 12l6 6" />
        </svg>
      );
    case 'arrowRight':
      return (
        <svg {...common} className={className}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'square':
      return (
        <svg {...common} className={className}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case 'circle':
      return (
        <svg {...common} className={className}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
    case 'highlighter':
      return (
        <svg {...common} className={className}>
          <path d="M3 21l6-6l3 3l-6 6H3z" />
          <path d="M15 9l6-6l0 0" />
        </svg>
      );
    case 'eraser':
      return (
        <svg {...common} className={className}>
          <path d="M3 21l4-4l11-11l4 4L7 21H3z" />
        </svg>
      );
    case 'note':
      return (
        <svg {...common} className={className}>
          <path d="M4 7h10v4H4z" />
          <path d="M14 7l6 6l-6 6l-4-4l4-4" />
        </svg>
      );
    case 'pencil':
      return (
        <svg {...common} className={className}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common} className={className} />
      );
  }
};

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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(4))));
}

function serializeCanvas(canvas: Canvas | null): string {
  if (!canvas) return EMPTY_CANVAS_STATE;
  return JSON.stringify((canvas as any).toJSON(CUSTOM_PROPS));
}

function parseSerializedState(raw: string | null | undefined): SerializedCanvasState {
  if (!raw) return { objects: [] };
  try {
    return JSON.parse(raw) as SerializedCanvasState;
  } catch {
    return { objects: [] };
  }
}

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

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      fabricCanvasRef.current?.dispose();
    };
  }, [pdfUrl]);

  const ensurePageHistory = (pageNumber: number) => {
    if (!pageHistoryRef.current[pageNumber]) {
      const initial = pageStatesRef.current[pageNumber] ?? EMPTY_CANVAS_STATE;
      pageStatesRef.current[pageNumber] = initial;
      pageHistoryRef.current[pageNumber] = { undo: [initial], redo: [] };
    }
    return pageHistoryRef.current[pageNumber];
  };

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

  const ensureCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pageSize) {
      toast.error(t('tools.pdfEditor.previewNotReady', 'Wait for the page preview to finish loading first.'));
      return null;
    }
    return canvas;
  };

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
        fontFamily: 'Helvetica',
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
      fontFamily: 'Helvetica',
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

  const removeSelected = () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  const undoLast = async () => {
    const history = ensurePageHistory(currentPage);
    if (history.undo.length <= 1) return;
    const currentSnapshot = history.undo.pop();
    if (currentSnapshot) history.redo.push(currentSnapshot);
    const previousSnapshot = history.undo[history.undo.length - 1] ?? EMPTY_CANVAS_STATE;
    await restoreSnapshot(currentPage, previousSnapshot);
  };

  const redoLast = async () => {
    const history = ensurePageHistory(currentPage);
    if (!history.redo.length) return;
    const snapshot = history.redo.pop()!;
    history.undo.push(snapshot);
    await restoreSnapshot(currentPage, snapshot);
  };

  const clearPage = async () => {
    const canvas = ensureCanvas();
    if (!canvas) return;
    const empty = EMPTY_CANVAS_STATE;
    await restoreSnapshot(currentPage, empty);
    pushSnapshotForPage(currentPage, empty);
  };

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

  const changePage = (nextPage: number) => {
    if (numPages < 1) return;
    if (nextPage < 1 || nextPage > numPages) return;
    pageStatesRef.current[currentPage] = serializeCanvas(fabricCanvasRef.current);
    setCurrentPage(nextPage);
    setSelectedObject(null);
  };

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

    if (!operations.length) {
      toast.error(t('tools.pdfEditor.noEdits', 'Add at least one item before saving the edited PDF.'));
      return;
    }

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

  const handleReset = () => {
    handleFileSelect(null);
  };

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
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30">
            <Icon name="pencil" className="h-8 w-8 text-rose-600 dark:text-rose-400" />
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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
                  <Icon name="save" className="h-4 w-4" />
                  {t('tools.pdfEditor.confirm', 'Done')}
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary px-4 py-2">
                  <Icon name="arrowLeft" className="h-4 w-4" />
                  {t('common.startOver')}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={undoLast} disabled={!canUndo} className="btn-secondary px-4 py-2 disabled:opacity-50">
                  <Icon name="undo" className="h-4 w-4" />
                  {t('tools.pdfEditor.undo', 'Undo')}
                </button>
                <button type="button" onClick={redoLast} disabled={!canRedo} className="btn-secondary px-4 py-2 disabled:opacity-50">
                  <Icon name="redo" className="h-4 w-4" />
                  {t('tools.pdfEditor.redo', 'Redo')}
                </button>
                <button type="button" onClick={removeSelected} className="btn-secondary px-4 py-2">
                  <Icon name="trash" className="h-4 w-4" />
                  {t('tools.pdfEditor.deleteSelected', 'Delete selected')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setTool('select')} className={`inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${tool === 'select' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900/40' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700'}`}>
                    <Icon name="select" className="h-4 w-4" />
                    {t('tools.pdfEditor.select', 'Select')}
                  </button>
                  <button type="button" onClick={() => addTextbox()} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="text" className="h-4 w-4" />{t('tools.pdfEditor.addText', 'Text')}</button>
                  <button type="button" onClick={editSelectedText} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="pencil" className="h-4 w-4" />{t('tools.pdfEditor.editText', 'Edit text')}</button>
                  <button type="button" onClick={() => signatureInputRef.current?.click()} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="pencil" className="h-4 w-4" />{t('tools.pdfEditor.addSignature', 'Signature')}</button>
                  <button type="button" onClick={() => addLine('line')} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="line" className="h-4 w-4" />{t('tools.pdfEditor.addLine', 'Line')}</button>
                  <button type="button" onClick={() => addLine('arrow')} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="arrowRight" className="h-4 w-4" />{t('tools.pdfEditor.addArrow', 'Arrow')}</button>
                  <button type="button" onClick={() => addRect()} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="square" className="h-4 w-4" />{t('tools.pdfEditor.addRect', 'Rectangle')}</button>
                  <button type="button" onClick={addEllipse} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="circle" className="h-4 w-4" />{t('tools.pdfEditor.addEllipse', 'Ellipse')}</button>
                  <button type="button" onClick={() => addRect('rgba(250,204,21,0.35)', '#ca8a04')} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="highlighter" className="h-4 w-4" />{t('tools.pdfEditor.highlight', 'Highlight')}</button>
                  <button type="button" onClick={() => addRect('#ffffff', '#e2e8f0')} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="eraser" className="h-4 w-4" />{t('tools.pdfEditor.whiteout', 'Whiteout')}</button>
                  <button type="button" onClick={() => addTextbox('note')} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="note" className="h-4 w-4" />{t('tools.pdfEditor.addNote', 'Note')}</button>
                  <button type="button" onClick={promptAndAddLink} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="link" className="h-4 w-4" />{t('tools.pdfEditor.addLink', 'Link')}</button>
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex min-w-[100px] items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"><Icon name="image" className="h-4 w-4" />{t('tools.pdfEditor.addImage', 'Image')}</button>
                </div>
              </div>

              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('tools.pdfEditor.fillColor', 'Fill color')}</span>
                    <input type="color" value={selectedFill.startsWith('#') ? selectedFill : '#2563eb'} onChange={(event) => updateSelectedObject((object) => object.set('fill', event.target.value))} className="h-9 w-11 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('tools.pdfEditor.strokeColor', 'Stroke color')}</span>
                    <input type="color" value={selectedStroke.startsWith('#') ? selectedStroke : '#1e40af'} onChange={(event) => updateSelectedObject((object) => object.set('stroke', event.target.value))} className="h-9 w-11 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('tools.pdfEditor.strokeWidth', 'Stroke width')}</span>
                    <input type="range" min={1} max={12} step={1} value={selectedStrokeWidth} onChange={(event) => updateSelectedObject((object) => object.set('strokeWidth', Number(event.target.value)))} className="w-28" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>{t('tools.pdfEditor.fontSize', 'Font size')}</span>
                    <input type="range" min={10} max={48} step={1} value={selectedFontSize} onChange={(event) => updateSelectedObject((object) => object.set('fontSize', Number(event.target.value)))} className="w-28" />
                  </label>
                </div>
              </div>

              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void addImageFile(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />
              <input ref={signatureInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void addImageFile(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} />

              <div className="grid min-h-[720px] grid-cols-[180px_minmax(0,1fr)]">
                <aside className="border-e border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('tools.pdfEditor.pagesPanel', 'Pages')}</p>
                    <button type="button" onClick={clearPage} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">{t('tools.pdfEditor.clearPage', 'Clear page')}</button>
                  </div>
                  <div className="max-h-[640px] space-y-3 overflow-y-auto pe-1">
                    <Document key={`thumbs-${pdfUrl}`} file={pdfUrl}>
                      {Array.from({ length: numPages || 0 }, (_, index) => {
                        const pageNumber = index + 1;
                        const isActive = currentPage === pageNumber;
                        return (
                          <button
                            key={`thumb-${pageNumber}`}
                            type="button"
                            onClick={() => changePage(pageNumber)}
                            className={`block w-full rounded-2xl border p-2 text-center transition ${isActive ? 'border-red-400 bg-white shadow-sm dark:border-red-500 dark:bg-slate-900' : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600'}`}
                          >
                            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
                              <Page pageNumber={pageNumber} width={136} renderTextLayer={false} renderAnnotationLayer={false} />
                            </div>
                            <span className={`mt-2 inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${isActive ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                              {pageNumber}
                            </span>
                          </button>
                        );
                      })}
                    </Document>
                  </div>
                </aside>

                <section className="space-y-4 bg-[#eef2f8] p-4 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                    <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1} className="btn-secondary px-4 py-2 disabled:opacity-50">
                      <Icon name="arrowLeft" className="h-4 w-4" />
                      {t('tools.pdfEditor.previousPage', 'Previous')}
                    </button>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('tools.pdfEditor.pageCounter', 'Page {{current}} of {{total}}', { current: currentPage, total: numPages || 1 })}
                    </p>
                    <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= numPages} className="btn-secondary px-4 py-2 disabled:opacity-50">
                      {t('tools.pdfEditor.nextPage', 'Next')}
                      <Icon name="arrowRight" className="h-4 w-4" />
                    </button>
                  </div>

                  <div ref={previewRef} className="rounded-[28px] bg-[#dde4f0] p-5 dark:bg-slate-950/70">
                    <div className="mx-auto overflow-auto rounded-[24px] bg-transparent p-2">
                      <div className="relative mx-auto w-fit">
                        <Document
                          key={`main-${pdfUrl}`}
                          file={pdfUrl}
                          onLoadSuccess={({ numPages: totalPages }) => {
                            setNumPages(totalPages);
                            if (currentPage > totalPages) setCurrentPage(totalPages || 1);
                          }}
                        >
                          <Page
                            key={`page-${currentPage}-${previewWidth}`}
                            pageNumber={currentPage}
                            width={previewWidth}
                            onLoadSuccess={(pageProxy) => {
                              const viewport = pageProxy.getViewport({ scale: 1 });
                              const scale = previewWidth / viewport.width;
                              const nextPageSize = {
                                width: previewWidth,
                                height: viewport.height * scale,
                              };
                              pageSizesRef.current[currentPage] = nextPageSize;
                              setPageSize(nextPageSize);
                            }}
                          />
                        </Document>

                        {pageSize && (
                          <canvas
                            ref={canvasElementRef}
                            width={pageSize.width}
                            height={pageSize.height}
                            className="absolute inset-0 z-20 h-full w-full"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
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

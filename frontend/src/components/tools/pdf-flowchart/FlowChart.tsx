import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Square,
  Diamond,
  Circle,
  ArrowDown,
  ChevronLeft,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import type { Flowchart, FlowStep } from './types';

interface FlowChartProps {
  flow: Flowchart;
  onBack: () => void;
  onOpenChat: () => void;
}

// Node colour helpers
const getNodeStyle = (type: FlowStep['type']) => {
  switch (type) {
    case 'start':
      return { bg: 'bg-green-100 border-green-400', text: 'text-green-800', icon: <Play className="h-4 w-4" /> };
    case 'end':
      return { bg: 'bg-red-100 border-red-400', text: 'text-red-800', icon: <Circle className="h-4 w-4" /> };
    case 'process':
      return { bg: 'bg-blue-100 border-blue-400', text: 'text-blue-800', icon: <Square className="h-4 w-4" /> };
    case 'decision':
      return { bg: 'bg-amber-100 border-amber-400', text: 'text-amber-800', icon: <Diamond className="h-4 w-4" /> };
    default:
      return { bg: 'bg-slate-100 border-slate-400', text: 'text-slate-800', icon: <Circle className="h-4 w-4" /> };
  }
};

export default function FlowChartView({ flow, onBack, onOpenChat }: FlowChartProps) {
  const { t } = useTranslation();
  const chartRef = useRef<HTMLDivElement>(null);

  // ---------- Export PNG ----------
  const exportPng = useCallback(async () => {
    const el = chartRef.current;
    if (!el) return;

    try {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = el.scrollWidth * scale;
      canvas.height = el.scrollHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${el.scrollWidth}" height="${el.scrollHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">${el.outerHTML}</div>
          </foreignObject>
        </svg>`;

      const img = new window.Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob((b) => {
            if (!b) return reject();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = `flowchart-${flow.title.slice(0, 30)}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
            resolve();
          }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch {
      // Fallback — JSON export
      const a = document.createElement('a');
      const json = JSON.stringify(flow, null, 2);
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `flowchart-${flow.title.slice(0, 30)}.json`;
      a.click();
    }
  }, [flow]);

  // ---------- Export SVG ----------
  const exportSvg = useCallback(() => {
    const nodeH = 90;
    const arrowH = 40;
    const padding = 40;
    const nodeW = 320;
    const totalH = flow.steps.length * (nodeH + arrowH) - arrowH + padding * 2;
    const totalW = nodeW + padding * 2;

    const typeColors: Record<string, { fill: string; stroke: string }> = {
      start:    { fill: '#dcfce7', stroke: '#4ade80' },
      process:  { fill: '#dbeafe', stroke: '#60a5fa' },
      decision: { fill: '#fef3c7', stroke: '#fbbf24' },
      end:      { fill: '#fee2e2', stroke: '#f87171' },
    };

    let svgParts = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" font-family="system-ui,sans-serif">`;
    svgParts += `<rect width="${totalW}" height="${totalH}" fill="#fff"/>`;

    flow.steps.forEach((step, idx) => {
      const x = padding;
      const y = padding + idx * (nodeH + arrowH);
      const colors = typeColors[step.type] || typeColors.process;

      svgParts += `<rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="12" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
      svgParts += `<text x="${x + 12}" y="${y + 22}" font-size="11" font-weight="600" fill="#64748b">${step.type.toUpperCase()}</text>`;
      svgParts += `<text x="${x + 12}" y="${y + 44}" font-size="14" font-weight="700" fill="#1e293b">${escapeXml(step.title.slice(0, 45))}</text>`;
      if (step.description !== step.title) {
        svgParts += `<text x="${x + 12}" y="${y + 64}" font-size="11" fill="#64748b">${escapeXml(step.description.slice(0, 60))}</text>`;
      }

      // Arrow
      if (idx < flow.steps.length - 1) {
        const ax = x + nodeW / 2;
        const ay = y + nodeH;
        svgParts += `<line x1="${ax}" y1="${ay + 4}" x2="${ax}" y2="${ay + arrowH - 4}" stroke="#cbd5e1" stroke-width="2"/>`;
        svgParts += `<polygon points="${ax - 5},${ay + arrowH - 10} ${ax + 5},${ay + arrowH - 10} ${ax},${ay + arrowH - 2}" fill="#94a3b8"/>`;
      }
    });

    svgParts += '</svg>';

    const blob = new Blob([svgParts], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flowchart-${flow.title.slice(0, 30)}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [flow]);

  // Decision / Process / Start / End counts
  const stats = {
    total: flow.steps.length,
    decisions: flow.steps.filter((s) => s.type === 'decision').length,
    processes: flow.steps.filter((s) => s.type === 'process').length,
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('tools.pdfFlowchart.backToList')}
        </button>
        <div className="flex gap-2">
          <button onClick={onOpenChat} className="btn-secondary text-sm">
            💬 {t('tools.pdfFlowchart.aiAssistant')}
          </button>
          <button onClick={exportPng} className="btn-secondary text-sm">
            <ImageIcon className="h-4 w-4" />
            PNG
          </button>
          <button onClick={exportSvg} className="btn-secondary text-sm">
            <Download className="h-4 w-4" />
            SVG
          </button>
        </div>
      </div>

      <h2 className="section-heading mb-6 text-center">{flow.title}</h2>

      {/* The chart */}
      <div
        ref={chartRef}
        className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      >
        {/* SVG canvas for connection lines */}
        <div className="relative">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ zIndex: 1 }}
          >
            <defs>
              <marker
                id="flowArrow"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
                className="text-slate-400"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
          </svg>

          <div className="relative flex flex-col items-center gap-0" style={{ zIndex: 2 }}>
            {flow.steps.map((step, idx) => {
              const style = getNodeStyle(step.type);
              const isLast = idx === flow.steps.length - 1;
              const hasMultipleConnections = step.connections.length > 1;

              return (
                <div key={step.id} className="flex w-full max-w-md flex-col items-center">
                  {/* Node */}
                  <div
                    className={`w-full rounded-xl border-2 p-4 ${style.bg} ${style.text} transition-shadow hover:shadow-md`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      {style.icon}
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {step.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-base">{step.title}</h4>
                    {step.description !== step.title && (
                      <p className="mt-1 text-sm opacity-80">{step.description}</p>
                    )}
                  </div>

                  {/* Arrow / connector */}
                  {!isLast && (
                    <div className="flex flex-col items-center py-1 text-slate-400">
                      <div className="h-3 w-px bg-slate-300" />
                      {hasMultipleConnections ? (
                        <div className="flex items-center gap-6 text-xs text-slate-500">
                          <span>Yes ↓</span>
                          <span>No ↓</span>
                        </div>
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                      <div className="h-2 w-px bg-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 flex justify-center gap-8 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700">
          <div className="text-center">
            <div className="font-bold text-slate-700 dark:text-slate-200">{stats.total}</div>
            <div className="text-xs">{t('tools.pdfFlowchart.totalSteps')}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-700 dark:text-slate-200">{stats.decisions}</div>
            <div className="text-xs">{t('tools.pdfFlowchart.decisionPoints')}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-700 dark:text-slate-200">{stats.processes}</div>
            <div className="text-xs">{t('tools.pdfFlowchart.processSteps')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { UploadCloud } from 'lucide-react';
import type { ToolOption } from '@/utils/fileRouting';

const ToolSelectorModal = lazy(() => import('@/components/shared/ToolSelectorModal'));

export default function FloatingUploadButton() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [matchedTools, setMatchedTools] = useState<ToolOption[]>([]);
  const [fileTypeLabel, setFileTypeLabel] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { getToolsForFile, detectFileCategory, getCategoryLabel } = await import('@/utils/fileRouting');
    const tools = getToolsForFile(file);

    if (tools.length === 0) return;

    const category = detectFileCategory(file);
    const label = getCategoryLabel(category);

    setSelectedFile(file);
    setMatchedTools(tools);
    setFileTypeLabel(label);
    setModalOpen(true);

    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedFile(null);
    setMatchedTools([]);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Upload file"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-300 transition-all hover:shadow-xl hover:shadow-primary-400 active:scale-95 md:hidden dark:shadow-primary-900/40 dark:hover:shadow-primary-800/60 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <UploadCloud className="h-6 w-6" />
        {/* Subtle pulse ring */}
        <span className="absolute inset-0 rounded-full bg-primary-400 opacity-0 animate-ping" style={{ animationDuration: '3s' }} />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.mov"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Suspense fallback={null}>
        <ToolSelectorModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          file={selectedFile}
          tools={matchedTools}
          fileTypeLabel={fileTypeLabel}
        />
      </Suspense>
    </>
  );
}

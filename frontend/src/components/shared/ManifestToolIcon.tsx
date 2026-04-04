import {
  ArrowUpDown,
  Barcode,
  Code,
  Crop,
  Droplets,
  Eraser,
  FileDown,
  FileImage,
  FileOutput,
  FileText,
  Film,
  GitBranch,
  Hash,
  Image,
  ImageIcon,
  Languages,
  Layers,
  ListOrdered,
  Lock,
  MessageSquare,
  Minimize2,
  PenLine,
  Presentation,
  QrCode,
  RotateCw,
  ScanText,
  Scaling,
  Scissors,
  Sheet,
  Table,
  Unlock,
  Wrench,
} from 'lucide-react';

const ICON_MAP = {
  ArrowUpDown,
  Barcode,
  Code,
  Crop,
  Droplets,
  Eraser,
  FileDown,
  FileImage,
  FileOutput,
  FileText,
  Film,
  GitBranch,
  Hash,
  Image,
  ImageIcon,
  Languages,
  Layers,
  ListOrdered,
  Lock,
  MessageSquare,
  Minimize2,
  PenLine,
  Presentation,
  QrCode,
  RotateCw,
  ScanText,
  Scaling,
  Scissors,
  Sheet,
  Table,
  Unlock,
  Wrench,
} as const;

interface ManifestToolIconProps {
  iconName: string;
  className?: string;
}

export default function ManifestToolIcon({
  iconName,
  className = 'h-6 w-6',
}: ManifestToolIconProps) {
  const Icon = ICON_MAP[iconName as keyof typeof ICON_MAP] ?? FileText;
  return <Icon className={className} />;
}
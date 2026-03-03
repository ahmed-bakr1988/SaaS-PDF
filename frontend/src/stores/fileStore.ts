import { create } from 'zustand';

interface FileStoreState {
  /** File passed from the homepage smart upload zone */
  file: File | null;
  /** Store a file for cross-route transfer */
  setFile: (file: File) => void;
  /** Clear the stored file after consumption */
  clearFile: () => void;
}

/**
 * Zustand store for transferring a File object between routes.
 * Used by the homepage HeroUploadZone → tool page flow.
 *
 * File objects cannot be serialized through React Router state,
 * so we use an in-memory store instead.
 */
export const useFileStore = create<FileStoreState>((set) => ({
  file: null,
  setFile: (file) => set({ file }),
  clearFile: () => set({ file: null }),
}));

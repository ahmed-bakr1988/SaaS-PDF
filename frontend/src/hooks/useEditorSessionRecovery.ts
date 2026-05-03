z/**
 * useEditorSessionRecovery — Persist and recover PDF editor sessions.
 *
 * Uses IndexedDB for binary file storage (File objects can be large)
 * and localStorage for canvas state snapshots (JSON, typically small).
 *
 * This hook enables the editor to survive:
 * - Accidental page reload (F5 / Ctrl+R)
 * - Browser tab crash
 * - Accidental navigation away
 * - Browser back/forward navigation
 */
import { useCallback, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════
 *  Constants
 * ═══════════════════════════════════════════════════════════════════ */

const DB_NAME = 'dociva_editor_sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const LS_KEY_CANVAS_STATES = 'dociva_editor_canvas_states';
const LS_KEY_SESSION_META = 'dociva_editor_session_meta';
/** Maximum session age before auto-cleanup (24 hours). */
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

/* ═══════════════════════════════════════════════════════════════════
 *  Types
 * ═══════════════════════════════════════════════════════════════════ */

export interface EditorSessionMeta {
  /** ISO timestamp of the session creation / last update */
  savedAt: string;
  /** Original file name for UI display */
  fileName: string;
  /** Original file size in bytes */
  fileSize: number;
  /** Number of pages in the PDF */
  numPages: number;
  /** Last active page number */
  currentPage: number;
  /** Zoom level */
  zoomLevel: number;
}

export interface EditorCanvasStates {
  /** Serialised Fabric.js canvas state per page number */
  pageStates: Record<number, string>;
  /** Page dimensions for each page */
  pageSizes: Record<number, { width: number; height: number }>;
}

export interface RecoveredSession {
  file: File;
  meta: EditorSessionMeta;
  canvasStates: EditorCanvasStates;
}

/* ═══════════════════════════════════════════════════════════════════
 *  IndexedDB helpers (for binary file storage)
 * ═══════════════════════════════════════════════════════════════════ */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/* ═══════════════════════════════════════════════════════════════════
 *  localStorage helpers (for canvas state JSON)
 * ═══════════════════════════════════════════════════════════════════ */

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — silently fail; the file is the critical part
  }
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/* ═══════════════════════════════════════════════════════════════════
 *  Public API
 * ═══════════════════════════════════════════════════════════════════ */

/**
 * Save the current editor session (file + canvas states) for recovery.
 */
export async function saveSession(
  file: File,
  meta: Omit<EditorSessionMeta, 'savedAt' | 'fileName' | 'fileSize'>,
  canvasStates: EditorCanvasStates
): Promise<void> {
  const fullMeta: EditorSessionMeta = {
    ...meta,
    savedAt: new Date().toISOString(),
    fileName: file.name,
    fileSize: file.size,
  };

  // Store binary file in IndexedDB
  await idbPut('editor_file', file);

  // Store lightweight state in localStorage
  lsSet(LS_KEY_SESSION_META, fullMeta);
  lsSet(LS_KEY_CANVAS_STATES, canvasStates);
}

/**
 * Check if a recoverable session exists.
 */
export function hasRecoverableSession(): boolean {
  const meta = lsGet<EditorSessionMeta>(LS_KEY_SESSION_META);
  if (!meta?.savedAt) return false;

  // Check if session is too old
  const age = Date.now() - new Date(meta.savedAt).getTime();
  if (age > MAX_SESSION_AGE_MS) {
    // Auto-cleanup stale session
    void clearSession();
    return false;
  }

  return true;
}

/**
 * Get session metadata without loading the full file (for UI display).
 */
export function getSessionMeta(): EditorSessionMeta | null {
  return lsGet<EditorSessionMeta>(LS_KEY_SESSION_META);
}

/**
 * Recover a saved session (file + canvas states).
 */
export async function recoverSession(): Promise<RecoveredSession | null> {
  try {
    const meta = lsGet<EditorSessionMeta>(LS_KEY_SESSION_META);
    const canvasStates = lsGet<EditorCanvasStates>(LS_KEY_CANVAS_STATES);
    if (!meta || !canvasStates) return null;

    // Check age
    const age = Date.now() - new Date(meta.savedAt).getTime();
    if (age > MAX_SESSION_AGE_MS) {
      await clearSession();
      return null;
    }

    const file = await idbGet<File>('editor_file');
    if (!file) return null;

    return { file, meta, canvasStates };
  } catch {
    // Recovery failed — clear corrupt data
    await clearSession();
    return null;
  }
}

/**
 * Clear all saved session data.
 */
export async function clearSession(): Promise<void> {
  try {
    await idbDelete('editor_file');
  } catch {
    // Ignore IDB errors during cleanup
  }
  lsRemove(LS_KEY_SESSION_META);
  lsRemove(LS_KEY_CANVAS_STATES);
}

/* ═══════════════════════════════════════════════════════════════════
 *  React Hook
 * ═══════════════════════════════════════════════════════════════════ */

interface UseEditorSessionRecoveryOptions {
  /** Whether the editor is currently in 'edit' phase */
  isEditing: boolean;
  /** The current file being edited */
  file: File | null;
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  numPages: number;
  /** Current zoom level */
  zoomLevel: number;
  /** Get the latest canvas states (avoids stale closures) */
  getCanvasStates: () => EditorCanvasStates;
}

/**
 * Hook that automatically persists the editor session at intervals
 * and on page unload events. Also sets up the `beforeunload` guard.
 *
 * @returns Methods to manually trigger save/clear and check for recovery.
 */
export function useEditorSessionRecovery({
  isEditing,
  file,
  currentPage,
  numPages,
  zoomLevel,
  getCanvasStates,
}: UseEditorSessionRecoveryOptions) {
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isEditingRef = useRef(isEditing);
  const fileRef = useRef(file);
  const currentPageRef = useRef(currentPage);
  const numPagesRef = useRef(numPages);
  const zoomLevelRef = useRef(zoomLevel);
  const getCanvasStatesRef = useRef(getCanvasStates);

  // Keep refs in sync
  isEditingRef.current = isEditing;
  fileRef.current = file;
  currentPageRef.current = currentPage;
  numPagesRef.current = numPages;
  zoomLevelRef.current = zoomLevel;
  getCanvasStatesRef.current = getCanvasStates;

  /** Persist the current session state. */
  const persistNow = useCallback(async () => {
    const currentFile = fileRef.current;
    if (!isEditingRef.current || !currentFile) return;

    try {
      await saveSession(
        currentFile,
        {
          currentPage: currentPageRef.current,
          numPages: numPagesRef.current,
          zoomLevel: zoomLevelRef.current,
        },
        getCanvasStatesRef.current()
      );
    } catch {
      // Silently fail — don't disrupt the user
    }
  }, []);

  // ── Auto-save at intervals while editing ──
  useEffect(() => {
    if (!isEditing || !file) {
      // Clear timer if not editing
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      return;
    }

    // Save immediately when entering edit mode
    void persistNow();

    // Then save every 30 seconds
    saveTimerRef.current = setInterval(() => {
      void persistNow();
    }, 30_000);

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isEditing, file, persistNow]);

  // ── beforeunload guard — warn user about unsaved work ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isEditingRef.current) return;

      // Persist session one final time before leaving
      // (Note: async save may not complete, but localStorage part will)
      const currentFile = fileRef.current;
      if (currentFile) {
        const canvasStates = getCanvasStatesRef.current();
        const meta: EditorSessionMeta = {
          savedAt: new Date().toISOString(),
          fileName: currentFile.name,
          fileSize: currentFile.size,
          currentPage: currentPageRef.current,
          numPages: numPagesRef.current,
          zoomLevel: zoomLevelRef.current,
        };
        lsSet(LS_KEY_SESSION_META, meta);
        lsSet(LS_KEY_CANVAS_STATES, canvasStates);
      }

      // Show browser confirmation dialog
      e.preventDefault();
      // Most modern browsers ignore custom messages, but we set it for legacy support
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── visibilitychange — save when tab becomes hidden ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isEditingRef.current) {
        void persistNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [persistNow]);

  return {
    persistNow,
    clearSession,
    hasRecoverableSession,
    getSessionMeta,
    recoverSession,
  };
}

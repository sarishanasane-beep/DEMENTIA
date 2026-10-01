// ============================================================
// MediaStorageService — IndexedDB-based media persistence
// ============================================================
// Stores uploaded photos and audio files in IndexedDB.
// Object URLs are created only for rendering, never as identifiers.
//
// Production note: a real deployment would use encrypted object
// storage or another protected storage mechanism.
// ============================================================

const DB_NAME = 'smartmind_media';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredMedia {
  id: string;
  blob: Blob;
  type: string;       // MIME type
  name: string;       // original filename
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a file to IndexedDB. Returns a unique mediaId.
 */
export async function saveMedia(file: File): Promise<string> {
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredMedia = {
      id,
      blob: file,
      type: file.type,
      name: file.name,
      createdAt: new Date().toISOString(),
    };
    store.put(record);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Retrieve a stored file. Returns a Blob or null if not found.
 */
export async function getMedia(mediaId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(mediaId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.blob || null);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/**
 * Create an object URL from stored media. Caller must revoke when done.
 * Returns null if media not found.
 */
export async function getMediaUrl(mediaId: string): Promise<string | null> {
  const blob = await getMedia(mediaId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Check if media exists in storage.
 */
export async function hasMedia(mediaId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count(mediaId);
    request.onsuccess = () => { db.close(); resolve(request.result > 0); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/**
 * Delete media from storage.
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(mediaId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

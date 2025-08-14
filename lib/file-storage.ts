import { getSupabaseClient } from '@/lib/supabaseClient';
import type { EncryptedFileMeta } from '@/lib/file-crypto';

function getBucket(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'encrypted-files';
}

function generateObjectPath(filename?: string): string {
  const base = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ext = filename && filename.includes('.') ? filename.split('.').pop() : 'bin';
  return `cipher/${base}.${ext}`;
}

export async function uploadEncryptedCipher(cipher: Uint8Array, originalName?: string): Promise<string> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  const objectPath = generateObjectPath(originalName);

  const arrayCopy = new Uint8Array(cipher); // ensure detached ArrayBuffer
  const blob = new Blob([arrayCopy], { type: 'application/octet-stream' });
  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(objectPath, blob, {
      contentType: 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return objectPath;
}

export async function downloadEncryptedCipher(objectPath: string): Promise<ArrayBuffer> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(objectPath);

  if (error || !data) {
    throw new Error(`Download failed: ${error?.message || 'No data'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return arrayBuffer;
}

// ---- Metadata sidecar helpers ----

function getMetaPathForObject(objectPath: string): string {
  // Store metadata in a parallel folder to avoid clutter
  // e.g. cipher/123.bin -> meta/cipher/123.bin.json
  return `meta/${objectPath}.json`;
}

export async function uploadFileMeta(objectPath: string, meta: EncryptedFileMeta & { storage?: 'supabase'; bucket?: string; id?: string; }): Promise<void> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  const metaPath = getMetaPathForObject(objectPath);
  const body = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const { error } = await supabase
    .storage
    .from(bucket)
    .upload(metaPath, body, { contentType: 'application/json', upsert: true });
  if (error) {
    // Non-fatal for the main flow, but surface the error for debugging
    console.warn('Meta upload failed:', error.message);
  }
}

export async function downloadFileMeta(objectPath: string): Promise<EncryptedFileMeta | null> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  const metaPath = getMetaPathForObject(objectPath);
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(metaPath);
  if (error || !data) {
    return null;
  }
  const text = await data.text();
  try {
    return JSON.parse(text) as EncryptedFileMeta;
  } catch {
    return null;
  }
}

export interface StorageItem {
  name: string;
  id: string; // full object path under the bucket
  created_at?: string;
  updated_at?: string;
  metadata?: { size?: number } | null;
}

export async function listEncryptedObjects(limit: number = 100): Promise<StorageItem[]> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  // List objects inside the "cipher" prefix where ciphertexts are stored
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .list('cipher', { limit, sortBy: { column: 'updated_at', order: 'desc' } as any });
  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }
  const items = (data || []).map((obj: any) => ({
    name: obj.name as string,
    id: `cipher/${obj.name}`,
    created_at: obj.created_at as string | undefined,
    updated_at: obj.updated_at as string | undefined,
    metadata: obj.metadata || null,
  }));
  return items;
}



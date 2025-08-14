// Client-side file crypto helpers using Web Crypto (AES-GCM + PBKDF2)
// Generates an emoji token that encodes metadata; ciphertext is stored remotely

import { mapBase64ToEmojis, mapEmojisToBase64 } from '@/lib/encryption';

export interface EncryptedFileMeta {
    v: number;
    alg: 'AES-GCM';
    name: string;
    mime: string;
    size: number;
    // v1 fields (direct password-derived key encrypts file)
    salt_b64?: string;
    iv_b64?: string;
    // v2 envelope fields
    iv_file_b64?: string; // IV for file encryption using random data key
    pw_salt_b64?: string; // salt for deriving user's wrapping key
    pw_iv_b64?: string;   // IV for wrapping the data key with user's key
    pw_wrapped_key_b64?: string; // data key wrapped for the user's password
    admin_wrapped_key_b64?: string; // data key wrapped for admin public key (RSA-OAEP)
    wrap_alg?: 'RSA-OAEP-256';
    // Storage locator
    storage?: 'supabase';
    bucket?: string;
    id?: string; // object path inside bucket
}

function toB64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
	const binary = atob(b64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveKey']
	);
	// Create a fresh ArrayBuffer to satisfy strict BufferSource typing
	const saltCopy = new Uint8Array(salt);
	const saltBuffer = saltCopy.buffer as ArrayBuffer;
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: saltBuffer, iterations: 200_000, hash: 'SHA-256' },
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

// --- Admin public key support (optional) ---
function b64ToUint8(b64: string): Uint8Array { return fromB64(b64); }
function strToUint8(s: string): Uint8Array { return new TextEncoder().encode(s); }

function getAdminPublicKeyB64(): string | null {
    const b64 = process.env.NEXT_PUBLIC_ADMIN_RSA_PUBLIC_KEY_B64;
    return b64 && b64.trim() ? b64.trim() : null;
}

async function importAdminPublicKeyFromSpkiB64(b64: string): Promise<CryptoKey> {
    const spkiBytes = b64ToUint8(b64);
    return crypto.subtle.importKey(
        'spki',
        spkiBytes.buffer as ArrayBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

export async function encryptFile(file: File, password: string): Promise<{ cipher: Uint8Array; meta: EncryptedFileMeta }> {
    const adminPubB64 = getAdminPublicKeyB64();
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (!adminPubB64) {
        // v1: direct password-derived key encrypts the file
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const ivCopy = new Uint8Array(iv);
        const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivCopy.buffer as ArrayBuffer }, key, bytes.buffer as ArrayBuffer);
        const cipher = new Uint8Array(cipherBuf);
        const meta: EncryptedFileMeta = {
            v: 1,
            alg: 'AES-GCM',
            name: file.name,
            mime: file.type || 'application/octet-stream',
            size: file.size,
            salt_b64: toB64(salt),
            iv_b64: toB64(iv),
        };
        return { cipher, meta };
    }

    // v2: envelope encryption
    // 1) Generate random data key for file content
    const dataKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const dataKey = await crypto.subtle.importKey('raw', dataKeyRaw.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const ivFile = crypto.getRandomValues(new Uint8Array(12));
    const ivFileCopy = new Uint8Array(ivFile);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivFileCopy.buffer as ArrayBuffer }, dataKey, bytes.buffer as ArrayBuffer);
    const cipher = new Uint8Array(cipherBuf);

    // 2) Wrap data key for user password
    const pwSalt = crypto.getRandomValues(new Uint8Array(16));
    const pwWrapIv = crypto.getRandomValues(new Uint8Array(12));
    const pwKey = await deriveKey(password, pwSalt);
    const wrappedForUser = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: pwWrapIv.buffer as ArrayBuffer },
        pwKey,
        dataKeyRaw.buffer as ArrayBuffer
    );

    // 3) Wrap data key for admin public key (RSA-OAEP)
    let wrappedForAdminB64: string | undefined;
    try {
        const adminPubKey = await importAdminPublicKeyFromSpkiB64(adminPubB64);
        const wrappedForAdmin = await crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            adminPubKey,
            dataKeyRaw.buffer as ArrayBuffer
        );
        wrappedForAdminB64 = toB64(new Uint8Array(wrappedForAdmin));
    } catch (e) {
        // If admin key import fails, proceed without it
        console.warn('Admin public key not usable:', e);
    }

    const meta: EncryptedFileMeta = {
        v: 2,
        alg: 'AES-GCM',
        name: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        iv_file_b64: toB64(ivFile),
        pw_salt_b64: toB64(pwSalt),
        pw_iv_b64: toB64(pwWrapIv),
        pw_wrapped_key_b64: toB64(new Uint8Array(wrappedForUser)),
        admin_wrapped_key_b64: wrappedForAdminB64,
        wrap_alg: wrappedForAdminB64 ? 'RSA-OAEP-256' : undefined
    };
    return { cipher, meta };
}

export async function decryptToBlob(cipher: ArrayBuffer, password: string, meta: EncryptedFileMeta): Promise<Blob> {
    // v2 path: unwrap data key then decrypt
    if (meta.v === 2 && meta.pw_wrapped_key_b64 && meta.pw_salt_b64 && meta.pw_iv_b64 && meta.iv_file_b64) {
        const pwKey = await deriveKey(password, fromB64(meta.pw_salt_b64));
        const pwIv = fromB64(meta.pw_iv_b64);
        let dataKeyRaw: ArrayBuffer;
        try {
            const unwrapped = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: pwIv.buffer as ArrayBuffer }, pwKey, fromB64(meta.pw_wrapped_key_b64).buffer as ArrayBuffer);
            dataKeyRaw = unwrapped;
        } catch (e) {
            throw new Error('Incorrect password for this file.');
        }
        const dataKey = await crypto.subtle.importKey('raw', dataKeyRaw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const ivFile = fromB64(meta.iv_file_b64);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivFile.buffer as ArrayBuffer }, dataKey, cipher);
        return new Blob([plain], { type: meta.mime || 'application/octet-stream' });
    }

    // v1 path: password key directly decrypts file
    if (meta.salt_b64 && meta.iv_b64) {
        const key = await deriveKey(password, fromB64(meta.salt_b64));
        const ivArr = fromB64(meta.iv_b64);
        const ivCopy = new Uint8Array(ivArr);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivCopy.buffer as ArrayBuffer }, key, cipher);
        return new Blob([plain], { type: meta.mime || 'application/octet-stream' });
    }
    throw new Error('Unsupported file format.');
}

function encodeMetaToBase64(meta: EncryptedFileMeta): string {
	const json = JSON.stringify(meta);
	return btoa(unescape(encodeURIComponent(json)));
}

function decodeMetaFromBase64(b64: string): EncryptedFileMeta {
	const json = decodeURIComponent(escape(atob(b64)));
	return JSON.parse(json);
}

export function makeEmojiToken(meta: EncryptedFileMeta): string {
	const base64 = encodeMetaToBase64(meta);
	return '🔐' + mapBase64ToEmojis(base64);
}

export function parseEmojiToken(token: string): EncryptedFileMeta {
	const cleaned = token.trim().replace(/^🔐/, '');
	const base64 = mapEmojisToBase64(cleaned);
	return decodeMetaFromBase64(base64);
}

// Admin-only helper: decrypt using pasted RSA private key PEM (SPKI counterpart is embedded as public b64)
export async function decryptToBlobWithAdminPrivateKey(cipher: ArrayBuffer, meta: EncryptedFileMeta, adminPrivateKeyPkcs8B64: string): Promise<Blob> {
    if (!(meta.v === 2 && meta.admin_wrapped_key_b64 && meta.iv_file_b64)) {
        throw new Error('Admin decryption not available for this file.');
    }
    // Import private key
    const pkcs8Bytes = fromB64(adminPrivateKeyPkcs8B64);
    const privKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Bytes.buffer as ArrayBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );
    // Unwrap data key
    const wrappedBytes = fromB64(meta.admin_wrapped_key_b64);
    const dataKeyRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, wrappedBytes.buffer as ArrayBuffer);
    const dataKey = await crypto.subtle.importKey('raw', dataKeyRaw, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const ivFile = fromB64(meta.iv_file_b64);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivFile.buffer as ArrayBuffer }, dataKey, cipher);
    return new Blob([plain], { type: meta.mime || 'application/octet-stream' });
}



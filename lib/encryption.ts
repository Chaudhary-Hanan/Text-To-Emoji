import CryptoJS from 'crypto-js';

// Simple and reliable emoji set (similar to txtmoji.com approach)
const EMOJI_SET = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
  '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
  '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
  '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
  '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
  '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
  '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽',
  '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝',
  '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡',
  '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥',
  '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️', '🗨️', '🗯️', '💭',
  '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲',
  '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶',
  '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
  '👅', '👄', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔',
  '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋',
  '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🤴',
  '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅',
  '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟',
  '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯',
  '🧖', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊',
  '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘',
  '🛀', '🛌', '👭', '👫', '👬', '💏', '💑', '👪', '🗣️', '👤',
  '👥', '🫂', '👣', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮',
  '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆',
  '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄',
  '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙',
  '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰',
  '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦',
  '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥',
  '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩',
  '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕',
  '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙',
  '🐚', '🐌', '🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🕷️',
  '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠', '💐', '🌸', '💮', '🏵️',
  '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳',
  '🌴', '🌵', '🌶️', '🍄', '🌾', '💫', '⭐', '🌟', '✨', '⚡',
  '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️',
  '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦',
  '☔', '☂️', '🌊', '🌫️'
];

// Bijective mapping between base64 alphabet and emojis (lossless)
// Use ONLY single-codepoint emojis to avoid variation selector issues on copy/paste
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const BASE64_SAFE_EMOJIS: string[] = [
  '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
  '😋','😎','😍','😘','🥰','🙂','🤗','🤔','🤨','😐',
  '😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪',
  '😫','🥱','😴','😌','😜','😝','🤤','😒','😓','😔',
  '😕','🙃','🤑','😲','😟','😧','😦','😨','😰','😱',
  '😳','🥺','😵','🤯','🤪','🥳','😇','🤓','🧐','🤠',
  '😷','🤒','🤕','🤢','🤮'
];
const BASE64_EMOJI_SET = BASE64_SAFE_EMOJIS;

const BASE64_TO_EMOJI: Record<string, string> = {};
const EMOJI_TO_BASE64: Record<string, string> = {};
for (let i = 0; i < BASE64_ALPHABET.length; i++) {
  const ch = BASE64_ALPHABET[i];
  const emoji = BASE64_EMOJI_SET[i];
  BASE64_TO_EMOJI[ch] = emoji;
  EMOJI_TO_BASE64[emoji] = ch;
}

// Public helpers to reuse the bijective mapping for non-text payloads (e.g., file tokens)
export function mapBase64ToEmojis(base64: string): string {
  if (!base64) return '';
  let result = '';
  for (const ch of base64) {
    const emoji = BASE64_TO_EMOJI[ch];
    if (!emoji) {
      throw new Error('Unsupported character in base64 mapping.');
    }
    result += emoji;
  }
  return result;
}

export function mapEmojisToBase64(emojis: string): string {
  if (!emojis) return '';
  let result = '';
  const emojiArray = Array.from(emojis);
  for (const emoji of emojiArray) {
    const ch = EMOJI_TO_BASE64[emoji];
    if (ch === undefined) {
      throw new Error('Invalid emoji encountered in token.');
    }
    result += ch;
  }
  return result;
}

/**
 * Encrypts text using password and converts to emojis
 * Based on txtmoji.com approach - simple and reliable
 */
export function encryptToEmojis(text: string, password: string): string {
  if (!text.trim()) return '';
  
  try {
    // Convert text to Base64 first to handle all Unicode characters properly
    const base64Text = btoa(unescape(encodeURIComponent(text)));
    const encrypted = CryptoJS.AES.encrypt(base64Text, password).toString();
    
    // Map base64 ciphertext 1:1 to emojis (lossless, fully reversible)
    let emojiResult = '';
    const chars = Array.from(encrypted);
    for (const ch of chars) {
      const mappedEmoji = BASE64_TO_EMOJI[ch];
      if (!mappedEmoji) {
        throw new Error('Unexpected character during encryption mapping.');
      }
      emojiResult += mappedEmoji;
    }
    
    return emojiResult;
  } catch (error) {
    throw new Error('Encryption failed. Please check your input.');
  }
}

/**
 * Decrypts emojis back to text using password
 * Based on txtmoji.com approach - simple and reliable
 */
export function decryptFromEmojis(emojis: string, password: string): string {
  if (!emojis.trim()) return '';
  
  try {
    // Convert emojis back to encrypted string
    let encryptedBase64 = '';
    
    // Split emojis properly (handling multi-byte emojis)
    const emojiArray = Array.from(emojis);
    
    for (const emoji of emojiArray) {
      const base64Char = EMOJI_TO_BASE64[emoji];
      if (!base64Char) {
        // If any emoji is not from our mapping set, fail fast with a clear error
        throw new Error('Please enter valid encrypted emojis only.');
      }
      encryptedBase64 += base64Char;
    }
    
    if (!encryptedBase64) {
      throw new Error('No valid encrypted data found in emojis.');
    }
    
    // Basic sanity check: CryptoJS passphrase ciphertext starts with base64("Salted__") => "U2FsdGVkX1"
    if (!encryptedBase64.startsWith('U2FsdGVkX1')) {
      throw new Error('These emojis are from an older version or another app. Please re-encrypt with this app and try again.');
    }

    // Decrypt the string using AES
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedBase64, password);
    const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedBase64) {
      throw new Error('Decryption failed. Please check your password.');
    }
    
    // Convert from Base64 back to original text
    try {
      const decryptedText = decodeURIComponent(escape(atob(decryptedBase64)));
      return decryptedText;
    } catch (base64Error) {
      // If Base64 decoding fails, try a different approach
      console.warn('Base64 decoding failed, trying alternative method:', base64Error);
      
      // Try using the decrypted bytes directly as UTF-8
      const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (decryptedText) {
        return decryptedText;
      }
      
      throw new Error('Failed to decode text. Please check your password.');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Decryption failed. Please check your password and encrypted emojis.');
  }
}

/**
 * Validates if the input contains mostly valid emojis from our set
 * More flexible validation to reduce false negatives
 */
export function validateEmojiInput(input: string): boolean {
  if (!input.trim()) return false;
  
  const emojiArray = Array.from(input);
  if (emojiArray.length === 0) return false;
  
  // Count how many emojis are from our set
  const validEmojis = emojiArray.filter(emoji => EMOJI_SET.includes(emoji));
  
  // If at least 70% of the emojis are from our set, consider it valid
  // This allows for more flexibility with emoji variations and copy-paste issues
  const validPercentage = (validEmojis.length / emojiArray.length) * 100;
  
  return validPercentage >= 70;
}

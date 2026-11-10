/**
 * imageUploadRules.js — the single source of truth for image uploads.
 *
 * Rules (from the artist submission guidelines):
 *   • Format: WEBP only. A JPEG / PNG / GIF is rejected — no silent conversion.
 *   • Size:   800 KB maximum per file.
 *   • Name:   `Year_Title_No` with spaces replaced by `_` and a two-digit
 *             sequence (`2021_Red_Forest_01.webp`). Portraits use
 *             `ArtistName_Portrait.webp`.
 *
 * Both the browser (FileUploadComponent) and the server (/api/upload) import
 * this module, so a file that passes the client check can never fail on the
 * server for a *different* reason — and the error text is identical.
 */

export const IMAGE_UPLOAD_RULES = Object.freeze({
  MAX_BYTES: 800 * 1024, // 800 KB (819,200 bytes)
  MAX_LABEL: '800KB',
  MIME_TYPE: 'image/webp',
  EXTENSION: '.webp',
  FORMAT_LABEL: 'WEBP',
});

export const IMAGE_UPLOAD_ERROR = Object.freeze({
  FORMAT: 'IMAGE_FORMAT_NOT_WEBP',
  SIZE: 'IMAGE_SIZE_TOO_LARGE',
  FORMAT_AND_SIZE: 'IMAGE_FORMAT_AND_SIZE_INVALID',
  EMPTY: 'IMAGE_EMPTY_FILE',
  BAD_NAME: 'IMAGE_NAME_INVALID',
});

/** 1.24 MB — used in the error copy. */
export const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/** "photo.JPG" → "JPG"; falls back to the MIME subtype. */
export const describeFormat = (file) => {
  const fromName = String(file?.name ?? '').split('.').pop();
  if (fromName && fromName !== file?.name && fromName.length <= 5) {
    return fromName.toUpperCase();
  }
  const subtype = String(file?.type ?? '').split('/')[1];
  return subtype ? subtype.toUpperCase() : 'UNKNOWN';
};

/**
 * Some systems report an empty MIME type (or `application/octet-stream`) for
 * a perfectly good .webp. Accept the extension in that case, but never accept
 * a file whose MIME says it is something else.
 */
export const isWebp = (file) => {
  const type = String(file?.type ?? '').toLowerCase();
  if (type === IMAGE_UPLOAD_RULES.MIME_TYPE) return true;
  if (type && type !== 'application/octet-stream') return false;
  return String(file?.name ?? '').toLowerCase().endsWith('.webp');
};

const formatIssue = (file, isCn) => {
  const name = file?.name || 'this file';
  const actual = describeFormat(file);
  return isCn
    ? `格式不符：「${name}」是 ${actual}，不是 WEBP。只接受 .webp 文件，请先转换格式再上传。`
    : `Wrong format: "${name}" is ${actual}, not WEBP. Only .webp files are accepted — convert the file first.`;
};

const sizeIssue = (file, isCn) => {
  const size = formatBytes(file?.size);
  return isCn
    ? `文件过大：${size}，上限 ${IMAGE_UPLOAD_RULES.MAX_LABEL}（800 KB = 819,200 字节）。请压缩或缩小后重试。`
    : `File too large: ${size}. The limit is ${IMAGE_UPLOAD_RULES.MAX_LABEL} (800 KB = 819,200 bytes). Compress or resize it and try again.`;
};

/**
 * Validate one image file.
 *
 * @param {File|{name:string,type:string,size:number}} file
 * @param {{ isCn?: boolean }} [options]
 * @returns {{
 *   ok: boolean,
 *   code?: string,
 *   title: string,
 *   detail: string,
 *   message: string,
 *   issues: string[]
 * }}
 */
export function validateImageForUpload(file, { isCn = false } = {}) {
  const issues = [];

  if (!file || !file.size) {
    const title = isCn ? '文件为空' : 'Empty file';
    const detail = isCn
      ? '这个文件没有内容，请重新选择一张 .webp 图片。'
      : 'This file has no content. Pick a .webp image again.';
    return { ok: false, code: IMAGE_UPLOAD_ERROR.EMPTY, title, detail, message: `${title}: ${detail}`, issues: ['empty'] };
  }

  const badFormat = !isWebp(file);
  const tooLarge = file.size > IMAGE_UPLOAD_RULES.MAX_BYTES;

  if (badFormat) issues.push('format');
  if (tooLarge) issues.push('size');

  if (!issues.length) {
    return { ok: true, title: '', detail: '', message: '', issues: [] };
  }

  const isBoth = badFormat && tooLarge;
  const title = isBoth
    ? isCn ? '格式和大小都不符合' : 'Format and size are both wrong'
    : badFormat
      ? isCn ? '格式不符合' : 'Wrong format'
      : isCn ? '文件过大' : 'File too large';

  const detail = isBoth
    ? `${formatIssue(file, isCn)} ${sizeIssue(file, isCn)}`
    : badFormat
      ? formatIssue(file, isCn)
      : sizeIssue(file, isCn);

  const code = isBoth
    ? IMAGE_UPLOAD_ERROR.FORMAT_AND_SIZE
    : badFormat
      ? IMAGE_UPLOAD_ERROR.FORMAT
      : IMAGE_UPLOAD_ERROR.SIZE;

  return { ok: false, code, title, detail, message: `${title}: ${detail}`, issues };
}

/* ── File naming (artist submission guidelines) ────────────────────────── */

/** Spaces → `_`, drop characters that break URLs / R2 keys. */
export const sanitizeNamePart = (value = '') =>
  String(value)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=~^[\]]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

/** `1` / `01` / `1.` → `01`; empty → `01`. */
export const padSequence = (value) => {
  const n = parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return '01';
  return String(n).padStart(2, '0');
};

/**
 * Build the upload file name from the artwork metadata.
 *   2021 + "Red Forest" + 1  →  `2021_Red_Forest_01.webp`
 *   portrait + "Hu Jieming"  →  `Hu_Jieming_Portrait.webp`
 *
 * When year/title are missing (most cover pickers), the original file name is
 * kept — only sanitised and forced to `.webp`.
 */
export function buildImageFileName({
  year,
  title,
  no,
  artistName,
  kind = 'artwork',
  originalName = '',
} = {}) {
  const cleanTitle = sanitizeNamePart(title);
  const cleanYear = sanitizeNamePart(year);

  if (kind === 'portrait' && artistName) {
    return `${sanitizeNamePart(artistName)}_Portrait.webp`;
  }

  if (cleanYear && cleanTitle) {
    return `${cleanYear}_${cleanTitle}_${padSequence(no)}.webp`;
  }

  const base = String(originalName)
    .replace(/\.[^.]+$/, '')
    .trim();
  return `${sanitizeNamePart(base) || 'image'}.webp`;
}

export default IMAGE_UPLOAD_RULES;

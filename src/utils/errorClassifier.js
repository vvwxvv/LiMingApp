// error-classifier.js
//
// Turns a raw upload failure into a bilingual, user-facing alert. The rules
// themselves live in `imageUploadRules.js` (WEBP only, 800 KB max) so the
// message here and the check in the browser/server cannot drift apart.

import {
  IMAGE_UPLOAD_RULES,
  IMAGE_UPLOAD_ERROR,
} from "@/utils/imageUploadRules";

// ─── Configurable Constants ────────────────────────────────────────────────
const MAX_FILE_SIZE_LABEL = IMAGE_UPLOAD_RULES.MAX_LABEL;
const SUPPORTED_FORMATS = [IMAGE_UPLOAD_RULES.FORMAT_LABEL];

// ─── Precompiled Regex Patterns ────────────────────────────────────────────
const DUPLICATE_PATTERNS = [/duplicate/i, /already exists/i];
const SIZE_PATTERNS = [/too large/i, /file size/i, /exceeds/i, /超过.*大小|文件过大/i];
const FORMAT_PATTERNS = [
  /format/i,
  /file type/i,
  /unsupported/i,
  /invalid type/i,
  /wrong format/i,
  /格式/i,
];
const AUTH_PATTERNS = [/unauthorized/i, /forbidden/i, /not allowed/i];
const SERVER_PATTERNS = [/server/i, /network/i, /timeout/i, /unavailable/i];
const NOT_FOUND_PATTERNS = [/not found/i, /missing/i, /no such/i];

// ─── Helpers ───────────────────────────────────────────────────────────────
const matchesAny = (text, patterns) => patterns.some((p) => p.test(text));

const extractStatusCode = (err) =>
  err?.status ?? err?.statusCode ?? err?.response?.status ?? undefined;

const extractCode = (err) =>
  err?.code ?? err?.response?.data?.code ?? undefined;

const extractMessage = (err) => {
  if (typeof err === "string") return err;
  return err?.message ?? err?.response?.data?.message ?? err?.response?.data?.error ?? "";
};

// ─── Error Catalog ─────────────────────────────────────────────────────────
const ERROR_CATALOG = {
  DUPLICATE_IMAGE: {
    type: "DUPLICATE_IMAGE",
    title_en: "Duplicate Image",
    title_cn: "图片重复",
    detail_en: "This image already exists in the database. Please use a different file.",
    detail_cn: "该图片已存在于数据库中，请使用其他文件。",
  },
  FILE_TOO_LARGE: {
    type: "FILE_TOO_LARGE",
    title_en: "File Too Large",
    title_cn: "文件过大",
    detail_en: `The file exceeds the maximum allowed size of ${MAX_FILE_SIZE_LABEL}. Compress or resize the image, then upload again.`,
    detail_cn: `文件超过最大限制 ${MAX_FILE_SIZE_LABEL}，请压缩或调整图片尺寸后重新上传。`,
  },
  UNSUPPORTED_FORMAT: {
    type: "UNSUPPORTED_FORMAT",
    title_en: "Wrong Format",
    title_cn: "格式不符合",
    detail_en: `Only ${SUPPORTED_FORMATS.join(", ")} is accepted. Convert the file to .webp and upload again — it will not be saved otherwise.`,
    detail_cn: `仅接受 ${SUPPORTED_FORMATS.join("、")} 格式。请先转换为 .webp 再上传，否则不会保存。`,
  },
  FORMAT_AND_SIZE: {
    type: "FORMAT_AND_SIZE",
    title_en: "Format and Size Are Both Wrong",
    title_cn: "格式和大小都不符合",
    detail_en: `Convert the file to .webp and keep it at or below ${MAX_FILE_SIZE_LABEL}.`,
    detail_cn: `请转换为 .webp，并控制在 ${MAX_FILE_SIZE_LABEL} 以内。`,
  },
  PERMISSION_DENIED: {
    type: "PERMISSION_DENIED",
    title_en: "Permission Denied",
    title_cn: "权限不足",
    detail_en: "Your session has expired or you lack the required permissions. Please log in again.",
    detail_cn: "登录状态已过期或权限不足，请重新登录后再试。",
  },
  NOT_FOUND: {
    type: "NOT_FOUND",
    title_en: "Resource Not Found",
    title_cn: "资源未找到",
    detail_en: "The target resource could not be located. It may have been moved or deleted.",
    detail_cn: "目标资源不存在，可能已被移动或删除。",
  },
  RATE_LIMITED: {
    type: "RATE_LIMITED",
    title_en: "Too Many Requests",
    title_cn: "请求过于频繁",
    detail_en: "Upload limit reached. Please wait a moment before trying again.",
    detail_cn: "上传请求过于频繁，请稍后再试。",
  },
  SERVER_ERROR: {
    type: "SERVER_ERROR",
    title_en: "Server Error",
    title_cn: "服务器错误",
    detail_en: "An internal error occurred on the server. Please try again in a moment.",
    detail_cn: "服务器内部发生错误，请稍后重试。",
  },
  UNKNOWN_UPLOAD_ERROR: {
    type: "UNKNOWN_UPLOAD_ERROR",
    title_en: "Upload Failed",
    title_cn: "上传失败",
    detail_en: "An unexpected error occurred during upload. Please try again or contact support.",
    detail_cn: "上传过程中发生未知错误，请重试或联系技术支持。",
  },
};

// Map the structured API codes onto catalog entries.
const CODE_TO_KEY = {
  [IMAGE_UPLOAD_ERROR.FORMAT]: "UNSUPPORTED_FORMAT",
  [IMAGE_UPLOAD_ERROR.SIZE]: "FILE_TOO_LARGE",
  [IMAGE_UPLOAD_ERROR.FORMAT_AND_SIZE]: "FORMAT_AND_SIZE",
  [IMAGE_UPLOAD_ERROR.EMPTY]: "UNKNOWN_UPLOAD_ERROR",
  [IMAGE_UPLOAD_ERROR.BAD_NAME]: "UNKNOWN_UPLOAD_ERROR",
  IMAGE_FORMAT_NOT_WEBP: "UNSUPPORTED_FORMAT",
  IMAGE_SIZE_TOO_LARGE: "FILE_TOO_LARGE",
  IMAGE_FORMAT_AND_SIZE_INVALID: "FORMAT_AND_SIZE",
};

// ─── Result Builder ────────────────────────────────────────────────────────
function buildResult(key, status, overrideDetail) {
  const entry = ERROR_CATALOG[key];
  return {
    type: entry.type,
    title_en: entry.title_en,
    title_cn: entry.title_cn,
    detail_en: overrideDetail?.en ?? entry.detail_en,
    detail_cn: overrideDetail?.cn ?? entry.detail_cn,
    ...(status !== undefined && { status }),
  };
}

// ─── Main Classifier ───────────────────────────────────────────────────────
/**
 * Convert a raw upload error into a bilingual, user-friendly classification.
 *
 * @param {unknown} err - Error object, string, or any thrown value.
 * @returns {{
 *   type: string,
 *   title_en: string,
 *   title_cn: string,
 *   detail_en: string,
 *   detail_cn: string,
 *   status?: number
 * }}
 */
export function classifyUploadError(err) {
  const raw = extractMessage(err);
  const message = raw.toLowerCase();
  const status = extractStatusCode(err);
  const code = extractCode(err);

  // 0. The API returned an explicit rule code — trust it over regex guessing.
  if (code && CODE_TO_KEY[code]) {
    // A precise per-file message (e.g. "photo.jpg is JPG") beats the generic one.
    const precise = raw.trim()
      ? { en: raw, cn: raw }
      : undefined;
    return buildResult(CODE_TO_KEY[code], status, precise);
  }

  // 1. Duplicate / conflict
  if (status === 409 || matchesAny(message, DUPLICATE_PATTERNS)) {
    return buildResult("DUPLICATE_IMAGE", status);
  }

  // 2. File too large
  if (status === 413 || matchesAny(message, SIZE_PATTERNS)) {
    return buildResult("FILE_TOO_LARGE", status);
  }

  // 3. Unsupported format
  if (matchesAny(message, FORMAT_PATTERNS)) {
    return buildResult("UNSUPPORTED_FORMAT", status);
  }

  // 4. Authentication / authorization
  if (status === 401 || status === 403 || matchesAny(message, AUTH_PATTERNS)) {
    return buildResult("PERMISSION_DENIED", status);
  }

  // 5. Not found
  if (status === 404 || matchesAny(message, NOT_FOUND_PATTERNS)) {
    return buildResult("NOT_FOUND", status);
  }

  // 6. Rate limited
  if (status === 429) {
    return buildResult("RATE_LIMITED", status);
  }

  // 7. Server / network errors
  if ((status && status >= 500) || matchesAny(message, SERVER_PATTERNS)) {
    return buildResult("SERVER_ERROR", status);
  }

  // 8. Fallback — surface the raw message if available
  const fallback =
    raw.trim().length > 0
      ? { en: raw, cn: `错误信息：${raw}` }
      : undefined;

  return buildResult("UNKNOWN_UPLOAD_ERROR", status, fallback);
}

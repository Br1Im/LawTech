/**
 * Multer receives multipart filenames as latin1 on some clients.
 * Decode the common UTF-8-as-latin1 representation without changing
 * ordinary ASCII or already-correct Unicode filenames.
 */
function decodeUploadedFilename(value) {
  const name = String(value || 'file');
  if (!/[\u00c3\u00c2\u00d0\u00d1]/.test(name)) return name;

  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (!decoded || decoded.includes('\uFFFD')) return name;
    return decoded;
  } catch (_) {
    return name;
  }
}

/**
 * Multipart text fields may arrive as UTF-8 bytes decoded as latin1, or may
 * already have gone through a Windows-1251 mojibake round-trip. Normalize
 * conservatively and keep the original when the candidate is invalid.
 */
function decodeMultipartText(value) {
  if (value === null || value === undefined) return value;
  const original = String(value);
  const candidates = [original];
  try { candidates.push(Buffer.from(original, 'latin1').toString('utf8')); } catch (_) { /* noop */ }
  try {
    const iconv = require('iconv-lite');
    candidates.push(iconv.decode(iconv.encode(original, 'win1251'), 'utf8'));
  } catch (_) { /* noop */ }
  const score = text => {
    if (!text || text.includes('\uFFFD')) return -1000;
    const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    const mojibake = (text.match(/[ÃÂÐÑРС][¤Ѕѓ‚]/g) || []).length + (text.match(/[РС][^А-Яа-яЁё\s]/g) || []).length;
    return cyr * 2 - mojibake * 8;
  };
  return candidates.sort((a, b) => score(b) - score(a))[0] || original;
}

module.exports = { decodeUploadedFilename, decodeMultipartText };

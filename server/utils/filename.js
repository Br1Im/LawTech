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

module.exports = { decodeUploadedFilename };

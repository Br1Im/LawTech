// imageCompress.ts
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif') return file;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const r = Math.min(MAX / width, MAX / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        resolve(out);
      }, 'image/jpeg', 0.78);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

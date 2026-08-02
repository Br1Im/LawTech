// documentScan.ts
// Геометрия и обработка скана: поиск границ листа, выравнивание перспективы,
// удаление затемнений и повышение контрастности. Без OCR и без внешних зависимостей.

export interface Point { x: number; y: number }

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

export function orderCorners(points: Point[]): Point[] {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return [...points].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
    .reduce<Point[]>((acc, p) => { acc.push(p); return acc; }, [])
    .sort((a, b) => {
      const qa = (a.y < cy ? 0 : 1) * 2 + (a.y < cy ? (a.x < cx ? 0 : 1) : (a.x > cx ? 0 : 1));
      const qb = (b.y < cy ? 0 : 1) * 2 + (b.y < cy ? (b.x < cx ? 0 : 1) : (b.x > cx ? 0 : 1));
      return qa - qb;
    });
}

// Поиск листа: градиент яркости -> проекции по осям -> границы контрастной области.
export function detectDocument(image: ImageData): Point[] | null {
  const { width: w, height: h, data } = image;
  if (w < 40 || h < 40) return null;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  }
  const colScore = new Float32Array(w);
  const rowScore = new Float32Array(h);
  let maxG = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + w] - gray[idx - w];
      const g = Math.abs(gx) + Math.abs(gy);
      if (g > 0.12) { colScore[x] += g; rowScore[y] += g; }
      if (g > maxG) maxG = g;
    }
  }
  if (maxG < 0.14) return null;

  const edge = (arr: Float32Array, from: number, to: number) => {
    const step = to > from ? 1 : -1;
    let peak = 0, peakIndex = from;
    for (let i = from; i !== to; i += step) {
      if (arr[i] > peak) { peak = arr[i]; peakIndex = i; }
      if (peak > 0 && arr[i] > peak * 0.55) { peakIndex = i; break; }
    }
    return peakIndex;
  };

  const left = edge(colScore, 1, Math.floor(w * 0.45));
  const right = edge(colScore, w - 2, Math.floor(w * 0.55));
  const top = edge(rowScore, 1, Math.floor(h * 0.45));
  const bottom = edge(rowScore, h - 2, Math.floor(h * 0.55));

  const boxW = right - left;
  const boxH = bottom - top;
  if (boxW < w * 0.28 || boxH < h * 0.28) return null;
  if (boxW * boxH < w * h * 0.14) return null;

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

// Гомография: отображение прямоугольника результата в четырёхугольник источника.
function solveHomography(dst: Point[], src: Point[]): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = dst[i];
    const { x: u, y: v } = src[i];
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]); b.push(v);
  }
  const n = 8;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-9) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (!f) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const hh = b.map((val, i) => val / A[i][i]);
  return [...hh, 1];
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function warpDocument(source: ImageData, corners: Point[], maxSide = 1700): ImageData | null {
  const [tl, tr, br, bl] = corners;
  const targetW = Math.max(dist(tl, tr), dist(bl, br));
  const targetH = Math.max(dist(tl, bl), dist(tr, br));
  if (targetW < 20 || targetH < 20) return null;
  const scale = Math.min(1, maxSide / Math.max(targetW, targetH));
  const outW = Math.max(20, Math.round(targetW * scale));
  const outH = Math.max(20, Math.round(targetH * scale));

  const H = solveHomography(
    [{ x: 0, y: 0 }, { x: outW - 1, y: 0 }, { x: outW - 1, y: outH - 1 }, { x: 0, y: outH - 1 }],
    corners,
  );
  if (!H) return null;

  const out = new ImageData(outW, outH);
  const src = source.data;
  const sw = source.width, sh = source.height;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const denom = H[6] * x + H[7] * y + H[8];
      const sx = (H[0] * x + H[1] * y + H[2]) / denom;
      const sy = (H[3] * x + H[4] * y + H[5]) / denom;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const o = (y * outW + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        out.data[o] = out.data[o + 1] = out.data[o + 2] = 255; out.data[o + 3] = 255;
        continue;
      }
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] * (1 - fx) + src[i10 + c] * fx;
        const bottom = src[i01 + c] * (1 - fx) + src[i11 + c] * fx;
        out.data[o + c] = top * (1 - fy) + bottom * fy;
      }
      out.data[o + 3] = 255;
    }
  }
  return out;
}

// Убираем затемнения через оценку фона и поднимаем контраст.
export function enhanceDocument(image: ImageData, mode: 'document' | 'photo' = 'document'): ImageData {
  const { width: w, height: h, data } = image;
  if (mode === 'photo') {
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        data[i + c] = clamp((data[i + c] - 128) * 1.12 + 134, 0, 255);
      }
    }
    return image;
  }

  const bw = Math.max(8, Math.round(w / 24));
  const bh = Math.max(8, Math.round(h / 24));
  const bg = new Float32Array(bw * bh);

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const x0 = Math.floor((bx * w) / bw), x1 = Math.floor(((bx + 1) * w) / bw);
      const y0 = Math.floor((by * h) / bh), y1 = Math.floor(((by + 1) * h) / bh);
      let best = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * w + x) * 4;
          const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          if (lum > best) best = lum;
        }
      }
      bg[by * bw + bx] = best || 255;
    }
  }

  const smooth = new Float32Array(bg.length);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sum = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = bx + dx, ny = by + dy;
          if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
          sum += bg[ny * bw + nx]; count++;
        }
      }
      smooth[by * bw + bx] = sum / count;
    }
  }

  const sampleBg = (x: number, y: number) => {
    const gx = clamp((x / w) * bw - 0.5, 0, bw - 1);
    const gy = clamp((y / h) * bh - 0.5, 0, bh - 1);
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1);
    const fx = gx - x0, fy = gy - y0;
    const top = smooth[y0 * bw + x0] * (1 - fx) + smooth[y0 * bw + x1] * fx;
    const bottom = smooth[y1 * bw + x0] * (1 - fx) + smooth[y1 * bw + x1] * fx;
    return top * (1 - fy) + bottom * fy;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const base = Math.max(40, sampleBg(x, y));
      for (let c = 0; c < 3; c++) {
        let v = (data[i + c] / base) * 246;
        v = (v - 150) * 1.35 + 168;
        data[i + c] = clamp(v, 0, 255);
      }
    }
  }
  return image;
}

export function imageDataToFile(image: ImageData, name: string, quality = 0.86): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(new File([blob as Blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', quality);
  });
}
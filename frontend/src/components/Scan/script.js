let fileInput = document.getElementById('fileInput');
let canvasWrap = document.getElementById('canvasWrap');
let scanBtn = document.getElementById('scanBtn');

let imgElement, overlayCanvas, ctx;
let corners = [], draggingIdx = null;
let isScanned = false;

function setUiEnabled(isEnabled) {
  fileInput.disabled = !isEnabled;
  scanBtn.disabled = !isEnabled || !imgElement;
}

// OpenCV readiness minimal
if (window.cv && cv['onRuntimeInitialized'] === undefined && cv?.Mat) {
  setUiEnabled(true);
} else {
  window.Module = window.Module || {};
  cv['onRuntimeInitialized'] = () => { setUiEnabled(true); };
}

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => loadImage(ev.target.result);
  reader.readAsDataURL(f);
});

function loadImage(src) {
  imgElement = new Image();
  imgElement.onload = () => {
    canvasWrap.innerHTML = '';
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = imgElement.naturalWidth;
    overlayCanvas.height = imgElement.naturalHeight;
    overlayCanvas.style.cursor = 'crosshair';
    canvasWrap.appendChild(overlayCanvas);
    ctx = overlayCanvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, overlayCanvas.width, overlayCanvas.height);
    isScanned = false;
    detectAndDraw();
    overlayCanvas.addEventListener('mousedown', onPointerDown);
    overlayCanvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    overlayCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
    overlayCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });
    scanBtn.disabled = false;
    overlayCanvas.style.pointerEvents = 'auto';
    overlayCanvas.style.cursor = 'crosshair';
  };
  imgElement.src = src;
}

function orderCornersClockwise(points) {
  const center = points.reduce((acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }), { x: 0, y: 0 });
  const sorted = points.slice().sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  let startIdx = 0, minSum = Infinity;
  for (let i = 0; i < sorted.length; i++) { const s = sorted[i].x + sorted[i].y; if (s < minSum) { minSum = s; startIdx = i; } }
  return [sorted[startIdx], sorted[(startIdx + 1) % 4], sorted[(startIdx + 2) % 4], sorted[(startIdx + 3) % 4]];
}

function detectAndDraw() {
  try {
    let src = cv.imread(imgElement);
    let gray = new cv.Mat();
    // TUNE: GaussianBlur kernel (5,5) — уменьшить шум перед Canny. Больше ядро = сильнее сглаживание.
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    let edged = new cv.Mat();
    // TUNE: Canny thresholds (50,150) — чувствительность к краям. Ниже = больше контуров.
    cv.Canny(gray, edged, 50, 150);
    // TUNE: dilate kernel (5,5) — склеивает разорванные границы, увеличивает толщину контура.
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    cv.dilate(edged, edged, kernel);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    let maxArea = 0, good = null, approx = new cv.Mat();
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      // TUNE: отсечение мелких контуров (area < 2000). Увеличьте, чтобы игнорировать шумные мелкие объекты.
      let area = cv.contourArea(cnt, false);
      if (area < 2000) { cnt.delete(); continue; }
      let peri = cv.arcLength(cnt, true);
      // TUNE: epsilon = 0.02 * peri — точность аппроксимации контура. Больше = сильнее упрощение.
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4 && area > maxArea) { maxArea = area; if (good) good.delete(); good = approx.clone(); }
      cnt.delete();
    }
    if (good) {
      const arr = good.data32S; const pts = [];
      for (let i = 0; i < arr.length; i += 2) pts.push({ x: arr[i], y: arr[i + 1] });
      corners = orderCornersClockwise(pts);
      good.delete();
    } else {
      corners = [
        { x: 10, y: 10 },
        { x: overlayCanvas.width - 10, y: 10 },
        { x: overlayCanvas.width - 10, y: overlayCanvas.height - 10 },
        { x: 10, y: overlayCanvas.height - 10 }
      ];
    }
    drawOverlay();
    src.delete(); gray.delete(); edged.delete(); kernel.delete(); contours.delete(); hierarchy.delete(); approx.delete();
  } catch (e) { console.error(e); }
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawOverlay() {
  if (!ctx || isScanned) return;
  const w = overlayCanvas.width;
  const h = overlayCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(imgElement, 0, 0, w, h);

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();

  ctx.save();
  // TUNE: прозрачность подсветки области (0.15). Меньше — менее заметная заливка.
  ctx.fillStyle = 'rgba(30, 58, 138, 0.15)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  // TUNE: цвет/толщина обводки (цвет #60a5fa, толщина 4).
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // TUNE: радиус колец маркеров (16) и толщина (3); цвет контура — #60a5fa.
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < corners.length; i++) {
    const p = corners[i];
    const r = 16;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(String(i + 1), p.x, p.y);
    ctx.restore();
  }
}

function getPos(ev) {
  const rect = overlayCanvas.getBoundingClientRect();
  const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
  return {
    x: (clientX - rect.left) * (overlayCanvas.width / rect.width),
    y: (clientY - rect.top) * (overlayCanvas.height / rect.height)
  };
}

function onPointerDown(e) {
  if (isScanned) return;
  if (e.touches) e.preventDefault();
  const pos = getPos(e);
  for (let i = 0; i < corners.length; i++) {
    const dx = corners[i].x - pos.x, dy = corners[i].y - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < 15) { draggingIdx = i; }
  }
}

function onPointerMove(e) {
  if (isScanned) return;
  if (draggingIdx === null) return;
  if (e.touches) e.preventDefault();
  const pos = getPos(e);
  corners[draggingIdx].x = Math.max(0, Math.min(overlayCanvas.width, pos.x));
  corners[draggingIdx].y = Math.max(0, Math.min(overlayCanvas.height, pos.y));
  drawOverlay();
}

function onPointerUp() {
  if (isScanned) return;
  draggingIdx = null;
  drawOverlay();
}

function removePointerListeners() {
  if (!overlayCanvas) return;
  overlayCanvas.removeEventListener('mousedown', onPointerDown);
  overlayCanvas.removeEventListener('mousemove', onPointerMove);
  window.removeEventListener('mouseup', onPointerUp);
  overlayCanvas.removeEventListener('touchstart', onPointerDown);
  overlayCanvas.removeEventListener('touchmove', onPointerMove);
  window.removeEventListener('touchend', onPointerUp);
}

function placeOnA4(mat, orientation) {
  // TUNE: базовое «разрешение» A4 ~150 DPI: 1169×1654 (портрет) / 1654×1169 (альбом).
  // Увеличьте для более детального вывода (цена — память/время).
  let a4W = orientation === 'a4l' ? 1654 : 1169;
  let a4H = orientation === 'a4l' ? 1169 : 1654;
  // TUNE: поля на листе (px). Больше — шире белая рамка.
  const margin = 40;
  const maxW = a4W - margin * 2;
  const maxH = a4H - margin * 2;
  const scale = Math.min(maxW / mat.cols, maxH / mat.rows, 1);
  const newW = Math.max(1, Math.round(mat.cols * scale));
  const newH = Math.max(1, Math.round(mat.rows * scale));
  let resized = new cv.Mat();
  cv.resize(mat, resized, new cv.Size(newW, newH), 0, 0, cv.INTER_CUBIC);
  let canvas = new cv.Mat(a4H, a4W, mat.type(), new cv.Scalar(255, 255, 255, 255));
  const offX = Math.floor((a4W - newW) / 2);
  const offY = Math.floor((a4H - newH) / 2);
  let roi = canvas.roi(new cv.Rect(offX, offY, newW, newH));
  resized.copyTo(roi);
  roi.delete();
  resized.delete();
  return canvas;
}

scanBtn.addEventListener('click', () => {
  if (!imgElement || corners.length !== 4) return;
  const srcMat = cv.imread(imgElement);
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y, // TL
    corners[1].x, corners[1].y, // TR
    corners[2].x, corners[2].y, // BR
    corners[3].x, corners[3].y  // BL
  ]);

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const widthTop = dist(corners[0], corners[1]);
  const widthBottom = dist(corners[3], corners[2]);
  const heightLeft = dist(corners[0], corners[3]);
  const heightRight = dist(corners[1], corners[2]);
  // TUNE: пределы рассчитанного размера результата (минимум/максимум пикселей).
  let targetWidth = Math.max(widthTop, widthBottom);
  let targetHeight = Math.max(heightLeft, heightRight);
  targetWidth = Math.max(200, Math.min(2000, Math.round(targetWidth)));
  targetHeight = Math.max(200, Math.min(2800, Math.round(targetHeight)));

  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetWidth - 1, 0,
    targetWidth - 1, targetHeight - 1,
    0, targetHeight - 1
  ]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  let dst = new cv.Mat();
  cv.warpPerspective(cv.imread(imgElement), dst, M, new cv.Size(targetWidth, targetHeight));

  // --- No post-processing: use warped image as-is ---
  let output = dst;

  // Auto A4 placement if aspect close
  const a4 = 1.4142;
  const aspect = targetHeight / targetWidth;
  const relPortrait = Math.abs(aspect - a4) / a4;
  const relLandscape = Math.abs((targetWidth / targetHeight) - a4) / a4;
  const tol = 0.08;
  let finalMat = output;
  if (relPortrait <= tol) {
    let placed = placeOnA4(output, 'a4p');
    finalMat = placed;
    output.delete();
  } else if (relLandscape <= tol) {
    let placed = placeOnA4(output, 'a4l');
    finalMat = placed;
    output.delete();
  }

  overlayCanvas.width = finalMat.cols;
  overlayCanvas.height = finalMat.rows;
  cv.imshow(overlayCanvas, finalMat);
  isScanned = true;
  removePointerListeners();
  overlayCanvas.style.pointerEvents = 'none';
  overlayCanvas.style.cursor = 'default';
  scanBtn.disabled = true;

  // Clean
  srcMat.delete();
  srcTri.delete();
  dstTri.delete();
  M.delete();
  if (finalMat !== output) finalMat.delete();
  else output.delete();
});
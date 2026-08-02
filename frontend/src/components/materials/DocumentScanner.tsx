import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { detectDocument, warpDocument, enhanceDocument, imageDataToFile, type Point } from '../../shared/lib/documentScan';
import './DocumentScanner.css';

interface Props {
  onDone: (files: File[]) => void;
  onClose: () => void;
}

interface Page { id: string; file: File; preview: string }

const DETECT_EVERY_MS = 220;

const DocumentScanner: React.FC<Props> = ({ onDone, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectRef = useRef<Point[] | null>(null);
  const rafRef = useRef<number>(0);
  const lastDetect = useRef(0);
  const stableSince = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [autoShot, setAutoShot] = useState(true);
  const [mode, setMode] = useState<'document' | 'photo'>('document');
  const [hint, setHint] = useState('Наведите камеру на документ');

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setCameraError('Камера недоступна. Разрешите доступ в настройках браузера или используйте «Сделать фото».');
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera]);

  const grabFrame = useCallback((maxSide: number) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }, []);

  const capture = useCallback(async (corners?: Point[] | null) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    try {
      const full = grabFrame(2200);
      if (!full) throw new Error('Кадр не получен');
      const detected = corners && corners.length === 4
        ? corners
        : detectDocument(grabFrame(480)!) ;
      let scaled: Point[] | null = null;
      if (detected) {
        const small = grabFrame(480)!;
        const kx = full.width / small.width;
        const ky = full.height / small.height;
        scaled = detected.map(p => ({ x: p.x * kx, y: p.y * ky }));
      }
      const quad: Point[] = scaled ?? [
        { x: 0, y: 0 },
        { x: full.width - 1, y: 0 },
        { x: full.width - 1, y: full.height - 1 },
        { x: 0, y: full.height - 1 },
      ];
      const warped = warpDocument(full, quad) || full;
      const enhanced = enhanceDocument(warped, mode);
      const index = pages.length + 1;
      const file = await imageDataToFile(enhanced, `Скан-${new Date().toISOString().slice(0, 10)}-${String(index).padStart(2, '0')}.jpg`);
      setPages(prev => [...prev, { id: `${Date.now()}-${index}`, file, preview: URL.createObjectURL(file) }]);
      setHint('Страница добавлена. Можно сканировать следующую.');
    } catch {
      message.error('Не удалось обработать кадр, попробуйте ещё раз');
    } finally {
      stableSince.current = null;
      setProcessing(false);
      busyRef.current = false;
    }
  }, [grabFrame, mode, pages.length]);

  useEffect(() => {
    if (!ready) return;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - lastDetect.current < DETECT_EVERY_MS || busyRef.current) return;
      lastDetect.current = now;

      const small = grabFrame(480);
      const overlay = overlayRef.current;
      const video = videoRef.current;
      if (!small || !overlay || !video) return;

      const rect = video.getBoundingClientRect();
      overlay.width = rect.width;
      overlay.height = rect.height;
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const found = detectDocument(small);
      detectRef.current = found;

      if (!found) {
        stableSince.current = null;
        setHint('Наведите камеру на документ');
        return;
      }

      const kx = rect.width / small.width;
      const ky = rect.height / small.height;
      ctx.beginPath();
      found.forEach((p, i) => {
        const x = p.x * kx, y = p.y * ky;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(101, 87, 217, 0.16)';
      ctx.strokeStyle = 'rgba(101, 87, 217, 0.95)';
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      if (!autoShot) { setHint('Документ найден, нажмите кнопку съёмки'); return; }
      if (stableSince.current === null) { stableSince.current = now; setHint('Держите ровно...'); return; }
      if (now - stableSince.current > 1100) {
        stableSince.current = null;
        void capture(found);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, autoShot, capture, grabFrame]);

  const removePage = (id: string) => {
    setPages(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const finish = () => {
    if (!pages.length) { message.info('Отсканируйте хотя бы одну страницу'); return; }
    stopCamera();
    onDone(pages.map(p => p.file));
  };

  return (
    <div className="scanner-root" role="dialog" aria-label="Сканирование документа">
      <header className="scanner-top">
        <button type="button" onClick={() => { stopCamera(); onClose(); }}>Отмена</button>
        <span>{pages.length ? `Страниц: ${pages.length}` : 'Сканирование'}</span>
        <button type="button" className="scanner-primary-link" onClick={finish} disabled={!pages.length}>Готово</button>
      </header>

      <div className="scanner-stage">
        {cameraError ? (
          <div className="scanner-error">{cameraError}</div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={overlayRef} className="scanner-overlay" />
            <div className="scanner-hint">{processing ? 'Обрабатываем страницу...' : hint}</div>
          </>
        )}
      </div>

      {pages.length > 0 && (
        <div className="scanner-pages">
          {pages.map((p, i) => (
            <figure key={p.id}>
              <img src={p.preview} alt={`Страница ${i + 1}`} />
              <button type="button" onClick={() => removePage(p.id)} aria-label="Удалить страницу">×</button>
              <figcaption>{i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <footer className="scanner-controls">
        <label className="scanner-toggle">
          <input type="checkbox" checked={autoShot} onChange={e => setAutoShot(e.target.checked)} />
          Авто
        </label>
        <button type="button" className="scanner-shutter" onClick={() => capture(detectRef.current)} disabled={!ready || processing} aria-label="Сделать снимок" />
        <button type="button" className="scanner-mode" onClick={() => setMode(m => (m === 'document' ? 'photo' : 'document'))}>
          {mode === 'document' ? 'Документ' : 'Фото'}
        </button>
      </footer>
    </div>
  );
};

export default DocumentScanner;
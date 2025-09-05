import React, { useEffect, useRef, useState } from 'react';
import './ScannerStyles.css';

interface ScannerProps {
  onScanComplete: (imageData: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    cv: any;
  }
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [corners, setCorners] = useState<{x: number, y: number}[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overlayCanvas, setOverlayCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isScanned, setIsScanned] = useState(false);

  // Загрузка OpenCV.js
  useEffect(() => {
    // Проверяем, загружен ли уже OpenCV.js
    if (window.cv) {
      console.log('OpenCV.js уже загружен');
      setIsReady(true);
      // Если изображение уже загружено, запускаем обнаружение углов
      if (imgElement && ctx && overlayCanvas) {
        detectAndDraw();
      }
      return;
    }

    // Проверяем, загружается ли уже OpenCV.js
    const existingScript = document.getElementById('opencv-script');
    if (existingScript) {
      console.log('OpenCV.js уже загружается');
      existingScript.addEventListener('load', () => {
        console.log('OpenCV.js загружен (из существующего скрипта)');
        setIsReady(true);
        // Если изображение уже загружено, запускаем обнаружение углов
        if (imgElement && ctx && overlayCanvas) {
          detectAndDraw();
        }
      });
      return;
    }

    // Загружаем OpenCV.js, если он еще не загружен и не загружается
    const script = document.createElement('script');
    script.id = 'opencv-script';
    script.src = 'https://docs.opencv.org/4.7.0/opencv.js';
    script.async = true;
    script.onload = () => {
      console.log('OpenCV.js загружен');
      setIsReady(true);
      // Если изображение уже загружено, запускаем обнаружение углов
      if (imgElement && ctx && overlayCanvas) {
        detectAndDraw();
      }
    };
    script.onerror = (error) => {
      console.error('Ошибка загрузки OpenCV.js:', error);
    };
    document.body.appendChild(script);

    // Не удаляем скрипт при размонтировании компонента,
    // чтобы избежать повторной загрузки и ошибок с регистрацией 'IntVector'
  }, [imgElement, ctx, overlayCanvas]);

  // Функция для загрузки изображения
  const loadImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      if (canvasWrapRef.current) {
        canvasWrapRef.current.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.cursor = 'crosshair';
        canvasWrapRef.current.appendChild(canvas);
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          setOverlayCanvas(canvas);
          setCtx(context);
          setIsScanned(false);
          
          // Добавляем обработчики событий
          canvas.addEventListener('mousedown', onPointerDown);
          canvas.addEventListener('mousemove', onPointerMove);
          window.addEventListener('mouseup', onPointerUp);
          canvas.addEventListener('touchstart', onPointerDown as any);
          canvas.addEventListener('touchmove', onPointerMove as any);
          window.addEventListener('touchend', onPointerUp as any);
          canvas.style.pointerEvents = 'auto';
          canvas.style.cursor = 'crosshair';
          
          // Запускаем обнаружение углов, если OpenCV.js загружен
          if (window.cv && window.cv.imread) {
            console.log('OpenCV.js загружен, запускаем обнаружение углов');
            detectAndDraw();
          } else {
            console.log('OpenCV.js еще не загружен, устанавливаем углы по умолчанию');
            // Устанавливаем углы по умолчанию
            const width = canvas.width;
            const height = canvas.height;
            const padding = Math.min(width, height) * 0.1;
            setCorners([
              { x: padding, y: padding },
              { x: width - padding, y: padding },
              { x: width - padding, y: height - padding },
              { x: padding, y: height - padding }
            ]);
            drawOverlay();
          }
        }
      }
    };
    img.src = src;
    setImgElement(img);
  };

  // Обнаружение углов документа
  const detectAndDraw = () => {
    if (!imgElement || !window.cv || !ctx || !overlayCanvas) return;

    try {
      // Если OpenCV.js не полностью загружен, устанавливаем углы по умолчанию
      if (!window.cv.imread || !window.cv.cvtColor) {
        console.log('OpenCV.js не полностью загружен, устанавливаем углы по умолчанию');
        const width = overlayCanvas.width;
        const height = overlayCanvas.height;
        const padding = Math.min(width, height) * 0.1;
        setCorners([
          { x: padding, y: padding },
          { x: width - padding, y: padding },
          { x: width - padding, y: height - padding },
          { x: padding, y: height - padding }
        ]);
        drawOverlay();
        return;
      }

      const src = window.cv.imread(imgElement);
      const gray = new window.cv.Mat();
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      
      // Применяем размытие для уменьшения шума
      const blurred = new window.cv.Mat();
      window.cv.GaussianBlur(gray, blurred, new window.cv.Size(5, 5), 0);
      
      // Применяем адаптивный порог
      const thresh = new window.cv.Mat();
      window.cv.adaptiveThreshold(blurred, thresh, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2);
      
      // Находим контуры
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      window.cv.findContours(thresh, contours, hierarchy, window.cv.RETR_LIST, window.cv.CHAIN_APPROX_SIMPLE);
      
      // Ищем самый большой контур (предположительно, это документ)
      let maxArea = 0;
      let maxContourIndex = -1;
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);
        if (area > maxArea) {
          maxArea = area;
          maxContourIndex = i;
        }
        contour.delete();
      }
      
      // Если нашли контур, аппроксимируем его и получаем углы
      if (maxContourIndex >= 0) {
        const contour = contours.get(maxContourIndex);
        const perimeter = window.cv.arcLength(contour, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
        
        // Если аппроксимация дала 4 точки, считаем что это документ
        if (approx.rows === 4) {
          const newCorners = [];
          for (let i = 0; i < 4; i++) {
            const point = new window.cv.Point(approx.data32S[i * 2], approx.data32S[i * 2 + 1]);
            newCorners.push({ x: point.x, y: point.y });
          }
          
          // Сортируем углы (верхний левый, верхний правый, нижний правый, нижний левый)
          newCorners.sort((a, b) => a.y - b.y);
          const topPoints = newCorners.slice(0, 2).sort((a, b) => a.x - b.x);
          const bottomPoints = newCorners.slice(2, 4).sort((a, b) => a.x - b.x);
          setCorners([topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]]);
        } else {
          // Если не нашли 4 точки, устанавливаем углы по умолчанию
          const width = overlayCanvas.width;
          const height = overlayCanvas.height;
          const padding = Math.min(width, height) * 0.1;
          setCorners([
            { x: padding, y: padding },
            { x: width - padding, y: padding },
            { x: width - padding, y: height - padding },
            { x: padding, y: height - padding }
          ]);
        }
        approx.delete();
      } else {
        // Если не нашли контур, устанавливаем углы по умолчанию
        const width = overlayCanvas.width;
        const height = overlayCanvas.height;
        const padding = Math.min(width, height) * 0.1;
        setCorners([
          { x: padding, y: padding },
          { x: width - padding, y: padding },
          { x: width - padding, y: height - padding },
          { x: padding, y: height - padding }
        ]);
      }
      
      // Очищаем память
      src.delete();
      gray.delete();
      blurred.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();
      
      // Рисуем углы
      drawOverlay();
    } catch (error) {
      console.error('Ошибка при обработке изображения:', error);
      
      // В случае ошибки устанавливаем углы по умолчанию
      if (overlayCanvas) {
        const width = overlayCanvas.width;
        const height = overlayCanvas.height;
        const padding = Math.min(width, height) * 0.1;
        setCorners([
          { x: padding, y: padding },
          { x: width - padding, y: padding },
          { x: width - padding, y: height - padding },
          { x: padding, y: height - padding }
        ]);
        drawOverlay();
      }
    }
  };

  // Рисование наложения с углами
  const drawOverlay = () => {
    if (!ctx || !overlayCanvas) return;
    
    // Очищаем холст
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Рисуем исходное изображение
    if (imgElement) {
      ctx.drawImage(imgElement, 0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    
    // Если есть 4 угла, рисуем многоугольник и маркеры
    if (corners.length === 4) {
      // Рисуем полупрозрачный многоугольник
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Рисуем маркеры углов
      corners.forEach((corner, idx) => {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = idx === draggingIdx ? 'rgba(212, 175, 55, 0.8)' : 'rgba(212, 175, 55, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  };

  // Обработчики событий указателя
  const onPointerDown = (e: MouseEvent | TouchEvent) => {
    if (isScanned) return;
    
    e.preventDefault();
    const point = getPointerPosition(e);
    if (!point) return;
    
    // Проверяем, попал ли указатель в один из углов
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const distance = Math.hypot(point.x - corner.x, point.y - corner.y);
      if (distance <= 20) {
        setDraggingIdx(i);
        break;
      }
    }
  };

  const onPointerMove = (e: MouseEvent | TouchEvent) => {
    if (isScanned || draggingIdx === null) return;
    
    e.preventDefault();
    const point = getPointerPosition(e);
    if (!point) return;
    
    // Обновляем позицию перетаскиваемого угла
    const newCorners = [...corners];
    newCorners[draggingIdx] = point;
    setCorners(newCorners);
    drawOverlay();
  };

  const onPointerUp = () => {
    if (isScanned) return;
    setDraggingIdx(null);
    drawOverlay();
  };

  // Получение позиции указателя (мышь или касание)
  const getPointerPosition = (e: MouseEvent | TouchEvent) => {
    if (!overlayCanvas) return null;
    
    const rect = overlayCanvas.getBoundingClientRect();
    const scaleX = overlayCanvas.width / rect.width;
    const scaleY = overlayCanvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Обработчик выбора файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          loadImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработчик сканирования
  const handleScan = () => {
    if (!imgElement || corners.length !== 4) return;
    setIsScanning(true);
    
    try {
      // Проверяем, что OpenCV.js полностью загружен
      if (!window.cv || !window.cv.imread) {
        console.error('OpenCV.js не загружен полностью');
        setIsScanning(false);
        return;
      }
      
      const srcMat = window.cv.imread(imgElement);
      const srcTri = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        corners[0].x, corners[0].y, // TL
        corners[1].x, corners[1].y, // TR
        corners[2].x, corners[2].y, // BR
        corners[3].x, corners[3].y  // BL
      ]);

      const dist = (a: {x: number, y: number}, b: {x: number, y: number}) => Math.hypot(a.x - b.x, a.y - b.y);
      const widthTop = dist(corners[0], corners[1]);
      const widthBottom = dist(corners[3], corners[2]);
      const heightLeft = dist(corners[0], corners[3]);
      const heightRight = dist(corners[1], corners[2]);
      
      let targetWidth = Math.max(widthTop, widthBottom);
      let targetHeight = Math.max(heightLeft, heightRight);
      targetWidth = Math.max(200, Math.min(2000, Math.round(targetWidth)));
      targetHeight = Math.max(200, Math.min(2800, Math.round(targetHeight)));

      const dstTri = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        0, 0,
        targetWidth - 1, 0,
        targetWidth - 1, targetHeight - 1,
        0, targetHeight - 1
      ]);
      
      const M = window.cv.getPerspectiveTransform(srcTri, dstTri);
      let dst = new window.cv.Mat();
      window.cv.warpPerspective(window.cv.imread(imgElement), dst, M, new window.cv.Size(targetWidth, targetHeight));

      // Создаем холст для результата
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = targetWidth;
      resultCanvas.height = targetHeight;
      window.cv.imshow(resultCanvas, dst);
      
      // Получаем данные изображения и преобразуем в File объект
      resultCanvas.toBlob((blob) => {
        // Очищаем память
        srcMat.delete();
        srcTri.delete();
        dstTri.delete();
        M.delete();
        dst.delete();
        
        if (blob) {
          // Создаем File объект из blob
          const scannedFile = new File([blob], 'scanned-document.jpg', { type: 'image/jpeg' });
          // Передаем результат
          onScanComplete(scannedFile);
        } else {
          console.error('Не удалось создать blob из отсканированного изображения');
          setIsScanning(false);
        }
      }, 'image/jpeg', 0.9);
      setIsScanned(true);
      setIsScanning(false);
    } catch (error) {
      console.error('Ошибка при сканировании:', error);
      setIsScanning(false);
    }
  };

  // Обработчик открытия диалога выбора файла
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        <div className="scanner-header">
          <h2>Сканер документов</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="scanner-content">
          {!isReady ? (
            <div className="loading-message">Загрузка OpenCV.js...</div>
          ) : (
            <>
              <div className="file-input-container">
                <button 
                  className="file-select-button" 
                  onClick={handleOpenFileDialog}
                >
                  Выбрать изображение
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }}
                />
              </div>
              
              <div ref={canvasWrapRef} className="canvas-wrap"></div>
              
              <div className="controls">
                <button 
                  id="scanBtn" 
                  onClick={handleScan} 
                  disabled={!imgElement || isScanning}
                  className={isScanning ? 'scanning' : ''}
                >
                  {isScanning ? 'Сканирование...' : 'Сканировать'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { ScanLine, Camera, Image as ImageIcon, Paperclip, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { UploadQueue, type QueueSnapshot } from '../../shared/lib/uploadQueue';
import { compressImage } from '../../shared/lib/imageCompress';
import { buildApiUrl } from '../../shared/utils/apiUtils';
import DocumentScanner from './DocumentScanner';
import './MaterialUploader.css';

interface Props {
  contractId: number;
  onUploaded: () => Promise<void> | void;
  disabled?: boolean;
  compact?: boolean;
}

const MAX_FILES = 50;
const MAX_BYTES = 25 * 1024 * 1024;
const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.heic,.webp,application/pdf,image/*';

const formatSize = (bytes: number) => (bytes > 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  : `${Math.max(1, Math.round(bytes / 1024))} КБ`);

const MaterialUploader: React.FC<Props> = ({ contractId, onUploaded, disabled, compact }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { void onUploaded(); }, 400);
  }, [onUploaded]);

  const queue = useMemo(() => new UploadQueue({
    endpoint: buildApiUrl('/materials/upload'),
    fields: { contract_id: String(contractId), category: 'Материал дела' },
    concurrency: 3,
    maxAttempts: 4,
    prepare: async (file) => (file.type.startsWith('image/') ? compressImage(file) : file),
    onChange: (snap) => {
      setSnapshot(snap);
      if (snap.done > 0) scheduleRefresh();
    },
    onSettled: (snap) => {
      void onUploaded();
      if (snap.failed === 0 && snap.total > 0) {
        message.success(snap.total === 1 ? 'Файл загружен' : `Загружено файлов: ${snap.done}`);
      } else if (snap.failed > 0) {
        message.warning(`Не удалось загрузить: ${snap.failed}. Их можно отправить повторно.`);
      }
    },
  }), [contractId, onUploaded, scheduleRefresh]);

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    queue.cancelAll();
  }, [queue]);

  const enqueue = useCallback((files: File[]) => {
    if (!files.length) return;
    let list = files;
    if (list.length > MAX_FILES) {
      message.warning(`За один раз можно отправить не более ${MAX_FILES} файлов. Остальные добавьте следующим пакетом.`);
      list = list.slice(0, MAX_FILES);
    }
    const tooBig = list.filter(f => f.size > MAX_BYTES);
    const accepted = list.filter(f => f.size <= MAX_BYTES);
    if (tooBig.length) message.error(`Пропущены файлы больше 25 МБ: ${tooBig.length}`);
    if (!accepted.length) return;
    setPanelOpen(true);
    queue.add(accepted);
  }, [queue]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setMenuOpen(false);
    enqueue(files);
  };

  const pick = (ref: React.RefObject<HTMLInputElement>) => {
    if (disabled) return;
    setMenuOpen(false);
    ref.current?.click();
  };

  const busy = !!snapshot?.running;
  const failedItems = snapshot?.items.filter(i => i.status === 'error') ?? [];
  const activeItems = snapshot?.items.filter(i => i.status === 'uploading' || i.status === 'pending') ?? [];

  return (
    <div className={`mu-root${compact ? ' mu-compact' : ''}`}>
      <button type="button" className="mu-trigger" disabled={disabled} onClick={() => setMenuOpen(true)}>
        <Paperclip size={18} />
        {busy ? `Загрузка ${snapshot?.done ?? 0}/${snapshot?.total ?? 0}` : 'Добавить материал'}
      </button>

      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={handleInput} />
      <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={handleInput} />
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple hidden onChange={handleInput} />

      {menuOpen && (
        <div className="mu-sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="mu-sheet" onClick={e => e.stopPropagation()}>
            <header>
              <strong>Добавить материал</strong>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Закрыть"><X size={18} /></button>
            </header>
            <button type="button" className="mu-option mu-option-accent" onClick={() => { setMenuOpen(false); setScannerOpen(true); }}>
              <ScanLine size={21} /><span><b>Сканировать документ</b><small>Авторамка, выравнивание и контраст</small></span>
            </button>
            <button type="button" className="mu-option" onClick={() => pick(camRef)}>
              <Camera size={21} /><span><b>Сделать фото</b><small>Один снимок с камеры</small></span>
            </button>
            <button type="button" className="mu-option" onClick={() => pick(galRef)}>
              <ImageIcon size={21} /><span><b>Выбрать из галереи</b><small>До {MAX_FILES} изображений за раз</small></span>
            </button>
            <button type="button" className="mu-option" onClick={() => pick(fileRef)}>
              <Paperclip size={21} /><span><b>Выбрать файл</b><small>PDF, Word, Excel, архивы</small></span>
            </button>
          </div>
        </div>
      )}

      {scannerOpen && (
        <DocumentScanner
          onClose={() => setScannerOpen(false)}
          onDone={(files) => { setScannerOpen(false); enqueue(files); }}
        />
      )}

      {snapshot && snapshot.total > 0 && panelOpen && (
        <section className="mu-panel" aria-live="polite">
          <header>
            <div>
              <b>{busy ? 'Загружаем документы' : 'Загрузка завершена'}</b>
              <span>{snapshot.done} из {snapshot.total}{snapshot.failed ? `, с ошибкой ${snapshot.failed}` : ''}</span>
            </div>
            <div className="mu-panel-actions">
              {!!failedItems.length && (
                <button type="button" className="mu-retry" onClick={() => queue.retryFailed()}>
                  <RefreshCw size={15} /> Повторить {failedItems.length}
                </button>
              )}
              {!busy && (
                <button type="button" className="mu-close" onClick={() => { queue.reset(); setPanelOpen(false); }} aria-label="Скрыть"><X size={16} /></button>
              )}
            </div>
          </header>

          <div className="mu-progress"><i style={{ width: `${snapshot.total ? (snapshot.done / snapshot.total) * 100 : 0}%` }} /></div>

          {snapshot.offline && <p className="mu-offline">Нет сети. Загрузка продолжится автоматически после восстановления связи.</p>}

          {!!failedItems.length && (
            <ul className="mu-list">
              {failedItems.map(item => (
                <li key={item.id} className="mu-failed">
                  <AlertTriangle size={15} />
                  <span title={item.name}>{item.name}</span>
                  <small>{item.error || 'ошибка'}</small>
                </li>
              ))}
            </ul>
          )}

          {busy && !!activeItems.length && (
            <ul className="mu-list">
              {activeItems.slice(0, 4).map(item => (
                <li key={item.id}>
                  <span title={item.name}>{item.name}</span>
                  <small>{item.status === 'uploading' ? `${item.progress}%` : 'в очереди'} · {formatSize(item.size)}</small>
                </li>
              ))}
              {activeItems.length > 4 && <li className="mu-more">и ещё {activeItems.length - 4}</li>}
            </ul>
          )}

          {!busy && !failedItems.length && (
            <p className="mu-success"><CheckCircle2 size={15} /> Все файлы сохранены в материалах дела</p>
          )}
        </section>
      )}
    </div>
  );
};

export default MaterialUploader;
// MobileMaterialUpload.tsx
import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, FileText, X } from 'lucide-react';
import { Spin, message } from 'antd';
import { compressImage } from '../../shared/lib/imageCompress';

interface Props {
  contractId: number;
  onUploaded: () => Promise<void> | void;
  disabled?: boolean;
}

const MAX_BYTES = 20 * 1024 * 1024;
const FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,image/jpeg,image/png';

const MobileMaterialUpload: React.FC<Props> = ({ contractId, onUploaded, disabled }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const filRef = useRef<HTMLInputElement>(null);

  const uploadOne = async (file: File): Promise<boolean> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('contract_id', String(contractId));
    fd.append('category', 'Материал дела');
    const token = localStorage.getItem('token');
    const resp = await fetch('/api/materials/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      throw new Error((j as any).message || 'Ошибка загрузки');
    }
    return true;
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setOpen(false);
    setBusy(true);
    const arr = Array.from(list);
    let done = 0;
    for (const raw of arr) {
      done++;
      setProgress(`${done}/${arr.length}: ${raw.name}`);
      try {
        let f = raw;
        if (f.type.startsWith('image/')) {
          f = await compressImage(f);
        }
        if (f.size > MAX_BYTES) {
          message.error(`${raw.name}: файл больше 20 МБ`);
          continue;
        }
        await uploadOne(f);
      } catch (e: any) {
        if (!navigator.onLine) {
          message.error('Нет интернета');
        } else {
          message.error(`${raw.name}: ${e?.message || 'ошибка загрузки'}`);
        }
        break;
      }
    }
    setBusy(false);
    setProgress('');
    await onUploaded();
  };

  const onPick = (kind: 'cam' | 'gal' | 'fil') => {
    if (busy || disabled) return;
    const map = { cam: camRef, gal: galRef, fil: filRef };
    map[kind].current?.click();
  };

  return (
    <>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'var(--color-primary)', color: '#fff', border: 'none',
          fontSize: 16, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (busy || disabled) ? 0.6 : 1,
        }}
      >
        {busy ? <Spin size="small" /> : <Camera size={20} />}
        {busy ? `Загрузка... ${progress}` : 'Добавить файл'}
      </button>

      <input ref={camRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple
        style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
      <input ref={filRef} type="file" accept={FILE_ACCEPT} multiple
        style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 2000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: 'var(--color-bg-elevated, #fff)',
              borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden',
              paddingBottom: 'env(safe-area-inset-bottom)',
              boxShadow: '0 -4px 24px rgba(0,0,0,.2)',
              animation: 'slideUp .25s ease',
            }}
          >
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
              <strong>Добавить файл</strong>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <SheetItem icon={<Camera size={22} />} label="Сделать фото" onClick={() => onPick('cam')} />
            <SheetItem icon={<ImageIcon size={22} />} label="Выбрать из галереи" onClick={() => onPick('gal')} />
            <SheetItem icon={<FileText size={22} />} label="Выбрать файл" onClick={() => onPick('fil')} />
            <button type="button" onClick={() => setOpen(false)}
              style={{ width: '100%', padding: 16, background: 'var(--color-bg-alt)', border: 'none', borderTop: '1px solid var(--color-border)', fontSize: 16, color: 'var(--color-text)' }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const SheetItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 14, fontSize: 16, textAlign: 'left', cursor: 'pointer', color: 'var(--color-text)' }}>
    <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
    <span>{label}</span>
  </button>
);

export default MobileMaterialUpload;

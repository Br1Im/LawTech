// uploadQueue.ts
// Отказоустойчивая очередь загрузки материалов: каждый файл идёт отдельным запросом,
// ошибка одного файла не останавливает остальные, а проблемные файлы можно повторить точечно.

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error' | 'canceled';

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  attempts: number;
  error?: string;
}

export interface QueueSnapshot {
  items: QueueItem[];
  total: number;
  done: number;
  failed: number;
  active: number;
  pending: number;
  running: boolean;
  offline: boolean;
}

interface QueueOptions {
  endpoint: string;
  fields: Record<string, string>;
  concurrency?: number;
  maxAttempts?: number;
  timeoutMs?: number;
  prepare?: (file: File) => Promise<File>;
  onChange?: (snapshot: QueueSnapshot) => void;
  onSettled?: (snapshot: QueueSnapshot) => void;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class UploadQueue {
  private items: QueueItem[] = [];
  private opts: Required<Pick<QueueOptions, 'concurrency' | 'maxAttempts' | 'timeoutMs'>> & QueueOptions;
  private active = 0;
  private running = false;
  private stopped = false;
  private xhrs = new Map<string, XMLHttpRequest>();

  constructor(options: QueueOptions) {
    this.opts = { concurrency: 3, maxAttempts: 4, timeoutMs: 120000, ...options };
  }

  snapshot(): QueueSnapshot {
    const items = this.items.map(i => ({ ...i }));
    return {
      items,
      total: items.length,
      done: items.filter(i => i.status === 'done').length,
      failed: items.filter(i => i.status === 'error').length,
      active: items.filter(i => i.status === 'uploading').length,
      pending: items.filter(i => i.status === 'pending').length,
      running: this.running,
      offline: typeof navigator !== 'undefined' && navigator.onLine === false,
    };
  }

  private emit() { this.opts.onChange?.(this.snapshot()); }

  add(files: File[]) {
    const stamp = Date.now();
    files.forEach((file, index) => {
      this.items.push({
        id: `${stamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        attempts: 0,
      });
    });
    this.emit();
    void this.run();
  }

  retryFailed() {
    let changed = false;
    this.items.forEach(item => {
      if (item.status === 'error') {
        item.status = 'pending';
        item.progress = 0;
        item.attempts = 0;
        item.error = undefined;
        changed = true;
      }
    });
    if (changed) { this.stopped = false; this.emit(); void this.run(); }
  }

  clearCompleted() {
    this.items = this.items.filter(i => i.status !== 'done');
    this.emit();
  }

  reset() {
    this.cancelAll();
    this.items = [];
    this.emit();
  }

  cancelAll() {
    this.stopped = true;
    this.xhrs.forEach(x => x.abort());
    this.xhrs.clear();
    this.items.forEach(i => {
      if (i.status === 'pending' || i.status === 'uploading') i.status = 'canceled';
    });
    this.emit();
  }

  private async waitForNetwork() {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) return;
    this.emit();
    await new Promise<void>(resolve => {
      const handler = () => { window.removeEventListener('online', handler); resolve(); };
      window.addEventListener('online', handler);
      // Страховка: пробуем продолжить даже если событие не пришло.
      setTimeout(handler, 15000);
    });
  }

  private upload(item: QueueItem, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.xhrs.set(item.id, xhr);
      xhr.open('POST', this.opts.endpoint, true);
      xhr.timeout = this.opts.timeoutMs;
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        item.progress = Math.round((e.loaded / e.total) * 100);
        this.emit();
      };
      xhr.onload = () => {
        this.xhrs.delete(item.id);
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let msg = `Ошибка сервера ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch { /* noop */ }
        const err: any = new Error(msg);
        // 4xx (кроме 408/429) повторять бессмысленно.
        err.permanent = xhr.status >= 400 && xhr.status < 500 && xhr.status !== 408 && xhr.status !== 429;
        reject(err);
      };
      xhr.onerror = () => { this.xhrs.delete(item.id); reject(new Error('Сеть недоступна')); };
      xhr.ontimeout = () => { this.xhrs.delete(item.id); reject(new Error('Превышено время ожидания')); };
      xhr.onabort = () => { this.xhrs.delete(item.id); reject(Object.assign(new Error('Отменено'), { aborted: true })); };

      const form = new FormData();
      form.append('file', file, file.name);
      Object.entries(this.opts.fields).forEach(([k, v]) => form.append(k, v));
      xhr.send(form);
    });
  }

  private async processOne(item: QueueItem) {
    item.status = 'uploading';
    item.progress = 0;
    this.emit();

    let prepared = item.file;
    try {
      if (this.opts.prepare) prepared = await this.opts.prepare(item.file);
    } catch { prepared = item.file; }

    while (item.attempts < this.opts.maxAttempts && !this.stopped) {
      item.attempts += 1;
      try {
        await this.waitForNetwork();
        await this.upload(item, prepared);
        item.status = 'done';
        item.progress = 100;
        item.error = undefined;
        this.emit();
        return;
      } catch (e: any) {
        if (e?.aborted) { item.status = 'canceled'; this.emit(); return; }
        item.error = e?.message || 'Ошибка загрузки';
        item.progress = 0;
        this.emit();
        if (e?.permanent || item.attempts >= this.opts.maxAttempts) break;
        await sleep(Math.min(8000, 700 * 2 ** (item.attempts - 1)) + Math.random() * 400);
      }
    }
    item.status = 'error';
    this.emit();
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    this.emit();

    const pump = async () => {
      while (!this.stopped) {
        const next = this.items.find(i => i.status === 'pending');
        if (!next) break;
        this.active += 1;
        await this.processOne(next);
        this.active -= 1;
      }
    };

    await Promise.all(Array.from({ length: this.opts.concurrency }, pump));

    this.running = false;
    this.emit();
    this.opts.onSettled?.(this.snapshot());
  }
}
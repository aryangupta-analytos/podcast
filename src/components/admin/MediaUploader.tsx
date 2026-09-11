import { useRef, useState } from 'preact/hooks';

import { uploadFile } from './upload-client';

interface Item {
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  message?: string;
}

/**
 * Multi-file uploader for the media library.
 *
 * Files upload one at a time rather than all at once: several 100 MB episodes
 * in parallel would saturate the owner's upload bandwidth and make every
 * individual file look stalled.
 */
export default function MediaUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (name: string, patch: Partial<Item>) =>
    setItems((current) =>
      current.map((item) => (item.name === name ? { ...item, ...patch } : item))
    );

  const handle = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setBusy(true);
    setItems((current) => [
      ...current,
      ...list.map((file) => ({
        name: file.name,
        progress: 0,
        status: 'uploading' as const
      }))
    ]);

    let succeeded = 0;

    for (const file of list) {
      const kind = file.type.startsWith('audio/') ? 'audio' : 'image';
      try {
        await uploadFile(file, kind, {
          onProgress: (percent) => update(file.name, { progress: percent })
        });
        update(file.name, { status: 'done', progress: 100 });
        succeeded++;
      } catch (error) {
        update(file.name, {
          status: 'error',
          message: (error as Error).message || 'Upload failed.'
        });
      }
    }

    setBusy(false);

    // Reload so the new files appear in the grid — but only if something
    // actually uploaded, so an error message stays on screen to be read.
    if (succeeded > 0) {
      setTimeout(() => window.location.reload(), succeeded === list.length ? 400 : 2500);
    }
  };

  return (
    <div>
      <div
        class={`uploader${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer?.files?.length) void handle(event.dataTransfer.files);
        }}
      >
        <button
          class="uploader-dropzone"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span class="uploader-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </span>
          <strong>{busy ? 'Uploading…' : 'Drop files here'}</strong>
          <span class="sub">images or audio · or click to choose</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,audio/*"
        class="visually-hidden"
        onChange={(event) => {
          const files = (event.currentTarget as HTMLInputElement).files;
          if (files?.length) void handle(files);
        }}
      />

      {items.length > 0 && (
        <ul style="list-style:none; margin:14px 0 0; padding:0; display:grid; gap:8px">
          {items.map((item) => (
            <li
              key={item.name}
              style="display:flex; align-items:center; gap:12px; font-size:13px"
            >
              <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                {item.name}
              </span>
              {item.status === 'uploading' && <span>{item.progress}%</span>}
              {item.status === 'done' && (
                <span style="color:var(--ad-success)">✓ uploaded</span>
              )}
              {item.status === 'error' && (
                <span style="color:var(--ad-danger)">{item.message}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

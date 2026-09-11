import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import AudioPreview from './AudioPreview';
import { uploadFile, type UploadedAsset } from './upload-client';

type Kind = 'image' | 'audio';

interface Props {
  /** Name of the hidden input the surrounding form submits. */
  name: string;
  kind: Kind;
  label: string;
  help?: string;
  /** Existing value when editing. */
  value?: string;
  /** Companion hidden inputs filled in from the upload result. */
  durationName?: string;
  bytesName?: string;
  mimeName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function FileUpload({
  name,
  kind,
  label,
  help,
  value = '',
  durationName,
  bytesName,
  mimeName
}: Props) {
  const [url, setUrl] = useState(value);
  const [result, setResult] = useState<UploadedAsset | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel an upload in flight if the page is left mid-transfer.
  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = useCallback(
    async (file: File) => {
      setError('');
      setProgress(0);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const asset = await uploadFile(file, kind, {
          onProgress: setProgress,
          signal: controller.signal
        });
        setUrl(asset.url);
        setResult(asset);
      } catch (caught) {
        if ((caught as Error)?.name !== 'AbortError') {
          setError((caught as Error).message || 'The upload failed.');
        }
      } finally {
        setProgress(null);
        abortRef.current = null;
      }
    },
    [kind]
  );

  const clear = () => {
    setUrl('');
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const accept = kind === 'audio' ? 'audio/*' : 'image/*';
  const busy = progress !== null;

  return (
    <div class="admin-field">
      <label for={`${name}-file`}>{label}</label>

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
          const file = event.dataTransfer?.files?.[0];
          if (file) void upload(file);
        }}
      >
        {url ? (
          <div class="uploader-preview">
            {kind === 'image' ? (
              <img src={url} alt="" />
            ) : (
              <div style="flex:1 1 260px; min-width:0">
                <AudioPreview src={url} />
              </div>
            )}

            <div class="uploader-meta">
              <strong>{result?.filename ?? 'Current file'}</strong>
              {result && (
                <span>
                  {formatBytes(result.bytes)}
                  {result.durationSeconds
                    ? ` · ${formatDuration(result.durationSeconds)}`
                    : ''}
                </span>
              )}
              <div class="uploader-buttons">
                <button
                  class="btn-admin is-small"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  Replace
                </button>
                <button
                  class="btn-admin is-small is-danger"
                  type="button"
                  onClick={clear}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            class="uploader-dropzone"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <span class="uploader-icon" aria-hidden="true">
              {kind === 'audio' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                  <path d="M4 12v2M8 8v10M12 5v14M16 9v8M20 11v4" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 5h16v14H4zM4 15l4.5-4.5L13 15M14 13l2.5-2.5L20 14M15.5 8.5h.01" />
                </svg>
              )}
            </span>
            <strong>
              {busy
                ? 'Uploading…'
                : `Drop ${kind === 'audio' ? 'an audio file' : 'an image'} here`}
            </strong>
            <span class="sub">or click to choose a file</span>
          </button>
        )}

        {busy && (
          <div class="uploader-progress">
            <span class="uploader-track">
              <span class="uploader-bar" style={{ width: `${progress}%` }} />
            </span>
            <span>{progress}%</span>
            <button
              class="btn-admin is-small"
              type="button"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <p class="help" style="color: var(--ad-danger)" role="alert">
          {error}
        </p>
      )}
      {help && !error && <p class="help">{help}</p>}

      <input
        ref={inputRef}
        id={`${name}-file`}
        type="file"
        accept={accept}
        class="visually-hidden"
        onChange={(event) => {
          const file = (event.currentTarget as HTMLInputElement).files?.[0];
          if (file) void upload(file);
        }}
      />

      {/* What the surrounding form actually submits. */}
      <input type="hidden" name={name} value={url} />
      {durationName && (
        <input
          type="hidden"
          name={durationName}
          value={result?.durationSeconds ? String(result.durationSeconds) : ''}
        />
      )}
      {bytesName && (
        <input type="hidden" name={bytesName} value={result ? String(result.bytes) : ''} />
      )}
      {mimeName && <input type="hidden" name={mimeName} value={result?.mimeType ?? ''} />}
    </div>
  );
}

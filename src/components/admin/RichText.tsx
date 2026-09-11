import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Name of the hidden input the surrounding form submits. */
  name: string;
  value?: string;
  placeholder?: string;
  minHeight?: number;
}

type Command =
  | { kind: 'sep' }
  | {
      kind: 'cmd';
      label: string;
      title: string;
      icon?: string;
      run: (exec: (c: string, v?: string) => void) => void;
    };

/**
 * A small rich-text field for show notes and page copy.
 *
 * The owner was previously typing raw HTML tags into a textarea, which is the
 * one thing the brief said they should never have to do. This gives them bold,
 * links and lists directly, and still submits HTML — so nothing downstream
 * changes: the server sanitizes it on write exactly as before.
 *
 * `document.execCommand` is formally deprecated but is still the only API every
 * browser implements for this, and a full editor framework would be a large
 * dependency for a toolbar with six buttons. The output is sanitized
 * server-side regardless of what the browser produces.
 */
export default function RichText({
  name,
  value = '',
  placeholder = 'Write the show notes…',
  minHeight = 230
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(value);
  const [words, setWords] = useState(0);

  const sync = () => {
    const el = surfaceRef.current;
    if (!el) return;
    setHtml(el.innerHTML);
    const text = (el.textContent ?? '').trim();
    setWords(text ? text.split(/\s+/).length : 0);
  };

  // Seed the editable surface once; after that the DOM is the source of truth,
  // so re-rendering must never overwrite what is being typed.
  useEffect(() => {
    if (surfaceRef.current && !surfaceRef.current.innerHTML) {
      surfaceRef.current.innerHTML = value;
      sync();
    }
  }, []);

  const exec = (command: string, argument?: string) => {
    surfaceRef.current?.focus();
    document.execCommand(command, false, argument);
    sync();
  };

  const commands: Command[] = [
    {
      kind: 'cmd',
      label: 'B',
      title: 'Bold (Ctrl+B)',
      run: (e) => e('bold')
    },
    {
      kind: 'cmd',
      label: 'I',
      title: 'Italic (Ctrl+I)',
      run: (e) => e('italic')
    },
    { kind: 'sep' },
    {
      kind: 'cmd',
      label: 'H2',
      title: 'Heading',
      run: (e) => e('formatBlock', '<h2>')
    },
    {
      kind: 'cmd',
      label: 'H3',
      title: 'Subheading',
      run: (e) => e('formatBlock', '<h3>')
    },
    {
      kind: 'cmd',
      label: '¶',
      title: 'Normal text',
      run: (e) => e('formatBlock', '<p>')
    },
    { kind: 'sep' },
    {
      kind: 'cmd',
      label: '• List',
      title: 'Bulleted list',
      run: (e) => e('insertUnorderedList')
    },
    {
      kind: 'cmd',
      label: '1. List',
      title: 'Numbered list',
      run: (e) => e('insertOrderedList')
    },
    { kind: 'sep' },
    {
      kind: 'cmd',
      label: 'Link',
      title: 'Add a link',
      run: (e) => {
        const url = window.prompt('Link address', 'https://');
        if (!url) return;
        // Anything but http(s) or mailto is refused here as well as on the
        // server, so the owner sees the problem immediately.
        if (!/^(https?:|mailto:|\/)/i.test(url)) {
          window.alert('Links must start with https://, mailto: or /');
          return;
        }
        e('createLink', url);
      }
    },
    {
      kind: 'cmd',
      label: 'Unlink',
      title: 'Remove link',
      run: (e) => e('unlink')
    },
    { kind: 'sep' },
    {
      kind: 'cmd',
      label: 'Clear',
      title: 'Remove formatting',
      run: (e) => e('removeFormat')
    }
  ];

  return (
    <div class="editor">
      <div class="editor-toolbar" role="toolbar" aria-label="Formatting">
        {commands.map((command, index) =>
          command.kind === 'sep' ? (
            <span class="editor-sep" key={`s${index}`} aria-hidden="true" />
          ) : (
            <button
              key={command.label}
              type="button"
              title={command.title}
              aria-label={command.title}
              style={
                command.label === 'B'
                  ? 'font-weight:800'
                  : command.label === 'I'
                    ? 'font-style:italic'
                    : undefined
              }
              onMouseDown={(event) => {
                // Keep the caret where it is; a button steals focus otherwise.
                event.preventDefault();
                command.run(exec);
              }}
            >
              {command.label}
            </button>
          )
        )}
      </div>

      <div
        ref={surfaceRef}
        class="editor-surface"
        style={`min-height:${minHeight}px`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        onPaste={(event) => {
          // Paste as plain text: copying from a website otherwise drags in its
          // fonts, colours and tracking markup.
          event.preventDefault();
          const text = event.clipboardData?.getData('text/plain') ?? '';
          document.execCommand('insertText', false, text);
          sync();
        }}
      />

      <div class="editor-status">
        <span>{words} word{words === 1 ? '' : 's'}</span>
        <span>Bold, links and lists are supported</span>
      </div>

      <input type="hidden" name={name} value={html} />
    </div>
  );
}

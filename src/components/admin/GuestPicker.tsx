import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

export interface GuestOption {
  id: string;
  name: string;
  title: string | null;
  imageUrl: string | null;
}

interface Props {
  /** Every existing guest, for autocomplete. */
  options: GuestOption[];
  /** Guests already on this episode, when editing. */
  selected: GuestOption[];
}

/** Initials + a stable colour, matching the public site's Avatar component. */
function monogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = ((words[0]?.[0] ?? '') + (words.length > 1 ? (words.at(-1)?.[0] ?? '') : '')).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return { letters: letters || '?', hue: hash };
}

/**
 * Adds guests to an episode by name.
 *
 * A native `<datalist>` was doing this before, but the browser renders that as
 * an operating-system list that ignores the page's styling entirely — on
 * Windows a flat grey panel bolted to the field. This is a real combobox: it
 * looks like the rest of the admin, shows each guest's photo so the right
 * "Chris" is obvious, and supports arrow keys, Enter and Escape.
 *
 * Typing a name that already exists links the existing guest, so a returning
 * guest keeps one profile and one photo. A new name creates them on save.
 */
export default function GuestPicker({ options, selected }: Props) {
  const [guests, setGuests] = useState<GuestOption[]>(selected);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(
    () => new Set(guests.map((g) => g.name.toLowerCase())),
    [guests]
  );

  const matches = useMemo(() => {
    const term = draft.trim().toLowerCase();
    return options
      .filter((o) => !chosen.has(o.name.toLowerCase()))
      .filter((o) => !term || o.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [draft, options, chosen]);

  const exactExists = options.some(
    (o) => o.name.toLowerCase() === draft.trim().toLowerCase()
  );
  const canCreate = draft.trim().length > 1 && !exactExists && !chosen.has(draft.trim().toLowerCase());

  // Close when focus or a click leaves the component.
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const add = (option?: GuestOption) => {
    const name = (option?.name ?? draft).trim();
    if (!name || chosen.has(name.toLowerCase())) return;

    const existing =
      option ?? options.find((o) => o.name.toLowerCase() === name.toLowerCase());

    setGuests([...guests, existing ?? { id: '', name, title: null, imageUrl: null }]);
    setDraft('');
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  const remove = (name: string) =>
    setGuests(guests.filter((g) => g.name !== name));

  const onKeyDown = (event: KeyboardEvent) => {
    const count = matches.length + (canCreate ? 1 : 0);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (count === 0 ? 0 : (i + 1) % count));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (count === 0 ? 0 : (i - 1 + count) % count));
    } else if (event.key === 'Enter') {
      // Never let Enter submit the whole episode form from this field.
      event.preventDefault();
      if (open && active < matches.length) add(matches[active]);
      else add();
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Backspace' && draft === '' && guests.length > 0) {
      remove(guests[guests.length - 1].name);
    }
  };

  const newGuests = guests.filter((g) => !g.id);

  return (
    <div class="admin-field" ref={rootRef}>
      <span class="admin-legend" id="guest-label">
        Guests
      </span>

      <div class="combo">
        {guests.length > 0 && (
          <ul class="guest-list">
            {guests.map((guest) => {
              const { letters, hue } = monogram(guest.name);
              return (
                <li class="guest-chip" key={guest.name}>
                  {guest.imageUrl ? (
                    <img src={guest.imageUrl} alt="" />
                  ) : (
                    <span
                      class="guest-mono"
                      style={`background:hsl(${hue} 58% 52%)`}
                      aria-hidden="true"
                    >
                      {letters}
                    </span>
                  )}
                  <span>{guest.name}</span>
                  {!guest.id && <em class="guest-new">new</em>}
                  <button
                    type="button"
                    onClick={() => remove(guest.name)}
                    aria-label={`Remove ${guest.name}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div class="combo-input">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="guest-listbox"
            aria-autocomplete="list"
            aria-labelledby="guest-label"
            placeholder="Type a guest's name…"
            value={draft}
            onInput={(e) => {
              setDraft((e.target as HTMLInputElement).value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          <button class="btn-admin" type="button" onClick={() => add()} disabled={!draft.trim()}>
            Add
          </button>
        </div>

        {open && (matches.length > 0 || canCreate) && (
          <ul class="combo-list" id="guest-listbox" role="listbox">
            {matches.map((option, index) => {
              const { letters, hue } = monogram(option.name);
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={index === active}
                  class={`combo-option${index === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(option);
                  }}
                >
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" />
                  ) : (
                    <span class="guest-mono" style={`background:hsl(${hue} 58% 52%)`} aria-hidden="true">
                      {letters}
                    </span>
                  )}
                  <span class="combo-text">
                    <strong>{option.name}</strong>
                    {option.title && <small>{option.title}</small>}
                  </span>
                </li>
              );
            })}

            {canCreate && (
              <li
                role="option"
                aria-selected={active === matches.length}
                class={`combo-option is-create${active === matches.length ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(matches.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add();
                }}
              >
                <span class="guest-mono is-plus" aria-hidden="true">
                  +
                </span>
                <span class="combo-text">
                  <strong>Add “{draft.trim()}”</strong>
                  <small>Creates a new guest</small>
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <p class="help">
        Guests who have been on the show before will autocomplete and keep their
        existing photo. Press Enter to add, Backspace to remove the last one.
      </p>

      {newGuests.length > 0 && (
        <div class="guest-new-block">
          <p class="help" style="margin:0 0 10px">
            {newGuests.length === 1 ? 'This guest is' : 'These guests are'} new. Add a
            photo now, or later from Hosts &amp; Guests.
          </p>
          {newGuests.map((guest) => (
            <div class="admin-field" key={guest.name} style="margin-bottom:10px">
              <label for={`guest-photo-${guest.name}`}>{guest.name} — photo URL</label>
              <input
                id={`guest-photo-${guest.name}`}
                type="url"
                name={`guestPhoto:${guest.name}`}
                placeholder="https://… (optional)"
              />
            </div>
          ))}
        </div>
      )}

      {guests.map((guest) => (
        <input type="hidden" name="guestName" value={guest.name} key={`h-${guest.name}`} />
      ))}
    </div>
  );
}

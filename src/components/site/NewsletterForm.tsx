import { useState } from 'preact/hooks';

type Props = {
  buttonText: string;
  placeholder?: string;
  /** Styles for a form sitting on a coloured band (dark text). */
  onAccent?: boolean;
};

export default function NewsletterForm({
  buttonText,
  placeholder = 'Enter your email address',
  onAccent = true
}: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (busy) return;

    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));

    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        setDone(true);
        setMessage("You're on the list. Watch your inbox for new episodes.");
      } else {
        setMessage(
          body?.error?.message ?? 'Something went wrong. Please try again.'
        );
      }
    } catch {
      setMessage('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = onAccent
    ? 'w-full rounded-full border-0 bg-white px-5 py-3.5 text-base text-[#070b2b] placeholder:text-[#070b2b]/50 focus:ring-2 focus:ring-[#070b2b]/40'
    : 'input w-full rounded-full';

  if (done) {
    return (
      <p class="text-base font-semibold" role="status">
        {message}
      </p>
    );
  }

  return (
    <form class="flex flex-col gap-3" onSubmit={submit}>
      {message && (
        <p class="text-sm font-semibold" role="alert">
          {message}
        </p>
      )}

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        class="hidden"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <label class="sr-only" for="newsletter-email">
        Email address
      </label>
      <input
        id="newsletter-email"
        class={inputClass}
        type="email"
        name="email"
        placeholder={placeholder}
        autoComplete="email"
        required
      />

      <button
        class={`pill ${onAccent ? 'pill-ink' : 'pill-primary'} self-start`}
        type="submit"
        disabled={busy}
      >
        {busy ? 'Sending…' : buttonText}
      </button>
    </form>
  );
}

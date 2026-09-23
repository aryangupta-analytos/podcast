import { useState } from 'preact/hooks';

type Props = { initialMessage?: string };

export default function ContactForm({ initialMessage = '' }: Props) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setResponseMessage('Thanks — your message is on its way.');
        setFormSubmitted(true);
      } else {
        setResponseMessage(
          data?.error?.message ?? 'Something went wrong. Please try again.'
        );
      }
    } catch {
      setResponseMessage('Could not reach the server. Please try again.');
    }
  }

  return (
    <>
      {formSubmitted ? (
        `${responseMessage}`
      ) : (
        <form class="flex flex-col gap-2" onSubmit={submit}>
          {responseMessage && (
            <p class="text-sm text-red-400" role="alert">
              {responseMessage}
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

          <input
            class="input"
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            required
          />
          <input
            class="input"
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            required
          />

          <textarea
            class="input"
            id="message"
            name="message"
            placeholder="Write a message"
            required
          >{initialMessage}</textarea>

          <div class="my-6 flex w-full justify-end">
            <button class="pill pill-primary w-full lg:w-auto" type="submit">
              Send message
            </button>
          </div>
        </form>
      )}
    </>
  );
}

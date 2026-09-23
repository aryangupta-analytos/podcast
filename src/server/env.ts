/**
 * Single place that reads environment variables. Server-only — importing this
 * from a client component is a build error, which is the point: none of these
 * values may ever reach the browser.
 */

function read(name: string): string | undefined {
  // Astro exposes env through import.meta.env at build time and process.env at
  // runtime on Node/Vercel. Prefer the runtime value so a redeploy is not
  // needed to rotate a secret.
  const fromProcess =
    typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (fromProcess != null && fromProcess !== '') return fromProcess;

  // `import.meta.env` only exists under Vite. Standalone scripts run through
  // tsx, where it is undefined, so this must not be dereferenced blindly.
  const viteEnv = import.meta.env as Record<string, string | undefined> | undefined;
  const fromImport = viteEnv?.[name];
  return fromImport != null && fromImport !== '' ? fromImport : undefined;
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  get databaseUrl() {
    return required('DATABASE_URL');
  },
  get sessionSecret() {
    const secret = required('SESSION_SECRET');
    if (secret.length < 32) {
      throw new Error(
        '[env] SESSION_SECRET must be at least 32 characters. Generate one with:\n' +
          '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
      );
    }
    if (secret === 'replace-me-with-a-long-random-string') {
      throw new Error(
        '[env] SESSION_SECRET is still the placeholder from .env.example. Replace it.'
      );
    }
    return secret;
  },
  get siteUrl() {
    return read('PUBLIC_SITE_URL') ?? 'http://localhost:4321';
  },
  get isProduction() {
    return read('NODE_ENV') === 'production' || read('VERCEL') === '1';
  },

  // Storage
  get storageDriver(): 'local' | 's3' {
    return read('STORAGE_DRIVER') === 's3' ? 's3' : 'local';
  },
  get storageLocalDir() {
    return read('STORAGE_LOCAL_DIR') ?? './storage/uploads';
  },
  get s3() {
    return {
      bucket: read('S3_BUCKET'),
      region: read('S3_REGION') ?? 'auto',
      endpoint: read('S3_ENDPOINT'),
      accessKeyId: read('S3_ACCESS_KEY_ID'),
      secretAccessKey: read('S3_SECRET_ACCESS_KEY'),
      publicUrl: read('S3_PUBLIC_URL')
    };
  },
  get maxAudioBytes() {
    return int('MAX_AUDIO_BYTES', 500 * 1024 * 1024);
  },
  get maxImageBytes() {
    return int('MAX_IMAGE_BYTES', 10 * 1024 * 1024);
  },

  /** Google Apps Script web app that copies contact messages into a sheet. */
  get leadsWebhookUrl() {
    return read('LEADS_WEBHOOK_URL');
  },
  get leadsWebhookSecret() {
    return read('LEADS_WEBHOOK_SECRET');
  },

  get discordWebhook() {
    return read('DISCORD_WEBHOOK');
  }
};

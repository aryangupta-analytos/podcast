/// <reference types="astro/client" />

import type { SessionUser } from './server/auth/session';

declare global {
  namespace App {
    interface Locals {
      /** The signed-in admin user, or null. Set by src/middleware.ts. */
      user: SessionUser | null;
    }
  }
}

export {};

// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      // better-auth
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;
      // admin user email(s) separated by comma (,)
      ADMIN_EMAILS: string;
      // stripe api key and webhook (optional)
      STRIPE_API_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      // public app url
      NEXT_PUBLIC_APP_URL: string;
    }
  }
}

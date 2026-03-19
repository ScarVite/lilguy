import * as Sentry from '@sentry/node';

const isDev = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';

export function initSentry() {
  if (!isProduction) {
    console.log('Sentry disabled (not production)');
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('SENTRY_DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });

  console.log('Sentry initialized');
}

export const logger = {
  info(message: string, data?: any) {
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      data,
      level: 'info',
    });

    if (isDev) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },

  debug(message: string, data?: any) {
    Sentry.addBreadcrumb({
      category: 'debug',
      message,
      data,
      level: 'debug',
    });

    if (isDev) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },

  warn(message: string, data?: any) {
    Sentry.addBreadcrumb({
      category: 'warning',
      message,
      data,
      level: 'warning',
    });

    console.warn(`[WARN] ${message}`, data || '');
  },

  error(message: string, error?: Error | any, data?: any) {
    Sentry.addBreadcrumb({
      category: 'error',
      message,
      data: { ...data, error: error?.message },
      level: 'error',
    });

    console.error(`[ERROR] ${message}`, error || '');

    if (isProduction && error) {
      Sentry.captureException(error, {
        contexts: {
          details: { message, ...data },
        },
      });
    }
  },
};

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.initSentry = initSentry;
const Sentry = __importStar(require("@sentry/node"));
const isDev = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';
function initSentry() {
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
exports.logger = {
    info(message, data) {
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
    debug(message, data) {
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
    warn(message, data) {
        Sentry.addBreadcrumb({
            category: 'warning',
            message,
            data,
            level: 'warning',
        });
        console.warn(`[WARN] ${message}`, data || '');
    },
    error(message, error, data) {
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

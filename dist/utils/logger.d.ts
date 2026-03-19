export declare function initSentry(): void;
export declare const logger: {
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error | any, data?: any): void;
};

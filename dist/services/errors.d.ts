export type ConversionErrorCode = "CONFIGURATION" | "INVALID_URL" | "UNSUPPORTED_RESOURCE" | "UPSTREAM_FAILURE" | "UPSTREAM_TIMEOUT";
export declare class ConversionError extends Error {
    readonly code: ConversionErrorCode;
    readonly userMessage: string;
    constructor(code: ConversionErrorCode, userMessage: string, options?: ErrorOptions);
}
export declare function userMessageForError(error: unknown): string;

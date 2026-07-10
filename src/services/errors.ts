export type ConversionErrorCode =
  | "CONFIGURATION"
  | "INVALID_URL"
  | "UNSUPPORTED_RESOURCE"
  | "UPSTREAM_FAILURE"
  | "UPSTREAM_TIMEOUT";

export class ConversionError extends Error {
  constructor(
    public readonly code: ConversionErrorCode,
    public readonly userMessage: string,
    options?: ErrorOptions,
  ) {
    super(userMessage, options);
    this.name = "ConversionError";
  }
}

export function userMessageForError(error: unknown): string {
  if (error instanceof ConversionError) return error.userMessage;
  return "Something went wrong while converting that link. Please try again shortly.";
}

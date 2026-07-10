"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionError = void 0;
exports.userMessageForError = userMessageForError;
class ConversionError extends Error {
    code;
    userMessage;
    constructor(code, userMessage, options) {
        super(userMessage, options);
        this.code = code;
        this.userMessage = userMessage;
        this.name = "ConversionError";
    }
}
exports.ConversionError = ConversionError;
function userMessageForError(error) {
    if (error instanceof ConversionError)
        return error.userMessage;
    return "Something went wrong while converting that link. Please try again shortly.";
}

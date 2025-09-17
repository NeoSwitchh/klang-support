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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
function activate(context) {
    const formatter = vscode.languages.registerDocumentFormattingEditProvider({ language: "klang" }, {
        provideDocumentFormattingEdits(document) {
            const edits = [];
            const lines = [];
            for (let i = 0; i < document.lineCount; i++) {
                lines.push(document.lineAt(i).text);
            }
            const formatted = [...lines];
            let inImageBlock = false;
            let inCommentBlock = false;
            // Work block by block
            let buffer = [];
            const flushBuffer = () => {
                if (buffer.length === 0)
                    return;
                // find column widths
                const colWidths = [];
                buffer.forEach(({ tokens }) => {
                    tokens.forEach((t, i) => {
                        colWidths[i] = Math.max(colWidths[i] || 0, t.length);
                    });
                });
                // rebuild lines
                buffer.forEach(({ index, tokens }) => {
                    const rebuilt = tokens
                        .map((t, i) => t.padEnd(colWidths[i] + 4, " "))
                        .join("")
                        .trimEnd();
                    if (rebuilt !== lines[index]) {
                        formatted[index] = rebuilt;
                    }
                });
                buffer = [];
            };
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // --- IMAGE block handling ---
                if (/^IMAGE\s*\(/i.test(line)) {
                    flushBuffer();
                    inImageBlock = true;
                    continue;
                }
                if (inImageBlock && line.trim().startsWith("\\")) {
                    inImageBlock = false;
                    continue;
                }
                if (inImageBlock) {
                    continue;
                }
                // --- COMMENT block handling ---
                if (/\/\*/.test(line) && !/\*\//.test(line)) {
                    flushBuffer();
                    inCommentBlock = true;
                    continue;
                }
                if (inCommentBlock && /\*\//.test(line)) {
                    inCommentBlock = false;
                    continue;
                }
                if (inCommentBlock) {
                    continue;
                }
                // --- CONTINUATION lines (like DFALT_SCAN values) ---
                if (/^\s+[A-Za-z0-9"]/.test(line)) {
                    flushBuffer(); // end any alignment group before this
                    continue; // leave continuation lines as-is
                }
                // --- normal alignment logic ---
                const tokens = line.trim().split(/\s+/);
                if (tokens.length > 1) {
                    buffer.push({ index: i, tokens });
                }
                else {
                    flushBuffer();
                }
            }
            flushBuffer();
            // build edits
            for (let i = 0; i < lines.length; i++) {
                if (formatted[i] !== lines[i]) {
                    edits.push(vscode.TextEdit.replace(document.lineAt(i).range, formatted[i]));
                }
            }
            return edits;
        },
    });
    context.subscriptions.push(formatter);
}
function deactivate() { }

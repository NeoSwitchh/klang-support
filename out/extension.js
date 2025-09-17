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
    let disposable = vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: "klang" }, {
        provideDocumentFormattingEdits(document) {
            const edits = [];
            const lines = [];
            const buffer = [];
            let inImageBlock = false;
            let inCommentBlock = false;
            let inContinuationBlock = false;
            let inBlock = false;
            function flushBuffer() {
                if (buffer.length === 0)
                    return;
                const colWidths = [];
                for (const { tokens } of buffer) {
                    tokens.forEach((t, idx) => {
                        colWidths[idx] = Math.max(colWidths[idx] || 0, t.length);
                    });
                }
                for (const { index, tokens, inBlock } of buffer) {
                    const prefix = inBlock ? "\t" : "";
                    const newLine = prefix +
                        tokens
                            .map((t, idx) => t.padEnd(colWidths[idx] + (idx < tokens.length - 1 ? 4 : 0)))
                            .join("");
                    lines[index] = newLine.trimEnd();
                }
                buffer.length = 0;
            }
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i).text;
                // detect IMAGE start
                if (/^IMAGE\s*\(/i.test(line)) {
                    flushBuffer();
                    inImageBlock = true;
                    lines.push(line);
                    continue;
                }
                // detect IMAGE end (\--- type lines)
                if (inImageBlock && line.trim().startsWith("\\")) {
                    inImageBlock = false;
                    lines.push(line);
                    continue;
                }
                if (inImageBlock) {
                    lines.push(line);
                    continue;
                }
                // detect comment start
                if (/\/\*/.test(line)) {
                    flushBuffer();
                    inCommentBlock = true;
                    lines.push(line);
                    continue;
                }
                if (inCommentBlock) {
                    lines.push(line);
                    if (/\*\//.test(line)) {
                        inCommentBlock = false;
                    }
                    continue;
                }
                // detect block starts
                if (/^(DEFAULTS|CALCS|PGM_FIELDS|LOCAL)\b/i.test(line)) {
                    flushBuffer();
                    inBlock = true;
                    lines.push(line);
                    continue;
                }
                // detect flat declarations
                if (/^(SCREEN|SCR_|SUBFILE|SFL_|POSTING|PST_)/i.test(line)) {
                    flushBuffer();
                    inBlock = false;
                    lines.push(line);
                    continue;
                }
                // detect continuation lines (like psmgoldrh DFALT_SCAN)
                if (/^\s{40,}/.test(line)) {
                    flushBuffer();
                    lines.push(line); // preserve as-is
                    inContinuationBlock = true;
                    continue;
                }
                else {
                    inContinuationBlock = false;
                }
                // tokenize non-empty code lines
                const tokens = line.trim().split(/\s+/);
                if (tokens.length > 1) {
                    buffer.push({ index: lines.length, tokens, inBlock });
                    lines.push(""); // placeholder
                }
                else {
                    flushBuffer(); // blank or single-word line: flush alignment
                    lines.push(line);
                }
            }
            flushBuffer();
            for (let i = 0; i < document.lineCount; i++) {
                if (lines[i] !== undefined && lines[i] !== document.lineAt(i).text) {
                    edits.push(vscode.TextEdit.replace(document.lineAt(i).range, lines[i]));
                }
            }
            return edits;
        },
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }

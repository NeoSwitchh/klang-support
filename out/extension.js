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
let formatterEnabled = false; // global flag to enable/disable formatter
function activate(context) {
    // 🟦 1. Toggle formatter enable/disable
    const toggleFormatterDisposable = vscode.commands.registerCommand("klang-formatter.toggle", () => {
        formatterEnabled = !formatterEnabled;
        vscode.window.showInformationMessage(`Klang Formatter ${formatterEnabled ? "Enabled" : "Disabled"}`);
    });
    context.subscriptions.push(toggleFormatterDisposable);
    // 🟩 2. Register formatter
    const formatDisposable = vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: "klang" }, {
        provideDocumentFormattingEdits(document) {
            if (!formatterEnabled)
                return []; // respect toggle
            const edits = [];
            const lines = [];
            const buffer = [];
            let inImageBlock = false;
            let inCommentBlock = false;
            let inContinuationBlock = false;
            let currentColCount = 1;
            function flushBuffer() {
                if (buffer.length === 0)
                    return;
                // find max width per column
                const colWidths = [];
                for (const { tokens } of buffer) {
                    tokens.forEach((t, idx) => {
                        if (idx < currentColCount) {
                            colWidths[idx] = Math.max(colWidths[idx] || 0, t.length);
                        }
                    });
                }
                for (const { index, tokens, colCount } of buffer) {
                    let newLine = "";
                    if (colCount === 1) {
                        newLine = tokens.join(" ");
                    }
                    else {
                        newLine = tokens
                            .map((t, idx) => {
                            if (idx < colCount - 1) {
                                return t.padEnd(colWidths[idx] + 4);
                            }
                            return t;
                        })
                            .join("");
                    }
                    lines[index] = newLine.trimEnd();
                }
                buffer.length = 0;
            }
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i).text;
                // detect IMAGE block
                if (/^IMAGE\s*\(/i.test(line)) {
                    flushBuffer();
                    inImageBlock = true;
                    lines.push(line);
                    continue;
                }
                if (inImageBlock && line.trim().startsWith("\\")) {
                    inImageBlock = false;
                    lines.push(line);
                    continue;
                }
                if (inImageBlock) {
                    lines.push(line);
                    continue;
                }
                // detect comment block
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
                // detect continuation
                if (/^\s{10,}/.test(line)) {
                    flushBuffer();
                    lines.push(line);
                    inContinuationBlock = true;
                    continue;
                }
                else {
                    inContinuationBlock = false;
                }
                // detect block types
                if (/^(FIELD)\b/i.test(line)) {
                    flushBuffer();
                    currentColCount = 4;
                    lines.push(line);
                    continue;
                }
                if (/^(MAP|DEFAULTS|EDITS|LOCAL|PGM_FIELDS|DB_CALCS)\b/i.test(line)) {
                    flushBuffer();
                    currentColCount = 3;
                    lines.push(line);
                    continue;
                }
                if (/^(CALCS)\b/i.test(line)) {
                    flushBuffer();
                    currentColCount = 2;
                    lines.push(line);
                    continue;
                }
                if (/^(SCREEN|SCT_|SCR_|SUBFILE|SFL_|POSTING|PST_)/i.test(line)) {
                    flushBuffer();
                    currentColCount = 1;
                    lines.push(line);
                    continue;
                }
                // align tokens if multiple spaces
                if (/\s{2,}/.test(line)) {
                    const tokens = line
                        .trim()
                        .split(/\s{2,}/)
                        .map((s) => s.trim());
                    buffer.push({
                        index: lines.length,
                        tokens,
                        colCount: currentColCount,
                    });
                    lines.push(""); // placeholder
                }
                else {
                    flushBuffer();
                    lines.push(line);
                }
            }
            flushBuffer();
            for (let i = 0; i < document.lineCount; i++) {
                if (lines[i] !== undefined &&
                    lines[i] !== document.lineAt(i).text) {
                    edits.push(vscode.TextEdit.replace(document.lineAt(i).range, lines[i]));
                }
            }
            return edits;
        },
    });
    context.subscriptions.push(formatDisposable);
    // 🟨 3. Ctrl+/ (Toggle Block Comment per Line)
    const commentToggleDisposable = vscode.commands.registerCommand("klang-formatter.toggleComment", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const document = editor.document;
        const selections = editor.selections;
        editor.edit((editBuilder) => {
            selections.forEach((selection) => {
                if (selection.isEmpty) {
                    // Jika tidak ada seleksi, comment/uncomment baris saat ini
                    const line = document.lineAt(selection.start.line);
                    const lineText = line.text;
                    const trimmedText = lineText.trim();
                    if (trimmedText.startsWith("/*") && trimmedText.endsWith("*/")) {
                        // Uncomment: hapus /* dan */
                        const uncommented = trimmedText.slice(2, -2);
                        editBuilder.replace(line.range, lineText.replace(trimmedText, uncommented));
                    }
                    else {
                        // Comment: tambah /* dan */
                        const commented = `/*${trimmedText}*/`;
                        editBuilder.replace(line.range, lineText.replace(trimmedText, commented));
                    }
                }
                else {
                    // Jika ada seleksi, comment/uncomment teks yang dipilih
                    const selectedText = document.getText(selection);
                    if (selectedText.startsWith("/*") && selectedText.endsWith("*/")) {
                        // Uncomment: hapus /* dan */
                        const uncommented = selectedText.slice(2, -2);
                        editBuilder.replace(selection, uncommented);
                    }
                    else {
                        // Comment: tambah /* dan */
                        const commented = `/*${selectedText}*/`;
                        editBuilder.replace(selection, commented);
                    }
                }
            });
        });
    });
    context.subscriptions.push(commentToggleDisposable);
}
function deactivate() { }

import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	const formatter = vscode.languages.registerDocumentFormattingEditProvider(
		{ language: "klang" },
		{
			provideDocumentFormattingEdits(
				document: vscode.TextDocument
			): vscode.TextEdit[] {
				const edits: vscode.TextEdit[] = [];

				const lines: string[] = [];
				for (let i = 0; i < document.lineCount; i++) {
					lines.push(document.lineAt(i).text);
				}

				const formatted: string[] = [...lines];
				let inImageBlock = false;
				let inCommentBlock = false;

				// Work block by block
				let buffer: { index: number; tokens: string[] }[] = [];

				const flushBuffer = () => {
					if (buffer.length === 0) return;

					// find column widths
					const colWidths: number[] = [];
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
					} else {
						flushBuffer();
					}
				}

				flushBuffer();

				// build edits
				for (let i = 0; i < lines.length; i++) {
					if (formatted[i] !== lines[i]) {
						edits.push(
							vscode.TextEdit.replace(document.lineAt(i).range, formatted[i])
						);
					}
				}

				return edits;
			},
		}
	);

	context.subscriptions.push(formatter);
}

export function deactivate() {}

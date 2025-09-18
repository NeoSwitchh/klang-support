import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		"klang-formatter.format",
		() => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const document = editor.document;
			const selection = editor.selection;

			const start = selection.start.line;
			const end = selection.end.line;

			const lines: string[] = [];
			let buffer: { index: number; tokens: string[]; inBlock: boolean }[] = [];
			let inBlock = false;
			let currentMaxCols = Infinity; // dynamic max columns

			function flushBuffer() {
				if (buffer.length === 0) return;

				const maxWidths: number[] = [];
				for (const { tokens } of buffer) {
					tokens.forEach((t, i) => {
						maxWidths[i] = Math.max(maxWidths[i] || 0, t.length);
					});
				}

				for (const { index, tokens } of buffer) {
					const padded = tokens.map((t, i) =>
						t.padEnd(maxWidths[i] + (i === tokens.length - 1 ? 0 : 2))
					);
					lines[index] = padded.join("");
				}

				buffer = [];
			}

			for (let i = start; i <= end; i++) {
				const line = document.lineAt(i).text;

				// detect block headers → set max columns
				if (/^(SCREEN|SCR_|SUBFILE|SFL_|POSTING|PST_)/i.test(line)) {
					flushBuffer();
					currentMaxCols = 1;
					inBlock = true;
					lines.push(line);
					continue;
				}

				if (/^CALCS\b/i.test(line)) {
					flushBuffer();
					currentMaxCols = 2;
					inBlock = true;
					lines.push(line);
					continue;
				}

				if (/^(MAP|DEFAULTS|EDITS|FIELD)\b/i.test(line)) {
					flushBuffer();
					currentMaxCols = 3;
					inBlock = true;
					lines.push(line);
					continue;
				}

				if (/^(LOCAL|PGM_FIELDS|IMAGE|END)/i.test(line)) {
					flushBuffer();
					currentMaxCols = Infinity; // reset
					inBlock = false;
					lines.push(line);
					continue;
				}

				// process inside block
				if (inBlock && line.trim() !== "") {
					let tokens = line.trim().split(/\s+/);

					if (tokens.length > 1) {
						// limit column count based on current block
						if (currentMaxCols !== Infinity && tokens.length > currentMaxCols) {
							const fixed = tokens.slice(0, currentMaxCols - 1);
							const rest = tokens.slice(currentMaxCols - 1).join(" ");
							tokens = [...fixed, rest];
						}

						buffer.push({ index: lines.length, tokens, inBlock });
						lines.push(""); // placeholder
					} else {
						flushBuffer();
						lines.push(line);
					}
				} else {
					flushBuffer();
					lines.push(line);
				}
			}

			flushBuffer();

			editor.edit((editBuilder) => {
				const range = new vscode.Range(
					new vscode.Position(start, 0),
					new vscode.Position(end, document.lineAt(end).text.length)
				);
				editBuilder.replace(range, lines.join("\n"));
			});
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}

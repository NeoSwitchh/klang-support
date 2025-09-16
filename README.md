# Klang Language Support

Language syntax highlighting for **Klang (K-System)**, a proprietary language used in business applications.
This extension provides semantic highlighting for Klang source files, including comments, functions, keywords, and UI definitions.

---

## ✨ Features

- Syntax highlighting for Klang:
  - `/* ... */` block comments
  - Functions starting with `ap_XXX`
  - Directives and constants like `SFL_XXX`, `SCR_XXX`
  - `IMAGE(...)` blocks and UI definitions
  - `SCREEN`, `LOCAL`, `MAP`, and other core keywords
- Semantic scopes follow [TextMate conventions](https://macromates.com/manual/en/language_grammars):
  - Comments → `comment.block.klang`
  - Functions → `entity.name.function.klang`
  - Keywords → `keyword.control.klang`
  - Constants (SFL/SCR) → `support.constant.klang`
  - Strings → `string.quoted.klang`
- Works with **any VSCode theme** — colors will automatically adapt.

---

## 📦 Installation

### From Source

1. Clone this repository:

   ```bash
   git clone https://github.com/neoswitchh/klang-support
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build and package the extension:

   ```bash
   vsce package
   ```

4. Install the generated `.vsix`:

   ```bash
   code --install-extension klang-support-0.0.1.vsix
   ```

### Manual Install (Drop-in Folder) (currently, recommended)

Alternatively, you can copy the extension folder into:

- **macOS/Linux**: `~/.vscode/extensions`

Then run this in `~/.vscode/extensions`:

```
mv klang-support ~/.vscode/extensions/neoswitchh.klang-support-0.0.1
```

Then reload VSCode.

---

## 📂 File Association

Klang doesn’t use file extensions. Instead, it uses filenames like `sct999`, `sct1234`, etc.
This extension automatically associates any file named:

```
sct[0-9]{3,4}
```

with the Klang language.

---

## 🛠 Usage

Open any Klang source file (e.g., `sct999`) and you’ll get syntax highlighting out of the box.
No configuration required.

---

## 🤝 Contributing

Pull requests are welcome!
If you’d like to improve the grammar (add more keywords, functions, or directives):

1. Edit `syntaxes/klang.tmLanguage.json`
2. Test using `Developer: Inspect Editor Tokens and Scopes` in VSCode
3. Submit a PR

---

## 📜 License

MIT © 2025 NeoSwitchh

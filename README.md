# Clean PDF Processor Pro

### An open-source initiative by Anabhay Ventures

Bring your PDFs together with a clean, ad-free Chrome extension. Select or drop multiple PDFs, arrange their order, and download one merged document—all on your own device.

## The Philosophy

Free PDF tools too often compromise privacy through server uploads and bury simple tasks under ads. We believe practical software should respect your time and your data.

Clean PDF Processor Pro processes PDFs **100% locally** using the bundled `pdf-lib` library, with **zero data tracking**. Your PDFs are read and merged in the extension, without uploading their contents to a server. There are no ads, analytics, accounts, or runtime CDN requests.

## Features

- Drag and drop multiple PDFs or browse for files.
- Reorder or remove files before merging.
- Merge pages sequentially into `merged.pdf` and start the download automatically.
- See processing progress and helpful errors for damaged or password-protected PDFs.
- Work offline with a locally bundled library compatible with Manifest V3.

This release supports PDF merging. Compression is not included. Keep the popup open until the download starts; very large PDFs may exceed available browser memory. Merging copies pages and does not preserve every document-level feature, such as bookmarks or digital signatures.

## Installation

1. Download and extract this repository, or clone it with `git clone <repository-url>`.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the **`ad-free-pdf-tools`** folder inside this repository (the folder containing `manifest.json`).
5. Pin **Clean PDF Processor Pro**, open it, and add at least two PDFs. Check their order and click **Merge PDFs**.

## Development

No build step or package installation is required. Edit `ad-free-pdf-tools/popup.html`, `popup.css`, or `popup.js`, then reload the extension from `chrome://extensions/`.

`pdf-lib` 1.17.1 is bundled in `ad-free-pdf-tools/vendor/`. Its upstream source is [pdf-lib](https://github.com/Hopding/pdf-lib); its MIT license is included alongside the library. Manifest V3 requires extension scripts to be packaged locally.

## License

Released under the [MIT License](LICENSE). Third-party license notices are retained in the vendor folder.

## About Us

**Anabhay Ventures builds practical software, intelligent systems, and custom internal tools.** We turn everyday operational challenges into useful, focused products.

Have a workflow worth simplifying or an idea ready to build? **[Visit Anabhay Ventures](https://anabhay.in/)** and explore what we can create together.

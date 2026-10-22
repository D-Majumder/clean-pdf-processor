# Clean PDF Processor Pro

Version 2.0. An open-source Chrome extension by Anabhay Ventures for editing PDFs on your device.

## Features

All four operations run locally in the browser using the bundled `pdf-lib` library. Zero server uploads. No tracking, ads, accounts, or runtime CDN requests.

- **Merge:** Combine multiple PDFs in the order shown. Use the arrows to reorder files.
- **Split:** Extract selected pages into a new PDF without changing the source.
- **Rotate:** Rotate selected pages, or the entire document, 90 degrees clockwise per click.
- **Delete:** Remove selected pages from a document. At least one page must remain.

Enter page numbers such as `1,3-5` in a file's Pages field. Leave it blank, or enter `all`, to select every page. Page numbers refer to the current document after edits. Extracted pages follow the entered order; repeated page numbers are included once.

Rotate and Delete update the copy held in the popup. Click **Save PDF** to download that file, or **Merge PDFs** to combine the edited files. Deleting pages clears the selection because the remaining pages are renumbered. The × button removes a whole file from the list. Files on disk are never overwritten.

## Installation

1. Download and extract this repository, or clone it:
   `git clone https://github.com/D-Majumder/clean-pdf-processor.git`
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `ad-free-pdf-tools` folder containing `manifest.json`.
5. Open the extension from Chrome's toolbar and add your PDFs.

For an existing installation, click **Reload** on the extension card after updating the files.

Keep the popup open until processing and the download request finish. Closing it discards the files and edits held in memory. Large PDFs can exceed browser memory. Password-protected and damaged PDFs are not supported. Page copying does not preserve every document-level feature, including bookmarks and digital signatures. Compression is not included.

## Development

No build step is required. Edit the files in `ad-free-pdf-tools/`, then reload the extension. Run `node --test tests/pdf-operations.test.cjs` to check the PDF operations and page selection rules.

`pdf-lib` 1.17.1 is bundled in `ad-free-pdf-tools/vendor/` because Manifest V3 requires packaged scripts. Its [source](https://github.com/Hopding/pdf-lib) and MIT license are available; the license is also included beside the bundled library. This project uses the [MIT License](LICENSE).

## About Anabhay Ventures

[Anabhay Ventures](https://anabhay.in/) builds practical software, intelligent systems, and custom internal tools. Visit the site to learn about our work or discuss a project.

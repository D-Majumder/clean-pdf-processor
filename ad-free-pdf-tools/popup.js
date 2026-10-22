/* pdf-lib is bundled locally because Manifest V3 forbids CDN scripts. */
"use strict";

const input = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const list = document.getElementById("file-list");
const count = document.getElementById("file-count");
const clearButton = document.getElementById("clear-button");
const mergeButton = document.getElementById("merge-button");
const mergeLabel = document.getElementById("merge-label");
const spinner = document.querySelector(".spinner");
const status = document.getElementById("status");
let files = [];
let processing = false;

function showStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function render() {
  list.replaceChildren();
  count.textContent = files.length ? `${files.length} PDF${files.length === 1 ? "" : "s"} selected` : "No files selected";
  files.forEach((file, index) => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = `${index + 1}. ${file.name}`;
    name.title = file.name;
    row.append(name);
    for (const [symbol, label, action, disabled] of [
      ["↑", "Move up", () => move(index, -1), index === 0],
      ["↓", "Move down", () => move(index, 1), index === files.length - 1],
      ["×", "Remove", () => { files.splice(index, 1); render(); }, false]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "file-action";
      button.textContent = symbol;
      button.setAttribute("aria-label", `${label}: ${file.name}`);
      button.disabled = processing || disabled;
      button.addEventListener("click", action);
      row.append(button);
    }
    list.append(row);
  });
  input.disabled = processing;
  clearButton.disabled = processing || !files.length;
  mergeButton.disabled = processing || files.length < 2;
  mergeButton.setAttribute("aria-busy", String(processing));
  dropZone.setAttribute("aria-disabled", String(processing));
  spinner.hidden = !processing;
  if (!processing) mergeLabel.textContent = "Merge PDFs";
}

function move(index, direction) {
  [files[index], files[index + direction]] = [files[index + direction], files[index]];
  render();
}

function addFiles(incoming) {
  if (processing) return;
  const rejected = [];
  for (const file of incoming) {
    if (!/\.pdf$/i.test(file.name) || !file.size) {
      rejected.push(file.name);
    } else {
      files.push(file);
    }
  }
  render();
  showStatus(rejected.length ? `Skipped empty or non-PDF files: ${rejected.join(", ")}` : "Files ready. Check the order, then merge.", rejected.length > 0);
}

input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    if (!processing) dropZone.classList.add("drag-over");
  });
}
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
// Prevent dropped files outside the target from navigating the popup.
document.addEventListener("dragover", event => event.preventDefault());
document.addEventListener("drop", event => event.preventDefault());
dropZone.addEventListener("drop", event => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles(event.dataTransfer.files);
});
clearButton.addEventListener("click", () => {
  files = [];
  render();
  showStatus("Add at least two PDFs to get started.");
});

mergeButton.addEventListener("click", async () => {
  if (processing || files.length < 2) return;
  processing = true;
  render();
  showStatus("Merging locally. Keep this popup open…");
  try {
    if (!globalThis.PDFLib) throw new Error("The PDF library could not load. Check that vendor/pdf-lib.min.js is included in the extension.");
    const merged = await PDFLib.PDFDocument.create();
    for (const [index, file] of files.entries()) {
      mergeLabel.textContent = `Merging ${index + 1} of ${files.length}…`;
      // Give Chrome a chance to paint the progress before processing each file.
      await new Promise(resolve => setTimeout(resolve, 0));
      try {
        const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach(page => merged.addPage(page));
      } catch (error) {
        console.error("PDF read failed", error);
        throw new Error(`Could not read “${file.name}”. It may be password-protected, damaged, or unsupported. Remove it and try again.`);
      }
    }
    if (!merged.getPageCount()) throw new Error("The selected PDFs contain no pages to merge.");
    mergeLabel.textContent = "Preparing download…";
    const bytes = await merged.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "merged.pdf";
    document.body.append(link);
    try { link.click(); } finally {
      link.remove();
      // Allow the browser to consume the blob before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    showStatus(`Download requested: merged.pdf (${merged.getPageCount()} pages).`);
  } catch (error) {
    console.error("PDF merge failed", error);
    showStatus(error.message || "Unable to merge these PDFs. Try fewer or smaller files.", true);
  } finally {
    processing = false;
    render();
  }
});

render();

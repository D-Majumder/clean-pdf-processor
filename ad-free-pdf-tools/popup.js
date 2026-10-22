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
    const heading = document.createElement("div");
    heading.className = "file-heading";
    heading.append(name);
    row.append(heading);
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
      heading.append(button);
    }
    const selection = document.createElement("label");
    selection.className = "page-selection";
    selection.textContent = file.pageCount ? `Pages (${file.pageCount} total)` : "Pages";
    const range = document.createElement("input");
    range.type = "text";
    range.placeholder = "All pages, or e.g. 1,3-5";
    range.value = file.range;
    range.disabled = processing;
    range.setAttribute("aria-label", `Page selection for ${file.name}`);
    range.addEventListener("input", () => { file.range = range.value; });
    selection.append(range);
    row.append(selection);
    const toolbar = document.createElement("div");
    toolbar.className = "file-toolbar";
    for (const [label, operation] of [["↻ Rotate 90°", "rotate"], ["− Delete pages", "delete"], ["✂ Extract/Split", "split"], ["↓ Save PDF", "save"]]) {
      const tool = document.createElement("button");
      tool.type = "button";
      tool.className = "file-action";
      tool.textContent = label;
      tool.setAttribute("aria-label", `${label}: ${file.name}`);
      tool.disabled = processing;
      tool.addEventListener("click", () => processFile(file, operation));
      toolbar.append(tool);
    }
    row.append(toolbar);
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
      files.push({ name: file.name, range: "", pageCount: null, arrayBuffer: () => file.arrayBuffer() });
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
  showStatus("Add PDFs to edit, extract, or merge.");
});

// Page numbers in the UI are one-based; pdf-lib uses zero-based indexes.
function parsePages(value, pageCount) {
  const text = value.trim();
  if (!text || text.toLowerCase() === "all") return Array.from({ length: pageCount }, (_, i) => i);
  const selected = new Set();
  for (const part of text.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Use page numbers such as 1,3-5, or leave blank for all pages.");
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > pageCount) {
      throw new Error(`Choose pages between 1 and ${pageCount}, with ranges in ascending order.`);
    }
    for (let page = start; page <= end; page++) selected.add(page - 1);
  }
  return [...selected];
}

function rotatePages(pdfDoc, indexes) {
  for (const index of indexes) {
    const page = pdfDoc.getPage(index);
    page.setRotation(PDFLib.degrees((page.getRotation().angle + 90) % 360));
  }
}

function deletePages(pdfDoc, indexes) {
  const unique = [...new Set(indexes)];
  if (unique.length >= pdfDoc.getPageCount()) throw new Error("Keep at least one page. To remove the file, use × beside its name.");
  // Remove from the end so earlier indexes remain valid.
  unique.sort((a, b) => b - a).forEach(index => pdfDoc.removePage(index));
}

async function splitPages(pdfDoc, indexes) {
  const extracted = await PDFLib.PDFDocument.create();
  const pages = await extracted.copyPages(pdfDoc, indexes);
  pages.forEach(page => extracted.addPage(page));
  return extracted;
}

function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try { link.click(); } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

async function processFile(file, operation) {
  if (processing) return;
  processing = true;
  render();
  mergeLabel.textContent = "Processing PDF…";
  showStatus(`Processing “${file.name}” locally…`);
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!globalThis.PDFLib) throw new Error("The local PDF library is missing. Reload the extension.");
    let pdfDoc;
    try { pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer()); }
    catch { throw new Error(`Could not read “${file.name}”. It may be password-protected, damaged, or unsupported.`); }
    if (!pdfDoc.getPageCount()) throw new Error("This PDF has no pages.");
    file.pageCount = pdfDoc.getPageCount();
    const indexes = operation === "save" ? [] : parsePages(file.range, pdfDoc.getPageCount());
    const base = file.name.replace(/\.pdf$/i, "");
    if (operation === "split") {
      const extracted = await splitPages(pdfDoc, indexes);
      downloadPdf(await extracted.save(), `${base}-extracted.pdf`);
      showStatus(`Download requested: ${base}-extracted.pdf (${indexes.length} pages). Source unchanged.`);
    } else if (operation === "save") {
      downloadPdf(await pdfDoc.save(), `${base}-edited.pdf`);
      showStatus(`Download requested: ${base}-edited.pdf.`);
    } else {
      if (operation === "rotate") rotatePages(pdfDoc, indexes);
      else if (operation === "delete") deletePages(pdfDoc, indexes);
      // Commit edits only after serialization succeeds. Original disk files stay untouched.
      const bytes = await pdfDoc.save();
      file.arrayBuffer = async () => bytes;
      file.pageCount = pdfDoc.getPageCount();
      if (operation === "delete") file.range = "";
      showStatus(`${operation === "rotate" ? "Rotated" : "Deleted"} ${indexes.length} page(s) in “${file.name}”. Use Save PDF or merge to download your edits.`);
    }
  } catch (error) {
    console.error("PDF operation failed", error);
    showStatus(error.message || "Unable to process this PDF. Try a smaller file.", true);
  } finally {
    processing = false;
    render();
  }
}

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
    downloadPdf(bytes, "merged.pdf");
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

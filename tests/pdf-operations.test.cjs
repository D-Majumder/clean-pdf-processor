const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const PDFLib = require('../ad-free-pdf-tools/vendor/pdf-lib.min.js');
const element = () => ({
  addEventListener() {}, replaceChildren() {}, setAttribute() {},
  classList: { toggle() {} }
});
const context = vm.createContext({
  PDFLib, console,
  document: { getElementById: element, querySelector: element, addEventListener() {} }
});
vm.runInContext(fs.readFileSync(require.resolve('../ad-free-pdf-tools/popup.js'), 'utf8'), context);
const indexes = text => Array.from(context.parsePages(text, 4));

test('page selection validates ranges and preserves unique input order', () => {
  assert.deepEqual(indexes(''), [0, 1, 2, 3]);
  assert.deepEqual(indexes('all'), [0, 1, 2, 3]);
  assert.deepEqual(indexes('4,1-2,4'), [3, 0, 1]);
  for (const invalid of ['0', '5', '3-1', '1,', 'a', '1.5', '999999999999999999']) {
    assert.throws(() => indexes(invalid));
  }
});

async function fixture() {
  const doc = await PDFLib.PDFDocument.create();
  for (const width of [100, 200, 300, 400]) doc.addPage([width, 500]);
  return doc;
}

test('rotation respects existing rotation, targets selected pages, and wraps', async () => {
  const doc = await fixture();
  doc.getPage(1).setRotation(PDFLib.degrees(270));
  context.rotatePages(doc, [1, 3]);
  const result = await PDFLib.PDFDocument.load(await doc.save());
  assert.deepEqual(result.getPages().map(page => page.getRotation().angle), [0, 0, 0, 90]);
  context.rotatePages(doc, [0, 1, 2, 3]);
  assert.equal(doc.getPage(2).getRotation().angle, 90);
});

test('delete removes correct pages without shifting indexes and refuses an empty PDF', async () => {
  const doc = await fixture();
  context.deletePages(doc, [0, 2]);
  const result = await PDFLib.PDFDocument.load(await doc.save());
  assert.deepEqual(result.getPages().map(page => page.getWidth()), [200, 400]);
  assert.throws(() => context.deletePages(doc, [0, 1]));
  assert.equal(doc.getPageCount(), 2);
});

test('split keeps requested order and rotation; edited pages can be merged', async () => {
  const doc = await fixture();
  context.rotatePages(doc, [2]);
  const split = await context.splitPages(doc, [2, 0]);
  const saved = await PDFLib.PDFDocument.load(await split.save());
  assert.deepEqual(saved.getPages().map(page => page.getWidth()), [300, 100]);
  assert.equal(saved.getPage(0).getRotation().angle, 90);
  assert.equal(doc.getPageCount(), 4);
  context.deletePages(doc, [1]);
  const merged = await PDFLib.PDFDocument.create();
  // The popup serializes edits, then reloads them before merging.
  const edited = await PDFLib.PDFDocument.load(await doc.save());
  for (const source of [edited, saved]) {
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach(page => merged.addPage(page));
  }
  const result = await PDFLib.PDFDocument.load(await merged.save());
  assert.deepEqual(result.getPages().map(page => page.getWidth()), [100, 300, 400, 300, 100]);
  assert.equal(result.getPage(1).getRotation().angle, 90);
});

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const outputPath = resolve('tests/fixtures/paperlens-sample.pdf')

const pageOneText = `BT
/F1 22 Tf
72 750 Td
(PaperLens Test Paper) Tj
0 -38 Td
/F1 12 Tf
(This paper demonstrates selection translation in a local PDF reader.) Tj
0 -20 Td
(Select any complete line and DeepSeek will translate it into Chinese.) Tj
0 -20 Td
(The application preserves formulas such as y = f\\(x\\) and citation [1].) Tj
0 -38 Td
(Introduction) Tj
0 -20 Td
(Academic reading improves when unfamiliar sentences can be translated quickly.) Tj
0 -20 Td
(The original page remains unchanged so the reader can keep the full context.) Tj
ET`

const pageTwoText = `BT
/F1 18 Tf
72 750 Td
(Second Page) Tj
0 -36 Td
/F1 12 Tf
(This second page verifies page navigation and text layer cleanup.) Tj
0 -20 Td
(A new selection should cancel any old translation request.) Tj
0 -20 Td
(Use the page control in the toolbar to return to the first page.) Tj
ET`

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(pageOneText)} >>\nstream\n${pageOneText}\nendstream`,
  `<< /Length ${Buffer.byteLength(pageTwoText)} >>\nstream\n${pageTwoText}\nendstream`
]

let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
const offsets = [0]

objects.forEach((object, index) => {
  offsets.push(Buffer.byteLength(pdf))
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
})

const xrefOffset = Buffer.byteLength(pdf)
pdf += `xref\n0 ${objects.length + 1}\n`
pdf += '0000000000 65535 f \n'

for (const offset of offsets.slice(1)) {
  pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
}

pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
pdf += `startxref\n${xrefOffset}\n%%EOF\n`

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, Buffer.from(pdf, 'binary'))
console.log(outputPath)

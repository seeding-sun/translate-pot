import { BrowserWindow, dialog } from 'electron'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import type { OpenedPdf } from '../../shared/contracts'

const MAX_PDF_BYTES = 200 * 1024 * 1024

export async function openPdf(
  window: BrowserWindow
): Promise<OpenedPdf | null> {
  const result = await dialog.showOpenDialog(window, {
    title: '打开论文 PDF',
    properties: ['openFile'],
    filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const fileStats = await stat(filePath)

  if (!fileStats.isFile()) {
    throw new Error('请选择一个 PDF 文件')
  }
  if (fileStats.size > MAX_PDF_BYTES) {
    throw new Error('PDF 文件超过 200 MB，暂时无法打开')
  }

  const file = await readFile(filePath)
  const hash = createHash('sha256').update(file).digest('hex')

  return {
    fileName: filePath.split(/[\\/]/).pop() || '论文.pdf',
    hash,
    data: new Uint8Array(file)
  }
}

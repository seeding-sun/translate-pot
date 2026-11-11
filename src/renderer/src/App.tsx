import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent
} from 'react'
import {
  getDocument,
  type PDFDocumentProxy,
  type PDFDocumentLoadingTask
} from 'pdfjs-dist'
import type { OpenedPdf, PublicSettings } from '../../shared/contracts'
import { AppToolbar } from './components/AppToolbar'
import { SettingsDialog } from './components/SettingsDialog'
import { PdfPageView } from './features/pdf/PdfPageView'
import { useSelectionTranslation } from './features/translation/useSelectionTranslation'

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

async function openedPdfFromFile(file: File): Promise<OpenedPdf> {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    throw new Error('请选择 PDF 文件')
  }
  if (file.size > 200 * 1024 * 1024) {
    throw new Error('PDF 文件超过 200 MB，暂时无法打开')
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const hash = toHex(await crypto.subtle.digest('SHA-256', data))
  return {
    fileName: file.name,
    hash,
    data
  }
}

function EmptyState({
  onOpenPdf,
  onOpenSettings
}: {
  onOpenPdf: () => void
  onOpenSettings: () => void
}): React.JSX.Element {
  return (
    <main className="empty-state">
      <div className="empty-state__glow" />
      <div className="empty-state__card">
        <div className="empty-state__mark" aria-hidden="true">
          <span />
          <i />
        </div>
        <span className="empty-state__eyebrow">READ · SELECT · UNDERSTAND</span>
        <h1>英文论文，哪里不懂就划哪里</h1>
        <p>
          打开一篇本地 PDF，划选一行或一段文字，DeepSeek
          会在选区旁给出中文译文。
        </p>
        <div className="empty-state__actions">
          <button
            type="button"
            className="button-primary button-primary--large"
            onClick={onOpenPdf}
          >
            打开论文 PDF
          </button>
          <button
            type="button"
            className="button-secondary button-secondary--large"
            onClick={onOpenSettings}
          >
            DeepSeek 设置
          </button>
        </div>
        <div className="empty-state__steps">
          <span>
            <b>01</b> 打开 PDF
          </span>
          <span>
            <b>02</b> 划选原文
          </span>
          <span>
            <b>03</b> 阅读译文
          </span>
        </div>
      </div>
      <p className="empty-state__privacy">
        仅在划词后发送当前选区 · API Key 使用系统加密保存在本机
      </p>
    </main>
  )
}

export default function App(): React.JSX.Element {
  const [openedPdf, setOpenedPdf] = useState<OpenedPdf | null>(null)
  const [pdfDocument, setPdfDocument] =
    useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit')
  const [manualScale, setManualScale] = useState(1)
  const [currentScale, setCurrentScale] = useState(1)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const translation = useSelectionTranslation({
    onOpenSettings: openSettings
  })

  useEffect(() => {
    if (!toast) {
      return
    }
    const timeout = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!openedPdf) {
      return
    }

    let disposed = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setPdfDocument(null)
    setDocumentLoading(true)
    setDocumentError('')

    try {
      loadingTask = getDocument({
        data: new Uint8Array(openedPdf.data)
      })

      void loadingTask.promise
        .then((document) => {
          if (disposed) {
            void loadingTask?.destroy()
            return
          }
          setPdfDocument(document)
          setPageCount(document.numPages)
          setPageNumber(1)
        })
        .catch((error: unknown) => {
          if (!disposed) {
            const message =
              error instanceof Error ? error.message : '无法解析这个 PDF'
            setDocumentError(
              /password/i.test(message)
                ? '这个 PDF 受密码保护，暂时无法打开'
                : '无法打开这个 PDF，文件可能已损坏或格式不受支持'
            )
          }
        })
        .finally(() => {
          if (!disposed) {
            setDocumentLoading(false)
          }
        })
    } catch {
      setDocumentLoading(false)
      setDocumentError('无法打开这个 PDF')
    }

    return () => {
      disposed = true
      if (loadingTask) {
        void loadingTask.destroy()
      }
    }
  }, [openedPdf])

  const openPdf = useCallback(async (): Promise<void> => {
    try {
      const nextPdf = await window.paperLens.openPdf()
      if (!nextPdf) {
        return
      }
      translation.clear()
      setOpenedPdf(nextPdf)
      setZoomMode('fit')
      setManualScale(1)
      setCurrentScale(1)
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : '无法打开所选 PDF'
      )
    }
  }, [translation])

  const openDroppedPdf = useCallback(
    async (file: File): Promise<void> => {
      try {
        const nextPdf = await openedPdfFromFile(file)
        translation.clear()
        setOpenedPdf(nextPdf)
        setZoomMode('fit')
        setManualScale(1)
        setCurrentScale(1)
      } catch (error) {
        setToast(
          error instanceof Error ? error.message : '无法打开拖入的 PDF'
        )
      } finally {
        setDragActive(false)
      }
    },
    [translation]
  )

  const handleDragOver = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setDragActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>): void => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return
    }
    setDragActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      void openDroppedPdf(file)
    } else {
      setDragActive(false)
    }
  }

  const goToPage = useCallback(
    (nextPage: number): void => {
      if (!pageCount) {
        return
      }
      translation.clear()
      setPageNumber(Math.min(Math.max(nextPage, 1), pageCount))
    },
    [pageCount, translation]
  )

  const zoomIn = (): void => {
    setManualScale(Math.min(currentScale * 1.15, 3.5))
    setZoomMode('manual')
  }

  const zoomOut = (): void => {
    setManualScale(Math.max(currentScale / 1.15, 0.4))
    setZoomMode('manual')
  }

  const handleSettingsSaved = useCallback(
    (_settings: PublicSettings): void => {
      setSettingsOpen(false)
      setToast('DeepSeek 设置已保存')
      if (translation.translation.error?.code === 'MISSING_KEY') {
        translation.retry()
      }
    },
    [translation]
  )

  const readerContent = useMemo(() => {
    if (documentError) {
      return (
        <div className="reader-error-card">
          <span>PDF</span>
          <h2>无法显示这篇论文</h2>
          <p>{documentError}</p>
          <button type="button" className="button-primary" onClick={openPdf}>
            重新选择 PDF
          </button>
        </div>
      )
    }

    if (!pdfDocument || documentLoading) {
      return (
        <div className="document-loading">
          <span className="spinner spinner--large" />
          <p>正在准备论文页面…</p>
        </div>
      )
    }

    return (
      <PdfPageView
        pdfDocument={pdfDocument}
        pageNumber={pageNumber}
        zoomMode={zoomMode}
        manualScale={manualScale}
        selection={translation.selection}
        translation={translation.translation}
        onSelection={translation.select}
        onRetry={translation.retry}
        onCloseTranslation={translation.close}
        onDismissTranslation={translation.close}
        onScaleChange={setCurrentScale}
      />
    )
  }, [
    documentError,
    documentLoading,
    manualScale,
    openPdf,
    pageNumber,
    pdfDocument,
    translation,
    zoomMode
  ])

  return (
    <div className="app-shell">
      <AppToolbar
        fileName={openedPdf?.fileName || null}
        hasDocument={Boolean(pdfDocument)}
        pageNumber={pageNumber}
        pageCount={pageCount}
        scale={currentScale}
        onOpenPdf={() => void openPdf()}
        onPreviousPage={() => goToPage(pageNumber - 1)}
        onNextPage={() => goToPage(pageNumber + 1)}
        onGoToPage={goToPage}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitWidth={() => setZoomMode('fit')}
        onOpenSettings={openSettings}
      />

      <section
        className="workspace"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="drop-overlay">
            <div>
              <span>PDF</span>
              <strong>松开鼠标打开论文</strong>
            </div>
          </div>
        )}
        {openedPdf ? (
          readerContent
        ) : (
          <EmptyState
            onOpenPdf={() => void openPdf()}
            onOpenSettings={openSettings}
          />
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />
    </div>
  )
}

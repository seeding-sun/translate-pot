import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from 'react'
import {
  GlobalWorkerOptions,
  TextLayer,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask
} from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { SelectionSnapshot } from './types'
import { normalizeSelectionText } from '../translation/normalize-selection'
import type { TranslationState } from '../translation/types'
import { TranslationPopover } from '../../components/TranslationPopover'

GlobalWorkerOptions.workerSrc = workerUrl

interface PdfPageViewProps {
  pdfDocument: PDFDocumentProxy
  pageNumber: number
  zoomMode: 'fit' | 'manual'
  manualScale: number
  selection: SelectionSnapshot | null
  translation: TranslationState
  onSelection: (selection: SelectionSnapshot) => void
  onRetry: () => void
  onCloseTranslation: () => void
  onDismissTranslation: () => void
  onScaleChange: (scale: number) => void
}

interface RectLike {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

function unionRects(rects: RectLike[]): RectLike {
  return rects.reduce<RectLike>(
    (result, rect) => ({
      left: Math.min(result.left, rect.left),
      top: Math.min(result.top, rect.top),
      right: Math.max(result.right, rect.right),
      bottom: Math.max(result.bottom, rect.bottom),
      width: result.width,
      height: result.height
    }),
    {
      left: Number.POSITIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
      width: 0,
      height: 0
    }
  )
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function PdfPageView({
  pdfDocument,
  pageNumber,
  zoomMode,
  manualScale,
  selection,
  translation,
  onSelection,
  onRetry,
  onCloseTranslation,
  onDismissTranslation,
  onScaleChange
}: PdfPageViewProps): React.JSX.Element {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)

  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [pageError, setPageError] = useState('')
  const [availableWidth, setAvailableWidth] = useState(0)
  const [hasSelectableText, setHasSelectableText] = useState(true)

  useEffect(() => {
    let disposed = false
    setPage(null)
    setPageError('')

    void pdfDocument
      .getPage(pageNumber)
      .then((nextPage) => {
        if (!disposed) {
          setPage(nextPage)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setPageError(
            error instanceof Error ? error.message : '无法加载当前页面'
          )
        }
      })

    return () => {
      disposed = true
    }
  }, [pageNumber, pdfDocument])

  useEffect(() => {
    const viewportElement = viewportRef.current
    if (!viewportElement) {
      return
    }

    const updateWidth = (): void => {
      setAvailableWidth(viewportElement.clientWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(viewportElement)
    return () => observer.disconnect()
  }, [])

  const baseViewport = useMemo(
    () => page?.getViewport({ scale: 1 }) ?? null,
    [page]
  )

  const scale = useMemo(() => {
    if (!baseViewport) {
      return manualScale
    }
    if (zoomMode === 'manual') {
      return clamp(manualScale, 0.4, 3.5)
    }

    const usableWidth = Math.max(320, availableWidth - 64)
    return clamp(usableWidth / baseViewport.width, 0.4, 2.5)
  }, [availableWidth, baseViewport, manualScale, zoomMode])

  const pageViewport = useMemo(
    () => page?.getViewport({ scale }) ?? null,
    [page, scale]
  )

  useEffect(() => {
    onScaleChange(scale)
  }, [onScaleChange, scale])

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0, left: 0 })
  }, [pageNumber])

  useEffect(() => {
    const canvas = canvasRef.current
    const textLayerContainer = textLayerRef.current
    if (!page || !pageViewport || !canvas || !textLayerContainer) {
      return
    }

    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      setPageError('无法创建 PDF 渲染画布')
      return
    }

    let renderTask: RenderTask | null = null
    let textLayer: TextLayer | null = null
    let disposed = false

    canvas.width = Math.floor(pageViewport.width * pixelRatio)
    canvas.height = Math.floor(pageViewport.height * pixelRatio)
    canvas.style.width = `${pageViewport.width}px`
    canvas.style.height = `${pageViewport.height}px`

    textLayerContainer.replaceChildren()
    textLayerContainer.style.width = `${pageViewport.width}px`
    textLayerContainer.style.height = `${pageViewport.height}px`
    textLayerContainer.style.setProperty(
      '--scale-factor',
      String(pageViewport.scale)
    )
    textLayerContainer.style.setProperty(
      '--total-scale-factor',
      String(pageViewport.scale)
    )

    renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport: pageViewport,
      transform:
        pixelRatio === 1
          ? undefined
          : [pixelRatio, 0, 0, pixelRatio, 0, 0]
    })

    textLayer = new TextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayerContainer,
      viewport: pageViewport
    })

    void Promise.all([renderTask.promise, textLayer.render()])
      .then(() => {
        if (!disposed) {
          setHasSelectableText(textLayer?.textDivs.length !== 0)
        }
      })
      .catch((error: unknown) => {
        if (
          disposed ||
          (error instanceof Error && error.name === 'RenderingCancelledException')
        ) {
          return
        }
        setPageError('当前页面渲染失败')
      })

    return () => {
      disposed = true
      renderTask?.cancel()
      textLayer?.cancel()
    }
  }, [page, pageViewport])

  const handleMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.button !== 0) {
        return
      }

      const pageElement = pageRef.current
      const browserSelection = window.getSelection()
      if (!pageElement || !browserSelection || browserSelection.rangeCount === 0) {
        return
      }

      const range = browserSelection.getRangeAt(0)
      if (
        browserSelection.isCollapsed ||
        (!pageElement.contains(range.startContainer) &&
          !pageElement.contains(range.endContainer))
      ) {
        return
      }

      const rawText = browserSelection.toString().trim()
      const normalizedText = normalizeSelectionText(rawText)
      if (!normalizedText) {
        return
      }

      const rects = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 0 && rect.height > 0
      )
      if (rects.length === 0) {
        return
      }

      const bounds = unionRects(rects)
      const pageBounds = pageElement.getBoundingClientRect()
      onSelection({
        rawText,
        normalizedText,
        pageNumber,
        anchor: {
          left: bounds.left - pageBounds.left,
          top: bounds.top - pageBounds.top,
          right: bounds.right - pageBounds.left,
          bottom: bounds.bottom - pageBounds.top
        }
      })
    },
    [onSelection, pageNumber]
  )

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      const target = event.target as HTMLElement
      if (target.closest('.translation-popover')) {
        return
      }
      if (!target.closest('.textLayer')) {
        onDismissTranslation()
      }
    },
    [onDismissTranslation]
  )

  return (
    <div
      ref={viewportRef}
      className="pdf-viewport"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {pageError && <div className="reader-message reader-message--error">{pageError}</div>}
      {!page && !pageError && (
        <div className="reader-message">
          <span className="spinner" />
          正在加载页面…
        </div>
      )}

      {pageViewport && (
        <div
          ref={pageRef}
          className="pdf-page"
          style={{
            width: `${pageViewport.width}px`,
            height: `${pageViewport.height}px`
          }}
        >
          <canvas ref={canvasRef} className="pdf-canvas" />
          <div ref={textLayerRef} className="textLayer" />

          {!hasSelectableText && (
            <div className="scanned-pdf-note">
              此页没有可选中文字，可能是扫描版 PDF
            </div>
          )}

          {selection && selection.pageNumber === pageNumber && (
            <TranslationPopover
              selection={selection}
              translation={translation}
              pageWidth={pageViewport.width}
              pageHeight={pageViewport.height}
              onRetry={onRetry}
              onClose={onCloseTranslation}
            />
          )}
        </div>
      )}
    </div>
  )
}

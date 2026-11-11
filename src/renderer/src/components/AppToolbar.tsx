import { useEffect, useState, type KeyboardEvent } from 'react'

interface AppToolbarProps {
  fileName: string | null
  hasDocument: boolean
  pageNumber: number
  pageCount: number
  scale: number
  onOpenPdf: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onOpenSettings: () => void
}

function PageInput({
  pageNumber,
  pageCount,
  onGoToPage
}: Pick<AppToolbarProps, 'pageNumber' | 'pageCount' | 'onGoToPage'>): React.JSX.Element {
  const [value, setValue] = useState(String(pageNumber))

  useEffect(() => {
    setValue(String(pageNumber))
  }, [pageNumber])

  const commit = (): void => {
    const nextPage = Number.parseInt(value, 10)
    if (Number.isFinite(nextPage)) {
      const clamped = Math.min(Math.max(nextPage, 1), pageCount)
      setValue(String(clamped))
      onGoToPage(clamped)
    } else {
      setValue(String(pageNumber))
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      commit()
      event.currentTarget.blur()
    }
  }

  return (
    <div className="page-control" aria-label="页码">
      <input
        value={value}
        inputMode="numeric"
        aria-label="当前页"
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
      <span>/</span>
      <span>{pageCount || '—'}</span>
    </div>
  )
}

export function AppToolbar({
  fileName,
  hasDocument,
  pageNumber,
  pageCount,
  scale,
  onOpenPdf,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onOpenSettings
}: AppToolbarProps): React.JSX.Element {
  return (
    <header className="app-toolbar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <i />
        </span>
        <div className="brand__copy">
          <strong>PaperLens</strong>
          <span>{fileName || '英文论文划词翻译'}</span>
        </div>
      </div>

      <div className="toolbar-group toolbar-group--pages">
        <button
          type="button"
          className="toolbar-button"
          disabled={!hasDocument || pageNumber <= 1}
          onClick={onPreviousPage}
          title="上一页"
        >
          ‹
        </button>
        <PageInput
          pageNumber={pageNumber}
          pageCount={pageCount}
          onGoToPage={onGoToPage}
        />
        <button
          type="button"
          className="toolbar-button"
          disabled={!hasDocument || pageNumber >= pageCount}
          onClick={onNextPage}
          title="下一页"
        >
          ›
        </button>
      </div>

      <div className="toolbar-spacer" />

      {hasDocument && (
        <div className="toolbar-group toolbar-group--zoom">
          <button
            type="button"
            className="toolbar-button"
            onClick={onZoomOut}
            title="缩小"
          >
            −
          </button>
          <button
            type="button"
            className="zoom-label"
            onClick={onFitWidth}
            title="适应宽度"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={onZoomIn}
            title="放大"
          >
            +
          </button>
        </div>
      )}

      <button type="button" className="open-button" onClick={onOpenPdf}>
        <span aria-hidden="true">＋</span>
        打开 PDF
      </button>

      <button
        type="button"
        className="settings-button"
        aria-label="设置"
        title="DeepSeek 设置"
        onClick={onOpenSettings}
      >
        <span className="settings-button__dot" />
        <span aria-hidden="true">⚙</span>
      </button>
    </header>
  )
}

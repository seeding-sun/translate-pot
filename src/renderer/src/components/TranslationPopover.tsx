import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent
} from 'react'
import type { SelectionSnapshot } from '../features/pdf/types'
import type { TranslationState } from '../features/translation/types'

interface TranslationPopoverProps {
  selection: SelectionSnapshot
  translation: TranslationState
  pageWidth: number
  pageHeight: number
  onRetry: () => void
  onClose: () => void
}

const POPOVER_GAP = 10
const POPOVER_MARGIN = 8

function stopPointer(event: MouseEvent): void {
  event.stopPropagation()
}

export function TranslationPopover({
  selection,
  translation,
  pageWidth,
  pageHeight,
  onRetry,
  onClose
}: TranslationPopoverProps): React.JSX.Element {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<CSSProperties>({
    visibility: 'hidden',
    left: selection.anchor.left,
    top: selection.anchor.bottom + POPOVER_GAP
  })
  const [copied, setCopied] = useState(false)

  useLayoutEffect(() => {
    const popover = popoverRef.current
    if (!popover) {
      return
    }

    const updatePosition = (): void => {
      const width = popover.offsetWidth
      const height = popover.offsetHeight
      const maxLeft = Math.max(
        POPOVER_MARGIN,
        pageWidth - width - POPOVER_MARGIN
      )
      const left = Math.min(
        Math.max(selection.anchor.left, POPOVER_MARGIN),
        maxLeft
      )

      const canPlaceBelow =
        selection.anchor.bottom + POPOVER_GAP + height <=
        pageHeight - POPOVER_MARGIN
      const canPlaceAbove =
        selection.anchor.top - POPOVER_GAP - height >= POPOVER_MARGIN
      const top = canPlaceBelow
        ? selection.anchor.bottom + POPOVER_GAP
        : canPlaceAbove
          ? selection.anchor.top - POPOVER_GAP - height
          : Math.min(
              Math.max(selection.anchor.top, POPOVER_MARGIN),
              Math.max(POPOVER_MARGIN, pageHeight - height - POPOVER_MARGIN)
            )

      setPosition({
        left,
        top,
        visibility: 'visible'
      })
    }

    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(popover)
    return () => observer.disconnect()
  }, [
    pageHeight,
    pageWidth,
    selection.anchor.bottom,
    selection.anchor.left,
    selection.anchor.top,
    translation.status,
    translation.translatedText
  ])

  const copyTranslation = async (): Promise<void> => {
    if (!translation.translatedText) {
      return
    }
    await window.paperLens.copyText(translation.translatedText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const isWaiting =
    translation.status === 'waiting' || translation.status === 'loading'
  const isFinished =
    translation.status === 'done' || translation.status === 'streaming'

  return (
    <div
      ref={popoverRef}
      className="translation-popover"
      style={position}
      role="dialog"
      aria-label="划词翻译"
      onMouseDown={stopPointer}
      onMouseUp={stopPointer}
      onClick={stopPointer}
    >
      <div className="translation-popover__source">
        <span className="translation-popover__eyebrow">原文</span>
        <p>{selection.normalizedText}</p>
      </div>

      <div className="translation-popover__divider" />

      <div className="translation-popover__result" aria-live="polite">
        <div className="translation-popover__result-heading">
          <span className="translation-popover__eyebrow">译文</span>
          {translation.status === 'streaming' && (
            <span className="translation-popover__live">
              <i />
              翻译中
            </span>
          )}
        </div>

        {isWaiting && (
          <div className="translation-skeleton" aria-label="正在翻译">
            <span />
            <span />
            <span />
          </div>
        )}

        {isFinished && (
          <p className="translation-text">
            {translation.translatedText}
            {translation.status === 'streaming' && (
              <span className="translation-caret" />
            )}
          </p>
        )}

        {translation.status === 'error' && (
          <div className="translation-error">
            <p>{translation.error?.message || '翻译失败，请重试'}</p>
            <button type="button" onClick={onRetry}>
              重试
            </button>
          </div>
        )}
      </div>

      <div className="translation-popover__actions">
        <span className="translation-popover__model">DeepSeek</span>
        <div className="translation-popover__action-group">
          {isFinished && (
            <button type="button" onClick={() => void copyTranslation()}>
              {copied ? '已复制' : '复制'}
            </button>
          )}
          {translation.status !== 'loading' &&
            translation.status !== 'waiting' && (
              <button type="button" onClick={onRetry}>
                重新翻译
              </button>
            )}
          <button
            type="button"
            className="translation-popover__close"
            aria-label="关闭译文"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

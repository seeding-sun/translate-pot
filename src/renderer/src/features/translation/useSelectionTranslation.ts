import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranslationEvent } from '../../../../shared/contracts'
import type { SelectionSnapshot } from '../pdf/types'
import {
  MAX_SELECTION_LENGTH
} from './normalize-selection'
import type {
  SelectionTranslationController,
  TranslationState
} from './types'

const AUTO_TRANSLATE_DELAY_MS = 250

const IDLE_TRANSLATION: TranslationState = {
  requestId: null,
  status: 'idle',
  translatedText: '',
  error: null
}

interface UseSelectionTranslationOptions {
  onOpenSettings: () => void
}

export function useSelectionTranslation({
  onOpenSettings
}: UseSelectionTranslationOptions): SelectionTranslationController {
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null)
  const [translation, setTranslation] =
    useState<TranslationState>(IDLE_TRANSLATION)

  const requestIdRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const onOpenSettingsRef = useRef(onOpenSettings)

  useEffect(() => {
    onOpenSettingsRef.current = onOpenSettings
  }, [onOpenSettings])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cancelActiveRequest = useCallback(() => {
    const activeRequestId = requestIdRef.current
    requestIdRef.current = null
    if (activeRequestId) {
      void window.paperLens.cancelTranslation(activeRequestId)
    }
  }, [])

  const startTranslation = useCallback(
    (snapshot: SelectionSnapshot) => {
      clearTimer()

      if (!snapshot.normalizedText) {
        return
      }
      if (snapshot.normalizedText.length > MAX_SELECTION_LENGTH) {
        cancelActiveRequest()
        setTranslation({
          requestId: null,
          status: 'error',
          translatedText: '',
          error: {
            code: 'INVALID_REQUEST',
            message: '选区过长，请缩小选区'
          }
        })
        return
      }

      cancelActiveRequest()
      const requestId = crypto.randomUUID()
      requestIdRef.current = requestId
      setTranslation({
        requestId,
        status: 'loading',
        translatedText: '',
        error: null
      })

      void window.paperLens
        .translate({
          requestId,
          text: snapshot.normalizedText
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) {
            return
          }
          setTranslation({
            requestId,
            status: 'error',
            translatedText: '',
            error: {
              code: 'UNKNOWN',
              message: '翻译失败，请稍后重试'
            }
          })
        })
    },
    [cancelActiveRequest, clearTimer]
  )

  useEffect(() => {
    return window.paperLens.onTranslationEvent((event: TranslationEvent) => {
      if (event.requestId !== requestIdRef.current) {
        return
      }

      if (event.type === 'delta') {
        setTranslation((current) => ({
          ...current,
          status: 'streaming',
          translatedText: current.translatedText + event.text
        }))
        return
      }

      if (event.type === 'done') {
        setTranslation((current) => ({
          ...current,
          status: 'done'
        }))
        requestIdRef.current = null
        return
      }

      if (event.code === 'MISSING_KEY') {
        window.setTimeout(() => onOpenSettingsRef.current(), 0)
      }
      requestIdRef.current = null
      setTranslation({
        requestId: event.requestId,
        status: 'error',
        translatedText: '',
        error: {
          code: event.code,
          message: event.message
        }
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      cancelActiveRequest()
    }
  }, [cancelActiveRequest, clearTimer])

  const select = useCallback(
    (nextSelection: SelectionSnapshot) => {
      clearTimer()
      cancelActiveRequest()
      setSelection(nextSelection)
      setTranslation({
        requestId: null,
        status:
          nextSelection.normalizedText.length > MAX_SELECTION_LENGTH
            ? 'error'
            : 'waiting',
        translatedText: '',
        error:
          nextSelection.normalizedText.length > MAX_SELECTION_LENGTH
            ? {
                code: 'INVALID_REQUEST',
                message: '选区过长，请缩小选区'
              }
            : null
      })

      if (
        nextSelection.normalizedText.length > 0 &&
        nextSelection.normalizedText.length <= MAX_SELECTION_LENGTH
      ) {
        timerRef.current = window.setTimeout(() => {
          startTranslation(nextSelection)
        }, AUTO_TRANSLATE_DELAY_MS)
      }
    },
    [cancelActiveRequest, clearTimer, startTranslation]
  )

  const translateCurrent = useCallback(() => {
    if (selection) {
      startTranslation(selection)
    }
  }, [selection, startTranslation])

  const retry = useCallback(() => {
    if (selection) {
      startTranslation(selection)
    }
  }, [selection, startTranslation])

  const close = useCallback(() => {
    clearTimer()
    cancelActiveRequest()
    setSelection(null)
    setTranslation(IDLE_TRANSLATION)
  }, [cancelActiveRequest, clearTimer])

  const clear = close

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        translateCurrent()
      }
      if (event.key === 'Escape') {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, translateCurrent])

  return {
    selection,
    translation,
    select,
    translateCurrent,
    retry,
    close,
    clear
  }
}

import type { TranslationErrorCode } from '../../../../shared/contracts'
import type {
  SelectionSnapshot
} from '../pdf/types'

export type TranslationStatus =
  | 'idle'
  | 'waiting'
  | 'loading'
  | 'streaming'
  | 'done'
  | 'error'

export interface TranslationError {
  code: TranslationErrorCode
  message: string
}

export interface TranslationState {
  requestId: string | null
  status: TranslationStatus
  translatedText: string
  error: TranslationError | null
}

export interface SelectionTranslationController {
  selection: SelectionSnapshot | null
  translation: TranslationState
  select: (selection: SelectionSnapshot) => void
  translateCurrent: () => void
  retry: () => void
  close: () => void
  clear: () => void
}

export interface OpenedPdf {
  fileName: string
  hash: string
  data: Uint8Array
}

export interface PublicSettings {
  hasApiKey: boolean
  baseUrl: string
  model: string
}

export interface SaveSettingsInput {
  apiKey?: string
  baseUrl: string
  model: string
}

export interface TranslateRequest {
  requestId: string
  text: string
}

export type TranslationErrorCode =
  | 'MISSING_KEY'
  | 'INVALID_KEY'
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

export type TranslationEvent =
  | {
      type: 'delta'
      requestId: string
      text: string
    }
  | {
      type: 'done'
      requestId: string
    }
  | {
      type: 'error'
      requestId: string
      code: TranslationErrorCode
      message: string
    }

export interface PaperLensApi {
  openPdf: () => Promise<OpenedPdf | null>
  getSettings: () => Promise<PublicSettings>
  saveSettings: (input: SaveSettingsInput) => Promise<PublicSettings>
  translate: (request: TranslateRequest) => Promise<void>
  cancelTranslation: (requestId: string) => Promise<void>
  copyText: (text: string) => Promise<void>
  onTranslationEvent: (listener: (event: TranslationEvent) => void) => () => void
}

export const IPC_CHANNELS = {
  openPdf: 'pdf:open',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  translate: 'translation:start',
  cancelTranslation: 'translation:cancel',
  copyText: 'clipboard:write',
  translationEvent: 'translation:event'
} as const

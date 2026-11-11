/// <reference types="vite/client" />

import type { PaperLensApi } from '../../shared/contracts'

declare global {
  interface Window {
    paperLens: PaperLensApi
  }
}

export {}

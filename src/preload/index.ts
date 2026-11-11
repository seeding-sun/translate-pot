import { contextBridge, ipcRenderer } from 'electron'
import type {
  PaperLensApi,
  SaveSettingsInput,
  TranslateRequest,
  TranslationEvent
} from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/contracts'

const api: PaperLensApi = {
  openPdf: () => ipcRenderer.invoke(IPC_CHANNELS.openPdf),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
  saveSettings: (input: SaveSettingsInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSettings, input),
  translate: (request: TranslateRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.translate, request),
  cancelTranslation: (requestId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.cancelTranslation, requestId),
  copyText: (text: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.copyText, text),
  onTranslationEvent: (listener: (event: TranslationEvent) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      translationEvent: TranslationEvent
    ): void => {
      listener(translationEvent)
    }

    ipcRenderer.on(IPC_CHANNELS.translationEvent, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.translationEvent, handler)
    }
  }
}

contextBridge.exposeInMainWorld('paperLens', api)

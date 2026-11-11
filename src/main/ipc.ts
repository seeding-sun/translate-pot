import {
  BrowserWindow,
  clipboard,
  ipcMain,
  type IpcMainInvokeEvent
} from 'electron'
import type {
  SaveSettingsInput,
  TranslateRequest
} from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/contracts'
import { getPublicSettings, saveSettings } from './services/app-config'
import { DeepSeekService } from './services/deepseek'
import { openPdf } from './services/open-pdf'

const deepSeekService = new DeepSeekService()

function isTrustedSender(event: IpcMainInvokeEvent, window: BrowserWindow): boolean {
  return event.sender === window.webContents
}

function validateRequest(request: TranslateRequest): void {
  if (
    !request ||
    typeof request.requestId !== 'string' ||
    request.requestId.length < 8 ||
    request.requestId.length > 100 ||
    typeof request.text !== 'string'
  ) {
    throw new Error('翻译请求无效')
  }
}

export function registerIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.openPdf, async (event) => {
    if (!isTrustedSender(event, window)) {
      throw new Error('拒绝未知页面打开文件')
    }
    return openPdf(window)
  })

  ipcMain.handle(IPC_CHANNELS.getSettings, async (event) => {
    if (!isTrustedSender(event, window)) {
      throw new Error('拒绝未知页面读取设置')
    }
    return getPublicSettings()
  })

  ipcMain.handle(
    IPC_CHANNELS.saveSettings,
    async (event, input: SaveSettingsInput) => {
      if (!isTrustedSender(event, window)) {
        throw new Error('拒绝未知页面保存设置')
      }
      if (!input || typeof input.baseUrl !== 'string') {
        throw new Error('设置参数无效')
      }
      return saveSettings(input)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.translate,
    async (event, request: TranslateRequest) => {
      if (!isTrustedSender(event, window)) {
        throw new Error('拒绝未知页面发起翻译')
      }
      validateRequest(request)

      await deepSeekService.translate(request, (translationEvent) => {
        if (!window.isDestroyed()) {
          window.webContents.send(
            IPC_CHANNELS.translationEvent,
            translationEvent
          )
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.cancelTranslation,
    async (event, requestId: unknown) => {
      if (!isTrustedSender(event, window)) {
        throw new Error('拒绝未知页面取消翻译')
      }
      if (typeof requestId === 'string') {
        deepSeekService.cancel(requestId)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.copyText, async (event, text: unknown) => {
    if (!isTrustedSender(event, window)) {
      throw new Error('拒绝未知页面写入剪贴板')
    }
    if (typeof text !== 'string' || text.length > 50_000) {
      throw new Error('复制内容无效')
    }
    clipboard.writeText(text)
  })

  window.on('closed', () => {
    deepSeekService.cancelAll()
  })
}

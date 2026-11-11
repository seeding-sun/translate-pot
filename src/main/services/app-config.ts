import { app, safeStorage } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PublicSettings, SaveSettingsInput } from '../../shared/contracts'

interface StoredSettings {
  baseUrl: string
  model: string
  encryptedApiKey?: string
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
const SETTINGS_FILE = 'settings.json'

let cachedSettings: StoredSettings | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return DEFAULT_BASE_URL
  }

  const parsed = new URL(trimmed)
  const isLocalHttp =
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')

  if (parsed.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('DeepSeek 地址必须使用 HTTPS')
  }

  return parsed.toString().replace(/\/+$/, '')
}

function normalizeModel(value: string): string {
  const model = value.trim()
  if (!model || model.length > 100) {
    throw new Error('模型名称无效')
  }
  return model
}

async function readStoredSettings(): Promise<StoredSettings> {
  if (cachedSettings) {
    return cachedSettings
  }

  try {
    const content = await readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(content) as Partial<StoredSettings>
    cachedSettings = {
      baseUrl: normalizeBaseUrl(parsed.baseUrl || DEFAULT_BASE_URL),
      model: normalizeModel(parsed.model || DEFAULT_MODEL),
      encryptedApiKey:
        typeof parsed.encryptedApiKey === 'string'
          ? parsed.encryptedApiKey
          : undefined
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Unable to read settings; using defaults.')
    }
    cachedSettings = {
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL
    }
  }

  return cachedSettings
}

async function persistSettings(settings: StoredSettings): Promise<void> {
  const filePath = settingsPath()
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  })
  cachedSettings = settings
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const settings = await readStoredSettings()
  return {
    hasApiKey: Boolean(settings.encryptedApiKey),
    baseUrl: settings.baseUrl,
    model: settings.model
  }
}

export async function saveSettings(
  input: SaveSettingsInput
): Promise<PublicSettings> {
  const current = await readStoredSettings()
  const next: StoredSettings = {
    baseUrl: normalizeBaseUrl(input.baseUrl),
    model: normalizeModel(input.model),
    encryptedApiKey: current.encryptedApiKey
  }

  const trimmedKey = input.apiKey?.trim()
  if (trimmedKey) {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('当前系统无法安全保存 API Key')
    }
    next.encryptedApiKey = (
      await safeStorage.encryptStringAsync(trimmedKey)
    ).toString('base64')
  }

  if (!next.encryptedApiKey) {
    throw new Error('请填写 DeepSeek API Key')
  }

  await persistSettings(next)
  return getPublicSettings()
}

export async function getApiKey(): Promise<string | null> {
  const settings = await readStoredSettings()
  if (!settings.encryptedApiKey) {
    return null
  }

  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    return null
  }

  try {
    const decrypted = await safeStorage.decryptStringAsync(
      Buffer.from(settings.encryptedApiKey, 'base64')
    )
    return decrypted.result
  } catch {
    console.warn('Unable to decrypt the saved API key.')
    return null
  }
}

export async function getProviderSettings(): Promise<{
  baseUrl: string
  model: string
}> {
  const settings = await readStoredSettings()
  return {
    baseUrl: settings.baseUrl,
    model: settings.model
  }
}

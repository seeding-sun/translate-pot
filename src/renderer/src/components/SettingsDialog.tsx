import { useEffect, useState, type FormEvent } from 'react'
import type { PublicSettings } from '../../../shared/contracts'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  onSaved: (settings: PublicSettings) => void
}

export function SettingsDialog({
  open,
  onClose,
  onSaved
}: SettingsDialogProps): React.JSX.Element | null {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com')
  const [model, setModel] = useState('deepseek-chat')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setError('')
    setApiKey('')
    void window.paperLens
      .getSettings()
      .then((current) => {
        setSettings(current)
        setBaseUrl(current.baseUrl)
        setModel(current.model)
      })
      .catch(() => setError('无法读取当前设置'))
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updated = await window.paperLens.saveSettings({
        apiKey: apiKey.trim() || undefined,
        baseUrl,
        model
      })
      onSaved(updated)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : '保存设置失败'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="settings-dialog"
        onSubmit={(event) => void handleSubmit(event)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-dialog__header">
          <div>
            <span className="settings-dialog__eyebrow">PAPERLENS</span>
            <h2>DeepSeek 翻译设置</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="关闭设置"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className="field">
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            autoFocus
            spellCheck={false}
            placeholder={
              settings?.hasApiKey
                ? '已安全保存，留空则保持不变'
                : 'sk-...'
            }
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>

        <div className="settings-grid">
          <label className="field">
            <span>API 地址</span>
            <input
              type="url"
              value={baseUrl}
              spellCheck={false}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </label>
          <label className="field field--small">
            <span>模型</span>
            <input
              type="text"
              value={model}
              spellCheck={false}
              onChange={(event) => setModel(event.target.value)}
            />
          </label>
        </div>

        <p className="settings-dialog__hint">
          API Key 仅使用 Windows 系统加密保存在本机。翻译时只发送当前选区。
        </p>
        {error && <p className="form-error">{error}</p>}

        <div className="settings-dialog__actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? '保存中…' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  )
}

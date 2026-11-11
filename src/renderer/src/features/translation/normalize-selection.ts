const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff',
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st'
}

export const MAX_SELECTION_LENGTH = 12_000

export function normalizeSelectionText(input: string): string {
  let text = input.normalize('NFC').replace(/\r\n?/g, '\n')

  text = text.replace(/[ﬀﬁﬂﬃﬄﬅﬆ]/g, (character) => LIGATURES[character])
  text = text.replace(/([\p{Ll}])-\n(?=[\p{Ll}])/gu, '$1')
  text = text.replace(/[ \t]+\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim()
    )
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

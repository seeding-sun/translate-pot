import { describe, expect, it } from 'vitest'
import {
  normalizeSelectionText
} from '../src/renderer/src/features/translation/normalize-selection'

describe('normalizeSelectionText', () => {
  it('removes PDF line-wrap hyphens between lowercase letters', () => {
    expect(normalizeSelectionText('transla-\ntion is useful')).toBe(
      'translation is useful'
    )
  })

  it('preserves ordinary compound-word hyphens', () => {
    expect(normalizeSelectionText('state-of-the-art methods')).toBe(
      'state-of-the-art methods'
    )
  })

  it('joins wrapped lines inside a paragraph', () => {
    expect(
      normalizeSelectionText(
        'This sentence is split\nacross several PDF lines.'
      )
    ).toBe('This sentence is split across several PDF lines.')
  })

  it('preserves paragraph boundaries', () => {
    expect(
      normalizeSelectionText(
        'First paragraph line one.\nFirst paragraph line two.\n\nSecond paragraph.'
      )
    ).toBe(
      'First paragraph line one. First paragraph line two.\n\nSecond paragraph.'
    )
  })

  it('normalizes ligatures and repeated whitespace', () => {
    expect(normalizeSelectionText('  eﬃcient\t  model  ')).toBe(
      'efficient model'
    )
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeSelectionText(' \n\t ')).toBe('')
  })
})

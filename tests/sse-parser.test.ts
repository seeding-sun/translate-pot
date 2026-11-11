import { describe, expect, it } from 'vitest'
import { SseDataDecoder } from '../src/main/services/sse-parser'

describe('SseDataDecoder', () => {
  it('waits for a complete line before returning a payload', () => {
    const decoder = new SseDataDecoder()

    expect(decoder.push('data: {"choices":')).toEqual([])
    expect(decoder.push('[{"delta":{"content":"你好"}}]}\n')).toEqual([
      '{"choices":[{"delta":{"content":"你好"}}]}'
    ])
  })

  it('returns multiple payloads from a single network chunk', () => {
    const decoder = new SseDataDecoder()

    expect(
      decoder.push(
        'data: {"value":1}\ndata: {"value":2}\ndata: [DONE]\n'
      )
    ).toEqual(['{"value":1}', '{"value":2}', '[DONE]'])
  })

  it('handles CRLF line endings', () => {
    const decoder = new SseDataDecoder()

    expect(decoder.push('data: one\r\ndata: two\r\n')).toEqual([
      'one',
      'two'
    ])
  })

  it('ignores comments and non-data fields', () => {
    const decoder = new SseDataDecoder()

    expect(
      decoder.push(': keep-alive\nevent: message\ndata: payload\n')
    ).toEqual(['payload'])
  })

  it('flushes a final unterminated data line', () => {
    const decoder = new SseDataDecoder()

    expect(decoder.push('data: final')).toEqual([])
    expect(decoder.finish()).toEqual(['final'])
  })
})

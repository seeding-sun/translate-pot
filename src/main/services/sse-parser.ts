export class SseDataDecoder {
  private buffer = ''

  push(chunk: string): string[] {
    this.buffer += chunk
    return this.extractCompleteLines()
  }

  finish(): string[] {
    if (!this.buffer) {
      return []
    }

    const remaining = this.buffer
    this.buffer = ''
    return this.parseLine(remaining)
  }

  private extractCompleteLines(): string[] {
    const values: string[] = []
    let newlineIndex = this.buffer.indexOf('\n')

    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '')
      this.buffer = this.buffer.slice(newlineIndex + 1)
      values.push(...this.parseLine(line))
      newlineIndex = this.buffer.indexOf('\n')
    }

    return values
  }

  private parseLine(line: string): string[] {
    if (!line.startsWith('data:')) {
      return []
    }

    const payload = line.slice(5).trimStart()
    return payload ? [payload] : []
  }
}

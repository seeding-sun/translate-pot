export interface SelectionAnchor {
  left: number
  top: number
  right: number
  bottom: number
}

export interface SelectionSnapshot {
  rawText: string
  normalizedText: string
  pageNumber: number
  anchor: SelectionAnchor
}

import { randomUUID } from 'crypto'

export function generateQRToken(): string {
  return `GG-${randomUUID()}`
}

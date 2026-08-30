import { createReadStream } from 'node:fs'
import type { Readable } from 'node:stream'

export type InputFileSource = string | URL | Uint8Array | Buffer | Readable | Blob
export class InputFile {
  constructor(public readonly source: InputFileSource, public readonly filename = 'file') {}
  static from(source: InputFileSource, filename?: string) { return new InputFile(source, filename) }
  isFileId() { return typeof this.source === 'string' && !this.source.includes('/') }
  async toBlob(): Promise<Blob | Uint8Array | Readable | string> {
    if (typeof this.source === 'string' && !this.isFileId()) { const bytes = await import('node:fs/promises').then(fs => fs.readFile(this.source as string)); return new Blob([bytes.buffer as ArrayBuffer]) }
    if (this.source instanceof URL) { const bytes = await import('node:fs/promises').then(fs => fs.readFile(this.source as URL)); return new Blob([bytes.buffer as ArrayBuffer]) }
    return this.source
  }
  toStream() { return typeof this.source === 'string' ? createReadStream(this.source) : this.source }
}

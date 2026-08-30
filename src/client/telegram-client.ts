import { InputFile } from '../core/input-file.js'
import { TelegramError, TelegramNetworkError, TelegramTimeoutError } from '../errors/telegram-error.js'

export type RequestOptions = { timeout?: number; signal?: AbortSignal; retries?: number; retryDelay?: number }
export type TelegramResponse<T> = { ok: true; result: T } | { ok: false; error_code: number; description: string; parameters?: Record<string, unknown> }
const sleep = (ms:number) => new Promise(resolve => setTimeout(resolve, ms))
export class TelegramClient {
  constructor(private readonly token:string, private readonly defaults:RequestOptions = {}) { if (!token) throw new Error('A Telegram bot token is required') }
  async call<T>(method:string, params:Record<string, unknown> = {}, options:RequestOptions = {}):Promise<T> {
    const retries = options.retries ?? this.defaults.retries ?? 2
    for (let attempt=0;;attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeout ?? this.defaults.timeout ?? 30_000)
      const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
      try {
        const hasFile = Object.values(params).some(value => value instanceof InputFile)
        let body: BodyInit; const headers:Record<string,string> = {}
        if (hasFile) { const form = new FormData(); for (const [key,value] of Object.entries(params)) { if (value instanceof InputFile) { const file = await value.toBlob(); if (file instanceof Blob) form.append(key,file,value.filename); else form.append(key, String(value.source)) } else form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value)) } body=form }
        else { headers['content-type']='application/json'; body=JSON.stringify(params) }
        const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method:'POST', headers, body, signal })
        const data = await response.json() as TelegramResponse<T>
        if (data.ok) return data.result
        const retryAfter = data.parameters?.retry_after as number | undefined
        if ((data.error_code === 429 || data.error_code >= 500) && attempt < retries) { await sleep((retryAfter ?? options.retryDelay ?? 500) * (retryAfter ? 1000 : 2 ** attempt)); continue }
        throw new TelegramError(data.error_code,data.description,data.parameters)
      } catch (error) { if (error instanceof TelegramError) throw error; if (attempt < retries) { await sleep((options.retryDelay ?? 250) * 2 ** attempt); continue } if (error instanceof DOMException && error.name === 'AbortError') throw new TelegramTimeoutError(); throw new TelegramNetworkError('Telegram request failed',error) }
      finally { clearTimeout(timer) }
    }
  }
  method<T>(name:string) { return (params?:Record<string,unknown>, options?:RequestOptions) => this.call<T>(name,params,options) }
}

export * from './client/telegram-client.js'
export * from './core/input-file.js'
export * from './core/updates.js'
export * from './core/serialization.js'
export * from './errors/telegram-error.js'
export * from './router/router.js'
export * from './generated/api.js'

export type ChatId = number | string
export type ParseMode = 'HTML' | 'Markdown' | 'MarkdownV2'
export type Update = Record<string, unknown> & { update_id:number }
export function createBot(token:string, options={}) { return new (requireClient())(token,options) }
function requireClient(){ return TelegramClient }
import { TelegramClient } from './client/telegram-client.js'

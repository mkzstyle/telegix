import { TelegramClient } from '../client/telegram-client.js'
export type UpdateHandler = (update: Record<string, unknown>) => void | Promise<void>
export async function poll(client:TelegramClient, handler:UpdateHandler, options:{signal?:AbortSignal; timeout?:number}={}) { let offset=0; while (!options.signal?.aborted) { const updates=await client.call<Array<{update_id:number}>>('getUpdates',{offset,timeout:options.timeout ?? 30}); for (const update of updates) { offset=update.update_id+1; await handler(update) } } }
export function verifyWebhookSecret(headers:Headers, secret:string) { return headers.get('x-telegram-bot-api-secret-token') === secret }
export async function dispatchWebhook(request:Request, handler:UpdateHandler, secret?:string) { if (secret && !verifyWebhookSecret(request.headers,secret)) return new Response('Unauthorized',{status:401}); await handler(await request.json()); return new Response('OK') }

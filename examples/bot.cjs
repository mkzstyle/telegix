'use strict'

const http = require('node:http')
const {
  createBot,
  InputFile,
  Router,
  poll,
  dispatchWebhook,
} = require('telegix')

const token = process.env.BOT_TOKEN
const mode = process.env.MODE || 'polling'
const webhookSecret = process.env.WEBHOOK_SECRET
const webhookPort = Number(process.env.PORT || 3000)

if (!token) throw new Error('BOT_TOKEN is required')
if (mode !== 'polling' && mode !== 'webhook') throw new Error('MODE must be polling or webhook')

const bot = createBot(token, {
  timeout: Number(process.env.REQUEST_TIMEOUT_MS || 15000),
  retries: Number(process.env.RETRIES || 3),
})
const router = new Router()

router.on('message', async (update) => {
  const message = update.message
  if (!message || typeof message !== 'object') return
  const chatId = message.chat && message.chat.id
  const text = typeof message.text === 'string' ? message.text : ''
  if (!chatId) return

  if (text === '/start') {
    await bot.call('sendMessage', { chat_id: chatId, text: 'Welcome to telegix.' })
  } else if (text === '/id') {
    await bot.call('sendMessage', { chat_id: chatId, text: `Your chat ID is ${chatId}.` })
  } else if (text === '/photo') {
    await bot.call('sendPhoto', {
      chat_id: chatId,
      photo: new InputFile(process.env.PHOTO_PATH || './photo.jpg', 'photo.jpg'),
      caption: 'Uploaded with multipart/form-data.',
    })
  } else if (text) {
    await bot.call('sendMessage', { chat_id: chatId, text: `Echo: ${text}` })
  }
})

router.on('callback_query', async (update) => {
  const query = update.callback_query
  if (!query || !query.message) return
  await bot.call('answerCallbackQuery', { callback_query_id: query.id })
  await bot.call('sendMessage', {
    chat_id: query.message.chat.id,
    text: `Button data: ${query.data || '(empty)'}`,
  })
})

async function runPolling() {
  console.log('telegix bot is polling')
  await poll(bot, (update) => router.handle(update), { timeout: 30 })
}

function runWebhook() {
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405).end('Method Not Allowed')
      return
    }
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const webRequest = new Request(`http://${request.headers.host || 'localhost'}${request.url}`, {
      method: 'POST',
      headers: request.headers,
      body: Buffer.concat(chunks),
    })
    const result = await dispatchWebhook(webRequest, (update) => router.handle(update), webhookSecret)
    response.writeHead(result.status, Object.fromEntries(result.headers)).end(await result.text())
  })
  server.listen(webhookPort, () => console.log(`telegix webhook listening on :${webhookPort}`))
  return server
}

const server = mode === 'webhook' ? runWebhook() : null
if (mode === 'polling') runPolling().catch(handleError)

function handleError(error) {
  console.error('Telegram request failed:', error)
  process.exitCode = 1
}

async function shutdown(signal) {
  console.log(`${signal}: shutting down`)
  if (server) await new Promise((resolve) => server.close(resolve))
  process.exit(0)
}
process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

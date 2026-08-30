# telegix

Typed modular wrapper for the official Telegram Bot API 10.3.

```ts
import { createBot, poll } from 'telegix'
const bot = createBot(process.env.BOT_TOKEN!)
await bot.call('sendMessage', { chat_id: 123, text: 'Hello' })
```

The generator reads only `https://core.telegram.org/bots/api`. Run `pnpm generate` before building when Telegram publishes an API update. Requests use the official Bot API endpoint, support JSON and multipart uploads, timeout, abort, retry, polling, webhook secret validation, and typed runtime errors.

## CommonJS example

A complete CommonJS bot is available at `examples/bot.cjs`. It demonstrates polling, optional webhook mode, router-based message and callback handling, generated API calls, JSON requests, multipart uploads with `InputFile`, retry and timeout configuration, error handling, graceful shutdown, and environment-based secrets.

Install the published package and run it with Node.js 18+:

```bash
npm install telegix
BOT_TOKEN=123:replace-me MODE=polling node examples/bot.cjs
```

For webhook mode, expose the process through your HTTPS reverse proxy and set the same secret in Telegram when configuring the webhook:

```bash
BOT_TOKEN=123:replace-me MODE=webhook WEBHOOK_SECRET=replace-me PORT=3000 node examples/bot.cjs
```

Optional variables are `REQUEST_TIMEOUT_MS`, `RETRIES`, and `PHOTO_PATH`. The `/photo` command expects a local file at `PHOTO_PATH`; it is intentionally not executed unless that file exists.

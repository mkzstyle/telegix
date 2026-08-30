export class TelegramError extends Error { constructor(public readonly errorCode:number, public readonly description:string, public readonly parameters?: Record<string, unknown>) { super(`${errorCode}: ${description}`); this.name='TelegramError' } }
export class TelegramNetworkError extends Error { constructor(message:string, public readonly cause?: unknown) { super(message); this.name='TelegramNetworkError' } }
export class TelegramTimeoutError extends TelegramNetworkError { constructor(message='Telegram request timed out') { super(message); this.name='TelegramTimeoutError' } }

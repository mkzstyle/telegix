import { describe, expect, it, vi } from 'vitest'
import { TelegramClient } from '../src/index.js'
describe('TelegramClient',()=>{ it('calls official endpoint and parses result',async()=>{ const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({ok:true,result:{id:1}}))); await expect(new TelegramClient('token').call('getMe')).resolves.toEqual({id:1}); expect(fetchMock.mock.calls[0][0]).toContain('/bottoken/getMe'); fetchMock.mockRestore() }) })

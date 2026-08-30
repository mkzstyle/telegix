import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'

const SOURCE = 'https://core.telegram.org/bots/api'
const html = await (await fetch(SOURCE)).text()

const clean = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const typeMap = (value: string) => {
  const t = clean(value).replace(/JSON-serialized list of /i, '').trim()
  if (/\bor\b/i.test(t) || /IntegerorString/i.test(t)) return 'unknown'
  if (/^Integer$/i.test(t)) return 'number'
  if (/^Float$/i.test(t)) return 'number'
  if (/^Boolean$/i.test(t) || /^True$/i.test(t)) return 'boolean'
  if (/^String$/i.test(t)) return 'string'
  if (/^Array of String$/i.test(t)) return 'string[]'
  const array = t.match(/^Array of (.+)$/i)
  if (array) return `${typeMap(array[1])}[]`
  return t.replace(/[^A-Za-z0-9_$]/g, '') || 'unknown'
}
const reserved = new Set(['from', 'delete', 'new', 'default', 'get', 'set', 'private', 'public', 'protected', 'readonly', 'constructor', 'typeof', 'export', 'class', 'function', 'return', 'switch', 'case', 'interface', 'extends', 'implements'])
const fieldName = (name: string) => reserved.has(name) ? `"${name}"` : name

const headings = [...html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/g)].map(m => clean(m[1]))
const uniqueMethods = [...new Set(headings.filter(name => /^[a-z][A-Za-z0-9_]*$/.test(name)))]
const types: { name: string; fields: string[] }[] = []
for (const match of html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4|$)/g)) {
  const name = clean(match[1])
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(name)) continue
  const fields: string[] = []
  for (const row of match[2].matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
    const field = clean(row[1]).split(' ')[0]
    if (!field || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) continue
    const optional = /Optional/i.test(clean(row[3]))
    fields.push(`  ${fieldName(field)}${optional ? '?' : ''}: ${typeMap(row[2])}`)
  }
  if (name !== 'InputFile' && !types.some(t => t.name === name)) types.push({ name, fields: [...new Set(fields)] })
}
const updateFields = [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>([a-z_]+)<\/td>\s*<td[^>]*>Update<\/td>/g)].map(m => m[1])
const manifest = { version: '10.3', source: SOURCE, generatedAt: new Date().toISOString(), methods: uniqueMethods, types: types.map(t => t.name), inputTypes: types.filter(t => t.name.startsWith('Input')).map(t => t.name), updates: [...new Set(updateFields)], parameters: [] }

await mkdir('schemas', { recursive: true })
await mkdir('src/generated', { recursive: true })
await rm('src/methods', { recursive: true, force: true })
await writeFile('schemas/telegram-bot-api-10.3.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('schemas/generated-manifest.json', JSON.stringify(manifest, null, 2) + '\n')

const typeSource = types.map(t => `export interface ${t.name} {\n${t.fields.join('\n')}\n}`).join('\n\n')
const methodSource = uniqueMethods.map(method => `export const ${method} = <T = unknown>(client: TelegramClient, params: ${method}Params = {}, options?: RequestOptions) => client.call<T>('${method}', params, options)\nexport type ${method}Params = Record<string, unknown>`).join('\n\n')
await writeFile('src/generated/api.ts', `import type { TelegramClient, RequestOptions } from '../client/telegram-client.js'\nimport type { InputFile } from '../core/input-file.js'\n\n${typeSource}\n\n${methodSource}\n`)

if (process.argv.includes('--check')) {
  const current = JSON.parse(await readFile('schemas/generated-manifest.json', 'utf8'))
  if (current.methods.length !== uniqueMethods.length || current.types.length !== types.length) throw new Error('BUILD FAILED — generated Telegram API coverage is stale')
}
console.log(`Generated ${uniqueMethods.length} methods and ${types.length} types from ${SOURCE}`)

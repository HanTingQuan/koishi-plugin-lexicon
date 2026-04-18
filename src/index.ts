import type { Context } from 'koishi'
import { Random, Schema } from 'koishi'
import { dictionary, dictionaryAlias } from './data'

export const name = 'dict'

export interface Config {
  interpolation: string
  dictionaryAlias: Record<string, string>
}

export const Config: Schema<Config> = Schema.object({
  interpolation: Schema.string().default('【(.*?)】').description('插值正则表达式。'),
  dictionaryAlias: Schema.dict(Schema.union(Object.keys(dictionary))).default(dictionaryAlias).description('字典别名。'),
})

export function apply(ctx: Context, config: Config) {
  const interpolation = new RegExp(config.interpolation, 'g')

  function resolveDictionaryAlias(key: string) {
    return config.dictionaryAlias[key] || key
  }

  function resolveInterpolation(raw: string, key: string) {
    if (key.includes('|'))
      return Random.pick(key.split('|'))

    if (key.includes('&')) {
      const intersection = key.split('&')
        .map(resolveDictionaryAlias)
        .map(key => [...dictionary[key]])
        .reduce((acc, arr) => {
          const currSet = new Set(arr)
          return acc.filter(item => currSet.has(item))
        })
      return Random.pick(Array.from(intersection))
    }

    key = resolveDictionaryAlias(key)

    if (dictionary[key])
      return Random.pick([...dictionary[key]])

    return raw
  }

  ctx.command('echo <message:text>').action(async (_, message) => {
    return message.replaceAll(interpolation, resolveInterpolation)
  })
}

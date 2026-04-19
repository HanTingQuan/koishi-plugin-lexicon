import type { Context } from 'koishi'
import { h, Random, Schema } from 'koishi'
import { shortcut } from 'koishi-plugin-montmorill'
import { dictionary } from './data'

export const name = 'lexicon'

export interface Config {
  separator: string
  interpolation: string
  dictionaryAlias: Record<string, string>
}

export const Config: Schema<Config> = Schema.object({
  separator: Schema.string().default(' ').description('输出分隔符。'),
  interpolation: Schema.string().default('【(.*?)】').description('插值正则表达式。'),
  dictionary: Schema.dict(Schema.union([
    Schema.string(),
    Schema.array(Schema.string()),
  ])).description('字典。'),
  dictionaryAlias: Schema.dict(Schema.string()).description('字典别名。'),
})

export function apply(ctx: Context, config: Config) {
  const interpolation = new RegExp(config.interpolation, 'g')

  function resolveInterpolation(raw: string, key = raw): string[] {
    if (key.includes('|'))
      return key.split('|')

    if (key.includes('&')) {
      return key.split('&')
        .map(key => [...dictionary[key]])
        .reduce((acc, arr) => {
          const currSet = new Set(arr)
          return acc.filter(item => currSet.has(item))
        })
    }

    if (dictionary[key])
      return [...dictionary[key]]

    return [raw]
  }

  ctx.command('lkup [key:string]', '查询字典。')
    .alias('lookup', '查询')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`lkup` 查询所有字典目录。')
    .example('`lkup <key>` 查询key的字典。')
    .action(async ({ options }, key) => {
      if (!key) {
        return h('markdown', Object.keys(dictionary)
          .map(key => shortcut.input(`【${key}】`, key))
          .join(options?.separator || config.separator))
      }
      return h('markdown', resolveInterpolation(key)
        .join(options?.separator || config.separator))
    })

  ctx.command('alias [src:string] [dest:string]', '管理字典别名。')
    .alias('别名')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`alias` 查询所有别名。')
    .example('`alias <src>` 查询src的别名。')
    .example('`alias <src> <dest>` 设置src的别名。')
    .action(async ({ options }, src, dest) => {
      if (src && dest)
        dictionary[src] = dictionary[dest]
      if (src)
        return dictionary[src]
      return Object.entries(dictionary)
        .map(([key, value]) => `${key} -> ${value}`)
        .join(options?.separator || config.separator)
    })

  ctx.command('echo <message:text>', '输出消息。')
    .alias('填字')
    .example('`echo 【平水韵】` 输出随机平水韵韵部。')
    .action(async (_, message) => {
      return h('markdown', [
        message.replaceAll(interpolation, (...match) =>
          Random.pick(resolveInterpolation(match[0], match[1]))),
        `> 👉 ${shortcut.input(`echo ${message}`, '再来一次')}`,
      ].join('\n'))
    })
}

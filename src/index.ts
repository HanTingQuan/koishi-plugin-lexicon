import type { Context } from 'koishi'
import { h, Random, Schema } from 'koishi'
import { shortcut } from 'koishi-plugin-montmorill'
import Lexicon from './data'

export const name = 'lexicon'

export interface Config {
  separator: string
  interpPairs: string[]
  customDictionary: Record<string, string[]>
  dictionaryAlias: Record<string, string>
}

export const Config: Schema<Config> = Schema.object({
  separator: Schema.string().default(' ').description('输出分隔符。'),
  interpPairs: Schema.tuple([Schema.string(), Schema.string()]).default(['【', '】']).description('插值前后缀。'),
  customDictionary: Schema.dict(Schema.array(Schema.string())).description('自定义字典。'),
  dictionaryAlias: Schema.dict(Schema.union(Object.keys(Lexicon.dictionary))).description('字典别名。'),
})

export function apply(ctx: Context, config: Config) {
  Object.assign(Lexicon.aliases, config.dictionaryAlias)
  Lexicon.customs = config.customDictionary

  const interp = (key: string) => `${config.interpPairs[0]}${key}${config.interpPairs[1]}`

  const interpolation = new RegExp(interp('(.*?)'), 'g')

  ctx.command('lkup [key:string]', '查询字典。')
    .alias('lookup', '查询')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`lkup` 查询所有字典目录。')
    .example('`lkup <key>` 查询key的字典。')
    .action(async ({ options }, key) => {
      if (!key) {
        return h('markdown', Object.keys(Lexicon.dictionary)
          .map(key => shortcut.input(interp(key), key))
          .join(options?.separator || config.separator))
      }
      return h('markdown', Lexicon.lookup(key)
        .join(options?.separator || config.separator))
    })

  ctx.command('push [key:string] [...values:string]', '添加字典值。')
    .alias('append', '添加')
    .alias('delete', { options: { remove: true } })
    .alias('remove', { options: { remove: true } })
    .alias('删除', { options: { remove: true } })
    .alias('移除', { options: { remove: true } })
    .option('force', '-f 强制添加。')
    .option('remove', '-r 移除字典值。')
    .option('separator', '-s <sep:string> 分隔符。')
    .example(`\`push <key> <value>\` 添加value到${interp('key')}。`)
    .action(async ({ session, options }, key, ...values) => {
      const sep = options?.separator || config.separator
      if (!session)
        return

      if (Lexicon.dictionary[key])
        return `${interp(key)}是内置字典，无法更改。`

      if (!config.customDictionary[key])
        config.customDictionary[key] = []

      if (!values.length) {
        if (!options?.remove)
          return `请提供要添加的值。`

        if (!options.force)
          return `如要移除字典${interp(key)}，请使用 --force 选项。`

        delete config.customDictionary[key]
        ctx.scope.update(config)
        return `已成功移除字典${interp(key)}。`
      }

      const success = []
      const failed = []

      for (const item of values) {
        const index = config.customDictionary[key].indexOf(item)
        if (options?.remove) {
          if (index !== -1)
            success.push(config.customDictionary[key].splice(index, 1)[0])
          else
            failed.push(item)
        }
        else {
          if (index === -1 || options?.force)
            success.push(item)
          else
            failed.push(item)
        }
      }

      if (options?.remove) {
        if (success.length)
          await session.send(`移除成功：${success.join(sep)}`)
        if (failed.length)
          await session.send(`移除失败，以下值不存在：${failed.join(sep)}`)
      }
      else {
        if (success.length === 0)
          return `添加失败：所有值都已存在，您可以使用 --force 选项强制添加。`
        config.customDictionary[key].push(...success)
        await session.send(`添加成功：${success.join(sep)}`)
        if (failed.length)
          await session.send(`添加失败，以下值已存在：${failed.join(sep)}`)
      }

      return void ctx.scope.update(config)
    })

  ctx.command('alias [src:string] [dest:string]', '管理字典别名。')
    .alias('别名')
    .option('long', '-l 显示详细格式。')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`alias` 查询所有别名。')
    .example('`alias <src>` 查询src的别名。')
    .example('`alias <src> <dest>` 设置src的别名。')
    .action(async ({ options }, src, dest) => {
      if (src && dest) {
        config.dictionaryAlias[src] = dest
        ctx.scope.update(config)
        return `设置成功：${src}=${dest}`
      }
      if (src)
        return Lexicon.aliases[src] || `未知别名：${src}`
      return options?.long
        ? Object.entries(Lexicon.aliases)
            .map(([key, value]) => `${key} → ${value}`)
            .join('\n')
        : Object.keys(Lexicon.aliases)
            .join(options?.separator || config.separator)
    })

  ctx.command('echo <message:text>', '输出消息。')
    .alias('填字')
    .example(`\`echo ${interp('平水韵')}\` 输出随机平水韵韵部。`)
    .action(async (_, message) => {
      return h('markdown', [
        message.replaceAll(interpolation, (raw, key: string) => {
          let match
          if (match = key.match(/\*(\d+)$/)) {
            const count = Number.parseInt(match[1], 10)
            key = key.slice(0, -match[0].length)
            return Random.pick(Lexicon.lookup(raw, key), count).join('')
          }
          return Random.pick(Lexicon.lookup(raw, key))
        }),
        `> 👉 ${shortcut.input(`echo ${message}`, '再来一次')}`,
      ].join('\n'))
    })
}

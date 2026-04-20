import type { Context } from 'koishi'
import {} from '@koishijs/plugin-help'
import { h, Logger, mapValues, Schema } from 'koishi'
import { shortcut } from 'koishi-plugin-montmorill'
import Lexicon from './data'

export const name = 'lexicon'
const logger = new Logger(name)

export interface Config {
  separator: string
  customs: Record<string, string[]>
  aliases: Record<string, string>
  debugging: boolean
}

export const Config: Schema<Config> = Schema.object({
  separator: Schema.string().default(' ').description('输出分隔符。'),
  customs: Schema.dict(Schema.array(Schema.string())).description('自定义字典。'),
  aliases: Schema.dict(Schema.string()).description('字典别名。'),
  debugging: Schema.boolean().default(false).description('是否开启调试模式。'),
})

export function apply(ctx: Context, config: Config) {
  Lexicon.customs = Object.assign(
    config.customs,
    mapValues(config.aliases, key => [key]),
  )
  if (config.debugging)
    Lexicon.logger = logger

  ctx.command('lkup [key:string]', '查询字典。')
    .alias('lookup', '查询')
    .option('recursive', '-r 展开所有别名。')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`lkup` 查询所有字典目录。')
    .example('`lkup <key>` 查询key的字典。')
    .action(({ options }, key) => {
      if (!key) {
        return h('markdown', [
          ...Object.keys(Lexicon.builtins),
          ...Object.keys(Lexicon.customs),
        ]
          .map(key => shortcut.input(`%(${key})`, key))
          .join(options?.separator || config.separator))
      }

      const lookup = options?.recursive
        ? Lexicon.lookupRecursive.bind(Lexicon)
        : Lexicon.lookup.bind(Lexicon)
      return lookup(key).join(options?.separator || config.separator)
    })
    .subcommand('.remove [...src:string]', '移除别名。')
    .alias('.rm', '移除别名', '删除别名')
    .option('separator', '-s <sep:string> 分隔符。')
    .action(async ({ session, options }, ...src) => {
      if (!session)
        return
      if (!src.length)
        return `请提供要移除的别名。`
      const sep = options?.separator || config.separator
      const success = []
      const failed = []
      for (const item of src) {
        const dest = config.aliases[item]
        if (!dest) {
          failed.push(item)
          continue
        }
        delete config.aliases[item]
        success.push(`${item} -> ${dest}`)
      }
      if (success.length) {
        ctx.scope.update(config)
        await session.send(`移除成功：\n${success.join('\n')}`)
      }
      if (failed.length)
        await session.send(`未知别名：${failed.join(sep)}`)
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
    .example(`\`push <key> <value>\` 添加value到%(<key>)。`)
    .action(async ({ session, options }, key, ...values) => {
      const sep = options?.separator || config.separator
      if (!session)
        return

      if (Lexicon.builtins[key])
        return `%(${key}) 是内置字典，无法更改。`

      if (!config.customs[key])
        config.customs[key] = []

      if (!values.length) {
        if (!options?.remove)
          return `请提供要添加的值。`

        if (!options.force)
          return `如要移除字典 %(${key})，请使用 --force 选项。`

        delete config.customs[key]
        ctx.scope.update(config)
        return `已成功移除字典 %(${key})。`
      }

      const success: string[] = []
      const failed: string[] = []

      for (const item of values) {
        const index = config.customs[key].indexOf(item)
        if (options?.remove) {
          if (index !== -1)
            success.push(config.customs[key].splice(index, 1)[0])
          else
            failed.push(item)
        }
        else {
          if ((index === -1 && !success.includes(item)) || options?.force)
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
        config.customs[key].push(...success)
        await session.send(`添加成功：${success.join(sep)}`)
        if (failed.length)
          await session.send(`添加失败，以下值已存在：${failed.join(sep)}`)
      }

      return void ctx.scope.update(config)
    })

  ctx.command('find <...values:string>', '查找字典值。')
    .alias('查找')
    .option('separator', '-s <sep:string> 分隔符。')
    .example('`find <value>` 查找value的所在字典。')
    .action(({ options }, ...values) => {
      const sep = options?.separator || config.separator
      const result: string[] = []
      for (const value of values) {
        const entries = Object.entries(Lexicon.find(value))
        if (entries.length) {
          result.push(`${value} 所在字典：${entries
            .map(([key, value]) => value
              ? `*${shortcut.input(`%(${key})`, key)}*`
              : shortcut.input(`%(${key})`, key))
            .join(sep)}`)
        }
        else {
          result.push(`${value} 未找到。`)
        }
      }
      return h('markdown', result.join('\n') || '未找到任何值。')
    })

  ctx.command('echo <message:text>', '输出消息。')
    .alias('发', { options: { tips: true } })
    .alias('填字', { options: { tips: true } })
    .option('tips', '-t 显示贴士。')
    .example(`\`echo %(平水韵)\` 输出随机平水韵韵部。`)
    .action(({ options }, message) => {
      if (!message) {
        return '请提供要输出的消息。'
      }
      return h('markdown', [
        Lexicon.resolve(message),
        options?.tips && `> 👉 ${shortcut.input(`填字 ${message}`, '再来一次')}`,
      ].filter(Boolean).join('\n'))
    })

  ctx.command('chars <message:text>', { hidden: true })
    .action((_, message) => `(${Array.from(new Set(message.replaceAll(/\s+/g, ''))).join('|')})`)

  ctx.command('grep <needle:string> <haystack:text>', { hidden: true })
    .option('separator', '-s <sep:string> 分隔符。')
    .action(({ options }, needle, haystack) => {
      const sep = options?.separator || config.separator
      const regex = new RegExp(needle, 'g')
      return h('markdown', haystack.split(sep)
        .filter(item => item.match(regex)).join(sep)
        .replaceAll(regex, match => `**${match}**`)
        .replaceAll('****', ''))
    })

  ctx.middleware((session, next) => {
    return session.content
      && next(() => Lexicon.resolve(session.content!))
  }, true)
}

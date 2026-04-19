import { Random } from 'koishi'

export class Lexicon {
  constructor(
    public dictionary: Record<string, string | string[]>,
    public aliases: Record<string, keyof typeof this.dictionary>,
    public customs: Record<string, string[]> = {},
  ) {}

  operations: Record<string, (acc: string[], arr: string[]) => string[]> = {
    '|': undefined as any,
    '+': (a: string[], b: string[]) => [...a, ...b],
    '-': (a: string[], b: string[]) => a.filter(item => !b.includes(item)),
    '&': (a: string[], b: string[]) => a.filter(item => b.includes(item)),
  }

  resolve(string: string): string {
    let start = 0
    let result = ''

    while (start < string.length) {
      if (string[start] === '%' && string[start + 1] === '(') {
        let depth = 0
        let end = start + 2
        while (end < string.length) {
          if (string[end] === '(') {
            depth++
          }
          else if (string[end] === ')') {
            if (depth === 0)
              break
            depth--
          }
          end++
        }
        if (end >= string.length)
          return string

        const innerRaw = string.slice(start + 2, end) // %()
        const resolvedInner = this.resolve(innerRaw)
        result += this.evaluatePlaceholder(resolvedInner)
        start = end + 1
      }
      else {
        result += string[start]
        start++
      }
    }

    return result
  }

  private evaluatePlaceholder(keyWithSuffix: string): string {
    let key = keyWithSuffix
    let count = 1
    const match = key.match(/\*(\d+)$/)
    if (match) {
      count = Number.parseInt(match[1], 10)
      key = key.slice(0, -match[0].length)
    }
    // 注意：这里的 lookup 接收的是解析后的纯 key（不再需要 raw 参数）
    const candidates = this.lookup(key)
    if (!candidates || candidates.length === 0)
      return ''
    if (count === 1)
      return Random.pick(candidates)
    return Random.pick(candidates, count).join('')
  }

  lookup(raw: string, key = raw): string[] {
    key = key.trim()
    while (key.startsWith('(') && key.endsWith(')')
      && key.slice(1).indexOf('(') < key.indexOf(')')) {
      key = key.slice(1, -1).trim()
    }
    while (this.aliases[key]) {
      key = this.aliases[key]
    }

    for (const operator in this.operations) {
      const parts = this.splitOutsideParens(key, operator)
      if (parts.length > 1) {
        if (operator === '|')
          return parts
        return parts
          .map(part => this.lookup(raw, part))
          .reduce(this.operations[operator])
      }
    }

    if (this.customs[key])
      return Array.from(this.customs[key])

    if (this.dictionary[key])
      return Array.from(this.dictionary[key])

    return [raw]
  }

  private splitOutsideParens(expr: string, operator: string): string[] {
    const parts: string[] = []
    let depth = 0
    let start = 0

    for (let index = 0; index < expr.length; index++) {
      const char = expr[index]
      if (char === '(') {
        depth++
      }

      else if (char === ')') {
        depth--
      }

      else if (char === operator && depth === 0) {
        const part = expr.slice(start, index).trim()
        if (part)
          parts.push(part)
        start = index + 1
      }
    }

    const last = expr.slice(start).trim()
    if (last)
      parts.push(last)

    return parts
  }
}

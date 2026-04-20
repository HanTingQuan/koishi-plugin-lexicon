import { Random } from 'koishi'

export class Lexicon {
  constructor(
    public builtins: Record<string, string[] | string>,
    public customs: Record<string, string[]> = {},
  ) {}

  find(value: string) {
    const result: {
      key: string
      weak: boolean
    }[] = []

    for (const key in this.builtins) {
      const array = Array.from(this.builtins[key])
      if (array.includes(value))
        result.push({ key, weak: false })
      else if (array.join().includes(value))
        result.push({ key, weak: true })
    }

    for (const key in this.customs) {
      if (this.customs[key].includes(value))
        result.push({ key, weak: false })
      else if (this.customs[key].join().includes(value))
        result.push({ key, weak: true })
    }

    return result
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
          return '解析出错了！'

        const innerRaw = string.slice(start + 2, end) // %(
        const resolvedInner = this.resolve(innerRaw)
        result += this.evaluate(resolvedInner)
        start = end + 1
      }
      else {
        result += string[start]
        start++
      }
    }

    return result || '海狶不知道哦~'
  }

  private evaluate(key: string): string {
    let count = 1
    const match = key.match(/\*(\d+)$/)
    if (match) {
      count = Number.parseInt(match[1], 10)
      key = key.slice(0, -match[0].length)
    }
    return this.resolve(Random.pick(this.lookup(key), count).join(''))
  }

  operations: Record<string, (acc: string[], arr: string[]) => string[]> = {
    '+': (a: string[], b: string[]) => [...a, ...b],
    '-': (a: string[], b: string[]) => a.filter(item => !b.includes(item)),
    '&': (a: string[], b: string[]) => a.filter(item => b.includes(item)),
  }

  lookup(key: string): string[] {
    while (key.startsWith('(') && key.endsWith(')')
      && key.slice(1).indexOf('(') < key.indexOf(')')) {
      key = key.slice(1, -1)
    }

    const parts = this.splitOutsideParens(key, '|')
    if (parts.length > 1)
      return parts

    for (const operator in this.operations) {
      const parts = this.splitOutsideParens(key, operator)
      if (parts.length > 1) {
        return parts
          .map(part => this.lookup(part))
          .reduce(this.operations[operator])
      }
    }

    if (this.builtins[key])
      return Array.from(this.builtins[key])

    if (this.customs[key])
      return this.customs[key]

    return [key]
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
        const part = expr.slice(start, index)
        if (part)
          parts.push(part)
        start = index + 1
      }
    }

    const last = expr.slice(start)
    if (last)
      parts.push(last)

    return parts
  }
}

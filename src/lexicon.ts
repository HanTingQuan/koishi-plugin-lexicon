export class Lexicon {
  constructor(
    public dictionary: Record<string, string | string[]>,
    public aliases: Record<string, keyof typeof this.dictionary>,
    public customs: Record<string, string[]> = {},
  ) {}

  operations: Record<string, (acc: string[], arr: string[]) => string[]> = {
    '|': (a: string[], b: string[]) => [...a, ...b],
    '+': (a: string[], b: string[]) => [...a, ...b],
    '-': (a: string[], b: string[]) => a.filter(item => !b.includes(item)),
    '&': (a: string[], b: string[]) => a.filter(item => b.includes(item)),
  }

  lookup(raw: string, key = raw): string[] {
    key = key.trim()
    while (key.startsWith('(') && key.endsWith(')')) {
      key = key.slice(1, -1).trim()
    }

    for (const operator in this.operations) {
      const parts = this.splitOutsideParens(key, operator)
      if (parts.length > 1) {
        return parts
          .map(part => this.lookup(raw, part))
          .reduce(this.operations[operator])
      }
    }

    while (this.aliases[key]) {
      key = this.aliases[key]
    }
    if (this.customs[key]) {
      return [...this.customs[key]]
    }
    if (this.dictionary[key]) {
      return [...this.dictionary[key]]
    }
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

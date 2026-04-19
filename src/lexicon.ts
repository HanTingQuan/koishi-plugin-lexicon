export class Lexicon {
  constructor(
    public dictionary: Record<string, string | string[]>,
    public aliases: Record<string, keyof typeof this.dictionary>,
  ) {}

  lookup(raw: string, key = raw): string[] {
    if (key.includes('|'))
      return key.split('|')

    if (key.includes('&')) {
      return key.split('&')
        .map(key => this.lookup(key))
        .reduce((acc, arr) => {
          const currSet = new Set(arr)
          return acc.filter(item => currSet.has(item))
        })
    }

    if (this.aliases[key])
      return this.lookup(raw, this.aliases[key])

    if (this.dictionary[key])
      return [...this.dictionary[key]]

    return [raw]
  }
}

import type { UnionToIntersection } from './types'
import { mapValues } from 'koishi'
import 千字文 from './data/千字文.json'
import pingshui from './data/平水韵.json'
import 百家姓 from './data/百家姓.json'
import standard from './data/通用规范汉字表.json'

type Yindiao = keyof typeof pingshui
type Yunbu = keyof UnionToIntersection<typeof pingshui[keyof typeof pingshui]>

const yindiaos: Record<Yindiao, string> = mapValues(pingshui, value => Object.values(value).join(''))
const yunbus: Record<Yunbu, string> = Object.assign({}, ...Object.values(pingshui))

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

export default new Lexicon({
  平水韵: Object.keys(yunbus),
  ...yindiaos, // 平声，上声，去声，入声
  ...yunbus, // 一东，二冬，三江，四支……
  ...standard,
  天干: '甲乙丙丁戊己庚辛壬癸',
  地支: '子丑寅卯辰巳午未申酉戌亥',
  百家姓,
  千字文,
}, {
  ...Object.fromEntries(Object.keys(yindiaos).map(key => [key[0], key])),
  ...Object.fromEntries(Object.keys(yunbus).map(key => [key[key.length - 1], key])),
  ...Object.fromEntries(Object.keys(standard).map(key => [key[0], key])),
})

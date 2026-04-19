import type { UnionToIntersection } from './types'
import { mapValues } from 'koishi'
import 千字文 from './data/千字文.json'
import pingshui from './data/平水韵.json'
import 百家姓 from './data/百家姓.json'
import standard from './data/通用规范汉字表.json'
import { Lexicon } from './lexicon'

function makeAlias(dict: Record<string, any>, f: (key: string) => string) {
  return Object.fromEntries(Object.keys(dict).map(key => [f(key), key]))
}

type Yunbu = keyof UnionToIntersection<typeof pingshui[keyof typeof pingshui]>

const yunbus: Record<Yunbu, string> = Object.assign({}, ...Object.values(pingshui))

export default new Lexicon({
  平水韵: Object.keys(yunbus),
  ...yunbus, // 一东，二冬，三江，四支……
  ...standard,
  天干: '甲乙丙丁戊己庚辛壬癸',
  地支: '子丑寅卯辰巳午未申酉戌亥',
  百家姓,
  千字文,
}, {
  ...mapValues(pingshui, dict => Object.keys(dict).join('+')),
  ...makeAlias(yunbus, key => key[key.length - 1]),
  ...makeAlias(standard, key => key[0]),
  通用规范汉字: Object.keys(standard).join('+'),
  通规: '通用规范汉字',
})

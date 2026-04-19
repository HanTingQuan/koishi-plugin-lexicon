import type { UnionToIntersection } from './types'
import { mapValues } from 'koishi'
import 千字文 from './data/千字文.json'
import pingshui from './data/平水韵.json'
import 百家姓 from './data/百家姓.json'
import standard from './data/通用规范汉字表.json'
import { Lexicon } from './lexicon'

function makeAlias(array: string[], f: (key: string) => string) {
  return Object.fromEntries(array.map(key => [f(key), key]))
}

type Yunbu = keyof UnionToIntersection<typeof pingshui[keyof typeof pingshui]>

const yunbus: Record<Yunbu, string> = Object.assign({}, ...Object.values(pingshui))

export default new Lexicon({
  平水韵: Object.keys(yunbus),
  ...yunbus, // 一东，二冬，三江，四支……
  ...standard,
  百家姓,
  千字文,
  天干: '甲乙丙丁戊己庚辛壬癸',
  地支: '子丑寅卯辰巳午未申酉戌亥',
}, {
  仄: '上+去+入',
  ...mapValues(pingshui, dict => Object.keys(dict).join('+')), // 平(声)，上(声)，去(声)，入(声)
  ...makeAlias(Object.keys(yunbus), key => key[key.length - 1]), // (一)东，(二)冬，(三)江，(四)支……
  ...makeAlias(Object.keys(standard), key => key[0]), // 一(级字)，二(级字)，三(级字)
  通用规范汉字: Object.keys(standard).join('+'),
  通规: '通用规范汉字',
})

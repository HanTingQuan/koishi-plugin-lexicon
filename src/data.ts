import type { UnionToIntersection } from './types'
import { mapValues } from 'koishi'
import 切韵 from './data/切韵.json'
import 千字文 from './data/千字文.json'
import 平水韵 from './data/平水韵.json'
import 百家姓 from './data/百家姓.json'
import 通用规范汉字 from './data/通用规范汉字表.json'
import { Lexicon } from './lexicon'

type 平水韵韵部 = keyof UnionToIntersection<typeof 平水韵[keyof typeof 平水韵]>
const 平水韵韵部: Record<平水韵韵部, string> = Object.assign({}, ...Object.values(平水韵))

export default new Lexicon({
  切韵: Object.keys(切韵),
  ...切韵,
  千字文,
  平水韵: Object.keys(平水韵韵部),
  ...平水韵韵部, // 一东，二冬，三江，四支……
  百家姓,
  ...通用规范汉字,
  天干: '甲乙丙丁戊己庚辛壬癸',
  地支: '子丑寅卯辰巳午未申酉戌亥',
}, {
  ...mapValues(平水韵, 声调 => Object.keys(声调).join('+')), // 平声，上声，去声，入声
  平: '%(平声)',
  仄: '%(上声+去声+入声)',
  通用规范汉字: Object.keys(通用规范汉字).join('+'),
  並母: '%(并母)',
  喻母: '%(以母+云母)',
})

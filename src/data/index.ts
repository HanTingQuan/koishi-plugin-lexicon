import type { UnionToIntersection } from '../types'
import { mapValues } from 'koishi'
import 千字文 from './千字文.json'
import pingshui from './平水韵.json'
import 百家姓 from './百家姓.json'
import standard from './通用规范汉字表.json'

type Yindiao = keyof typeof pingshui
type Yunbu = keyof UnionToIntersection<typeof pingshui[keyof typeof pingshui]>

const yindiaos: Record<Yindiao, string> = mapValues(pingshui, value => Object.values(value).join(''))
const yunbus: Record<Yunbu, string> = Object.assign({}, ...Object.values(pingshui))

export const dictionary: Record<string, string | string[]> = {
  平水韵: Object.keys(yunbus),
  ...yindiaos, // 平声，上声，去声，入声
  ...yunbus, // 一东，二冬，三江，四支……
  ...standard,
  天干: '甲乙丙丁戊己庚辛壬癸',
  地支: '子丑寅卯辰巳午未申酉戌亥',
  百家姓,
  千字文,
}

export const dictionaryAlias = {
  ...Object.fromEntries(Object.keys(yindiaos).map(key => [key[0], key])),
  ...Object.fromEntries(Object.keys(yunbus).map(key => [key[key.length - 1], key])),
  ...Object.fromEntries(Object.keys(standard).map(key => [key[0], key])),
}

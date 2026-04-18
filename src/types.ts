export type UnionToIntersection<U> = (U extends any ? (x: U) => any : never) extends (x: infer R) => any ? R : never

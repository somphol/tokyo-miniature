import { langOf, STRINGS, type Lang, type Strings } from './i18n'
import type { QualityTier } from './config'

const query = new URLSearchParams(location.search)

export const params = {
  capture: query.get('capture') === '1',
  embed: query.get('embed') === '1',
  quality: (query.get('quality') === 'low' || query.get('quality') === 'high'
    ? query.get('quality')
    : null) as QualityTier | null,
  view: query.get('view'),
  lang: langOf(query.get('lang')),
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const restricted = window.self !== window.top
export const t: Strings = STRINGS[params.lang] as Strings
export type { Lang, Strings }

if (typeof document !== 'undefined') {
  document.documentElement.lang = t.htmlLang
  document.title = t.title
}

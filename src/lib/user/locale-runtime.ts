export const USER_LOCALE_STORAGE_KEY = 'ocp_user_locale'
export const USER_LOCALE_EVENT = 'ocp-locale-change'

export const LANGUAGE_TO_HTML_LANG = {
  EN: 'en',
  AR: 'ar',
  FR: 'fr',
}

export const RTL_LANGUAGE_CODES = new Set(['AR'])

export const applyLocaleToDocument = ({ language }: { language?: string } = {}) => {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  const normalizedLanguage = typeof language === 'string' ? language.toUpperCase() : 'EN'
  const htmlLang = LANGUAGE_TO_HTML_LANG[normalizedLanguage] || 'en'
  html.lang = htmlLang
  html.dir = RTL_LANGUAGE_CODES.has(normalizedLanguage) ? 'rtl' : 'ltr'
}

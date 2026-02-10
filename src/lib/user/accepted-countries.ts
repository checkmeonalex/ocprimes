export const ACCEPTED_COUNTRIES = [
  'Nigeria',
  'Egypt',
  'Ghana',
  'Ivory Coast',
  'Algeria',
  'Morocco',
  'USA',
  'UK',
  'UAE',
  'Canada',
] as const

export const ACCEPTED_COUNTRY_SET = new Set<string>(ACCEPTED_COUNTRIES)

// Template Registry — add/remove templates here.
// To add: create src/templates/<id>/ folder, add import + registry entry below.
// To remove: delete the folder + its entry here. Vendors using it fall back to 'default'.
import * as defaultTemplate from './default/index.mjs'
import * as prestigeTemplate from './prestige/index.mjs'
import * as biadTemplate from './biad/index.mjs'

const registry = {
  default: defaultTemplate,
  prestige: prestigeTemplate,
  biad: biadTemplate,
}

export function getTemplate(templateId) {
  const id = String(templateId || '').trim().toLowerCase()
  return registry[id] ?? registry.default
}

export function getAllTemplates() {
  return Object.values(registry).map((t) => t.config)
}

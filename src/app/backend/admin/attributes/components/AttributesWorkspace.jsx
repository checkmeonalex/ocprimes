'use client'

import TaxonomyManager from '@/app/backend/admin/components/TaxonomyManager'

export default function AttributesWorkspace() {
  return (
    <TaxonomyManager
      title='Attributes'
      description='Create and manage global product attributes and their options.'
      endpoint='/api/admin/attributes'
      singularLabel='attribute'
      pluralLabel='attributes'
      optionsEndpoint='/api/admin/attributes/options'
    />
  )
}

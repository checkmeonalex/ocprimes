const prestigeTemplateConfig = {
  id: 'prestige',
  name: 'Prestige',
  description:
    'A luxury, editorial layout. Dark minimal header, full-width hero banner, no sidebar — products front and centre in a clean 4-column grid with hover-reveal cards.',
  features: [
    'Dark header',
    'Full-width hero',
    'No sidebar',
    '4-column grid',
    'Hover-reveal cards',
  ],
  headerStyle: 'dark',
  bgColor: 'bg-[#f5f4f2]',
  accentBgColor: 'bg-[#ede9e3]',
  isAvailable: true,
  // Blocks seeded into storefront_blocks when this template is first activated
  defaultBlocks: [
    {
      type: 'banner_grid',
      config: {
        layout: 'single',
        mode: 'static',
        slides: [{ imageUrl: '', linkUrl: '' }],
      },
    },
  ],
}

export default prestigeTemplateConfig

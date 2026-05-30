const config = {
  id: 'biad',
  label: 'Biad',
  description: 'Streetwear-inspired. Image-forward grid, scrolling marquee, minimal white header.',
  darkProductPage: true,
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
export default config

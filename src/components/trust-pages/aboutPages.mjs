export const aboutPages = [
  {
    slug: 'about-us',
    group: 'about',
    eyebrow: 'About Alxora',
    title: 'About us',
    description:
      'What Alxora is building, who it is designed for, and why trust matters across the marketplace experience.',
    intro:
      'Alxora is built to make online shopping feel clearer, more local, and more dependable. The goal is not only to list products, but to create a marketplace that users can understand, trust, and return to with confidence.',
    highlights: [
      'Nigeria-first pricing and marketplace context.',
      'Support for shopping, stories, discovery, and seller growth in one platform.',
      'Trust built through transparency, support, and operational clarity.',
    ],
    sections: [
      {
        id: 'what-we-believe',
        title: 'What we believe a marketplace should do',
        paragraphs: [
          'A marketplace should help people buy with clarity, not confusion. That means pricing should make sense, trust should be visible, and support should feel like part of the product rather than an afterthought.',
          'We believe users are more confident when product discovery, account control, delivery information, and support standards all work together instead of living in disconnected fragments.',
        ],
      },
      {
        id: 'who-it-serves',
        title: 'Who Alxora is designed for',
        paragraphs: [
          'Alxora is designed for customers who want clearer shopping and for sellers who want a marketplace that respects listing quality, delivery discipline, and operational trust.',
          'It is especially focused on giving Nigerian users a more grounded experience while still supporting international browsing and currency display needs.',
        ],
      },
      {
        id: 'how-trust-is-earned',
        title: 'How trust is earned here',
        paragraphs: [
          'Trust is not a slogan. It is the combined result of consistent pricing logic, reliable support paths, clearer policies, better order visibility, and honest marketplace behavior.',
          'That is why Alxora invests in Help Center content, policy clarity, trust pages like this one, and user-facing flows that reduce ambiguity where it matters most.',
        ],
      },
    ],
    cta: {
      title: 'Want to explore the platform next?',
      description:
        'Start with the Help Center for practical user guidance or browse products and stories directly from the storefront.',
      primaryLabel: 'Visit Help Center',
      primaryHref: '/help-center',
      secondaryLabel: 'Browse Products',
      secondaryHref: '/products',
    },
  },
  {
    slug: 'how-alxora-works',
    group: 'about',
    eyebrow: 'About Alxora',
    title: 'How Alxora works',
    description:
      'A practical walkthrough of how discovery, checkout, support, and seller activity come together on the marketplace.',
    intro:
      'The platform works best when users can see how discovery, ordering, delivery, and support connect. This page explains that end-to-end flow in plain language.',
    highlights: [
      'Discovery starts through product pages, categories, Play, stories, and storefronts.',
      'Checkout depends on accurate account, address, and payment information.',
      'Support, returns, and protection paths are built around the order record.',
    ],
    sections: [
      {
        id: 'discovery',
        title: 'Discovery and product selection',
        paragraphs: [
          'Users can discover products through categories, search, storefronts, story surfaces, and Play-driven content. Different surfaces support different shopping moods: quick discovery, careful comparison, or direct purchase intent.',
          'The most trustworthy shopping path still comes from combining discovery with clear product review before payment.',
        ],
      },
      {
        id: 'checkout',
        title: 'Checkout and order creation',
        paragraphs: [
          'When a user moves to checkout, the platform relies on accurate account details, delivery information, available stock, and successful payment confirmation before the order is treated as complete.',
          'This is also why some issues are reviewed before final confirmation. A marketplace needs strong transaction integrity, not only fast button clicks.',
        ],
      },
      {
        id: 'after-order',
        title: 'After the order',
        paragraphs: [
          'Once an order exists, it becomes the main anchor for tracking, delivery updates, edits, returns, refund review, and support investigation. That single order context helps keep later decisions clearer and fairer.',
          'Support, returns, and order protection are strongest when they stay tied to the actual order timeline instead of vague descriptions.',
        ],
      },
    ],
    cta: {
      title: 'Want the operational details?',
      description:
        'The Help Center covers each real workflow in more detail, from tracking orders to refunds, account recovery, and technical issues.',
      primaryLabel: 'Open Help Center',
      primaryHref: '/help-center',
      secondaryLabel: 'Track your order',
      secondaryHref: '/help-center/orders-delivery/track-your-order',
    },
  },
  {
    slug: 'pricing-currency-info',
    group: 'about',
    eyebrow: 'About Alxora',
    title: 'Pricing & currency info',
    description:
      'How marketplace pricing is structured, why NGN is the base storefront currency, and what converted display pricing means.',
    intro:
      'Pricing trust matters because small misunderstandings here can create major checkout confusion. This page explains the pricing philosophy behind Alxora in a clearer, trust-first format.',
    highlights: [
      'NGN is the base pricing currency for seller-side marketplace setup.',
      'Other currencies are display conversions, not seller-side base prices.',
      'Clear pricing context helps prevent avoidable checkout misunderstandings.',
    ],
    sections: [
      {
        id: 'base-currency',
        title: 'Why pricing starts in Naira',
        paragraphs: [
          'Alxora is built around Nigeria-first pricing, which means seller-side product values start in Naira by default. This keeps the marketplace grounded in a clear local base instead of treating converted display values as the source of truth.',
          'That approach also reduces the risk of sellers accidentally pricing a local product as if it were already a USD amount.',
        ],
      },
      {
        id: 'display-conversion',
        title: 'What happens when users switch display currency',
        paragraphs: [
          'When supported display currency changes are available, the storefront converts from the base NGN value into the chosen display currency. That means the conversion is a presentation layer, not a seller-side product rewrite.',
          'Switching back to NGN returns the original base pricing view instead of a second-hand converted amount.',
        ],
      },
      {
        id: 'building-price-trust',
        title: 'How users can read pricing more confidently',
        paragraphs: [
          'Users should review product variant selection, promotion context, and visible marketplace mode when comparing prices. If something looks wrong, the first question is whether the display or variant state changed, not whether pricing is automatically fraudulent.',
          'Where a section clearly ignores the selected currency behavior, that should be treated as a display issue and reported.',
        ],
      },
    ],
    cta: {
      title: 'Need the support version of this topic?',
      description:
        'The Help Center explains what users should check when prices appear incorrect or currency display feels inconsistent.',
      primaryLabel: 'Read pricing help',
      primaryHref: '/help-center/payments-checkout/why-prices-show-in-naira',
      secondaryLabel: 'Talk to Support',
      secondaryHref: '/UserBackend/messages?help_center=1',
    },
  },
  {
    slug: 'careers',
    group: 'about',
    eyebrow: 'About Alxora',
    title: 'Careers (future)',
    description:
      'A forward-looking page for how Alxora thinks about building teams, operating standards, and future hiring priorities.',
    intro:
      'This is a future-facing page because the goal is not to publish generic hiring noise before the structure is real. We would rather be clear about where we are than pretend a fully mature careers program already exists.',
    highlights: [
      'Future hiring will prioritize operators who care about trust, clarity, and execution.',
      'Marketplace quality depends on disciplined product, support, and operational thinking.',
      'A serious team should help the platform earn trust, not just ship features.',
    ],
    sections: [
      {
        id: 'what-we-value',
        title: 'What we would value in future teammates',
        paragraphs: [
          'Alxora will need people who care about practical product quality, user trust, operational clarity, and the discipline required to grow a marketplace without letting it become chaotic.',
          'That includes people who can simplify complexity, write clearly, debug real workflows, and make support, fulfilment, and platform quality feel connected.',
        ],
      },
      {
        id: 'why-this-matters',
        title: 'Why careers trust matters too',
        paragraphs: [
          'A strong marketplace is built by strong operational habits. Public trust improves when the people behind the platform care about clarity, not only marketing language.',
          'That is why even a future careers page should say something real about standards instead of filling space with empty promises.',
        ],
      },
      {
        id: 'future-updates',
        title: 'How this page will evolve',
        paragraphs: [
          'As hiring becomes more formal, this page can expand into role openings, hiring principles, and clearer team information. Until then, the honest position is that careers are a future-facing area rather than an overclaimed present feature.',
        ],
      },
    ],
    cta: {
      title: 'Want to work with the marketplace before public hiring opens?',
      description:
        'The best current way to participate is to explore selling on the platform and understand how the marketplace operates from the inside.',
      primaryLabel: 'Sell On Alxora',
      primaryHref: '/about/sell-on-alxora',
      secondaryLabel: 'How Alxora works',
      secondaryHref: '/about/how-alxora-works',
    },
  },
  {
    slug: 'sell-on-alxora',
    group: 'about',
    eyebrow: 'About Alxora',
    title: 'Sell On Alxora',
    description:
      'What sellers should expect from the platform, how marketplace trust affects sales quality, and when to move into seller signup.',
    intro:
      'Selling on Alxora should be more than opening a listing form. The strongest sellers understand the marketplace logic behind pricing, fulfilment, trust, and support before they start listing aggressively.',
    highlights: [
      'Good seller performance depends on accurate listings, disciplined fulfilment, and honest support behavior.',
      'Nigeria-first pricing matters on the seller side too.',
      'Trustworthy sellers strengthen both buyer confidence and long-term marketplace quality.',
    ],
    sections: [
      {
        id: 'what-good-selling-looks-like',
        title: 'What good selling looks like here',
        paragraphs: [
          'Strong sellers present products clearly, price honestly, fulfil accurately, and avoid the avoidable errors that create unnecessary returns, claims, and complaints.',
          'Marketplace trust does not come only from having inventory. It comes from the discipline to represent, pack, dispatch, and support orders well.',
        ],
      },
      {
        id: 'what-to-understand-first',
        title: 'What to understand before signup',
        paragraphs: [
          'Before signing up, sellers should understand how the platform handles pricing, currency display, fulfilment quality, return-related reviews, and policy enforcement.',
          'This helps sellers start from a realistic operational mindset instead of treating the platform like a listing dump.',
        ],
      },
      {
        id: 'when-to-sign-up',
        title: 'When to move into seller signup',
        paragraphs: [
          'If you are ready to maintain accurate listings, follow seller policy, fulfil reliably, and respond professionally when support needs seller-side clarity, then seller signup is the right next step.',
          'It is better to join prepared than to join casually and create trust problems immediately.',
        ],
      },
    ],
    cta: {
      title: 'Ready to start selling?',
      description:
        'Move into seller signup when you are ready to operate with clear pricing, strong fulfilment discipline, and marketplace-quality listing standards.',
      primaryLabel: 'Start selling',
      primaryHref: '/sellersignup',
      secondaryLabel: 'Seller Policy',
      secondaryHref: '/legal/seller-policy',
    },
  },
]

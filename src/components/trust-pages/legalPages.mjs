export const legalPages = [
  {
    slug: 'terms-of-service',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Terms of Service',
    lastUpdated: 'March 8, 2025',
    description:
      'Welcome to Alxora. These Terms of Service ("Terms") govern your access to and use of the Alxora platform, including browsing products, placing orders, creating an account, and interacting with marketplace features.',
    intro:
      'By using Alxora, you agree to comply with these Terms.',
    highlights: [
      'Users must provide accurate information and protect their account credentials.',
      'Orders may be reviewed, cancelled, or limited when payment, stock, or fraud issues appear.',
      'Platform access and terms may change as Alxora evolves operationally and legally.',
    ],
    content: [
      {
        id: 'using-alxora',
        title: '1. Using Alxora',
        paragraphs: [
          'You must be at least 18 years old or have permission from a legal guardian to use the platform.',
          'You agree to provide accurate information when creating an account, placing orders, or contacting support. You are responsible for maintaining the security of your account credentials.',
          'Alxora may suspend or restrict access if misuse, fraud, or violation of platform rules is detected.',
        ],
      },
      {
        id: 'marketplace-role',
        title: '2. Marketplace Role and Fulfilment',
        paragraphs: [
          'Alxora operates as a curated marketplace that manages order processing and fulfilment coordination.',
          'Product listings are presented for discovery and purchase through the platform. Once an order is placed, Alxora oversees payment confirmation, fulfilment flow, and delivery coordination.',
          'Delivery timelines and availability may vary depending on operational factors.',
        ],
      },
      {
        id: 'orders-payments',
        title: '3. Orders and Payments',
        paragraphs: [
          'By placing an order, you agree to pay the full amount shown at checkout, including delivery fees and applicable charges.',
          'Orders may be reviewed or cancelled if:',
        ],
        bullets: [
          'Payment cannot be confirmed.',
          'Product availability changes.',
          'Suspicious activity is detected.',
        ],
        paragraphsAfterBullets: [
          'If a payment is deducted but the order is not confirmed, users should contact support for investigation.',
        ],
      },
      {
        id: 'returns-refunds',
        title: '4. Returns and Refunds',
        paragraphs: [
          'Returns are subject to eligibility conditions described in the Returns Policy.',
          'Refunds are processed after return approval and verification steps. Processing time depends on payment providers and operational review.',
          'Certain items may be marked as non-returnable.',
        ],
      },
      {
        id: 'order-protection',
        title: '5. Order Protection',
        paragraphs: [
          'Alxora may provide order protection support in situations such as:',
        ],
        bullets: [
          'Item not received.',
          'Item significantly different from description.',
          'Confirmed delivery issues.',
        ],
        paragraphsAfterBullets: [
          'Protection decisions are made after review of submitted evidence and order history.',
        ],
      },
      {
        id: 'account-responsibility',
        title: '6. Account Responsibility',
        paragraphs: [
          'Users are responsible for keeping account information updated, including delivery addresses and contact details.',
          'Unauthorized use of an account must be reported immediately.',
        ],
      },
      {
        id: 'acceptable-use',
        title: '7. Acceptable Use',
        paragraphs: [
          'Users must not:',
        ],
        bullets: [
          'Attempt fraudulent payments or chargebacks.',
          'Abuse returns or protection systems.',
          'Manipulate listings, pricing, or platform features.',
          'Upload harmful or misleading content.',
        ],
        paragraphsAfterBullets: [
          'Violation may result in account suspension or permanent restriction.',
        ],
      },
      {
        id: 'availability',
        title: '8. Platform Availability',
        paragraphs: [
          'Alxora may update, modify, or temporarily limit platform features for maintenance, security, or operational reasons.',
          'The platform does not guarantee uninterrupted availability.',
        ],
      },
      {
        id: 'liability',
        title: '9. Limitation of Liability',
        paragraphs: [
          'To the extent permitted by law, Alxora is not liable for indirect losses, delays caused by third-party logistics, or user errors such as incorrect address entry.',
        ],
      },
      {
        id: 'changes',
        title: '10. Changes to These Terms',
        paragraphs: [
          'Alxora may update these Terms periodically. Continued use of the platform after updates means you accept the revised Terms.',
        ],
      },
      {
        id: 'contact',
        title: '11. Contact',
        paragraphs: [
          'If you have questions about these Terms, contact Alxora Support with your account email and inquiry details.',
        ],
      },
    ],
    cta: {
      title: 'Need clarification on marketplace rules?',
      description:
        'The Help Center explains how these rules appear in real order, refund, account, and support scenarios.',
      primaryLabel: 'Visit Help Center',
      primaryHref: '/help-center',
      secondaryLabel: 'Talk to Support',
      secondaryHref: '/UserBackend/messages?help_center=1',
    },
  },
  {
    slug: 'privacy-policy',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    lastUpdated: 'March 12, 2026',
    description:
      'This Privacy Policy explains how Alxora collects, uses, stores, and protects your personal information when you use the platform.',
    intro:
      'By using Alxora, you agree to the practices described in this policy.',
    highlights: [
      'Personal, order, and technical data may be used to run accounts, fulfil orders, and keep the platform secure.',
      'Full payment card details are handled by secure third-party payment providers, not stored by Alxora.',
      'Information may be shared only where necessary for payments, delivery, fraud prevention, or legal compliance.',
    ],
    content: [
      {
        id: 'information-we-collect',
        title: '1. Information We Collect',
        paragraphs: [
          'We may collect information you provide directly, including:',
        ],
        bullets: [
          'Name',
          'Email address',
          'Phone number',
          'Delivery address',
          'Account preferences',
        ],
        paragraphsAfterBullets: [
          'We also collect order-related information such as purchased items, payment confirmations, and delivery details.',
          'Technical information may be collected automatically, including:',
        ],
        secondaryBullets: [
          'Device type',
          'Browser type',
          'IP address',
          'Usage activity on the platform',
        ],
      },
      {
        id: 'how-we-use-information',
        title: '2. How We Use Your Information',
        paragraphs: [
          'Your information is used to:',
        ],
        bullets: [
          'Create and manage your account',
          'Process and fulfil orders',
          'Coordinate delivery',
          'Provide customer support',
          'Improve platform performance and user experience',
          'Detect fraud or suspicious activity',
        ],
        paragraphsAfterBullets: [
          'We may also use your contact details to send important service updates related to orders, account security, or policy changes.',
        ],
      },
      {
        id: 'payment-information',
        title: '3. Payment Information',
        paragraphs: [
          'Alxora does not store full payment card details.',
          'Payments are processed through secure third-party payment providers. These providers handle payment authorization and security compliance.',
        ],
      },
      {
        id: 'sharing-of-information',
        title: '4. Sharing of Information',
        paragraphs: [
          'We may share necessary information with trusted partners such as:',
        ],
        bullets: [
          'Delivery and logistics providers',
          'Payment processors',
          'Fraud prevention and security services',
        ],
        paragraphsAfterBullets: [
          'Information is only shared to the extent required to complete transactions, improve security, or comply with legal obligations.',
        ],
      },
      {
        id: 'data-storage-security',
        title: '5. Data Storage and Security',
        paragraphs: [
          'Alxora takes reasonable measures to protect your personal information from unauthorized access, misuse, or loss.',
          'Security practices may include encryption, access controls, and monitoring for suspicious activity.',
          'However, no online platform can guarantee absolute security.',
        ],
      },
      {
        id: 'your-responsibilities',
        title: '6. Your Responsibilities',
        paragraphs: [
          'You are responsible for keeping your account credentials secure and ensuring your contact and delivery information is accurate.',
          'If you believe your account has been compromised, contact support immediately.',
        ],
      },
      {
        id: 'cookies-platform-usage',
        title: '7. Cookies and Platform Usage',
        paragraphs: [
          'Alxora may use cookies or similar technologies to:',
        ],
        bullets: [
          'Maintain login sessions',
          'Remember preferences',
          'Improve browsing performance',
          'Analyze platform usage',
        ],
        paragraphsAfterBullets: [
          'You may adjust browser settings to manage cookie behavior.',
        ],
      },
      {
        id: 'data-retention',
        title: '8. Data Retention',
        paragraphs: [
          'We retain information as long as necessary to provide services, comply with legal requirements, resolve disputes, and enforce platform policies.',
        ],
      },
      {
        id: 'changes-to-policy',
        title: '9. Changes to This Policy',
        paragraphs: [
          'Alxora may update this Privacy Policy from time to time. Continued use of the platform after updates means you accept the revised policy.',
        ],
      },
      {
        id: 'privacy-contact',
        title: '10. Contact',
        paragraphs: [
          'If you have questions about this Privacy Policy or how your data is handled, contact Alxora Support with your registered email and inquiry details.',
        ],
      },
    ],
    cta: {
      title: 'Need help with account or data concerns?',
      description:
        'If your privacy question is tied to a real order, account lockout, or support case, contact the Help Center with the exact context.',
      primaryLabel: 'Talk to Support',
      primaryHref: '/UserBackend/messages?help_center=1',
      secondaryLabel: 'Help Center',
      secondaryHref: '/help-center',
    },
  },
  {
    slug: 'returns-policy',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Returns Policy',
    description:
      'The operating policy behind returns, eligibility, review timing, and return-related support decisions.',
    intro:
      'Returns are handled best when the policy is clear before a dispute starts. This page explains the framework behind return requests, what usually qualifies, and when a return may not be available.',
    highlights: [
      'Return eligibility depends on timing, item condition, and listing context.',
      'Not every dissatisfaction case leads to the same return outcome.',
      'Return evidence and order-level details help support review faster.',
    ],
    sections: [
      {
        id: 'eligibility',
        title: 'Eligibility and timing',
        paragraphs: [
          'A return request is strongest when it is submitted quickly, tied clearly to the correct order, and supported by accurate details about the product condition or mismatch.',
          'Eligibility may be limited where items are used, altered after delivery, explicitly non-returnable, or reported outside the reasonable review window.',
        ],
        bullets: [
          'Submit return requests as early as possible.',
          'Keep packaging, tags, and evidence where relevant.',
          'Use the original order context instead of vague standalone complaints.',
        ],
      },
      {
        id: 'review-process',
        title: 'How return review works',
        paragraphs: [
          'Support and return review may look at the listing context, reason for return, media evidence, delivery status, and whether the product condition aligns with the claim being made.',
          'Clear, factual explanations almost always move faster than emotional but incomplete complaints.',
        ],
        bullets: [
          'Wrong item, damage, or major mismatch should be described specifically.',
          'Exchange intent may follow a different path from a standard return.',
          'Approved return handling does not always mean instant refund reflection.',
        ],
      },
      {
        id: 'non-returnable',
        title: 'When a return may not be available',
        paragraphs: [
          'Some items or scenarios may not support returns due to category rules, item condition, hygiene or safety concerns, policy restrictions, or late reporting.',
          'Where return is not available, order protection or another support path may still apply if the issue is serious and clearly documented.',
        ],
        bullets: [
          'Change of mind does not automatically create return eligibility.',
          'Incorrect size selection by the buyer may lead to exchange guidance rather than direct approval.',
          'Covered protection issues may still be reviewed separately.',
        ],
      },
    ],
    cta: {
      title: 'Need the step-by-step return flow?',
      description:
        'The Help Center explains how to start a return, what to include, and how refund timing usually works after approval.',
      primaryLabel: 'Open Returns Help',
      primaryHref: '/help-center/returns-refunds/how-to-return-an-item',
      secondaryLabel: 'Talk to Support',
      secondaryHref: '/UserBackend/messages?help_center=1',
    },
  },
  {
    slug: 'order-protection-policy',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Order Protection Policy',
    description:
      'The formal protection standard used when an order outcome breaks down in a serious, reviewable way.',
    intro:
      'Order Protection exists for cases where the normal buying process does not end fairly. It is meant for confirmed issues, not as a workaround for every change-of-mind situation.',
    highlights: [
      'Coverage focuses on major item, fulfilment, and description problems.',
      'Claims require clear evidence and timely reporting.',
      'Approved protection may override a standard non-returnable listing in covered cases.',
    ],
    sections: [
      {
        id: 'what-is-covered',
        title: 'What is covered',
        paragraphs: [
          'Order Protection may apply when an item arrives damaged, is defective, or differs significantly from the product description in a way that affects the real value or usability of the purchase.',
          'The issue must be concrete enough to review. Broad dissatisfaction without evidence is not the same as a covered protection problem.',
        ],
        bullets: [
          'Serious damage or functional defect.',
          'Major mismatch between listing and delivered item.',
          'Other covered fulfilment issues confirmed through review.',
        ],
      },
      {
        id: 'what-is-not-covered',
        title: 'What is not covered',
        paragraphs: [
          'Protection does not automatically apply to change of mind, routine fit preference, ordinary cosmetic tolerance, or wear that occurs after use.',
          'The policy is designed for fairness, not for turning every post-delivery preference change into a covered claim.',
        ],
        bullets: [
          'Wrong size chosen by the buyer.',
          'Minor cosmetic expectations not rising to a material defect.',
          'Normal wear, use damage, or very late reporting.',
        ],
      },
      {
        id: 'claims-review',
        title: 'Claim timing and review',
        paragraphs: [
          'Claims should be submitted within 48 hours of delivery wherever possible, with supporting photo or video evidence that clearly shows the issue.',
          'OCPRIMES reviews the order context, listing details, delivery state, and supporting evidence before deciding whether protection applies and what resolution path is appropriate.',
        ],
        bullets: [
          'Use the order context and timeline clearly.',
          'Upload relevant evidence, not unrelated screenshots.',
          'Support may request clarifying details before final review.',
        ],
      },
    ],
    cta: {
      title: 'Need the operational version of this policy?',
      description:
        'The Help Center explains what to submit, when to escalate, and how order protection connects to returns and refunds.',
      primaryLabel: 'View Order Protection Help',
      primaryHref: '/help-center/returns-refunds/order-protection-support',
      secondaryLabel: 'Talk to Support',
      secondaryHref: '/UserBackend/messages?help_center=1',
    },
  },
  {
    slug: 'seller-policy',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Seller Policy',
    description:
      'The operating expectations for sellers listing products, setting pricing, fulfilling orders, and interacting with buyers on OCPRIMES.',
    intro:
      'A marketplace earns trust when seller standards are clear. This policy outlines the baseline expectations for listing quality, pricing integrity, fulfilment behavior, and professional conduct.',
    highlights: [
      'Listings should be accurate, current, and honest.',
      'Seller conduct should support fair fulfilment and clean support handling.',
      'Repeated listing abuse or fulfilment failure may reduce seller privileges.',
    ],
    sections: [
      {
        id: 'listing-standards',
        title: 'Listing and pricing standards',
        paragraphs: [
          'Sellers are expected to present products truthfully, using accurate descriptions, pricing, images, availability, and relevant condition details.',
          'Misleading descriptions, fake scarcity, bait pricing, and inconsistent product representation damage trust and may lead to enforcement.',
        ],
        bullets: [
          'Keep listing details updated when inventory or product facts change.',
          'Do not present unsupported claims as fact.',
          'Use pricing in line with the marketplace currency framework.',
        ],
      },
      {
        id: 'fulfilment-support',
        title: 'Fulfilment and buyer support responsibilities',
        paragraphs: [
          'Sellers should process legitimate orders promptly, maintain realistic fulfilment expectations, and respond responsibly when support review requires seller-side clarification.',
          'Fulfilment quality is not only about shipping quickly. It also includes correct product matching, accurate packaging, and reducing preventable buyer disputes.',
        ],
        bullets: [
          'Dispatch and fulfil accurately.',
          'Avoid cancellations caused by poor stock discipline.',
          'Cooperate with support reviews where order evidence is required.',
        ],
      },
      {
        id: 'enforcement',
        title: 'Enforcement and seller risk',
        paragraphs: [
          'OCPRIMES may limit listing visibility, seller privileges, or account access where repeated policy violations, fraud signals, delivery failures, or abusive conduct are identified.',
          'Strong seller performance helps build buyer trust. Poor seller discipline creates platform-wide friction and may trigger stronger review.',
        ],
        bullets: [
          'Policy enforcement may affect listing visibility and account status.',
          'High-risk behavior may trigger manual review.',
          'Seller trust is built through consistency, not one-off performance.',
        ],
      },
    ],
    cta: {
      title: 'Planning to sell on OCPRIMES?',
      description:
        'Use the seller signup flow when you are ready to move from policy reading to marketplace setup.',
      primaryLabel: 'Sell On Alxora',
      primaryHref: '/sellersignup',
      secondaryLabel: 'Vendor Login',
      secondaryHref: '/vendor/login',
    },
  },
  {
    slug: 'acceptable-use',
    group: 'legal',
    eyebrow: 'Legal',
    title: 'Acceptable Use',
    description:
      'The behavior standard for how users should and should not use the OCPRIMES platform, tools, and support systems.',
    intro:
      'A marketplace cannot stay trustworthy if its tools are used in bad faith. Acceptable Use explains the boundaries for ordinary users, buyers, sellers, and anyone interacting with the platform.',
    highlights: [
      'Platform tools should be used lawfully and honestly.',
      'Abuse of messaging, claims, reviews, or listing systems may trigger restrictions.',
      'Security, fraud, and trust reviews may rely on this policy when behavior is evaluated.',
    ],
    sections: [
      {
        id: 'allowed-use',
        title: 'Allowed use',
        paragraphs: [
          'OCPRIMES may be used for legitimate shopping, selling, browsing, support communication, and account management activities that respect platform rules and the rights of other users.',
          'Using the platform responsibly means not only avoiding obvious abuse, but also avoiding manipulative behavior that degrades trust, pricing integrity, or support quality.',
        ],
        bullets: [
          'Use real account details and lawful payment behavior.',
          'Communicate respectfully in support and marketplace interactions.',
          'Use claims, reviews, and reports honestly.',
        ],
      },
      {
        id: 'prohibited-use',
        title: 'Prohibited use',
        paragraphs: [
          'Examples of prohibited conduct include fraud, impersonation, abuse of promotions, support harassment, false claims, deliberate misinformation, unauthorized scraping, and attempts to interfere with platform stability or commercial integrity.',
          'Not every misuse looks dramatic. Repeated low-grade abuse can still damage the marketplace and may be treated seriously.',
        ],
        bullets: [
          'Do not misuse refund, dispute, or report systems.',
          'Do not create fake engagement, reviews, or listings.',
          'Do not attempt to bypass platform controls or safety restrictions.',
        ],
      },
      {
        id: 'consequences',
        title: 'Consequences of abuse',
        paragraphs: [
          'When abuse is detected, OCPRIMES may warn, restrict, suspend, or permanently limit access depending on severity, repetition, and platform risk.',
          'Some actions may also affect order handling, listing visibility, communication tools, or eligibility for protection and support pathways.',
        ],
        bullets: [
          'Access controls may change without advance notice in serious abuse cases.',
          'Evidence from account activity and support history may inform enforcement.',
          'Safer marketplace behavior protects both buyers and sellers.',
        ],
      },
    ],
    cta: {
      title: 'Need help understanding a restriction?',
      description:
        'If a policy or account action feels unclear, contact support with the exact workflow, message, or order context involved.',
      primaryLabel: 'Talk to Support',
      primaryHref: '/UserBackend/messages?help_center=1',
      secondaryLabel: 'Help Center',
      secondaryHref: '/help-center',
    },
  },
]

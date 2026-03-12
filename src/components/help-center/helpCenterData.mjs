const makeArticle = (id, title, description, content) => ({
  id,
  title,
  description,
  content,
})

export const HELP_CENTER_POPULAR_SEARCHES = [
  'track order',
  'return item',
  'refund',
  'payment failed',
  'reset password',
  'delivery',
]

export const HELP_CENTER_SUPPORT_ACTIONS = [
  {
    id: 'track-order',
    label: 'Track your order',
    icon: 'truck',
    href: '/help-center/orders-delivery/track-your-order',
  },
  {
    id: 'payment-help',
    label: 'Payment failed',
    icon: 'credit-card',
    href: '/help-center/payments-checkout/payment-failed-or-declined',
  },
  {
    id: 'return-help',
    label: 'Start a return',
    icon: 'rotate',
    href: '/help-center/returns-refunds/how-to-return-an-item',
  },
  {
    id: 'password-help',
    label: 'Reset password',
    icon: 'settings',
    href: '/help-center/account-security/reset-or-change-password',
  },
]

export const HELP_CENTER_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    summary:
      'Learn how to create an account, browse products, and use basic shopping features.',
    icon: 'rocket',
    accentClassName: 'bg-[#0f6155] text-white',
    articles: [
      makeArticle(
        'create-or-sign-in',
        'Create or sign in to your account',
        'A practical guide to opening your OCPRIMES account properly, signing back in without confusion, and setting yourself up for smoother shopping.',
        [
          {
            heading: 'Start with one account you will actually keep',
            paragraphs: [
              '**OCPRIMES works best when you keep one main account** instead of creating a new one every time something goes slightly wrong.',
              'Use an email address you check often, a phone number you can still access, and a password you can remember without turning sign-in into drama. Those simple choices affect order updates, password recovery, and how quickly support can help you later.',
            ],
            bullets: [
              {
                text: 'Use ==one account you actually plan to keep== for shopping, saved items, and order history.',
                children: [
                  'Creating duplicate accounts usually splits your orders and makes support slower than it needs to be.',
                ],
              },
              'Choose contact details that are active enough for delivery alerts and account recovery.',
              'Create a password that is strong, but not so random that you forget it when checkout matters.',
            ],
          },
          {
            heading: 'Create the account in a way that helps later',
            paragraphs: [
              'Once the account is created, finish the setup while you still remember everything. The strongest first move is to [verify your email or phone](/help-center/getting-started/verify-email-or-phone) and make sure your profile is attached to details you truly control.',
              'That small bit of setup is what separates a dependable account from the kind of half-finished profile that breaks the moment you need a password reset, delivery update, or support follow-up.',
            ],
            bullets: [
              'Verify your main contact method before placing important orders.',
              'Save the delivery details you use most often once you are ready to shop seriously.',
              {
                text: 'If something about the sign-up flow feels off, fix it early.',
                children: [
                  'It is easier to correct one bad detail now than untangle a broken profile after payment.',
                ],
              },
            ],
          },
          {
            heading: 'If sign-in fails, recover the right account',
            paragraphs: [
              'If you are returning and sign-in does not work, pause before opening another account. In most cases, the issue is a forgotten password, an old number, or a missed verification step, not a reason to start over from scratch.',
              'The better move is to recover the account you already trust. Use the [reset or change password](/help-center/account-security/reset-or-change-password) flow first, then check whether your old contact details still make sense.',
            ],
            bullets: [
              'Try the recovery flow before creating a second profile.',
              {
                text: 'Watch for the common causes of failed sign-in.',
                children: [
                  'Using the wrong email or phone number.',
                  'Typing a password for a different account.',
                  'Trying to sign in before verification is complete.',
                ],
              },
              'If anything feels suspicious after you get back in, **change your password immediately**.',
            ],
          },
          {
            heading: 'Finish the setup before you shop seriously',
            paragraphs: [
              'A well-set-up account makes everything else feel lighter. Checkout is faster, delivery details are clearer, and your order history stays in one place instead of being scattered across logins you barely remember.',
              'That is the real point of getting started well. You are not only opening an account. You are making the rest of shopping, support, and delivery easier from day one.',
            ],
            bullets: [
              'Review your profile before your first important order.',
              'Keep your shipping details current as your routine changes.',
              'Use [Save shipping addresses](/help-center/account-security/save-shipping-addresses) when you want faster checkout later.',
              'Treat ==good account setup as part of good shopping==, not as an afterthought.',
            ],
          },
        ],
      ),
      makeArticle(
        'verify-email-or-phone',
        'Verify your email or phone',
        'Confirm your contact details so your account can receive alerts and recovery links.',
        [
          {
            heading: 'Why verification matters',
            paragraphs: [
              'Verified contact details make password recovery, delivery updates, and Help Center follow-up more reliable.',
              'Without verification, some account actions may fail or become harder to complete quickly.',
            ],
          },
          {
            heading: 'If you do not receive the code',
            paragraphs: [
              'Check whether the email landed in spam or whether the phone number entered is correct. Small typing mistakes are common and can block the full flow.',
              'Wait briefly before requesting another code so you do not create overlapping verification attempts.',
            ],
          },
          {
            heading: 'Best next step',
            paragraphs: [
              'Finish verification before placing important orders or depending on account recovery options.',
              'If repeated attempts still fail, contact the Help Center with the exact verification method that is breaking.',
            ],
          },
        ],
      ),
      makeArticle(
        'use-search-and-filters',
        'Use search and filters',
        'Find products faster by combining keywords, categories, and filter controls.',
        [
          {
            heading: 'Start with the clearest phrase',
            paragraphs: [
              'Use short, specific product phrases rather than full sentences. This makes it easier for the storefront to return focused results.',
              'Once results appear, use category context and visible filters to narrow further instead of typing a new search every time.',
            ],
          },
          {
            heading: 'When filters help most',
            paragraphs: [
              'Filters are useful when search results are close but still too broad. They help you trim down options by shopping intent and listing context.',
              'They are also helpful when you are comparing variants, sellers, or other differences within the same kind of product.',
            ],
          },
          {
            heading: 'If results feel off',
            paragraphs: [
              'Clear one filter at a time before deciding the search is broken. Narrow filters often hide the item you expected to find.',
              'If a category page or search result looks inconsistent, note the exact term and page state before reporting it.',
            ],
          },
        ],
      ),
      makeArticle(
        'save-items-to-wishlist',
        'Save items to your wishlist',
        'Keep products for later and compare them without cluttering your cart.',
        [
          {
            heading: 'Why wishlist matters',
            paragraphs: [
              'Wishlist saves let you hold onto interesting products while you continue comparing sellers, prices, and delivery options.',
              'This is more reliable than trying to remember products across sessions or tabs.',
            ],
          },
          {
            heading: 'How to use it well',
            paragraphs: [
              'Save products when you are not ready to buy immediately. This keeps your cart focused on items you are actively checking out.',
              'Return to the wishlist later to narrow down the best option or move a chosen product into the cart.',
            ],
          },
          {
            heading: 'When something disappears',
            paragraphs: [
              'If a saved item becomes unavailable, the wishlist still helps you recall what you were comparing so you can search for alternatives.',
              'That is one reason wishlists are useful even when inventory changes quickly.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'orders-delivery',
    title: 'Orders & Delivery',
    summary:
      'Track orders, manage deliveries, and understand order status updates.',
    icon: 'clipboard',
    accentClassName: 'bg-[#ff7a1a] text-white',
    articles: [
      makeArticle(
        'track-your-order',
        'Track your order',
        'You can follow the progress of your order directly from your OCPRIMES account after checkout.',
        [
          {
            heading: 'How to track an order',
            steps: [
              'Sign in to your account.',
              'Open **Orders**.',
              'Select the order you want to view.',
              'Check the current status and delivery updates.',
            ],
          },
          {
            heading: 'Common order statuses',
            bullets: [
              '**Pending:** Order is being reviewed or confirmed.',
              '**Processing:** OCPRIMES is preparing your item for shipment.',
              '**Shipped / Out for delivery:** Your order is on the way.',
              '**Delivered:** Order has been completed.',
            ],
          },
          {
            heading: 'If tracking is not updating',
            paragraphs: [
              'Allow some time for fulfilment or courier updates.',
              'Refresh the page or sign in again.',
              'If there is no update for an extended period, contact support by email.',
            ],
            bullets: [
              'Include your **Order ID**.',
              'Include your **account email**.',
              'Include a **screenshot of the order page**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Edit or cancel an order](/help-center/orders-delivery/edit-or-cancel-order).',
            ],
          },
        ],
      ),
      makeArticle(
        'edit-or-cancel-order',
        'Edit or cancel an order',
        'Orders can only be edited or cancelled before they move too far into fulfilment or delivery.',
        [
          {
            heading: 'How to request cancellation or edit',
            steps: [
              'Sign in to your account.',
              'Open **Orders**.',
              'Select the order.',
              'Choose **Cancel** or **Edit** if available.',
            ],
          },
          {
            heading: 'If the option is not visible',
            bullets: [
              'The order may already be in fulfilment.',
              'The order may already be shipped.',
            ],
            paragraphs: [
              'In this case, you may need to wait for delivery and request a return instead.',
              'If you believe the order should still be editable, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'What you want to **change or cancel**.',
              'A **screenshot of the order screen**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Change delivery address](/help-center/orders-delivery/change-delivery-address).',
            ],
          },
        ],
      ),
      makeArticle(
        'change-delivery-address',
        'Change delivery address',
        'Delivery address can usually be updated before the order is shipped.',
        [
          {
            heading: 'How to change address',
            steps: [
              'Sign in to your account.',
              'Open **Orders**.',
              'Select the order.',
              'Choose **Change address** if available.',
            ],
          },
          {
            heading: 'If address change is not available',
            bullets: [
              'The order may already be prepared.',
              'The courier may already have the package.',
            ],
            paragraphs: [
              'You may need to wait for delivery completion and request a return if necessary.',
              'If you entered the wrong address and cannot update it, contact support immediately by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'The **correct delivery address**.',
              'A **phone number for delivery contact**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Delivery timelines](/help-center/orders-delivery/delivery-timelines).',
            ],
          },
        ],
      ),
      makeArticle(
        'delivery-timelines',
        'Delivery timelines',
        'Delivery time depends on fulfilment processing, courier handling, and delivery location.',
        [
          {
            heading: 'What affects delivery time',
            bullets: [
              'Order preparation time.',
              'Distance and delivery area.',
              'Courier delays or high delivery volume.',
              'Weather or operational disruptions.',
            ],
          },
          {
            heading: 'What to check first',
            paragraphs: [
              'Estimated delivery time is usually shown on the product page or order page.',
              'If delivery is taking longer than expected, check tracking updates first and confirm your delivery address is correct.',
            ],
          },
          {
            heading: 'If there are no updates for a long time',
            paragraphs: [
              'Contact support by email if there are no updates for a long time.',
            ],
            bullets: [
              'Include your **Order ID**.',
              'Include the **last visible tracking status**.',
              'Include a **screenshot if possible**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Order marked delivered but not received](/help-center/orders-delivery/delivered-but-not-received).',
            ],
          },
        ],
      ),
      makeArticle(
        'delivered-but-not-received',
        'Order marked delivered but not received',
        'Sometimes an order may be marked as delivered before it physically reaches you, or it may have been received on your behalf.',
        [
          {
            heading: 'What you should do first',
            bullets: [
              'Check with household members, neighbors, or building reception.',
              'Review delivery messages or missed call notifications.',
              'Confirm the delivery address on your order.',
            ],
          },
          {
            heading: 'If you still cannot find the package',
            paragraphs: [
              'Contact support by email as soon as possible.',
              'OCPRIMES will review delivery confirmation and investigate the issue with the delivery partner before advising you on the next steps.',
            ],
            bullets: [
              'Include your **Order ID**.',
              'Include your **account email**.',
              'Confirm clearly that you **did not receive the item**.',
              'Attach any **delivery message or evidence available**.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'payments-checkout',
    title: 'Payments & Checkout',
    summary:
      'Everything related to paying for your order and payment confirmations.',
    icon: 'credit-card',
    accentClassName: 'bg-[#d9e5fb] text-[#16416b]',
    articles: [
      makeArticle(
        'accepted-payment-methods',
        'Accepted payment methods',
        'OCPRIMES supports secure online payments during checkout.',
        [
          {
            heading: 'How to pay',
            paragraphs: [
              'Available payment options are shown on the checkout page before you complete your order.',
            ],
            steps: [
              'Add items to your cart.',
              'Proceed to checkout.',
              'Select an available payment method.',
              'Complete the payment process.',
            ],
          },
          {
            heading: 'If your preferred payment method is not visible',
            bullets: [
              'It may not be supported at the moment.',
              'Try another available option.',
            ],
            paragraphs: [
              'If payment options are not loading, refresh the page or try again later.',
              'If the issue continues, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'A **screenshot of the checkout page**.',
              'The **device or browser used**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Why prices show in Naira](/help-center/payments-checkout/why-prices-show-in-naira).',
            ],
          },
        ],
      ),
      makeArticle(
        'why-prices-show-in-naira',
        'Why prices show in Naira',
        'Prices on OCPRIMES are displayed in Nigerian Naira (NGN) by default.',
        [
          {
            heading: 'Why this happens',
            paragraphs: [
              'This helps provide consistent pricing and checkout experience for most users.',
              'You may be able to change your display currency from supported currency options if available.',
            ],
          },
          {
            heading: 'If prices appear incorrect',
            bullets: [
              'Refresh the page.',
              'Confirm you are viewing the correct product variant.',
              'Check for active promotions or price updates.',
            ],
            paragraphs: [
              'If you believe pricing is wrong, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'The **product link**.',
              'A **screenshot showing the price**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Payment failed or declined](/help-center/payments-checkout/payment-failed-or-declined).',
            ],
          },
        ],
      ),
      makeArticle(
        'payment-failed-or-declined',
        'Payment failed or declined',
        'A payment may fail due to network issues, bank restrictions, or incorrect payment details.',
        [
          {
            heading: 'What you should do',
            bullets: [
              'Confirm your card details are correct.',
              'Ensure you have sufficient balance.',
              'Check for bank verification requests.',
              'Try the payment again.',
            ],
            paragraphs: [
              'You may also try another supported payment method.',
            ],
          },
          {
            heading: 'If payment continues to fail',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'Include **order attempt details**.',
              'Include a **screenshot of the error message**.',
              'Include the **time the payment was attempted**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Charged but order not confirmed](/help-center/payments-checkout/charged-but-not-confirmed).',
            ],
          },
        ],
      ),
      makeArticle(
        'charged-but-not-confirmed',
        'Charged but order not confirmed',
        'Sometimes a payment may be deducted while the order confirmation is delayed.',
        [
          {
            heading: 'What to do first',
            bullets: [
              'Wait a few minutes and refresh your **Orders** page.',
              'Check your email for order confirmation.',
              'Avoid making repeated payment attempts immediately.',
            ],
          },
          {
            heading: 'If the order still does not appear',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'Include the **payment reference or transaction ID**.',
              'Include your **account email**.',
              'Include a **screenshot of payment confirmation**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Refund processing time](/help-center/payments-checkout/refund-processing-time).',
            ],
          },
        ],
      ),
      makeArticle(
        'refund-processing-time',
        'Refund processing time',
        'Refund time depends on payment provider processing and internal review steps.',
        [
          {
            heading: 'What to expect',
            paragraphs: [
              'After a refund is approved, processing may take several business days before funds return to your account.',
            ],
          },
          {
            heading: 'What affects refund timing',
            bullets: [
              'Payment provider processing speed.',
              'Bank clearance timelines.',
              'Public holidays or operational delays.',
            ],
          },
          {
            heading: 'If your refund is taking longer than expected',
            paragraphs: [
              'Contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'The **date the refund was approved**.',
              'The **payment method used**.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'returns-refunds',
    title: 'Returns & Refunds',
    summary:
      'Request returns, exchanges, and understand refund policies.',
    icon: 'rotate',
    accentClassName: 'bg-[#f5e7d1] text-[#7b5620]',
    articles: [
      makeArticle(
        'how-to-return-an-item',
        'How to return an item',
        'If you are not satisfied with an item you received, you may request a return.',
        [
          {
            heading: 'How to request a return',
            steps: [
              'Sign in to your account.',
              'Open **Orders**.',
              'Select the order containing the item.',
              'Choose **Request return** if available.',
            ],
            paragraphs: [
              'Follow the instructions shown to submit your request.',
              'After submitting, your request will be reviewed and you may receive further return instructions.',
            ],
          },
          {
            heading: 'If the return option is not visible',
            paragraphs: [
              'It means the product does not support returns. For further assistance, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'The **item name**.',
              'The **reason for return**.',
              'An **image of the product** to support the return claim.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Return eligibility rules](/help-center/returns-refunds/return-eligibility-rules).',
            ],
          },
        ],
      ),
      makeArticle(
        'return-eligibility-rules',
        'Return eligibility rules',
        'Not all items may qualify for return. Return eligibility depends on item condition and return timing.',
        [
          {
            heading: 'General return conditions',
            bullets: [
              'Item must be unused and in original condition.',
              'Original packaging and tags should be intact.',
              'Return request must be made within the allowed return period.',
            ],
          },
          {
            heading: 'Items that may not be eligible',
            bullets: [
              'Used or damaged items after delivery.',
              'Items marked as non-returnable.',
              'Returns requested after the return window.',
            ],
          },
          {
            heading: 'If you are unsure whether your item qualifies',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'Your **Order ID**.',
              'The **item details**.',
              'A **clear description of the issue**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Exchange for another size or product](/help-center/returns-refunds/exchange-size-or-product).',
            ],
          },
        ],
      ),
      makeArticle(
        'exchange-size-or-product',
        'Exchange for another size or product',
        'If you received the correct item but need a different size or variation, you may request an exchange.',
        [
          {
            heading: 'How exchanges work',
            bullets: [
              'Submit a return request for the original item.',
              'Indicate that you want an exchange.',
              'Wait for return approval and further instructions.',
            ],
            paragraphs: [
              'Availability of replacement items may affect exchange processing time.',
              'If you need help requesting an exchange, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'The **item name**.',
              'Your **preferred replacement size or product**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Refund timelines](/help-center/returns-refunds/refund-timelines).',
            ],
          },
        ],
      ),
      makeArticle(
        'refund-timelines',
        'Refund timelines',
        'Refunds are processed after a return request is approved and the return process is completed.',
        [
          {
            heading: 'What to expect',
            paragraphs: [
              'Refund timing depends on payment provider processing and internal review.',
            ],
          },
          {
            heading: 'Typical refund stages',
            bullets: [
              'Return request review.',
              'Return confirmation or verification.',
              'Refund approval.',
              'Payment provider processing.',
            ],
          },
          {
            heading: 'If your refund is delayed beyond expected time',
            paragraphs: [
              'Funds may take several business days to reflect in your account after approval.',
              'Contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **Order ID**.',
              'The **date the return was approved**.',
              'The **payment method used**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Order Protection Policy](/help-center/returns-refunds/order-protection-support).',
            ],
          },
        ],
      ),
      makeArticle(
        'order-protection-support',
        'Order Protection Policy',
        'Order Protection is designed to support buyers when there is a confirmed issue with an order.',
        [
          {
            heading: 'When Order Protection applies',
            paragraphs: [
              'This policy applies in situations where an item arrives damaged, is defective, or is significantly different from its description.',
              'In such cases, buyers may be eligible for assistance after the issue has been reviewed.',
            ],
          },
          {
            heading: 'When Order Protection does not apply',
            paragraphs: [
              'Order Protection does not apply to situations such as a change of mind, selecting the wrong size, minor cosmetic imperfections, or normal wear and tear that occurs after use.',
            ],
          },
          {
            heading: 'How claims are reviewed',
            paragraphs: [
              'To be considered for Order Protection, a claim should be submitted within **48 hours of delivery**.',
              'Supporting photo or video evidence is required to help verify the issue. Each claim is carefully reviewed by OCPRIMES before any decision is made.',
            ],
          },
          {
            heading: 'What happens after approval',
            paragraphs: [
              'When a claim is approved for a covered issue, Order Protection may allow support even if the item is normally listed as non-returnable.',
              'OCPRIMES will review the case and guide you on the next steps based on investigation findings.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    summary:
      'Manage your account settings, password, and security preferences.',
    icon: 'settings',
    accentClassName: 'bg-[#f7b63d] text-[#3f2600]',
    articles: [
      makeArticle(
        'update-profile-settings',
        'Update profile settings',
        'You can update your personal information and preferences from your account settings.',
        [
          {
            heading: 'How to update your profile',
            steps: [
              'Sign in to your account.',
              'Open **Account Settings**.',
              'Edit your details such as name or avatar.',
              'Save your changes.',
            ],
            paragraphs: [
              'Profile updates may help improve delivery accuracy and account personalization.',
            ],
          },
          {
            heading: 'If your changes are not saving',
            bullets: [
              'Refresh the page and try again.',
              'Make sure your internet connection is stable.',
            ],
            paragraphs: [
              'If the issue continues, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **account email**.',
              'A **screenshot showing the problem**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Reset or change password](/help-center/account-security/reset-or-change-password).',
            ],
          },
        ],
      ),
      makeArticle(
        'reset-or-change-password',
        'Reset or change password',
        'You can change your password anytime for better account security.',
        [
          {
            heading: 'How to change password while signed in',
            steps: [
              'Go to Account & security.',
              'Open **Security**.',
              'Enter your current password.',
              'Enter and confirm your new password.',
              'Save changes.',
            ],
          },
          {
            heading: 'How to reset password if you cannot sign in',
            steps: [
              'Open the login page.',
              'Select **Forgot password**.',
              'Follow the password reset instructions.',
            ],
          },
          {
            heading: 'If you do not receive reset instructions',
            bullets: [
              'Check spam or promotions folder.',
              'Wait a few minutes and request again.',
              'The reset link is usually sent to your registered email address.',
            ],
            paragraphs: [
              'If you still cannot reset your password, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **registered account email**.',
              'A **screenshot if possible**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Manage notifications](/help-center/account-security/manage-notifications).',
            ],
          },
        ],
      ),
      makeArticle(
        'manage-notifications',
        'Manage notifications',
        'You can control which updates you receive about orders, wishlist activity, and account alerts.',
        [
          {
            heading: 'How to manage notifications',
            steps: [
              'Sign in to your account.',
              'Open **Account Settings**.',
              'Select **Notifications**.',
              'Enable or disable the updates you prefer.',
              'Save changes.',
            ],
            paragraphs: [
              'Notification settings help you stay informed without receiving unwanted alerts.',
            ],
          },
          {
            heading: 'If notification settings are not updating',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'Your **account email**.',
              'A **description of the issue**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Save shipping addresses](/help-center/account-security/save-shipping-addresses).',
            ],
          },
        ],
      ),
      makeArticle(
        'save-shipping-addresses',
        'Save shipping addresses',
        'You can save multiple delivery addresses for faster checkout.',
        [
          {
            heading: 'How to add or edit an address',
            steps: [
              'Sign in to your account.',
              'Open **Account Settings**.',
              'Select **Addresses**.',
              'Add a new address or edit an existing one.',
              'Save changes.',
            ],
            paragraphs: [
              'Correct delivery details help prevent shipping delays.',
            ],
          },
          {
            heading: 'If you cannot save an address',
            bullets: [
              'Check that all required fields are filled.',
              'Refresh the page and try again.',
            ],
            paragraphs: [
              'If the issue continues, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **account email**.',
              'A **screenshot of the address form**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Account security issues](/help-center/account-security/account-security-issues).',
            ],
          },
        ],
      ),
      makeArticle(
        'account-security-issues',
        'Account security issues',
        'If you notice suspicious activity or believe your account may be compromised, take action immediately.',
        [
          {
            heading: 'What to do',
            bullets: [
              'Change your password as soon as possible.',
              'Review recent orders or account changes.',
              'Ensure your email account is also secure.',
            ],
          },
          {
            heading: 'If you cannot access your account or notice unauthorized activity',
            paragraphs: [
              'Contact support by email right away.',
            ],
            bullets: [
              'Your **registered account email**.',
              'A **description of the security concern**.',
              'Any **relevant screenshots or evidence**.',
            ],
          },
          {
            heading: 'What happens next',
            paragraphs: [
              'OCPRIMES will review the report and guide you on steps to secure your account.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'products-sellers',
    title: 'Products & Stores',
    summary:
      'Questions about products, stores, and marketplace activity.',
    icon: 'stars',
    accentClassName: 'bg-[#195a57] text-[#ffe38c]',
    articles: [
      makeArticle(
        'product-availability',
        'Product availability',
        'Product availability depends on current stock and fulfilment capacity.',
        [
          {
            heading: 'If a product is available',
            paragraphs: [
              'You will be able to add it to your cart and complete checkout.',
            ],
          },
          {
            heading: 'If a product shows as out of stock',
            bullets: [
              'The item is temporarily unavailable.',
              'Restocking timelines may vary.',
            ],
            paragraphs: [
              'You can save the item to your wishlist and check again later.',
            ],
          },
          {
            heading: 'If you believe a product should be available but cannot purchase it',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'The **product link**.',
              'A **screenshot showing the issue**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Follow or unfollow stores](/help-center/products-sellers/follow-or-unfollow-stores).',
            ],
          },
        ],
      ),
      makeArticle(
        'follow-or-unfollow-stores',
        'Follow or unfollow stores',
        'Following a store helps you stay updated on new products and activity.',
        [
          {
            heading: 'How to follow a store',
            steps: [
              'Open the store page.',
              'Select **Follow**.',
            ],
          },
          {
            heading: 'How to unfollow a store',
            steps: [
              'Open your **Following** list from your account.',
              'Select the store.',
              'Choose **Unfollow**.',
            ],
            paragraphs: [
              'Following stores does not place any orders automatically.',
            ],
          },
          {
            heading: 'If you cannot follow or unfollow a store',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'The **store name or link**.',
              'A **screenshot if possible**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Report a store or product](/help-center/products-sellers/report-seller-or-product).',
            ],
          },
        ],
      ),
      makeArticle(
        'report-seller-or-product',
        'Report a store or product',
        'If you notice suspicious activity, misleading content, or policy concerns, you can report it for review.',
        [
          {
            heading: 'How to report',
            steps: [
              'Open the product or store page.',
              'Select the **Report** option if available.',
              'Submit your reason.',
            ],
            paragraphs: [
              'Reports help maintain a safe and reliable marketplace experience.',
            ],
          },
          {
            heading: 'If you cannot submit a report from the page',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'The **product or store link**.',
              'A **description of the issue**.',
              'A **screenshot or evidence**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Product description issues](/help-center/products-sellers/product-description-issues).',
            ],
          },
        ],
      ),
      makeArticle(
        'product-description-issues',
        'Product description issues',
        'Product pages include important details such as size, material, pricing, and delivery information.',
        [
          {
            heading: 'If product information appears incorrect or unclear',
            bullets: [
              'Review all available product images and specifications.',
              'Confirm you selected the correct variation.',
            ],
            paragraphs: [
              'If you still believe the description is misleading or inaccurate, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'The **product link**.',
              'A **description of what seems incorrect**.',
              'A **screenshot highlighting the issue**.',
            ],
          },
          {
            heading: 'What happens next',
            paragraphs: [
              'OCPRIMES will review the report and take appropriate action if necessary.',
            ],
          },
        ],
      ),
    ],
  },
  {
    id: 'app-technical-issues',
    title: 'Technical Issues',
    summary:
      'Fix common issues related to checkout, loading, videos, and language or country settings.',
    icon: 'smartphone',
    accentClassName: 'bg-[#f5e7d1] text-[#7b5620]',
    articles: [
      makeArticle(
        'problems-during-checkout',
        'Problems during checkout',
        'If you are unable to complete checkout, the issue may be related to payment verification, connection problems, or session timeout.',
        [
          {
            heading: 'What to try first',
            bullets: [
              'Refresh the checkout page.',
              'Confirm your delivery details are correct.',
              'Re-enter your payment information carefully.',
              'Ensure your internet connection is stable.',
            ],
            paragraphs: [
              'Avoid submitting multiple payment attempts at the same time.',
            ],
          },
          {
            heading: 'If checkout continues to fail',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'A **screenshot of the checkout error**.',
              'The **product or cart details**.',
              'The **device or browser used**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Website or page not loading](/help-center/app-technical-issues/website-or-page-not-loading).',
            ],
          },
        ],
      ),
      makeArticle(
        'website-or-page-not-loading',
        'Website or page not loading',
        'Pages may fail to load due to slow connection, browser issues, or temporary service interruptions.',
        [
          {
            heading: 'What to try first',
            bullets: [
              'Refresh the page.',
              'Check your internet connection.',
              'Close and reopen your browser.',
              'Try another browser or device.',
            ],
            paragraphs: [
              'If only a specific page is not loading, note the page link.',
            ],
          },
          {
            heading: 'If the issue continues',
            paragraphs: [
              'Contact support by email.',
            ],
            bullets: [
              'The **page link**.',
              'A **screenshot of the issue**.',
              'The **device and browser information**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Video previews not working](/help-center/app-technical-issues/video-previews-not-working).',
            ],
          },
        ],
      ),
      makeArticle(
        'video-previews-not-working',
        'Video previews not working',
        'Some product previews or story videos may not play properly due to connection speed or device limitations.',
        [
          {
            heading: 'What to try first',
            bullets: [
              'Check your internet connection.',
              'Refresh the page.',
              'Allow the page to fully load.',
              'Try switching network or device.',
            ],
            paragraphs: [
              'If videos still do not play, contact support by email.',
            ],
            bullets: [
              'The **product or page link**.',
              'A **screenshot or screen recording if possible**.',
            ],
          },
          {
            heading: 'Next',
            paragraphs: [
              'Continue with [Language or country settings](/help-center/app-technical-issues/language-or-country-settings).',
            ],
          },
        ],
      ),
      makeArticle(
        'language-or-country-settings',
        'Language or country settings',
        'You can adjust language or country preferences from available settings on the website.',
        [
          {
            heading: 'What these settings affect',
            paragraphs: [
              'Changing these settings may affect pricing display, delivery options, and content visibility.',
            ],
          },
          {
            heading: 'If settings are not updating',
            bullets: [
              'Refresh the page.',
              'Sign out and sign in again.',
              'Try updating the setting once more.',
            ],
            paragraphs: [
              'If the problem continues, contact support by email.',
            ],
          },
          {
            heading: 'What to include',
            bullets: [
              'Your **account email**.',
              'A **screenshot showing the issue**.',
              'Your **current selected country or language**.',
            ],
          },
        ],
      ),
    ],
  },
]

export const getHelpCenterSectionById = (sectionId) =>
  HELP_CENTER_SECTIONS.find((section) => section.id === sectionId) || null

export const getHelpCenterArticle = (sectionId, articleId) => {
  const section = getHelpCenterSectionById(sectionId)
  if (!section) return null
  const article = section.articles.find((entry) => entry.id === articleId) || null
  if (!article) return null
  return { section, article }
}

export const getAllHelpCenterArticleParams = () =>
  HELP_CENTER_SECTIONS.flatMap((section) =>
    section.articles.map((article) => ({
      sectionId: section.id,
      articleId: article.id,
    })),
  )

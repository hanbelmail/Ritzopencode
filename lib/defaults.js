export const PAYMENT_METHODS = ["Zelle", "Cash", "Venmo", "Direct Booking", "Stripe"];

export const PRICE_SENT_SMS_TEMPLATE_DEFAULTS = [
  {
    id: "detailed-quote",
    name: "Detailed quote",
    content: "Hello {guestName}, your Ritz-Carlton private room quote is ready.\n\nRetail price: {retailPrice}\nDiscount: {discount}\nEstimated savings: {estimatedSavings}\nYour private price: {yourPrice}\n\n{cleaningFeeNotice}\n{retailPriceScreenshotBlock}\n\nView your ticket: {ticketUrl}",
  },
  {
    id: "concise-quote",
    name: "Concise quote",
    content: "Hi {guestName}, your Ritz-Carlton private quote is ready. Your price is {yourPrice}, reduced from {retailPrice} ({discount}, saving {estimatedSavings}).\n\n{cleaningFeeNotice}\n{retailPriceScreenshotBlock}\n\nView and secure your ticket: {ticketUrl}",
  },
  {
    id: "signature-quote",
    name: "Signature quote",
    content: "Welcome {guestName}, your private Ritz-Carlton rate has been prepared.\n\nRitz retail price: {retailPrice}\nPrivate discount: {discount}\nEstimated savings: {estimatedSavings}\nYour private rate: {yourPrice}\n\n{cleaningFeeNotice}\n{retailPriceScreenshotBlock}\n\nReview your quote and ticket: {ticketUrl}",
  },
];

export const PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS = [
  {
    id: "payment-proof-received",
    name: "Payment proof received",
    content: "We received your payment proof and it is pending verification. We will text you once it has been reviewed.",
  },
  {
    id: "payment-under-review",
    name: "Payment under review",
    content: "Thank you, {{guestName}}. Your payment proof has been received and is now under review. We will send you an update as soon as verification is complete.",
  },
];

export const PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS = [
  {
    id: "payment-verified-progress",
    name: "Payment verified",
    content: "Good news, {{guestName}}. Your payment has been verified. Our reservations team is now finalizing your booking, and we will text you when it is confirmed.",
  },
  {
    id: "payment-verified-confirmation",
    name: "Confirmation coming soon",
    content: "Your payment has been successfully verified. We are completing your reservation details now and will send your booking confirmation shortly.",
  },
];

export const BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS = [
  {
    id: "booking-confirmation-details",
    name: "Confirmation details",
    content: "Your reservation is confirmed. Confirmation number: {{confirmationNumber}}. Your confirmation PDF has also been emailed to {{email}}.",
  },
  {
    id: "booking-confirmation-celebration",
    name: "Confirmation celebration",
    content: "Great news, {{guestName}}! Your reservation is confirmed under confirmation number {{confirmationNumber}}. A confirmation PDF has been sent to {{email}}.",
  },
];

export const DEFAULT_SETTINGS = {
  appName: "Ritz Reservations",
  defaultRetailPrice: 3000,
  cleaningFee: 170,
  discountTiers: [
    { nights: 2, discount: 30 },
    { nights: 3, discount: 35 },
    { nights: 4, discount: 40 },
    { nights: 5, discount: 50 },
  ],
  hotelName: "The Ritz-Carlton",
  hotelAddress: "",
  homePageVariant: "classic",
  webhookUrl: "https://n9n.aquaskals.com/webhook-test/get-a-quota",
  webhookEnabled: true,
  emailAlertsEnabled: false,
  quoteAlertEnabled: true,
  priceSentGuestEmailEnabled: true,
  priceSentSmsEnabled: false,
  priceSentSmsTemplates: PRICE_SENT_SMS_TEMPLATE_DEFAULTS,
  priceSentSmsTemplateId: "detailed-quote",
  paymentSubmittedSmsEnabled: false,
  paymentSubmittedSmsTemplates: PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS,
  paymentSubmittedSmsTemplateId: "payment-proof-received",
  paymentVerifiedSmsEnabled: false,
  paymentVerifiedSmsTemplates: PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS,
  paymentVerifiedSmsTemplateId: "payment-verified-progress",
  bookingConfirmedSmsEnabled: false,
  bookingConfirmedSmsTemplates: BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS,
  bookingConfirmedSmsTemplateId: "booking-confirmation-details",
  priceSentStaffAlertEnabled: false,
  paymentSubmittedAlertEnabled: false,
  bookingRequestHotelAlertEnabled: false,
  bookingConfirmedHotelAlertEnabled: false,
  bookingConfirmedHotelAlertAttachments: [],
  staffEmailRecipients: [],
  hotelEmailRecipients: [],
  saraAgentName: "Sara",
  saraWebEnabled: false,
  saraSmsEnabled: false,
  saraSmsTestMode: true,
  saraSmsAllowlist: [],
  saraModel: "",
  saraQuoteValidityDays: 3,
  saraMaxGuests: 4,
  saraMaxMessagesPerHour: 30,
  saraTermsVersion: "draft-1",
  saraTermsContent: "",
  saraInitialMessage: "Hi, I'm Sara, the AI reservations assistant for an independently managed private residence at The Ritz-Carlton Residences, Waikiki Beach. We are not the hotel's official reservations desk. I can help with property information, availability, and a private quote. Pricing is based on the current Ritz retail rate for your dates and the exact discounted rate is confirmed by our reservations team. Availability is checked live but is not held until payment is verified. What check-in and check-out dates are you considering?",
  saraHandoffMessage: "I want to make sure you receive an accurate answer. I've paused the AI conversation and asked a reservations team member to help you.",
  roomTypes: [
    { name: "Deluxe Ocean View, 1 King, Sofa Bed, Ocean View", hidden: false },
    { name: "Ocean Front Suite, 1 King, Living Area, Ocean Front", hidden: false },
    { name: "Club Level, 2 Queens, City View", hidden: false },
    { name: "Presidential Suite, 1 King, Full Kitchen, Ocean View", hidden: false },
  ],
  paymentMethods: [
    { name: "Zelle", instructions: "", hidden: false },
    { name: "Cash", instructions: "", hidden: false },
    { name: "Venmo", instructions: "", hidden: false },
    { name: "Direct Booking", instructions: "", hidden: false },
    { name: "Stripe", instructions: "", hidden: false },
  ],
};

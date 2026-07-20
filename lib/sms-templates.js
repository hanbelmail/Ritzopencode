import {
  BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS,
  PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS,
  PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS,
  PRICE_SENT_SMS_TEMPLATE_DEFAULTS,
} from "@/lib/defaults";

function removeLegacyValidityNotice(content) {
  return String(content || "")
    .replace(/\s*\{quoteValidityNotice\}/g, "")
    .replace(/\s*This quote is valid for 3 days\./gi, "")
    .trim();
}

export function normalizePriceSentSmsTemplates(templates, legacyTemplate) {
  const savedTemplates = Array.isArray(templates) ? templates : [];

  return PRICE_SENT_SMS_TEMPLATE_DEFAULTS.map((defaultTemplate, index) => {
    const savedTemplate = savedTemplates.find((template) => template?.id === defaultTemplate.id) || savedTemplates[index];
    const legacyContent = index === 0 && typeof legacyTemplate === "string" && legacyTemplate.trim()
      ? removeLegacyValidityNotice(legacyTemplate)
      : "";
    const savedContent = typeof savedTemplate?.content === "string" && savedTemplate.content.trim()
      ? removeLegacyValidityNotice(savedTemplate.content)
      : "";

    return {
      id: defaultTemplate.id,
      name: typeof savedTemplate?.name === "string" && savedTemplate.name.trim()
        ? savedTemplate.name.trim()
        : defaultTemplate.name,
      content: savedContent || legacyContent || defaultTemplate.content,
    };
  });
}

export function activePriceSentSmsTemplate(templates, selectedId, legacyTemplate) {
  const normalized = normalizePriceSentSmsTemplates(templates, legacyTemplate);
  return normalized.find((template) => template.id === selectedId) || normalized[0];
}

export function validatePriceSentSmsTemplates(templates) {
  return validateSmsTemplates(templates);
}

function normalizeSmsTemplates(templates, defaults) {
  const savedTemplates = Array.isArray(templates) ? templates : [];

  return defaults.map((defaultTemplate, index) => {
    const savedTemplate = savedTemplates.find((template) => template?.id === defaultTemplate.id) || savedTemplates[index];
    return {
      id: defaultTemplate.id,
      name: typeof savedTemplate?.name === "string" && savedTemplate.name.trim()
        ? savedTemplate.name.trim()
        : defaultTemplate.name,
      content: typeof savedTemplate?.content === "string" && savedTemplate.content.trim()
        ? savedTemplate.content
        : defaultTemplate.content,
    };
  });
}

export function validateSmsTemplates(templates) {
  for (const template of templates) {
    if (!template.name.trim()) return "Each SMS template needs a name.";
    if (!template.content.trim()) return `Add content to ${template.name}.`;
  }

  return "";
}

export function normalizePaymentSubmittedSmsTemplates(templates) {
  return normalizeSmsTemplates(templates, PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS);
}

export function normalizePaymentVerifiedSmsTemplates(templates) {
  return normalizeSmsTemplates(templates, PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS);
}

export function normalizeBookingConfirmedSmsTemplates(templates) {
  return normalizeSmsTemplates(templates, BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS);
}

export function activeSmsTemplate(templates, selectedId, defaults) {
  const normalized = normalizeSmsTemplates(templates, defaults);
  return normalized.find((template) => template.id === selectedId) || normalized[0];
}

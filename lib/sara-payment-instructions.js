export function buildSaraPaymentInstructionsReply({ methods, proofUploadUrl }) {
  const methodSections = methods.map((method) => `${method.name}\n${method.instructions}`);

  return [
    "Terms accepted.",
    "Payment instructions:",
    ...methodSections,
    `Upload payment proof securely through your ticket: ${proofUploadUrl}`,
    "Payment remains unverified until the reservations team reviews it.",
  ].join("\n\n");
}

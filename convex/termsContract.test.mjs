import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./termsContract.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  classifyTermsReply,
  isReplyAfterTermsPresentation,
  isSmsTermsPresentationSendConfirmed,
  LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT,
  normalizeExplicitSmsTermsReply,
  normalizeSmsTermsReply,
  PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT,
  SMS_TERMS_ACCEPTANCE_CONTRACT,
  SMS_TERMS_ACCEPTANCE_INSTRUCTION,
  SMS_TERMS_AGREEMENT_TEXT,
  termsAgreementText,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const legacyAgreement = termsAgreementText("1.0");

function classify(channel, actual, acceptanceContract) {
  return classifyTermsReply({ channel, actual, legacyAgreement, acceptanceContract });
}

test("uses the explicit SMS acceptance contract and instruction", () => {
  assert.equal(SMS_TERMS_AGREEMENT_TEXT, "I AGREE");
  assert.equal(SMS_TERMS_ACCEPTANCE_CONTRACT, "sms_explicit_acceptance_v3");
  assert.equal(PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT, "sms_i_agree_v2");
  assert.equal(SMS_TERMS_ACCEPTANCE_INSTRUCTION, "To accept the Terms, reply that you agree or accept. For example: I AGREE, AGREE, or I ACCEPT.");
});

test("accepts the explicit agree and accept allowlist with safe normalization", () => {
  for (const reply of [
    "I AGREE",
    "agree",
    "I ACCEPT",
    "ACCEPT",
    "I AGREE TO THE TERMS",
    "I ACCEPT THE TERMS",
    "YES, I AGREE",
    "YES, I ACCEPT",
    "  i   agree  ",
    "I\nACCEPT",
    "Agree!",
    "I accept the terms.",
    "yes, i agree,,!!",
  ]) {
    assert.equal(classify("sms", reply, SMS_TERMS_ACCEPTANCE_CONTRACT), "accepted_explicit_sms");
  }
  assert.equal(normalizeExplicitSmsTermsReply("  YES,   I ACCEPT.!  "), "yes, i accept");
});

test("does not accept ambiguous, negative, malformed, or questioning replies", () => {
  for (const reply of [
    "maybe",
    "I don't agree",
    "I do not accept",
    "YES",
    "ok",
    "sure",
    "continue",
    "I AGREEAGREE",
    "I AGREE?",
    "I ACCEPT THE TERMS?",
    "agreed",
    "I agree thanks",
  ]) {
    assert.ok(!String(classify("sms", reply, SMS_TERMS_ACCEPTANCE_CONTRACT)).startsWith("accepted"), reply);
  }
  assert.equal(classify("sms", "What does this mean?", SMS_TERMS_ACCEPTANCE_CONTRACT), "not_applicable");
});

test("preserves the prior I AGREE contract behavior", () => {
  for (const reply of ["I AGREE", "I agree", "i agree", "  I   Agree  ", "I\nAGREE"]) {
    assert.equal(classify("sms", reply, PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT), "accepted_normalized_sms");
    assert.equal(normalizeSmsTermsReply(reply), "i agree");
  }
  for (const reply of ["I agree.", "I accept", "agree", "accept", "YES, I AGREE"]) {
    assert.equal(classify("sms", reply, PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
  }
});

test("binds legacy acceptance to its presentation contract", () => {
  assert.equal(classify("sms", legacyAgreement, LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT), "accepted_legacy_sms");
  assert.equal(classify("sms", "I AGREE", LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
  assert.equal(classify("sms", legacyAgreement, SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
  assert.equal(classify("sms", legacyAgreement, PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
});

test("typed web acceptance attempts always require the structured control", () => {
  for (const reply of ["I AGREE", "AGREE", "I accept", "ACCEPT", "YES, I AGREE", legacyAgreement]) {
    assert.equal(classify("web", reply), "web_control_required");
  }
  assert.equal(classify("web", "Can I ask a question?"), "not_applicable");
});

test("acceptance replies must be inserted after the referenced presentation", () => {
  assert.equal(isReplyAfterTermsPresentation(101, 100), true);
  assert.equal(isReplyAfterTermsPresentation(100, 100), false);
  assert.equal(isReplyAfterTermsPresentation(99, 100), false);
  assert.equal(isReplyAfterTermsPresentation(Number.NaN, 100), false);
});

test("SMS acceptance requires a provider-confirmed Terms presentation send", () => {
  assert.equal(isSmsTermsPresentationSendConfirmed("accepted"), true);
  assert.equal(isSmsTermsPresentationSendConfirmed("delivered"), true);
  for (const status of ["pending", "sending", "failed", "suppressed", "received"]) {
    assert.equal(isSmsTermsPresentationSendConfirmed(status), false);
  }
});

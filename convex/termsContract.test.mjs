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
  normalizeSmsTermsReply,
  SMS_TERMS_ACCEPTANCE_CONTRACT,
  SMS_TERMS_AGREEMENT_TEXT,
  termsAgreementText,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const legacyAgreement = termsAgreementText("1.0");

function classify(channel, actual, acceptanceContract) {
  return classifyTermsReply({ channel, actual, legacyAgreement, acceptanceContract });
}

test("uses the short I AGREE SMS instruction", () => {
  assert.equal(SMS_TERMS_AGREEMENT_TEXT, "I AGREE");
  assert.equal(SMS_TERMS_ACCEPTANCE_CONTRACT, "sms_i_agree_v2");
});

test("accepts only case and whitespace variants of the complete I AGREE reply", () => {
  for (const reply of ["I AGREE", "I agree", "i agree", "  I   Agree  ", "I\nAGREE"]) {
    assert.equal(classify("sms", reply, SMS_TERMS_ACCEPTANCE_CONTRACT), "accepted_normalized_sms");
    assert.equal(normalizeSmsTermsReply(reply), "i agree");
  }
});

test("retries acceptance-like alternatives without accepting them", () => {
  for (const reply of ["I agree.", "I agree!", "I accept", "agree", "accept", "yes", "agreed", "I agree to the Terms (1.0).", "I agree thanks", "Ｉ ＡＧＲＥＥ", "ℐ AGREE"]) {
    assert.equal(classify("sms", reply, SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
  }
  assert.equal(classify("sms", "What does this mean?", SMS_TERMS_ACCEPTANCE_CONTRACT), "not_applicable");
});

test("binds legacy acceptance to a legacy presentation contract", () => {
  assert.equal(classify("sms", legacyAgreement, LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT), "accepted_legacy_sms");
  assert.equal(classify("sms", "I AGREE", LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
  assert.equal(classify("sms", legacyAgreement, SMS_TERMS_ACCEPTANCE_CONTRACT), "retry");
});

test("typed web acceptance attempts always require the structured control", () => {
  for (const reply of ["I AGREE", "I agree", "I accept", legacyAgreement]) {
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

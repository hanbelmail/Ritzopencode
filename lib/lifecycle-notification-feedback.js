export function getLifecycleNotificationFeedback(result, label, emailDescription) {
  const delivered = [];
  const skipped = [];

  if (result.email?.sent) delivered.push(emailDescription);
  else skipped.push(`Email: ${result.email?.reason || result.email?.error || "not sent"}`);
  if (result.sms?.sent) delivered.push("Guest SMS sent.");
  else skipped.push(`Guest SMS: ${result.sms?.reason || result.sms?.error || "not sent"}`);

  return {
    title: delivered.length ? `${label} notifications processed` : `${label} notifications skipped`,
    description: [...delivered, ...skipped].join(" "),
    variant: delivered.length ? "success" : "destructive",
  };
}

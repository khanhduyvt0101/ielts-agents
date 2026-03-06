let testEmailCounter = 0;

export function generateEmail() {
  return `test-${Date.now()}-${++testEmailCounter}-${crypto.randomUUID().slice(0, 8)}@test.ielts-agents.com`;
}

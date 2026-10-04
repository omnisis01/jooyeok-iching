// 낱말 끝 받침에 맞춰 조사를 붙인다. 예) 상효가, 초효가, 택지취가, 천수송이
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 이/가 */
export function iga(word: string): string {
  return word + (hasBatchim(word) ? "이" : "가");
}

/** 을/를 */
export function eulreul(word: string): string {
  return word + (hasBatchim(word) ? "을" : "를");
}

/** 은/는 */
export function eunneun(word: string): string {
  return word + (hasBatchim(word) ? "은" : "는");
}

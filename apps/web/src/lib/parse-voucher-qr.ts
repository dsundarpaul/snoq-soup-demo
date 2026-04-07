export function parseVoucherQrPayload(decodedText: string): {
  voucherId: string;
  magicToken: string;
} {
  const t = decodedText.trim();
  if (t.includes("|")) {
    const [voucherId, magicToken] = t.split("|", 2);
    return { voucherId: voucherId.trim(), magicToken: magicToken.trim() };
  }
  return { voucherId: t, magicToken: "" };
}

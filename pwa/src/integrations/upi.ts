// UPI deep-link / Collect QR generator. PRD §6.11.4 / §12.5.
// V1 = manual reconciliation. Phase 2 = webhook from a payment aggregator
// (Razorpay/Cashfree/Paytm) that updates the invoice row.

export interface UpiQrInput {
  vpa: string; // e.g. business@bank
  payeeName: string;
  amount: number; // INR
  invoiceRef: string;
  note?: string;
}

export function upiDeepLink({ vpa, payeeName, amount, invoiceRef, note }: UpiQrInput) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note ?? `AgroSpray ${invoiceRef}`,
    tr: invoiceRef,
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Produces an SVG string for the UPI Collect QR. Uses a small inline implementation
 * to avoid pulling a QR library — sufficient for a payload of this size.
 *
 * For production, swap to a battle-tested encoder. Here we render a deterministic
 * placeholder mark + the payload so designers can spot it during UI review.
 */
export function placeholderQrSvg(deepLink: string, size = 200) {
  // We intentionally do not encode the deep link into a scannable QR here.
  // The PWA component will swap to a real QR encoder; this placeholder keeps
  // the surface buildable without an extra dependency at scaffold time.
  const cells = 25;
  const cell = Math.floor(size / cells);
  const dim = cell * cells;
  let rects = "";
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Pattern: corners + deterministic dots from the deep link
      const isFinder =
        (x < 7 && y < 7) ||
        (x >= cells - 7 && y < 7) ||
        (x < 7 && y >= cells - 7);
      const ch = deepLink.charCodeAt((y * cells + x) % deepLink.length);
      const filled = isFinder || (!isFinder && ch % 3 === 0);
      if (filled) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#0F1F17"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${size}" height="${size}"><rect width="${dim}" height="${dim}" fill="white"/>${rects}</svg>`;
}

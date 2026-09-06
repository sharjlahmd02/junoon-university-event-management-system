import QRCode from "qrcode";

// Encodes a Registration's passCode into a scannable QR code, returned as
// a base64 data URL (image/png) ready to embed directly in an <img> src
// or a JSON API response -- generated on demand from the stable passCode
// already stored on the Registration, not persisted as a separate file.
//
// The QR encodes the passCode alone -- nothing else about the
// registration (student identity, event, payment status). Keeping the
// payload minimal means the attendance-scan endpoint (Phase 4) has
// exactly one value to look up, and nothing else leaks through the QR
// itself if it's ever intercepted or photographed by someone other than
// the student it belongs to.
//
// Deterministic per registration: passCode is fixed at Registration
// creation (Registration.js) and never changes, so this is a pure
// function of that one stable value -- calling it again for the same
// registration always encodes the same code (the QR *image* bytes may
// still differ slightly between calls since PNG encoding isn't bit-for-
// bit guaranteed identical, but the decoded content is always identical).
export async function generatePassQrDataUrl(passCode) {
  if (!passCode || typeof passCode !== "string") {
    throw new Error("generatePassQrDataUrl requires a non-empty passCode string");
  }
  return QRCode.toDataURL(passCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });
}
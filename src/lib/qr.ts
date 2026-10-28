import QRCode from "qrcode";

export async function qrDataUrl(value: string) {
  if (!value) return "";
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

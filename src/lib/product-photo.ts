export const PRODUCT_PHOTO_MAX_CHARS = 400_000;

export function readProductPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      image.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível tratar a foto."));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.86;
        let url = canvas.toDataURL("image/jpeg", quality);
        while (url.length > PRODUCT_PHOTO_MAX_CHARS && quality > 0.42) {
          quality -= 0.08;
          url = canvas.toDataURL("image/jpeg", quality);
        }
        if (url.length > PRODUCT_PHOTO_MAX_CHARS) {
          reject(new Error("Imagem muito grande. Use uma foto menor."));
          return;
        }
        resolve(url);
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

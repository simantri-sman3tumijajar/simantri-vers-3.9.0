/**
 * Utility for processing and pre-rendering Principal Signature & Official Stamp (Tanda Tangan & Stempel Ungu Dinas)
 * Anti-Black Background Fix for PDF & Canvas rendering.
 */

export const DEFAULT_OFFICIAL_SIGNATURE_ASSET = '/assets/aistudio/TTD_Kepsek_35dbe690.png';
export const OFFICIAL_KEPSEK_NAME = 'Erlita Yuani Putri, M.Pd.';
export const OFFICIAL_KEPSEK_NIP = '19850202 200804 2 003';
export const OFFICIAL_KEPSEK_JABATAN = 'Kepala SMA Negeri 3 Tumijajar,';

// Cache for processed signature base64 so multiple cards or re-renders don't re-process pixel arrays needlessly
let cachedProcessedSignature: { source: string; base64: string } | null = null;

/**
 * Pre-processes signature & stamp image to remove black/near-black background artifacts
 * and ensure clean alpha channel transparency when embedded into jsPDF or canvas.
 * 
 * Rules:
 * - Load image with crossOrigin = "anonymous"
 * - Draw to HTML5 canvas and read raw RGBA pixels
 * - If pixel is black or near-black background (R < 35 && G < 35 && B < 35), set Alpha to 0 (fully transparent)
 * - Retain purple stamp and dark blue/black signature strokes sharply
 * - Always export to canvas.toDataURL('image/png')
 */
export async function processSignatureImage(imageSrc?: string | null): Promise<string> {
  const targetSrc = (imageSrc && imageSrc.trim().length > 0)
    ? imageSrc.trim()
    : DEFAULT_OFFICIAL_SIGNATURE_ASSET;

  // Check cache
  if (cachedProcessedSignature && cachedProcessedSignature.source === targetSrc) {
    return cachedProcessedSignature.base64;
  }

  return new Promise((resolve) => {
    // If running in an environment without DOM window/document
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(targetSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 600;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(targetSrc);
          return;
        }

        // Ensure canvas background is fully cleared before drawing
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalLen = data.length;

        // Iterate through each pixel (R, G, B, A)
        for (let i = 0; i < totalLen; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip if already completely transparent
          if (a === 0) continue;

          // 1. Check for pitch-black or near-black background pixels (e.g., from JPEG or non-alpha conversion)
          if (r < 35 && g < 35 && b < 35) {
            data[i + 3] = 0; // Convert to fully transparent
            continue;
          }

          // 2. Anti-aliasing fringe suppression: very dark gray edge with moderate alpha
          if (r < 45 && g < 45 && b < 45 && a < 230) {
            data[i + 3] = 0;
            continue;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Export exclusively as PNG to preserve transparent alpha channel (NO JPEG)
        const cleanBase64Png = canvas.toDataURL('image/png');
        cachedProcessedSignature = { source: targetSrc, base64: cleanBase64Png };
        resolve(cleanBase64Png);
      } catch (err) {
        console.warn('Canvas pre-processing failed, using original source:', err);
        resolve(targetSrc);
      }
    };

    img.onerror = (err) => {
      console.warn('Failed to load image for signature processing:', err);
      resolve(targetSrc);
    };

    img.src = targetSrc;
  });
}

/**
 * Returns formatted principal info adhering to official government standards (Tata Naskah Dinas)
 */
export function getOfficialPrincipalData(schoolInfo?: any) {
  const rawName = schoolInfo?.kepalaSekolah || '';
  const kepsekName = (rawName && !rawName.toLowerCase().includes('puji'))
    ? rawName
    : OFFICIAL_KEPSEK_NAME;

  const rawNip = schoolInfo?.nipKepalaSekolah || '';
  const kepsekNip = (rawNip && !rawNip.includes('19720512'))
    ? rawNip
    : OFFICIAL_KEPSEK_NIP;

  return {
    jabatan: OFFICIAL_KEPSEK_JABATAN,
    nama: kepsekName,
    nip: kepsekNip,
    signatureUrl: schoolInfo?.tandaTanganKepsekUrl || DEFAULT_OFFICIAL_SIGNATURE_ASSET,
  };
}

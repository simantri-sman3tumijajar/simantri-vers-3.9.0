import jsQR from 'jsqr';

export interface QRDecodeResult {
  success: boolean;
  code?: string;
  targetId?: string;
  fullUrl?: string;
  error?: string;
}

/**
 * Advanced Multi-Pass QR Code Decoder for uploaded photos & camera screenshots
 * Fully optimized for all iPhone models (iPhone 6 to 16 Pro Max) and Android devices
 * Handles low-light, shadow, glare, high-res photos, and inverted QR codes seamlessly
 */
export async function decodeQRCodeFromImage(input: File | string): Promise<QRDecodeResult> {
  return new Promise((resolve) => {
    const processDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          // Attempt decoding across multiple canvas sizes & image processing passes
          const attemptDecode = (width: number, height: number, applyEnhancements: 'none' | 'contrast' | 'grayscale'): string | null => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            if (applyEnhancements === 'grayscale') {
              for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
              }
              ctx.putImageData(imageData, 0, 0);
            } else if (applyEnhancements === 'contrast') {
              // Boost contrast to cut through iPhone screen reflections and shadows
              const factor = 1.4;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
                data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
                data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
              }
              ctx.putImageData(imageData, 0, 0);
            }

            const refreshedData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(refreshedData.data, refreshedData.width, refreshedData.height, {
              inversionAttempts: 'attemptBoth',
            });

            return code?.data ? code.data.trim() : null;
          };

          // Calculate dimensions for primary pass
          let primaryWidth = img.width;
          let primaryHeight = img.height;
          const maxDim = 1280;

          if (primaryWidth > maxDim || primaryHeight > maxDim) {
            if (primaryWidth > primaryHeight) {
              primaryHeight = Math.round((primaryHeight * maxDim) / primaryWidth);
              primaryWidth = maxDim;
            } else {
              primaryWidth = Math.round((primaryWidth * maxDim) / primaryHeight);
              primaryHeight = maxDim;
            }
          }

          // Pass 1: Primary Dimension, Standard
          let decodedRaw = attemptDecode(primaryWidth, primaryHeight, 'none');

          // Pass 2: Primary Dimension, High Contrast (for iPhone photos with reflections or dim shadows)
          if (!decodedRaw) {
            decodedRaw = attemptDecode(primaryWidth, primaryHeight, 'contrast');
          }

          // Pass 3: Primary Dimension, Grayscale Pass
          if (!decodedRaw) {
            decodedRaw = attemptDecode(primaryWidth, primaryHeight, 'grayscale');
          }

          // Pass 4: Scaled Down Pass (800px max) for high-density 48MP iPhone camera photos
          if (!decodedRaw && (img.width > 1600 || img.height > 1600)) {
            const scaleFactor = 800 / Math.max(img.width, img.height);
            decodedRaw = attemptDecode(Math.round(img.width * scaleFactor), Math.round(img.height * scaleFactor), 'contrast');
          }

          if (decodedRaw) {
            let targetId = '';
            let fullUrl = decodedRaw;

            try {
              if (decodedRaw.startsWith('http://') || decodedRaw.startsWith('https://')) {
                const parsedUrl = new URL(decodedRaw);
                targetId = parsedUrl.searchParams.get('target') || '';
              } else if (decodedRaw.includes('target=')) {
                const match = decodedRaw.match(/target=([a-zA-Z0-9_-]+)/);
                if (match) targetId = match[1];
              } else if (decodedRaw.startsWith('SMAN-') || decodedRaw.startsWith('ROOM-') || decodedRaw.length >= 8) {
                targetId = decodedRaw;
              }
            } catch (e) {
              targetId = decodedRaw;
            }

            resolve({
              success: true,
              code: decodedRaw,
              targetId: targetId || decodedRaw,
              fullUrl,
            });
          } else {
            resolve({
              success: false,
              error: 'Tidak terdeteksi QR Code pada foto yang diunggah. Pastikan QR Code terlihat jelas dan tidak terlalu buram.',
            });
          }
        } catch (err: any) {
          resolve({
            success: false,
            error: err.message || 'Kesalahan saat memproses decoding foto QR Code.',
          });
        }
      };

      img.onerror = () => {
        resolve({ success: false, error: 'Gagal memuat berkas gambar dari HP.' });
      };

      img.src = dataUrl;
    };

    if (input instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          processDataUrl(reader.result);
        } else {
          resolve({ success: false, error: 'Format berkas tidak valid.' });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'Gagal membaca berkas.' });
      reader.readAsDataURL(input);
    } else {
      processDataUrl(input);
    }
  });
}

import { createWorker } from 'tesseract.js';

/**
 * Extracts readable academic text, formulas, and headings from lecture whiteboard photos,
 * handwritten notes, textbook pages, and slide screenshots.
 * 
 * @param {File | Blob | string} imageFile - Image file from input or dropzone
 * @param {(percent: number, statusText: string) => void} [onProgress] - Optional progress callback
 * @returns {Promise<string>} Extracted markdown-ready lecture text
 */
export async function extractTextFromImage(imageFile, onProgress) {
  let worker = null;
  try {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && typeof onProgress === 'function') {
          if (m.status === 'recognizing text') {
            onProgress(Math.round((m.progress || 0) * 100), 'Scanning Whiteboard / Notes text...');
          } else if (m.status === 'loading tesseract core') {
            onProgress(20, 'Initializing Vision OCR engine...');
          } else if (m.status === 'loading language traineddata') {
            onProgress(45, 'Loading language recognition models...');
          }
        }
      }
    });

    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    const text = (ret?.data?.text || '').trim();
    if (!text || text.length < 10) {
      throw new Error(
        "Could not detect clear text in this image. Please ensure the whiteboard or handwritten notes photo is well-lit and legible."
      );
    }

    return text;
  } catch (err) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    throw err;
  }
}

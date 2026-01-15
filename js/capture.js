// FILE: js/capture.js

/*
    Capture Module
    --------------
    Responsibilities:
    - Capture still images from the processed canvas
    - Ensure captured output matches what the user sees (WYSIWYG)
    - Provide clean, memory-safe blob generation
    - Decouple capture logic from UI and camera lifecycle

    Design notes:
    - Uses the canvas as the single source of truth
    - No direct interaction with MediaStream
    - Capture is synchronous but lightweight
*/

class CaptureController {
    constructor(canvas) {
        this.canvas = canvas;
    }

    /* ================================
       IMAGE CAPTURE
       ================================ */

    capture(options = {}) {
        const {
            type = 'image/jpeg',
            quality = 0.92
        } = options;

        return new Promise((resolve, reject) => {
            if (!this.canvas || !this.canvas.width || !this.canvas.height) {
                reject(new Error('Canvas not ready for capture'));
                return;
            }

            /*
                toBlob is used instead of toDataURL to:
                - Reduce memory pressure
                - Avoid blocking the main thread
            */
            this.canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to capture image'));
                        return;
                    }

                    resolve({
                        blob,
                        width: this.canvas.width,
                        height: this.canvas.height,
                        timestamp: Date.now()
                    });
                },
                type,
                quality
            );
        });
    }
}

export { CaptureController };

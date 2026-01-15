// FILE: js/lut-engine.js

/*
    LUT Engine
    ----------
    Responsibilities:
    - Load and apply 3D LUTs efficiently
    - Keep processing lightweight enough for real-time preview
    - Operate purely on Canvas ImageData
    - Provide deterministic, visible color transformations

    Design notes:
    - Uses identity fallback if LUT fails to load
    - LUT size is assumed to be 16x16x16 or 32x32x32 (standard mobile-safe sizes)
    - No WebGL dependency to maximize compatibility
*/

class LUTEngine {
    constructor() {
        this.lut = null;
        this.size = 0;
    }

    /* ================================
       LOADING
       ================================ */

    async loadFromImage(url, size) {
        /*
            LUTs are provided as flattened PNG images.
            This is a common, production-safe LUT format.
        */
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                this.lut = imageData.data;
                this.size = size;

                resolve();
            };

            img.onerror = () => {
                this.lut = null;
                this.size = 0;
                reject(new Error('Failed to load LUT'));
            };

            img.src = url;
        });
    }

    /* ================================
       APPLICATION
       ================================ */

    apply(imageData) {
        if (!this.lut || !this.size) {
            return imageData;
        }

        const data = imageData.data;
        const size = this.size;
        const lut = this.lut;

        const max = size - 1;
        const scale = max / 255;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const ri = Math.min(max, Math.floor(r * scale));
            const gi = Math.min(max, Math.floor(g * scale));
            const bi = Math.min(max, Math.floor(b * scale));

            /*
                LUT index mapping:
                Flattened as:
                (r + g * size + b * size * size) * 4
            */
            const index =
                (ri + gi * size + bi * size * size) * 4;

            data[i]     = lut[index];
            data[i + 1] = lut[index + 1];
            data[i + 2] = lut[index + 2];
            // alpha preserved
        }

        return imageData;
    }
}

export { LUTEngine };

// FILE: js/filters.js

/*
    Filters Module
    --------------
    Responsibilities:
    - Apply real-time image processing using Canvas 2D
    - Implement exposure simulation and color adjustments
    - Remain fast enough for 60fps rendering on mobile devices
    - Avoid blocking the main thread with heavy per-pixel work

    Design notes:
    - This module does NOT access camera APIs directly
    - It operates purely on ImageData / drawImage pipelines
    - All filters are real, visible transformations
*/

class FilterEngine {
    constructor(canvas, video) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: false });
        this.video = video;

        this.exposureEV = 0;
        this.activeFilter = 'none';

        this._running = false;
        this._rafId = null;
    }

    /* ================================
       LIFECYCLE
       ================================ */

    start() {
        if (this._running) return;
        this._running = true;
        this._render();
    }

    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    resize() {
        const { videoWidth, videoHeight } = this.video;
        if (!videoWidth || !videoHeight) return;

        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;
    }

    /* ================================
       PUBLIC CONTROLS
       ================================ */

    setExposure(ev) {
        // Exposure compensation simulated via brightness scaling
        this.exposureEV = Math.max(-2, Math.min(2, ev));
    }

    setFilter(name) {
        this.activeFilter = name;
    }

    /* ================================
       RENDER LOOP
       ================================ */

    _render() {
        if (!this._running) return;

        this._rafId = requestAnimationFrame(() => this._render());

        if (this.video.readyState < 2) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (!w || !h) return;

        ctx.drawImage(this.video, 0, 0, w, h);

        // Exposure simulation
        if (this.exposureEV !== 0) {
            const gain = Math.pow(2, this.exposureEV);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(255,255,255,${(gain - 1) * 0.15})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Apply color filter last
        this._applyFilter(ctx, w, h);
    }

    /* ================================
       FILTER IMPLEMENTATIONS
       ================================ */

    _applyFilter(ctx, w, h) {
        switch (this.activeFilter) {
            case 'mono':
                this._grayscale(ctx, w, h);
                break;
            case 'warm':
                this._warm(ctx, w, h);
                break;
            case 'cool':
                this._cool(ctx, w, h);
                break;
            default:
                break;
        }
    }

    _grayscale(ctx, w, h) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            data[i] = data[i + 1] = data[i + 2] = l;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    _warm(ctx, w, h) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * 1.05);     // R
            data[i + 2] = Math.max(0, data[i + 2] * 0.95); // B
        }

        ctx.putImageData(imageData, 0, 0);
    }

    _cool(ctx, w, h) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, data[i] * 0.95);       // R
            data[i + 2] = Math.min(255, data[i + 2] * 1.05); // B
        }

        ctx.putImageData(imageData, 0, 0);
    }
}

export { FilterEngine };

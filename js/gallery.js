// FILE: js/gallery.js

/*
    Gallery Module
    --------------
    Responsibilities:
    - Maintain an in-memory gallery of captured images
    - Create and revoke object URLs safely
    - Provide a minimal API for adding and retrieving captures
    - Avoid persistent storage (can be extended later)

    Design notes:
    - This module is intentionally lightweight
    - No DOM manipulation here; UI layer consumes the data
    - Memory safety is critical: URLs are revoked on clear
*/

class GalleryController {
    constructor() {
        this.items = [];
    }

    /* ================================
       GALLERY MANAGEMENT
       ================================ */

    add(capture) {
        const url = URL.createObjectURL(capture.blob);

        const entry = {
            url,
            blob: capture.blob,
            width: capture.width,
            height: capture.height,
            timestamp: capture.timestamp
        };

        this.items.push(entry);
        return entry;
    }

    getAll() {
        return [...this.items];
    }

    getLatest() {
        return this.items.length
            ? this.items[this.items.length - 1]
            : null;
    }

    clear() {
        for (const item of this.items) {
            try {
                URL.revokeObjectURL(item.url);
            } catch (_) {
                // Defensive cleanup
            }
        }
        this.items.length = 0;
    }
}

export { GalleryController };

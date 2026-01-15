// FILE: js/ui.js

/*
    UI Module
    ---------
    Responsibilities:
    - Handle all DOM interactions and event wiring
    - Provide tactile, DSLR-style UI feedback
    - Translate user intent (tap, slide) into semantic actions
    - Ensure listeners are cleanly attachable and removable

    Design notes:
    - This module does NOT own business logic
    - It emits callbacks instead of directly mutating state
    - Visual feedback is prioritized over heavy effects
*/

class UIController {
    constructor(elements) {
        this.video = elements.video;
        this.canvas = elements.canvas;
        this.focusRing = elements.focusRing;
        this.exposureSlider = elements.exposureSlider;
        this.focusSlider = elements.focusSlider;
        this.shutterButton = elements.shutterButton;
        this.permissionOverlay = elements.permissionOverlay;
        this.retryPermissionButton = elements.retryPermissionButton;

        // External callbacks (assigned by app layer)
        this.onExposureChange = null;
        this.onFocusChange = null;
        this.onShutter = null;
        this.onRetryPermission = null;

        this._boundHandlers = [];
    }

    /* ================================
       INITIALIZATION
       ================================ */

    init() {
        this._bindSliders();
        this._bindShutter();
        this._bindTapToFocus();
        this._bindPermissionRetry();
    }

    destroy() {
        for (const { target, type, handler } of this._boundHandlers) {
            target.removeEventListener(type, handler);
        }
        this._boundHandlers.length = 0;
    }

    /* ================================
       VISIBILITY CONTROLS
       ================================ */

    showPermissionOverlay() {
        this.permissionOverlay.classList.remove('hidden');
    }

    hidePermissionOverlay() {
        this.permissionOverlay.classList.add('hidden');
    }

    /* ================================
       BINDINGS
       ================================ */

    _bindSliders() {
        const onExposureInput = (e) => {
            const value = parseFloat(e.target.value);
            if (this.onExposureChange) {
                this.onExposureChange(value);
            }
        };

        const onFocusInput = (e) => {
            const value = parseFloat(e.target.value);
            if (this.onFocusChange) {
                this.onFocusChange(value);
            }
        };

        this.exposureSlider.addEventListener('input', onExposureInput);
        this.focusSlider.addEventListener('input', onFocusInput);

        this._track(this.exposureSlider, 'input', onExposureInput);
        this._track(this.focusSlider, 'input', onFocusInput);
    }

    _bindShutter() {
        const onClick = () => {
            this._shutterFeedback();
            if (this.onShutter) {
                this.onShutter();
            }
        };

        this.shutterButton.addEventListener('click', onClick);
        this._track(this.shutterButton, 'click', onClick);
    }

    _bindTapToFocus() {
        const onPointerDown = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this._showFocusRing(x, y);
        };

        this.canvas.addEventListener('pointerdown', onPointerDown);
        this._track(this.canvas, 'pointerdown', onPointerDown);
    }

    _bindPermissionRetry() {
        const onClick = () => {
            if (this.onRetryPermission) {
                this.onRetryPermission();
            }
        };

        this.retryPermissionButton.addEventListener('click', onClick);
        this._track(this.retryPermissionButton, 'click', onClick);
    }

    /* ================================
       FEEDBACK EFFECTS
       ================================ */

    _showFocusRing(x, y) {
        const ring = this.focusRing;

        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;

        ring.hidden = false;
        ring.classList.remove('animate');

        // Force reflow to restart animation
        void ring.offsetWidth;

        ring.classList.add('animate');

        // Auto-hide after animation
        setTimeout(() => {
            ring.hidden = true;
        }, 450);
    }

    _shutterFeedback() {
        const flash = document.createElement('div');
        flash.className = 'shutter-flash';
        this.canvas.parentElement.appendChild(flash);

        flash.addEventListener(
            'animationend',
            () => {
                flash.remove();
            },
            { once: true }
        );
    }

    /* ================================
       INTERNAL UTIL
       ================================ */

    _track(target, type, handler) {
        this._boundHandlers.push({ target, type, handler });
    }
}

export { UIController };

// FILE: js/camera.js

/*
    Camera Module
    -------------
    Responsibilities:
    - Initialize and manage getUserMedia camera streams
    - Handle permission states and graceful failure
    - Expose a clean API for starting/stopping the camera
    - Apply focus and exposure constraints where supported
    - Avoid memory leaks by cleaning up tracks and listeners

    Design notes:
    - This module does NOT handle rendering or filters
    - It owns only MediaStream lifecycle and track constraints
*/

import { getCameraConstraints } from './constraints.js';

class CameraController {
    constructor(videoElement, statusElement) {
        this.video = videoElement;
        this.statusEl = statusElement;

        this.stream = null;
        this.videoTrack = null;

        this.isRunning = false;
    }

    /* ================================
       INITIALIZATION
       ================================ */

    async start(preferredFacingMode = 'environment') {
        if (this.isRunning) {
            return;
        }

        this._setStatus('Requesting camera…');

        try {
            const constraints = getCameraConstraints(preferredFacingMode);

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Wait for metadata to ensure dimensions are available
            await this._waitForVideoReady();

            this.videoTrack = this.stream.getVideoTracks()[0];
            this.isRunning = true;

            this._setStatus('Camera ready');
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }

    /* ================================
       SHUTDOWN
       ================================ */

    stop() {
        if (!this.stream) {
            return;
        }

        this.stream.getTracks().forEach((track) => {
            try {
                track.stop();
            } catch (_) {
                // Defensive: stopping must never crash app
            }
        });

        this.video.srcObject = null;
        this.stream = null;
        this.videoTrack = null;
        this.isRunning = false;

        this._setStatus('Camera stopped');
    }

    /* ================================
       CAMERA CONTROLS (BEST-EFFORT)
       ================================ */

    async setExposure(ev) {
        if (!this.videoTrack) return;

        const capabilities = this.videoTrack.getCapabilities?.();
        const settings = this.videoTrack.getSettings?.();

        if (!capabilities || !capabilities.exposureCompensation) {
            return;
        }

        const clamped = Math.min(
            capabilities.exposureCompensation.max,
            Math.max(capabilities.exposureCompensation.min, ev)
        );

        if (settings.exposureCompensation === clamped) {
            return;
        }

        try {
            await this.videoTrack.applyConstraints({
                advanced: [{ exposureCompensation: clamped }]
            });
        } catch (_) {
            // Ignore unsupported constraint failures
        }
    }

    async setFocus(normalizedValue) {
        if (!this.videoTrack) return;

        const capabilities = this.videoTrack.getCapabilities?.();

        if (!capabilities || !capabilities.focusMode) {
            return;
        }

        // Manual focus only if supported
        if (!capabilities.focusMode.includes('manual')) {
            return;
        }

        const focusDistance = capabilities.focusDistance;
        if (!focusDistance) return;

        const value =
            focusDistance.min +
            normalizedValue * (focusDistance.max - focusDistance.min);

        try {
            await this.videoTrack.applyConstraints({
                advanced: [
                    {
                        focusMode: 'manual',
                        focusDistance: value
                    }
                ]
            });
        } catch (_) {
            // Best-effort only
        }
    }

    /* ================================
       HELPERS
       ================================ */

    _waitForVideoReady() {
        return new Promise((resolve) => {
            if (this.video.readyState >= 2) {
                resolve();
                return;
            }

            const onLoaded = () => {
                this.video.removeEventListener('loadedmetadata', onLoaded);
                resolve();
            };

            this.video.addEventListener('loadedmetadata', onLoaded);
        });
    }

    _setStatus(text) {
        if (this.statusEl) {
            this.statusEl.textContent = text;
        }
    }

    _handleError(error) {
        if (!this.statusEl) return;

        if (error.name === 'NotAllowedError') {
            this.statusEl.textContent = 'Permission denied';
        } else if (error.name === 'NotFoundError') {
            this.statusEl.textContent = 'No camera found';
        } else {
            this.statusEl.textContent = 'Camera error';
        }
    }
}

export { CameraController };

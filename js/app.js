// FILE: js/app.js

/*
    Application Entry Point
    -----------------------
    Responsibilities:
    - Wire together all subsystems (camera, filters, UI, capture, gallery)
    - Orchestrate lifecycle and permissions
    - Ensure clean startup, shutdown, and error handling
    - Act as the single source of truth for app state

    Design notes:
    - This file intentionally contains no heavy logic
    - All domain-specific work is delegated to modules
    - Defensive coding is used to prevent hard crashes
*/

import { CameraController } from './camera.js';
import { FilterEngine } from './filters.js';
import { CaptureController } from './capture.js';
import { GalleryController } from './gallery.js';
import { UIController } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    /* ================================
       ELEMENT REFERENCES
       ================================ */

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const statusText = document.getElementById('cameraStatus');
    const focusRing = document.getElementById('focusRing');

    const exposureSlider = document.getElementById('exposureSlider');
    const focusSlider = document.getElementById('focusSlider');
    const shutterButton = document.getElementById('shutterButton');

    const permissionOverlay = document.getElementById('permissionOverlay');
    const retryPermissionButton = document.getElementById('retryPermission');

    /* ================================
       CONTROLLERS
       ================================ */

    const camera = new CameraController(video, statusText);
    const filters = new FilterEngine(canvas, video);
    const capture = new CaptureController(canvas);
    const gallery = new GalleryController();

    const ui = new UIController({
        video,
        canvas,
        focusRing,
        exposureSlider,
        focusSlider,
        shutterButton,
        permissionOverlay,
        retryPermissionButton
    });

    /* ================================
       UI CALLBACK WIRING
       ================================ */

    ui.onExposureChange = (value) => {
        camera.setExposure(value);
        filters.setExposure(value);
    };

    ui.onFocusChange = (value) => {
        camera.setFocus(value);
    };

    ui.onShutter = async () => {
        try {
            const result = await capture.capture();
            gallery.add(result);
            // Gallery UI can be layered later without touching capture logic
        } catch (err) {
            // Capture failures are non-fatal
            console.warn('Capture failed:', err);
        }
    };

    ui.onRetryPermission = () => {
        ui.hidePermissionOverlay();
        startCamera();
    };

    ui.init();

    /* ================================
       CAMERA STARTUP
       ================================ */

    async function startCamera() {
        try {
            await camera.start('environment');

            // Match canvas resolution to video once metadata is ready
            filters.resize();
            filters.start();
        } catch (err) {
            // Permission denied or camera unavailable
            ui.showPermissionOverlay();
        }
    }

    /* ================================
       LIFECYCLE MANAGEMENT
       ================================ */

    // Pause camera when page is hidden to save battery and prevent lockups
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            filters.stop();
            camera.stop();
        } else {
            startCamera();
        }
    });

    // Clean shutdown on unload
    window.addEventListener('beforeunload', () => {
        filters.stop();
        camera.stop();
        gallery.clear();
        ui.destroy();
    });

    /* ================================
       BOOT
       ================================ */

    startCamera();
});

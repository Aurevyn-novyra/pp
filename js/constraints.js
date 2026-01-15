// FILE: js/constraints.js

/*
    Camera Constraints Module
    -------------------------
    Responsibilities:
    - Define stable, production-safe getUserMedia constraints
    - Prefer high-quality camera output without using experimental APIs
    - Remain conservative to maximize device compatibility
    - Isolate constraint logic from camera lifecycle code

    Design principles:
    - Mobile-first (Android priority)
    - Environment camera by default
    - Avoid over-constraining resolution or frame rate
*/

function getCameraConstraints(facingMode = 'environment') {
    return {
        audio: false,
        video: {
            facingMode: { ideal: facingMode },

            /*
                Resolution:
                - Use "ideal" instead of "exact" to prevent failures
                - 1280x720 is a safe baseline for performance and quality
            */
            width: { ideal: 1280 },
            height: { ideal: 720 },

            /*
                Frame rate:
                - 30fps is stable across devices
                - Higher frame rates can be requested later if needed
            */
            frameRate: { ideal: 30, max: 30 },

            /*
                These hints improve camera behavior on some devices
                without breaking compatibility.
            */
            advanced: [
                {
                    noiseReduction: 'high',
                    torch: false
                }
            ]
        }
    };
}

export { getCameraConstraints };

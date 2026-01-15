// script.js

/* global pdfjsLib, PageFlip */

// Configure PDF.js worker (required when using CDN) [web:8][web:11]
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js";

(function () {
  const fileInput = document.getElementById("pdf-input");
  const landingEl = document.querySelector(".landing");
  const processingOverlay = document.querySelector(".processing-overlay");
  const viewerEl = document.querySelector(".viewer");
  const flipbookContainer = document.getElementById("flipbook");

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const pageCurrentEl = document.getElementById("page-current");
  const pageTotalEl = document.getElementById("page-total");

  let pageFlip = null;
  let currentZoom = 1;

  // Accessibility: open file dialog when pressing Enter/Space on label
  const uploadLabel = document.querySelector(".upload-button");
  uploadLabel.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      fileInput.value = "";
      return;
    }

    try {
      showProcessing(true);
      const pages = await renderPdfToImages(file);
      await buildFlipbook(pages);
      transitionToViewer();
    } catch (err) {
      console.error("Error generating flipbook:", err);
      alert("Failed to open this PDF. Try with another file.");
    } finally {
      showProcessing(false);
    }
  });

  /**
   * Show or hide processing overlay with blur.
   */
  function showProcessing(isVisible) {
    if (isVisible) {
      processingOverlay.classList.add("visible");
    } else {
      processingOverlay.classList.remove("visible");
    }
  }

  /**
   * Render all PDF pages to image data URLs using PDF.js.
   * Everything runs only in-memory and inside the browser. [web:7][web:13]
   */
  async function renderPdfToImages(file) {
    const typedArray = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdfDoc = await loadingTask.promise;

    const pages = [];
    const targetWidth = 1024; // base width for rendering
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });

      const scale = targetWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;

      const dataUrl = canvas.toDataURL("image/png");
      pages.push({
        src: dataUrl,
        width: canvas.width,
        height: canvas.height,
      });
    }

    return pages;
  }

  /**
   * Build StPageFlip book from rendered page images. [web:12]
   */
  async function buildFlipbook(pages) {
    flipbookContainer.innerHTML = "";

    // Create HTML pages for PageFlip
    const first = pages[0];
    const baseWidth = first ? first.width : 1024;
    const baseHeight = first ? first.height : 1448;

    pages.forEach((page, index) => {
      const pageEl = document.createElement("div");
      pageEl.className = "page";
      pageEl.setAttribute("data-number", String(index + 1));

      const img = document.createElement("img");
      img.src = page.src;
      img.alt = "Page " + (index + 1);
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.draggable = false;

      pageEl.appendChild(img);
      flipbookContainer.appendChild(pageEl);
    });

    // Destroy previous instance if exists
    if (pageFlip) {
      pageFlip.destroy();
      pageFlip = null;
    }

    // Initialize PageFlip
    pageFlip = new PageFlip(flipbookContainer, {
      width: baseWidth,
      height: baseHeight,
      size: "stretch",
      maxShadowOpacity: 0.5,
      showCover: false,
      mobileScrollSupport: true,
      usePortrait: true,
      disableFlipByMouse: false,
      flippingTime: 800,
      startZIndex: 5,
      autoSize: true,
      showPageCorners: true,
    });

    pageFlip.loadFromHTML(document.querySelectorAll(".page"));

    pageTotalEl.textContent = String(pages.length);
    pageCurrentEl.textContent = "1";

    // Update indicator on flip
    pageFlip.on("flip", (data) => {
      pageCurrentEl.textContent = String(data.data + 1);
    });

    // Adjust zoom baseline after load
    currentZoom = 1;
    updateZoom();
  }

  /**
   * Transition from landing screen to viewer with smooth fade. 
   */
  function transitionToViewer() {
    landingEl.style.display = "none";
    viewerEl.classList.remove("hidden");

    // Force reflow then add visible for transition
    void viewerEl.offsetWidth;
    viewerEl.classList.add("visible");
    viewerEl.setAttribute("aria-hidden", "false");
  }

  /**
   * Zoom handling: scales the flipbook shell while keeping toolbar separate.
   */
  function updateZoom() {
    const shell = document.querySelector(".flipbook-shell");
    shell.style.transformOrigin = "center center";
    shell.style.transform = `scale(${currentZoom})`;
  }

  btnPrev.addEventListener("click", () => {
    if (!pageFlip) return;
    pageFlip.flipPrev();
  });

  btnNext.addEventListener("click", () => {
    if (!pageFlip) return;
    pageFlip.flipNext();
  });

  btnZoomIn.addEventListener("click", () => {
    currentZoom = Math.min(currentZoom + 0.1, 1.8);
    updateZoom();
  });

  btnZoomOut.addEventListener("click", () => {
    currentZoom = Math.max(currentZoom - 0.1, 0.7);
    updateZoom();
  });

  btnFullscreen.addEventListener("click", () => {
    toggleFullscreen();
  });

  function toggleFullscreen() {
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Simple swipe support for mobile: delegate to PageFlip
  // PageFlip already supports mouse/touch drag; no custom gesture needed.

  // Resize handling: keep shell centered and responsive
  window.addEventListener("resize", () => {
    if (pageFlip) {
      pageFlip.update();
    }
  });
})();

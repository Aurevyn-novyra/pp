pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";

const landing = document.getElementById("landing");
const viewer = document.getElementById("viewer");
const fileInput = document.getElementById("file-input");
const flipbookWrap = document.getElementById("flipbook-wrap");
const flipbookEl = document.getElementById("flipbook");
const loader = document.getElementById("loader");
const progressBar = document.querySelector(".progress-bar div");

const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnClose = document.getElementById("btn-close");
const btnFullscreen = document.getElementById("btn-fullscreen");
const pageCurrent = document.getElementById("page-current");
const pageTotal = document.getElementById("page-total");

let pageFlip;
let currentZoom = 1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.2;

/* ---------------- PDF LOAD ---------------- */

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  landing.classList.add("hidden");
  viewer.classList.remove("hidden");
  loader.classList.remove("hidden");

  const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
  pageTotal.textContent = pdf.numPages;

  flipbookEl.innerHTML = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    progressBar.style.width = `${(i / pdf.numPages) * 100}%`;
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: window.devicePixelRatio * 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport
    }).promise;

    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/jpeg", 0.85);

    const pageDiv = document.createElement("div");
    pageDiv.className = "page";
    pageDiv.appendChild(img);
    flipbookEl.appendChild(pageDiv);
  }

  loader.classList.add("hidden");
  flipbookWrap.classList.remove("hidden");

  pageFlip = new PageFlip(flipbookEl, {
    width: 420,
    height: 600,
    size: "stretch",
    showCover: true,
    flippingTime: 700,
    maxShadowOpacity: 0.4
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".page"));

  pageFlip.on("flip", e => {
    pageCurrent.textContent = e.data + 1;
  });
};

/* ---------------- PINCH ZOOM ---------------- */

let pinchStartDist = 0;
let isPinching = false;

flipbookWrap.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    isPinching = true;
    pageFlip.disable();
    pinchStartDist = distance(e.touches[0], e.touches[1]);
  }
}, { passive: false });

flipbookWrap.addEventListener("touchmove", e => {
  if (!isPinching || e.touches.length !== 2) return;
  e.preventDefault();

  const dist = distance(e.touches[0], e.touches[1]);
  const delta = dist / pinchStartDist;
  let nextZoom = currentZoom * delta;

  nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  flipbookEl.style.transform = `scale(${nextZoom})`;
}, { passive: false });

flipbookWrap.addEventListener("touchend", () => {
  if (isPinching) {
    currentZoom = parseFloat(
      flipbookEl.style.transform.replace("scale(", "")
    ) || currentZoom;
    pageFlip.enable();
    isPinching = false;
  }
});

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/* ---------------- CONTROLS ---------------- */

btnPrev.onclick = () => pageFlip.flipPrev();
btnNext.onclick = () => pageFlip.flipNext();

btnFullscreen.onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
};

btnClose.onclick = () => location.reload();

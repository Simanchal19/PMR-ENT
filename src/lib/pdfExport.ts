/**
 * Export a DOM element to PDF using html2pdf (loaded on demand, same library the
 * customer ledger statement uses). The element is cloned into an offscreen wrapper
 * anchored at (0, 0) so html2canvas never clips the left side.
 * Falls back to the browser print dialog ("Save as PDF") if the library is unavailable.
 */
export async function exportElementToPdf(options: {
  elementId: string;
  filename: string;
  widthPx?: number;
  orientation?: "portrait" | "landscape";
}): Promise<void> {
  const { elementId, filename, widthPx = 1040, orientation = "landscape" } = options;
  const source = document.getElementById(elementId);
  if (!source) throw new Error("Report element not found");

  let wrapper: HTMLDivElement | null = null;
  try {
    let html2pdfLib = (window as any).html2pdf;
    if (!html2pdfLib) {
      try {
        // @ts-expect-error html2pdf.js does not ship TypeScript declarations
        const mod: any = await import("html2pdf.js");
        html2pdfLib = mod?.default || mod;
      } catch {
        html2pdfLib = await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve((window as any).html2pdf);
          script.onerror = () => reject(new Error("Unable to load PDF library"));
          document.head.appendChild(script);
        });
      }
    }

    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.width = `${widthPx}px`;
    clone.style.minWidth = `${widthPx}px`;
    clone.style.maxWidth = `${widthPx}px`;
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.background = "#ffffff";
    // Make hidden-on-mobile desktop tables visible inside the PDF clone
    clone.querySelectorAll<HTMLElement>("[data-pdf-show]").forEach((el) => {
      el.style.display = "block";
    });
    clone.querySelectorAll<HTMLElement>("[data-pdf-hide]").forEach((el) => {
      el.style.display = "none";
    });

    wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "0";
    wrapper.style.left = "0";
    wrapper.style.width = `${widthPx}px`;
    wrapper.style.zIndex = "-9999";
    wrapper.style.pointerEvents = "none";
    wrapper.style.background = "#ffffff";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    await html2pdfLib()
      .set({
        margin: [6, 6, 6, 6],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          width: widthPx,
          windowWidth: widthPx,
        },
        jsPDF: { unit: "mm", format: "a4", orientation },
        pagebreak: { mode: ["css", "legacy"], avoid: "tr" },
      })
      .from(clone)
      .toContainer()
      .then(() => {
        // html2pdf centers .html2pdf__container with left:0;right:0;margin:auto against window.innerWidth,
        // which shifts coordinates whenever windowWidth !== window.innerWidth and clips the left side.
        // Pin overlay and container to (0, 0) at exact widthPx before html2canvas measures bounds.
        const overlay = document.querySelector(".html2pdf__overlay") as HTMLElement | null;
        const container = document.querySelector(".html2pdf__container") as HTMLElement | null;
        if (overlay) {
          overlay.style.left = "0";
          overlay.style.right = "auto";
          overlay.style.top = "0";
          overlay.style.width = `${widthPx}px`;
          overlay.style.overflow = "visible";
        }
        if (container) {
          container.style.position = "relative";
          container.style.left = "0";
          container.style.right = "auto";
          container.style.top = "0";
          container.style.margin = "0";
          container.style.width = `${widthPx}px`;
          container.style.maxWidth = `${widthPx}px`;
          container.style.boxSizing = "border-box";
        }
      })
      .save();
  } catch (err) {
    console.warn("PDF generation fell back to print dialog:", err);
    window.print();
  } finally {
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}


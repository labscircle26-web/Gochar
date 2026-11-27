const PAPER = "#070910";
const CARD = "#101624";
const INK = "#efe6d6";
const MUTED = "#a3988c";
const SEAL = "#f0c14e";

function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function inlinePaint(source: Element, target: Element) {
  const style = getComputedStyle(source);
  const paint: [string, string][] = [
    ["fill", style.fill],
    ["stroke", style.stroke],
    ["stroke-width", style.strokeWidth],
    ["font-size", style.fontSize],
    ["font-family", style.fontFamily || "sans-serif"],
    ["font-weight", style.fontWeight],
    ["opacity", style.opacity],
  ];
  if (style.letterSpacing && style.letterSpacing !== "normal") {
    paint.push(["letter-spacing", style.letterSpacing]);
  }
  if (source.tagName === "text") {
    const baseline = style.dominantBaseline;
    if (baseline && baseline !== "auto") paint.push(["dominant-baseline", baseline]);
  }
  for (const [name, value] of paint) {
    if (!value || value === "none") continue;
    target.setAttribute(name, value);
  }
}

function standaloneSvg(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "800");
  clone.setAttribute("height", "800");
  const sources = [svg, ...svg.querySelectorAll("*")];
  const targets = [clone, ...clone.querySelectorAll("*")];
  sources.forEach((source, index) => {
    const target = targets[index];
    if (target) inlinePaint(source, target);
  });
  return clone;
}

function loadSvg(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const xml = new XMLSerializer().serializeToString(standaloneSvg(svg));
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The chart could not be drawn."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The picture was empty."))), "image/png");
  });
}

export async function renderChartPng(svgs: SVGSVGElement[], lines: string[]): Promise<{ blob: Blob; dataUrl: string }> {
  if (svgs.length === 0) throw new Error("There is no chart to save yet.");
  await document.fonts.ready;
  const images = await Promise.all(svgs.map(loadSvg));
  const chartSize = 720;
  const pad = 48;
  const header = 148;
  const gap = 28;
  const lineHeight = 34;
  const width = pad * 2 + chartSize;
  const height = header + images.length * (chartSize + gap) + lines.length * lineHeight + pad;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot make a picture.");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = SEAL;
  ctx.font = '600 18px "Source Sans 3", sans-serif';
  ctx.fillText("VEDIC CHART", pad, 52);
  ctx.fillStyle = INK;
  ctx.font = '600 64px "Cormorant Garamond", Palatino, serif';
  ctx.fillText("Gochar", pad, 118);
  let y = header;
  for (const image of images) {
    ctx.fillStyle = CARD;
    ctx.fillRect(pad - 1, y - 1, chartSize + 2, chartSize + 2);
    ctx.drawImage(image, pad, y, chartSize, chartSize);
    y += chartSize + gap;
  }
  ctx.font = '400 22px "Source Sans 3", sans-serif';
  for (const line of lines) {
    ctx.fillStyle = MUTED;
    ctx.fillText(line, pad, y + 8);
    y += lineHeight;
  }
  const blob = await canvasBlob(canvas);
  return { blob, dataUrl: canvas.toDataURL("image/png") };
}

export async function deliverPng(blob: Blob, filename: string): Promise<"saved" | "shared" | "blocked"> {
  if (isFramed()) return "blocked";
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Gochar chart" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "blocked";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}

export function downloadBlockedHere(): boolean {
  return isFramed();
}

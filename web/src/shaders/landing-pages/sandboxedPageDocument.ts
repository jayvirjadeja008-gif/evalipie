const BACKGROUND_PRESENTATION_ID = "threeui-background-presentation";
const BACKGROUND_PRESENTATION_SCRIPT =
  '<script>document.documentElement.dataset.threeuiPresentation="background";</script>';

const CUSTOMIZATION_BRIDGE = `<script>
window.addEventListener("message", function (event) {
  var detail = event.data;
  if (!detail || detail.type !== "threeui-page-customization") return;
  var head = document.head;
  if (!head) return;

  var link = document.getElementById("threeui-page-typography-fonts");
  if (detail.fontHref) {
    if (!link) {
      link = document.createElement("link");
      link.id = "threeui-page-typography-fonts";
      link.rel = "stylesheet";
      head.appendChild(link);
    }
    if (link.getAttribute("href") !== detail.fontHref) link.href = detail.fontHref;
  } else if (link) {
    link.remove();
  }

  var style = document.getElementById("threeui-page-typography");
  if (!detail.css) {
    if (style) style.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = "threeui-page-typography";
  }
  if (style.textContent !== detail.css) style.textContent = detail.css;
  head.appendChild(style);
});
</script>`;

function presentationStyle(canvasSelector: string, visualSelectors: string[] = []) {
  const allSelectors = [canvasSelector, ...visualSelectors]
    .flatMap((s) => [s, `${s} *`])
    .join(",\n");

  return `<style id="${BACKGROUND_PRESENTATION_ID}">
html, body {
  width: 100% !important;
  height: 100% !important;
  min-height: 100% !important;
  overflow: hidden !important;
}
body * {
  visibility: hidden !important;
  pointer-events: none !important;
}
${allSelectors} {
  visibility: visible !important;
}
${canvasSelector} {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  transform: none !important;
}
</style>
<script>requestAnimationFrame(function(){window.dispatchEvent(new Event("resize"));});</script>`;
}

export type SandboxedPageOptions = {
  presentation?: "page" | "background";
  canvasSelector?: string;
  visualSelectors?: string[];
  bridges?: string[];
};

export function buildSandboxedPageDocument(
  source: string,
  options: SandboxedPageOptions = {}
): string {
  const headEnd = "</head>";
  const bodyEnd = "</body>";

  const bodyMatches = source.split(bodyEnd).length - 1;
  if (bodyMatches !== 1) {
    throw new Error(`sandboxed page document: body anchor matched ${bodyMatches} times, expected 1`);
  }

  let doc = source;
  if (options.presentation === "background") {
    const headMatches = source.split(headEnd).length - 1;
    if (headMatches !== 1) {
      throw new Error(`sandboxed page document: head anchor matched ${headMatches} times, expected 1`);
    }
    doc = doc.replace(headEnd, `${BACKGROUND_PRESENTATION_SCRIPT}\n${headEnd}`);
  }

  const scripts = [
    CUSTOMIZATION_BRIDGE,
    ...(options.bridges ?? []),
    ...(options.presentation === "background" && options.canvasSelector
      ? [presentationStyle(options.canvasSelector, options.visualSelectors ?? [])]
      : []),
  ].join("\n");

  return doc.replace(bodyEnd, `${scripts}\n${bodyEnd}`);
}

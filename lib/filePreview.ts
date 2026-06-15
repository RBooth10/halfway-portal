type PreviewKind = "pdf" | "image" | "text" | "unsupported";

function getFileExtension(fileNameOrPath: string): string {
  const cleanPath = fileNameOrPath.split("?")[0].split("#")[0];
  const fileName = cleanPath.split("/").pop() ?? "";
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);

  return match ? match[1].toLowerCase() : "";
}

function getPreviewKind(fileNameOrPath: string): PreviewKind {
  const extension = getFileExtension(fileNameOrPath);

  if (extension === "pdf") return "pdf";

  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }

  if (["txt", "text", "md", "csv", "json", "log", "sql", "tsv"].includes(extension)) {
    return "text";
  }

  return "unsupported";
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  return element;
}

function closeExistingPreview() {
  document.getElementById("file-preview-overlay")?.remove();
}

function addOpenInNewTabButton(container: HTMLElement, signedUrl: string) {
  const button = createElement("button");
  button.type = "button";
  button.textContent = "Open in new tab";
  button.className =
    "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
  button.onclick = () => window.open(signedUrl, "_blank", "noopener,noreferrer");

  container.appendChild(button);
}

export async function openFilePreview(
  signedUrl: string,
  title = "File preview",
  fileNameOrPath = ""
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  closeExistingPreview();

  const overlay = createElement("div");
  overlay.id = "file-preview-overlay";
  overlay.className =
    "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4";

  const modal = createElement("div");
  modal.className =
    "flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl";

  const header = createElement("div");
  header.className =
    "flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4";

  const heading = createElement("div");
  heading.className = "min-w-0";

  const titleElement = createElement("h2");
  titleElement.className = "truncate text-lg font-semibold text-slate-950";
  titleElement.textContent = title || "File preview";

  const subtitle = createElement("p");
  subtitle.className = "mt-1 truncate text-xs text-slate-500";
  subtitle.textContent = fileNameOrPath || "Secure preview";

  heading.appendChild(titleElement);
  heading.appendChild(subtitle);

  const actions = createElement("div");
  actions.className = "flex shrink-0 items-center gap-2";
  addOpenInNewTabButton(actions, signedUrl);

  const closeButton = createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.className =
    "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700";
  closeButton.onclick = closeExistingPreview;
  actions.appendChild(closeButton);

  header.appendChild(heading);
  header.appendChild(actions);

  const body = createElement("div");
  body.className = "min-h-[70vh] overflow-auto bg-slate-100 p-4";

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeExistingPreview();
    }
  });

  const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeExistingPreview();
      document.removeEventListener("keydown", escapeHandler);
    }
  };

  document.addEventListener("keydown", escapeHandler);

  const kind = getPreviewKind(fileNameOrPath || signedUrl);

  if (kind === "pdf") {
    const iframe = createElement("iframe");
    iframe.src = signedUrl;
    iframe.title = title || "File preview";
    iframe.className = "h-[72vh] w-full rounded-2xl border border-slate-200 bg-white";
    body.appendChild(iframe);
    return;
  }

  if (kind === "image") {
    const image = createElement("img");
    image.src = signedUrl;
    image.alt = title || "File preview";
    image.className = "mx-auto max-h-[72vh] max-w-full rounded-2xl bg-white object-contain";
    body.appendChild(image);
    return;
  }

  if (kind === "text") {
    const loading = createElement("p");
    loading.className = "text-sm text-slate-600";
    loading.textContent = "Loading text preview...";
    body.appendChild(loading);

    try {
      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error("Could not load text file.");
      }

      const text = await response.text();
      body.innerHTML = "";

      const pre = createElement("pre");
      pre.className =
        "min-h-[72vh] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800";
      pre.textContent = text || "This text file is empty.";
      body.appendChild(pre);
    } catch (error) {
      body.innerHTML = "";

      const message = createElement("div");
      message.className =
        "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900";
      message.textContent =
        error instanceof Error ? error.message : "Could not preview this text file.";

      body.appendChild(message);
    }

    return;
  }

  const fallback = createElement("div");
  fallback.className =
    "rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-700";
  fallback.textContent =
    "This file type cannot be previewed directly in the app yet. Use Open in new tab to view or download it.";

  body.appendChild(fallback);
}

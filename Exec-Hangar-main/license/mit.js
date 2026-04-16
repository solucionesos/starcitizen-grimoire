const LOCAL_LICENSE_PATH = "../LICENSE.md";

function markdownToHtml(markdown) {
  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return markdown
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const escaped = escapeHtml(block.trim());
      return `<p>${escaped.replace(/\r?\n/g, "<br>")}</p>`;
    })
    .join("");
}

async function loadLicense() {
  const container = document.querySelector(".license-content");
  if (!container) return;

  try {
    const response = await fetch(LOCAL_LICENSE_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const text = await response.text();
    container.innerHTML = markdownToHtml(text);
  } catch (error) {
    container.innerHTML =
      '<p class="license-error">Unable to load license text automatically. Please open LICENSE.md manually.</p>';
    console.error("Failed to load license:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadLicense);

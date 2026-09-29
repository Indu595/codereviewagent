const codeInput = document.querySelector("#code");
const lineGutter = document.querySelector("#line-gutter");
const charCount = document.querySelector("#char-count");
const reviewButton = document.querySelector("#review-button");
const errorMessage = document.querySelector("#error-message");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const reviewResults = document.querySelector("#review-results");
const copyButton = document.querySelector("#copy-button");

let latestReview = null;

function updateEditorMeta() {
  const lineCount = Math.max(1, codeInput.value.split("\n").length);
  lineGutter.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
  charCount.textContent = `${codeInput.value.length.toLocaleString()} / 50,000`;
}

codeInput.addEventListener("input", updateEditorMeta);
codeInput.addEventListener("scroll", () => {
  lineGutter.scrollTop = codeInput.scrollTop;
});

document.querySelector("#file-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 100_000) {
    showError("Choose a file smaller than 100 KB.");
    event.target.value = "";
    return;
  }
  codeInput.value = await file.text();
  updateEditorMeta();
  const extension = file.name.split(".").pop()?.toLowerCase();
  const languageByExtension = { py: "Python", js: "JavaScript", mjs: "JavaScript", ts: "TypeScript", java: "Java", go: "Go", rs: "Rust", sql: "SQL" };
  const language = languageByExtension[extension];
  if (language) document.querySelector("#language").value = language;
  showError("");
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function addTextElement(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderReview(review) {
  reviewResults.replaceChildren();
  const summary = document.createElement("section");
  summary.className = "review-summary";
  addTextElement(summary, "p", "eyebrow", "REVIEW SUMMARY");
  addTextElement(summary, "p", "summary-copy", review.summary || "Review complete.");
  reviewResults.append(summary);

  const findings = Array.isArray(review.findings) ? review.findings : [];
  const countBar = document.createElement("div");
  countBar.className = "findings-heading";
  addTextElement(countBar, "span", "eyebrow", "FINDINGS");
  addTextElement(countBar, "span", "finding-count", String(findings.length).padStart(2, "0"));
  reviewResults.append(countBar);

  if (!findings.length) {
    const clear = document.createElement("div");
    clear.className = "all-clear";
    addTextElement(clear, "span", "clear-mark", "✓");
    const copy = document.createElement("div");
    addTextElement(copy, "p", "clear-title", "Nothing actionable found.");
    addTextElement(copy, "p", "clear-copy", "Give it a human pass before merging.");
    clear.append(copy);
    reviewResults.append(clear);
  }

  findings.forEach((finding) => {
    const severity = ["critical", "high", "medium", "low"].includes(String(finding.severity).toLowerCase())
      ? String(finding.severity).toLowerCase()
      : "medium";
    const card = document.createElement("article");
    card.className = `finding finding-${severity}`;
    const meta = document.createElement("div");
    meta.className = "finding-meta";
    addTextElement(meta, "span", `severity severity-${severity}`, severity.toUpperCase());
    addTextElement(meta, "span", "finding-location", `${finding.file || "code"}${finding.line ? `:${finding.line}` : ""}`);
    card.append(meta);
    addTextElement(card, "h3", "finding-title", finding.title || "Review finding");
    addTextElement(card, "p", "finding-description", finding.description || "");
    if (finding.suggestion) {
      const suggestion = document.createElement("div");
      suggestion.className = "suggestion";
      addTextElement(suggestion, "span", "eyebrow", "SUGGESTED FIX");
      addTextElement(suggestion, "p", "suggestion-copy", finding.suggestion);
      card.append(suggestion);
    }
    reviewResults.append(card);
  });
}

reviewButton.addEventListener("click", async () => {
  showError("");
  if (!codeInput.value.trim()) {
    showError("Add some code before starting a review.");
    codeInput.focus();
    return;
  }

  reviewButton.disabled = true;
  reviewButton.querySelector(".button-label").textContent = "Reviewing...";
  emptyState.hidden = true;
  reviewResults.hidden = true;
  loadingState.hidden = false;
  copyButton.disabled = true;

  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: codeInput.value,
        language: document.querySelector("#language").value,
        focus: document.querySelector("#focus").value,
        context: document.querySelector("#context").value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The review could not be completed.");
    latestReview = result;
    renderReview(result);
    reviewResults.hidden = false;
    copyButton.disabled = false;
  } catch (error) {
    showError(error.message || "Could not reach the review service. Check your connection and try again.");
    emptyState.hidden = false;
  } finally {
    loadingState.hidden = true;
    reviewButton.disabled = false;
    reviewButton.querySelector(".button-label").textContent = "Review code";
  }
});

copyButton.addEventListener("click", async () => {
  if (!latestReview) return;
  const lines = [`## Review summary\n${latestReview.summary || "Review complete."}`, "## Findings"];
  for (const finding of latestReview.findings || []) {
    lines.push(`### [${String(finding.severity || "medium").toUpperCase()}] ${finding.title || "Review finding"}`);
    lines.push(`\n\`${finding.file || "code"}${finding.line ? `:${finding.line}` : ""}\`\n`);
    lines.push(finding.description || "");
    if (finding.suggestion) lines.push(`\nSuggested fix: ${finding.suggestion}`);
  }
  await navigator.clipboard.writeText(lines.join("\n\n"));
  copyButton.title = "Copied";
  window.setTimeout(() => { copyButton.title = "Copy review"; }, 1400);
});

updateEditorMeta();
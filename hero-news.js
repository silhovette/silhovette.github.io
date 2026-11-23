(async () => {
  const content = document.querySelector(".cover-news-content");
  if (!content) return;

  let entries;
  try {
    const response = await fetch("news.json", { cache: "no-cache" });
    if (!response.ok) return;
    entries = await response.json();
  } catch {
    return;
  }
  if (!Array.isArray(entries)) return;

  // The publisher puts the latest entry first.
  const latest = entries.find(entry => typeof entry?.content === "string" && entry.content.trim());
  if (!latest) return;

  content.textContent = latest.content;
  content.title = latest.content;
})();

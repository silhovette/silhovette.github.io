(async () => {
  const row = document.querySelector(".cover-news");
  if (!row) return;

  let entries;
  try {
    const response = await fetch("news.json", { cache: "no-cache" });
    if (!response.ok) return;
    entries = await response.json();
  } catch {
    return;
  }
  if (!Array.isArray(entries)) return;

  // The publisher prepends each entry, so the first entry wins on equal dates.
  let latest;
  for (const entry of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.date) ||
        typeof entry.content !== "string" || !entry.content.trim()) continue;
    if (!latest || entry.date > latest.date) latest = entry;
  }
  if (!latest) return;

  const date = row.querySelector("time");
  date.dateTime = latest.date;
  date.textContent = latest.date;
  date.hidden = false;

  let content = row.querySelector(".cover-news-content");
  const url = typeof latest.url === "string" ? latest.url.trim() : "";
  if (/^https?:\/\//i.test(url)) {
    const link = document.createElement("a");
    link.className = content.className;
    link.href = url;
    content.replaceWith(link);
    content = link;
  }
  content.textContent = latest.content;
  content.title = latest.content;
})();

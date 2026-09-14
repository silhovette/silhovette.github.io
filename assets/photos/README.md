# Photo Collection

Put photographs in this folder (`assets/photos/`). Subfolders are supported.
Supported formats: JPG, JPEG, PNG, WebP, AVIF and GIF, case-insensitively.
Hidden files, hidden directories, symbolic links and non-image files are ignored.
No filename list, HTML edits or package installation is needed.

## Local preview

From the website root, run:

```powershell
node tools/preview.mjs
```

Open the URL printed by that command. While it runs, add or remove photos here
and refresh the page. The folder is rescanned on each refresh. If port 8766 is
occupied, the preview tries the next free port.

Opening HTML with `file://` cannot enumerate your disk. A generic static server
also cannot provide this preview's photo index. Use the command above.

## Published site

On `silhovette.github.io`, the gallery reads the public repository's `main` tree
through the GitHub API, then loads photographs from the website itself. Commit
and push the photo files, wait for GitHub Pages to finish deploying, then refresh.
Local-only files cannot appear on the published website.

This requires a public repository. Unauthenticated API requests are rate-limited;
an API/network error shows a retry state rather than silently omitting photographs.
If the API reports a truncated tree, the gallery reports an error rather than
claiming the partial list is complete. Other hosting needs the same JSON endpoint
at `assets/photos/index.json`, containing `{ "photos": [{ "path": "assets/photos/example.jpg" }] }`.

## Ordering and display

Photos use natural filename order: `01-name.jpg`, `02-name.jpg`, etc. Subfolder
names are part of the order. Filenames provide captions; no dates or locations
are invented. Prefer descriptive filenames and web-sized images (about 1600-2400
pixels on the long edge). HEIC/RAW files should be converted before adding them.

The expanded section loops from right to left while visible at 180 pixels per
second. Hovering smoothly slows it to 90 pixels per second; leaving smoothly
restores 180. Scrolling the mouse wheel advances in the same direction.
It pauses on keyboard focus in the strip, during touch interaction, while the
viewer is open, or when the tab is hidden.
Reduced-motion preferences disable autoplay and transition animations by default.
Photos open in a full-image viewer with previous/next, an all-photos grid and an
original-image link. Originals are not cropped or overwritten.

Do not commit private photographs or unwanted EXIF location data to a public
repository. No sample photographs are included in the delivered folder.

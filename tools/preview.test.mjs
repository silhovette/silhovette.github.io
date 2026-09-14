import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, unlink, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { listPhotos, createPreviewServer } from "./preview.mjs";

test("photo directory is rescanned, naturally sorted, and safely served", async t => {
  const tempBase = await realpath(tmpdir());
  const root = await mkdtemp(path.join(tempBase, "photo-preview-test-"));
  const server = await createPreviewServer({ root });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    assert.ok(root.startsWith(tempBase + path.sep));
    assert.ok(path.basename(root).startsWith("photo-preview-test-"));
    await rm(root, { recursive: true, force: true });
  });

  assert.deepEqual(await listPhotos(root), []);
  await mkdir(path.join(root, "assets/photos/trip"), { recursive: true });
  await mkdir(path.join(root, "assets/photos/.hidden"));
  await writeFile(path.join(root, "index.html"), "<h1>Preview</h1>");
  const put = (name, bytes = "fixture") => writeFile(path.join(root, "assets/photos", name), bytes);
  await put("10.jpg");
  await put("2.JPG");
  await put("trip/photo #1.png");
  await put(".private.jpg");
  await put(".hidden/ignored.png");
  await put("README.md");
  await put("unsupported.heic");
  const first = await fetch(`${origin}/assets/photos/index.json`);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.deepEqual((await first.json()).photos.map(item => item.path), [
    "assets/photos/2.JPG", "assets/photos/10.jpg", "assets/photos/trip/photo #1.png",
  ]);
  await put("1.webp");
  await unlink(path.join(root, "assets/photos/10.jpg"));
  const refreshed = await (await fetch(`${origin}/assets/photos/index.json`)).json();
  assert.deepEqual(refreshed.photos.map(item => item.path), [
    "assets/photos/1.webp", "assets/photos/2.JPG", "assets/photos/trip/photo #1.png",
  ]);
  const image = await fetch(`${origin}/assets/photos/trip/photo%20%231.png`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.equal(await image.text(), "fixture");
  assert.equal((await fetch(`${origin}/.git/config`)).status, 404);
  assert.equal((await fetch(`${origin}/%2e%2e%2foutside`)).status, 404);
  assert.equal((await fetch(`${origin}/`, { method: "POST" })).status, 405);
  assert.match(await (await fetch(origin)).text(), /Preview/);
});

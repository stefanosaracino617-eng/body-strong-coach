import { assicuraSchema } from "./db";
import { leggiMedia } from "./repo";

export async function serveMedia(request: Request): Promise<Response> {
  await assicuraSchema();
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
  if (!path || path.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const file = await leggiMedia(path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}

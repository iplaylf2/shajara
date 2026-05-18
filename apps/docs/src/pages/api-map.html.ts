import type { APIContext } from "astro";

export function GET({ redirect }: APIContext): globalThis.Response {
  return redirect("api-map/index.html");
}

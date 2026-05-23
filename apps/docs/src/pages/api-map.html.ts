import type { APIContext } from "astro";
import { site } from "#site";

export function GET({ redirect }: APIContext): globalThis.Response {
  return redirect(site.externalPaths.apiMap);
}

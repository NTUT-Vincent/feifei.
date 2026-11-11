import { type NextRequest } from "next/server";
import { z } from "zod";
import { mediaProviders } from "../../../lib/catalog";
import { resolveEmbed } from "../../../lib/embeds";

const params = z.object({ provider: z.enum(mediaProviders), url: z.string().min(1).max(2048) });
const headers = { "Cache-Control": "no-store" };

export function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const input = params.safeParse({ provider: search.get("provider"), url: search.get("url") });
  if (!input.success) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  }

  // Use the incoming site host so Twitch also works on custom domains and preview URLs.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const parent = /^([\da-z.-]+)(?::\d+)?$/i.exec(host)?.[1] ?? request.nextUrl.hostname;
  const embed = resolveEmbed(input.data.provider, input.data.url, parent);

  return embed
    ? Response.json(embed, { headers })
    : Response.json({ error: "UNSUPPORTED_URL" }, { status: 422, headers });
}

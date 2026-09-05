import { z } from "zod";
import { assertSameOrigin, SESSION_COOKIE, signSession } from "@/server/identity";
import { json, readJson, route } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const { persona } = z
      .object({ persona: z.enum(["controller", "observer", "auditor"]) })
      .strict()
      .parse(await readJson(request));
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, signSession(persona), {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  });
}

export async function DELETE(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  });
}

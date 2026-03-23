export async function POST(req: Request) {
  const validCodes = (process.env.ACCESS_CODES || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  if (validCodes.length === 0) {
    // No codes configured = open access
    return new Response("ok");
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const code = (body.code || "").trim().toLowerCase();
  if (!code || !validCodes.includes(code)) {
    return new Response("Invalid code", { status: 401 });
  }

  return new Response("ok");
}

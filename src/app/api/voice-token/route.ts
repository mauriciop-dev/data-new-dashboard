export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Falta GEMINI_API_KEY en el servidor" },
      { status: 500 }
    );
  }

  const now = new Date();
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1alpha/auth_tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          uses: 1,
          expireTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(
            now.getTime() + 2 * 60 * 1000
          ).toISOString(),
        }),
      }
    );

    const text = await res.text();
    if (!res.ok) {
      return Response.json(
        { error: `auth_tokens ${res.status}: ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const json = JSON.parse(text);
    return Response.json({
      token: json.name,
      model: process.env.LIVE_MODEL || "gemini-3.1-flash-live-preview",
      createdAt: now.toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Error desconocido al mintear token",
      },
      { status: 500 }
    );
  }
}
/** The user-facing sentence from a failed `/api/*` response (RFC 9457 `detail`), or a fallback. */
export async function problemDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail
    }
  } catch {}
  return fallback
}

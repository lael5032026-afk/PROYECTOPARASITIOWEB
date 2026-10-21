export interface D1Result<Row = unknown> {
  results: Row[]
  success: boolean
  meta: {
    changes: number
    last_row_id: number
  }
}

export interface D1PreparedStatement {
  bind(...values: (string | number | null)[]): D1PreparedStatement
  first<Row>(columnName?: string): Promise<Row | null>
  all<Row>(): Promise<D1Result<Row>>
  run<Row = unknown>(): Promise<D1Result<Row>>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface CloudflareEnv {
  LAEL_DB: D1Database
}

export interface PagesContext {
  request: Request
  env: CloudflareEnv
  next(): Promise<Response>
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export function errorResponse(message: string, status: number): Response {
  return json({ message }, status)
}

export async function parseJsonBody(request: Request): Promise<
  | { value: unknown; response: null }
  | { value: null; response: Response }
> {
  const contentType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return { value: null, response: errorResponse('El formato de solicitud debe ser JSON.', 415) }
  }

  const contentLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return { value: null, response: errorResponse('La solicitud supera el tamaño permitido.', 413) }
  }

  if (!request.body) {
    return { value: null, response: errorResponse('La solicitud no contiene datos.', 400) }
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > 16_384) {
      await reader.cancel()
      return { value: null, response: errorResponse('La solicitud supera el tamaño permitido.', 413) }
    }
    chunks.push(value)
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return { value: JSON.parse(new TextDecoder().decode(body)) as unknown, response: null }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { value: null, response: errorResponse('El cuerpo JSON no es válido.', 400) }
    }
    throw error
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160
}

export function verifySameOrigin(request: Request): Response | null {
  const origin = request.headers.get('Origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse('Origen de solicitud no permitido.', 403)
  }
  return null
}

export async function enforceRateLimit(
  request: Request,
  env: CloudflareEnv,
  route: string,
  maximumRequests: number,
): Promise<Response | null> {
  const clientIp = request.headers.get('cf-connecting-ip')
  if (!clientIp) {
    return errorResponse('No se pudo validar el origen de red.', 403)
  }

  const now = Date.now()
  const windowStart = Math.floor(now / 600_000) * 600_000
  const ipBytes = new TextEncoder().encode(`${route}:${windowStart}:${clientIp}`)
  const digest = await crypto.subtle.digest('SHA-256', ipBytes)
  const bucketKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const row = await env.LAEL_DB
    .prepare(`
      INSERT INTO request_limits (bucket_key, window_start, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(bucket_key) DO UPDATE SET request_count = request_count + 1
      WHERE request_count < ?
      RETURNING request_count
    `)
    .bind(bucketKey, windowStart, maximumRequests)
    .first<{ request_count: number }>()

  if (Math.floor(now / 3_600_000) !== Math.floor((now - 60_000) / 3_600_000)) {
    await env.LAEL_DB
      .prepare('DELETE FROM request_limits WHERE window_start < ?')
      .bind(now - 86_400_000)
      .run()
  }

  if (!row) {
    return new Response(JSON.stringify({ message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '600',
      },
    })
  }

  return null
}

import { errorResponse, isRecord, json, type PagesContext } from '../_shared'

interface InventoryRow {
  id: number
  name: string
  category: string
  sku: string
  stock: number
  minimum_stock: number
  price_cents: number
  status: 'Óptimo' | 'Bajo' | 'Agotado'
}

export const onRequestGet = async ({ request, env }: PagesContext): Promise<Response> => {
  const search = new URL(request.url).searchParams.get('search')?.trim() ?? ''
  const status = new URL(request.url).searchParams.get('status')?.trim() ?? 'Todos'
  if (search.length > 80 || (status !== 'Todos' && !['Óptimo', 'Bajo', 'Agotado'].includes(status))) {
    return errorResponse('El filtro del catálogo no es válido.', 400)
  }

  const searchPattern = `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
  const result = await env.LAEL_DB
    .prepare(`
      SELECT id, name, category, sku, stock, minimum_stock, price_cents, status
      FROM inventory_products
      WHERE (? = '' OR name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
        AND (? = 'Todos' OR status = ?)
      ORDER BY name
      LIMIT 100
    `)
    .bind(search, searchPattern, searchPattern, searchPattern, status, status)
    .all<InventoryRow>()

  if (!isRecord(result) || !Array.isArray(result.results)) {
    return errorResponse('No se pudo cargar el catálogo.', 503)
  }

  return json(result.results.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    sku: product.sku,
    stock: product.stock,
    minimumStock: product.minimum_stock,
    price: product.price_cents / 100,
    status: product.status,
  })))
}

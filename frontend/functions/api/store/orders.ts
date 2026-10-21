import {
  enforceRateLimit,
  errorResponse,
  isRecord,
  isValidEmail,
  json,
  parseJsonBody,
  verifySameOrigin,
  type PagesContext,
} from '../../_shared'

interface StoreProductRow {
  id: number
  name: string
  sku: string
  stock: number
  price_cents: number
}

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  const originError = verifySameOrigin(request)
  if (originError) return originError

  const rateLimitError = await enforceRateLimit(request, env, 'store-order', 5)
  if (rateLimitError) return rateLimitError

  const parsed = await parseJsonBody(request)
  if (parsed.response) return parsed.response
  if (!isRecord(parsed.value)) return errorResponse('Completa los datos del pedido.', 400)

  const name = typeof parsed.value.customerName === 'string' ? parsed.value.customerName.trim() : ''
  const email = typeof parsed.value.email === 'string' ? parsed.value.email.trim() : ''
  const phone = typeof parsed.value.phone === 'string' ? parsed.value.phone.trim() : ''
  const address = typeof parsed.value.shippingAddress === 'string' ? parsed.value.shippingAddress.trim() : ''
  if (!name || name.length > 160 || !isValidEmail(email) || !phone || phone.length > 40 || !address || address.length > 300) {
    return errorResponse('Completa nombre, correo válido, teléfono y dirección.', 400)
  }

  if (!Array.isArray(parsed.value.items) || parsed.value.items.length < 1 || parsed.value.items.length > 30) {
    return errorResponse('El pedido debe incluir de 1 a 30 productos.', 400)
  }

  const quantities = new Map<number, number>()
  for (const item of parsed.value.items) {
    if (!isRecord(item)) {
      return errorResponse('Los productos o cantidades del pedido no son válidos.', 400)
    }
    const productId = item.productId
    const quantity = item.quantity
    if (typeof productId !== 'number' || !Number.isSafeInteger(productId) || productId < 1 ||
      typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
      return errorResponse('Los productos o cantidades del pedido no son válidos.', 400)
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
  }

  if ([...quantities.values()].some((quantity) => quantity > 100)) {
    return errorResponse('La cantidad máxima por producto es 100.', 400)
  }

  const placeholders = [...quantities.keys()].map(() => '?').join(', ')
  const productsResult = await env.LAEL_DB
    .prepare(`
      SELECT id, name, sku, stock, price_cents
      FROM inventory_products
      WHERE id IN (${placeholders})
    `)
    .bind(...quantities.keys())
    .all<StoreProductRow>()
  const products = new Map(productsResult.results.map((product) => [product.id, product]))

  if (products.size !== quantities.size) {
    return errorResponse('Uno o más productos ya no están disponibles.', 400)
  }

  const orderItems = [...quantities.entries()].map(([productId, quantity]) => {
    const product = products.get(productId)!
    return {
      productId,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice: product.price_cents / 100,
    }
  })
  const outOfStock = orderItems.find((item) => item.quantity > products.get(item.productId)!.stock)
  if (outOfStock) {
    return errorResponse(`No hay existencias suficientes de ${outOfStock.productName}.`, 400)
  }

  const totalCents = orderItems.reduce((sum, item) => sum + products.get(item.productId)!.price_cents * item.quantity, 0)
  const createdAt = new Date().toISOString()
  const inserted = await env.LAEL_DB
    .prepare(`
      INSERT INTO store_orders
        (customer_name, email, phone, shipping_address, created_at, status, total_cents, items_json)
      VALUES (?, ?, ?, ?, ?, 'Solicitud sin pago', ?, ?)
      RETURNING id
    `)
    .bind(name, email, phone, address, createdAt, totalCents, JSON.stringify(orderItems))
    .first<{ id: number }>()

  if (!inserted) return errorResponse('No se pudo registrar el pedido.', 503)

  return json({
    id: inserted.id,
    status: 'Solicitud sin pago',
    total: totalCents / 100,
    createdAt,
  }, 201)
}

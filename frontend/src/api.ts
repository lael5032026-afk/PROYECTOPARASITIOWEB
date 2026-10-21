export type DashboardSummary = {
  sales: number
  activeOrders: number
  activeCustomers: number
  automatedFlows: number
  salesChange: number
  ordersChange: number
  customersChange: number
  flowsChange: number
}

export type UpdateInventoryProduct = CreateInventoryProduct

export type CrmCustomer = {
  id: number
  name: string
  email: string
  company: string
  phone: string
  status: 'Activo' | 'Prospecto' | 'Inactivo'
  lastContact: string
  notes: string
}

export type CreateCrmCustomer = Omit<CrmCustomer, 'id' | 'lastContact'>

export type InventoryProduct = {
  id: number
  name: string
  category: string
  sku: string
  stock: number
  minimumStock: number
  price: number
  status: 'Óptimo' | 'Bajo' | 'Agotado'
}

export async function getCrmCustomers(search = '', status = 'Todos', signal?: AbortSignal): Promise<CrmCustomer[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status !== 'Todos') params.set('status', status)
  const response = await fetch(`${apiBaseUrl}/api/crm/customers?${params}`, { signal })
  if (!response.ok) throw new Error('No se pudieron cargar los clientes')
  return response.json() as Promise<CrmCustomer[]>
}

export async function createCrmCustomer(customer: CreateCrmCustomer): Promise<CrmCustomer> {
  const response = await fetch(`${apiBaseUrl}/api/crm/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer) })
  if (!response.ok) throw new Error('No se pudo crear el cliente')
  return response.json() as Promise<CrmCustomer>
}

export async function updateCrmCustomer(id: number, customer: CreateCrmCustomer): Promise<CrmCustomer> {
  const response = await fetch(`${apiBaseUrl}/api/crm/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer) })
  if (!response.ok) throw new Error('No se pudo actualizar el cliente')
  return response.json() as Promise<CrmCustomer>
}

export async function deleteCrmCustomer(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/crm/customers/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('No se pudo eliminar el cliente')
}

export type CreateInventoryProduct = {
  name: string
  category: string
  stock: number
  minimumStock: number
  price: number
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await fetch(`${apiBaseUrl}/api/dashboard/summary`, { signal })

  if (!response.ok) {
    throw new Error(`No se pudo cargar el resumen (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!isDashboardSummary(data)) {
    throw new Error('La respuesta del resumen no tiene un formato válido')
  }

  return data
}

export async function getInventory(search = '', status = 'Todos', signal?: AbortSignal): Promise<InventoryProduct[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status !== 'Todos') params.set('status', status)

  const response = await fetch(`${apiBaseUrl}/api/inventory?${params}`, { signal })
  if (!response.ok) throw new Error(`No se pudo cargar el inventario (${response.status})`)
  return response.json() as Promise<InventoryProduct[]>
}

export async function createInventoryProduct(product: CreateInventoryProduct): Promise<InventoryProduct> {
  const response = await fetch(`${apiBaseUrl}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })

  if (!response.ok) throw new Error('No se pudo crear el producto')
  return response.json() as Promise<InventoryProduct>
}

export async function updateInventoryProduct(id: number, product: UpdateInventoryProduct): Promise<InventoryProduct> {
  const response = await fetch(`${apiBaseUrl}/api/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  })

  if (!response.ok) throw new Error('No se pudo actualizar el producto')
  return response.json() as Promise<InventoryProduct>
}

export async function deleteInventoryProduct(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/inventory/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('No se pudo eliminar el producto')
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const summary = value as Record<string, unknown>
  return [
    'sales',
    'activeOrders',
    'activeCustomers',
    'automatedFlows',
    'salesChange',
    'ordersChange',
    'customersChange',
    'flowsChange',
  ].every((key) => typeof summary[key] === 'number')
}

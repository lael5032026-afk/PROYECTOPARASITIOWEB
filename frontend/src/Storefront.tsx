import { useEffect, useMemo, useState } from 'react'
import { Minus, PackageCheck, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react'
import { createStoreOrder, getInventory, type InventoryProduct, type StoreOrderConfirmation } from './api'
import './storefront.css'

type CartLine = {
  product: InventoryProduct
  quantity: number
}

function Storefront() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [confirmation, setConfirmation] = useState<StoreOrderConfirmation | null>(null)
  const [customer, setCustomer] = useState({ customerName: '', email: '', phone: '', shippingAddress: '' })

  useEffect(() => {
    const controller = new AbortController()
    getInventory('', 'Todos', controller.signal)
      .then(setProducts)
      .catch((loadError: Error) => {
        if (loadError.name !== 'AbortError') setError('No se pudo conectar con la tienda. Intenta de nuevo en unos momentos.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const categories = useMemo(() => ['Todas', ...new Set(products.map((product) => product.category))], [products])
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'Todas' || product.category === category
      const matchesSearch = !query || `${product.name} ${product.category} ${product.sku}`.toLocaleLowerCase().includes(query)
      return matchesCategory && matchesSearch && product.stock > 0
    })
  }, [category, products, search])
  const itemCount = cart.reduce((total, line) => total + line.quantity, 0)
  const total = cart.reduce((amount, line) => amount + line.product.price * line.quantity, 0)

  function addToCart(product: InventoryProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      if (existing) {
        if (existing.quantity >= Math.min(product.stock, 100)) return current
        return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, { product, quantity: 1 }]
    })
    setConfirmation(null)
  }

  function setQuantity(productId: number, quantity: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line]
      if (quantity <= 0) return []
      return [{ ...line, quantity: Math.min(quantity, line.product.stock, 100) }]
    }))
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setOrderError('')
    try {
      const result = await createStoreOrder({
        ...customer,
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      })
      setConfirmation(result)
      setCart([])
      setCheckoutOpen(false)
      setCustomer({ customerName: '', email: '', phone: '', shippingAddress: '' })
    } catch (submitError) {
      setOrderError(submitError instanceof Error ? submitError.message : 'No se pudo enviar el pedido.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="storefront">
      <header className="store-header">
        <a className="store-brand" href="/" aria-label="Volver a LAEL Nexus">
          <span className="store-brand-mark"><ShoppingBag size={21} /></span>
          <span><strong>LAEL</strong><small>TIENDA</small></span>
        </a>
        <nav className="store-header-nav"><a href="/tienda">Productos</a><a href="/software">Software y planes</a><a className="store-cart-link" href="#carrito"><ShoppingBag size={18} /><span>Carrito</span><b>{itemCount}</b></a></nav>
      </header>

      <section className="store-hero">
        <p className="store-eyebrow">LAEL NEXUS · TIENDA DE DEMOSTRACIÓN</p>
        <h1>Productos para llevar<br /><span>tu negocio más lejos.</span></h1>
        <p>Explora el catálogo disponible y envía una solicitud de pedido sin cobros en línea.</p>
        <a className="store-hero-link" href="#catalogo">Explorar productos <span>↓</span></a>
      </section>

      <div className="store-layout">
        <section className="store-catalog" id="catalogo">
          <div className="store-section-heading">
            <div><p className="store-eyebrow">CATÁLOGO</p><h2>Productos destacados</h2></div>
            <span>{visibleProducts.length} disponibles</span>
          </div>
          <div className="store-filters">
            <label className="store-search"><Search size={17} /><input aria-label="Buscar productos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar productos..." /></label>
            <select aria-label="Filtrar categoría" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          </div>

          {loading && <p className="store-message">Cargando catálogo...</p>}
          {error && <p className="store-message store-error" role="alert">{error}</p>}
          {!loading && !error && visibleProducts.length === 0 && <p className="store-message">No encontramos productos disponibles con esa búsqueda.</p>}
          <div className="store-product-grid">
            {visibleProducts.map((product, index) => (
              <article className="store-product-card" key={product.id}>
                <div className={`store-product-visual store-visual-${index % 4}`}><span>{product.category}</span><ShoppingBag size={48} strokeWidth={1.2} /></div>
                <div className="store-product-details">
                  <span className="store-product-sku">{product.sku}</span>
                  <h3>{product.name}</h3>
                  <div className="store-product-bottom"><strong>${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><button type="button" onClick={() => addToCart(product)} aria-label={`Agregar ${product.name} al carrito`}><Plus size={18} /> Agregar</button></div>
                  <small>{product.stock} en existencia</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="store-cart" id="carrito">
          <div className="store-cart-heading"><div><p className="store-eyebrow">TU COMPRA</p><h2>Carrito <span>({itemCount})</span></h2></div><ShoppingBag size={21} /></div>
          {confirmation && <div className="store-confirmation" role="status"><PackageCheck size={20} /><div><strong>Solicitud #{confirmation.id} registrada</strong><span>Se guardó en la demo. No se realizó ningún cobro ni se envió una notificación.</span></div></div>}
          {cart.length === 0 && !confirmation && <p className="store-cart-empty">Tu carrito está vacío. Agrega productos del catálogo para empezar.</p>}
          <div className="store-cart-lines">
            {cart.map(({ product, quantity }) => (
              <div className="store-cart-line" key={product.id}>
                <div><strong>{product.name}</strong><span>${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div className="store-quantity">
                  <button type="button" aria-label={`Reducir ${product.name}`} onClick={() => setQuantity(product.id, quantity - 1)}><Minus size={13} /></button>
                  <span>{quantity}</span>
                  <button type="button" aria-label={`Aumentar ${product.name}`} disabled={quantity >= Math.min(product.stock, 100)} onClick={() => setQuantity(product.id, quantity + 1)}><Plus size={13} /></button>
                  <button type="button" className="store-remove" aria-label={`Quitar ${product.name}`} onClick={() => setQuantity(product.id, 0)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && <div className="store-cart-total"><span>Subtotal estimado</span><strong>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong><small>El total final se confirma con el equipo. Esta demo no procesa pagos.</small><button type="button" className="store-checkout-button" onClick={() => { setOrderError(''); setCheckoutOpen(true) }}>Enviar solicitud</button></div>}
        </aside>
      </div>

      <footer className="store-footer"><span>LAEL Nexus · Unifica. Automatiza. Evoluciona.</span><span>Tienda de demostración · Sin cobros en línea</span></footer>

      {checkoutOpen && <div className="store-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCheckoutOpen(false) }}>
        <form className="store-checkout-form" onSubmit={submitOrder}>
          <div className="store-modal-heading"><div><p className="store-eyebrow">SOLICITUD DE PEDIDO</p><h2>¿A quién contactamos?</h2></div><button type="button" aria-label="Cerrar" onClick={() => setCheckoutOpen(false)}>×</button></div>
          <p className="store-no-payment">No se realizará ningún cobro ni se guardarán datos de pago. Tus datos y dirección se guardan en la demo.</p>
          <label>Nombre completo<input required maxLength={160} autoComplete="name" value={customer.customerName} onChange={(event) => setCustomer({ ...customer, customerName: event.target.value })} /></label>
          <label>Correo electrónico<input required type="email" maxLength={160} autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
          <label>Teléfono<input required type="tel" maxLength={40} autoComplete="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></label>
          <label>Dirección de entrega<input required maxLength={300} autoComplete="street-address" value={customer.shippingAddress} onChange={(event) => setCustomer({ ...customer, shippingAddress: event.target.value })} /></label>
          {orderError && <p className="store-error" role="alert">{orderError}</p>}
          <button className="store-checkout-button" type="submit" disabled={sending}>{sending ? 'Enviando...' : `Enviar solicitud · $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}</button>
        </form>
      </div>}
    </main>
  )
}

export default Storefront

import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Network,
  Search,
  ShoppingBag,
  Settings2,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  UsersRound,
  X,
} from 'lucide-react'
import { createCrmCustomer, createInventoryProduct, deleteCrmCustomer, deleteInventoryProduct, getCrmCustomers, getDashboardSummary, getInventory, updateCrmCustomer, updateInventoryProduct, type CrmCustomer, type DashboardSummary, type InventoryProduct } from './api'

const modules = [
  { name: 'Dashboard', icon: LayoutDashboard, active: true, enabled: true },
  { name: 'Inventarios', icon: Boxes, enabled: true },
  { name: 'Facturación', icon: FileText, enabled: false },
  { name: 'Nómina', icon: CircleDollarSign, enabled: false },
  { name: 'CRM', icon: UsersRound, enabled: true },
  { name: 'Automatización', icon: Network, enabled: false },
]

const fallbackSummary: DashboardSummary = {
  sales: 128450,
  activeOrders: 1284,
  activeCustomers: 3842,
  automatedFlows: 64,
  salesChange: 18.4,
  ordersChange: 12.8,
  customersChange: 8.2,
  flowsChange: 24.6,
}

const metricDefinitions = [
  { label: 'Ventas del mes', value: (summary: DashboardSummary) => `$${summary.sales.toLocaleString('en-US')}`, change: (summary: DashboardSummary) => summary.salesChange, icon: CircleDollarSign, tone: 'blue' },
  { label: 'Órdenes activas', value: (summary: DashboardSummary) => summary.activeOrders.toLocaleString('en-US'), change: (summary: DashboardSummary) => summary.ordersChange, icon: Boxes, tone: 'cyan' },
  { label: 'Clientes activos', value: (summary: DashboardSummary) => summary.activeCustomers.toLocaleString('en-US'), change: (summary: DashboardSummary) => summary.customersChange, icon: UsersRound, tone: 'purple' },
  { label: 'Flujos automatizados', value: (summary: DashboardSummary) => summary.automatedFlows.toLocaleString('en-US'), change: (summary: DashboardSummary) => summary.flowsChange, icon: Network, tone: 'green' },
]

function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('lael-authenticated') === 'true')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeModule, setActiveModule] = useState('Dashboard')
  const [summary, setSummary] = useState(fallbackSummary)
  const [apiConnected, setApiConnected] = useState(false)
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryStatus, setInventoryStatus] = useState('Todos')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [productForm, setProductForm] = useState({ name: '', category: 'Electrónica', stock: 0, minimumStock: 5, price: 0 })
  const [inventoryError, setInventoryError] = useState('')
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [crmSearch, setCrmSearch] = useState('')
  const [crmStatus, setCrmStatus] = useState('Todos')
  const [crmError, setCrmError] = useState('')
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CrmCustomer | null>(null)
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', company: '', phone: '', status: 'Prospecto' as CrmCustomer['status'], notes: '' })

  function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    if (email.trim().toLowerCase() !== 'admin@laelnexus.com' || password !== 'LAEL2026') {
      setLoginError('Correo o contraseña incorrectos.')
      return
    }

    localStorage.setItem('lael-authenticated', 'true')
    setAuthenticated(true)
    setLoginError('')
  }

  function handleLogout() {
    localStorage.removeItem('lael-authenticated')
    setAuthenticated(false)
  }

  useEffect(() => {
    if (!authenticated) return
    const controller = new AbortController()

    getDashboardSummary(controller.signal)
      .then((data) => {
        setSummary(data)
        setApiConnected(true)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setApiConnected(false)
        }
      })

    return () => controller.abort()
  }, [authenticated])

  useEffect(() => {
    if (!authenticated || activeModule !== 'Inventarios') return
    const controller = new AbortController()
    setInventoryError('')
    getInventory(inventorySearch, inventoryStatus, controller.signal)
      .then(setProducts)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setProducts([])
          setInventoryError('No se pudo cargar el inventario.')
        }
      })
    return () => controller.abort()
  }, [authenticated, activeModule, inventorySearch, inventoryStatus])

  useEffect(() => {
    if (!authenticated || activeModule !== 'CRM') return
    const controller = new AbortController()
    setCrmError('')
    getCrmCustomers(crmSearch, crmStatus, controller.signal)
      .then(setCustomers)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setCustomers([])
          setCrmError('No se pudieron cargar los clientes. Comprueba la conexión con la API.')
        }
      })
    return () => controller.abort()
  }, [authenticated, activeModule, crmSearch, crmStatus])

  if (!authenticated) {
    return <LoginScreen email={email} password={password} showPassword={showPassword} error={loginError} onEmailChange={setEmail} onPasswordChange={setPassword} onTogglePassword={() => setShowPassword((value) => !value)} onSubmit={handleLogin} />
  }

  async function handleCreateProduct(event: React.FormEvent) {
    event.preventDefault()
    setInventoryError('')
    try {
      if (editingProduct) await updateInventoryProduct(editingProduct.id, productForm)
      else await createInventoryProduct(productForm)
      setProducts(await getInventory(inventorySearch, inventoryStatus))
      setProductForm({ name: '', category: 'Electrónica', stock: 0, minimumStock: 5, price: 0 })
      setEditingProduct(null)
      setShowProductForm(false)
    } catch {
      setInventoryError('No se pudo registrar el producto.')
    }
  }

  async function saveCustomer(event: React.FormEvent) {
    event.preventDefault()
    setCrmError('')
    try {
      if (editingCustomer) await updateCrmCustomer(editingCustomer.id, customerForm)
      else await createCrmCustomer(customerForm)
      setCustomers(await getCrmCustomers(crmSearch, crmStatus))
      setShowCustomerForm(false)
      setEditingCustomer(null)
      setCustomerForm({ name: '', email: '', company: '', phone: '', status: 'Prospecto', notes: '' })
    } catch {
      setCrmError('No se pudo guardar el cliente. Comprueba los datos y la conexión con la API.')
    }
  }

  function editCustomer(customer: CrmCustomer) { setEditingCustomer(customer); setCustomerForm({ name: customer.name, email: customer.email, company: customer.company, phone: customer.phone, status: customer.status, notes: customer.notes }); setShowCustomerForm(true) }

  async function removeCustomer(customer: CrmCustomer) {
    if (!window.confirm(`¿Eliminar ${customer.name}?`)) return
    setCrmError('')
    try {
      await deleteCrmCustomer(customer.id)
      setCustomers((current) => current.filter((item) => item.id !== customer.id))
    } catch {
      setCrmError('No se pudo eliminar el cliente. Comprueba la conexión con la API.')
    }
  }

  function editProduct(product: InventoryProduct) {
    setEditingProduct(product)
    setProductForm({ name: product.name, category: product.category, stock: product.stock, minimumStock: product.minimumStock, price: product.price })
    setShowProductForm(true)
  }

  async function removeProduct(product: InventoryProduct) {
    if (!window.confirm(`¿Eliminar ${product.name}?`)) return
    try {
      await deleteInventoryProduct(product.id)
      setProducts((current) => current.filter((item) => item.id !== product.id))
    } catch {
      setInventoryError('No se pudo eliminar el producto.')
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div><strong>LAEL</strong><span>NEXUS</span></div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="workspace-switcher"><span className="status-dot" /> LAEL Corporation <ChevronRight size={15} /></div>
        <nav className="navigation">
          <div className="nav-caption">PLATAFORMA</div>
          {modules.map(({ name, icon: Icon, active, enabled }) => (
            <button key={name} className={`nav-item ${(activeModule === name || (active && activeModule === 'Dashboard')) ? 'selected' : ''}`} disabled={!enabled} title={enabled ? name : 'Integración backend pendiente'} onClick={() => { setActiveModule(name); setMenuOpen(false) }}>
              <Icon size={18} /><span>{name}</span>{!enabled && <span className="nav-badge">Próximamente</span>}
            </button>
          ))}
          <a className="nav-item" href="/tienda"><ShoppingBag size={18} /><span>Tienda pública</span><ArrowUpRight size={14} /></a>
          <div className="nav-caption nav-caption-spaced">SISTEMA</div>
          <button className="nav-item" disabled title="Integración backend pendiente"><Settings2 size={18} /><span>Configuración</span><span className="nav-badge">Próximamente</span></button>
        </nav>
        <div className="sidebar-footer"><div className="ai-orb"><Network size={18} /></div><div><strong>{apiConnected ? 'API conectada' : 'API sin conexión'}</strong><small>Dashboard, inventario y CRM</small></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <div className="breadcrumbs"><span>Plataforma</span><ChevronRight size={14} /><strong>{activeModule}</strong></div>
          <div className="topbar-actions"><button className="icon-button"><Search size={19} /></button><button className="icon-button notification"><Bell size={19} /><i /></button><button className="user-avatar" onClick={handleLogout} title="Cerrar sesión">LC</button></div>
        </header>
        <div className="content-container">
          {activeModule === 'CRM' && crmError && <p className="form-error" role="alert">{crmError}</p>}
          {activeModule === 'Inventarios' ? <InventoryView products={products} search={inventorySearch} status={inventoryStatus} onSearch={setInventorySearch} onStatus={setInventoryStatus} showForm={showProductForm} onShowForm={(value) => { setShowProductForm(value); if (!value) setEditingProduct(null) }} form={productForm} onFormChange={setProductForm} onSubmit={handleCreateProduct} onEdit={editProduct} onDelete={removeProduct} editing={Boolean(editingProduct)} error={inventoryError} /> : activeModule === 'CRM' ? <CrmView customers={customers} search={crmSearch} status={crmStatus} onSearch={setCrmSearch} onStatus={setCrmStatus} showForm={showCustomerForm} onShowForm={(value) => { setShowCustomerForm(value); if (!value) setEditingCustomer(null) }} form={customerForm} onFormChange={setCustomerForm} onSubmit={saveCustomer} onEdit={editCustomer} onDelete={removeCustomer} editing={Boolean(editingCustomer)} /> : <>
          <section className="welcome-row"><div><p className="eyebrow">MIÉRCOLES, 18 DE JUNIO DE 2025</p><h1>Buenos días, <span>Luisa</span></h1><p className="subtitle">Aquí tienes el pulso de tu negocio en tiempo real.</p></div><div className="welcome-actions"><span className={`connection-status ${apiConnected ? 'connected' : ''}`}><i /> {apiConnected ? 'API conectada' : 'Datos de demostración'}</span><button className="primary-button"><ArrowUpRight size={17} /> Ver reportes</button></div></section>
          <section className="metric-grid">{metricDefinitions.map(({ label, value, change, icon: Icon, tone }) => <article className="metric-card" key={label}><div className={`metric-icon ${tone}`}><Icon size={20} /></div><div className="metric-info"><span>{label}</span><strong>{value(summary)}</strong><small><ArrowUpRight size={13} /> +{change(summary)}% <em>vs. mes anterior</em></small></div></article>)}</section>
          <section className="dashboard-grid"><article className="panel sales-panel"><div className="panel-heading"><div><p className="eyebrow">RENDIMIENTO</p><h2>Resumen de ventas</h2></div><select defaultValue="6"><option value="6">Últimos 6 meses</option></select></div><div className="chart"><div className="chart-y"><span>$150k</span><span>$100k</span><span>$50k</span><span>$0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 620 220" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#007bff" stopOpacity=".34" /><stop offset="100%" stopColor="#007bff" stopOpacity="0" /></linearGradient></defs><path d="M0,180 C60,160 75,150 125,155 S180,115 235,130 S280,80 335,100 S390,70 430,80 S485,35 530,58 S575,20 620,28 V220 H0Z" fill="url(#chartFill)" /><path d="M0,180 C60,160 75,150 125,155 S180,115 235,130 S280,80 335,100 S390,70 430,80 S485,35 530,58 S575,20 620,28" fill="none" stroke="#1687ff" strokeWidth="3" /></svg><div className="chart-x"><span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span></div></div></div></article><article className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">OPERACIÓN</p><h2>Actividad reciente</h2></div><button className="text-button">Ver todo <ArrowUpRight size={14} /></button></div><div className="activity-list"><ActivityItem icon={<CheckCircle2 />} title="Factura emitida" detail="FAC-2025-00842 · Grupo Delta" time="Hace 8 min" color="green" /><ActivityItem icon={<Boxes />} title="Inventario actualizado" detail="34 productos sincronizados" time="Hace 26 min" color="blue" /><ActivityItem icon={<BrainCircuit />} title="Predicción completada" detail="Modelo de ventas mensual" time="Hace 1 h" color="purple" /><ActivityItem icon={<UsersRound />} title="Nuevo cliente registrado" detail="Innovaciones Vega S.A." time="Hace 2 h" color="cyan" /></div></article></section>
          <section className="insight-banner"><div className="insight-icon"><Sparkles size={23} /></div><div><p className="eyebrow">NEXUS INTELLIGENCE</p><h3>Hay una oportunidad de optimización</h3><p>La IA detectó que puedes reducir un 12% el coste de inventario en la categoría electrónica.</p></div><button className="secondary-button">Ver recomendación <ArrowUpRight size={15} /></button></section>
          <footer><span>LAEL Nexus <b>•</b> Unifica. Automatiza. Evoluciona.</span><span>v0.1.0 · Todos los sistemas operativos</span></footer></>}
        </div>
      </main>
    </div>
  )
}

function CrmView({ customers, search, status, onSearch, onStatus, showForm, onShowForm, form, onFormChange, onSubmit, onEdit, onDelete, editing }: { customers: CrmCustomer[]; search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void; showForm: boolean; onShowForm: (value: boolean) => void; form: { name: string; email: string; company: string; phone: string; status: CrmCustomer['status']; notes: string }; onFormChange: (value: { name: string; email: string; company: string; phone: string; status: CrmCustomer['status']; notes: string }) => void; onSubmit: (event: React.FormEvent) => void; onEdit: (customer: CrmCustomer) => void; onDelete: (customer: CrmCustomer) => void; editing: boolean }) {
  return <><section className="module-header"><div><p className="eyebrow">CORE EMPRESARIAL</p><h1>CRM</h1><p className="subtitle">Gestiona clientes, contactos y oportunidades comerciales.</p></div><button className="primary-button" onClick={() => onShowForm(true)}><UsersRound size={17} /> Nuevo cliente</button></section><section className="inventory-stats"><div><span>Clientes registrados</span><strong>{customers.length}</strong></div><div><span>Clientes activos</span><strong>{customers.filter((customer) => customer.status === 'Activo').length}</strong></div><div><span>Prospectos</span><strong className="warning-value">{customers.filter((customer) => customer.status === 'Prospecto').length}</strong></div><div><span>Empresas</span><strong>{new Set(customers.map((customer) => customer.company)).size}</strong></div></section><section className="panel inventory-panel"><div className="inventory-toolbar"><div className="inventory-search"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar cliente, empresa o correo" /></div><select value={status} onChange={(event) => onStatus(event.target.value)}><option>Todos</option><option>Activo</option><option>Prospecto</option><option>Inactivo</option></select></div><div className="inventory-table-wrap"><table><thead><tr><th>Cliente</th><th>Empresa</th><th>Contacto</th><th>Último contacto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><strong>{customer.name}</strong><small>{customer.email}</small></td><td>{customer.company}</td><td>{customer.phone}</td><td>{new Date(customer.lastContact).toLocaleDateString('es-ES')}</td><td><span className={`stock-status ${customer.status === 'Activo' ? 'optimo' : customer.status === 'Prospecto' ? 'bajo' : 'agotado'}`}>{customer.status}</span></td><td><div className="row-actions"><button className="table-action edit" onClick={() => onEdit(customer)}>Editar</button><button className="table-action delete" onClick={() => onDelete(customer)}>Eliminar</button></div></td></tr>)}</tbody></table>{customers.length === 0 && <div className="empty-state">No hay clientes que coincidan con la búsqueda.</div>}</div></section>{showForm && <div className="modal-backdrop"><form className="product-form" onSubmit={onSubmit}><div className="form-heading"><div><p className="eyebrow">CRM</p><h2>{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2></div><button type="button" className="icon-button" onClick={() => onShowForm(false)}><X size={20} /></button></div><label>Nombre<input required value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} /></label><label>Correo electrónico<input required type="email" value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} /></label><label>Empresa<input required value={form.company} onChange={(event) => onFormChange({ ...form, company: event.target.value })} /></label><label>Teléfono<input value={form.phone} onChange={(event) => onFormChange({ ...form, phone: event.target.value })} /></label><label>Estado<select value={form.status} onChange={(event) => onFormChange({ ...form, status: event.target.value as CrmCustomer['status'] })}><option>Prospecto</option><option>Activo</option><option>Inactivo</option></select></label><label>Notas<input value={form.notes} onChange={(event) => onFormChange({ ...form, notes: event.target.value })} /></label><button className="primary-button" type="submit">Guardar cliente</button></form></div>}</>
}

function LoginScreen({ email, password, showPassword, error, onEmailChange, onPasswordChange, onTogglePassword, onSubmit }: { email: string; password: string; showPassword: boolean; error: string; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onTogglePassword: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <main className="login-screen"><div className="login-glow login-glow-one" /><div className="login-glow login-glow-two" /><section className="login-card"><div className="login-brand"><div className="brand-mark"><ShieldCheck size={25} /></div><div><strong>LAEL</strong><span>NEXUS</span></div></div><div className="login-heading"><p className="eyebrow">PLATAFORMA EMPRESARIAL</p><h1>Bienvenido de nuevo</h1><p>Accede a tu centro de operaciones inteligente.</p></div><form className="login-form" onSubmit={onSubmit}><label>Correo electrónico<div className="login-input"><UsersRound size={17} /><input type="email" required value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="tu@empresa.com" /></div></label><label>Contraseña<div className="login-input"><ShieldCheck size={17} /><input type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="••••••••" /><button type="button" onClick={onTogglePassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{error && <p className="login-error">{error}</p>}<button className="login-submit" type="submit">Iniciar sesión <ArrowUpRight size={17} /></button></form><div className="demo-credentials"><Sparkles size={15} /><span>Demo: <b>admin@laelnexus.com</b> · <b>LAEL2026</b></span></div><p className="login-footer">Unifica. Automatiza. Evoluciona.</p></section></main>
}

function InventoryView({ products, search, status, onSearch, onStatus, showForm, onShowForm, form, onFormChange, onSubmit, onEdit, onDelete, editing, error }: { products: InventoryProduct[]; search: string; status: string; onSearch: (value: string) => void; onStatus: (value: string) => void; showForm: boolean; onShowForm: (value: boolean) => void; form: { name: string; category: string; stock: number; minimumStock: number; price: number }; onFormChange: (value: { name: string; category: string; stock: number; minimumStock: number; price: number }) => void; onSubmit: (event: React.FormEvent) => void; onEdit: (product: InventoryProduct) => void; onDelete: (product: InventoryProduct) => void; editing: boolean; error: string }) {
  const totalUnits = products.reduce((total, product) => total + product.stock, 0)
  const lowStock = products.filter((product) => product.status === 'Bajo').length
  const outOfStock = products.filter((product) => product.status === 'Agotado').length

  return <>
    <section className="module-header"><div><p className="eyebrow">CORE EMPRESARIAL</p><h1>Inventarios</h1><p className="subtitle">Controla existencias, costes y disponibilidad en tiempo real.</p></div><button className="primary-button" onClick={() => onShowForm(true)}><Boxes size={17} /> Nuevo producto</button></section>
    <section className="inventory-stats"><div><span>Productos registrados</span><strong>{products.length}</strong></div><div><span>Unidades en stock</span><strong>{totalUnits.toLocaleString('es-ES')}</strong></div><div><span>Stock bajo</span><strong className="warning-value">{lowStock}</strong></div><div><span>Agotados</span><strong className="danger-value">{outOfStock}</strong></div></section>
    <section className="panel inventory-panel"><div className="inventory-toolbar"><div className="inventory-search"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por nombre, SKU o categoría" /></div><select value={status} onChange={(event) => onStatus(event.target.value)}><option>Todos</option><option>Óptimo</option><option>Bajo</option><option>Agotado</option></select></div>{error && <p className="form-error">{error}</p>}<div className="inventory-table-wrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>SKU</th><th>Stock</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.category}</td><td className="sku-cell">{product.sku}</td><td><strong>{product.stock}</strong><small> mín. {product.minimumStock}</small></td><td>${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td><span className={`stock-status ${product.status.toLowerCase().replace('ó', 'o')}`}>{product.status}</span></td><td><div className="row-actions"><button className="table-action edit" onClick={() => onEdit(product)}>Editar</button><button className="table-action delete" onClick={() => onDelete(product)}>Eliminar</button></div></td></tr>)}</tbody></table>{products.length === 0 && <div className="empty-state">No hay productos que coincidan con la búsqueda.</div>}</div></section>
    {showForm && <div className="modal-backdrop"><form className="product-form" onSubmit={onSubmit}><div className="form-heading"><div><p className="eyebrow">INVENTARIO</p><h2>{editing ? 'Editar producto' : 'Nuevo producto'}</h2></div><button type="button" className="icon-button" onClick={() => onShowForm(false)}><X size={20} /></button></div><label>Nombre<input required value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} /></label><label>Categoría<select value={form.category} onChange={(event) => onFormChange({ ...form, category: event.target.value })}><option>Electrónica</option><option>Accesorios</option><option>Mobiliario</option><option>Oficina</option></select></label><div className="form-grid"><label>Stock<input type="number" min="0" required value={form.stock} onChange={(event) => onFormChange({ ...form, stock: Number(event.target.value) })} /></label><label>Stock mínimo<input type="number" min="0" required value={form.minimumStock} onChange={(event) => onFormChange({ ...form, minimumStock: Number(event.target.value) })} /></label></div><label>Precio<input type="number" min="0" step="0.01" required value={form.price} onChange={(event) => onFormChange({ ...form, price: Number(event.target.value) })} /></label><button className="primary-button" type="submit">{editing ? 'Guardar cambios' : 'Registrar producto'}</button></form></div>}
  </>
}

function ActivityItem({ icon, title, detail, time, color }: { icon: React.ReactNode; title: string; detail: string; time: string; color: string }) {
  return <div className="activity-item"><div className={`activity-icon ${color}`}>{icon}</div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></div>
}

export default App

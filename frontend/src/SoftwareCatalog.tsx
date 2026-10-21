import { useState } from 'react'
import { ArrowUpRight, Check, Cloud, Layers3, LockKeyhole, Sparkles } from 'lucide-react'
import { createSoftwarePlanRequest, type SoftwarePlanRequestConfirmation } from './api'
import './storefront.css'

type PlanPeriod = 'mensual' | 'anual'

function SoftwareCatalog() {
  const [planPeriod, setPlanPeriod] = useState<PlanPeriod>('mensual')
  const [form, setForm] = useState({ customerName: '', email: '', company: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<SoftwarePlanRequestConfirmation | null>(null)

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setError('')
    setConfirmation(null)
    try {
      const result = await createSoftwarePlanRequest({
        softwareCode: 'lael-nexus',
        ...form,
        planPeriod,
      })
      setConfirmation(result)
      setForm({ customerName: '', email: '', company: '' })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="storefront software-storefront">
      <header className="store-header">
        <a className="store-brand" href="/" aria-label="Volver a LAEL Nexus">
          <span className="store-brand-mark"><Sparkles size={21} /></span>
          <span><strong>LAEL</strong><small>SOFTWARE</small></span>
        </a>
        <nav className="store-header-nav">
          <a href="/tienda">Productos</a>
          <a href="/software" aria-current="page">Software y planes</a>
        </nav>
      </header>

      <section className="software-hero">
        <p className="store-eyebrow">SOFTWARE PARA TU EMPRESA</p>
        <h1>Herramientas que crecen<br /><span>al ritmo de tu negocio.</span></h1>
        <p>Elige una suscripción mensual o anual. Agregaremos más soluciones de software poco a poco.</p>
        <div className="software-period-switch" aria-label="Periodo del plan">
          <button type="button" className={planPeriod === 'mensual' ? 'selected' : ''} aria-pressed={planPeriod === 'mensual'} onClick={() => { setPlanPeriod('mensual'); setConfirmation(null) }}>Mensual</button>
          <button type="button" className={planPeriod === 'anual' ? 'selected' : ''} aria-pressed={planPeriod === 'anual'} onClick={() => { setPlanPeriod('anual'); setConfirmation(null) }}>Anual</button>
        </div>
      </section>

      <section className="software-content">
        <article className="software-plan-card">
          <div className="software-plan-top">
            <span className="software-plan-icon"><Layers3 size={23} /></span>
            <span className="software-available">Disponible</span>
          </div>
          <p className="store-eyebrow">PLATAFORMA EMPRESARIAL</p>
          <h2>LAEL Nexus</h2>
          <p className="software-plan-description">Centraliza tus operaciones desde un solo lugar con dashboard, control de inventario y gestión de clientes CRM.</p>
          <div className="software-price"><strong>Cotización</strong><span>Plan {planPeriod} · precio por confirmar</span></div>
          <ul className="software-features">
            <li><Check size={16} /> Dashboard de operaciones</li>
            <li><Check size={16} /> Inventario conectado</li>
            <li><Check size={16} /> Clientes y contactos CRM</li>
            <li><Check size={16} /> Nuevos módulos conforme estén disponibles</li>
          </ul>
          <button className="store-checkout-button software-request-button" type="button" onClick={() => { setError(''); document.getElementById('solicitar-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>Solicitar plan {planPeriod} <ArrowUpRight size={16} /></button>
          <small className="software-payment-note">La solicitud no activa una suscripción ni realiza un cobro.</small>
        </article>

        <aside className="software-side-copy">
          <p className="store-eyebrow">UNA SUSCRIPCIÓN, MÁS POSIBILIDADES</p>
          <h2>Software listo para trabajar contigo.</h2>
          <p>Selecciona tu periodo preferido. Nuestro equipo puede confirmar el precio, alcance y activación antes de cualquier contratación.</p>
          <div className="software-promise"><Cloud size={19} /><span><strong>Acceso al software</strong><small>La activación se confirma después de acordar tu plan.</small></span></div>
          <div className="software-promise"><LockKeyhole size={19} /><span><strong>Sin cobro en esta demo</strong><small>No solicitamos datos bancarios ni procesamos pagos.</small></span></div>
          <div className="software-future"><Sparkles size={18} /><span>Próximamente: más herramientas de software se agregarán al catálogo.</span></div>
        </aside>
      </section>

      <section className="software-request-section" id="solicitar-plan">
        <div><p className="store-eyebrow">SIGUIENTE PASO</p><h2>Solicita tu plan {planPeriod}</h2><p>Déjanos tus datos y registraremos una solicitud para que el equipo pueda contactarte sobre disponibilidad y precio.</p></div>
        <form className="software-request-form" onSubmit={submitRequest}>
          <label>Nombre completo<input required maxLength={160} autoComplete="name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
          <label>Correo electrónico<input required type="email" maxLength={160} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Empresa<input required maxLength={160} autoComplete="organization" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
          <p className="software-privacy-note">Tus datos se guardarán para gestionar esta solicitud de demostración. No se enviará correo automáticamente.</p>
          {error && <p className="store-error" role="alert">{error}</p>}
          {confirmation && <p className="software-success" role="status"><Check size={18} /> Solicitud #{confirmation.id} registrada para el plan {confirmation.planPeriod}. Está pendiente de cotización y no activa una suscripción.</p>}
          <button className="store-checkout-button" type="submit" disabled={sending}>{sending ? 'Enviando...' : `Enviar solicitud · ${planPeriod}`}</button>
        </form>
      </section>

      <footer className="store-footer"><span>Planes de software · Suscripciones mensuales o anuales</span></footer>
    </main>
  )
}

export default SoftwareCatalog

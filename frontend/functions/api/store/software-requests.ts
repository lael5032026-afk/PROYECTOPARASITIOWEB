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

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  const originError = verifySameOrigin(request)
  if (originError) return originError

  const rateLimitError = await enforceRateLimit(request, env, 'software-request', 5)
  if (rateLimitError) return rateLimitError

  const parsed = await parseJsonBody(request)
  if (parsed.response) return parsed.response
  if (!isRecord(parsed.value)) return errorResponse('Completa los datos de la solicitud.', 400)

  const customerName = typeof parsed.value.customerName === 'string' ? parsed.value.customerName.trim() : ''
  const email = typeof parsed.value.email === 'string' ? parsed.value.email.trim() : ''
  const company = typeof parsed.value.company === 'string' ? parsed.value.company.trim() : ''
  const softwareCode = parsed.value.softwareCode
  const planPeriod = parsed.value.planPeriod

  if (softwareCode !== 'lael-nexus') {
    return errorResponse('Ese software todavía no está disponible para solicitar.', 400)
  }
  if (!customerName || customerName.length > 160 || !isValidEmail(email) || !company || company.length > 160) {
    return errorResponse('Completa nombre, correo válido y empresa.', 400)
  }
  if (planPeriod !== 'mensual' && planPeriod !== 'anual') {
    return errorResponse('Selecciona un plan mensual o anual.', 400)
  }

  const createdAt = new Date().toISOString()
  const inserted = await env.LAEL_DB
    .prepare(`
      INSERT INTO software_plan_requests
        (software_code, software_name, customer_name, email, company, plan_period, created_at, status)
      VALUES ('lael-nexus', 'LAEL Nexus', ?, ?, ?, ?, ?, 'Pendiente de cotización')
      RETURNING id
    `)
    .bind(customerName, email, company, planPeriod, createdAt)
    .first<{ id: number }>()

  if (!inserted) return errorResponse('No se pudo registrar la solicitud.', 503)

  return json({
    id: inserted.id,
    softwareName: 'LAEL Nexus',
    planPeriod,
    status: 'Pendiente de cotización',
    createdAt,
  }, 201)
}

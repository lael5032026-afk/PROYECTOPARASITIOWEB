import { errorResponse } from '../_shared'

export const onRequest = (): Response => errorResponse('Ruta de API no disponible.', 404)

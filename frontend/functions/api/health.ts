import { json } from '../_shared'

export const onRequestGet = (): Response =>
  json({ service: 'LAEL Nexus public storefront', status: 'operational' })

/** E1-B10: fotos sólo para la DEMO local, separadas del ledger y del estado de negocio. */
export type DemoImageScope = 'profile' | 'business' | 'catalog' | 'supplier' | 'location'
export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024
export const MAX_IMAGE_SIDE = 512
export const MAX_STORED_IMAGE_BYTES = 400 * 1024
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

export function demoImageKey(scope: DemoImageScope, businessId?: string, entityId?: string): string {
  if (scope === 'profile') return JSON.stringify(['profile', 'demo-user'])
  if (!businessId || !entityId ||
      businessId.length > 120 || entityId.length > 140 ||
      !/^[a-zA-Z0-9_-]+$/.test(businessId) ||
      !/^[a-zA-Z0-9_-]+$/.test(entityId)) {
    throw new Error('La imagen necesita una ficha existente dentro de una empresa válida.')
  }
  return JSON.stringify([scope, businessId, entityId])
}

export function validateDemoImageFile(file: Pick<File, 'type' | 'size'>): void {
  if (!allowedImageTypes.includes(file.type as typeof allowedImageTypes[number])) {
    throw new Error('Elegí una imagen JPG, PNG o WebP. No se permiten SVG ni GIF.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error('La imagen debe pesar menos de 8 MB antes de optimizarla.')
  }
}

export function scaledImageSize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) ||
      width <= 0 || height <= 0 || width > 30_000 || height > 30_000) {
    throw new Error('La imagen tiene dimensiones inválidas o demasiado grandes.')
  }
  const factor = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) }
}

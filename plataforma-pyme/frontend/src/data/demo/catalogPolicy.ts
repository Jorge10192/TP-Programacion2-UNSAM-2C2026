/**
 * Reglas puras de Catálogo DEMO.
 * No realiza operaciones de inventario, compras, venta ni autorizaciones reales.
 */
export const catalogKindLabels = {
  ELABORADO: 'Elaboración propia',
  REVENTA: 'Producto de reventa',
  INSUMO: 'Insumo / material',
  SERVICIO: 'Servicio',
} as const
export type CatalogKind = keyof typeof catalogKindLabels

export const catalogUnitLabels = {
  UNIDAD: 'Unidad',
  GRAMO: 'Gramo',
  KILOGRAMO: 'Kilogramo',
  MILILITRO: 'Mililitro',
  LITRO: 'Litro',
  PAQUETE: 'Paquete',
  CAJA: 'Caja',
  SERVICIO: 'Servicio',
} as const
export type CatalogUnit = keyof typeof catalogUnitLabels

export type CatalogInput = {
  name: string
  kind: CatalogKind
  category: string
  sku: string
  unit: CatalogUnit
  description: string
  observations: string
  sellable: boolean
  priceCents: number | null
  referenceCostCents: number | null
}

export function catalogNameKey(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR')
}

function cleanText(value: string, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error(label + ': valor inválido.')
  const result = value.trim().replace(/\s+/g, ' ')
  if (result.length < min || result.length > max) {
    throw new Error(label + ' debe tener entre ' + min + ' y ' + max + ' caracteres.')
  }
  return result
}

/** ARS en centavos enteros, sin puntos de miles ni IEEE floats para acumulación. */
export function parseMoneyCents(input: string): number | null {
  const text = input.trim()
  if (!text) return null // precio a cotizar / costo no informado
  if (!/^(?:0|[1-9]\d{0,8})(?:[.,]\d{1,2})?$/.test(text)) {
    throw new Error('Ingresá un importe válido, por ejemplo 1250,50. Sin separadores de miles.')
  }
  const [whole, fraction = ''] = text.replace(',', '.').split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error('Importe fuera de rango.')
  return cents
}

export function moneyInput(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function moneyDisplay(cents: number | null): string {
  if (cents === null) return 'A cotizar'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(cents / 100)
}

export function normalizeCatalogInput(input: CatalogInput): CatalogInput {
  if (!Object.hasOwn(catalogKindLabels, input.kind)) throw new Error('Seleccioná un tipo de artículo válido.')
  if (!Object.hasOwn(catalogUnitLabels, input.unit)) throw new Error('Seleccioná una unidad de control válida.')
  const name = cleanText(input.name, 'El nombre', 2, 90)
  const category = cleanText(input.category || 'General', 'La categoría', 2, 60)
  const description = cleanText(input.description, 'La descripción', 0, 450)
  // Compatibilidad con fichas anteriores a E1-B5.1, que no tenían observaciones.
  const observations = cleanText(input.observations ?? '', 'Las observaciones internas', 0, 600)
  const sku = input.sku.trim().toUpperCase()
  if (sku.length > 32 || (sku && !/^[A-Z0-9._-]+$/.test(sku))) {
    throw new Error('El SKU admite hasta 32 caracteres: letras, números, punto, guion o guion bajo.')
  }
  if (input.kind === 'SERVICIO' && input.unit !== 'SERVICIO') {
    throw new Error('Los servicios utilizan la unidad Servicio y no generan stock físico.')
  }
  if (input.kind !== 'SERVICIO' && input.unit === 'SERVICIO') {
    throw new Error('La unidad Servicio es exclusiva de artículos de tipo Servicio.')
  }
  if (typeof input.sellable !== 'boolean') throw new Error('Indicá explícitamente si se ofrece para la venta.')
  for (const [label, cents] of [['precio', input.priceCents], ['costo', input.referenceCostCents]] as const) {
    if (cents !== null && (!Number.isSafeInteger(cents) || cents < 0 || cents > 99999999999)) {
      throw new Error('El ' + label + ' debe estar expresado en centavos enteros no negativos.')
    }
  }
  return {
    name, kind: input.kind, category, sku, unit: input.unit, description, observations,
    sellable: input.sellable, priceCents: input.priceCents, referenceCostCents: input.referenceCostCents,
  }
}

export const catalogKinds: CatalogKind[] = ['ELABORADO', 'REVENTA', 'INSUMO', 'SERVICIO']
export const catalogUnits: CatalogUnit[] = ['UNIDAD', 'GRAMO', 'KILOGRAMO', 'MILILITRO', 'LITRO', 'PAQUETE', 'CAJA', 'SERVICIO']

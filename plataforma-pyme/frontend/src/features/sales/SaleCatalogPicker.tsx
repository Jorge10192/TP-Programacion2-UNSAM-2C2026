import { useAppData, useStockBalances } from '../../data/dataContext'
import { useState } from 'react'
import { Icon } from '../../app/Icon'
import type { Business, CatalogItem } from '../../data/models'
import type { InventoryMovement } from '../../data/demo/inventoryPolicy'
import { stockKey } from '../../data/demo/inventoryPolicy'
import { moneyDisplay } from '../../data/demo/catalogPolicy'
import { quantityText } from '../../data/demo/purchasePolicy'
import { DemoPhoto } from '../common/DemoPhoto'

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim()
}

/**
 * Selector visual opcional para el POS. No escribe stock ni confirma ventas:
 * el gateway vuelve a validar existencias al enviar el checkout.
 */
export function SaleCatalogPicker({
  business, items, locationId, movements, selectedMilli, selectedIds, onAdd,
}: {
  business: Business
  items: CatalogItem[]
  locationId: string
  movements: InventoryMovement[]
  selectedMilli: ReadonlyMap<string, number>
  selectedIds: ReadonlySet<string>
  onAdd: (id: string) => void
}) {
  const { capabilities } = useAppData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const balances = useStockBalances(movements, business.id)
  const categories = Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'es'))
  const search = normalizeSearch(query)
  const visible = items.filter((item) =>
    (!category || item.category === category) &&
    (!search || normalizeSearch(item.name + ' ' + item.sku + ' ' + item.category + ' ' + item.description).includes(search)))

  return <section className="sales-picker" aria-label="Selector visual de artículos">
    <div className="sales-subheading">
      <div><h3>Seleccionar artículos</h3><p>{capabilities.services ? 'Elegí productos o servicios del catálogo.' : 'Elegí artículos del catálogo.'} También podés cargarlos desde el formulario de abajo.</p></div>
      <span className="small-pill">{visible.length} artículos</span>
    </div>
    <div className="sales-picker-filters">
      <label className="form-field"><span>Buscar por nombre, SKU o descripción</span>
        <input type="search" value={query} placeholder={capabilities.services ? 'Buscar productos o servicios…' : 'Buscar artículos…'} onChange={(event) => setQuery(event.target.value)}/>
      </label>
      <label className="form-field"><span>Categoría</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    {visible.length === 0 ? <div className="sales-picker-empty">No encontramos artículos con esos filtros.</div> :
      <div className="sales-product-grid">
        {visible.slice(0, 100).map((item) => {
          const service = item.kind === 'SERVICIO'
          const available = service || !locationId ? 0 : balances.get(stockKey(locationId, item.id)) ?? 0
          const selected = selectedMilli.get(item.id) ?? 0
          const noLocation = !service && !locationId
          const outOfStock = !service && !noLocation && available - selected < 1000
          const atLimit = !selectedIds.has(item.id) && selectedIds.size >= 30
          return <article key={item.id} className={'sales-product-card' + (outOfStock ? ' is-out' : '')}>
            <div className="sales-product-card-top">
              <DemoPhoto target={{ scope: 'catalog', businessId: business.id, entityId: item.id }} alt={'Imagen de ' + item.name}
                fallback={<Icon name={service ? 'briefcase' : 'package'} size={23}/>} className="sales-product-photo feature-icon blue"/>
              <span className="sales-product-category">{item.category}</span>
            </div>
            <strong className="sales-product-name">{item.name}</strong>
            <span className="sales-product-sku">{item.sku ? 'SKU: ' + item.sku : 'Sin SKU'}</span>
            <span className={'sales-product-stock' + (outOfStock ? ' is-out' : '')}>
              {service ? 'Servicio · sin stock físico' : noLocation ? 'Elegí una ubicación para consultar stock' :
                outOfStock ? 'Sin stock disponible' : quantityText(available - selected, item.unit) + ' disponibles'}
            </span>
            <div className="sales-product-footer">
              <strong>{moneyDisplay(item.priceCents)}</strong>
              <button type="button" className="button button-primary" disabled={noLocation || outOfStock || atLimit}
                onClick={() => onAdd(item.id)}>
                <Icon name="plus" size={15}/>
                {selected > 0 ? 'Agregar otro' : 'Agregar'}
              </button>
            </div>
            {selected > 0 && <small className="sales-product-selected">En el carrito: {quantityText(selected, item.unit)}</small>}
          </article>
        })}
      </div>}
    {visible.length > 100 && <p className="inventory-limit">Mostrando 100 resultados. Usá los filtros para encontrar otros artículos.</p>}
    <p className="sales-picker-footnote">La disponibilidad es orientativa durante la selección. Las existencias se vuelven a comprobar al confirmar la venta.</p>
  </section>
}

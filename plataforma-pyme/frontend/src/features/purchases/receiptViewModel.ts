import { milliToDecimal } from './realSupplyGateway.ts'
import type { Purchase, PurchaseReceipt } from './realSupplyGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'

export type ReceiptViewer = { id:string; displayName:string }
export type ReceiptMovementLine = {
  id:string; description:string; unit:string; entered:string; balanceAfter:string|null
}
export type ReceiptDisplay = {
  receiptId:string; purchaseTitle:string; purchasedOn:string|null
  locationName:string; locationId:string; confirmedAt:string
  responsibleName:string; responsibleId:string; movementLines:ReceiptMovementLine[]
}

/** Read-only view of the backend receipt. Use purchase snapshots, not current catalog names. */
export function receiptDisplay(
  receipt:PurchaseReceipt,
  purchase:Purchase|null,
  locations:ReadonlyArray<Pick<LocationRecord,'id'|'name'>>,
  viewer:ReceiptViewer,
):ReceiptDisplay {
  if(purchase&&purchase.id!==receipt.purchase_id)throw new TypeError('Comprobante y compra no coinciden.')
  const location=locations.find(x=>x.id===receipt.location_id)
  const validDate=Date.parse(receipt.confirmed_at)
  const confirmedAt=Number.isFinite(validDate)
    ?new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(validDate))
    :'Fecha y hora no disponibles'
  return {
    receiptId:receipt.id,
    purchaseTitle:purchase?.reference||'Compra '+receipt.purchase_id.slice(0,8),
    purchasedOn:purchase?.purchased_on??null,
    locationName:location?.name??'Sede no disponible en el listado actual',
    locationId:receipt.location_id,
    confirmedAt,
    responsibleName:receipt.confirmed_by_id===viewer.id
      ?viewer.displayName||'Tu cuenta'
      :'Responsable identificado por ID',
    responsibleId:receipt.confirmed_by_id,
    movementLines:receipt.movements.map(m=>{
      const snapshot=purchase?.lines.find(l=>l.catalog_item_id===m.catalog_item_id)
      const balance=receipt.balances_after.find(x=>x.catalog_item_id===m.catalog_item_id)
      return {
        id:m.id,
        description:snapshot?.description_snapshot||'Artículo '+m.catalog_item_id.slice(0,8),
        unit:snapshot?.unit_snapshot||'unidades (según catálogo)',
        entered:milliToDecimal(m.delta_milli),
        balanceAfter:balance?milliToDecimal(balance.quantity_milli):null,
      }
    }),
  }
}

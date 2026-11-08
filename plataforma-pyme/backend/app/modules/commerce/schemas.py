from datetime import date
from typing import Annotated, Literal
from uuid import UUID
import re
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator

Cents = Annotated[int, Field(strict=True, ge=0, le=99_999_999_999)]
Quantity = Annotated[int, Field(strict=True, gt=0, lt=1_000_000_000)]
Count = Annotated[int, Field(strict=True, ge=0, lt=1_000_000_000)]
Unit = Literal['UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA','SERVICIO']
PaymentMethod = Literal['EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA','MERCADO_PAGO_DECLARADO']


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class CatalogInput(Input):
    name: str = Field(min_length=2, max_length=90)
    kind: Literal['ELABORADO','REVENTA','INSUMO','SERVICIO']
    category: str = Field(min_length=2, max_length=60)
    sku: str = Field(default='', max_length=32, pattern=r'^[A-Za-z0-9._-]*$')
    unit: Unit
    description: str = Field(default='', max_length=450)
    observations: str = Field(default='', max_length=600)
    sellable: StrictBool
    priceCents: Cents | None = None
    referenceCostCents: Cents | None = None

    @model_validator(mode='after')
    def service_unit(self):
        if (self.kind == 'SERVICIO') != (self.unit == 'SERVICIO'):
            raise ValueError('Un servicio usa unidad Servicio; un bien usa una unidad física')
        self.sku = self.sku.upper()
        return self


class Promotion(Input):
    id: str = Field(max_length=100)
    days: list[Annotated[int, Field(strict=True, ge=0, le=6)]] = Field(max_length=7)
    paymentMethod: str = Field(max_length=30)
    benefit: str = Field(max_length=180)


class SupplierInput(Input):
    name: str = Field(min_length=2, max_length=90)
    offerings: str = Field(default='', max_length=240)
    contactPerson: str = Field(default='', max_length=100)
    phone: str = Field(default='', max_length=35)
    whatsapp: str = Field(default='', max_length=35)
    email: str = Field(default='', max_length=120)
    address: str = Field(default='', max_length=160)
    mapsUrl: str = Field(default='', max_length=2048)
    website: str = Field(default='', max_length=2048)
    instagram: str = Field(default='', max_length=31)
    paymentMethods: list[Literal['EFECTIVO','TRANSFERENCIA','MERCADO_PAGO','CUENTA_DNI','TARJETA','CHEQUE','CUENTA_CORRIENTE']] = Field(default_factory=list, max_length=7)
    promotions: list[Promotion] = Field(default_factory=list, max_length=20)
    notes: str = Field(default='', max_length=650)

    @field_validator('mapsUrl','website')
    @classmethod
    def safe_link(cls, value):
        if not value:
            return value
        url = urlsplit(value)
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            raise ValueError('El enlace debe usar HTTPS sin credenciales')
        return value


class LocationInput(Input):
    name: str = Field(min_length=2, max_length=90)
    kind: Literal['LOCAL','FERIA','DEPOSITO','OFICINA','OTRO']
    address: str = Field(default='', max_length=160)
    mapUrl: str = Field(default='', max_length=2048)
    canSell: StrictBool
    canStore: StrictBool

    _safe_map = field_validator('mapUrl')(SupplierInput.safe_link.__func__)


class StatusInput(Input):
    status: Literal['ACTIVO','INACTIVO','ACTIVA','INACTIVA','PAUSADA']


class FinancialAccountInput(Input):
    label: str = Field(min_length=2, max_length=80)
    kind: Literal['BANCARIA','BILLETERA']
    channel: Literal['TRANSFERENCIA','MERCADO_PAGO_DECLARADO','CUENTA_DNI','OTRO_DECLARADO']
    institution: str = Field(min_length=2, max_length=80)
    holder: str = Field(default='', max_length=90)
    alias: str = Field(default='', max_length=20)
    identifier: str = Field(default='', max_length=22)
    notes: str = Field(default='', max_length=350)

    @model_validator(mode='after')
    def account_format(self):
        self.alias = self.alias.lower()
        if self.kind == 'BANCARIA' and self.channel != 'TRANSFERENCIA':
            raise ValueError('Una cuenta bancaria usa el canal Transferencia')
        if self.alias and not re.fullmatch(r'[a-z0-9][a-z0-9.-]{4,18}[a-z0-9]', self.alias):
            raise ValueError('Alias inválido')
        if self.identifier and not re.fullmatch(r'[0-9]{22}', self.identifier):
            raise ValueError('CBU/CVU debe contener 22 dígitos')
        if not self.alias and not self.identifier:
            raise ValueError('Ingresá alias o CBU/CVU')
        return self


class PurchaseLine(Input):
    catalogItemId: UUID | None
    description: str = Field(min_length=2, max_length=140)
    unit: Unit | Literal['CONCEPTO']
    quantityMilli: Quantity
    unitCostCents: Cents


class PurchaseInput(Input):
    purchasedOn: date
    supplierId: UUID | None
    reference: str = Field(default='', max_length=70)
    notes: str = Field(default='', max_length=500)
    lines: list[PurchaseLine] = Field(min_length=1, max_length=30)

    @field_validator('purchasedOn')
    @classmethod
    def valid_date(cls, value):
        if not 2000 <= value.year <= 2100:
            raise ValueError('Año fuera de rango')
        return value


class ReceiptInput(Input):
    locationId: UUID


class CountLine(Input):
    catalogItemId: UUID
    expectedMilli: Count
    countedMilli: Count
    expectedVersion: Annotated[int, Field(strict=True, ge=0)]


class CountInput(Input):
    locationId: UUID
    lines: list[CountLine] = Field(min_length=1, max_length=200)
    reason: str = Field(min_length=5, max_length=180)


class TransferInput(Input):
    catalogItemId: UUID
    sourceLocationId: UUID
    destinationLocationId: UUID
    quantityMilli: Quantity
    reason: str = Field(min_length=5, max_length=180)


class SaleLine(Input):
    catalogItemId: UUID
    quantityMilli: Quantity
    unitPriceCents: Cents


class Payment(Input):
    method: PaymentMethod
    amountCents: Annotated[int, Field(strict=True, gt=0, le=99_999_999_999)]
    financialAccountId: UUID | None = None
    financialAccountLabelSnapshot: str | None = Field(default=None, max_length=80)


class SaleInput(Input):
    locationId: UUID | None
    lines: list[SaleLine] = Field(min_length=1, max_length=30)
    discountCents: Cents
    payments: list[Payment] = Field(min_length=1, max_length=6)
    notes: str = Field(default='', max_length=500)


class ExpenseInput(Input):
    paidOn: date
    locationId: UUID | None
    category: Literal['ALQUILER','INSUMOS','TRANSPORTE','PERSONAL','IMPUESTOS','MANTENIMIENTO','OTROS']
    description: str = Field(min_length=2, max_length=140)
    amountCents: Annotated[int, Field(strict=True, gt=0, le=99_999_999_999)]
    paymentMethod: PaymentMethod | Literal['OTRO_DECLARADO']
    financialAccountId: UUID | None = None
    financialAccountLabelSnapshot: str | None = Field(default=None, max_length=80)
    notes: str = Field(default='', max_length=500)

    _date_range = field_validator('paidOn')(PurchaseInput.valid_date.__func__)


class CashOpen(Input):
    locationId: UUID | None
    openingCashCents: Cents


class CashClose(Input):
    countedCashCents: Cents
    notes: str = Field(default='', max_length=500)


class BusinessPatch(Input):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=350)
    slogan: str | None = Field(default=None, max_length=100)
    taxId: str | None = Field(default=None, max_length=30)

    @model_validator(mode='after')
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError('Informá al menos un campo válido, sin null')
        return self


class ProfileInput(Input):
    displayName: str = Field(min_length=2, max_length=70)
    email: str = Field(max_length=254)
    avatarInitials: str = Field(default='', max_length=4, pattern=r'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]*$')
    contactPhone: str = Field(default='', max_length=30, pattern=r'^[+()\d\s.\-]*$')


class JobTitleInput(Input):
    jobTitle: str = Field(max_length=90)

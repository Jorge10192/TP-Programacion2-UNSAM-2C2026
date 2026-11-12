"""Todos los modelos reales: registro explícito para metadatos Alembic."""
from app.infrastructure.models.photo_asset import PhotoAsset
from app.infrastructure.models.payment_connection import MerchantPaymentConnection
from app.infrastructure.models.user import User
from app.infrastructure.models.auth_session import AuthSession
from app.infrastructure.models.business import Business
from app.infrastructure.models.membership import Membership
from app.infrastructure.models.business_creation_request import BusinessCreationRequest
from app.infrastructure.models.business_invitation import BusinessInvitation
from app.infrastructure.models.location import Location
from app.infrastructure.models.location_assignment import LocationAssignment
from app.infrastructure.models.catalog_item import CatalogItem
from app.infrastructure.models.supplier import Supplier
from app.infrastructure.models.purchase import Purchase
from app.infrastructure.models.purchase_line import PurchaseLine
from app.infrastructure.models.purchase_receipt import PurchaseReceipt
from app.infrastructure.models.stock_balance import StockBalance
from app.infrastructure.models.stock_movement import StockMovement
from app.infrastructure.models.inventory_operation import InventoryOperation
from app.infrastructure.models.sale import Sale
from app.infrastructure.models.sale_line import SaleLine
from app.infrastructure.models.sale_payment import SalePayment

__all__ = ["MerchantPaymentConnection", "PhotoAsset", "User", "AuthSession", "Business", "Membership", "BusinessCreationRequest", "BusinessInvitation", "Location", "LocationAssignment", "CatalogItem", "Supplier", "Purchase", "PurchaseLine", "PurchaseReceipt", "StockBalance", "StockMovement", "InventoryOperation", "Sale", "SaleLine", "SalePayment"]

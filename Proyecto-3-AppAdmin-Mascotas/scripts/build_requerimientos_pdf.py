"""Build the short WALOS requirements handout from the validated draft.

Run with the bundled Python runtime or any Python with reportlab installed.
The editable specification is docs/requerimientos.md.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "WALOS_Requerimientos.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

font_pairs = [
    (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
    (Path("/System/Library/Fonts/Supplemental/Arial.ttf"), Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")),
    (Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"), Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf")),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
]
available_fonts = next(((normal, bold) for normal, bold in font_pairs if normal.is_file() and bold.is_file()), None)
if available_fonts is None:
    raise RuntimeError("Install Arial, Liberation Sans or DejaVu Sans to build the PDF")
pdfmetrics.registerFont(TTFont("Arial", str(available_fonts[0])))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(available_fonts[1])))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")

INK = colors.HexColor("#20302C")
MUTED = colors.HexColor("#5D6C66")
GREEN = colors.HexColor("#537363")
PALE = colors.HexColor("#EEF3EF")
LINE = colors.HexColor("#DCE5DE")

title = ParagraphStyle(
    "title", fontName="Arial-Bold", fontSize=22, leading=27,
    textColor=INK, spaceAfter=5 * mm,
)
page_title = ParagraphStyle(
    "page_title", fontName="Arial-Bold", fontSize=16, leading=21,
    textColor=INK, spaceAfter=5 * mm,
)
heading = ParagraphStyle(
    "heading", fontName="Arial-Bold", fontSize=10.5, leading=14,
    textColor=GREEN, spaceBefore=4 * mm, spaceAfter=2 * mm,
)
body = ParagraphStyle(
    "body", fontName="Arial", fontSize=9.7, leading=14.2,
    textColor=INK, alignment=TA_LEFT, spaceAfter=2.5 * mm,
)
small = ParagraphStyle(
    "small", parent=body, fontSize=8.8, leading=12.5,
    spaceAfter=1.8 * mm,
)
muted = ParagraphStyle(
    "muted", parent=small, textColor=MUTED,
)
label = ParagraphStyle(
    "label", parent=small, fontName="Arial-Bold", textColor=GREEN,
)


def p(text, style=body):
    return Paragraph(text, style)


def bullet(text):
    return p("•  " + text, body)


def rule_rows(rows, code_width=17 * mm):
    data = [[p(code, label), p(description, small)] for code, description in rows]
    table = Table(data, colWidths=[code_width, 159 * mm - code_width], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE),
    ]))
    return table


def box(text):
    table = Table([[p(text, small)]], colWidths=[159 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(25 * mm, 18 * mm, width - 25 * mm, 18 * mm)
    canvas.setFont("Arial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(25 * mm, 13 * mm, "WALOS  ·  Requerimientos para validar")
    canvas.drawRightString(width - 25 * mm, 13 * mm, str(doc.page))
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUTPUT), pagesize=A4,
    leftMargin=25 * mm, rightMargin=25 * mm,
    topMargin=23 * mm, bottomMargin=23 * mm,
    title="WALOS - Requerimientos",
    author="Equipo de proyecto WALOS",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height,
              leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=footer))

story = []

# 1. Overview
story += [
    p("WALOS", title),
    p("Requerimientos de la aplicación", page_title),
    p("Compras, producción y ventas en una sola aplicación sencilla para la panadería para mascotas."),
    p("Qué necesita resolver", heading),
    p("WALOS compra insumos, elabora por lotes y vende a clientes y comercios. Parte del seguimiento actual se hace en Excel; Instagram es un canal importante de llegada de clientes. El equipo necesita conocer stock, ventas, devoluciones y dinero verificado sin duplicar registros."),
    p("Recorrido central", heading),
    box("<b>Insumos</b> → compra y recepción  ·  <b>Producción</b> → consumo y lote  ·  <b>Inventario</b> → ubicación y vencimiento  ·  <b>Venta</b> → pedido, cobro y entrega"),
    Spacer(1, 4 * mm),
    p("Dos formas de vender", heading),
    bullet("<b>Cliente final:</b> llega desde Instagram, consulta el catálogo, arma un carrito, obtiene una promoción automática y confirma con seña o pago total."),
    bullet("<b>Comercio:</b> WALOS distingue venta mayorista de consignación y registra lo enviado, vendido, devuelto y pendiente."),
    p("Personas que usarán la aplicación", heading),
    p("El administrador gestiona dinero y permisos; el operador registra tareas autorizadas; el cliente compra y ve solo sus propios pedidos. La primera versión no incluye un portal para comercios."),
    p("Fuera de esta versión", heading),
    p("Contabilidad fiscal, transferencias automáticas, mensajes de Instagram, app nativa, predicción con IA y promociones combinadas."),
    p("Conservación por validar", heading),
    p("Las notas mencionan unas dos semanas; el envase fotografiado indica 6–7 días en heladera y hasta dos meses en freezer. WALOS debe definir la vida útil por producto y conservación."),
    PageBreak(),
]

# 2. Internal operations
story += [p("Gestión interna", page_title)]
story += [p("Cada unidad conserva su origen, ubicación y resultado comercial.")]
story += [rule_rows([
    ("RF01", "Accesos: registrar clientes y autenticar por rol; solo el administrador habilita operadores. Cada cliente ve sus pedidos."),
    ("RF02", "Catálogos: insumos, productos, proveedores, ubicaciones y recetas versionadas; definir equivalencias de unidades."),
    ("RF03", "Compras: proveedor, cantidad, unidad, costo, fecha, lote y vencimiento cuando corresponda. Stock al recibir, no al pagar."),
    ("RF04", "Producción: registrar consumo y rendimiento reales; descontar insumos y crear lote juntos. Rechazar insumos vencidos o insuficientes."),
    ("RF05", "Inventario: separar stock físico, reservado y disponible por lote, ubicación y condición; guardar responsable y motivo."),
    ("RF06", "Distribución: registrar origen, destino, lote, cantidad y modalidad. Consignar no es vender ni reinicia vencimiento."),
    ("RF07", "Rendiciones: vincular cada envío con ventas, devoluciones, mermas y pendientes. Aprobar devoluciones antes de revender."),
    ("RF08", "Ventas: registrar minoristas y mayoristas con precio histórico y lotes entregados. Descontar stock una sola vez."),
    ])]
story += [
    Spacer(1, 5 * mm),
    box("<b>Rendición:</b> 10 cajas enviadas = 6 vendidas + 3 devueltas + 1 pendiente. Las devoluciones quedan en revisión; una diferencia no se registra como venta."),
    PageBreak(),
]

# 3. Sales and cart
story += [p("Tienda, dinero y promociones", page_title)]
story += [rule_rows([
    ("RF09", "Pedidos: fecha de retiro y reserva temporal. Confirmar al verificar seña o total; liberar impagos vencidos y revisar pagos tardíos."),
    ("RF10", "Dinero: cobros, señas, saldos, pagos a proveedores y reintegros. Pago externo; solo lo verificado se acredita."),
    ("RF11", "Alertas: vencimientos y stock bajo al abrir el panel y diariamente; priorizar lotes aptos que venzan antes."),
    ("RF12", "Resumen: pedidos, ventas, cobros, existencias y mermas; CSV que distinga ventas de cobros y stock propio de consignado."),
    ("RF13", "Carrito: cambiar cantidades y mostrar subtotal, descuento, ahorro, total, seña y saldo. Agregar no reserva."),
    ("RF14", "Promociones: porcentaje o 3x2 por producto o lote, fechas, canal y cupo; aplicar una oferta de menor total."),
    ])]
story += [
    p("Reglas del carrito", heading),
    bullet("Al confirmar se revalidan fecha de retiro, stock apto, precio, oferta y cupo. Se reservan unidades y beneficio, sin salida física."),
    bullet("El precio aceptado se conserva durante la reserva. Si cambian las condiciones antes de confirmar, se pide nueva aceptación."),
    bullet("Un 3x2 reserva y entrega tres unidades del mismo producto y presentación aunque cobre dos; la seña se calcula después del descuento."),
    bullet("Una oferta por lote muestra su vencimiento y termina al agotar sus unidades elegibles. Los avisos no crean descuentos."),
    Spacer(1, 3 * mm),
    box("<b>Pagos por definir:</b> el PDF adjunto propone pago externo y verificación manual. Confirmar si WALOS requiere integración directa con Mercado Pago o Cuenta DNI en esta versión."),
    PageBreak(),
]

# 4. Stories and use case
story += [p("Historias y validación", page_title)]
story += [
    p("HU02  ·  Producir por lote", heading),
    p("Como productor/a, quiero registrar insumos usados y paquetes obtenidos para rastrear cada elaboración.", small),
    p("<b>Aceptación:</b> ambos inventarios cambian juntos; ante un error no quedan registros parciales.", muted),
    p("HU03  ·  Rendir una entrega", heading),
    p("Como responsable de distribución, quiero conocer lo vendido, devuelto y pendiente en cada punto.", small),
    p("<b>Aceptación:</b> 10 cajas = 6 vendidas + 3 devueltas + 1 pendiente. Devoluciones en revisión.", muted),
    p("HU04  ·  Priorizar vencimientos", heading),
    p("Como responsable, quiero ver lotes próximos a vencer para decidir qué vender primero.", small),
    p("<b>Aceptación:</b> el aviso aparece aun sin movimientos y no activa descuentos por sí solo.", muted),
    p("HU07  ·  Comprar con promociones", heading),
    p("Como cliente, quiero ver la oferta válida más conveniente y el precio final.", small),
    p("<b>Aceptación:</b> el 3x2 se aplica con tres unidades y desaparece al bajar a dos.", muted),
    p("Caso de uso  ·  Confirmar carrito", heading),
    p("Cliente autenticado con productos y fecha de retiro. Revisa cantidades, oferta y total; confirma; el sistema revalida y reserva lotes y cupo. Recibe el pedido, el plazo y el pago requerido.", small),
    p("Si cambian condiciones, se pide nueva aceptación. Reintentar no duplica el pedido. Queda pendiente de pago, sin salida física.", muted),
    PageBreak(),
]

# 5. Quality and unresolved points
story += [p("Calidad y entrega", page_title)]
story += [p("Metas propuestas para validar con WALOS.")]
story += [rule_rows([
    ("RNF01", "Uso sencillo: tras 15 minutos de explicación, dos usuarios completan recepción, producción y devolución sin ayuda en hasta 3 minutos por tarea."),
    ("RNF02", "Interfaz en español para celular y computadora desde 360 px; errores junto al campo y total visible antes de confirmar."),
    ("RNF03", "Seguridad: contraseñas con hash, permisos, HTTPS y secretos fuera del repositorio; sin tarjetas ni credenciales bancarias guardadas."),
    ("RNF04", "Integridad: impedir stock negativo, duplicados, reservas simultáneas de última unidad y cupos excedidos; corregir con ajustes."),
    ("RNF05", "Respuesta: 95 % de consultas en hasta 2 segundos con 10 usuarios, 100 productos y 10.000 movimientos, sin esperas de terceros."),
    ("RNF06", "Respaldo diario por 7 días y restauración probada; reiniciar no pierde operaciones confirmadas."),
    ])]
story += [
    p("Pendiente de acordar", heading),
    p("Equivalencias y recetas; reglas de devolución; seña, plazo de reserva y reintegros; promociones y canales. Conciliar el stock inicial desde Excel y confirmar la fecha de entrega.", small),
    p("Entrega académica", heading),
    p("La consigna solicita FastAPI, SQLAlchemy, autenticación, Docker, despliegue, 10 pruebas unitarias, GitHub Actions, un patrón útil, documentación, README y una presentación con UML. La implementación queda fuera de este documento.", small),
]

doc.build(story)
print(OUTPUT)

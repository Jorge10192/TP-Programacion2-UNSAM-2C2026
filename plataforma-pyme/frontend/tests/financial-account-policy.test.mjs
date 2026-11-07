import test from 'node:test'
import assert from 'node:assert/strict'
import {
  blankFinancialAccount, normalizeFinancialAccountInput,
  financialAccountKey, financialAccountShareText,
  maskedAccountIdentifier, financialChannelLabels, accountSupportsDeclaredPayment,
} from '../src/data/demo/financialAccountPolicy.ts'

const bank = {
  ...blankFinancialAccount, label: ' Banco de prueba ',
  kind: 'BANCARIA', channel: 'TRANSFERENCIA', institution: ' Banco Ejemplo ',
  holder: 'Titular Ficticio', alias: ' Mi.Caja.Demo ',
  identifier: '0000000000000000000123', notes: '',
}
const wallet = {
  ...bank, kind: 'BILLETERA', channel: 'MERCADO_PAGO_DECLARADO',
  institution: 'Billetera DEMO', alias: 'wallet.demo', identifier: '',
}

test('normaliza identificadores y textos de una cuenta bancaria DEMO', () => {
  const fields = normalizeFinancialAccountInput(bank)
  assert.equal(fields.label, 'Banco de prueba')
  assert.equal(fields.institution, 'Banco Ejemplo')
  assert.equal(fields.alias, 'mi.caja.demo')
  assert.equal(fields.identifier, '0000000000000000000123')
  assert.equal(fields.kind, 'BANCARIA')
})

test('billetera sin CVU puede usar sólo alias ficticio', () => {
  const fields = normalizeFinancialAccountInput(wallet)
  assert.equal(fields.identifier, '')
  assert.equal(fields.channel, 'MERCADO_PAGO_DECLARADO')
  assert.equal(fields.alias, 'wallet.demo')
})

test('no permite registrar cuentas sin alias ni CBU/CVU de referencia', () => {
  assert.throws(() => normalizeFinancialAccountInput({
    ...bank, alias: '', identifier: '',
  }), /alias o un CBU/)
})

test('el canal de una cuenta bancaria es sólo transferencia declarada', () => {
  assert.throws(() => normalizeFinancialAccountInput({
    ...bank, channel: 'MERCADO_PAGO_DECLARADO',
  }), /bancaria DEMO usa Transferencia/)
})

test('rechaza alias demasiado corto, con espacios internos o caracteres inseguros', () => {
  for (const alias of ['abc', 'a bc.def', 'bad<script>', 'a'.repeat(21), '-empezar.demo']) {
    assert.throws(() => normalizeFinancialAccountInput({ ...bank, alias }), /alias|Alias/)
  }
})

test('valida 22 dígitos del CBU/CVU sólo por sintaxis, no por acreditación real', () => {
  for (const identifier of ['123456789', 'ab'.repeat(11), '0'.repeat(23)]) {
    assert.throws(() => normalizeFinancialAccountInput({ ...bank, identifier }), /22 dígitos|CBU/)
  }
  assert.equal(normalizeFinancialAccountInput({
    ...wallet, identifier: '0'.repeat(22),
  }).identifier.length, 22)
})

test('rechaza tipo y medio arbitrarios', () => {
  assert.throws(() => normalizeFinancialAccountInput({ ...bank, kind: 'CRIPTOMONEDA' }), /tipo/)
  assert.throws(() => normalizeFinancialAccountInput({ ...bank, channel: 'EFECTIVO' }), /medio/)
  assert.ok(!Object.hasOwn(financialChannelLabels, 'EFECTIVO'))
})

test('bloquea texto excesivo o saltos de línea en nombre, alias e institución', () => {
  assert.throws(() => normalizeFinancialAccountInput({ ...bank, label: 'x'.repeat(81) }), /80/)
  assert.throws(() => normalizeFinancialAccountInput({ ...bank, institution: 'Banco\nTexto' }), /control/)
  assert.throws(() => normalizeFinancialAccountInput({ ...bank, notes: 'x'.repeat(351) }), /350/)
})

test('en lista se oculta el CBU/CVU salvo sus últimos cuatro caracteres', () => {
  assert.equal(maskedAccountIdentifier('0000000000000000000123').endsWith('0123'), true)
  assert.equal(maskedAccountIdentifier(''), 'No informado')
  assert.ok(!maskedAccountIdentifier('0000000000000000000123').includes('0000000000000000000123'))
})

test('la copia voluntaria distingue CBU bancario de CVU de billetera', () => {
  const textBank = financialAccountShareText(bank)
  assert.match(textBank, /CBU: 0000000000000000000123/)
  assert.match(textBank, /Alias:  Mi.Caja.Demo /)
  const textWallet = financialAccountShareText({ ...wallet, identifier: '0'.repeat(22) })
  assert.match(textWallet, /CVU: 0000000000000000000000/)
  assert.doesNotMatch(textWallet, /CBU:/)
})

test('clave textual normaliza mayúsculas y espacios sin cambiar otra empresa', () => {
  assert.equal(financialAccountKey('  MIS COBROS  '), financialAccountKey('mis cobros'))
})

test('los tipos de cuenta no incorporan saldos, dinero ni secretos', () => {
  const fields = normalizeFinancialAccountInput(wallet)
  assert.equal('balanceCents' in fields, false)
  assert.equal('accessToken' in fields, false)
  assert.equal('password' in fields, false)
})

test('transferencias: admite bancos y billeteras activas con canal declarado', () => {
  const bank = { status: 'ACTIVA', channel: 'TRANSFERENCIA' }
  const walletMp = { status: 'ACTIVA', channel: 'MERCADO_PAGO_DECLARADO' }
  const walletDni = { status: 'ACTIVA', channel: 'CUENTA_DNI' }
  const walletOther = { status: 'ACTIVA', channel: 'OTRO_DECLARADO' }
  for (const account of [bank, walletMp, walletDni, walletOther]) {
    assert.equal(accountSupportsDeclaredPayment(account, 'TRANSFERENCIA'), true)
    assert.equal(accountSupportsDeclaredPayment({ ...account, status: 'INACTIVA' }, 'TRANSFERENCIA'), false)
  }
  assert.equal(accountSupportsDeclaredPayment({ status: 'ACTIVA', channel: 'INVALIDO' }, 'TRANSFERENCIA'), false)
})

test('Mercado Pago, Cuenta DNI y Otros conservan su canal específico', () => {
  const bank = { status: 'ACTIVA', channel: 'TRANSFERENCIA' }
  const walletMp = { status: 'ACTIVA', channel: 'MERCADO_PAGO_DECLARADO' }
  const walletDni = { status: 'ACTIVA', channel: 'CUENTA_DNI' }
  const walletOther = { status: 'ACTIVA', channel: 'OTRO_DECLARADO' }
  assert.equal(accountSupportsDeclaredPayment(walletMp, 'MERCADO_PAGO_DECLARADO'), true)
  assert.equal(accountSupportsDeclaredPayment(walletDni, 'CUENTA_DNI'), true)
  assert.equal(accountSupportsDeclaredPayment(walletOther, 'OTRO_DECLARADO'), true)
  for (const account of [bank, walletDni, walletOther]) {
    assert.equal(accountSupportsDeclaredPayment(account, 'MERCADO_PAGO_DECLARADO'), false)
  }
  assert.equal(accountSupportsDeclaredPayment(walletMp, 'CUENTA_DNI'), false)
  assert.equal(accountSupportsDeclaredPayment(bank, 'EFECTIVO'), false)
  assert.equal(accountSupportsDeclaredPayment(walletMp, 'TARJETA'), false)
})

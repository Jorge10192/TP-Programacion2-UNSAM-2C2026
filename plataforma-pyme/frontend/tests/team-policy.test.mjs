import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeInviteInput,
  displayInvitationStatus,
  canReplyToInvitation,
  invitationExpiresAt,
  INVITATION_VALIDITY_DAYS,
} from '../src/data/demo/teamPolicy.ts'

test('normaliza correo e identifica rol explícito por empresa', () => {
  assert.deepEqual(normalizeInviteInput('  Prueba@Ejemplo.Invalid ', 'TRABAJADOR'), {
    email: 'prueba@ejemplo.invalid',
    role: 'TRABAJADOR',
  })
  assert.equal(normalizeInviteInput('encargado@ejemplo.invalid', 'ENCARGADO').role, 'ENCARGADO')
})

test('rechaza roles no asignables e emails inválidos', () => {
  for (const role of ['PROPIETARIO', 'TITULAR_ADMINISTRATIVO', 'ADMIN', '']) {
    assert.throws(() => normalizeInviteInput('prueba@ejemplo.invalid', role))
  }
  for (const email of ['sin-arroba', 'invalido@', '', '   ', 'a@b', 'a@ejemplo.invalid\nBcc:x']) {
    assert.throws(() => normalizeInviteInput(email, 'TRABAJADOR'))
  }
})

test('vigencia de siete días sin aceptación automática', () => {
  const created = '2026-11-01T00:00:00.000Z'
  const expiration = invitationExpiresAt(created)
  assert.equal(INVITATION_VALIDITY_DAYS, 7)
  assert.equal(expiration, '2026-11-08T00:00:00.000Z')
  const invitation = { status: 'PENDIENTE', expiresAt: expiration }
  assert.equal(displayInvitationStatus(invitation, Date.parse('2026-11-07T23:59:59.000Z')), 'PENDIENTE')
  assert.equal(canReplyToInvitation(invitation, Date.parse('2026-11-08T00:00:00.000Z')), false)
  assert.equal(displayInvitationStatus(invitation, Date.parse('2026-11-08T00:00:00.000Z')), 'EXPIRADA')
})

test('una invitación aceptada, rechazada o cancelada no vuelve a estar pendiente', () => {
  for (const status of ['ACEPTADA', 'RECHAZADA', 'CANCELADA']) {
    const invitation = { status, expiresAt: '2099-01-01T00:00:00Z' }
    assert.equal(displayInvitationStatus(invitation), status)
    assert.equal(canReplyToInvitation(invitation), false)
  }
})

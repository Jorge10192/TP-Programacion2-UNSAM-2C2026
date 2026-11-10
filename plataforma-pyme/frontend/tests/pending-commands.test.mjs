import test from 'node:test'
import assert from 'node:assert/strict'
import {
  makeBusinessIntentJournal, parseBusinessIntent, intentIsOld,
  JournalConflictError, JournalUnavailableError,
} from '../src/features/pending/businessIntentJournal.ts'

const actorA='a49e944c-e8f9-4794-b2c1-8c5524c1bbd6'
const actorB='6c52a113-f9d1-4aac-9db5-5c45fc49ba72'
const keyA='14401a24-37b6-47db-8986-8a048edc005a'
const keyB='3eacc3a3-47d7-4754-820a-907bcf7db90d'
const body={name:'Empresa TEST',category:'Comercio',activity_kind:'PRODUCTOS'}

function fakePort() {
  const saved = new Map()
  let requests = 0
  const port = {
    async read(actorId) { requests++; return structuredClone(saved.get(actorId)) },
    async reserve(record) {
      requests++
      const existing=saved.get(record.actorId)
      if (existing && (existing.key!==record.key || JSON.stringify(existing.body)!==JSON.stringify(record.body))) throw new JournalConflictError()
      if (!existing) saved.set(record.actorId, structuredClone(record))
    },
    async remove(actorId,key) {
      requests++
      const existing=saved.get(actorId)
      if (existing && existing.key!==key) throw new JournalConflictError()
      saved.delete(actorId)
    },
  }
  return {port,saved,getRequests:()=>requests}
}
test('reserva y recupera la misma clave y cuerpo tras recrear el coordinador (F5)',async()=>{
  const {port}=fakePort()
  const first=makeBusinessIntentJournal(port)
  const record=await first.reserve(actorA,body,keyA)
  assert.equal(record.actorId,actorA)
  assert.equal(record.kind,'business.create')
  assert.equal(record.key,keyA)
  assert.deepEqual(record.body,body)
  const second=makeBusinessIntentJournal(port)
  const restored=await second.load(actorA)
  assert.deepEqual(restored,record)
})

test('actor B no recibe la intención del actor A, incluso en el mismo navegador',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  assert.equal(await j.load(actorB),null)
  assert.equal((await j.load(actorA)).key,keyA)
})

test('un cuerpo modificado con la misma clave no puede sobrescribir el original',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  await assert.rejects(j.reserve(actorA,{...body,name:'Otro'},keyA),JournalConflictError)
  assert.deepEqual((await j.load(actorA)).body,body)
})

test('una segunda clave para el mismo actor se rechaza mientras exista pendiente',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  await assert.rejects(j.reserve(actorA,body,keyB),JournalConflictError)
  assert.equal((await j.load(actorA)).key,keyA)
})

test('reintento con misma clave y cuerpo lee el registro original sin alterarlo',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  const original=await j.reserve(actorA,body,keyA)
  const again=await j.reserve(actorA,body,keyA)
  assert.deepEqual(again,original)
})

test('el borrado exige actor y clave original, sin afectar a otro usuario',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  await j.reserve(actorB,body,keyB)
  await assert.rejects(j.discard(actorA,keyB),JournalConflictError)
  assert.ok(await j.load(actorA))
  await j.discard(actorA,keyA)
  assert.equal(await j.load(actorA),null)
  assert.equal((await j.load(actorB)).key,keyB)
})

test('una caída del almacenamiento impide confirmar una reserva',async()=>{
  const j=makeBusinessIntentJournal({
    async read() { throw new JournalUnavailableError() },
    async reserve() { throw new JournalUnavailableError() },
    async remove() { throw new JournalUnavailableError() },
  })
  await assert.rejects(j.reserve(actorA,body,keyA),JournalUnavailableError)
  await assert.rejects(j.load(actorA),JournalUnavailableError)
})

test('el registro corrupto nunca se reemplaza silenciosamente',async()=>{
  const {port,saved}=fakePort()
  const j=makeBusinessIntentJournal(port)
  saved.set(actorA,{actorId:actorA,kind:'business.create',key:keyA,body:{name:'X'},createdAt:'fake'})
  await assert.rejects(j.load(actorA),JournalConflictError)
  await assert.rejects(j.reserve(actorA,body,keyA),JournalConflictError)
})

test('datos secretos o campos adicionales hacen inválido el registro durable',()=>{
  const record={actorId:actorA,kind:'business.create',key:keyA,body,createdAt:'2026-11-09T00:00:00Z'}
  assert.equal(parseBusinessIntent(record,actorA).key,keyA)
  assert.throws(()=>parseBusinessIntent({...record,access_token:'token'},actorA),JournalConflictError)
  assert.throws(()=>parseBusinessIntent({...record,body:{...body,password:'123'}},actorA),JournalConflictError)
  assert.throws(()=>parseBusinessIntent({...record,actorId:actorB},actorA),JournalConflictError)
})

test('idempotency key no UUID4 y actor no UUID impiden reservar',async()=>{
  const {port}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await assert.rejects(j.reserve(actorA,body,'14401a24-37b6-17db-8986-8a048edc005a'),TypeError)
  await assert.rejects(j.reserve('walos-demo',body,keyA),TypeError)
})

test('antigüedad de 30 días solo advierte: nunca borra registros pendientes',async()=>{
  const {port,saved}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  saved.get(actorA).createdAt='2026-01-01T00:00:00Z'
  const restored=await j.load(actorA)
  assert.equal(intentIsOld(restored),true)
  assert.ok(await j.load(actorA))
})

test('la reserva nunca ejecuta una solicitud de red por su cuenta',async()=>{
  const {port,getRequests}=fakePort()
  const j=makeBusinessIntentJournal(port)
  await j.reserve(actorA,body,keyA)
  await j.load(actorA)
  assert.ok(getRequests()>0)
  assert.deepEqual(Object.keys(port).sort(),['read','remove','reserve'])
})

import { adminSelect, adminInsert, adminUpdate } from '../../services/admin-api.js';

export function getMembers() {
  return adminSelect(
    'socios?select=id,nombre,apellidos,dni,alias,telefono,email,fecha_alta,fecha_baja&order=alias.asc'
  );
}

export function createMember(payload) {
  return adminInsert('socios', payload);
}

export function updateMember(id, payload) {
  return adminUpdate(`socios?id=eq.${encodeURIComponent(id)}`, payload);
}

export function deactivateMember(id, date) {
  return updateMember(id, { fecha_baja: date });
}

export function reactivateMember(id) {
  return updateMember(id, { fecha_baja: null });
}

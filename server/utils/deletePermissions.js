/**
 * Centralized soft-delete permission policy (single source of truth).
 *
 * Enforced on the BACKEND. The frontend may hide delete buttons for UX, but
 * authorization MUST be checked here — never trust the client.
 *
 * Policy:
 *  - Sensitive entities (employees, client cards): senior roles only
 *    (General Director, Owner, Manager, OKK).
 *  - Financial records (income, payments, cash register): Director/Owner only
 *    (accounting integrity — prevents juniors from wiping the books).
 *  - Everything else: any active operational role. Soft delete => reversible.
 */

const SENIOR = ['director', 'owner', 'manager', 'okk'];
const DIRECTOR_ONLY = ['director', 'owner'];
const DEFAULT_DELETE_ROLES = [
  'director', 'owner', 'admin', 'administrator',
  'manager', 'okk', 'cc_manager', 'lawyer', 'operator',
];

// Per-entity overrides. Keys are logical entity names used by controllers.
const ENTITY_POLICY = {
  employees: SENIOR,
  clients: SENIOR,
  income: DIRECTOR_ONLY,
  payments: DIRECTOR_ONLY,
  cash_register: DIRECTOR_ONLY,
};

function rolesFor(entity) {
  return ENTITY_POLICY[entity] || DEFAULT_DELETE_ROLES;
}

function canDelete(entity, role) {
  if (!role) return false;
  return rolesFor(entity).includes(String(role).toLowerCase());
}

module.exports = { canDelete, rolesFor, SENIOR, DIRECTOR_ONLY, DEFAULT_DELETE_ROLES, ENTITY_POLICY };

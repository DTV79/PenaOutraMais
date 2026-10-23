import { requireAdmin } from '../services/auth.js';
import { mountAdminShell } from '../ui/shell.js?v=20261024-1';

export async function bootstrapAdmin() {
  const context = await requireAdmin();
  if (!context) return null;

  mountAdminShell(context.admin);
  return context;
}

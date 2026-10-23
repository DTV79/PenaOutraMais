import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const LEGACY_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
let secretKeys: Record<string, string> = {};
try {
  secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
} catch {
  secretKeys = {};
}
const SERVICE_KEY = secretKeys.default || LEGACY_SERVICE_KEY;

const DOCUMENT_BUCKET = "documentos-publicos";
const STATUTES_PATH = "estatutos/estatutos-vigentes.pdf";
const MAX_PDF_BYTES = 10 * 1024 * 1024;

const BACKUP_TABLES = [
  "administradores",
  "apuestas",
  "combinaciones",
  "juegos",
  "jugadas_fijas",
  "movimientos_bote",
  "movimientos_cuotas",
  "programacion_juegos",
  "resumen_anual",
  "resumen_cuotas_publico",
  "socios",
  "sorteos",
  "temporadas"
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json;charset=utf-8" }
  });
}

function getServiceClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Backend de Supabase no configurado.");
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("AUTH_REQUIRED");

  const service = getServiceClient();
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) throw new Error("AUTH_REQUIRED");

  const { data: admin, error: adminError } = await service
    .from("administradores")
    .select("user_id,nombre,activo")
    .eq("user_id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (adminError || !admin) throw new Error("ADMIN_REQUIRED");
  return { service, user, admin };
}

async function ensureDocumentBucket(service: ReturnType<typeof createClient>) {
  const { data: buckets, error: listError } = await service.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((bucket) => bucket.id === DOCUMENT_BUCKET)) return;

  const { error: createError } = await service.storage.createBucket(DOCUMENT_BUCKET, {
    public: true,
    allowedMimeTypes: ["application/pdf"],
    fileSizeLimit: MAX_PDF_BYTES
  });
  if (createError) throw createError;
}

async function readAllRows(service: ReturnType<typeof createClient>, table: string) {
  const rows: unknown[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await service
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function createBackup(service: ReturnType<typeof createClient>, admin: { user_id: string; nombre?: string | null }) {
  const tables: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = await readAllRows(service, table);
  }

  return {
    format: "pena-outra-mais-backup",
    version: 1,
    created_at: new Date().toISOString(),
    created_by: {
      user_id: admin.user_id,
      nombre: admin.nombre || "Administrador"
    },
    project: "Peña Outra Máis",
    table_count: BACKUP_TABLES.length,
    tables
  };
}

async function statutesStatus(service: ReturnType<typeof createClient>) {
  await ensureDocumentBucket(service);
  const { data, error } = await service.storage
    .from(DOCUMENT_BUCKET)
    .list("estatutos", { limit: 20, search: "estatutos-vigentes.pdf" });

  if (error) throw error;

  const file = (data || []).find((item) => item.name === "estatutos-vigentes.pdf") || null;
  const { data: publicData } = service.storage.from(DOCUMENT_BUCKET).getPublicUrl(STATUTES_PATH);

  return {
    exists: !!file,
    url: file ? `${publicData.publicUrl}?v=${encodeURIComponent(file.updated_at || file.created_at || Date.now())}` : null,
    updated_at: file?.updated_at || file?.created_at || null,
    size: file?.metadata?.size || null
  };
}

async function uploadStatutes(service: ReturnType<typeof createClient>, file: File) {
  await ensureDocumentBucket(service);

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) throw new Error("PDF_REQUIRED");
  if (file.size <= 0) throw new Error("EMPTY_FILE");
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF_TOO_LARGE");

  const { error } = await service.storage
    .from(DOCUMENT_BUCKET)
    .upload(STATUTES_PATH, file, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true
    });

  if (error) throw error;
  return statutesStatus(service);
}

async function deleteStatutes(service: ReturnType<typeof createClient>) {
  await ensureDocumentBucket(service);
  const { error } = await service.storage.from(DOCUMENT_BUCKET).remove([STATUTES_PATH]);
  if (error) throw error;
  return { exists: false, url: null, updated_at: null, size: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const { service, admin } = await requireAdmin(req);
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const action = String(form.get("action") || "");

      if (action !== "upload_statutes") return json({ error: "Acción no válida." }, 400);
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Selecciona un archivo PDF." }, 400);

      const status = await uploadStatutes(service, file);
      return json({ ok: true, statutes: status });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "backup") {
      const backup = await createBackup(service, admin);
      return json({ ok: true, backup });
    }

    if (action === "statutes_status") {
      return json({ ok: true, statutes: await statutesStatus(service) });
    }

    if (action === "delete_statutes") {
      return json({ ok: true, statutes: await deleteStatutes(service) });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AUTH_REQUIRED") return json({ error: "La sesión ha caducado." }, 401);
    if (message === "ADMIN_REQUIRED") return json({ error: "No tienes permisos de administrador." }, 403);
    if (message === "PDF_REQUIRED") return json({ error: "Solo se admiten archivos PDF." }, 400);
    if (message === "EMPTY_FILE") return json({ error: "El PDF está vacío." }, 400);
    if (message === "PDF_TOO_LARGE") return json({ error: "El PDF no puede superar 10 MB." }, 400);
    return json({ error: message || "No se pudo completar la operación." }, 500);
  }
});

import { SUPABASE_CONFIG } from '../config/supabase-config.js';

export async function supabaseSelect(path) {
  const { url, publishableKey } = SUPABASE_CONFIG;

  if (!url || !publishableKey) {
    throw new Error('Supabase no configurado');
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}`);
  }

  return response.json();
}

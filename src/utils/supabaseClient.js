import { createClient } from '@supabase/supabase-js';

// The URL and Key will be replaced by the user's actual Supabase credentials.
// For now, these are placeholder values, or they can be loaded from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Subir un archivo (comprobante) al Storage de Supabase
 * @param {File} file El archivo a subir
 * @returns {Promise<string|null>} La URL pública del archivo subido o null en caso de error
 */
export async function uploadReceipt(file) {
  if (!file) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error al subir el comprobante:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('payments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Excepción al subir archivo:', error);
    return null;
  }
}

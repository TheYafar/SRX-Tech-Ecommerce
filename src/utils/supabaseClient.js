import { createClient } from '@supabase/supabase-js';

// The URL and Key provided by the user
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wcnobggfbmpisahxihfu.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wAWin60va1OOcXt2wRv1WA_x0vqMqTu';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Subir un archivo (comprobante) al Storage de Supabase
 * @param {File} file El archivo a subir
 * @returns {Promise<string|null>} La URL pública del archivo subido o null en caso de error
 */
export async function uploadReceipt(file) {
  if (!file) {
    console.log("ℹ️ [uploadReceipt] No se proporcionó ningún archivo para subir.");
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    console.log(`🚀 [uploadReceipt] Iniciando subida de comprobante: ${file.name} (Ruta: ${filePath})`);

    const { error: uploadError } = await supabase.storage
      .from('payments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('❌ [uploadReceipt] Error devuelto por Supabase al subir comprobante:', {
        message: uploadError.message,
        status: uploadError.status,
        name: uploadError.name,
        details: uploadError
      });
      return null;
    }

    const { data } = supabase.storage
      .from('payments')
      .getPublicUrl(filePath);

    console.log('✅ [uploadReceipt] Subida exitosa. URL pública generada:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('💥 [uploadReceipt] Excepción inesperada atrapada al subir archivo:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    return null;
  }
}

/**
 * Subir un archivo (imagen) al Storage de Supabase
 * @param {File} file El archivo de imagen a subir
 * @returns {Promise<string|null>} La URL pública de la imagen subida o null en caso de error
 */
export async function uploadProductImage(file) {
  if (!file) {
    console.log("ℹ️ [uploadProductImage] No se proporcionó ninguna imagen para subir.");
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    console.log(`🚀 [uploadProductImage] Iniciando subida de imagen de producto: ${file.name} (Ruta: ${filePath})`);

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      console.error('❌ [uploadProductImage] Error devuelto por Supabase al subir imagen de producto:', {
        message: uploadError.message,
        status: uploadError.status,
        name: uploadError.name,
        details: uploadError
      });
      return null;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    console.log('✅ [uploadProductImage] Subida exitosa. URL pública generada:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('💥 [uploadProductImage] Excepción inesperada atrapada al subir archivo de producto:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    return null;
  }
}

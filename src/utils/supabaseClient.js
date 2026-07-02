import { createClient } from '@supabase/supabase-js';

// The URL and Key provided by the user
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wcnobggfbmpisahxihfu.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wAWin60va1OOcXt2wRv1WA_x0vqMqTu';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,   // Guarda el token en localStorage para sobrevivir recargas
    autoRefreshToken: true, // Refresca el token automáticamente antes de que expire
    detectSessionInUrl: true // Detecta tokens de recuperación de contraseña en la URL
  }
});

/**
 * Subir un archivo (comprobante) al Storage de Supabase
 * @param {File} file El archivo a subir
 * @returns {Promise<string|null>} La URL pública del archivo subido o null en caso de error
 */
export async function uploadReceipt(file) {
  if (!file) {
    console.warn('[uploadReceipt] No file provided for upload.');
    return null;
  }

  const bucketName = import.meta.env.VITE_SUPABASE_RECEIPTS_BUCKET || 'comprobantes_pago';

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const uploadPromise = supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('La conexión ha caducado (Timeout). Verifica el RLS o tu conexión.')), 15000);
    });

    const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

    if (uploadError) {
      console.error('Error from Supabase when uploading receipt:', uploadError);
      throw new Error(`Error de Supabase: ${uploadError.message || 'Fallo al subir el archivo al storage'}`);
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected exception when uploading file:', error);
    throw new Error(error.message || 'Error inesperado al intentar subir el comprobante de pago.', { cause: error });
  }
}

/**
 * Subir una imagen de banner de cupón al bucket banners_cupones
 * @param {File} file El archivo de imagen a subir
 * @returns {Promise<string|null>} La URL pública del banner subido o null en caso de error
 */
export async function uploadBannerCoupon(file) {
  if (!file) {
    console.warn('[uploadBannerCoupon] No image provided for upload.');
    return null;
  }

  // Bucket name configurable via env; must be created manually in Supabase Storage
  const bucketName = import.meta.env.VITE_SUPABASE_BANNERS_BUCKET || 'banners_cupones';

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Error from Supabase when uploading coupon banner:', uploadError);
      if (uploadError.message?.toLowerCase().includes('bucket not found')) {
        throw new Error(
          `El bucket de almacenamiento "${bucketName}" no existe en Supabase. ` +
          `Créalo en Supabase Dashboard → Storage → New bucket, o configura VITE_SUPABASE_BANNERS_BUCKET en tu .env`
        );
      }
      throw new Error(`Error de Supabase: ${uploadError.message || 'Fallo al subir el banner'}`);
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected exception when uploading coupon banner:', error);
    throw new Error(error.message || 'Error inesperado al intentar subir el banner de cupón.', { cause: error });
  }
}

/**
 * Subir un archivo (imagen) al Storage de Supabase
 * @param {File} file El archivo de imagen a subir
 * @returns {Promise<string|null>} La URL pública de la imagen subida o null en caso de error
 */
export async function uploadProductImage(file) {
  if (!file) {
    console.warn('[uploadProductImage] No image provided for upload.');
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error from Supabase when uploading product image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected exception when uploading product image:', error);
    return null;
  }
}

import { useState, useEffect, useCallback } from 'react';
import {
  PackagePlus, CheckCircle, XCircle, Image as ImageIcon,
  DollarSign, UploadCloud, Loader2, Layers, Pencil, Check, X,
  PlusCircle, Sparkles, Mail, Search
} from 'lucide-react';
import { supabase, uploadProductImage } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { useProducts } from '../../context/ProductContext';
import { enviarCorreoPagoVerificado } from '../../services/emailService';

import './AdminDashboard.css';

export default function AdminDashboard({ activeSection = 'addProduct' }) {
  const { showSuccess, showError } = useNotifications();
  const { addProductToState } = useProducts();
  const [activeTab, setActiveTab] = useState(activeSection);

  useEffect(() => {
    setActiveTab(activeSection);
  }, [activeSection]);

  // ── States for Add Product ──────────────────────────────
  const [productData, setProductData] = useState({
    title: '', description: '', price_usd: '', stock: '',
    features: '', category: '', category_id: ''
  });
  const [portada, setPortada] = useState(null);
  const [previewPortada, setPreviewPortada] = useState('');
  const [galeria, setGaleria] = useState([]);
  const [previewGaleria, setPreviewGaleria] = useState([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [categories, setCategories] = useState([]);

  // ── States for Payments ─────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // ── States for Category Management ─────────────────────
  const [allCategories, setAllCategories] = useState([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('por-producto'); // 'por-producto' | 'para-tu-equipo'
  const [editingCategoryGroup, setEditingCategoryGroup] = useState('por-producto'); // grupo activo en edición
  const [rootCategoryIds, setRootCategoryIds] = useState({ porProducto: null, paraTuEquipo: null });



  // ── States for Banners ─────────────────────────────────
  const [bannerData, setBannerData] = useState({
    title: '',
    subtitle: '',
    link_url: '/tienda',
    order_index: 0
  });
  const [bannerImagePc, setBannerImagePc] = useState(null);
  const [bannerImageMobile, setBannerImageMobile] = useState(null);
  const [isSubmittingBanner, setIsSubmittingBanner] = useState(false);
  const [existingBanners, setExistingBanners] = useState([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);



  // ── Fetch categories for Add Product dropdown ───────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('id, name, slug');
        if (error) throw error;
        if (data) setCategories(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch ALL categories for management tab ─────────────
  const fetchAllCategories = useCallback(async () => {
    setIsCatLoading(true);
    try {
      // Fetch de macro-categorías raíz para mapear UUIDs
      const { data: rootData, error: rootError } = await supabase
        .from('categories')
        .select('id, slug')
        .in('slug', ['por-producto', 'para-tu-equipo']);
      if (rootError) throw rootError;
      if (rootData) {
        const ids = { porProducto: null, paraTuEquipo: null };
        rootData.forEach(cat => {
          if (cat.slug === 'por-producto')    ids.porProducto  = cat.id;
          if (cat.slug === 'para-tu-equipo') ids.paraTuEquipo = cat.id;
        });
        setRootCategoryIds(ids);
      }

      // Fetch de todas las categorías para la lista
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id')
        .order('name', { ascending: true });
      if (error) throw error;
      setAllCategories(data || []);
    } catch (err) {
      console.error('[AdminDashboard] Error al cargar todas las categorías:', err);
      showError('No se pudieron cargar las categorías.');
    } finally {
      setIsCatLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchAllCategories();
    }
  }, [activeTab, fetchAllCategories]);

  // ── Payments fetch ──────────────────────────────────────
  const fetchPendingPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(*, profiles(full_name, email))')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPendingPayments(data || []);
    } catch (error) {
      console.error('[AdminDashboard] Error cargando pagos:', error);
      showError('No se pudieron cargar los pagos pendientes.');
    } finally {
      setIsLoadingPayments(false);
    }
  }, [showError]);

  useEffect(() => {
    let timeoutId;
    if (activeTab === 'payments') {
      timeoutId = setTimeout(() => fetchPendingPayments(), 0);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [activeTab, fetchPendingPayments]);

  const fetchBanners = useCallback(async () => {
    setIsLoadingBanners(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setExistingBanners(data || []);
    } catch (err) {
      console.error('Error al cargar banners:', err);
      showError('No se pudieron cargar los banners.');
    } finally {
      setIsLoadingBanners(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners();
    }
  }, [activeTab, fetchBanners]);

  // ── Product handlers ────────────────────────────────────
  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handlePortadaChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPortada(file);
      setPreviewPortada(URL.createObjectURL(file));
    }
  };

  const handleRemovePortada = () => {
    setPortada(null);
    setPreviewPortada('');
  };

  const handleGaleriaChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(f => f.type.startsWith('image/'));

      if (galeria.length + imageFiles.length > 3) {
        showError('Límite excedido. Solo puedes agregar un máximo de 3 imágenes secundarias en la galería.');
        return;
      }

      setGaleria(prev => [...prev, ...imageFiles]);
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
      setPreviewGaleria(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveGaleriaItem = (index) => {
    setGaleria(prev => prev.filter((_, i) => i !== index));
    setPreviewGaleria(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productData.title || !productData.price_usd || !portada || !productData.category_id) {
      showError('Por favor completa todos los campos requeridos, incluyendo la categoría y la imagen de portada.');
      return;
    }
    setIsSubmittingProduct(true);
    try {
      // 1. Sube la imagen de portada
      const urlPortada = await uploadProductImage(portada);
      if (!urlPortada) throw new Error('Error al subir la imagen de portada.');

      // 2. Sube las imágenes de la galería en paralelo (Promise.all)
      const urlsGaleria = await Promise.all(
        galeria.map(async (file) => {
          const url = await uploadProductImage(file);
          if (!url) throw new Error(`Fallo al subir una de las imágenes de la galería: ${file.name}`);
          return url;
        })
      );

      // 3. Combina ambas partes en un único arreglo indexado
      const finalImages = [urlPortada, ...urlsGaleria];

      let parsedFeatures = {};
      try {
        if (productData.features.trim() !== '') parsedFeatures = JSON.parse(productData.features);
      } catch { showError('Las características deben ser un JSON válido. Guardando como objeto vacío.'); }

      let finalCategoryId = productData.category_id;
      if (finalCategoryId === '' || finalCategoryId === 'Seleccionar categoría') finalCategoryId = null;

      const objetoProducto = {
        name: productData.title,
        description: productData.description,
        price_usd: parseFloat(productData.price_usd),
        specifications: parsedFeatures,
        images_urls: finalImages,
        category_id: finalCategoryId
      };

      const { data: productoCreado, error: productError } = await supabase
        .from('products').insert([objetoProducto]).select('id').single();
      if (productError) throw productError;

      const stockDelFormulario = parseInt(productData.stock) || 0;
      if (stockDelFormulario > 0) {
        const { error: stockError } = await supabase.from('inventory_transactions').insert([{
          product_id: productoCreado.id,
          quantity: stockDelFormulario,
          transaction_type: 'adjustment'
        }]);
        if (stockError) throw stockError;
      }

      addProductToState({
        id: productoCreado.id,
        name: productData.title,
        description: productData.description,
        price_usd: parseFloat(productData.price_usd),
        specifications: parsedFeatures,
        images_urls: finalImages,
        image: urlPortada,
        price: parseFloat(productData.price_usd),
        salePrice: null,
        category: productData.category,
        tagline: productData.description ? productData.description.substring(0, 50) + '...' : ''
      });

      showSuccess('Producto añadido correctamente.');
      setProductData({ title: '', description: '', price_usd: '', stock: '', features: '', category: '', category_id: '' });
      setPortada(null);
      setPreviewPortada('');
      setGaleria([]);
      setPreviewGaleria([]);
      e.target.reset();
    } catch (error) {
      console.error('Error exacto:', error.message, error.details);
      showError('Ocurrió un error al añadir el producto: ' + error.message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // ── Payment handlers ────────────────────────────────────
  const handlePaymentAction = async (paymentId, newStatus, orderId) => {
    const actionLabel = newStatus === 'completed' ? 'VALIDAR' : 'RECHAZAR';
    if (!window.confirm(`¿Estás seguro de ${actionLabel} este pago?`)) return;
    try {
      const { error: paymentError } = await supabase
        .from('payments').update({ status: newStatus }).eq('id', paymentId);
      if (paymentError) throw paymentError;

      if (orderId) {
        const orderNewStatus = newStatus === 'completed' ? 'paid' : 'rejected';
        const { error: orderError } = await supabase
          .from('orders').update({ status: orderNewStatus }).eq('id', orderId);
        if (orderError) {
          showError('El pago se actualizó, pero hubo un error al actualizar la orden.');
          fetchPendingPayments();
          return;
        }
      }
      // Send payment verified email
      if (newStatus === 'completed' && orderId) {
        try {
          // Extraer datos del cliente desde el pago actual en el estado local
          const paymentRecord = pendingPayments.find(p => p.id === paymentId);
          const order = paymentRecord?.orders;
          const profile = order?.profiles;
          const correoCliente = profile?.email || order?.user_email;
          const nombreCliente = profile?.full_name || order?.user_name || 'Cliente';

          if (correoCliente) {
            await enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId);
          } else {
            console.warn('[AdminDashboard] No se encontró email del cliente para enviar notificación de pago.');
          }
        } catch (emailError) {
          console.error('[AdminDashboard] Error al enviar correo de pago verificado (no afecta la orden):', emailError);
        }
      }

      showSuccess(`Pago ${newStatus === 'completed' ? 'validado' : 'rechazado'} correctamente.`);
      fetchPendingPayments();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      showError('No se pudo actualizar el estado del pago.');
    }
  };

  // ── Category Management handlers ────────────────────────

  const startEditCat = (cat) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
    // Detectar a qué macro-categoría raíz pertenece
    setEditingCategoryGroup(
      cat.parent_id === rootCategoryIds.porProducto ? 'por-producto' : 'para-tu-equipo'
    );
  };

  const cancelEditCat = () => {
    setEditingCatId(null);
    setEditingName('');
    setEditingCategoryGroup('por-producto');
  };

  const saveEditCat = async (cat) => {
    if (!editingName.trim()) {
      showError('El nombre no puede estar vacío.');
      return;
    }
    setIsSavingCat(true);
    try {
      const cleanName = editingName.trim();
      const newSlug   = cleanName.toLowerCase().replace(/ /g, '-');
      const newParentId = editingCategoryGroup === 'por-producto'
        ? rootCategoryIds.porProducto
        : rootCategoryIds.paraTuEquipo;

      const { error } = await supabase
        .from('categories')
        .update({
          name:      cleanName,
          slug:      newSlug,
          parent_id: newParentId
        })
        .eq('id', cat.id);
      if (error) throw error;

      setAllCategories(prev =>
        prev.map(c => c.id === cat.id
          ? { ...c, name: cleanName, slug: newSlug, parent_id: newParentId }
          : c
        )
      );
      showSuccess('Categoría actualizada correctamente.');
      cancelEditCat();
    } catch (err) {
      console.error('Error guardando categoría:', err);
      showError('No se pudo guardar la categoría.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showError('El nombre de la categoría es requerido.');
      return;
    }
    setIsAddingCat(true);
    try {
      const cleanName = newCatName.trim();
      const slug = cleanName.toLowerCase().replace(/ /g, '-');
      const parentId = selectedGroup === 'por-producto'
        ? rootCategoryIds.porProducto
        : rootCategoryIds.paraTuEquipo;
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: cleanName,
          slug,
          parent_id: parentId
        }])
        .select('id, name, slug')
        .single();
      if (error) throw error;
      setAllCategories(prev => [...prev, data]);
      setCategories(prev => [...prev, data]);
      showSuccess(`Categoría "${data.name}" creada en "${selectedGroup === 'por-producto' ? 'Por Producto' : 'Para tu Equipo'}" correctamente.`);
      setNewCatName('');
    } catch (err) {
      console.error('Error creando categoría:', err);
      showError('No se pudo crear la categoría. Verifica que el nombre sea único.');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const categoryId = cat.id;

    // 1. Confirmación previa — evita eliminaciones accidentales
    if (!window.confirm(
      '¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría asignada.'
    )) return;

    try {
      // 2. Consulta de eliminación estricta — .select() fuerza a Supabase a devolver
      //    la fila eliminada; si RLS bloquea silenciosamente, data llegará vacío.
      const { data: deletedRows, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .select();

      if (error) throw error;

      if (!deletedRows || deletedRows.length === 0) {
        console.warn('[handleDeleteCategory] Supabase no devolvió filas eliminadas.', {
          categoryId,
          categoryName: cat.name,
        });
        showError('No se pudo eliminar: sin permisos en la base de datos. Revisa las políticas RLS en Supabase.');
        return; 
      }

      // 4. Actualización inmediata del estado — sin recarga de página
      setAllCategories(prevCategories => prevCategories.filter(c => c.id !== categoryId));
      setCategories(prevCategories => prevCategories.filter(c => c.id !== categoryId));

      showSuccess(`Categoría "${cat.name}" eliminada correctamente.`);
    } catch (err) {
      console.error('[handleDeleteCategory] Error al eliminar categoría:', err);
      showError('No se pudo eliminar la categoría. Revisa la consola para más detalles.');
    }
  };


  // ── Banner Management handlers ──────────────────────────
  const handleBannerInputChange = (e) => {
    const { name, value } = e.target;
    setBannerData(prev => ({
      ...prev,
      [name]: name === 'order_index' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!bannerImagePc || !bannerImageMobile) {
      showError('Por favor selecciona tanto la imagen para PC como la imagen para móvil.');
      return;
    }

    setIsSubmittingBanner(true);
    try {
      // 1. Subir imagen de PC
      const fileExtPc = bannerImagePc.name.split('.').pop();
      const fileNamePc = `${Date.now()}-pc-${Math.random().toString(36).substring(2)}.${fileExtPc}`;
      const filePathPc = `banners/${fileNamePc}`;

      const { error: uploadErrorPc } = await supabase.storage
        .from('hero-banners')
        .upload(filePathPc, bannerImagePc);

      if (uploadErrorPc) {
        throw new Error(`Error al subir la imagen de PC al Storage: ${uploadErrorPc.message}`);
      }

      const { data: publicUrlDataPc } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePathPc);

      const publicUrlPc = publicUrlDataPc?.publicUrl;
      if (!publicUrlPc) {
        throw new Error('No se pudo recuperar la URL pública del banner de PC.');
      }

      // 2. Subir imagen Móvil
      const fileExtMobile = bannerImageMobile.name.split('.').pop();
      const fileNameMobile = `${Date.now()}-mobile-${Math.random().toString(36).substring(2)}.${fileExtMobile}`;
      const filePathMobile = `banners/${fileNameMobile}`;

      const { error: uploadErrorMobile } = await supabase.storage
        .from('hero-banners')
        .upload(filePathMobile, bannerImageMobile);

      if (uploadErrorMobile) {
        throw new Error(`Error al subir la imagen móvil al Storage: ${uploadErrorMobile.message}`);
      }

      const { data: publicUrlDataMobile } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePathMobile);

      const publicUrlMobile = publicUrlDataMobile?.publicUrl;
      if (!publicUrlMobile) {
        throw new Error('No se pudo recuperar la URL pública del banner móvil.');
      }

      // 3. Guardar en Base de Datos
      const { error: insertError } = await supabase
        .from('banners')
        .insert([{
          title: bannerData.title,
          subtitle: bannerData.subtitle,
          image_url: publicUrlPc,
          image_url_mobile: publicUrlMobile,
          link_url: bannerData.link_url || '/tienda',
          order_index: bannerData.order_index
        }]);

      if (insertError) {
        throw insertError;
      }

      showSuccess('¡Banner añadido exitosamente, uhhh uhhh!');
      
      setBannerData({
        title: '',
        subtitle: '',
        link_url: '/tienda',
        order_index: 0
      });
      setBannerImagePc(null);
      setBannerImageMobile(null);
      if (e.target) e.target.reset();

      fetchBanners();
    } catch (err) {
      console.error('[AdminDashboard] Error al crear banner:', err);
      showError(`Error al crear el banner: ${err.message || err}`);
    } finally {
      setIsSubmittingBanner(false);
    }
  };

  const handleDeleteBanner = async (banner) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este banner, uhhh ahhh?')) return;
    try {
      // Eliminar imagen de PC
      if (banner.image_url) {
        try {
          const urlParts = banner.image_url.split('/storage/v1/object/public/hero-banners/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('hero-banners').remove([filePath]);
          }
        } catch (err) {
          console.warn('No se pudo borrar el archivo de PC del storage:', err);
        }
      }

      // Eliminar imagen móvil
      if (banner.image_url_mobile) {
        try {
          const urlParts = banner.image_url_mobile.split('/storage/v1/object/public/hero-banners/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('hero-banners').remove([filePath]);
          }
        } catch (err) {
          console.warn('No se pudo borrar el archivo móvil del storage:', err);
        }
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;
      showSuccess('Banner eliminado correctamente, u u a a.');
      fetchBanners();
    } catch (err) {
      console.error('Error al eliminar banner:', err);
      showError('No se pudo eliminar el banner.');
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="admin-dashboard-panel animate-fade-in">
      <div className="admin-dashboard-header">
        <h1 className="admin-panel-title">SRX Control Panel</h1>
        <p className="admin-panel-subtitle">Gestión centralizada de operaciones</p>
      </div>



      <div className="admin-dashboard-content">

        {/* ══ TAB: Add Product ══════════════════════════════ */}
        {activeTab === 'addProduct' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Nuevo Producto</h2>
            <form className="admin-form" onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Título del Producto</label>
                <input
                  type="text" name="title" value={productData.title}
                  onChange={handleProductInputChange}
                  placeholder="Ej: Sony A7S III" required
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select
                  name="category_id" value={productData.category_id}
                  onChange={handleProductInputChange} required
                >
                  <option value="" disabled>Selecciona una categoría...</option>
                  {categories && categories.length > 0 && categories.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>{categoria.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="description" value={productData.description}
                  onChange={handleProductInputChange}
                  placeholder="Descripción detallada del producto..." rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio (USD)</label>
                  <input
                    type="number" step="0.01" name="price_usd"
                    value={productData.price_usd}
                    onChange={handleProductInputChange}
                    placeholder="Ej: 3499.99" required
                  />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number" name="stock" value={productData.stock}
                    onChange={handleProductInputChange} placeholder="Ej: 15"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Características (JSON)</label>
                <textarea
                  name="features" value={productData.features}
                  onChange={handleProductInputChange}
                  placeholder='{"Resolución": "4K", "Sensor": "Full Frame"}'
                  rows={3} className="font-mono"
                />
              </div>

              {/* Imagen de Portada y Galería (Contenedor Responsivo en Grilla) */}
              <div className="image-upload-grid">
                {/* Columna 1: Portada (Obligatoria) */}
                <div className="upload-column">
                  <span className="upload-label">Imagen de Portada (Obligatoria)</span>
                  <div className="image-box-wrapper">
                    {previewPortada ? (
                      <div className="image-preview-container">
                        <img
                          src={previewPortada}
                          alt="Previsualización Portada"
                          className="image-preview-img"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePortada}
                          className="btn-remove-image"
                          title="Eliminar portada"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="portadaInput"
                          accept="image/*"
                          multiple={false}
                          onChange={handlePortadaChange}
                          className="file-input-hidden"
                        />
                        <label
                          htmlFor="portadaInput"
                          className="image-box-clickable"
                        >
                          <UploadCloud size={32} className="upload-icon" />
                          <span className="upload-text">
                            Seleccionar Portada
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Columna 2 y 3: Galería (Opcional, hasta 3) */}
                <div className="upload-column">
                  <span className="upload-label">Galería de Imágenes (Opcional, hasta 3)</span>
                  <div className="gallery-grid">
                    {/* Previews de la Galería */}
                    {previewGaleria.map((preview, index) => (
                      <div key={index} className="gallery-slot">
                        <div className="image-preview-container">
                          <img
                            src={preview}
                            alt={`Galería preview ${index + 1}`}
                            className="image-preview-img"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGaleriaItem(index)}
                            className="btn-remove-image"
                            title="Eliminar imagen"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Botón para añadir imágenes (si no se ha alcanzado el límite de 3) */}
                    {galeria.length < 3 && (
                      <div className="gallery-slot">
                        <div className="image-box-wrapper" style={{ height: '100%' }}>
                          <input
                            type="file"
                            id="galeriaInput"
                            accept="image/*"
                            multiple
                            onChange={handleGaleriaChange}
                            className="file-input-hidden"
                          />
                          <label
                            htmlFor="galeriaInput"
                            className="image-box-clickable"
                          >
                            <PlusCircle size={28} className="upload-icon" />
                            <span className="upload-text" style={{ fontSize: '0.75rem' }}>
                              Añadir Imagen
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Relleno para mantener la grilla estructurada de 3 columnas */}
                    {Array.from({ length: 3 - galeria.length - (galeria.length < 3 ? 1 : 0) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="gallery-slot gallery-slot-empty">
                        <span>Vacío</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="admin-submit-btn" disabled={isSubmittingProduct || !portada}>
                {isSubmittingProduct
                  ? <><Loader2 size={18} className="spin" /> Guardando...</>
                  : <><PackagePlus size={18} /> Añadir Producto al Catálogo</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ══ TAB: Payments ════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Pagos Pendientes de Verificación</h2>

            {isLoadingPayments ? (
              <div className="admin-loading-state">
                <Loader2 size={32} className="spin" />
                <p>Cargando pagos pendientes...</p>
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle size={48} className="empty-icon text-green" />
                <p>¡Todo al día! No hay pagos pendientes por verificar.</p>
              </div>
            ) : (
              <div className="payments-grid">
                {pendingPayments.map(payment => {
                  const order = payment.orders;
                  const profile = order?.profiles;
                  return (
                    <div key={payment.id} className="payment-card">
                      <div className="payment-card-header">
                        <span className="payment-id">
                          Pedido #{order?.id ? String(order.id).slice(-6).toUpperCase() : 'N/A'}
                        </span>
                        <span className="payment-amount">
                          {payment.currency === 'USD' ? '$' : payment.currency === 'EUR' ? '€' : ''}
                          {Number(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {' '}<span className="payment-currency">{payment.currency || 'USD'}</span>
                        </span>
                      </div>

                      <div className="payment-details">
                        <p><strong>Cliente:</strong> {profile?.full_name || order?.user_name || 'Sin nombre'}</p>
                        <p><strong>Email:</strong> {profile?.email || order?.user_email || 'N/A'}</p>
                        <p><strong>Fecha:</strong> {new Date(payment.created_at).toLocaleString()}</p>
                        {payment.reference_number && (
                          <p><strong>Nº Referencia:</strong> <span className="reference-badge">{payment.reference_number}</span></p>
                        )}
                      </div>

                      <div className="payment-proof">
                        {payment.proof_image_url ? (
                          <div className="proof-image-container">
                            <img
                              src={payment.proof_image_url}
                              alt="Comprobante de pago"
                              className="proof-image"
                              onClick={() => window.open(payment.proof_image_url, '_blank')}
                              style={{ cursor: 'zoom-in' }}
                            />
                            <a href={payment.proof_image_url} target="_blank" rel="noopener noreferrer" className="view-full-btn">
                              <Search size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Ver comprobante completo
                            </a>
                          </div>
                        ) : (
                          <div className="no-proof">
                            <ImageIcon size={24} />
                            <span>Sin imagen de comprobante</span>
                          </div>
                        )}
                      </div>

                      <div className="payment-actions">
                        <button
                          className="btn-reject"
                          onClick={() => handlePaymentAction(payment.id, 'rejected', order?.id)}
                        >
                          <XCircle size={18} /> Rechazar
                        </button>
                        <button
                          className="btn-approve"
                          onClick={() => handlePaymentAction(payment.id, 'completed', order?.id)}
                        >
                          <CheckCircle size={18} /> Validar Pago
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: Manage Categories ═══════════════════════ */}
        {activeTab === 'categories' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Gestionar Categorías</h2>

            {/* ── Add new category form ── */}
            <form className="cat-add-form" onSubmit={handleAddCategory}>
              <h3 className="cat-add-title">
                <PlusCircle size={18} />
                Nueva Categoría
              </h3>
              <div className="cat-add-fields">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Ej: Cámaras, Lentes, Iluminación..."
                    required
                  />
                </div>

                {/* ── Botonera de grupo ── */}
                <div className="form-group">
                  <label>Clasificar en</label>
                  <div className="category-group-selector">
                    <button
                      type="button"
                      className={`selector-btn ${selectedGroup === 'por-producto' ? 'active' : ''}`}
                      onClick={() => setSelectedGroup('por-producto')}
                    >
                      Por Producto
                    </button>
                    <button
                      type="button"
                      className={`selector-btn ${selectedGroup === 'para-tu-equipo' ? 'active' : ''}`}
                      onClick={() => setSelectedGroup('para-tu-equipo')}
                    >
                      Para tu Equipo
                    </button>
                  </div>
                </div>
              </div>
              <button type="submit" className="admin-submit-btn cat-add-btn" disabled={isAddingCat}>
                {isAddingCat
                  ? <><Loader2 size={16} className="spin" /> Creando...</>
                  : <><PlusCircle size={16} /> Crear Categoría</>
                }
              </button>
            </form>

            {/* ── Categories list ── */}
            {isCatLoading ? (
              <div className="admin-loading-state">
                <Loader2 size={32} className="spin" />
                <p>Cargando categorías...</p>
              </div>
            ) : allCategories.length === 0 ? (
              <div className="admin-empty-state">
                <Layers size={48} style={{ color: '#64748b' }} />
                <p>No hay categorías creadas aún.</p>
              </div>
            ) : (
              <div className="cat-list">
                {allCategories.map(cat => (
                  <div
                    key={cat.id}
                    className="cat-row"
                  >
                    {/* ── Name / Edit inline ── */}
                    <div className="cat-row-body">
                      {editingCatId === cat.id ? (
                        <div className="cat-edit-fields">
                          <input
                            type="text"
                            className="cat-inline-input"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            placeholder="Nombre de la categoría"
                            autoFocus
                          />
                          {/* ── Botonera de grupo en edición ── */}
                          <div className="category-group-selector category-group-selector--edit">
                            <button
                              type="button"
                              className={`selector-btn ${editingCategoryGroup === 'por-producto' ? 'active' : ''}`}
                              onClick={() => setEditingCategoryGroup('por-producto')}
                            >
                              Por Producto
                            </button>
                            <button
                              type="button"
                              className={`selector-btn ${editingCategoryGroup === 'para-tu-equipo' ? 'active' : ''}`}
                              onClick={() => setEditingCategoryGroup('para-tu-equipo')}
                            >
                              Para tu Equipo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="cat-row-info">
                          <span className="cat-row-name">{cat.name}</span>
                        </div>
                      )}
                    </div>

                    {/* ── Actions ── */}
                    <div className="cat-row-actions">
                      {editingCatId === cat.id ? (
                        <>
                          <button
                            className="cat-action-btn cat-action-btn--save"
                            onClick={() => saveEditCat(cat)}
                            disabled={isSavingCat}
                            title="Guardar cambios"
                          >
                            {isSavingCat ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                          </button>
                          <button
                            className="cat-action-btn cat-action-btn--cancel"
                            onClick={cancelEditCat}
                            title="Cancelar"
                          >
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="cat-action-btn cat-action-btn--edit"
                            onClick={() => startEditCat(cat)}
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>



                          <button
                            className="cat-action-btn cat-action-btn--delete"
                            onClick={() => handleDeleteCategory(cat)}
                            title="Eliminar categoría"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



        {/* ══ TAB: Banners ══════════════════════════════════ */}
        {activeTab === 'banners' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Gestión de Banners (Hero)</h2>
            <form className="admin-form" onSubmit={handleAddBanner}>
              <div className="form-group">
                <label>Título del Banner</label>
                <input
                  type="text"
                  name="title"
                  value={bannerData.title}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: DJI Osmo Pocket 3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtítulo / Descripción</label>
                <input
                  type="text"
                  name="subtitle"
                  value={bannerData.subtitle}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: Captura tus mejores momentos"
                  required
                />
              </div>



              <div className="form-group">
                <label>Imagen para PC (Escritorio)</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="bannerImagePc"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBannerImagePc(e.target.files[0]);
                      }
                    }}
                    className="file-input-hidden"
                  />
                  <label htmlFor="bannerImagePc" className="file-upload-box">
                    <UploadCloud size={32} className="upload-icon" />
                    <span className="upload-text">
                      {bannerImagePc ? bannerImagePc.name : 'Haz clic para seleccionar imagen de PC'}
                    </span>
                    <span className="file-upload-tip">
                      Nota: Para un mejor rendimiento y carga rápida de la página, se recomienda subir la imagen en formatos ligeros (.webp / .jpg) optimizados para pantallas anchas.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Imagen para Móvil (Teléfonos)</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="bannerImageMobile"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBannerImageMobile(e.target.files[0]);
                      }
                    }}
                    className="file-input-hidden"
                  />
                  <label htmlFor="bannerImageMobile" className="file-upload-box">
                    <UploadCloud size={32} className="upload-icon" />
                    <span className="upload-text">
                      {bannerImageMobile ? bannerImageMobile.name : 'Haz clic para seleccionar imagen móvil'}
                    </span>
                    <span className="file-upload-tip">
                      Nota: Para un mejor rendimiento y carga rápida de la página, se recomienda subir la imagen en formatos ligeros (.webp / .jpg), recomendando un diseño vertical o cuadrado para mejor adaptabilidad móvil.
                    </span>
                  </label>
                </div>
              </div>

              <button type="submit" className="admin-submit-btn" disabled={isSubmittingBanner}>
                {isSubmittingBanner ? (
                  <><Loader2 size={18} className="spin" /> Subiendo y guardando banner...</>
                ) : (
                  <><ImageIcon size={18} /> Guardar Banner</>
                )}
              </button>
            </form>

            {/* Listado de Banners Existentes */}
            <div className="existing-banners-section" style={{ marginTop: '3rem' }}>
              <h3 className="admin-section-title" style={{ fontSize: '1.25rem' }}>Banners Actuales</h3>
              {isLoadingBanners ? (
                <div className="admin-loading-state">
                  <Loader2 size={32} className="spin" />
                  <p>Cargando banners...</p>
                </div>
              ) : existingBanners.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No hay banners configurados en la base de datos.</p>
              ) : (
                <div className="banners-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                  {existingBanners.map(banner => (
                    <div key={banner.id} className="banner-admin-card" style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>PC</span>
                          <img src={banner.image_url} alt={`${banner.title} PC`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Móvil</span>
                          <img src={banner.image_url_mobile || banner.image_url} alt={`${banner.title} Móvil`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary, #f8fafc)' }}>{banner.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', margin: '0.25rem 0' }}>{banner.subtitle}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                          <span>Enlace: {banner.link_url}</span>
                          <span>Orden: {banner.order_index}</span>
                        </div>
                      </div>
                      <button
                        className="btn-reject"
                        onClick={() => handleDeleteBanner(banner)}
                        style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px' }}
                      >
                        <XCircle size={16} /> Eliminar Banner
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

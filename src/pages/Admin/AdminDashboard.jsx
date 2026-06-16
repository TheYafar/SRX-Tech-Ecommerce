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
import { getAllUserEmails, createNewCouponInDB, dispatchMassCampaign } from '../../services/couponService';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { showSuccess, showError } = useNotifications();
  const { addProductToState } = useProducts();
  const [activeTab, setActiveTab] = useState('addProduct'); // 'addProduct' | 'payments' | 'categories'

  // ── States for Add Product ──────────────────────────────
  const [productData, setProductData] = useState({
    title: '', description: '', price_usd: '', stock: '',
    features: '', category: '', category_id: ''
  });
  const [productImage, setProductImage] = useState(null);
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

  // ── States for Coupon Incentive ────────────────────────
  const [incentiveData, setIncentiveData] = useState({
    email: '',
    code: '',
    discount: '10'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMassEmail, setIsMassEmail] = useState(false);

  const handleMassEmailToggle = (checked) => {
    setIsMassEmail(checked);
    if (checked) {
      setIncentiveData(prev => ({ ...prev, email: '' }));
    }
  };

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

  // ── Product handlers ────────────────────────────────────
  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProductImage(e.target.files[0]);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productData.title || !productData.price_usd || !productImage || !productData.category_id) {
      showError('Por favor completa todos los campos requeridos, incluyendo la categoría y la imagen.');
      return;
    }
    setIsSubmittingProduct(true);
    try {
      const imageUrl = await uploadProductImage(productImage);
      if (!imageUrl) throw new Error('La función de subida de imagen devolvió nulo.');

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
        images_urls: [imageUrl],
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
        images_urls: [imageUrl],
        image: imageUrl,
        price: parseFloat(productData.price_usd),
        salePrice: null,
        category: productData.category,
        tagline: productData.description ? productData.description.substring(0, 50) + '...' : ''
      });

      showSuccess('Producto añadido correctamente.');
      setProductData({ title: '', description: '', price_usd: '', stock: '', features: '', category: '', category_id: '' });
      setProductImage(null);
      e.target.reset();
    } catch (error) {
      console.error('Error exacto:', error.message, error.details);
      showError('Ocurrió un error al añadir el producto.');
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

  // ── Coupon Incentive handler ────────────────────────────
  const handleSendIncentive = async (e) => {
    e.preventDefault();
    const { email, code, discount } = incentiveData;
    
    if (!isMassEmail && !email) {
      showError('Por favor introduce el correo electrónico del cliente.');
      return;
    }
    if (!code || !discount) {
      showError('Por favor completa todos los campos para enviar el incentivo.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const cleanCode = code.trim().toUpperCase();
      const percent = parseInt(discount, 10) || 10;
      
      // Registrar el cupón usando el servicio desacoplado
      await createNewCouponInDB(cleanCode, percent);

      // Obtener la lista de correos destino
      let listaUsuarios = [];
      if (isMassEmail) {
        listaUsuarios = await getAllUserEmails();
        if (listaUsuarios.length === 0) {
          throw new Error('No se encontraron usuarios en la base de datos para enviar la campaña.');
        }
      } else {
        if (!email || !email.trim()) {
          throw new Error('El correo electrónico no puede estar vacío.');
        }
        listaUsuarios = [email.trim()];
      }

      // Enviar campaña usando la Edge Function mediante el servicio
      await dispatchMassCampaign(cleanCode, percent, listaUsuarios);

      showSuccess(isMassEmail 
        ? `¡Campaña masiva enviada con éxito a ${listaUsuarios.length} usuarios!` 
        : `¡Incentivo de compra enviado con éxito a ${email.trim()}!`
      );

      // Limpiar campos del formulario
      setIncentiveData({ email: '', code: '', discount: '10' });
      setIsMassEmail(false);
    } catch (error) {
      console.error('[AdminDashboard:handleSendIncentive] Error:', error);
      showError(`Error al emitir incentivo: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="admin-dashboard-panel animate-fade-in">
      <div className="admin-dashboard-header">
        <h1 className="admin-panel-title">SRX Control Panel</h1>
        <p className="admin-panel-subtitle">Gestión centralizada de operaciones</p>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'addProduct' ? 'active' : ''}`}
          onClick={() => setActiveTab('addProduct')}
        >
          <PackagePlus size={18} />
          <span>Añadir Producto</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <DollarSign size={18} />
          <span>Verificación de Pagos</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={18} />
          <span>Gestionar Categorías</span>
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <Sparkles size={18} />
          <span>Incentivos (Cupones)</span>
        </button>
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

              <div className="form-group">
                <label>Imagen del Producto</label>
                <div className="file-upload-wrapper">
                  <input
                    type="file" id="productImage" accept="image/*"
                    onChange={handleImageChange} className="file-input-hidden"
                  />
                  <label htmlFor="productImage" className="file-upload-box">
                    <UploadCloud size={32} className="upload-icon" />
                    <span className="upload-text">
                      {productImage ? productImage.name : 'Haz clic para seleccionar una imagen'}
                    </span>
                  </label>
                </div>
              </div>

              <button type="submit" className="admin-submit-btn" disabled={isSubmittingProduct}>
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
                          Pedido #{order?.id ? String(order.id).substring(0, 8) : 'N/A'}
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

        {/* ══ TAB: Coupons (Incentives) ════════════════════ */}
        {activeTab === 'coupons' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Emitir Incentivo de Compra (Cupón)</h2>
            <p className="admin-section-subtitle" style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Registra un cupón de descuento en Supabase y envíalo automáticamente al correo electrónico del cliente a través de Resend.
            </p>
            
            <form className="admin-form" onSubmit={handleSendIncentive}>
              {/* Selector masivo */}
              <div className="form-group">
                <div className="switch-container">
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      className="switch-input"
                      checked={isMassEmail}
                      onChange={e => handleMassEmailToggle(e.target.checked)}
                    />
                    <div className="switch-track">
                      <div className="switch-thumb" />
                    </div>
                    <span className="switch-label-text">¿Enviar campaña masiva a todos los usuarios?</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Correo Electrónico del Cliente</label>
                <div className="input-with-icon" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '1rem', color: '#64748b' }} />
                  <input
                    type="email"
                    value={incentiveData.email}
                    onChange={e => setIncentiveData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={isMassEmail ? "Campaña masiva activa (correo individual deshabilitado)" : "cliente@ejemplo.com"}
                    required={!isMassEmail}
                    disabled={isMassEmail}
                    style={{ paddingLeft: '2.8rem', width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Código del Cupón</label>
                  <input
                    type="text"
                    value={incentiveData.code}
                    onChange={e => setIncentiveData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Ej: INCENTIVO15"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Porcentaje de Descuento (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={incentiveData.discount}
                    onChange={e => setIncentiveData(prev => ({ ...prev, discount: e.target.value }))}
                    placeholder="Ej: 15"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="admin-submit-btn" 
                disabled={isSubmitting} 
                style={{ marginTop: '1rem', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>{isMassEmail ? 'Enviando campaña masiva...' : 'Enviando cupón...'}</span>
                  </>
                ) : (
                  <>
                    {isMassEmail ? (
                      <span>Emitir y Enviar Campaña Masiva</span>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Emitir y Enviar Cupón</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

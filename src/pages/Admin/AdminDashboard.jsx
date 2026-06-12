import { useState, useEffect, useCallback } from 'react';
import {
  PackagePlus, CheckCircle, XCircle, Image as ImageIcon,
  DollarSign, UploadCloud, Loader2, Layers, Pencil, Check, X,
  PlusCircle, Eye, EyeOff
} from 'lucide-react';
import { supabase, uploadProductImage } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { useProducts } from '../../context/ProductContext';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  // ── States for Payments ─────────────────────────────────
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // ── States for Category Management ─────────────────────
  const [allCategories, setAllCategories] = useState([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [newCat, setNewCat] = useState({ name: '', image_url: '' });
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // ── Fetch categories for Add Product dropdown ───────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('*');
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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setAllCategories(data || []);
    } catch (err) {
      console.error('❌ [AdminDashboard] Error al cargar todas las categorías:', err);
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
      console.error('❌ [AdminDashboard] Error cargando pagos:', error);
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
    setIsSubmitting(true);
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
      setIsSubmitting(false);
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
      showSuccess(`Pago ${newStatus === 'completed' ? 'validado' : 'rechazado'} correctamente.`);
      fetchPendingPayments();
    } catch (error) {
      console.error('❌ Error al actualizar pago:', error);
      showError('No se pudo actualizar el estado del pago.');
    }
  };

  // ── Category Management handlers ────────────────────────
  const handleToggleVisibility = async (cat) => {
    const newValue = !cat.is_visible;
    // Optimistic UI update
    setAllCategories(prev =>
      prev.map(c => c.id === cat.id ? { ...c, is_visible: newValue } : c)
    );
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_visible: newValue })
        .eq('id', cat.id);
      if (error) throw error;
      showSuccess(`Categoría "${cat.name}" ${newValue ? 'mostrada' : 'ocultada'} correctamente.`);
    } catch (err) {
      console.error('❌ Error actualizando visibilidad:', err);
      // Revert on error
      setAllCategories(prev =>
        prev.map(c => c.id === cat.id ? { ...c, is_visible: !newValue } : c)
      );
      showError('No se pudo actualizar la visibilidad.');
    }
  };

  const startEditCat = (cat) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
    setEditingImageUrl(cat.image_url || '');
  };

  const cancelEditCat = () => {
    setEditingCatId(null);
    setEditingName('');
    setEditingImageUrl('');
  };

  const saveEditCat = async (cat) => {
    if (!editingName.trim()) {
      showError('El nombre no puede estar vacío.');
      return;
    }
    setIsSavingCat(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingName.trim(), image_url: editingImageUrl.trim() || null })
        .eq('id', cat.id);
      if (error) throw error;
      setAllCategories(prev =>
        prev.map(c => c.id === cat.id
          ? { ...c, name: editingName.trim(), image_url: editingImageUrl.trim() || null }
          : c
        )
      );
      showSuccess('Categoría actualizada correctamente.');
      cancelEditCat();
    } catch (err) {
      console.error('❌ Error guardando categoría:', err);
      showError('No se pudo guardar la categoría.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) {
      showError('El nombre de la categoría es requerido.');
      return;
    }
    setIsAddingCat(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCat.name.trim(),
          image_url: newCat.image_url.trim() || null,
          is_visible: true
        }])
        .select()
        .single();
      if (error) throw error;
      setAllCategories(prev => [...prev, data]);
      setCategories(prev => [...prev, data]);
      showSuccess(`Categoría "${data.name}" creada correctamente.`);
      setNewCat({ name: '', image_url: '' });
    } catch (err) {
      console.error('❌ Error creando categoría:', err);
      showError('No se pudo crear la categoría. Verifica que el nombre sea único.');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) throw error;
      setAllCategories(prev => prev.filter(c => c.id !== cat.id));
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      showSuccess(`Categoría "${cat.name}" eliminada.`);
    } catch (err) {
      console.error('❌ Error eliminando categoría:', err);
      showError('No se pudo eliminar la categoría. Puede que tenga productos asociados.');
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

              <button type="submit" className="admin-submit-btn" disabled={isSubmitting}>
                {isSubmitting
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
                        <p><strong>Cliente:</strong> {profile?.full_name || 'Sin nombre'}</p>
                        <p><strong>Email:</strong> {profile?.email || 'N/A'}</p>
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
                              🔍 Ver comprobante completo
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
                    value={newCat.name}
                    onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Cámaras, Lentes, Iluminación..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>URL de Imagen de Fondo</label>
                  <input
                    type="url"
                    value={newCat.image_url}
                    onChange={e => setNewCat(p => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                  />
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
                    className={`cat-row ${!cat.is_visible ? 'cat-row--hidden' : ''}`}
                  >
                    {/* ── Thumbnail ── */}
                    <div className="cat-row-thumb">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="cat-thumb-img" />
                      ) : (
                        <div className="cat-thumb-placeholder">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>

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
                          <input
                            type="url"
                            className="cat-inline-input cat-inline-input--url"
                            value={editingImageUrl}
                            onChange={e => setEditingImageUrl(e.target.value)}
                            placeholder="URL de imagen (opcional)"
                          />
                        </div>
                      ) : (
                        <div className="cat-row-info">
                          <span className="cat-row-name">{cat.name}</span>
                          {!cat.is_visible && (
                            <span className="cat-hidden-badge">Oculta</span>
                          )}
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

                          {/* Toggle visibility switch */}
                          <button
                            className={`cat-toggle ${cat.is_visible ? 'cat-toggle--visible' : 'cat-toggle--hidden'}`}
                            onClick={() => handleToggleVisibility(cat)}
                            title={cat.is_visible ? 'Ocultar del inicio' : 'Mostrar en el inicio'}
                            aria-label={cat.is_visible ? 'Ocultar categoría' : 'Mostrar categoría'}
                          >
                            <span className="cat-toggle-track">
                              <span className="cat-toggle-thumb" />
                            </span>
                            <span className="cat-toggle-icon">
                              {cat.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </span>
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

      </div>
    </div>
  );
}

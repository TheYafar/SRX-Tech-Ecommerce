import React, { useState, useEffect, useCallback } from 'react';
import { PackagePlus, CheckCircle, XCircle, Image as ImageIcon, DollarSign, UploadCloud, Loader2 } from 'lucide-react';
import { supabase, uploadProductImage } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { useProducts } from '../../context/ProductContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { showSuccess, showError, showInfo } = useNotifications();
  const { addProductToState } = useProducts();
  const [activeTab, setActiveTab] = useState('addProduct'); // 'addProduct', 'payments'
  
  // States for Add Product
  const [productData, setProductData] = useState({
    title: '',
    description: '',
    price_usd: '',
    stock: '',
    features: '',
    category: '',
    category_id: ''
  });
  const [productImage, setProductImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

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

  // States for Payments
  const [pendingPayments, setPendingPayments] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  const fetchPendingPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    console.log("🔍 [AdminDashboard:fetchPendingPayments] Consultando pagos pendientes (relacional) en Supabase...");
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(*, profiles(full_name, email))')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      console.log(`📥 [AdminDashboard:fetchPendingPayments] Pagos pendientes cargados (${data?.length || 0} registros):`, data);
      setPendingPayments(data || []);
    } catch (error) {
      console.error('❌ [AdminDashboard:fetchPendingPayments] Error cargando pagos desde Supabase:', {
        message: error.message,
        details: error
      });
      showError('No se pudieron cargar los pagos pendientes.');
    } finally {
      setIsLoadingPayments(false);
    }
  }, [showError]);

  useEffect(() => {
    let timeoutId;
    if (activeTab === 'payments') {
      timeoutId = setTimeout(() => {
        fetchPendingPayments();
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeTab, fetchPendingPayments]);

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('📷 [AdminDashboard:handleImageChange] Imagen seleccionada:', selectedFile.name, `(${selectedFile.size} bytes)`);
      setProductImage(selectedFile);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    console.log("🚀 [AdminDashboard:handleAddProduct] Iniciando proceso de creación de producto...", productData);

    if (!productData.title || !productData.price_usd || !productImage || !productData.category_id) {
      console.warn("⚠️ [AdminDashboard:handleAddProduct] Faltan campos obligatorios para añadir producto.");
      showError('Por favor completa todos los campos requeridos, incluyendo la categoría y la imagen.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload image to storage
      console.log(`🚀 [AdminDashboard:handleAddProduct] Subiendo imagen: ${productImage.name}`);
      const imageUrl = await uploadProductImage(productImage);
      if (!imageUrl) {
        throw new Error('La función de subida de imagen devolvió nulo.');
      }

      // 2. Parse features if JSON
      let parsedFeatures = {};
      try {
        if (productData.features.trim() !== '') {
          parsedFeatures = JSON.parse(productData.features);
          console.log('⚙️ [AdminDashboard:handleAddProduct] Características JSON parseadas:', parsedFeatures);
        }
      } catch (err) {
        console.warn('⚠️ [AdminDashboard:handleAddProduct] Características no son un JSON válido. Guardando como {}', err);
        showError('Las características deben ser un JSON válido. Guardando como objeto vacío.');
      }

      // 3. Insert into products table
      console.log(`✍️ [AdminDashboard:handleAddProduct] Insertando fila en tabla 'products' de Supabase sin stock...`);
      
      let finalCategoryId = productData.category_id;
      if (finalCategoryId === "" || finalCategoryId === "Seleccionar categoría") {
        finalCategoryId = null;
      }

      const objetoProducto = {
        name: productData.title,
        description: productData.description,
        price_usd: parseFloat(productData.price_usd),
        specifications: parsedFeatures,
        images_urls: [imageUrl],
        category_id: finalCategoryId
      };

      console.log("Datos exactos que se enviarán a Supabase:", objetoProducto);

      const { data: productoCreado, error: productError } = await supabase.from('products').insert([
        objetoProducto
      ]).select('id').single();

      if (productError) {
        throw productError;
      }

      // 4. Register Initial Stock in inventory_transactions
      const stockDelFormulario = parseInt(productData.stock) || 0;
      if (stockDelFormulario > 0) {
        console.log(`📦 [AdminDashboard:handleAddProduct] Registrando stock inicial en inventory_transactions...`);
        const { error: stockError } = await supabase.from('inventory_transactions').insert([
          {
            product_id: productoCreado.id,
            quantity: stockDelFormulario,
            transaction_type: 'adjustment'
          }
        ]);

        if (stockError) {
          throw stockError;
        }
      }

      // 🦴 GRONK ACTUALIZAR ESTADO LOCAL PARA NO RECARGAR!
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

      console.log('✅ [AdminDashboard:handleAddProduct] Producto creado con éxito.');
      showSuccess('Producto añadido correctamente.');
      // Reset form
      setProductData({ title: '', description: '', price_usd: '', stock: '', features: '', category: '', category_id: '' });
      setProductImage(null);
      e.target.reset();
    } catch (error) {
      console.error("Error exacto:", error.message, error.details);
      showError('Ocurrió un error al añadir el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentAction = async (paymentId, newStatus, orderId) => {
    const actionLabel = newStatus === 'completed' ? 'VALIDAR' : 'RECHAZAR';
    const confirmed = window.confirm(`¿Estás seguro de ${actionLabel} este pago? Esta acción actualizará el pago y la orden asociada.`);
    if (!confirmed) return;

    console.log(`🚀 [AdminDashboard:handlePaymentAction] Cambiando estado de pago ID: ${paymentId} a: ${newStatus}`);
    try {
      // 1. Actualizar estado del pago
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (paymentError) {
        throw paymentError;
      }

      // 2. Actualizar estado de la orden asociada
      if (orderId) {
        const orderNewStatus = newStatus === 'completed' ? 'paid' : 'rejected';
        console.log(`🔄 [AdminDashboard:handlePaymentAction] Actualizando orden ID: ${orderId} a: ${orderNewStatus}`);
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: orderNewStatus })
          .eq('id', orderId);

        if (orderError) {
          console.error('⚠️ [AdminDashboard:handlePaymentAction] Error actualizando orden (pago sí se actualizó):', orderError);
          showError('El pago se actualizó, pero hubo un error al actualizar la orden.');
          fetchPendingPayments();
          return;
        }
      }

      console.log(`✅ [AdminDashboard:handlePaymentAction] Pago y orden actualizados correctamente.`);
      showSuccess(`Pago ${newStatus === 'completed' ? 'validado' : 'rechazado'} correctamente.`);
      fetchPendingPayments();
    } catch (error) {
      console.error('❌ [AdminDashboard:handlePaymentAction] Error al actualizar estado del pago en Supabase:', {
        message: error.message,
        details: error
      });
      showError('No se pudo actualizar el estado del pago.');
    }
  };

  return (
    <div className="admin-dashboard-panel animate-fade-in">
      <div className="admin-dashboard-header">
        <h1 className="admin-panel-title">SRX Control Panel</h1>
        <p className="admin-panel-subtitle">Gestión centralizada de operaciones</p>
      </div>

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
      </div>

      <div className="admin-dashboard-content">
        {activeTab === 'addProduct' && (
          <div className="admin-section">
            <h2 className="admin-section-title">Nuevo Producto</h2>
            <form className="admin-form" onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Título del Producto</label>
                <input 
                  type="text" 
                  name="title" 
                  value={productData.title} 
                  onChange={handleProductInputChange} 
                  placeholder="Ej: Sony A7S III" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select 
                  name="category_id" 
                  value={productData.category_id} 
                  onChange={handleProductInputChange} 
                  className="admin-select"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  name="description" 
                  value={productData.description} 
                  onChange={handleProductInputChange} 
                  placeholder="Descripción detallada del producto..."
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio (USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="price_usd" 
                    value={productData.price_usd} 
                    onChange={handleProductInputChange} 
                    placeholder="Ej: 3499.99" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input 
                    type="number" 
                    name="stock" 
                    value={productData.stock} 
                    onChange={handleProductInputChange} 
                    placeholder="Ej: 15" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Características (JSON)</label>
                <textarea 
                  name="features" 
                  value={productData.features} 
                  onChange={handleProductInputChange} 
                  placeholder='{"Resolución": "4K", "Sensor": "Full Frame"}'
                  rows={3}
                  className="font-mono"
                />
              </div>

              <div className="form-group">
                <label>Imagen del Producto</label>
                <div className="file-upload-wrapper">
                  <input 
                    type="file" 
                    id="productImage" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    className="file-input-hidden"
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
                {isSubmitting ? (
                  <><Loader2 size={18} className="spin" /> Guardando...</>
                ) : (
                  <><PackagePlus size={18} /> Añadir Producto al Catálogo</>
                )}
              </button>
            </form>
          </div>
        )}

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
                        <span className="payment-id">Pedido #{order?.id ? String(order.id).substring(0, 8) : 'N/A'}</span>
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
                          <XCircle size={18} />
                          Rechazar
                        </button>
                        <button 
                          className="btn-approve"
                          onClick={() => handlePaymentAction(payment.id, 'completed', order?.id)}
                        >
                          <CheckCircle size={18} />
                          Validar Pago
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

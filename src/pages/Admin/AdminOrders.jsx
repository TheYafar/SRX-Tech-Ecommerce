import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, Search, Loader, PackageOpen, PackageCheck, X, ExternalLink } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { enviarCorreoPagoVerificado, enviarCorreoPedidoListo } from '../../services/emailService';
import './AdminOrders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ordersTab, setOrdersTab] = useState('requests'); // 'requests' | 'active' | 'history'
  const [historySubFilter, setHistorySubFilter] = useState('all'); // 'all' | 'delivered' | 'cancelled'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const navigate = useNavigate();

  // Fetch payment detail dynamically when selectedOrder changes
  useEffect(() => {
    if (!selectedOrder) {
      setPaymentDetail(null);
      return;
    }

    const fetchPaymentDetail = async () => {
      setLoadingPayment(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('proof_image_url, reference_number')
          .eq('order_id', selectedOrder.id)
          .maybeSingle();

        if (error) {
          console.error('[AdminOrders] Error loading payment proof:', error);
          setPaymentDetail(null);
        } else {
          setPaymentDetail(data);
        }
      } catch (err) {
        console.error('[AdminOrders] Exception loading payment proof:', err);
        setPaymentDetail(null);
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentDetail();
  }, [selectedOrder?.id]);

  // Load orders from Supabase with JOIN to profiles, order_items and products
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles(full_name, email), order_items(*, products(*)), payments(*, payment_methods(name))')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[AdminOrders] Error loading orders:', error);
        } else {
          setOrders(data || []);
        }
      } catch (err) {
        console.error('[AdminOrders] Exception loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // View order details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
  };

  // Deliver order -> UPDATE status to 'delivered' in Supabase
  const handleMarkDelivered = async (orderId) => {
    const confirmed = window.confirm('¿Confirmas que este pedido ha sido ENTREGADO al cliente?');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error marking order as delivered:', error);
        alert('Error al actualizar el pedido. Intenta de nuevo.');
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'delivered' } : order
        )
      );

      // Actualizar el modal si está abierto
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'delivered' } : prev);
    } catch (err) {
      console.error('[AdminOrders] Exception marking order as delivered:', err);
      alert('Ocurrió un error inesperado al actualizar el pedido.');
    }
  };

  // Redirect to Payment Verification section
  const handleVerifyPaymentRedirect = (order) => {
    setSelectedOrder(null);
    const isCompleted = ['paid', 'ready', 'shipped', 'delivered', 'cancelled'].includes(order.status);
    navigate('/admin/payments', { 
      state: { 
        searchOrderId: order.id, 
        paymentsFilter: isCompleted ? 'history' : 'pending' 
      } 
    });
  };

  // Approve order -> UPDATE status to 'paid' in Supabase
  const handleApproveOrder = async (orderId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas APROBAR este pedido?');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error approving order:', error);
        alert('Error al aprobar el pedido. Intenta de nuevo.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No se pudo aprobar el pedido. Verifica los permisos de administrador (RLS) en la tabla orders.');
        return;
      }

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'paid' } : order
        )
      );

      // Send payment verified email (background)
      const orderDataForEmail = orders.find(o => o.id === orderId);
      const correoCliente = orderDataForEmail?.profiles?.email || orderDataForEmail?.user_email;
      const nombreCliente = orderDataForEmail?.profiles?.full_name || orderDataForEmail?.user_name || 'Cliente';

      if (correoCliente) {
        enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId)
          .catch(emailError => {
            console.error('[AdminOrders] Error sending payment email:', emailError);
          });
      } else {
        console.warn('[AdminOrders] Client email not found for payment notification.');
      }
    } catch (err) {
      console.error('[AdminOrders] Exception approving order:', err);
      alert('Ocurrió un error inesperado al aprobar el pedido.');
    }
  };

  // Mark order ready -> UPDATE status to 'ready' in Supabase
  const handleMarkReady = async (orderId) => {
    const confirmed = window.confirm('¿Confirmas que este pedido por encargo está LISTO para entrega?');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error marking order as ready:', error);
        alert('Error al actualizar el pedido. Intenta de nuevo.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No se pudo actualizar el pedido. Verifica los permisos de administrador (RLS) en la tabla orders.');
        return;
      }

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'ready' } : order
        )
      );

      // Send order ready email (background)
      const orderDataForReadyEmail = orders.find(o => o.id === orderId);
      const correoClienteReady = orderDataForReadyEmail?.profiles?.email || orderDataForReadyEmail?.user_email;
      const nombreClienteReady = orderDataForReadyEmail?.profiles?.full_name || orderDataForReadyEmail?.user_name || 'Cliente';

      if (correoClienteReady) {
        enviarCorreoPedidoListo(correoClienteReady, nombreClienteReady, orderId)
          .catch(emailError => {
            console.error('[AdminOrders] Error sending order ready email:', emailError);
          });
      } else {
        console.warn('[AdminOrders] Client email not found for order ready notification.');
      }
    } catch (err) {
      console.error('[AdminOrders] Exception marking order as ready:', err);
      alert('Ocurrió un error inesperado al actualizar el pedido.');
    }
  };

  // Reject order -> UPDATE status to 'cancelled' in Supabase
  const handleRejectOrder = async (orderId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas RECHAZAR este pedido? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error rejecting order:', error);
        alert('Error al rechazar el pedido. Intenta de nuevo.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No se pudo rechazar el pedido. Verifica los permisos de administrador (RLS) en la tabla orders.');
        return;
      }

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        )
      );
    } catch (err) {
      console.error('[AdminOrders] Exception rejecting order:', err);
      alert('Ocurrió un error inesperado al rechazar el pedido.');
    }
  };

  // Approve encargo -> UPDATE status to 'processing' in Supabase
  const handleApproveEncargo = async (orderId) => {
    const confirmed = window.confirm('¿Confirmas que deseas APROBAR este encargo? El estado del pedido cambiará a En Proceso.');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error approving encargo:', error);
        alert('Error al aprobar el encargo. Intenta de nuevo.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No se pudo aprobar el encargo. Verifica los permisos de administrador (RLS) en la tabla orders.');
        return;
      }

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'processing' } : order
        )
      );
    } catch (err) {
      console.error('[AdminOrders] Exception approving encargo:', err);
      alert('Ocurrió un error inesperado al aprobar el encargo.');
    }
  };

  // Reject encargo -> UPDATE status to 'cancelled' in Supabase
  const handleRejectEncargo = async (orderId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas RECHAZAR este encargo? Se cancelará el pedido.');
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select();

      if (error) {
        console.error('[AdminOrders] Error rejecting encargo:', error);
        alert('Error al rechazar el encargo. Intenta de nuevo.');
        return;
      }

      if (!data || data.length === 0) {
        alert('No se pudo rechazar el encargo. Verifica los permisos de administrador (RLS) en la tabla orders.');
        return;
      }

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        )
      );
    } catch (err) {
      console.error('[AdminOrders] Exception rejecting encargo:', err);
      alert('Ocurrió un error inesperado al rechazar el encargo.');
    }
  };

  // ── Helpers de formato ──
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '$0.00';
    return `$${Number(amount).toFixed(2)}`;
  };

  const getShortId = (id) => {
    if (!id) return '—';
    return id.slice(-6).toUpperCase();
  };

  const getCustomerName = (order) => {
    return order.profiles?.full_name || order.user_name || order.profiles?.email || order.user_email || 'Cliente Desconocido';
  };

  // ── Helper to detect backorders / encargos ──
  const isOrderEncargo = (order) => {
    const hasOutOfStockItem = order.order_items?.some(item => {
      const stock = item.products?.stock;
      return stock === null || stock === undefined || stock <= 0;
    });
    return order.status === 'pending' || hasOutOfStockItem;
  };

  // ── Mapa de estados para badges (preserva tu CSS actual) ──
  const statusConfig = {
    pending_payment: { label: 'Pendiente', className: 'pending' },
    pending:         { label: 'Pendiente', className: 'pending' },
    approved:        { label: 'Aprobado',  className: 'approved' },
    paid:            { label: 'Pagado',    className: 'approved' },
    processing:      { label: 'En Proceso',className: 'processing' },
    ready:           { label: 'Listo',     className: 'ready' },
    shipped:         { label: 'Enviado',   className: 'shipped' },
    delivered:       { label: 'Entregado', className: 'shipped' },
    cancelled:       { label: 'Cancelado', className: 'cancelled' },
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || { label: status || 'Desconocido', className: 'pending' };
    return config;
  };

  // Calculate orders counts for badges
  const requestsCount = orders.filter(o => ['pending_payment', 'pending'].includes(o.status)).length;
  const activeCount = orders.filter(o => ['processing', 'paid', 'shipped', 'ready'].includes(o.status)).length;
  const historyCount = orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length;

  // ── Filtrado por búsqueda, pestaña y estado ──
  const filteredOrders = orders.filter(order => {
    const items = order.order_items || [];
    const firstItemName = items[0]?.products?.name || '';
    
    const matchesSearch = searchTerm === '' ||
      getShortId(order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(order).toLowerCase().includes(searchTerm.toLowerCase()) ||
      firstItemName.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = false;
    if (ordersTab === 'requests') {
      matchesTab = ['pending_payment', 'pending'].includes(order.status);
    } else if (ordersTab === 'active') {
      matchesTab = ['processing', 'paid', 'shipped', 'ready'].includes(order.status);
    } else if (ordersTab === 'history') {
      matchesTab = ['delivered', 'cancelled'].includes(order.status);
    }

    // Filtrado interno para el historial
    let matchesHistorySubFilter = true;
    if (ordersTab === 'history') {
      if (historySubFilter === 'delivered') {
        matchesHistorySubFilter = order.status === 'delivered';
      } else if (historySubFilter === 'cancelled') {
        matchesHistorySubFilter = order.status === 'cancelled';
      }
    }

    const matchesStatus = statusFilter === 'all' || 
      (statusConfig[order.status]?.className === statusFilter) ||
      order.status === statusFilter;

    return matchesSearch && matchesTab && matchesHistorySubFilter && matchesStatus;
  });

  return (
    <div className="admin-orders animate-fade-in">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Encargos</h1>
          <p className="admin-page-subtitle">Gestiona las ventas y verifica pagos manuales</p>
        </div>
        
        <div className="orders-subtabs">
          <button
            type="button"
            className={`subtab-btn ${ordersTab === 'requests' ? 'active' : ''}`}
            onClick={() => setOrdersTab('requests')}
          >
            Solicitudes de Encargo ({requestsCount})
          </button>
          <button
            type="button"
            className={`subtab-btn ${ordersTab === 'active' ? 'active' : ''}`}
            onClick={() => setOrdersTab('active')}
          >
            Encargos Activos ({activeCount})
          </button>
          <button
            type="button"
            className={`subtab-btn ${ordersTab === 'history' ? 'active' : ''}`}
            onClick={() => setOrdersTab('history')}
          >
            Historial ({historyCount})
          </button>
        </div>
      </div>

      <div className="admin-toolbar-container">
        <div className="admin-toolbar">
          <div className="admin-search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por ID o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="admin-filters">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="shipped">Enviados</option>
              <option value="delivered">Entregados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>

        {ordersTab === 'history' && (
          <div className="history-subfilter-bar">
            <button
              type="button"
              className={`subfilter-pill ${historySubFilter === 'all' ? 'active' : ''}`}
              onClick={() => setHistorySubFilter('all')}
            >
              Todos los Finalizados
            </button>
            <button
              type="button"
              className={`subfilter-pill ${historySubFilter === 'delivered' ? 'active' : ''}`}
              onClick={() => setHistorySubFilter('delivered')}
            >
              Entregados
            </button>
            <button
              type="button"
              className={`subfilter-pill ${historySubFilter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setHistorySubFilter('cancelled')}
            >
              Rechazados
            </button>
          </div>
        )}
      </div>

      <div className="admin-orders-container">
        {loading ? (
          <div className="admin-orders-empty-state">
            <Loader size={40} className="spinner-icon" />
            <p>Cargando encargos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-orders-empty-state">
            <PackageOpen size={48} />
            <p>{searchTerm || statusFilter !== 'all' ? 'No se encontraron encargos con esos filtros.' : 'Aún no hay encargos en esta sección.'}</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map(order => {
              const badge = getStatusBadge(order.status);
              const items = order.order_items || [];
              const firstItemName = items[0]?.products?.name || 'Producto Desconocido';
              const productTitle = items.length > 1 ? `${firstItemName} + ${items.length - 1} más` : firstItemName;
              const isEncargo = isOrderEncargo(order);

              return (
                <div key={order.id} className={`order-card ${isEncargo ? 'is-encargo' : ''}`}>
                  {isEncargo && (
                    <div className="encargo-badge-container">
                      <span className="badge-encargo">POR ENCARGO</span>
                    </div>
                  )}

                  <div className="order-card-header">
                    <h3 className="order-product-title" title={productTitle}>
                      {productTitle}
                    </h3>
                    <span className={`status-badge ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-meta-row">
                      <span className="order-id-label">Encargo #{getShortId(order.id)}</span>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>

                    <div className="order-details-info">
                      <p><strong>Cliente:</strong> {getCustomerName(order)}</p>
                      <p><strong>Email:</strong> {order.profiles?.email || order.user_email || 'N/A'}</p>
                      {order.user_phone && <p><strong>Teléfono:</strong> {order.user_phone}</p>}
                      <p className="order-total-amount"><strong>Total:</strong> <span className="total-price">{formatCurrency(order.total_amount_usd)}</span></p>
                    </div>
                  </div>

                  <div className="order-card-actions">
                    <button className="btn-action view" title="Ver Detalles" onClick={() => handleViewOrder(order)}>
                      <Eye size={16} /> Detalles
                    </button>

                    {ordersTab === 'requests' && (
                      isEncargo ? (
                        <>
                          <button className="btn-action approve-encargo" title="Aprobar Encargo" onClick={() => handleApproveEncargo(order.id)}>
                            <CheckCircle size={16} /> Aprobar Encargo
                          </button>
                          <button className="btn-action reject-encargo" title="Rechazar Encargo" onClick={() => handleRejectEncargo(order.id)}>
                            <XCircle size={16} /> Rechazar Encargo
                          </button>
                        </>
                      ) : (
                        <>
                          {order.payments?.[0] ? (
                            <button className="btn-action verify" title="Verificar Pago" onClick={() => handleVerifyPaymentRedirect(order)}>
                              <Search size={16} /> Verificar Pago
                            </button>
                          ) : (
                            <button className="btn-action approve" title="Aprobar Pago" onClick={() => handleApproveOrder(order.id)}>
                              <CheckCircle size={16} /> Aprobar Pago
                            </button>
                          )}
                          <button className="btn-action reject" title="Rechazar Encargo" onClick={() => handleRejectOrder(order.id)}>
                            <XCircle size={16} /> Rechazar
                          </button>
                        </>
                      )
                    )}

                    {ordersTab === 'active' && (
                      <button className="btn-action deliver" title="Entregar Encargo" onClick={() => handleMarkDelivered(order.id)}>
                        <CheckCircle size={16} /> Entregado
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalles del Pedido */}
      {selectedOrder && (() => {
        const order = selectedOrder;
        const payment = order.payments?.[0];
        const items = order.order_items || [];
        const badge = getStatusBadge(order.status);
        const isEncargo = isOrderEncargo(order);
        
        return (
          <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="order-modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="order-modal-header">
                <div>
                  <h2>Encargo #{getShortId(order.id)}</h2>
                  <span className="order-modal-date">{new Date(order.created_at).toLocaleString('es-VE')}</span>
                </div>
                <div className="header-badge-container">
                  <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                  {isEncargo && <span className="badge-encargo-inline">POR ENCARGO</span>}
                  <button className="btn-modal-close" onClick={() => setSelectedOrder(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="order-modal-body">
                <div className="order-modal-grid" style={{ gridTemplateColumns: payment ? '1fr 1fr' : '1fr' }}>
                  {/* Columna Cliente */}
                  <div className="modal-info-card">
                    <h3>Detalles del Cliente</h3>
                    <div className="info-item">
                      <span>Nombre:</span>
                      <strong>{getCustomerName(order)}</strong>
                    </div>
                    <div className="info-item">
                      <span>Email:</span>
                      <strong>{order.profiles?.email || order.user_email || 'N/A'}</strong>
                    </div>
                    <div className="info-item">
                      <span>Teléfono:</span>
                      <strong>{order.user_phone || 'N/A'}</strong>
                    </div>
                  </div>

                  {/* Columna Pago */}
                  {payment && (
                    <div className="modal-info-card">
                      <h3>Información de Pago</h3>
                      <div className="info-item">
                        <span>Método:</span>
                        <strong>{payment.payment_methods?.name || 'N/A'}</strong>
                      </div>
                      <div className="info-item">
                        <span>Referencia:</span>
                        <strong className="reference-badge-inline">{payment.reference_number || 'N/A'}</strong>
                      </div>
                      <div className="info-item">
                        <span>Estado del Pago:</span>
                        <strong className={`payment-status-text ${payment.status}`}>
                          {payment.status === 'completed' ? 'Aceptado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente de Verificación'}
                        </strong>
                      </div>
                      <div className="info-item">
                        <span>Monto del Pago:</span>
                        <strong>{formatCurrency(payment.amount_paid)} {payment.currency}</strong>
                      </div>

                      {(order.status === 'pending_payment' || order.status === 'pending') && (
                        <button className="btn-modal-action verify-cta" onClick={() => handleVerifyPaymentRedirect(order)}>
                          <ExternalLink size={14} /> Ir a verificar en panel de pagos
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* COMPROBANTE DE PAGO */}
                <div className="modal-info-card">
                  <h3>COMPROBANTE DE PAGO</h3>
                  {loadingPayment ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                      <Loader className="animate-spin text-slate-500" size={16} />
                      <span>Cargando comprobante...</span>
                    </div>
                  ) : paymentDetail?.proof_image_url ? (
                    <div className="flex flex-col gap-3">
                      {paymentDetail.reference_number && (
                        <div className="info-item">
                          <span>Referencia:</span>
                          <strong className="reference-badge-inline">{paymentDetail.reference_number}</strong>
                        </div>
                      )}
                      <div className="proof-image-container mt-2">
                        <img
                          src={paymentDetail.proof_image_url}
                          alt="Comprobante de pago"
                          className="w-full max-h-48 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(paymentDetail.proof_image_url, '_blank')}
                        />
                        <div className="proof-image-link-container mt-2">
                          <button
                            onClick={() => window.open(paymentDetail.proof_image_url, '_blank')}
                            className="proof-image-link text-sky-400 hover:text-sky-300 text-sm font-semibold flex items-center gap-1 bg-sky-950/30 px-3 py-1.5 rounded-md border border-sky-900/30 transition w-fit cursor-pointer"
                          >
                            <Eye size={14} /> Ver comprobante completo
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm italic">
                      No se cargó ningún comprobante para este encargo
                    </span>
                  )}
                </div>

                {/* Lista de Productos */}
                <div className="modal-products-section">
                  <h3>Productos del Encargo</h3>
                  <div className="modal-products-list">
                    {items.map(item => {
                      const product = item.products;
                      const mainImage = product?.images_urls?.[0] || 'https://via.placeholder.com/80';
                      return (
                        <div key={item.id} className="modal-product-item">
                          <img src={mainImage} alt={product?.name} className="modal-product-img" />
                          <div className="modal-product-details">
                            <h4>{product?.name || 'Producto Desconocido'}</h4>
                            <span className="modal-product-stock">Stock actual: {product?.stock ?? 0}</span>
                          </div>
                          <div className="modal-product-math">
                            <span>{item.quantity} x {formatCurrency(item.price_at_purchase_usd)}</span>
                            <strong className="modal-product-subtotal">{formatCurrency(item.quantity * item.price_at_purchase_usd)}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-total-summary">
                  <span>Gran Total:</span>
                  <strong className="modal-total-price">{formatCurrency(order.total_amount_usd)}</strong>
                </div>
              </div>

              <div className="order-modal-footer">
                <div className="footer-actions-left">
                  {ordersTab === 'requests' && (
                    isEncargo ? (
                      <>
                        <button className="btn-action approve-encargo" onClick={() => { handleApproveEncargo(order.id); setSelectedOrder(null); }}>
                          Aprobar Encargo
                        </button>
                        <button className="btn-action reject-encargo" onClick={() => { handleRejectEncargo(order.id); setSelectedOrder(null); }}>
                          Rechazar Encargo
                        </button>
                      </>
                    ) : (
                      <>
                        {payment ? (
                          <button className="btn-action verify" onClick={() => handleVerifyPaymentRedirect(order)}>
                            Verificar Pago
                          </button>
                        ) : (
                          <button className="btn-action approve" onClick={() => { handleApproveOrder(order.id); setSelectedOrder(null); }}>
                            Aprobar Pago
                          </button>
                        )}
                        <button className="btn-action reject" onClick={() => { handleRejectOrder(order.id); setSelectedOrder(null); }}>
                          Rechazar Encargo
                        </button>
                      </>
                    )
                  )}
                  {ordersTab === 'active' && (
                    <button className="btn-action deliver" onClick={() => { handleMarkDelivered(order.id); setSelectedOrder(null); }}>
                      Entregar Pedido
                    </button>
                  )}
                </div>
                <button className="btn-close-modal-footer" onClick={() => setSelectedOrder(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

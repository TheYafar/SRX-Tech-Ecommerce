import { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Search, Loader, PackageOpen, PackageCheck } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { enviarCorreoPagoVerificado, enviarCorreoPedidoListo } from '../../services/emailService';
import './AdminOrders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Fetch órdenes reales desde Supabase con JOIN a profiles ──
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [AdminOrders] Error cargando órdenes:', error);
        } else {
          setOrders(data || []);
        }
      } catch (err) {
        console.error('💥 [AdminOrders] Excepción al cargar órdenes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // ── 👁️ Ver detalles de la orden (prepara futuro modal) ──
  const handleViewOrder = (order) => {
    console.log('👁️ [AdminOrders] Detalle completo de la orden:', order);
  };

  // ── ✅ Aprobar orden → UPDATE status a 'paid' en Supabase ──
  const handleApproveOrder = async (orderId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas APROBAR este pedido?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      if (error) {
        console.error('❌ [AdminOrders] Error al aprobar orden:', error);
        alert('Error al aprobar el pedido. Intenta de nuevo.');
        return;
      }

      // Actualizar estado local sin recargar
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'paid' } : order
        )
      );
      console.log(`✅ [AdminOrders] Orden ${orderId} aprobada exitosamente.`);

      // ── 📧 Disparo de correo de pago verificado ──────────────
      try {
        const orderData = orders.find(o => o.id === orderId);
        const correoCliente = orderData?.profiles?.email || orderData?.user_email;
        const nombreCliente = orderData?.profiles?.full_name || orderData?.user_name || 'Cliente';

        if (correoCliente) {
          const res = await enviarCorreoPagoVerificado(correoCliente, nombreCliente, orderId);
          console.log('📧 [AdminOrders] Envío de correo de pago exitoso. ID:', res.id);
        } else {
          console.warn('⚠️ [AdminOrders] No se encontró email del cliente para notificación de pago.');
        }
      } catch (emailError) {
        console.error('📧❌ [AdminOrders] Error al enviar correo de pago (no afecta la orden):', emailError);
      }
    } catch (err) {
      console.error('💥 [AdminOrders] Excepción al aprobar orden:', err);
      alert('Ocurrió un error inesperado al aprobar el pedido.');
    }
  };

  // ── 📦 Marcar pedido como LISTO → UPDATE status a 'ready' en Supabase ──
  const handleMarkReady = async (orderId) => {
    const confirmed = window.confirm('¿Confirmas que este pedido por encargo está LISTO para entrega?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) {
        console.error('❌ [AdminOrders] Error al marcar orden como lista:', error);
        alert('Error al actualizar el pedido. Intenta de nuevo.');
        return;
      }

      // Actualizar estado local sin recargar
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'ready' } : order
        )
      );
      console.log(`📦 [AdminOrders] Orden ${orderId} marcada como lista exitosamente.`);

      // ── 📧 Disparo de correo de pedido listo ──────────────
      try {
        const orderData = orders.find(o => o.id === orderId);
        const correoCliente = orderData?.profiles?.email || orderData?.user_email;
        const nombreCliente = orderData?.profiles?.full_name || orderData?.user_name || 'Cliente';

        if (correoCliente) {
          const res = await enviarCorreoPedidoListo(correoCliente, nombreCliente, orderId);
          console.log('📧 [AdminOrders] Envío de correo de pedido listo exitoso. ID:', res.id);
        } else {
          console.warn('⚠️ [AdminOrders] No se encontró email del cliente para notificación de pedido listo.');
        }
      } catch (emailError) {
        console.error('📧❌ [AdminOrders] Error al enviar correo de pedido listo (no afecta la orden):', emailError);
      }
    } catch (err) {
      console.error('💥 [AdminOrders] Excepción al marcar orden como lista:', err);
      alert('Ocurrió un error inesperado al actualizar el pedido.');
    }
  };

  // ── ❌ Rechazar orden → UPDATE status a 'cancelled' en Supabase ──
  const handleRejectOrder = async (orderId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas RECHAZAR este pedido? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) {
        console.error('❌ [AdminOrders] Error al rechazar orden:', error);
        alert('Error al rechazar el pedido. Intenta de nuevo.');
        return;
      }

      // Actualizar estado local sin recargar
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        )
      );
      console.log(`🚫 [AdminOrders] Orden ${orderId} rechazada exitosamente.`);
    } catch (err) {
      console.error('💥 [AdminOrders] Excepción al rechazar orden:', err);
      alert('Ocurrió un error inesperado al rechazar el pedido.');
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
    return id.substring(0, 8).toUpperCase();
  };

  const getCustomerName = (order) => {
    return order.profiles?.full_name || order.user_name || order.profiles?.email || order.user_email || 'Cliente Desconocido';
  };

  // ── Mapa de estados para badges (preserva tu CSS actual) ──
  const statusConfig = {
    pending_payment: { label: 'Pendiente', className: 'pending' },
    pending:         { label: 'Pendiente', className: 'pending' },
    approved:        { label: 'Aprobado',  className: 'approved' },
    paid:            { label: 'Pagado',    className: 'approved' },
    ready:           { label: 'Listo',     className: 'ready' },
    shipped:         { label: 'Enviado',   className: 'shipped' },
    delivered:       { label: 'Entregado', className: 'shipped' },
    cancelled:       { label: 'Cancelado', className: 'cancelled' },
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || { label: status || 'Desconocido', className: 'pending' };
    return config;
  };

  // ── Filtrado por búsqueda y estado ──
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      getShortId(order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(order).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusConfig[order.status]?.className === statusFilter) ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-orders animate-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pedidos</h1>
        <p className="admin-page-subtitle">Gestiona las ventas y verifica pagos manuales</p>
      </div>

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
          </select>
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <div className="admin-orders-empty-state">
            <Loader size={40} className="spinner-icon" />
            <p>Cargando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-orders-empty-state">
            <PackageOpen size={48} />
            <p>{searchTerm || statusFilter !== 'all' ? 'No se encontraron pedidos con esos filtros.' : 'Aún no hay pedidos registrados.'}</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const badge = getStatusBadge(order.status);
                return (
                  <tr key={order.id}>
                    <td className="font-mono font-medium">{getShortId(order.id)}</td>
                    <td>{getCustomerName(order)}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="font-bold">{formatCurrency(order.total_amount_usd)}</td>
                    <td>
                      <span className={`status-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon view" title="Ver Detalles" onClick={() => handleViewOrder(order)}><Eye size={18} /></button>
                        {(order.status === 'pending_payment' || order.status === 'pending') && (
                          <>
                            <button className="btn-icon approve" title="Aprobar Pago" onClick={() => handleApproveOrder(order.id)}><CheckCircle size={18} /></button>
                            <button className="btn-icon reject" title="Rechazar" onClick={() => handleRejectOrder(order.id)}><XCircle size={18} /></button>
                          </>
                        )}
                        {order.status === 'paid' && (
                          <button className="btn-icon ready" title="Marcar como Listo" onClick={() => handleMarkReady(order.id)}><PackageCheck size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

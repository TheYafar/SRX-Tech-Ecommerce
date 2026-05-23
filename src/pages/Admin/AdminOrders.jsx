import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Search } from 'lucide-react';
import './AdminOrders.css';

export default function AdminOrders() {
  const [orders, setOrders] = useState([
    { id: 'SRX-847291', customer: 'Juan Pérez', date: '2026-05-23', total: 1250.00, method: 'Binance', status: 'pending' },
    { id: 'SRX-193847', customer: 'Maria Gómez', date: '2026-05-22', total: 345.50, method: 'Pago Móvil', status: 'approved' },
    { id: 'SRX-572910', customer: 'Carlos Silva', date: '2026-05-20', total: 89.99, method: 'PayPal', status: 'shipped' },
  ]);

  return (
    <div className="admin-orders animate-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Pedidos</h1>
        <p className="admin-page-subtitle">Gestiona las ventas y verifica pagos manuales</p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input type="text" placeholder="Buscar por ID o cliente..." />
        </div>
        <div className="admin-filters">
          <select>
            <option>Todos los estados</option>
            <option>Pendientes</option>
            <option>Aprobados</option>
            <option>Enviados</option>
          </select>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Método</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td className="font-mono font-medium">{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.date}</td>
                <td>
                  <span className={`method-badge ${order.method.toLowerCase().replace(' ', '-')}`}>
                    {order.method}
                  </span>
                </td>
                <td className="font-bold">${order.total.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status === 'pending' ? 'Pendiente' : order.status === 'approved' ? 'Aprobado' : 'Enviado'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon view" title="Ver Detalles"><Eye size={18} /></button>
                    {order.status === 'pending' && (
                      <>
                        <button className="btn-icon approve" title="Aprobar Pago"><CheckCircle size={18} /></button>
                        <button className="btn-icon reject" title="Rechazar"><XCircle size={18} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

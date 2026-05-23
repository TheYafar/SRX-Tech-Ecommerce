import React from 'react';
import { ShoppingBag, Users, DollarSign, Activity } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard animate-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Resumen de actividad de la tienda</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ventas del Mes</span>
            <span className="stat-value">$12,450.00</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pedidos Nuevos</span>
            <span className="stat-value">45</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Nuevos Clientes</span>
            <span className="stat-value">128</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tasa de Conversión</span>
            <span className="stat-value">3.2%</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-recent">
        <h2>Actividad Reciente</h2>
        <p>El dashboard completo estará conectado pronto a Supabase.</p>
      </div>
    </div>
  );
}

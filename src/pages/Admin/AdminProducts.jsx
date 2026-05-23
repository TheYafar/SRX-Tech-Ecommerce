import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { productService } from '../../services/productService';
import './AdminProducts.css';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getProducts().then(data => setProducts(data));
  }, []);

  return (
    <div className="admin-products animate-fade-in">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Catálogo</h1>
        <p className="admin-page-subtitle">Gestiona tu inventario, precios y ofertas</p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input type="text" placeholder="Buscar productos..." />
        </div>
        <button className="btn-primary">
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Precio Oferta</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>
                  <div className="product-cell">
                    <img src={product.image} alt={product.name} className="product-cell-img" />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td>{product.category}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>{product.salePrice ? `$${product.salePrice.toFixed(2)}` : '-'}</td>
                <td>
                  <span className="stock-badge in-stock">En Stock</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon edit" title="Editar"><Edit2 size={18} /></button>
                    <button className="btn-icon delete" title="Eliminar"><Trash2 size={18} /></button>
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

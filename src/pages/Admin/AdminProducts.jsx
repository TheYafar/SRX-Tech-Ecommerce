import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Save, Loader } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { supabase } from '../../utils/supabaseClient';
import './AdminProducts.css';

export default function AdminProducts() {
  const { products, isLoading: contextLoading, setProducts } = useProducts();

  // ── Estado local para operaciones CRUD ──
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Estado local del formulario de edición ──
  const [formData, setFormData] = useState({
    nombre: '',
    precioNormal: '',
    precioOferta: '',
    stock: '',
    fechaOferta: '',
    masVendido: false,
  });

  // ── Filtrado de productos por búsqueda ──
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ================================================================
  // handleDelete — Eliminar producto con confirmación
  // ================================================================
  const handleDelete = async (id) => {
    const confirmar = window.confirm(
      '🗑️ ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.'
    );
    if (!confirmar) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // ✅ Actualizar estado local filtrando el producto eliminado
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error BD:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // handleEdit — Abrir modal precargado con los datos del producto
  // ================================================================
  const handleEdit = (producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.name || '',
      precioNormal: producto.price_usd || producto.price || '',
      precioOferta: producto.compare_at_price_usd || producto.compareAtPrice || '',
      stock: producto.stock || 0,
      fechaOferta: producto.offer_ends_at || producto.offerEndsAt || '',
      masVendido: producto.is_best_seller || producto.isBestSeller || false,
    });
  };

  // ================================================================
  // handleUpdate — Guardar cambios en Supabase (REGLAS CRÍTICAS)
  // ================================================================
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ── Sanitización: comas → puntos ──
      const safePrice = parseFloat(String(formData.precioNormal).replace(',', '.'));
      const safeOfferPrice = formData.precioOferta
        ? parseFloat(String(formData.precioOferta).replace(',', '.'))
        : null;

      // ── Payload exacto (campos = columnas de la BD) ──
      const payload = {
        name: formData.nombre,
        price_usd: safePrice,                     // NO USAR 'price'
        compare_at_price_usd: safeOfferPrice,
        stock: Number(formData.stock),
        offer_ends_at: formData.fechaOferta || null,
        is_best_seller: Boolean(formData.masVendido),
      };

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (error) throw error;

      // ✅ Actualizar estado local con los cambios
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: payload.name,
                price_usd: payload.price_usd,
                price: payload.price_usd,
                compare_at_price_usd: payload.compare_at_price_usd,
                compareAtPrice: payload.compare_at_price_usd,
                stock: payload.stock,
                offer_ends_at: payload.offer_ends_at,
                offerEndsAt: payload.offer_ends_at,
                is_best_seller: payload.is_best_seller,
                isBestSeller: payload.is_best_seller,
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error BD:', error);
      alert('Error: ' + error.message);
    } finally {
      // ✅ CRÍTICO: Siempre liberar la pantalla y cerrar modal
      setIsLoading(false);
      setEditingProduct(null);
    }
  };

  // ── Helper: Badge de stock ──
  const getStockBadge = (stock) => {
    if (stock <= 0) return { className: 'out-of-stock', text: 'Agotado' };
    if (stock <= 5) return { className: 'low-stock', text: `Quedan ${stock}` };
    return { className: 'in-stock', text: 'En Stock' };
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="admin-products animate-fade-in">
      {/* ── Loading Overlay global ── */}
      {isLoading && (
        <div className="admin-products-loading-overlay">
          <div className="spinner" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Catálogo</h1>
        <p className="admin-page-subtitle">Gestiona tu inventario, precios y ofertas</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary">
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* ── Tabla de productos ── */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio USD</th>
              <th>Precio Oferta</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && !contextLoading ? (
              <tr>
                <td colSpan="6">
                  <div className="admin-empty-state">
                    <p>No se encontraron productos</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const stockInfo = getStockBadge(product.stock);
                const hasOffer = product.compareAtPrice || product.compare_at_price_usd;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-cell-img"
                        />
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.category || 'General'}</td>
                    <td>
                      <span className={`price-cell${hasOffer ? ' has-offer' : ''}`}>
                        ${(product.price_usd || product.price || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {hasOffer ? (
                        <span className="offer-price-cell">
                          ${(product.compare_at_price_usd || product.compareAtPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`stock-badge ${stockInfo.className}`}>
                        {stockInfo.text}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon edit"
                          title="Editar"
                          onClick={() => handleEdit(product)}
                          disabled={isLoading}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Eliminar"
                          onClick={() => handleDelete(product.id)}
                          disabled={isLoading}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================================================================
          MODAL DE EDICIÓN
          ================================================================ */}
      {editingProduct && (
        <div
          className="edit-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              setEditingProduct(null);
            }
          }}
        >
          <div className="edit-modal">
            {/* ── Header ── */}
            <div className="edit-modal-header">
              <h2>Editar Producto</h2>
              <button
                className="edit-modal-close"
                onClick={() => setEditingProduct(null)}
                disabled={isLoading}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Formulario ── */}
            <form onSubmit={handleUpdate}>
              <div className="edit-modal-body">
                {/* Nombre */}
                <div className="edit-form-group">
                  <label htmlFor="edit-nombre">Nombre</label>
                  <input
                    id="edit-nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Nombre del producto"
                    required
                  />
                </div>

                {/* Precio Normal + Precio Oferta */}
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label htmlFor="edit-precio">Precio Normal USD</label>
                    <input
                      id="edit-precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precioNormal}
                      onChange={(e) =>
                        setFormData({ ...formData, precioNormal: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="edit-oferta">Precio de Oferta USD</label>
                    <input
                      id="edit-oferta"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precioOferta}
                      onChange={(e) =>
                        setFormData({ ...formData, precioOferta: e.target.value })
                      }
                      placeholder="0.00 (opcional)"
                    />
                  </div>
                </div>

                {/* Stock + Fecha Límite */}
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label htmlFor="edit-stock">Stock</label>
                    <input
                      id="edit-stock"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="edit-fecha">Fecha Límite Oferta</label>
                    <input
                      id="edit-fecha"
                      type="datetime-local"
                      value={formData.fechaOferta}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaOferta: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Checkbox: Más Vendido */}
                <label className="edit-form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.masVendido}
                    onChange={(e) =>
                      setFormData({ ...formData, masVendido: e.target.checked })
                    }
                  />
                  <div>
                    <div className="checkbox-label">¿Es un producto Más Vendido?</div>
                    <div className="checkbox-hint">Aparecerá en la sección de Best Sellers</div>
                  </div>
                </label>
              </div>

              {/* ── Footer: Botones ── */}
              <div className="edit-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingProduct(null)}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader size={18} className="spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

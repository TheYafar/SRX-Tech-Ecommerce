import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Save, Loader, Tag } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { supabase } from '../../utils/supabaseClient';
import './AdminProducts.css';

// ================================================================
// Opciones predefinidas para los tags de Dimensiones SmallRig
// ================================================================
const COMPATIBLE_DEVICES = [
  'DJI Osmo Action 4',
  'Osmo Pocket 3',
  'DJI Mic Mini',
  'Smartphones / iPhone',
  'Cámaras Sony Alpha',
  'Cámaras Canon',
];

const USE_SCENARIOS = [
  'Vlogging en Exteriores',
  'Streaming & Podcast',
  'Contenido Vertical / Cine Móvil',
  'Fotografía de Paisaje',
  'Producción de Video Premium',
];

// ================================================================
// Helper: generar slug limpio (sin acentos, minúsculas, guiones)
// ================================================================
function generateSlug(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // solo alfanumérico
    .replace(/\s+/g, '-')              // espacios → guiones
    .replace(/-+/g, '-');              // guiones dobles → uno
}

// ================================================================
// Sub-componente: TagSelector
// ================================================================
function TagSelector({ title, options, selected, onChange }) {
  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="tag-selector-section">
      <div className="tag-selector-header">
        <Tag size={14} />
        <span>{title}</span>
        {selected.length > 0 && (
          <span className="tag-count-badge">{selected.length}</span>
        )}
      </div>
      <div className="tag-pills-container">
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`tag-pill${isActive ? ' tag-pill--active' : ''}`}
              onClick={() => toggle(opt)}
              title={isActive ? 'Clic para deseleccionar' : 'Clic para seleccionar'}
            >
              {isActive && <span className="tag-check">✓</span>}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// Sub-componente: CategoryModal
// ================================================================
function CategoryModal({ onClose, onCreated }) {
  const [categoryName, setCategoryName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (e) => {
    const val = e.target.value;
    setCategoryName(val);
    setSlug(generateSlug(val));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsSaving(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert([{ name: categoryName.trim(), slug }])
        .select()
        .single();

      if (insertError) throw insertError;

      // ✅ Devolver la nueva categoría al padre
      onCreated(data);
    } catch (err) {
      console.error('❌ [CategoryModal] Error creando categoría:', err);
      setError(err.message || 'Error al crear la categoría');
    } finally {
      setIsSaving(false);
    }
  };

  // Cerrar con Escape
  const handleBackdropKey = useCallback((e) => {
    if (e.key === 'Escape' && !isSaving) onClose();
  }, [isSaving, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleBackdropKey);
    return () => document.removeEventListener('keydown', handleBackdropKey);
  }, [handleBackdropKey]);

  return (
    <div
      className="cat-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div className="cat-modal" role="dialog" aria-modal="true" aria-label="Nueva Categoría">
        {/* Header */}
        <div className="cat-modal-header">
          <h3>Nueva Categoría</h3>
          <button
            className="cat-modal-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="cat-modal-body">
          <div className="edit-form-group">
            <label htmlFor="cat-name">Nombre de la categoría</label>
            <input
              id="cat-name"
              type="text"
              value={categoryName}
              onChange={handleNameChange}
              placeholder="ej: Trípodes Profesionales"
              autoFocus
              required
            />
          </div>

          {/* Preview del slug */}
          {slug && (
            <div className="cat-slug-preview">
              <span className="cat-slug-label">Slug generado:</span>
              <code className="cat-slug-value">/{slug}</code>
            </div>
          )}

          {/* Error */}
          {error && <p className="cat-modal-error">{error}</p>}

          {/* Footer */}
          <div className="cat-modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={isSaving || !categoryName.trim()}
            >
              {isSaving ? (
                <><Loader size={15} className="spin" /><span>Creando...</span></>
              ) : (
                <><Plus size={15} /><span>Crear Categoría</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL: AdminProducts
// ================================================================
export default function AdminProducts() {
  const { products, isLoading: contextLoading, setProducts } = useProducts();

  // ── Estado de operaciones ──
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Categorías ──
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // ── Formulario de edición ──
  const [formData, setFormData] = useState({
    nombre: '',
    precioNormal: '',
    precioOferta: '',
    stock: '',
    fechaOferta: '',
    masVendido: false,
    categoria: '',
    compatibleDevices: [],
    useScenarios: [],
  });

  // ── Cargar categorías al montar ──
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('❌ [AdminProducts] Error cargando categorías:', err);
      }
    };
    loadCategories();
  }, []);

  // ── Filtrado de productos ──
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ================================================================
  // handleDelete
  // ================================================================
  const handleDelete = async (id) => {
    const confirmar = window.confirm(
      '🗑️ ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.'
    );
    if (!confirmar) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error BD:', error);
      alert('Error al eliminar: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================
  // handleEdit — Abre modal con datos precargados
  // ================================================================
  const handleEdit = (producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.name || '',
      precioNormal: producto.price_usd ?? producto.price ?? '',
      precioOferta: producto.compare_at_price_usd ?? producto.compareAtPrice ?? '',
      stock: producto.stock ?? 0,
      fechaOferta: producto.offer_ends_at ?? producto.offerEndsAt ?? '',
      masVendido: producto.is_best_seller ?? producto.isBestSeller ?? false,
      categoria: producto.category_id ?? producto.category ?? '',
      compatibleDevices: Array.isArray(producto.compatible_devices)
        ? producto.compatible_devices
        : [],
      useScenarios: Array.isArray(producto.use_scenarios)
        ? producto.use_scenarios
        : [],
    });
  };

  // ================================================================
  // handleUpdate — Guarda en Supabase (payload con arrays)
  // ================================================================
  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const safePrice = parseFloat(String(formData.precioNormal).replace(',', '.'));
      const safeOfferPrice = formData.precioOferta
        ? parseFloat(String(formData.precioOferta).replace(',', '.'))
        : null;

      const payload = {
        name: formData.nombre,
        price_usd: safePrice,
        compare_at_price_usd: safeOfferPrice,
        stock: Number(formData.stock),
        offer_ends_at: formData.fechaOferta || null,
        is_best_seller: Boolean(formData.masVendido),
        // Nuevas columnas de arrays
        compatible_devices: formData.compatibleDevices,
        use_scenarios: formData.useScenarios,
        // Categoría (si viene como id numérico o slug de texto)
        ...(formData.categoria
          ? isNaN(formData.categoria)
            ? { category: formData.categoria }
            : { category_id: Number(formData.categoria) }
          : {}),
      };

      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (error) throw error;

      // ✅ Actualizar estado local
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
                compatible_devices: payload.compatible_devices,
                use_scenarios: payload.use_scenarios,
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error BD:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
      setEditingProduct(null);
    }
  };

  // ================================================================
  // handleCategoryCreated — Inyecta categoría nueva y la selecciona
  // ================================================================
  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
    setFormData((prev) => ({ ...prev, categoria: String(newCat.id) }));
    setShowCategoryModal(false);
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
      {/* ── Loading Overlay ── */}
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
                    <td>{product.category || '—'}</td>
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
            if (e.target === e.currentTarget && !isLoading) setEditingProduct(null);
          }}
        >
          <div className="edit-modal">
            {/* Header */}
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

            <form onSubmit={handleUpdate}>
              <div className="edit-modal-body">

                {/* ── Nombre ── */}
                <div className="edit-form-group">
                  <label htmlFor="edit-nombre">Nombre</label>
                  <input
                    id="edit-nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del producto"
                    required
                  />
                </div>

                {/* ── Categoría + Botón Nueva ── */}
                <div className="edit-form-group">
                  <label htmlFor="edit-categoria">Categoría</label>
                  <div className="category-select-row">
                    <select
                      id="edit-categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="category-select"
                    >
                      <option value="">— Sin categoría —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-new-category"
                      onClick={() => setShowCategoryModal(true)}
                      title="Crear nueva categoría"
                    >
                      <Plus size={14} />
                      <span>Nueva</span>
                    </button>
                  </div>
                </div>

                {/* ── Precios ── */}
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label htmlFor="edit-precio">Precio Normal USD</label>
                    <input
                      id="edit-precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precioNormal}
                      onChange={(e) => setFormData({ ...formData, precioNormal: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, precioOferta: e.target.value })}
                      placeholder="0.00 (opcional)"
                    />
                  </div>
                </div>

                {/* ── Stock + Fecha ── */}
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label htmlFor="edit-stock">Stock</label>
                    <input
                      id="edit-stock"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, fechaOferta: e.target.value })}
                    />
                  </div>
                </div>

                {/* ── TAGS: Equipos Compatibles ── */}
                <TagSelector
                  title="Equipos Compatibles"
                  options={COMPATIBLE_DEVICES}
                  selected={formData.compatibleDevices}
                  onChange={(val) => setFormData({ ...formData, compatibleDevices: val })}
                />

                {/* ── TAGS: Escenarios de Uso ── */}
                <TagSelector
                  title="Escenarios de Uso"
                  options={USE_SCENARIOS}
                  selected={formData.useScenarios}
                  onChange={(val) => setFormData({ ...formData, useScenarios: val })}
                />

                {/* ── Checkbox: Más Vendido ── */}
                <label className="edit-form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.masVendido}
                    onChange={(e) => setFormData({ ...formData, masVendido: e.target.checked })}
                  />
                  <div>
                    <div className="checkbox-label">¿Es un producto Más Vendido?</div>
                    <div className="checkbox-hint">Aparecerá en la sección de Best Sellers</div>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="edit-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingProduct(null)}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader size={18} className="spin" /><span>Guardando...</span></>
                  ) : (
                    <><Save size={18} /><span>Guardar Cambios</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Categorías (flotante encima del modal de edición) ── */}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}

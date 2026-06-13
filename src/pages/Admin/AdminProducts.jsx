import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Save, Loader, Tag, UploadCloud, PackagePlus } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { supabase, uploadProductImage } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import './AdminProducts.css';

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
// Sub-componente: DynamicTagInput
// ================================================================
function DynamicTagInput({ title, placeholder, tags = [], onChange }) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd(e);
    }
  };

  const handleRemove = (tagToRemove) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="dynamic-tag-section">
      <div className="dynamic-tag-header">
        <Tag size={14} />
        <span>{title}</span>
        {tags.length > 0 && (
          <span className="tag-count-badge">{tags.length}</span>
        )}
      </div>
      <div className="dynamic-tag-input-row">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Escribe un item y presiona Añadir"}
          className="dynamic-tag-input-field"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="btn-add-tag"
        >
          Añadir
        </button>
      </div>
      <div className="dynamic-tags-list">
        {tags.map((tag, idx) => (
          <span key={idx} className="dynamic-tag-badge">
            <span className="dynamic-tag-text">{tag}</span>
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              className="btn-remove-tag"
              title="Eliminar"
            >
              <X size={12} />
            </button>
          </span>
        ))}
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
  const { products, isLoading: contextLoading, setProducts, fetchProducts, addProductToState } = useProducts();
  const { showSuccess, showError } = useNotifications();

  // ── Estado de operaciones ──
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Categorías ──
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // ── Estado para el modal de Nuevo Producto ──
  const [showProductForm, setShowProductForm] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    sku: '',
    description: '',
    price_usd: '',
    stock: '',
    category_id: '',
    compatible_devices: [],
    use_scenarios: [],
  });
  const [newProductImage, setNewProductImage] = useState(null);

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
    // Si estamos en edición, seleccionar la nueva categoría ahí
    if (editingProduct) {
      setFormData((prev) => ({ ...prev, categoria: String(newCat.id) }));
    }
    // Si estamos en creación, seleccionar la nueva categoría ahí
    if (showProductForm) {
      setNewProductData((prev) => ({ ...prev, category_id: String(newCat.id) }));
    }
    setShowCategoryModal(false);
  };

  // ================================================================
  // handleAddNewProduct — Inserta producto nuevo en Supabase
  // ================================================================
  const handleAddNewProduct = async (e) => {
    e.preventDefault();

    if (!newProductData.name.trim()) {
      showError('El nombre del producto es obligatorio.');
      return;
    }
    if (!newProductData.price_usd || parseFloat(newProductData.price_usd) <= 0) {
      showError('Ingresa un precio válido mayor a 0.');
      return;
    }
    if (!newProductData.category_id) {
      showError('Selecciona una categoría para el producto.');
      return;
    }
    if (!newProductImage) {
      showError('Sube una imagen para el producto.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      // 1. Subir imagen al Storage
      const imageUrl = await uploadProductImage(newProductImage);
      if (!imageUrl) throw new Error('Error al subir la imagen del producto.');

      // 2. Insertar en Supabase
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: newProductData.name.trim(),
          sku: newProductData.sku.trim() || null,
          description: newProductData.description.trim() || null,
          price_usd: parseFloat(newProductData.price_usd),
          stock: parseInt(newProductData.stock) || 0,
          category_id: Number(newProductData.category_id),
          compatible_devices: newProductData.compatible_devices,
          use_scenarios: newProductData.use_scenarios,
          images_urls: [imageUrl],
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Éxito: agregar al estado local y cerrar modal
      addProductToState({
        ...data,
        image: imageUrl,
        price: parseFloat(newProductData.price_usd),
        salePrice: null,
        tagline: newProductData.description ? newProductData.description.substring(0, 50) + '...' : '',
        stock: parseInt(newProductData.stock) || 0,
        compareAtPrice: null,
        offerEndsAt: null,
        isBestSeller: false,
      });

      showSuccess('🐵 ¡Producto creado exitosamente!');
      setShowProductForm(false);
      setNewProductData({
        name: '', sku: '', description: '', price_usd: '',
        stock: '', category_id: '', compatible_devices: [], use_scenarios: [],
      });
      setNewProductImage(null);

      // Refrescar la lista completa de fondo
      fetchProducts();
    } catch (error) {
      console.error('❌ [AdminProducts] Error creando producto:', error);
      showError(error.message || 'No se pudo crear el producto. Intenta de nuevo.');
    } finally {
      setIsSubmittingNew(false);
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
        <button className="btn-primary" onClick={() => setShowProductForm(true)}>
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

                {/* ── TAGS: Para tu equipo (→ compatible_devices) ── */}
                <DynamicTagInput
                  title="Para tu equipo"
                  placeholder="Ej: DJI Osmo Action 4, iPhone..."
                  tags={formData.compatibleDevices}
                  onChange={(val) => setFormData({ ...formData, compatibleDevices: val })}
                />

                {/* ── TAGS: Por producto (→ use_scenarios) ── */}
                <DynamicTagInput
                  title="Por producto"
                  placeholder="Ej: Iluminación LED, Monopod..."
                  tags={formData.useScenarios}
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

      {/* ================================================================
          MODAL DE CREACIÓN DE NUEVO PRODUCTO
          ================================================================ */}
      {showProductForm && (
        <div
          className="create-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget && !isSubmittingNew) setShowProductForm(false); }}
        >
          <div className="create-modal" role="dialog" aria-modal="true" aria-label="Nuevo Producto">
            {/* Header */}
            <div className="create-modal-header">
              <div className="create-modal-title-group">
                <PackagePlus size={22} className="create-modal-icon" />
                <h2>Nuevo Producto</h2>
              </div>
              <button
                className="create-modal-close"
                onClick={() => setShowProductForm(false)}
                disabled={isSubmittingNew}
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewProduct}>
              <div className="create-modal-body">

                {/* ── Nombre del Producto ── */}
                <div className="edit-form-group">
                  <label htmlFor="new-name">Nombre del Producto</label>
                  <input
                    id="new-name"
                    type="text"
                    value={newProductData.name}
                    onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                    placeholder="Ej: SmallRig Cage para Sony A7S III"
                    required
                  />
                </div>

                {/* ── SKU ── */}
                <div className="edit-form-group">
                  <label htmlFor="new-sku">SKU</label>
                  <input
                    id="new-sku"
                    type="text"
                    value={newProductData.sku}
                    onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                    placeholder="Ej: SRX-CGE-A7S3"
                  />
                </div>

                {/* ── Descripción ── */}
                <div className="edit-form-group">
                  <label htmlFor="new-description">Descripción</label>
                  <textarea
                    id="new-description"
                    value={newProductData.description}
                    onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                    placeholder="Descripción detallada del producto..."
                    rows={3}
                    className="create-textarea"
                  />
                </div>

                {/* ── Precio + Stock ── */}
                <div className="edit-form-row">
                  <div className="edit-form-group">
                    <label htmlFor="new-price">Precio (USD)</label>
                    <input
                      id="new-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProductData.price_usd}
                      onChange={(e) => setNewProductData({ ...newProductData, price_usd: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="new-stock">Stock Inicial</label>
                    <input
                      id="new-stock"
                      type="number"
                      step="1"
                      min="0"
                      value={newProductData.stock}
                      onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* ── Categoría + Botón Nueva ── */}
                <div className="edit-form-group">
                  <label htmlFor="new-category">Categoría</label>
                  <div className="category-select-row">
                    <select
                      id="new-category"
                      value={newProductData.category_id}
                      onChange={(e) => setNewProductData({ ...newProductData, category_id: e.target.value })}
                      className="category-select"
                      required
                    >
                      <option value="" disabled>Selecciona una categoría...</option>
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

                {/* ── TAGS: Para tu equipo (→ compatible_devices) ── */}
                <DynamicTagInput
                  title="Para tu equipo"
                  placeholder="Ej: DJI Osmo Action 4, iPhone..."
                  tags={newProductData.compatible_devices}
                  onChange={(val) => setNewProductData({ ...newProductData, compatible_devices: val })}
                />

                {/* ── TAGS: Por producto (→ use_scenarios) ── */}
                <DynamicTagInput
                  title="Por producto"
                  placeholder="Ej: Iluminación LED, Monopod..."
                  tags={newProductData.use_scenarios}
                  onChange={(val) => setNewProductData({ ...newProductData, use_scenarios: val })}
                />

                {/* ── Imagen del Producto ── */}
                <div className="edit-form-group">
                  <label>Imagen del Producto</label>
                  <div className="create-file-upload">
                    <input
                      type="file"
                      id="newProductImage"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewProductImage(e.target.files[0]);
                        }
                      }}
                      className="create-file-input"
                    />
                    <label htmlFor="newProductImage" className="create-file-label">
                      <UploadCloud size={28} className="create-upload-icon" />
                      <span className="create-upload-text">
                        {newProductImage ? newProductImage.name : 'Haz clic para seleccionar una imagen'}
                      </span>
                      {newProductImage && (
                        <span className="create-upload-hint">
                          {(newProductImage.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </label>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="create-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowProductForm(false)}
                  disabled={isSubmittingNew}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={isSubmittingNew}>
                  {isSubmittingNew ? (
                    <><Loader size={18} className="spin" /><span>Creando...</span></>
                  ) : (
                    <><PackagePlus size={18} /><span>Crear Producto</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Categorías (flotante encima de los modales) ── */}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}

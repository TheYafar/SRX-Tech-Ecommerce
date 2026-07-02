import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { Layers, Loader2, Save, ArrowUpDown } from 'lucide-react';
import './AdminCategoriesOrder.css';

export default function AdminCategoriesOrder() {
  const { showSuccess, showError, showInfo } = useNotifications();
  const [categories, setCategories] = useState([]);
  const [localOrders, setLocalOrders] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      // Traer todas las categorías ordenadas por orden y luego por nombre
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setCategories(data || []);

      // Inicializar el diccionario de orden local
      const initialOrders = {};
      (data || []).forEach((cat) => {
        initialOrders[cat.id] = cat.order !== null && cat.order !== undefined ? cat.order : 0;
      });
      setLocalOrders(initialOrders);
    } catch (err) {
      console.error('[AdminCategoriesOrder] Error al cargar categorías:', err);
      showError('No se pudieron cargar las categorías del menú.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderChange = (id, value) => {
    const intValue = parseInt(value, 10);
    setLocalOrders((prev) => ({
      ...prev,
      [id]: isNaN(intValue) ? 0 : intValue,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Identificar qué categorías han sido modificadas comparando contra el estado original.
    // IMPORTANTE: cat.order puede ser null (fila antigua) o undefined (columna no existía aún);
    // ambos casos se normalizan a 0 con el operador ??.
    const modifiedCategories = categories.filter((cat) => {
      const currentOrder = localOrders[cat.id] ?? 0;
      const originalOrder = cat.order != null ? cat.order : 0;
      return currentOrder !== originalOrder;
    });

    if (modifiedCategories.length === 0) {
      showInfo('No hay cambios en el orden de las categorías para guardar.');
      setIsSaving(false);
      return;
    }

    try {
      // PASO 1 — DEBUG: muestra exactamente qué se va a enviar a Supabase antes de disparar.
      console.log(
        '[AdminCategoriesOrder] Enviando actualizaciones:',
        modifiedCategories.map((cat) => ({ id: cat.id, order: localOrders[cat.id] ?? 0 }))
      );

      // PASO 1 — Generar UN promise individual por categoría modificada usando .map().
      // Cada promise usa .update({ order }).eq('id', ...) para filtrar exactamente 1 fila.
      // NUNCA se usa .forEach() ni se agrupa todo en un solo .update() masivo.
      const promesas = modifiedCategories.map((cat) =>
        supabase
          .from('categories')
          .update({ order: localOrders[cat.id] ?? 0 })
          .eq('id', cat.id)
      );

      // PASO 2 — Resolver TODAS las promesas simultáneamente y capturar CADA respuesta.
      const respuestas = await Promise.all(promesas);

      // PASO 2 — Recorrer respuesta por respuesta para loguear errores individuales.
      // Esto expone fallos de RLS, tipos de datos incorrectos o nombres de columna erróneos.
      let hayErrores = false;
      respuestas.forEach((res, index) => {
        if (res.error) {
          hayErrores = true;
          console.error(
            `[AdminCategoriesOrder] Error detallado de Supabase en categoría id="${modifiedCategories[index].id}":`,
            res.error
          );
        }
      });

      // PASO 3 — Solo proceder con éxito si NINGUNA promesa devolvió error del servidor.
      // Si hay error, la UI NO simulará un guardado exitoso.
      if (hayErrores) {
        throw new Error(
          'Una o más categorías no pudieron actualizarse. Revisa la consola para detalles de RLS o tipos de datos.'
        );
      }

      showSuccess('¡El Mega Menú ha sido reordenado correctamente!');

      // PASO 3 — Refrescar el estado desde la base de datos real para mantener la UI sincronizada.
      await fetchCategories();
    } catch (err) {
      console.error('[AdminCategoriesOrder] Error guardando orden:', err);
      showError('Hubo un error al intentar guardar el orden. Intente de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-categories-order-panel">
        <div className="loader-container">
          <Loader2 size={40} className="spin-animation text-blue-500" />
          <p>Cargando categorías y prioridades...</p>
        </div>
      </div>
    );
  }

  // Filtrar categorías principales (aquellas sin padre / parent_id === null)
  // y ordenarlas con la misma lógica que el MegaMenu público: 0/null → al final.
  const primaryCategories = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => {
      const orderA = a.order === 0 || a.order == null ? 999 : a.order;
      const orderB = b.order === 0 || b.order == null ? 999 : b.order;
      return orderA - orderB;
    });
  // Filtrar categorías secundarias (aquellas que sí tienen un padre)
  const subcategories = categories.filter((c) => c.parent_id !== null);

  return (
    <div className="admin-categories-order-panel">
      <div className="page-header-actions">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Orden de Menú</h1>
          <p className="admin-page-subtitle">
            Establece la prioridad numérica de aparición de tus categorías en la navegación pública.
          </p>
        </div>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="spin-animation" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Guardar Orden de Menú</span>
            </>
          )}
        </button>
      </div>

      <div className="order-grid">
        {/* Columna Izquierda: Categorías Principales */}
        <div className="order-card">
          <h2 className="order-card-title">
            <Layers size={18} />
            Categorías Principales
          </h2>
          <div className="category-order-list">
            {primaryCategories.length > 0 ? (
              primaryCategories.map((cat) => (
                <div key={cat.id} className="category-order-item">
                  <div className="category-info">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-slug">slug: {cat.slug}</span>
                  </div>
                  <div className="category-input-wrapper">
                    <label htmlFor={`order-main-${cat.id}`}>Orden:</label>
                    <input
                      id={`order-main-${cat.id}`}
                      type="number"
                      value={localOrders[cat.id] ?? 0}
                      onChange={(e) => handleOrderChange(cat.id, e.target.value)}
                      className="order-input"
                      min="0"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="no-subcategories">No hay categorías principales creadas.</p>
            )}
          </div>
        </div>

        {/* Columna Derecha: Categorías Secundarias */}
        <div className="order-card">
          <h2 className="order-card-title">
            <ArrowUpDown size={18} />
            Categorías Secundarias (Subcategorías)
          </h2>
          <div className="category-order-list">
            {primaryCategories.length > 0 ? (
              primaryCategories.map((parent) => {
                const childCats = subcategories
                  .filter((sub) => sub.parent_id === parent.id)
                  .sort((a, b) => {
                    const orderA = a.order === 0 || a.order == null ? 999 : a.order;
                    const orderB = b.order === 0 || b.order == null ? 999 : b.order;
                    return orderA - orderB;
                  });

                return (
                  <div key={parent.id} className="subcategory-group">
                    <div className="subcategory-group-header">
                      <Layers size={12} />
                      <span>{parent.name}</span>
                    </div>

                    {childCats.length > 0 ? (
                      childCats.map((sub) => (
                        <div key={sub.id} className="category-order-item">
                          <div className="category-info">
                            <span className="category-name">{sub.name}</span>
                            <span className="category-slug">slug: {sub.slug}</span>
                          </div>
                          <div className="category-input-wrapper">
                            <label htmlFor={`order-sub-${sub.id}`}>Orden:</label>
                            <input
                              id={`order-sub-${sub.id}`}
                              type="number"
                              value={localOrders[sub.id] ?? 0}
                              onChange={(e) => handleOrderChange(sub.id, e.target.value)}
                              className="order-input"
                              min="0"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-subcategories">No hay subcategorías asignadas a esta sección.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="no-subcategories">
                Crea categorías principales primero para organizar sus subcategorías.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

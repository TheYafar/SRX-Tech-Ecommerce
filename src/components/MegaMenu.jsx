import { useRef, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Smartphone } from 'lucide-react';
import './MegaMenu.css';

// ──────────────────────────────────────────────────────────────────────────────
//  Opciones fijas para las columnas 2 y 3
//  Basadas en los valores reales que vienen en compatible_devices / use_scenarios
// ──────────────────────────────────────────────────────────────────────────────
export const DEVICE_OPTIONS = [
  { label: 'Para DJI Osmo Action 4',   value: 'DJI Osmo Action 4' },
  { label: 'Para Osmo Pocket 3',       value: 'Osmo Pocket 3' },
  { label: 'Para Smartphones',         value: 'Smartphones' },
  { label: 'Para Sony Alpha',          value: 'Sony Alpha' },
  { label: 'Para GoPro Hero',          value: 'GoPro Hero' },
  { label: 'Para Cámaras DSLR',        value: 'DSLR' },
];



// ──────────────────────────────────────────────────────────────────────────────
//  MegaMenu — aparece solo en Desktop al hover/click en "Categorías"
// ──────────────────────────────────────────────────────────────────────────────
export default function MegaMenu({ categories = [], isOpen, onClose, onFilter }) {
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer click fuera del menú
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCategoryClick = (categoryId) => {
    onFilter({ type: 'category', value: categoryId });
    navigate('/tienda');
    onClose();
  };

  const handleDeviceClick = (deviceValue) => {
    onFilter({ type: 'device', value: deviceValue });
    navigate('/tienda');
    onClose();
  };

  if (!isOpen) return null;

  // Obtener clasificaciones (categorías raíz)
  const classifications = categories.filter(c => c.parent_id === null);

  // Filtrar las clasificaciones activas para mostrar en el menú
  const activeClassifications = classifications.filter(clf => {
    const children = categories.filter(c => c.parent_id === clf.id);
    return children.length > 0 || clf.slug === 'para-tu-equipo' || clf.slug === 'por-producto';
  });

  return (
    <div className="mega-menu-overlay" aria-hidden="true">
      <div
        ref={menuRef}
        className="mega-menu-panel"
        role="dialog"
        aria-label="Menú de navegación por categorías"
      >
        {activeClassifications.map((clf, index) => {
          const children = categories.filter(c => c.parent_id === clf.id);
          
          // Si es "Para tu Equipo" y no tiene subcategorías en DB, renderizamos las opciones fijas (DEVICE_OPTIONS)
          const links = clf.slug === 'para-tu-equipo' && children.length === 0
            ? DEVICE_OPTIONS.map(opt => ({ id: opt.value, name: opt.label, isDevice: true, value: opt.value }))
            : children;

          return (
            <Fragment key={clf.id}>
              {index > 0 && <div className="mega-divider" />}
              <div className="mega-col">
                <div className="mega-col-header">
                  {clf.slug === 'para-tu-equipo' ? (
                    <Smartphone size={14} className="mega-col-icon" />
                  ) : (
                    <Grid size={14} className="mega-col-icon" />
                  )}
                  <span>{clf.name}</span>
                </div>
                <ul className="mega-link-list">
                  {links.length > 0 ? (
                    links.map((link) => (
                      <li key={link.id}>
                        <button
                          className="mega-link"
                          onClick={() => {
                            if (link.isDevice) {
                              handleDeviceClick(link.value);
                            } else {
                              handleCategoryClick(link.id);
                            }
                          }}
                        >
                          {link.name}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li><span className="mega-link-empty">No hay categorías</span></li>
                  )}
                </ul>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

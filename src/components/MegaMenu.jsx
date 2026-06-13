import { useRef, useEffect } from 'react';
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

  return (
    <div className="mega-menu-overlay" aria-hidden="true">
      <div
        ref={menuRef}
        className="mega-menu-panel"
        role="dialog"
        aria-label="Menú de navegación por categorías"
      >
        {/* ── Col 1: Por Producto (Categorías) ── */}
        <div className="mega-col">
          <div className="mega-col-header">
            <Grid size={14} className="mega-col-icon" />
            <span>Por Producto</span>
          </div>
          <ul className="mega-link-list">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    className="mega-link"
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </button>
                </li>
              ))
            ) : (
              <li><span className="mega-link-empty">Cargando…</span></li>
            )}
          </ul>
        </div>

        {/* ── Divider ── */}
        <div className="mega-divider" />

        {/* ── Col 2: Para tu equipo ── */}
        <div className="mega-col">
          <div className="mega-col-header">
            <Smartphone size={14} className="mega-col-icon" />
            <span>Para tu equipo</span>
          </div>
          <ul className="mega-link-list">
            {DEVICE_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <button
                  className="mega-link"
                  onClick={() => handleDeviceClick(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}

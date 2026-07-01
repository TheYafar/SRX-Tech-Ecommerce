import { useState, useEffect, useRef } from 'react';
import { PackagePlus, X } from 'lucide-react';

export default function ProductRecommendationsInput({ allProducts = [], selectedIds = [], onChange, currentProductId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Filter out the current product itself and already selected recommendations
  const availableOptions = allProducts.filter((p) => 
    p.id !== currentProductId &&
    !selectedIds.includes(p.id) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProducts = allProducts.filter((p) => selectedIds.includes(p.id));

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = (id) => {
    if (selectedIds.length >= 3) {
      return;
    }
    onChange([...selectedIds, id]);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (id) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <div className="recommendations-select-section" ref={containerRef}>
      <div className="recommendations-select-header">
        <PackagePlus size={14} style={{ color: '#2563eb' }} />
        <span>Productos que se complementan perfectamente (Máx. 3)</span>
        {selectedProducts.length > 0 && (
          <span className="recommendation-count-badge">{selectedProducts.length}/3</span>
        )}
      </div>

      <div className="recommendations-input-container">
        <div className="recommendations-search-wrapper">
          <input
            type="text"
            placeholder={selectedIds.length >= 3 ? "Límite de 3 complementos alcanzado" : "Buscar producto para recomendar..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={selectedIds.length >= 3}
            className="recommendations-search-input"
            style={selectedIds.length >= 3 ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          />
          {isOpen && selectedIds.length < 3 && (
            <div className="recommendations-dropdown">
              {availableOptions.length === 0 ? (
                <div className="recommendations-dropdown-empty">
                  No se encontraron productos disponibles
                </div>
              ) : (
                availableOptions.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAdd(prod.id)}
                    className="recommendations-dropdown-item"
                  >
                    {prod.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="recommendations-tags-list">
        {selectedProducts.map((prod) => (
          <span key={prod.id} className="recommendation-tag-badge">
            <span className="recommendation-tag-text">{prod.name}</span>
            <button
              type="button"
              onClick={() => handleRemove(prod.id)}
              className="btn-remove-recommendation"
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

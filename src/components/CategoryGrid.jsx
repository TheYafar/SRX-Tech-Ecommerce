import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { setNavFilter } from './Navbar';
import './CategoryGrid.css';

const categoryMeta = {
  // Tarjeta grande de la izquierda (Productos SRX / Cámaras, fotografía y video)
  'drones-y-sistemas-aereos': {
    image: '/srx.jpg',
    titleDisplay: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    buttonText: 'Ver más',
    order: 0
  },
  'cámaras,-fotografía-y-video': {
    image: '/srx.jpg',
    titleDisplay: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    buttonText: 'Ver más',
    order: 0
  },
  'cámaras-fotografía-y-video': {
    image: '/srx.jpg',
    titleDisplay: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    buttonText: 'Ver más',
    order: 0
  },
  'camaras,-fotografia-y-video': {
    image: '/srx.jpg',
    titleDisplay: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    buttonText: 'Ver más',
    order: 0
  },
  'camaras-fotografia-y-video': {
    image: '/srx.jpg',
    titleDisplay: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    buttonText: 'Ver más',
    order: 0
  },

  // Tarjeta superior derecha
  'audio-profesional': {
    image: '/srx2.jpg',
    titleDisplay: 'Audio Profesional',
    description: 'Lentes de marcas reconocidas para ampliar tu creatividad visual.',
    buttonText: 'Comprar',
    order: 1
  },

  // Tarjeta inferior derecha
  'iluminacion-y-energia': {
    image: '/srx3.jpg',
    titleDisplay: 'Iluminación y Energía',
    description: 'Luces y reflectores profesionales para dar vida y sonido a tus proyectos.',
    buttonText: 'Explorar',
    order: 2
  },
  'iluminación': {
    image: '/srx3.jpg',
    titleDisplay: 'Iluminación y Energía',
    description: 'Luces y reflectores profesionales para dar vida y sonido a tus proyectos.',
    buttonText: 'Explorar',
    order: 2
  },
  'iluminacion': {
    image: '/srx3.jpg',
    titleDisplay: 'Iluminación y Energía',
    description: 'Luces y reflectores profesionales para dar vida y sonido a tus proyectos.',
    buttonText: 'Explorar',
    order: 2
  }
};

/* ─── Skeleton placeholder ─────────────────────────────── */
function SkeletonCard({ large }) {
  return (
    <div className={`category-card skeleton-card ${large ? 'large-card' : 'horizontal-card'}`}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

/* ─── Single category card ─────────────────────────────── */
function CategoryCard({ category, large, reverse, onClick }) {
  const title = category.titleDisplay || category.name;
  return (
    <div
      className={`category-card ${large ? 'large-card' : 'horizontal-card'} ${reverse ? 'reverse-card' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Ver categoría ${title}`}
    >
      {category.image && (
        <div className="category-img-wrapper">
          <img src={category.image} alt={title} className="category-bg-img" />
        </div>
      )}
      <div className="category-content">
        <div className="category-text-group">
          <h3 className="cat-title">{title}</h3>
          {category.description && <p className="cat-description">{category.description}</p>}
        </div>
        <Link
          to="/tienda"
          className="pill-btn-outline"
          onClick={(e) => {
            e.stopPropagation();
            setNavFilter({ type: 'category', value: category.id });
          }}
        >
          {category.buttonText || 'Ver más'}
        </Link>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────── */
export default function CategoryGrid() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err) {
        console.error('Error loading categories in CategoryGrid:', err);
        setError('No se pudieron cargar las categorías.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categoryId) => {
    setNavFilter({ type: 'category', value: categoryId });
    navigate('/tienda');
  };

  /* Skeleton while loading */
  if (loading) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          <div className="category-grid">
            <SkeletonCard large />
            <div className="category-right-col">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* Error state */
  if (error) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          <p className="category-error">{error}</p>
        </div>
      </section>
    );
  }

  // Filtrar, mapear y ordenar las categorías que coinciden con los metadatos configurados
  const filtered = categories.filter(cat => cat.slug in categoryMeta);
  const mapped = filtered.map(cat => ({
    ...cat,
    ...categoryMeta[cat.slug]
  }));
  
  // Ordenar según el orden estático especificado
  mapped.sort((a, b) => a.order - b.order);

  // Tomar las primeras 3
  const finalCategories = mapped.slice(0, 3);

  /* Empty state */
  if (finalCategories.length === 0) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          <p className="category-error">No se encontraron categorías de productos configuradas.</p>
        </div>
      </section>
    );
  }

  const [firstCat, ...restCats] = finalCategories;

  return (
    <section id="categorias" className="category-section">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">CATEGORÍAS CLAVE</span>
          <h2 className="section-title">Productos SRX</h2>
        </div>

        <div className="category-grid">
          {/* Tarjeta destacada grande a la izquierda */}
          {firstCat && (
            <CategoryCard
              category={firstCat}
              large={true}
              onClick={() => handleCategoryClick(firstCat.id)}
            />
          )}

          {/* Columna derecha con dos tarjetas horizontales pequeñas */}
          {restCats.length > 0 && (
            <div className="category-right-col">
              {restCats.map((cat, idx) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  large={false}
                  reverse={idx === 1}
                  onClick={() => handleCategoryClick(cat.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

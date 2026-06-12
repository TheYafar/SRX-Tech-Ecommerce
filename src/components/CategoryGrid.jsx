import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './CategoryGrid.css';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop&q=80';

/* ─── Skeleton placeholder ─────────────────────────────── */
function SkeletonCard({ large }) {
  return (
    <div className={`category-card skeleton-card ${large ? 'large-card' : 'horizontal-card'}`}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

/* ─── Single category card ─────────────────────────────── */
function CategoryCard({ category, large, onClick }) {
  const imageUrl = category.image_url || FALLBACK_IMAGE;

  return (
    <div
      className={`category-card ${large ? 'large-card' : 'horizontal-card'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Ver categoría ${category.name}`}
    >
      <div className="category-img-wrapper">
        <img
          src={imageUrl}
          alt={category.name}
          className="category-img"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <div className="category-overlay-dark" />
      </div>
      <div className="category-content">
        <h3 className="cat-title">{category.name}</h3>
        {category.description && (
          <p className="cat-description">{category.description}</p>
        )}
        <button className="pill-btn-outline" tabIndex={-1}>
          {category.link_text || 'Ver más'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────── */
export default function CategoryGrid() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_visible', true)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err) {
        console.error('❌ [CategoryGrid] Error al cargar categorías:', err);
        setError('No se pudieron cargar las categorías.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const scrollToTienda = () => {
    const el = document.getElementById('tienda');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

  /* Error or empty state */
  if (error || categories.length === 0) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          {error && (
            <p className="category-error">{error}</p>
          )}
        </div>
      </section>
    );
  }

  /* ── Layout: 1 large left + rest stacked on right ── */
  const [firstCat, ...restCats] = categories;

  /* If only 1 category, render full width */
  if (categories.length === 1) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          <div className="category-grid category-grid--single">
            <CategoryCard category={firstCat} large onClick={scrollToTienda} />
          </div>
        </div>
      </section>
    );
  }

  /* Many categories → horizontal scroll carousel on mobile */
  if (categories.length > 4) {
    return (
      <section id="categorias" className="category-section">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">CATEGORÍAS CLAVE</span>
            <h2 className="section-title">Productos SRX</h2>
          </div>
          <div className="category-carousel">
            {categories.map((cat) => (
              <div key={cat.id} className="category-carousel-item" onClick={scrollToTienda}>
                <div className="category-img-wrapper">
                  <img
                    src={cat.image_url || FALLBACK_IMAGE}
                    alt={cat.name}
                    className="category-img"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                  <div className="category-overlay-dark" />
                </div>
                <div className="category-content">
                  <h3 className="cat-title">{cat.name}</h3>
                  {cat.description && (
                    <p className="cat-description">{cat.description}</p>
                  )}
                  <button className="pill-btn-outline" tabIndex={-1}>
                    {cat.link_text || 'Ver más'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* 2–4 categories → bento layout (large left + right column) */
  return (
    <section id="categorias" className="category-section">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">CATEGORÍAS CLAVE</span>
          <h2 className="section-title">Productos SRX</h2>
        </div>

        <div className="category-grid">
          {/* Large Left Card — first category */}
          <CategoryCard
            category={firstCat}
            large
            onClick={scrollToTienda}
          />

          {/* Right Column — remaining categories */}
          <div className="category-right-col">
            {restCats.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                large={false}
                onClick={scrollToTienda}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

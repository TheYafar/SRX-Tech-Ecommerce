import React from 'react';
import { categories } from '../data/products';
import { ChevronRight } from 'lucide-react';
import './CategoryGrid.css';

export default function CategoryGrid() {
  // We want to structure the categories exactly as the layout in the screenshot:
  // Left: Productos SRX (large card)
  // Right Column: Lentes (top) and Iluminación (bottom)
  const leftCategory = categories.find(c => c.id === 'productos-srx');
  const topRightCategory = categories.find(c => c.id === 'lentes');
  const bottomRightCategory = categories.find(c => c.id === 'iluminacion');

  const scrollToTienda = () => {
    const el = document.getElementById('tienda');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="categorias" className="category-section">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">CATEGORÍAS CLAVE</span>
          <h2 className="section-title">Productos SRX</h2>
        </div>

        <div className="category-grid">
          {/* Large Left Card */}
          {leftCategory && (
            <div className="category-card large-card" onClick={scrollToTienda}>
              <div className="category-img-wrapper">
                <img 
                  src={leftCategory.image} 
                  alt={leftCategory.name} 
                  className="category-img" 
                />
                <div className="category-overlay-dark"></div>
              </div>
              <div className="category-content">
                <h3 className="cat-title">{leftCategory.name}</h3>
                <p className="cat-description">{leftCategory.description}</p>
                <button className="pill-btn-outline">
                  {leftCategory.linkText}
                </button>
              </div>
            </div>
          )}

          {/* Right Column Stack */}
          <div className="category-right-col">
            {/* Top Right Card */}
            {topRightCategory && (
              <div className="category-card horizontal-card" onClick={scrollToTienda}>
                <div className="category-img-wrapper">
                  <img 
                    src={topRightCategory.image} 
                    alt={topRightCategory.name} 
                    className="category-img" 
                  />
                  <div className="category-overlay-dark"></div>
                </div>
                <div className="category-content">
                  <h3 className="cat-title">{topRightCategory.name}</h3>
                  <p className="cat-description">{topRightCategory.description}</p>
                  <button className="pill-btn-outline">
                    {topRightCategory.linkText}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Right Card */}
            {bottomRightCategory && (
              <div className="category-card horizontal-card" onClick={scrollToTienda}>
                <div className="category-img-wrapper">
                  <img 
                    src={bottomRightCategory.image} 
                    alt={bottomRightCategory.name} 
                    className="category-img" 
                  />
                  <div className="category-overlay-dark"></div>
                </div>
                <div className="category-content">
                  <h3 className="cat-title">{bottomRightCategory.name}</h3>
                  <p className="cat-description">{bottomRightCategory.description}</p>
                  <button className="pill-btn-outline">
                    {bottomRightCategory.linkText}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

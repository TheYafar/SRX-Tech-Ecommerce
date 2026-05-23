import React from 'react';
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import BestSellers from '../components/BestSellers';
import Testimonials from '../components/Testimonials';
import Newsletter from '../components/Newsletter';

export default function Home() {
  return (
    <>
      {/* Banner de Presentación */}
      <Hero />

      {/* Grid de Categorías Clave */}
      <CategoryGrid />

      {/* Sección de Más Vendidos (Reemplaza Featured) */}
      <div id="tienda">
        <BestSellers />
      </div>

      {/* Sección de Testimonios */}
      <Testimonials />

      {/* Newsletter */}
      <Newsletter />
    </>
  );
}

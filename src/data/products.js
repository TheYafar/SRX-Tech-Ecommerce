// Mock Product Data for SRX Tech Redesign
export const products = [
  {
    id: 'dji-mic-mini',
    name: 'DJI Mic Mini',
    tagline: 'Audio ultra-compacto, sonido profesional',
    description: 'El micrófono inalámbrico definitivo para creadores de contenido. Calidad de audio excepcional en un diseño increíblemente ligero y discreto.',
    price: 120.00,
    salePrice: 99.00,
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=800&fit=crop&q=80',
    category: 'Productos SRX',
    featured: true,
    isHero: true,
    rating: 4.9,
    specs: ['Transmisión inalámbrica de hasta 250m', 'Cancelación activa de ruido', 'Autonomía de hasta 15 horas con estuche', 'Diseño clip-on magnético']
  },
  {
    id: 'brazo-magico-smallrig',
    name: 'Brazo Mágico 22" SmallRig + Montura de Teléfono',
    tagline: 'Soporte articulado ultra resistente',
    description: 'Ideal para creadores y fotógrafos. Permite montar teléfonos, monitores y luces auxiliares en cualquier posición gracias a su doble articulación de bola de 360 grados.',
    price: 80.00,
    salePrice: 65.00,
    image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800&h=800&fit=crop&q=80',
    category: 'Accesorios',
    featured: true,
    rating: 4.7
  },
  {
    id: 'dji-osmo-pocket-3',
    name: 'DJI Osmo Pocket 3 Creator Combo',
    tagline: 'Imágenes en movimiento que inspiran',
    description: 'Cámara con estabilizador en tres ejes y sensor CMOS de 1 pulgada. Graba videos en 4K/120fps con enfoque rápido de píxeles completos y pantalla giratoria de 2 pulgadas.',
    price: 850.00,
    salePrice: 800.00,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop&q=80',
    category: 'Productos SRX',
    featured: true,
    rating: 5.0
  },
  {
    id: 'baterias-np-fz100',
    name: 'Baterías NP-FZ100',
    tagline: 'Energía confiable de alta capacidad',
    description: 'Batería recargable InfoLITHIUM de Sony, ideal para cámaras Alpha. Ofrece una autonomía excepcional para que nunca te quedes sin batería durante tus sesiones de fotos.',
    price: 100.00,
    salePrice: 90.00,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&q=80',
    category: 'Baterías',
    featured: true,
    rating: 4.8
  },
  {
    id: 'baterias-np-fw50',
    name: 'Baterías NP-FW50',
    tagline: 'Ligera y eficiente para cámaras Sony',
    description: 'Batería de repuesto oficial y compatible con cámaras Sony compactas e intermedias. Ideal para llevar como respaldo en tu mochila fotográfica.',
    price: 75.00,
    salePrice: 60.00,
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=800&fit=crop&q=80',
    category: 'Baterías',
    featured: true,
    rating: 4.6
  }
];

export const categories = [
  {
    id: 'productos-srx',
    name: 'Productos SRX',
    description: 'Cámaras y micrófonos para capturar cada momento con precisión y calidad.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop&q=80',
    linkText: 'Ver más'
  },
  {
    id: 'lentes',
    name: 'Lentes',
    description: 'Lentes de marcas reconocidas para ampliar tu creatividad visual.',
    image: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&h=600&fit=crop&q=80',
    linkText: 'Comprar'
  },
  {
    id: 'iluminacion',
    name: 'Iluminación',
    description: 'Luces y reflectores profesionales para dar vida y sonido a tus proyectos.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop&q=80',
    linkText: 'Explorar'
  }
];

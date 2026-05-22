import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import './Testimonials.css';

const testimonials = [
  {
    id: 1,
    name: 'Carlos Mendoza',
    role: 'Productor Audiovisual',
    text: '"La calidad de los equipos de iluminación que adquirí es insuperable. El envío fue rápido y el embalaje perfecto. Totalmente recomendados."',
    initial: 'C'
  },
  {
    id: 2,
    name: 'Ana Silva',
    role: 'Fotógrafa Profesional',
    text: '"Encontré justo lo que necesitaba para mi estudio. La atención al cliente fue excepcional, me asesoraron en todo momento de mi compra."',
    initial: 'A'
  },
  {
    id: 3,
    name: 'Miguel Torres',
    role: 'Creador de Contenido',
    text: '"Desde que cambié mis micrófonos y luces por los de SRX Tech, la calidad de mis videos ha dado un salto increíble. Vale cada centavo."',
    initial: 'M'
  }
];

export default function Testimonials() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="testimonials-section">
      <div className="container">
        <motion.div 
          className="testimonials-header"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <span className="testimonials-subtitle">EXPERIENCIAS</span>
          <h2 className="testimonials-title">Lo que dicen nuestros clientes</h2>
        </motion.div>

        <motion.div 
          className="testimonials-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((item) => (
            <motion.div key={item.id} className="testimonial-card" variants={itemVariants}>
              <div className="stars-container">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" stroke="none" />
                ))}
              </div>
              <p className="testimonial-text">{item.text}</p>
              <div className="testimonial-author">
                <div className="author-avatar">{item.initial}</div>
                <div className="author-info">
                  <h4>{item.name}</h4>
                  <p>{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

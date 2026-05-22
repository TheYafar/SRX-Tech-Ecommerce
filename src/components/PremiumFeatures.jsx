import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, Headphones } from 'lucide-react';
import './PremiumFeatures.css';

const features = [
  {
    id: 1,
    title: 'Envío Seguro',
    description: 'Envíos a todo el país con seguro incluido para tu tranquilidad.',
    icon: <Truck size={28} />
  },
  {
    id: 2,
    title: 'Garantía de Calidad',
    description: 'Todos nuestros equipos cuentan con garantía directa de fábrica.',
    icon: <ShieldCheck size={28} />
  },
  {
    id: 3,
    title: 'Soporte 24/7',
    description: 'Asistencia técnica especializada siempre a tu disposición.',
    icon: <Headphones size={28} />
  }
];

export default function PremiumFeatures() {
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
    hidden: { opacity: 0, y: 20 },
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
    <section className="premium-features-section">
      <div className="container">
        <motion.div 
          className="features-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <motion.div key={feature.id} className="feature-item" variants={itemVariants}>
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

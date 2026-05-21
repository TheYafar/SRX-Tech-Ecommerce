# SRX Tech Ecommerce

Una aplicación de comercio electrónico moderna construida con React, Vite y varias bibliotecas modernas.

## 🚀 Demo en vivo

La aplicación está desplegada en GitHub Pages: [https://TheYafar.github.io/SRX-Tech-Ecommerce](https://TheYafar.github.io/SRX-Tech-Ecommerce)

## ✨ Características

- **Diseño moderno y responsive** - Interfaz de usuario atractiva y adaptable a todos los dispositivos
- **Autenticación de usuarios** - Sistema de registro e inicio de sesión
- **Carrito de compras** - Gestión completa de productos en el carrito
- **Lista de deseos** - Funcionalidad para guardar productos favoritos
- **Modal de detalles de producto** - Vista detallada de cada producto
- **Checkout** - Proceso de pago simulado
- **Notificaciones** - Sistema de notificaciones en tiempo real
- **Animaciones** - Transiciones suaves con Framer Motion

## 🛠️ Tecnologías utilizadas

- **React 19** - Biblioteca principal para la interfaz de usuario
- **Vite** - Herramienta de construcción rápida
- **React Router DOM** - Enrutamiento de la aplicación
- **Framer Motion** - Animaciones y transiciones
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas
- **Lucide React** - Iconos modernos
- **GitHub Pages** - Despliegue de la aplicación

## 📦 Instalación y ejecución local

1. Clona el repositorio:
```bash
git clone https://github.com/TheYafar/SRX-Tech-Ecommerce.git
cd SRX-Tech-Ecommerce
```

2. Instala las dependencias:
```bash
npm install
```

3. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

4. Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## 🚀 Despliegue

La aplicación está configurada para desplegarse automáticamente en GitHub Pages. Para desplegar manualmente:

```bash
npm run deploy
```

## 📁 Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables
├── context/       # Contextos de React (Auth, Cart, etc.)
├── pages/         # Páginas de la aplicación
├── layouts/       # Layouts principales
├── hooks/         # Hooks personalizados
├── services/      # Servicios y APIs
├── data/          # Datos y mockups
├── styles/        # Estilos globales
└── utils/         # Utilidades y helpers
```

## 🔧 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la construcción de producción
- `npm run lint` - Ejecuta ESLint
- `npm run deploy` - Despliega en GitHub Pages

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

# Demo de Funcionalidades - SRX Tech Mejorado

## 🎬 Cómo Probar las Nuevas Funcionalidades

### 1. **Sistema de Autenticación**
- **Click en el icono de usuario** (parte superior derecha)
- **Registro**: 
  - Click en "Regístrate" 
  - Completa el formulario (nombre, email, contraseña)
  - Verás una notificación de éxito
- **Login**:
  - Usa las credenciales recién creadas
  - Verás el avatar de usuario en el navbar
- **Logout**:
  - Click en el avatar → "Cerrar Sesión"
  - Notificación de sesión cerrada

### 2. **Barra de Búsqueda**
- **Click en el icono de lupa** (al lado del icono de usuario)
- **Escribe cualquier término** (ej: "mic", "cámara")
- **Presiona Enter** para ver la alerta de búsqueda
- **En móvil**: La búsqueda aparece en el menú desplegable

### 3. **Animaciones y Efectos Visuales**
- **Pasa el cursor sobre productos**:
  - Efecto de elevación (hover-lift)
  - Aparecen botones de acción rápida
  - Imagen con zoom suave
- **Scroll por la página**:
  - Animaciones de entrada para secciones
  - Transiciones suaves entre elementos
- **Hero Section**:
  - Imagen flotante con animación
  - Badges animados de precio y rating
  - Elementos de fondo en movimiento

### 4. **Carrito de Compras Mejorado**
- **Añade productos al carrito**:
  - Click en "Añadir al carrito" en cualquier producto
  - Notificación de éxito inmediata
  - El carrito se abre automáticamente
- **Carrito flotante**:
  - Contador de items en el icono
  - Interfaz con animaciones
  - Sistema de checkout simulado

### 5. **Sistema de Notificaciones**
- **Se activan automáticamente** cuando:
  - Añades productos al carrito
  - Inicias/cierras sesión
  - Te registras como nuevo usuario
- **Ubicación**: Esquina superior derecha
- **Diseño**: Toast notifications con barra de progreso
- **Tipos**: Success (verde), Error (rojo), Info (azul)

### 6. **Menú de Usuario (Dropdown)**
- **Click en el avatar** (si estás logueado)
- **Verás**:
  - Tu nombre y email
  - Opciones: Mi Perfil, Mis Pedidos, Lista de Deseos
  - Botón de Cerrar Sesión
- **Diseño**: Animación de entrada/salida

### 7. **Responsive Design**
- **Redimensiona la ventana** para ver:
  - Menú móvil (icono de hamburguesa)
  - Búsqueda móvil integrada
  - Grid de productos adaptable
  - Hero section optimizada

## 🎯 Flujos de Usuario para Probar

### Flujo 1: Nuevo Usuario
1. Click icono usuario → "Regístrate"
2. Completa formulario de registro
3. Explora productos (hover sobre tarjetas)
4. Añade 2-3 productos al carrito
5. Abre carrito → Procede al checkout
6. Cierra sesión

### Flujo 2: Usuario Registrado
1. Login con credenciales existentes
2. Usa la barra de búsqueda
3. Añade productos a favoritos (icono corazón)
4. Usa vista rápida (icono ojo)
5. Revisa dropdown de usuario
6. Cierra sesión

### Flujo 3: Experiencia Móvil
1. Redimensiona ventana a tamaño móvil
2. Abre menú móvil (icono hamburguesa)
3. Usa búsqueda móvil
4. Navega por secciones
5. Añade productos al carrito

## 🔍 Características Destacadas

### **Micro-interacciones**
- Botones con efectos hover/click
- Transiciones suaves entre estados
- Feedback visual inmediato
- Animaciones sutiles pero efectivas

### **Accesibilidad**
- Labels ARIA en todos los controles
- Navegación por teclado
- Contraste de colores adecuado
- Focus states visibles

### **Performance**
- Lazy loading de imágenes
- Animaciones optimizadas
- Build de producción funcional
- Código modular y eficiente

## 🚀 URL de la Aplicación
**Desarrollo**: http://localhost:5173/

## 📱 Compatibilidad
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop (Windows, macOS, Linux)
- ✅ Mobile (iOS, Android)
- ✅ Tablets

## 🎨 Paleta de Colores Mejorada
- **Azul SRX**: #1e225e (navbar, acentos)
- **Amarillo Oferta**: #a7af1a (destacados)
- **Blanco/Negro**: Contraste óptimo
- **Gradientes**: Efectos sutiles de profundidad

## 💡 Tips para la Demo
1. **Observa las notificaciones** en la esquina superior derecha
2. **Presta atención a las animaciones** al interactuar
3. **Prueba en diferentes tamaños** de ventana
4. **Usa tanto registro como login** para ver todas las notificaciones
5. **Experimenta con el carrito** (añadir, quitar, modificar cantidades)

La aplicación ahora tiene una experiencia de usuario moderna, fluida y atractiva que combina funcionalidad práctica con diseño visual impactante.


## 🛒 Nueva Funcionalidad: Página de Tienda

### 8. **Página de Tienda Completa**
- **Click en "Tienda"** en el navbar (desktop o móvil)
- **Navegación a página separada**: `/tienda`
- **Categorías visuales**:
  - Productos SRX
  - Lentes
  - Iluminación
- **Filtrado por categoría**:
  - Click en cualquier categoría para filtrar productos
  - Botón "Todos" para mostrar todos los productos
  - Indicador visual de categoría activa
- **Grid de productos**:
  - Muestra todos los productos disponibles
  - Mismo diseño de tarjetas que en la página principal
  - Filtrado en tiempo real
- **Diseño responsive**:
  - Hero section con gradiente
  - Grid de categorías adaptable
  - Filtros optimizados para móvil

### 9. **Filtrado de Productos**
- **Filtro por categoría**:
  - Barra de filtros en la sección de productos
  - Botones para cada categoría disponible
  - Estado activo/inactivo visual
- **Sin productos en categoría**:
  - Mensaje amigable cuando no hay productos
  - Botón para volver a "Todos los productos"
- **Navegación de regreso**:
  - Enlace "Volver al inicio" al final de la página

## 🎯 Nuevo Flujo de Usuario para Probar

### Flujo 4: Exploración de Tienda
1. Click en "Tienda" en el navbar
2. Observa la hero section con gradiente
3. Explora las categorías visuales (click en cada una)
4. Usa los filtros para ver productos por categoría
5. Prueba el filtro "Todos" para ver todos los productos
6. Añade productos al carrito desde la tienda
7. Usa el enlace "Volver al inicio"

## 🔍 Características Técnicas de la Tienda

### **Arquitectura**
- **Nueva ruta**: `/tienda` en React Router
- **Página independiente**: `Store.jsx` y `Store.css`
- **Reutilización de componentes**: `ProductCard` existente
- **Servicio compartido**: `productService.getProducts()`

### **Estado y Filtrado**
- **Estado local**: Categoría seleccionada y productos filtrados
- **Filtrado en tiempo real**: Sin recarga de página
- **Manejo de estados**: Loading, error, empty states
- **Persistencia**: Mantiene filtro durante navegación

### **Diseño Visual**
- **Hero section**: Gradiente azul con título destacado
- **Grid de categorías**: Tarjetas con imágenes e información
- **Filtros**: Barra con botones estilo píldora
- **Responsive**: Adaptación completa a todos los dispositivos

## 💡 Tips para Probar la Tienda
1. **Navega entre categorías** para ver el filtrado en acción
2. **Prueba en móvil** para ver la adaptación responsive
3. **Observa las animaciones** al cambiar categorías
4. **Verifica que los productos** se muestren correctamente
5. **Usa el enlace de regreso** para volver al inicio

La nueva página de tienda proporciona una experiencia de compra más completa y organizada, permitiendo a los usuarios explorar productos por categorías de manera intuitiva y visualmente atractiva.
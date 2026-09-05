# FashionStore Frontend - Iteración #1

Frontend desarrollado en **Angular 17+ (Standalone Components)** para la plataforma de comercio electrónico de moda **FashionStore**.

---

## Casos de Uso Implementados (Iteración #1)

- **CU01**: Gestión de autenticación (Login, Logout, Refresh Token, Avatar con Dropdown por Roles).
- **CU02**: Registro de clientes con formulario reactivo y validaciones.
- **CU03**: Gestión de usuarios internos (CRUD, asignación de roles, filtros y habilitación/deshabilitación).
- **CU04**: Gestión de roles y permisos (Matriz interactiva RBAC con guardado granular).
- **CU05**: Gestión de sucursales y ciudades (CRUD de ciudades y sucursales con estados y horarios).
- **CU06**: Gestión de productos (CRUD de prendas, SKU, categorías, tallas, colores, temporadas y stock inicial).
- **CU08**: Gestión de proveedores (Registro y administración de fabricantes y aliados textiles).
- **CU19**: Gestión de inventario (Control de existencias por sucursal, registro de movimientos de entrada/salida/ajuste y bitácora histórica).

---

## Requisitos Previos

- **Node.js**: v18+ o v20+ / v22+
- **npm**: v9+
- **Backend FastAPI**: Corriendo en `http://localhost:8000`

---

## Instrucciones para Ejecutar

### 1. Instalar dependencias (si es primera vez)
```bash
cd fashionstore-frontend
npm install
```

### 2. Ejecutar Servidor de Desarrollo
```bash
npm start
# O alternativamente:
npx ng serve --open
```
La aplicación estará disponible en `http://localhost:4200`.

### 3. Compilar para Producción
```bash
npm run build
```

---

## Credenciales de Acceso para Pruebas

- **Administrador:**
  - **Correo:** `admin@fashionstore.com`
  - **Contraseña:** `Admin123*`
- **Cliente:**
  - Puedes registrar un nuevo cliente desde `/auth/register` o ingresar con cualquier usuario creado en el panel.

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── core/           # Modelos, Servicios API, Interceptores y Guards
│   ├── shared/         # Navbar con Avatar, Footer, Breadcrumbs, Modales, Toast, Loaders
│   └── features/
│       ├── home/       # Landing Page, Sección Hombre, Sección Mujer
│       ├── auth/       # Login, Registro de Cliente
│       └── admin/      # Layout y páginas de CU03, CU04, CU05, CU06, CU08, CU19
├── environments/       # Variables de entorno (development y production)
└── styles.scss         # Sistema de diseño global y paleta de colores de moda
```

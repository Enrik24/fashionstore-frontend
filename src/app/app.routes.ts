import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { branchManagerGuard } from './core/guards/branch-manager.guard';
import { cashierGuard } from './core/guards/cashier.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/landing/landing.component').then(m => m.LandingComponent),
        title: 'FashionStore - Inicio & Tendencias'
      },
      {
        path: 'hombre',
        loadComponent: () => import('./features/home/pages/hombre/hombre.component').then(m => m.HombreComponent),
        title: 'FashionStore - Colección Hombre'
      },
      {
        path: 'mujer',
        loadComponent: () => import('./features/home/pages/mujer/mujer.component').then(m => m.MujerComponent),
        title: 'FashionStore - Colección Mujer'
      }
    ]
  },
  {
    path: 'catalog',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/catalog/pages/catalog-list/catalog-list.component').then(m => m.CatalogListComponent),
        title: 'FashionStore - Catálogo Completo'
      },
      {
        path: ':id',
        loadComponent: () => import('./features/catalog/pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
        title: 'FashionStore - Detalle de Producto'
      }
    ]
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/pages/cart-page/cart-page.component').then(m => m.CartPageComponent),
    title: 'FashionStore - Mi Carrito de Compras'
  },
  {
    path: 'checkout',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/checkout/pages/checkout-page/checkout-page.component').then(m => m.CheckoutPageComponent),
        canActivate: [authGuard],
        title: 'FashionStore - Finalizar Compra'
      },
      {
        path: 'success',
        loadComponent: () => import('./features/checkout/pages/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent),
        title: 'FashionStore - Pago Exitoso'
      },
      {
        path: 'cancel',
        loadComponent: () => import('./features/checkout/pages/payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent),
        title: 'FashionStore - Pago Cancelado'
      }
    ]
  },
  {
    path: 'branch',
    loadComponent: () => import('./features/branch-manager/layout/branch-layout.component').then(m => m.BranchLayoutComponent),
    canActivate: [authGuard, branchManagerGuard],
    children: [
      {
        path: '',
        redirectTo: 'reservations',
        pathMatch: 'full'
      },
      {
        path: 'reservations',
        loadComponent: () => import('./features/branch-manager/pages/reservations/branch-reservations.component').then(m => m.BranchReservationsComponent),
        title: 'FashionStore - Reservas en Sucursal'
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/branch-manager/pages/returns/branch-returns.component').then(m => m.BranchReturnsComponent),
        title: 'FashionStore - Revisión de Devoluciones (CU28)'
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/branch-manager/pages/inventory/branch-inventory.component').then(m => m.BranchInventoryComponent),
        title: 'FashionStore - Inventario de Sucursal'
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/branch-manager/pages/sales/branch-sales.component').then(m => m.BranchSalesComponent),
        title: 'FashionStore - Ventas de Sucursal'
      }
    ]
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pages/pos-page/pos-page.component').then(m => m.PosPageComponent),
    canActivate: [authGuard, cashierGuard],
    title: 'FashionStore - Terminal Punto de Venta (POS)'
  },
  {
    path: 'sales-history',
    loadComponent: () => import('./features/pos/pages/sales-history/sales-history.component').then(m => m.SalesHistoryComponent),
    canActivate: [authGuard, cashierGuard],
    title: 'FashionStore - Historial de Ventas Presenciales'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
        title: 'FashionStore - Iniciar Sesión'
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent),
        title: 'FashionStore - Registro de Cliente'
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/layout/profile-layout.component').then(m => m.ProfileLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/profile/pages/profile-page/profile-page.component').then(m => m.ProfilePageComponent),
        title: 'FashionStore - Mi Perfil de Cliente'
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/profile/pages/orders-history/orders-history.component').then(m => m.OrdersHistoryComponent),
        title: 'FashionStore - Historial de Mis Compras'
      },
      {
        path: 'reservations',
        loadComponent: () => import('./features/profile/pages/reservations-history/reservations-history.component').then(m => m.ReservationsHistoryComponent),
        title: 'FashionStore - Mis Reservas en Tienda'
      },
      {
        path: 'favorites',
        loadComponent: () => import('./features/profile/pages/favorites/favorites-page.component').then(m => m.FavoritesPageComponent),
        title: 'FashionStore - Mis Favoritos (CU25)'
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/profile/pages/returns/my-returns.component').then(m => m.MyReturnsComponent),
        title: 'FashionStore - Mis Devoluciones (CU28)'
      },
      {
        path: 'returns/new/:orderId',
        loadComponent: () => import('./features/profile/pages/returns/request-return.component').then(m => m.RequestReturnComponent),
        title: 'FashionStore - Solicitar Devolución o Cambio (CU28)'
      }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'FashionStore Admin - Dashboard'
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/pages/users/users.component').then(m => m.UsersComponent),
        title: 'FashionStore Admin - Gestión de Usuarios'
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/admin/pages/roles/roles.component').then(m => m.RolesComponent),
        title: 'FashionStore Admin - Roles y Permisos'
      },
      {
        path: 'branches',
        loadComponent: () => import('./features/admin/pages/branches/branches.component').then(m => m.BranchesComponent),
        title: 'FashionStore Admin - Sucursales y Ciudades'
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/pages/products/products.component').then(m => m.ProductsComponent),
        title: 'FashionStore Admin - Gestión de Productos'
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/admin/pages/suppliers/suppliers.component').then(m => m.SuppliersComponent),
        title: 'FashionStore Admin - Proveedores'
      },
      {
        path: 'receptions',
        loadComponent: () => import('./features/admin/pages/receptions/receptions.component').then(m => m.ReceptionsComponent),
        title: 'FashionStore Admin - Recepciones por Proveedor'
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/admin/pages/inventory/inventory.component').then(m => m.InventoryComponent),
        title: 'FashionStore Admin - Gestión de Inventario'
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/admin/pages/sales/sales.component').then(m => m.SalesComponent),
        title: 'FashionStore Admin - Ventas Realizadas'
      },
      {
        path: 'reservations',
        loadComponent: () => import('./features/admin/pages/reservations/reservations.component').then(m => m.ReservationsComponent),
        title: 'FashionStore Admin - Reservas Realizadas'
      },
      {
        path: 'product-attributes',
        loadComponent: () => import('./features/admin/pages/product-attributes/product-attributes.component').then(m => m.ProductAttributesComponent),
        title: 'FashionStore Admin - Características de Producto'
      },
      {
        path: 'coupons',
        loadComponent: () => import('./features/admin/pages/coupons/coupons.component').then(m => m.CouponsComponent),
        title: 'FashionStore Admin - Cupones de Descuento (CU18)'
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/admin/pages/promotions/promotions.component').then(m => m.PromotionsComponent),
        title: 'FashionStore Admin - Promociones (CU24)'
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/admin/pages/reports/reports.component').then(m => m.ReportsComponent),
        title: 'FashionStore Admin - Reportes Analíticos & KPIs'
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/admin/pages/audit/audit.component').then(m => m.AuditComponent),
        title: 'FashionStore Admin - Bitácora de Auditoría'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

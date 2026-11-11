import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { branchManagerGuard } from './core/guards/branch-manager.guard';
import { cashierGuard } from './core/guards/cashier.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { tenantOperativoGuard } from './core/guards/tenant-operativo.guard';
// [EXAMEN-2] CU05-CU09 / CU17: guards de operación sin conexión.
import { offlineSessionGuard } from './core/guards/offline-session.guard';
import { deviceActiveGuard } from './core/guards/device-active.guard';

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
      },
      {
        // [EXAMEN-2] CU16: confirmación de pago diferido (Stripe o redirección).
        path: 'pago-pendiente/:uuidPago',
        loadComponent: () => import('./features/checkout/pages/pending-payment/pending-payment.component').then(m => m.PendingPaymentComponent),
        canActivate: [authGuard],
        title: 'FashionStore - Confirmar pago pendiente'
      },
      {
        // [EXAMEN-2] CU16 / RN-016: expiración con liberación de stock.
        path: 'pago-expirado',
        loadComponent: () => import('./features/checkout/pages/payment-expired/payment-expired.component').then(m => m.PaymentExpiredComponent),
        canActivate: [authGuard],
        title: 'FashionStore - Pago expirado'
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
      },
      { path: 'traspasos', loadComponent: () => import('./features/branch-manager/pages/transfers/branch-transfers.component').then(m => m.BranchTransfersComponent), title: 'FashionStore - Traspasos por recibir' }
    ]
  },
  {
    // [EXAMEN-2] CU07: modo offline de la terminal POS.
    path: 'pos/offline',
    loadComponent: () => import('./features/pos/pages/pos-offline/pos-offline.component').then(m => m.PosOfflineComponent),
    canActivate: [authGuard, cashierGuard, deviceActiveGuard, offlineSessionGuard],
    title: 'FashionStore - POS offline'
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pages/pos-page/pos-page.component').then(m => m.PosPageComponent),
    canActivate: [authGuard, cashierGuard],
    title: 'FashionStore - Terminal Punto de Venta (POS)'
  },
  { path: 'pos/devoluciones', loadComponent: () => import('./features/pos/pages/returns/pos-returns.component').then(m => m.PosReturnsComponent), canActivate: [authGuard, cashierGuard], title: 'FashionStore - Devoluciones POS' },
  { path: 'pos/reposiciones', loadComponent: () => import('./features/pos/pages/reposiciones/pos-reposiciones.component').then(m => m.PosReposicionesComponent), canActivate: [authGuard, cashierGuard], title: 'FashionStore - Reposiciones POS' },
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
    path: 'offline',
    children: [
      {
        path: '',
        redirectTo: 'acceso',
        pathMatch: 'full'
      },
      {
        path: 'acceso',
        loadComponent: () => import('./features/offline/pages/access/offline-access.component').then(m => m.OfflineAccessComponent),
        title: 'FashionStore - Acceso sin conexión'
      },
      {
        // [EXAMEN-2] CU05: descarga, sello de datos y descarga selectiva.
        path: 'descarga',
        loadComponent: () => import('./features/offline/pages/download/offline-download.component').then(m => m.OfflineDownloadComponent),
        canActivate: [authGuard, deviceActiveGuard],
        title: 'FashionStore - Descarga offline'
      },
      {
        // [EXAMEN-2] CU05: catálogo servido desde IndexedDB, sin compra digital.
        path: 'catalogo',
        loadComponent: () => import('./features/offline/pages/catalog/offline-catalog.component').then(m => m.OfflineCatalogComponent),
        canActivate: [authGuard, deviceActiveGuard],
        title: 'FashionStore - Catálogo offline'
      },
      {
        // [EXAMEN-2] CU06: reserva local con comprobante temporal.
        path: 'reserva',
        loadComponent: () => import('./features/offline/pages/reservation/offline-reservation.component').then(m => m.OfflineReservationComponent),
        canActivate: [authGuard, deviceActiveGuard, offlineSessionGuard],
        title: 'FashionStore - Reserva offline'
      },
      {
        // [EXAMEN-2] CU08 / RF-030: cola FIFO, progreso y resumen del lote.
        path: 'sincronizacion',
        loadComponent: () => import('./features/offline/pages/sync-center/offline-sync-center.component').then(m => m.OfflineSyncCenterComponent),
        canActivate: [authGuard, deviceActiveGuard],
        title: 'FashionStore - Centro de sincronización'
      },
      {
        // [EXAMEN-2] CU09: conflictos y resolución manual.
        path: 'conflictos',
        loadComponent: () => import('./features/offline/pages/conflicts/offline-conflicts.component').then(m => m.OfflineConflictsComponent),
        canActivate: [authGuard, deviceActiveGuard],
        title: 'FashionStore - Conflictos de sincronización'
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
      },
      {
        // [EXAMEN-2] CU17: PIN y dispositivos autorizados.
        path: 'offline',
        loadComponent: () => import('./features/profile/pages/offline-security/offline-security.component').then(m => m.OfflineSecurityComponent),
        title: 'FashionStore - Seguridad offline'
      },
      {
        // [EXAMEN-2] CU16: pagos diferidos del cliente.
        path: 'pagos-pendientes',
        loadComponent: () => import('./features/profile/pages/pending-payments/my-pending-payments.component').then(m => m.MyPendingPaymentsComponent),
        title: 'FashionStore - Mis pagos pendientes'
      },
      { path: 'notificaciones', loadComponent: () => import('./features/profile/pages/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent), title: 'FashionStore - Mis notificaciones' },
      { path: 'mis-reposiciones', loadComponent: () => import('./features/profile/pages/mis-reposiciones/mis-reposiciones.component').then(m => m.MisReposicionesComponent), title: 'FashionStore - Mis reposiciones' }
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard, tenantOperativoGuard],
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
      },
      {
        // [EXAMEN-2] CU04: asistente de configuración inicial del tenant.
        path: 'configuracion',
        loadComponent: () => import('./features/admin/pages/saas-config/saas-config.component').then(m => m.SaasConfigComponent),
        title: 'FashionStore Admin - Configuración de la empresa'
      },
      {
        // [EXAMEN-2] CU04: plan, vigencia, límites e historial de pagos.
        path: 'mi-suscripcion',
        loadComponent: () => import('./features/admin/pages/mi-suscripcion/mi-suscripcion.component').then(m => m.MiSuscripcionComponent),
        title: 'FashionStore Admin - Mi suscripción'
      },
      {
        // [EXAMEN-2] CU04 / Punto 3: CRUD de tipos de tela y composición.
        path: 'tipos-tela',
        loadComponent: () => import('./features/admin/pages/tipos-tela/tipos-tela-list.component').then(m => m.TiposTelaListComponent),
        title: 'FashionStore Admin - Tipos de tela'
      },
      {
        // [EXAMEN-2] CU16: pagos diferidos, conciliación y reembolsos del tenant.
        path: 'pagos-pendientes',
        loadComponent: () => import('./features/admin/pages/pending-payments/admin-pending-payments.component').then(m => m.AdminPendingPaymentsComponent),
        title: 'FashionStore Admin - Pagos diferidos'
      },
      // [EXAMEN-2] CU10/CU11: reportes generativos
      { path: 'reportes-ia', loadComponent: () => import('./features/admin/pages/ai-reports/ai-reports.component').then(m => m.AiReportsComponent), title: 'FashionStore Admin - Reportes IA' },
      { path: 'reportes-ia/:solicitudId', loadComponent: () => import('./features/admin/pages/ai-reports/reporte-ia-detalle.component').then(m => m.ReporteIaDetalleComponent), title: 'FashionStore Admin - Detalle reporte IA' },
      // [EXAMEN-2] CU12
      { path: 'analitica', loadComponent: () => import('./features/admin/pages/analytics-ml/analytics-ml.component').then(m => m.AnalyticsMlComponent), title: 'FashionStore Admin - Analítica y ML' },
      // [EXAMEN-2] CU14
      { path: 'traspasos', loadComponent: () => import('./features/admin/pages/transfers/transfers.component').then(m => m.TransfersComponent), title: 'FashionStore Admin - Traspasos' },
      // [EXAMEN-2] CU19
      { path: 'compensaciones', loadComponent: () => import('./features/admin/pages/compensaciones/compensaciones.component').then(m => m.CompensacionesComponent), title: 'FashionStore Admin - Compensaciones' },
      // [EXAMEN-2] CU20
      { path: 'respaldos', loadComponent: () => import('./features/admin/pages/respaldos/respaldos.component').then(m => m.RespaldosComponent), title: 'FashionStore Admin - Respaldos' }
    ]
  },
  {
    // [EXAMEN-2] CU01–CU03: panel de plataforma (solo Super Administrador).
    path: 'plataforma',
    loadComponent: () => import('./features/plataforma/layout/plataforma-layout.component').then(m => m.PlataformaLayoutComponent),
    canActivate: [authGuard, superAdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'empresas',
        pathMatch: 'full'
      },
      {
        path: 'empresas',
        loadComponent: () => import('./features/plataforma/pages/tenants/tenant-list.component').then(m => m.TenantListComponent),
        title: 'FashionStore Plataforma - Empresas'
      },
      {
        path: 'empresas/nueva',
        loadComponent: () => import('./features/plataforma/pages/tenants/tenant-form.component').then(m => m.TenantFormComponent),
        title: 'FashionStore Plataforma - Nueva empresa'
      },
      {
        path: 'empresas/:id',
        loadComponent: () => import('./features/plataforma/pages/tenants/tenant-detail.component').then(m => m.TenantDetailComponent),
        title: 'FashionStore Plataforma - Detalle de empresa'
      },
      {
        path: 'empresas/:id/uso',
        loadComponent: () => import('./features/plataforma/pages/tenants/tenant-usage.component').then(m => m.TenantUsageComponent),
        title: 'FashionStore Plataforma - Uso del plan'
      },
      {
        path: 'planes',
        loadComponent: () => import('./features/plataforma/pages/planes/plan-list.component').then(m => m.PlanListComponent),
        title: 'FashionStore Plataforma - Planes'
      },
      {
        path: 'planes/nuevo',
        loadComponent: () => import('./features/plataforma/pages/planes/plan-form.component').then(m => m.PlanFormComponent),
        title: 'FashionStore Plataforma - Nuevo plan'
      },
      {
        path: 'planes/:id',
        loadComponent: () => import('./features/plataforma/pages/planes/plan-form.component').then(m => m.PlanFormComponent),
        title: 'FashionStore Plataforma - Editar plan'
      },
      {
        path: 'suscripciones',
        loadComponent: () => import('./features/plataforma/pages/suscripciones/suscripcion-panel.component').then(m => m.SuscripcionPanelComponent),
        title: 'FashionStore Plataforma - Suscripciones'
      },
      {
        path: 'suscripciones/nueva',
        loadComponent: () => import('./features/plataforma/pages/suscripciones/suscripcion-panel.component').then(m => m.SuscripcionPanelComponent),
        title: 'FashionStore Plataforma - Asignar plan'
      },
      {
        path: 'suscripciones/:id/checkout',
        loadComponent: () => import('./features/plataforma/pages/suscripciones/suscripcion-checkout.component').then(m => m.SuscripcionCheckoutComponent),
        title: 'FashionStore Plataforma - Pago del plan'
      },
      // [EXAMEN-2] CU20
      { path: 'respaldos', loadComponent: () => import('./features/plataforma/pages/respaldos/respaldos-plataforma.component').then(m => m.RespaldosPlataformaComponent), title: 'FashionStore Plataforma - Respaldos' }
    ]
  },
  {
    // [EXAMEN-2] CU03 / RN-011: retorno de Stripe Checkout para la suscripción.
    // Deben existir como rutas raíz porque son las URLs configuradas en las
    // variables STRIPE_SUSCRIPCION_SUCCESS_URL / STRIPE_SUSCRIPCION_CANCEL_URL
    // del backend (antes caían en el wildcard y redirigían al home).
    path: 'suscripcion-exitosa',
    loadComponent: () => import('./features/plataforma/pages/suscripciones/suscripcion-retorno.component').then(m => m.SuscripcionRetornoComponent),
    data: { cancelado: false },
    title: 'FashionStore - Pago de suscripción exitoso'
  },
  {
    path: 'suscripcion-cancelada',
    loadComponent: () => import('./features/plataforma/pages/suscripciones/suscripcion-retorno.component').then(m => m.SuscripcionRetornoComponent),
    data: { cancelado: true },
    title: 'FashionStore - Pago de suscripción cancelado'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

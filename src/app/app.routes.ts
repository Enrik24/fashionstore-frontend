import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
        path: 'inventory',
        loadComponent: () => import('./features/admin/pages/inventory/inventory.component').then(m => m.InventoryComponent),
        title: 'FashionStore Admin - Gestión de Inventario'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

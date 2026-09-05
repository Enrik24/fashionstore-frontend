export interface Proveedor {
  id: number;
  nombre: string;
  nit: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion?: string;
}

export interface ProveedorCreateDto {
  nombre: string;
  nit: string;
  contacto: string;
  telefono: string;
  correo: string;
  direccion?: string;
}

export interface ProveedorUpdateDto {
  nombre?: string;
  nit?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}

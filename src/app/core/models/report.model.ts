export interface ReporteVentasResumen {
  total_recaudado: number;
  total_online: number;
  total_presencial: number;
  cantidad_pedidos_online: number;
  cantidad_ventas_presenciales: number;
  ticket_promedio: number;
}

export interface ProductoVendidoItem {
  producto_id: number;
  nombre: string;
  unidades_vendidas: number;
}

export interface SerieDiariaPunto {
  fecha: string;
  total: number;
  online: number;
  presencial: number;
}

export interface ReporteVentas {
  periodo?: {
    inicio: string;
    fin: string;
  };
  resumen: ReporteVentasResumen;
  top_productos?: ProductoVendidoItem[];
  serie_diaria?: SerieDiariaPunto[];
}

export interface ReporteVentasComparativo {
  actual: ReporteVentas;
  anterior: ReporteVentas;
  deltaPct: {
    total_recaudado: number;
    cantidad_pedidos_online: number;
    cantidad_ventas_presenciales: number;
    ticket_promedio: number;
  };
}

export interface VoiceCommandPreview {
  tipo_reporte: string;
  interpretacion: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  sucursal_id?: number | null;
  formato_sugerido?: string | null;
}

export interface InventarioDetalleItem {
  inventario_id: number;
  producto_id?: number | null;
  producto_nombre: string;
  sku: string;
  talla?: string | null;
  color?: string | null;
  sucursal?: string;
  cantidad_disponible: number;
  cantidad_reservada?: number;
  cantidad_minima: number;
  alerta_bajo_stock: boolean;
}

export interface ReporteInventario {
  total_items_registrados: number;
  total_unidades_disponibles: number;
  items_con_bajo_stock: number;
  limite_mostrados?: number;
  inventario?: InventarioDetalleItem[];
}

export interface ReporteReservas {
  total_reservas: number;
  desglose_estados: {
    PENDIENTE?: number;
    PREPARADA?: number;
    EN_PRUEBA?: number;
    COMPLETADA?: number;
    CANCELADA?: number;
    CADUCADA?: number;
    [key: string]: number | undefined;
  };
  tasa_conversion_recogida_pct: number;
  monto_total_convertido: number;
}

export interface TopClienteItem {
  cliente_id: number;
  nombre: string;
  email: string;
  correo?: string;
  total_pedidos: number;
  total_gastado: number;
}

export interface ReporteClientes {
  total_clientes_registrados: number;
  clientes_activos_con_compras: number;
  top_10_clientes?: TopClienteItem[];
}

export interface ReporteFinanciero {
  ingresos: ReporteVentasResumen;
  desglose_por_metodo_pago?: Record<string, number>;
  beneficio_estimado_margen_40pct: number;
  costo_total_bienes?: number;
  beneficio_real?: number;
  margen_real_pct?: number;
}

export interface KPIItem {
  id?: number;
  nombre: string;
  descripcion?: string;
  valor_actual: number;
  valor_objetivo: number;
  unidad_medida: string;
  tendencia: 'Positiva' | 'Negativa' | 'Neutra' | string;
  periodo: string;
  fecha_actualizacion?: string;
}

export interface KPIDashboard {
  total_ventas_mes: number;
  total_pedidos_mes: number;
  tasa_conversion_reservas: number;
  productos_bajo_stock: number;
  clientes_activos: number;
  ticket_promedio: number;
  kpis_detallados?: KPIItem[];
}

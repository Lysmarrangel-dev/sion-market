// Order state model from doc section 5, with the consumer notification copy from RF-C06.
export type OrderStatus =
  | 'PENDIENTE'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ENTREGADO_AL_DELIVERY'
  | 'EN_CAMINO'
  | 'LLEGANDO'
  | 'ENTREGADO'
  | 'CANCELADO';

// Happy path shown on the timeline.
export const MAIN_FLOW: OrderStatus[] = [
  'PENDIENTE',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO',
  'ENTREGADO_AL_DELIVERY',
  'EN_CAMINO',
  'LLEGANDO',
  'ENTREGADO',
];

export const STATUS_INFO: Record<OrderStatus, { label: string; icon: string }> = {
  PENDIENTE: { label: 'Pedido enviado', icon: 'paper-plane' },
  ACEPTADO: { label: 'Aceptado por el restaurante', icon: 'checkmark-circle' },
  RECHAZADO: { label: 'Rechazado por el restaurante', icon: 'close-circle' },
  EN_PREPARACION: { label: 'En preparación', icon: 'flame' },
  LISTO: { label: 'Listo para retirar', icon: 'bag-check' },
  ENTREGADO_AL_DELIVERY: { label: 'Recogido por el repartidor', icon: 'person' },
  EN_CAMINO: { label: 'En camino', icon: 'bicycle' },
  LLEGANDO: { label: 'Llegando', icon: 'navigate' },
  ENTREGADO: { label: 'Entregado', icon: 'home' },
  CANCELADO: { label: 'Cancelado', icon: 'ban' },
};

export function notificationFor(
  status: OrderStatus,
  ctx: { restaurant: string; rider: string; prepMin: number; reason?: string },
): { title: string; body: string } {
  switch (status) {
    case 'PENDIENTE':
      return { title: 'Pedido enviado', body: `Enviamos tu pedido a ${ctx.restaurant}` };
    case 'ACEPTADO':
      return { title: 'Pedido aceptado', body: `${ctx.restaurant} aceptó tu pedido — listo en ~${ctx.prepMin} min` };
    case 'RECHAZADO':
      return { title: 'Pedido rechazado', body: `${ctx.restaurant} no pudo tomar tu pedido. Te reembolsamos automáticamente.` };
    case 'EN_PREPARACION':
      return { title: 'En preparación', body: 'Están preparando tu pedido' };
    case 'LISTO':
      return { title: '¡Tu pedido está listo!', body: `${ctx.restaurant} terminó tu pedido` };
    case 'ENTREGADO_AL_DELIVERY':
      return { title: 'Pedido recogido', body: `${ctx.rider} ya recogió tu pedido` };
    case 'EN_CAMINO':
      return { title: 'En camino', body: 'Tu pedido va en camino. Síguelo en el mapa.' };
    case 'LLEGANDO':
      return { title: 'Llegando', body: 'Tu repartidor está llegando' };
    case 'ENTREGADO':
      return { title: 'Pedido entregado', body: 'Califica tu experiencia' };
    case 'CANCELADO':
      return { title: 'Pedido cancelado', body: `${ctx.reason ?? 'Pedido cancelado'}. Tu reembolso está en proceso.` };
  }
}

// Consumer can cancel without penalty until ACEPTADO (section 5).
export const canConsumerCancel = (status: OrderStatus) => status === 'PENDIENTE' || status === 'ACEPTADO';

export const isActive = (status: OrderStatus) => !['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(status);

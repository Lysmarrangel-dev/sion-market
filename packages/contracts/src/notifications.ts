import type { OrderStatus } from './order-status.js';

/** Customer-facing copy for each status (RF-C06). Same text for push and in-app banners. */
export function notificationFor(
  status: OrderStatus,
  ctx: { restaurant: string; rider?: string | null; prepMin?: number; reason?: string | null },
): { title: string; body: string } {
  switch (status) {
    case 'PENDIENTE':
      return { title: 'Pedido enviado', body: `Enviamos tu pedido a ${ctx.restaurant}` };
    case 'ACEPTADO':
      return {
        title: 'Pedido aceptado',
        body: ctx.prepMin ? `${ctx.restaurant} aceptó tu pedido, listo en ~${ctx.prepMin} min` : `${ctx.restaurant} aceptó tu pedido`,
      };
    case 'RECHAZADO':
      return { title: 'Pedido rechazado', body: `${ctx.restaurant} no pudo tomar tu pedido. Te reembolsamos automáticamente.` };
    case 'EN_PREPARACION':
      return { title: 'En preparación', body: 'Están preparando tu pedido' };
    case 'LISTO':
      return { title: '¡Tu pedido está listo!', body: `${ctx.restaurant} terminó tu pedido` };
    case 'ENTREGADO_AL_DELIVERY':
      return { title: 'Pedido recogido', body: `${ctx.rider ?? 'Tu repartidor'} ya recogió tu pedido` };
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

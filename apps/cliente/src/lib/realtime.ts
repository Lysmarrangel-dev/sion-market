import { RT, type OrderStatusEvent, type RiderPosition } from '@sionmarket/contracts';
import { io, type Socket } from 'socket.io-client';

import { getSession, onSessionChange, online, REALTIME_URL } from '@/lib/api';

// One socket per signed-in session. The server joins it to the user's own room, so order
// status changes arrive without subscribing; following an order adds the rider's position.
let socket: Socket | null = null;
let socketUser: string | null = null;

function connect() {
  const current = getSession();
  // A refreshed token for the same user only needs to be used on the next reconnect.
  if (socket && current && current.user.id === socketUser) {
    socket.auth = { token: current.accessToken };
    return;
  }
  socketUser = current?.user.id ?? null;
  socket?.disconnect();
  socket = null;
  const s = getSession();
  if (!online || !s) return;
  socket = io(REALTIME_URL, { path: '/ws', auth: { token: s.accessToken }, transports: ['websocket'] });
  // The access token is short-lived: send the current one on every reconnect.
  socket.io.on('reconnect_attempt', () => {
    if (socket) socket.auth = { token: getSession()?.accessToken };
  });
}

if (online) {
  onSessionChange(connect);
  connect(); // the session may already be restored when this module loads
}

export function onOrderStatus(handler: (e: OrderStatusEvent) => void) {
  socket?.on('pedido.estado', handler);
  return () => {
    socket?.off('pedido.estado', handler);
  };
}

export function followOrder(orderId: string, onPosition: (p: RiderPosition) => void) {
  if (!socket) return () => {};
  const s = socket;
  s.emit('suscribir', { orderId });
  s.on('repartidor.ubicacion', onPosition);
  return () => {
    s.emit('desuscribir', { orderId });
    s.off('repartidor.ubicacion', onPosition);
  };
}

/**
 * Restaurant inbox: new orders and every status change of this restaurant's orders.
 * Rooms are lost when the socket reconnects, so the subscription is sent again each time.
 */
export function followRestaurant(restaurantId: string, handlers: { onNew: (e: OrderStatusEvent) => void; onStatus: (e: OrderStatusEvent) => void }) {
  if (!socket) return () => {};
  const s = socket;
  const subscribe = () => s.emit('suscribir', { restaurantId });
  subscribe();
  s.on('connect', subscribe);
  s.on(RT.orderNew, handlers.onNew);
  s.on(RT.orderStatus, handlers.onStatus);
  return () => {
    s.emit('desuscribir', { restaurantId });
    s.off('connect', subscribe);
    s.off(RT.orderNew, handlers.onNew);
    s.off(RT.orderStatus, handlers.onStatus);
  };
}

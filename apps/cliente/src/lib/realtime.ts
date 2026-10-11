import type { OrderStatusEvent, RiderPosition } from '@sionmarket/contracts';
import { io, type Socket } from 'socket.io-client';

import { getSession, onSessionChange, online, REALTIME_URL } from '@/lib/api';

// One socket per signed-in session. The server joins it to the user's own room, so order
// status changes arrive without subscribing; following an order adds the rider's position.
let socket: Socket | null = null;

function connect() {
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

if (online) onSessionChange(connect);

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

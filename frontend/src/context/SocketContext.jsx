import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [liveEvent, setLiveEvent] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = window.location.origin;
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected with ID:', socketInstance.id);

      if (user) {
        // Join user-specific room
        socketInstance.emit('join_user', user.id);

        // Join canteen room if staff or admin
        if (user.canteen_id) {
          socketInstance.emit('join_canteen', user.canteen_id);
        }
      }
    });

    // Listen for order status updates
    socketInstance.on('order_status_updated', (data) => {
      console.log('[Socket] Order status updated:', data);
      setLiveEvent({ type: 'order_status_updated', data, timestamp: Date.now() });
      if (data.message) {
        setNotifications((prev) => [
          { id: Date.now(), title: `Order #${data.orderId}: ${data.status.replace(/_/g, ' ').toUpperCase()}`, message: data.message },
          ...prev.slice(0, 9)
        ]);
      }
    });

    // Listen for incoming new orders (kitchen staff)
    socketInstance.on('new_order', (data) => {
      console.log('[Socket] New incoming order:', data);
      setLiveEvent({ type: 'new_order', data, timestamp: Date.now() });
      setNotifications((prev) => [
        { id: Date.now(), title: 'New Order Received!', message: `Order #${data.id} placed for ${data.total_amount} BDT.` },
        ...prev.slice(0, 9)
      ]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const clearNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, liveEvent, clearNotification }}>
      {children}
      {/* Toast Notification Banner */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.slice(0, 3).map((notif) => (
          <div
            key={notif.id}
            className="pointer-events-auto bg-gray-900 text-white p-4 rounded-xl shadow-2xl border border-gray-700 flex items-start justify-between gap-3 animate-slide-in"
          >
            <div>
              <p className="text-sm font-bold text-orange-400">{notif.title}</p>
              <p className="text-xs text-gray-300 mt-1">{notif.message}</p>
            </div>
            <button
              onClick={() => clearNotification(notif.id)}
              className="text-gray-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

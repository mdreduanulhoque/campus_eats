import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { CartDrawer } from './components/customer/CartDrawer';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { HomePage } from './pages/customer/HomePage';
import { CanteenList } from './pages/customer/CanteenList';
import { CanteenMenu } from './pages/customer/CanteenMenu';
import { OrdersHistory } from './pages/customer/OrdersHistory';
import { Profile } from './pages/customer/Profile';
import { KitchenBoard } from './pages/kitchen/KitchenBoard';
import { LocalAdminDashboard } from './pages/localAdmin/LocalAdminDashboard';
import { SuperAdminDashboard } from './pages/superAdmin/SuperAdminDashboard';

export function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Navbar onOpenCart={() => setIsCartOpen(true)} />
              
              <main className="flex-1">
                <Routes>
                  {/* Public Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Public Browsing Routes (No account required) */}
                  <Route
                    path="/"
                    element={<HomePage onOpenCart={() => setIsCartOpen(true)} />}
                  />
                  <Route
                    path="/canteens"
                    element={<CanteenList />}
                  />
                  <Route
                    path="/canteen/:id"
                    element={<CanteenMenu onOpenCart={() => setIsCartOpen(true)} />}
                  />

                  {/* Customer Authenticated Routes (Requires user account) */}
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute allowedRoles={['user', 'super_admin']}>
                        <OrdersHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute allowedRoles={['user', 'kitchen_staff', 'local_admin', 'super_admin']}>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Kitchen Staff Route */}
                  <Route
                    path="/kitchen"
                    element={
                      <ProtectedRoute allowedRoles={['kitchen_staff', 'local_admin', 'super_admin']}>
                        <KitchenBoard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Local Admin Route */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['local_admin', 'super_admin']}>
                        <LocalAdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Super Admin Route */}
                  <Route
                    path="/super-admin"
                    element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Global Cart Slide-Over Drawer */}
              <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            </div>
          </BrowserRouter>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

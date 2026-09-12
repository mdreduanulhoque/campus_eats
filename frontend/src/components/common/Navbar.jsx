import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';
import { 
  ShoppingBag, 
  User, 
  LogOut, 
  Utensils, 
  Clock, 
  ShieldAlert, 
  Award, 
  LayoutDashboard,
  Store,
  FileText,
  Bell
} from 'lucide-react';

export const Navbar = ({ onOpenCart }) => {
  const { user, logout } = useAuth();
  const { totalItemCount } = useCart();
  const { liveEvent } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/users/notifications');
      setNotifications(res.data.data.notifications || []);
    } catch (err) {
      console.error('Error fetching navbar notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user, liveEvent]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Campus Tag */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">
                Campus<span className="text-orange-500">Eats</span>
              </span>
              <span className="hidden sm:block text-[10px] font-semibold text-gray-400 uppercase tracking-widest -mt-1">
                Fast Pickup
              </span>
            </div>
          </Link>

          {/* Role specific links & User Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                {/* Customer Controls */}
                {user.role === 'user' && (
                  <>
                    {/* Loyalty Points Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-xs">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>{user.loyalty_points || 0} pts</span>
                    </div>

                    {/* Cart Trigger */}
                    <button
                      onClick={onOpenCart}
                      className="relative p-2.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 transition-colors flex items-center justify-center"
                      title="View Cart"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {totalItemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-scale-in">
                          {totalItemCount}
                        </span>
                      )}
                    </button>
                  </>
                )}

                {/* Kitchen Staff Links */}
                {user.role === 'kitchen_staff' && (
                  <Link
                    to="/kitchen"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      location.pathname === '/kitchen'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Kitchen Orders</span>
                  </Link>
                )}

                {/* Local Admin Links */}
                {user.role === 'local_admin' && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Canteen Admin</span>
                  </Link>
                )}

                {/* Super Admin Links */}
                {user.role === 'super_admin' && (
                  <Link
                    to="/super-admin"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      location.pathname === '/super-admin'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span className="hidden sm:inline">Super Admin</span>
                  </Link>
                )}

                {/* Notifications Bell Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="p-2 rounded-full text-gray-600 hover:bg-gray-100 relative transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white ring-1 ring-orange-500 animate-pulse" />
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-scale-in">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                        <span className="font-extrabold text-xs text-gray-900">Notifications</span>
                        <span className="text-[10px] font-bold text-gray-400">{notifications.length} alerts</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-gray-400 py-4 text-center">No notifications yet</p>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div
                              key={n.id}
                              className={`p-2.5 rounded-xl text-xs transition-colors ${
                                n.is_read ? 'bg-gray-50 text-gray-600' : 'bg-orange-50/80 text-gray-900 font-semibold'
                              }`}
                            >
                              <p className="font-bold text-gray-900 text-[11px]">{n.title}</p>
                              <p className="text-[11px] text-gray-600 mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Link */}
                <Link
                  to="/profile"
                  className={`p-2 rounded-full transition-colors ${
                    location.pathname === '/profile'
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="My Profile"
                >
                  <User className="w-5 h-5" />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Guest Cart Trigger */}
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 transition-colors flex items-center justify-center cursor-pointer"
                  title="View Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {totalItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-scale-in">
                      {totalItemCount}
                    </span>
                  )}
                </button>

                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 sm:px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Guest Mobile Bottom Bar */}
      {!user && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-2 px-6 flex items-center justify-around shadow-lg">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              location.pathname === '/' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span>Menu</span>
          </Link>
          <button
            onClick={onOpenCart}
            className="flex flex-col items-center gap-1 text-xs font-semibold text-gray-400 relative"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Cart</span>
            {totalItemCount > 0 && (
              <span className="absolute -top-1 right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItemCount}
              </span>
            )}
          </button>
          <Link
            to="/login"
            className="flex flex-col items-center gap-1 text-xs font-semibold text-orange-600"
          >
            <User className="w-5 h-5" />
            <span>Sign In</span>
          </Link>
        </nav>
      )}

      {/* Customer Mobile Bottom Bar */}
      {user && user.role === 'user' && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-2 px-6 flex items-center justify-around shadow-lg">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              location.pathname === '/' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Canteens</span>
          </Link>
          <Link
            to="/orders"
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              location.pathname === '/orders' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>My Orders</span>
          </Link>
          <button
            onClick={onOpenCart}
            className="flex flex-col items-center gap-1 text-xs font-semibold text-gray-400 relative"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Cart</span>
            {totalItemCount > 0 && (
              <span className="absolute -top-1 right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItemCount}
              </span>
            )}
          </button>
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 text-xs font-semibold ${
              location.pathname === '/profile' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </>
  );
};

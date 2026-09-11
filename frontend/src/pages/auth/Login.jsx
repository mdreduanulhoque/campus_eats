import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Utensils, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      // Redirect based on role
      if (user.role === 'kitchen_staff') navigate('/kitchen');
      else if (user.role === 'local_admin') navigate('/admin');
      else if (user.role === 'super_admin') navigate('/super-admin');
      else navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Utensils className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to Campus<span className="text-orange-500">Eats</span>
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          Fast preorders & pickups for university campus canteens
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campuseats.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 text-sm transition-all cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
              Quick Fill Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => fillCredentials('student.rahim@campuseats.com')}
                className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-left transition-colors"
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('kitchen.central@campuseats.com')}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-left transition-colors"
              >
                👨‍🍳 Kitchen Staff
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('admin.central@campuseats.com')}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-left transition-colors"
              >
                🏢 Local Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('superadmin@campuseats.com')}
                className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-left transition-colors"
              >
                ⚡ Super Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-orange-600 hover:text-orange-500">
              Sign up as a Student/Faculty
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

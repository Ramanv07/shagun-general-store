
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockApi } from '../services/mockService';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                const user = await mockApi.login(formData.email, formData.password);
                login(user);
                navigate(user.role === 'admin' ? '/admin' : '/');
            } else {
                const user = await mockApi.register(formData.name, formData.email, formData.password);
                login(user);
                navigate('/');
            }
        } catch (error) {
            alert('Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-midnight-950 flex items-center justify-center px-4">
            {/* Background blobs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-500/20 rounded-full blur-[80px]"></div>

            <div className="glass p-8 md:p-12 rounded-2xl w-full max-w-md relative z-10">
                <h2 className="text-3xl font-serif font-bold text-white text-center mb-2">
                    {isLogin ? 'Welcome Back' : 'Join Shagun'}
                </h2>
                <p className="text-gray-400 text-center mb-8">
                    {isLogin ? 'Enter your details to access your account' : 'Create an account to start shopping'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <input
                                placeholder="Full Name"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-gold-500 transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-gold-500 transition-all"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-gold-500 transition-all"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold py-3 rounded-lg shadow-lg hover:shadow-gold-500/20 transition-all transform hover:-translate-y-1"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};

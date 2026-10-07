import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Mail, Phone, MessageCircle, FileText, ChevronRight } from 'lucide-react';

export const HelpSupportModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleHashChange = () => {
            if (window.location.hash === '#help') {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        };

        handleHashChange(); // Check on mount
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleClose = () => {
        window.location.hash = '';
    };

    if (!isOpen) return null;

    const faqs = [
        { q: "How long does delivery take?", a: "Standard delivery takes 3-5 business days depending on your location." },
        { q: "What is your return policy?", a: "We offer a 7-day return policy for unused products in their original packaging." },
        { q: "How does Lehenga rental work?", a: "You can book online, pay a security deposit, and keep the lehenga for the agreed duration. The deposit is refunded upon safe return." }
    ];

    return (
        <div className="fixed inset-0 bg-ink-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-cream-50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-maroon-900 text-cream-50 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="text-gold-500" />
                        <h2 className="text-xl font-bold font-serif">Help & Support</h2>
                    </div>
                    <button onClick={handleClose} className="text-cream-50/70 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Contact Methods */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-ink-900 border-b border-gray-200 pb-2">Contact Us</h3>
                            
                            <a href="tel:+919876543210" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-maroon-900/30 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 rounded-full bg-maroon-50 flex items-center justify-center text-maroon-900 group-hover:bg-maroon-900 group-hover:text-white transition-colors">
                                    <Phone size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-ink-900">Call Us</p>
                                    <p className="text-sm text-gray-500">+91 98765 43210</p>
                                </div>
                            </a>

                            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-green-600/30 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    <MessageCircle size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-ink-900">WhatsApp</p>
                                    <p className="text-sm text-gray-500">Quick replies 9am - 8pm</p>
                                </div>
                            </a>

                            <a href="mailto:support@shagungeneralstore.com" className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-blue-600/30 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-ink-900">Email</p>
                                    <p className="text-sm text-gray-500 text-ellipsis overflow-hidden">support@shagungeneralstore.com</p>
                                </div>
                            </a>
                        </div>

                        {/* FAQs */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-ink-900 border-b border-gray-200 pb-2">Frequently Asked</h3>
                            <div className="space-y-3">
                                {faqs.map((faq, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <h4 className="font-semibold text-sm text-ink-900 flex items-start gap-2 mb-2">
                                            <FileText size={16} className="text-gold-500 shrink-0 mt-0.5" />
                                            <span>{faq.q}</span>
                                        </h4>
                                        <p className="text-xs text-gray-600 leading-relaxed pl-6">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-maroon-50 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-maroon-900 mb-1">Visit our store</h4>
                            <p className="text-sm text-maroon-900/70">Main Market, Bamitha, Madhya Pradesh 471105</p>
                        </div>
                        <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-maroon-900 shadow-sm hover:bg-maroon-900 hover:text-white transition-colors shrink-0">
                            <ChevronRight size={20} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

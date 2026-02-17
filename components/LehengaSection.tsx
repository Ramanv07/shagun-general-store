
import React, { useEffect, useState } from 'react';
import { mockApi } from '../services/mockService';
import { ADMIN_WHATSAPP } from '../constants';

interface Lehenga {
    _id: string;
    name: string;
    price: number;
    image: string;
    description: string;
}

export const LehengaSection: React.FC = () => {
    const [lehengas, setLehengas] = useState<Lehenga[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        mockApi.getLehengas().then(data => {
            setLehengas(data);
            setLoading(false);
        });
    }, []);

    const handleWhatsAppBooking = (lehenga: Lehenga) => {
        const timestamp = new Date().toLocaleString();
        const message = `*Shagun General Store - New Booking Inquiry*
        
📅 *Date:* ${timestamp}
👗 *Product:* ${lehenga.name}
💰 *Price:* ₹${lehenga.price.toLocaleString()}
📝 *Ref:* ${lehenga._id}

I would like to inquire about/book this Lehenga. Please let me know the availability and delivery details.

*Link:* ${window.location.href}`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodedMessage}`, '_blank');
    };

    if (loading) return null;

    return (
        <section id="lehengas" className="py-24 px-4 bg-midnight-950">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Exclusive Collection</h2>
                    <div className="h-1 w-20 bg-gold-500"></div>
                    <p className="mt-6 text-gray-400 max-w-2xl">Discover our handcrafted Lehenga collection. Each piece is unique and designed for your special moments.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {lehengas.map((lehenga) => (
                        <div key={lehenga._id} className="glass-card rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="relative h-[500px] overflow-hidden">
                                <img
                                    src={lehenga.image}
                                    alt={lehenga.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <button
                                    onClick={() => handleWhatsAppBooking(lehenga)}
                                    className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-gradient-to-r from-gold-500 to-amber-600 text-black font-bold rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                                >
                                    <i className="fab fa-whatsapp mr-2"></i> Book Now
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-white leading-tight">{lehenga.name}</h3>
                                    <span className="text-gold-400 font-bold whitespace-nowrap ml-2">₹{lehenga.price.toLocaleString()}</span>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2">{lehenga.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

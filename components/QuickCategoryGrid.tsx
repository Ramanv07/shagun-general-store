import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockService';
import { CategorySectionGroup, CategorySectionItem } from '../types';
import { RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface QuickCategoryGridProps {
  className?: string;
}

export const QuickCategoryGrid: React.FC<QuickCategoryGridProps> = ({ className }) => {
  const [sections, setSections] = useState<CategorySectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchSections = async () => {
    try {
      setLoading(true);
      const data = await mockApi.getCategorySections();
      if (data && data.length > 0) {
        setSections(data);
      }
    } catch (err) {
      console.error('Error loading category sections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleSyncWithDb = async () => {
    try {
      setSyncing(true);
      await mockApi.syncCategories();
      await fetchSections();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleCategoryClick = (item: CategorySectionItem) => {
    navigate(item.link);
  };

  // Filter sections if a specific tab is chosen
  const displayedSections = activeTab === 'all'
    ? sections
    : sections.filter(s => s.sectionTitle.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <section className={className || "py-10 sm:py-14 bg-white border-y border-line/40"}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-16">
        {/* ── Category Sections ── */}
        {loading ? (
          <div className="space-y-10">
            {[1, 2].map((s) => (
              <div key={s} className="space-y-4">
                <div className="h-6 w-48 bg-cream-200 rounded-md animate-pulse" />
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                      <div className="w-full aspect-square rounded-2xl bg-cream-200" />
                      <div className="h-3 w-14 bg-cream-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12">
            {displayedSections.map((section) => (
              <div key={section._id} className="animate-fade-in-up">
                
                {/* Section Title */}
                <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                  <div>
                    <h3 className="text-[17px] sm:text-xl font-bold text-ink-900 tracking-tight">
                      {section.sectionTitle}
                    </h3>
                    {section.sectionSubtitle && (
                      <p className="text-xs text-ink-500 hidden sm:block mt-0.5">
                        {section.sectionSubtitle}
                      </p>
                    )}
                  </div>
                  <Link
                    to={section.items[0]?.link || '/shop'}
                    className="text-[12px] sm:text-xs font-semibold text-maroon-800 hover:text-maroon-950 flex items-center gap-0.5"
                  >
                    <span>See all</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>

                {/* 4-column responsive grid (Zepto / Quick-commerce style) */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-2.5 sm:gap-x-4 gap-y-4 sm:gap-y-6">
                  {section.items.map((item) => (
                    <div
                      key={item._id || item.slug}
                      onClick={() => handleCategoryClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCategoryClick(item); }}
                      className="flex flex-col items-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-900 rounded-2xl"
                    >
                      {/* Pastel Rounded Card Box */}
                      <div
                        className="w-full aspect-square rounded-2xl sm:rounded-3xl p-2 sm:p-3 flex items-center justify-center relative overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-md group-active:scale-95 border border-[#FBE3E8]/70"
                        style={{ backgroundColor: item.bgColor || '#FDF0F3' }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-108"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (item.localImage && target.src !== item.localImage) {
                              target.src = item.localImage;
                            } else {
                              target.src = '/app-icon.png';
                            }
                          }}
                        />
                        {item.badge && (
                          <span className="absolute top-1 right-1 bg-maroon-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* 2-line Category Name */}
                      <span className="text-[11px] sm:text-[12px] font-semibold text-ink-900 text-center leading-tight line-clamp-2 mt-1.5 px-0.5 group-hover:text-maroon-800 transition-colors">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};

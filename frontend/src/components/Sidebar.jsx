import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  Wallet, 
  ArrowLeftRight, 
  Sparkles, 
  BookOpen, 
  Baby, 
  GraduationCap, 
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../context/AcademicYearContext';
import { useSettings } from '../context/SettingsContext';
import { useSidebar } from '../context/SidebarContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedYearObj } = useAcademicYear();
  const { settings } = useSettings();
  const { t, isRtl, dir } = useLanguage();
  const { 
    isOpen, 
    isCollapsed, 
    isMobile, 
    toggleCollapsed, 
    closeSidebar 
  } = useSidebar();

  const handleLogout = () => {
    if (isMobile) closeSidebar();
    logout();
    navigate('/');
  };

  const navSections = useMemo(() => [
    {
      id: 'dashboard',
      items: [
        { to: '/', label: t('sidebar.dashboard'), icon: LayoutDashboard, exact: true, perm: 'dashboard' },
      ]
    },
    {
      id: 'students',
      items: [
        { to: '/students', label: t('sidebar.students'), icon: Users, perm: 'students' },
        { to: '/transfers', label: t('sidebar.transfers'), icon: ArrowLeftRight, perm: 'transfers' },
      ]
    },
    {
      id: 'academic',
      items: [
        { to: '/tracks', label: t('sidebar.groups_tracks'), icon: Layers, perm: 'tracks' },
        { to: '/timetable', label: t('sidebar.classrooms_timetable'), icon: CalendarDays, perm: 'timetable' },
        { to: '/teachers', label: t('sidebar.teachers'), icon: GraduationCap, perm: 'teachers' },
      ]
    },
    {
      id: 'finance',
      items: [
        { to: '/finance', label: t('sidebar.finance'), icon: Wallet, perm: 'finance' },
      ]
    },
    {
      id: 'system',
      items: [
        { to: '/rollover', label: t('sidebar.rollover'), icon: Sparkles, perm: 'rollover' },
        { to: '/settings', label: t('sidebar.settings'), icon: Settings, perm: 'settings' },
      ]
    }
  ], [t]);

  const visibleNavSections = useMemo(() => {
    if (!user) return [];
    if (user.role === 'ADMIN') return navSections;
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return navSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!item.perm) return true;
          if (item.perm === 'settings' && perms.includes('users')) return true;
          return perms.includes(item.perm);
        })
      }))
      .filter(section => section.items.length > 0);
  }, [navSections, user]);

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  // 1. MOBILE DRAWER LAYOUT (Screen < 1024px)
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay */}
        <div 
          onClick={closeSidebar}
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />

        {/* Sliding Off-Canvas Drawer */}
        <aside
          className={`no-print fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-72 bg-surface-card border-border shadow-2xl p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full pointer-events-none' : '-translate-x-full pointer-events-none')
          }`}
          dir={dir}
        >
          <div className="space-y-6 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  ق
                </div>
                <span className="font-extrabold text-base text-text-main">
                  {t('sidebar.main_menu')}
                </span>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
                title={t('sidebar.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Academic Year Card */}
            <div className="p-3.5 bg-surface border border-border/80 rounded-2xl">
              <span className="text-[11px] font-bold text-text-muted block mb-0.5">
                {t('sidebar.current_scope')}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-primary font-cairo">
                  {selectedYearObj?.label || t('sidebar.current_year')}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  selectedYearObj?.is_locked 
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25' 
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25'
                }`}>
                  {selectedYearObj?.is_locked ? t('sidebar.locked') : t('sidebar.active')}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {visibleNavSections.map((section, sIdx) => (
                <React.Fragment key={section.id}>
                  {sIdx > 0 && <div className="my-2.5 border-t border-border/70" />}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.exact}
                          onClick={handleLinkClick}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                            ${isActive 
                              ? `bg-primary text-white shadow-lg shadow-primary/25 ${isRtl ? '-translate-x-1' : 'translate-x-1'}` 
                              : 'text-text-muted hover:text-text-main hover:bg-surface'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </nav>

            {/* Active Tracks Guide */}
            <div className="pt-4 border-t border-border/60">
              <span className="text-xs font-bold text-text-muted px-2 block mb-2">
                {t('sidebar.active_tracks')}
              </span>
              <div className="space-y-1.5">
                {Boolean(settings?.enable_quran_track) && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{t('sidebar.quran_track')}</span>
                  </div>
                )}
                {Boolean(settings?.enable_preschool_track) && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    <Baby className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{t('sidebar.preschool_track')}</span>
                  </div>
                )}
                {Boolean(settings?.enable_tutoring_track) && (
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    <GraduationCap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{t('sidebar.tutoring_track')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Logout Action (Mobile) */}
          <div className="pt-2 mb-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 p-3 rounded-2xl text-xs font-extrabold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border/60 text-center">
            <span className="text-[11px] font-bold text-text-muted block">
              {t('sidebar.app_name')}
            </span>
            <span className="text-[10px] text-text-muted/80">
              {t('sidebar.all_rights_reserved')}
            </span>
          </div>
        </aside>
      </>
    );
  }

  // 2. DESKTOP DYNAMIC WIDTH LAYOUT (Screen >= 1024px)
  const sidebarBorderClass = isRtl ? 'border-l' : 'border-r';
  const sidebarWidthClass = !isOpen
    ? `w-0 ${isRtl ? 'border-l-0' : 'border-r-0'} p-0 overflow-hidden opacity-0 pointer-events-none`
    : isCollapsed
    ? 'w-20 p-2.5 opacity-100'
    : 'w-64 p-4 opacity-100';

  return (
    <aside
      className={`no-print bg-surface-card ${sidebarBorderClass} border-border min-h-[calc(100vh-5rem)] flex flex-col justify-between transition-all duration-300 ease-in-out flex-shrink-0 select-none ${sidebarWidthClass}`}
    >
      <div className="space-y-5">
        
        {/* Header with Compact / Full Width Toggle Button */}
        {isOpen && (
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} pb-1`}>
            {!isCollapsed && (
              <span className="text-xs font-black text-text-muted">
                {t('sidebar.quick_nav')}
              </span>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-text-main transition-colors"
              title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              {isCollapsed ? (
                isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Active Academic Year Card Indicator */}
        {isOpen && (
          isCollapsed ? (
            <div 
              className="p-2 bg-surface border border-border/80 rounded-2xl text-center"
              title={`${t('sidebar.current_scope')} ${selectedYearObj?.label || t('sidebar.current_year')} (${selectedYearObj?.is_locked ? t('sidebar.locked') : t('sidebar.active')})`}
            >
              <div className="w-2.5 h-2.5 mx-auto rounded-full bg-primary mb-1 animate-pulse" />
              <span className="text-[10px] font-black text-text-main block truncate">
                {selectedYearObj?.label?.split('/')[0] || t('sidebar.current_year')}
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-surface border border-border/80 rounded-2xl">
              <span className="text-[11px] font-bold text-text-muted block mb-0.5">
                {t('sidebar.current_scope')}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-primary font-cairo">
                  {selectedYearObj?.label || t('sidebar.current_year')}
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  selectedYearObj?.is_locked 
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25' 
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25'
                }`}>
                  {selectedYearObj?.is_locked ? t('sidebar.locked') : t('sidebar.active')}
                </span>
              </div>
            </div>
          )
        )}

        {/* Navigation Links */}
        <nav className="space-y-1">
          {visibleNavSections.map((section, sIdx) => (
            <React.Fragment key={section.id}>
              {sIdx > 0 && (
                <div className={`my-2.5 border-t border-border/70 ${isCollapsed ? 'mx-auto w-6' : 'mx-1'}`} />
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) => `
                        flex items-center rounded-2xl font-bold transition-all
                        ${isCollapsed ? 'justify-center p-3 text-sm' : 'gap-3 px-4 py-3 text-sm'}
                        ${isActive 
                          ? `bg-primary text-white shadow-lg shadow-primary/25 ${isRtl ? '-translate-x-1' : 'translate-x-1'}` 
                          : 'text-text-muted hover:text-text-main hover:bg-surface'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* Concurrent Tracks Quick Switch Filter Guide */}
        {!isCollapsed && (
          <div className="pt-4 border-t border-border/60">
            <span className="text-xs font-bold text-text-muted px-2 block mb-2">
              {t('sidebar.active_tracks')}
            </span>
            <div className="space-y-1.5">
              {Boolean(settings?.enable_quran_track) && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{t('sidebar.quran_track')}</span>
                </div>
              )}
              {Boolean(settings?.enable_preschool_track) && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  <Baby className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="truncate">{t('sidebar.preschool_track')}</span>
                </div>
              )}
              {Boolean(settings?.enable_tutoring_track) && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  <GraduationCap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{t('sidebar.tutoring_track')}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Footer Info & Logout */}
      <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2.5'
          } rounded-2xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer`}
          title={t('nav.logout')}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>{t('nav.logout')}</span>}
        </button>

        {!isCollapsed && (
          <div className="text-center pt-1">
            <span className="text-[11px] font-bold text-text-muted block">
              {t('sidebar.app_name')}
            </span>
            <span className="text-[10px] text-text-muted/80">
              {t('sidebar.all_rights_reserved')}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

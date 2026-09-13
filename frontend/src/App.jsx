import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { SidebarProvider } from './context/SidebarContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import TracksPage from './pages/TracksPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import StudentsPage from './pages/StudentsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import FinancePage from './pages/FinancePage';
import ProductsPage from './pages/ProductsPage';
import TransfersPage from './pages/TransfersPage';
import RolloverPage from './pages/RolloverPage';
import SettingsPage from './pages/SettingsPage';
import TeachersPage from './pages/TeachersPage';
import ClassroomsTimetablePage from './pages/ClassroomsTimetablePage';
import AuditLogsPage from './pages/AuditLogsPage';
import HelpPage from './pages/HelpPage';

import { useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import LoginPage from './pages/LoginPage';
import MandatoryAcademicYearModal from './components/MandatoryAcademicYearModal';
import MandatoryDeviceModal from './components/MandatoryDeviceModal';

function AppContent() {
  const { dir, t } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-text-main" dir={dir}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-text-muted">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-text-main transition-colors" dir={dir}>
      {/* Mandatory Device Registration Modal for unverified/unregistered workstation */}
      <MandatoryDeviceModal />

      {/* Mandatory Academic Year Modal when no academic year exists */}
      <MandatoryAcademicYearModal />

      {/* Global Navbar */}
      <Navbar />

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex w-full">
        {/* Fixed / Sticky Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tracks" element={<TracksPage />} />
            <Route path="/groups/:id" element={<GroupDetailsPage />} />
            <Route path="/timetable" element={<ClassroomsTimetablePage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentProfilePage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/rollover" element={<RolloverPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/logs" element={<AuditLogsPage />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProvider>
          <SettingsProvider>
            <AuthProvider>
              <DeviceProvider>
                <AcademicYearProvider>
                  <SidebarProvider>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true
                      }}
                    >
                      <AppContent />
                    </BrowserRouter>
                  </SidebarProvider>
                </AcademicYearProvider>
              </DeviceProvider>
            </AuthProvider>
          </SettingsProvider>
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

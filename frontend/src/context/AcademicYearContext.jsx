import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic-years');
      if (res.success && res.data.length > 0) {
        setAcademicYears(res.data);
        
        // Pick stored year or current year or first
        const stored = localStorage.getItem('qafgo_academic_year_id');
        const currentYear = res.data.find(y => y.is_current);
        const initial = stored && res.data.some(y => y.id == stored)
          ? parseInt(stored, 10)
          : (currentYear ? currentYear.id : res.data[0].id);

        setSelectedYearId(initial);
        localStorage.setItem('qafgo_academic_year_id', initial.toString());
      } else {
        setAcademicYears([]);
        setSelectedYearId(null);
      }
    } catch (err) {
      console.error('Failed to load academic years:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const selectYear = (yearId) => {
    const id = parseInt(yearId, 10);
    setSelectedYearId(id);
    localStorage.setItem('qafgo_academic_year_id', id.toString());
  };

  const selectedYearObj = academicYears.find(y => y.id === selectedYearId) || academicYears[0] || null;

  return (
    <AcademicYearContext.Provider value={{
      academicYears,
      selectedYearId,
      selectedYearObj,
      selectYear,
      reloadYears: fetchYears,
      loading
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);

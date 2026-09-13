import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Plus, Trash2, Sparkles, Check, Calendar, AlertTriangle } from 'lucide-react';
import TimeInput from './TimeInput';
import { useLanguage } from '../context/LanguageContext';

const DAYS_LIST = [
  { key: 'SATURDAY', ar: 'السبت', en: 'Saturday', fr: 'Samedi' },
  { key: 'SUNDAY', ar: 'الأحد', en: 'Sunday', fr: 'Dimanche' },
  { key: 'MONDAY', ar: 'الإثنين', en: 'Monday', fr: 'Lundi' },
  { key: 'TUESDAY', ar: 'الثلاثاء', en: 'Tuesday', fr: 'Mardi' },
  { key: 'WEDNESDAY', ar: 'الأربعاء', en: 'Wednesday', fr: 'Mercredi' },
  { key: 'THURSDAY', ar: 'الخميس', en: 'Thursday', fr: 'Jeudi' },
  { key: 'FRIDAY', ar: 'الجمعة', en: 'Friday', fr: 'Vendredi' },
];

export default function GroupScheduleBuilder({ trackType = 'HALAQA', value = '', onChange }) {
  const { t, lang = 'ar', currentLanguage, isRtl } = useLanguage();
  const currentLang = lang || currentLanguage || 'ar';

  const lastEmittedTextRef = useRef('');
  const lastParsedValueRef = useRef('');

  const getDayName = (key) => {
    const found = DAYS_LIST.find(d => d.key === key);
    if (!found) return key;
    if (currentLang === 'fr') return found.fr;
    if (currentLang === 'en') return found.en;
    return found.ar;
  };

  // Preschool State: Array of active study days (defaults to Sunday - Thursday)
  const [preschoolDays, setPreschoolDays] = useState(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
  const [preschoolStart, setPreschoolStart] = useState('08:00');
  const [preschoolEnd, setPreschoolEnd] = useState('11:00');

  // Tutoring State: Array of sessions
  const [tutoringSessions, setTutoringSessions] = useState([
    { day_of_week: 'TUESDAY', start_time: '17:00', end_time: '19:00' },
    { day_of_week: 'FRIDAY', start_time: '09:00', end_time: '11:00' }
  ]);

  // Halaqa State: days array + common time (defaults to Sunday - Thursday)
  const [halaqaDays, setHalaqaDays] = useState(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
  const [halaqaStart, setHalaqaStart] = useState('16:30');
  const [halaqaEnd, setHalaqaEnd] = useState('18:30');

  // Parse initial times & days from existing value when available
  useEffect(() => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    // Do not re-parse if value matches what we just emitted or already parsed
    if (value === lastEmittedTextRef.current || value === lastParsedValueRef.current) return;
    lastParsedValueRef.current = value;

    // Extract time range HH:mm - HH:mm
    const timeMatch = value.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const start = timeMatch[1].padStart(5, '0');
      const end = timeMatch[2].padStart(5, '0');
      if (trackType === 'PRESCHOOL') {
        setPreschoolStart(start);
        setPreschoolEnd(end);
      } else if (trackType === 'HALAQA') {
        setHalaqaStart(start);
        setHalaqaEnd(end);
      }
    }

    // Extract days for preschool or halaqa
    if (trackType === 'PRESCHOOL') {
      const lower = value.toLowerCase();
      if (value.includes('كامل الأسبوع') || lower.includes('all week') || lower.includes('tous les jours')) {
        setPreschoolDays(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
      } else if (value.includes('السبت إلى الخميس') || value.includes('السبت - الخميس') || lower.includes('sat - thu') || lower.includes('samedi - jeudi')) {
        setPreschoolDays(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
      } else if (
        value.includes('الأحد إلى الخميس') || 
        value.includes('الأحد - الخميس') || 
        value.includes('الأحد-الخميس') || 
        lower.includes('sun - thu') || 
        lower.includes('sun-thu') || 
        lower.includes('dimanche - jeudi') || 
        lower.includes('dim-jeu') ||
        value.includes('يومياً') ||
        lower.includes('daily') ||
        lower.includes('quotidien')
      ) {
        let days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
        DAYS_LIST.forEach(d => {
          if (value.includes(`عدا ${d.ar}`) || lower.includes(`except ${d.en.toLowerCase()}`) || lower.includes(`sauf ${d.fr.toLowerCase()}`)) {
            days = days.filter(k => k !== d.key);
          }
        });
        setPreschoolDays(days);
      } else {
        const matched = DAYS_LIST.filter(d => value.includes(d.ar) || value.includes(d.en) || value.includes(d.fr)).map(d => d.key);
        if (matched.length >= 3) {
          setPreschoolDays(matched);
        } else {
          setPreschoolDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
        }
      }
    } else if (trackType === 'HALAQA') {
      const lower = value.toLowerCase();
      if (value.includes('كامل الأسبوع') || lower.includes('all week') || lower.includes('tous les jours')) {
        setHalaqaDays(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
      } else if (value.includes('السبت إلى الخميس') || value.includes('السبت - الخميس') || lower.includes('sat - thu')) {
        setHalaqaDays(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
      } else if (value.includes('الأحد إلى الخميس') || value.includes('الأحد - الخميس') || value.includes('الأحد-الخميس') || lower.includes('sun - thu')) {
        setHalaqaDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
      } else {
        const matched = DAYS_LIST.filter(d => value.includes(d.ar) || value.includes(d.en) || value.includes(d.fr)).map(d => d.key);
        if (matched.length > 0) {
          setHalaqaDays(matched);
        } else {
          setHalaqaDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']);
        }
      }
    }
  }, [value, trackType]);

  // Helper to adjust end time by duration in minutes
  const setEndTimeByDuration = (start, durationMinutes, setter) => {
    if (!start) return;
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + durationMinutes;
    const newH = Math.floor((total % (24 * 60)) / 60);
    const newM = total % 60;
    setter(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  // Compute Preschool generated schedule
  const preschoolData = useMemo(() => {
    if (!preschoolDays || preschoolDays.length === 0) {
      return { text: '', sessions: [] };
    }

    const standardWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
    const sixDaysWeek = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
    const allSeven = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    const sortedDays = DAYS_LIST.map(d => d.key).filter(k => preschoolDays.includes(k));

    let daysSummary = '';
    const isStandard = sortedDays.length === 5 && standardWeek.every(d => sortedDays.includes(d));
    const isSixDays = sortedDays.length === 6 && sixDaysWeek.every(d => sortedDays.includes(d));
    const isAllSeven = sortedDays.length === 7;

    const dailyWord = currentLang === 'fr' ? 'Quotidien' : currentLang === 'en' ? 'Daily' : 'يومياً';
    const exceptWord = currentLang === 'fr' ? 'sauf' : currentLang === 'en' ? 'except' : 'عدا';
    const comma = currentLang === 'ar' ? '، ' : ', ';

    if (isAllSeven) {
      daysSummary = `${dailyWord} (${currentLang === 'fr' ? 'Tous les jours' : currentLang === 'en' ? 'All week' : 'كامل الأسبوع'})`;
    } else if (isStandard) {
      daysSummary = `${dailyWord} (${currentLang === 'fr' ? 'Dimanche - Jeudi' : currentLang === 'en' ? 'Sun - Thu' : 'الأحد - الخميس'})`;
    } else if (isSixDays) {
      daysSummary = `${dailyWord} (${currentLang === 'fr' ? 'Samedi - Jeudi' : currentLang === 'en' ? 'Sat - Thu' : 'السبت - الخميس'})`;
    } else {
      // Check if it's Sunday-Thursday with exactly 1 day missing (e.g. does not study on Tuesday!)
      const missingFromStandard = standardWeek.filter(d => !sortedDays.includes(d));
      const hasWeekendDays = sortedDays.some(d => d === 'FRIDAY' || d === 'SATURDAY');

      if (missingFromStandard.length === 1 && !hasWeekendDays) {
        const offDayName = getDayName(missingFromStandard[0]);
        daysSummary = `${dailyWord} (${currentLang === 'fr' ? 'Dim-Jeu' : currentLang === 'en' ? 'Sun-Thu' : 'الأحد-الخميس'} ${exceptWord} ${offDayName})`;
      } else {
        daysSummary = sortedDays.map(k => getDayName(k)).join(comma);
      }
    }

    const text = `${daysSummary}: ${preschoolStart} - ${preschoolEnd}`;
    const sessions = sortedDays.map(k => ({
      day_of_week: k,
      start_time: preschoolStart,
      end_time: preschoolEnd
    }));

    return { text, sessions };
  }, [preschoolDays, preschoolStart, preschoolEnd, currentLang]);

  // Helper to convert time "HH:mm" to minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  // Compute Tutoring conflicts and invalid intervals
  const tutoringValidation = useMemo(() => {
    if (trackType !== 'TUTORING' || !Array.isArray(tutoringSessions)) {
      return { conflictingIndices: new Set(), invalidIndices: new Set(), conflictPairs: [] };
    }

    const conflictingIndices = new Set();
    const invalidIndices = new Set();
    const conflictPairs = [];

    // Check invalid time (end <= start)
    tutoringSessions.forEach((s, idx) => {
      const start = timeToMinutes(s.start_time);
      const end = timeToMinutes(s.end_time);
      if (start !== null && end !== null && end <= start) {
        invalidIndices.add(idx);
      }
    });

    // Pairwise overlap detection on same day
    for (let i = 0; i < tutoringSessions.length; i++) {
      for (let j = i + 1; j < tutoringSessions.length; j++) {
        const s1 = tutoringSessions[i];
        const s2 = tutoringSessions[j];
        if (s1.day_of_week && s2.day_of_week && s1.day_of_week === s2.day_of_week) {
          const start1 = timeToMinutes(s1.start_time);
          const end1 = timeToMinutes(s1.end_time);
          const start2 = timeToMinutes(s2.start_time);
          const end2 = timeToMinutes(s2.end_time);

          if (start1 !== null && end1 !== null && start2 !== null && end2 !== null) {
            // Overlapping intervals: start1 < end2 && start2 < end1
            if (start1 < end2 && start2 < end1) {
              conflictingIndices.add(i);
              conflictingIndices.add(j);
              conflictPairs.push({
                day: s1.day_of_week,
                sessionA: i + 1,
                timeA: `${s1.start_time} - ${s1.end_time}`,
                sessionB: j + 1,
                timeB: `${s2.start_time} - ${s2.end_time}`
              });
            }
          }
        }
      }
    }

    return { conflictingIndices, invalidIndices, conflictPairs };
  }, [trackType, tutoringSessions]);

  // Compute Tutoring generated schedule
  const tutoringData = useMemo(() => {
    if (!tutoringSessions || tutoringSessions.length === 0) {
      return { text: '', sessions: [] };
    }

    const parts = tutoringSessions.map(s => {
      const dayStr = getDayName(s.day_of_week);
      return `${dayStr}: ${s.start_time} - ${s.end_time}`;
    });

    const text = parts.join(' | ');
    return { text, sessions: tutoringSessions };
  }, [tutoringSessions, currentLang]);

  // Compute Halaqa generated schedule
  const halaqaData = useMemo(() => {
    if (!halaqaDays || halaqaDays.length === 0) {
      return { text: '', sessions: [] };
    }

    const comma = currentLang === 'ar' ? '، ' : ', ';
    const daysStr = halaqaDays.map(d => getDayName(d)).join(comma);
    const text = `${daysStr}: ${halaqaStart} - ${halaqaEnd}`;
    const sessions = halaqaDays.map(d => ({
      day_of_week: d,
      start_time: halaqaStart,
      end_time: halaqaEnd
    }));
    return { text, sessions };
  }, [halaqaDays, halaqaStart, halaqaEnd, currentLang]);

  // Notify parent component on changes only when text actually changes
  useEffect(() => {
    let text = '';
    let sessions = [];
    if (trackType === 'PRESCHOOL') {
      text = preschoolData.text;
      sessions = preschoolData.sessions;
    } else if (trackType === 'TUTORING') {
      text = tutoringData.text;
      sessions = tutoringData.sessions;
    } else {
      text = halaqaData.text;
      sessions = halaqaData.sessions;
    }

    const hasConflict = trackType === 'TUTORING' && (tutoringValidation.conflictingIndices.size > 0 || tutoringValidation.invalidIndices.size > 0);

    if (text !== lastEmittedTextRef.current) {
      lastEmittedTextRef.current = text;
      onChange(text, sessions, { hasConflict });
    }
  }, [trackType, preschoolData.text, tutoringData.text, halaqaData.text, tutoringValidation, onChange]);

  // Handlers for tutoring sessions
  const handleUpdateTutoringSession = (index, field, val) => {
    const next = [...tutoringSessions];
    next[index] = { ...next[index], [field]: val };
    setTutoringSessions(next);
  };

  const handleAddTutoringSession = () => {
    if (tutoringSessions.length >= 7) return;
    const defaultDays = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const usedDays = tutoringSessions.map(s => s.day_of_week);
    const availableDay = defaultDays.find(d => !usedDays.includes(d)) || 'SATURDAY';

    setTutoringSessions([
      ...tutoringSessions,
      { day_of_week: availableDay, start_time: '17:00', end_time: '19:00' }
    ]);
  };

  const handleRemoveTutoringSession = (index) => {
    if (tutoringSessions.length <= 1) return;
    setTutoringSessions(tutoringSessions.filter((_, i) => i !== index));
  };

  const handleToggleHalaqaDay = (dayKey) => {
    if (halaqaDays.includes(dayKey)) {
      if (halaqaDays.length > 1) {
        setHalaqaDays(halaqaDays.filter(k => k !== dayKey));
      }
    } else {
      setHalaqaDays([...halaqaDays, dayKey]);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-surface rounded-2xl border border-border">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/60">
        <Clock className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold text-text-main">
          {trackType === 'PRESCHOOL'
            ? t('tracks.schedule_preschool_daily_title')
            : trackType === 'TUTORING'
            ? t('tracks.schedule_tutoring_title')
            : t('tracks.weekly_schedule_label')}
        </span>
      </div>

      {trackType === 'PRESCHOOL' ? (
        /* ================= PRESCHOOL DAILY BUILDER ================= */
        <div className="space-y-3 animate-fadeIn">
          {/* Presets and Individual Days Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-muted">
                {t('tracks.schedule_preschool_days')}
              </label>
              <span className="text-[10px] text-text-muted">
                {t('tracks.schedule_day_off_hint', 'انقر على أي يوم لاستثنائه (عطلة)')}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPreschoolDays(['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'])}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  preschoolDays.length === 5 && ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].every(d => preschoolDays.includes(d))
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-surface-card text-text-muted border-border hover:bg-surface-hover'
                }`}
              >
                {t('tracks.schedule_preschool_days_5')}
              </button>
              <button
                type="button"
                onClick={() => setPreschoolDays(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'])}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  preschoolDays.length === 6 && ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].every(d => preschoolDays.includes(d))
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-surface-card text-text-muted border-border hover:bg-surface-hover'
                }`}
              >
                {t('tracks.schedule_preschool_days_6')}
              </button>
              <button
                type="button"
                onClick={() => setPreschoolDays(DAYS_LIST.map(d => d.key))}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  preschoolDays.length === 7
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-surface-card text-text-muted border-border hover:bg-surface-hover'
                }`}
              >
                {t('tracks.schedule_preschool_days_all')}
              </button>
            </div>

            {/* Individual Day-by-Day Toggles */}
            <div className="pt-1">
              <div className="text-[10px] font-bold text-text-muted mb-1.5 flex items-center justify-between">
                <span>{t('tracks.schedule_study_days', 'أيام الدراسة في الأسبوع:')}</span>
                <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {preschoolDays.length} / 7 {t('tracks.active_days_count', 'أيام نشطة')}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAYS_LIST.map((d) => {
                  const isSelected = preschoolDays.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (preschoolDays.length > 1) {
                            setPreschoolDays(preschoolDays.filter(k => k !== d.key));
                          }
                        } else {
                          setPreschoolDays([...preschoolDays, d.key]);
                        }
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-600/20'
                          : 'bg-surface-card text-text-muted/60 border-border hover:bg-surface-hover hover:text-text-main opacity-70'
                      }`}
                      title={isSelected ? t('tracks.day_study') : t('tracks.day_off')}
                    >
                      <span className="truncate">{getDayName(d.key)}</span>
                      <span className="text-[9px] font-medium leading-tight">
                        {isSelected ? (
                          <span className="text-purple-200 font-bold">✓ {t('tracks.day_study')}</span>
                        ) : (
                          <span className="text-rose-500/80 font-bold">✕ {t('tracks.day_off')}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time range */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5">
              {t('tracks.schedule_time_range')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-text-muted block mb-1">{t('tracks.schedule_from')}:</span>
                <TimeInput
                  value={preschoolStart}
                  onChange={(e) => setPreschoolStart(e.target.value)}
                  className="w-full p-2 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main text-center"
                />
              </div>
              <div>
                <span className="text-[10px] text-text-muted block mb-1">{t('tracks.schedule_to')}:</span>
                <TimeInput
                  value={preschoolEnd}
                  onChange={(e) => setPreschoolEnd(e.target.value)}
                  className="w-full p-2 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main text-center"
                />
              </div>
            </div>
          </div>

          {/* Quick timing presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-text-muted">{t('common.quick_presets', 'اقتراحات سريعة:')}</span>
            {[
              { label: '08:00 - 11:00', start: '08:00', end: '11:00' },
              { label: '08:30 - 11:30', start: '08:30', end: '11:30' },
              { label: '08:00 - 12:00', start: '08:00', end: '12:00' },
              { label: '13:30 - 16:30', start: '13:30', end: '16:30' },
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPreschoolStart(preset.start);
                  setPreschoolEnd(preset.end);
                }}
                className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-surface-card hover:bg-primary/10 hover:text-primary text-text-muted border border-border transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ) : trackType === 'TUTORING' ? (
        /* ================= ACADEMIC TUTORING BUILDER ================= */
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted">
              {t('tracks.schedule_tutoring_sessions_count')}: ({tutoringSessions.length})
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    const defaultDays = ['TUESDAY', 'FRIDAY', 'SATURDAY'];
                    const newSessions = Array.from({ length: count }, (_, i) => ({
                      day_of_week: defaultDays[i % defaultDays.length],
                      start_time: i === 0 ? '17:00' : '09:00',
                      end_time: i === 0 ? '19:00' : '11:00'
                    }));
                    setTutoringSessions(newSessions);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                    tutoringSessions.length === count
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-card text-text-muted border-border hover:bg-surface-hover'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Warning Banner */}
          {tutoringValidation.conflictPairs.length > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs animate-shake">
              <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {t('tracks.schedule_overlap_error', {
                    details: tutoringValidation.conflictPairs.map(p => 
                      `${getDayName(p.day)}: ${t('tracks.schedule_session_num', { num: p.sessionA })} (${p.timeA}) ⚡ ${t('tracks.schedule_session_num', { num: p.sessionB })} (${p.timeB})`
                    ).join(' | ')
                  })}
                </span>
              </div>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                {t('tracks.schedule_overlap_hint')}
              </p>
            </div>
          )}

          {/* Invalid Time Banner (End <= Start) */}
          {tutoringValidation.invalidIndices.size > 0 && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('tracks.schedule_invalid_time_error')}</span>
            </div>
          )}

          {/* Session Cards */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {tutoringSessions.map((session, idx) => {
              const isConflicting = tutoringValidation.conflictingIndices.has(idx);
              const isInvalid = tutoringValidation.invalidIndices.has(idx);

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl space-y-2 transition-all shadow-2xs border ${
                    isConflicting
                      ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
                      : isInvalid
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-surface-card border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold flex items-center gap-1 ${
                        isConflicting ? 'text-rose-600 dark:text-rose-400' : isInvalid ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
                      }`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{t('tracks.schedule_session_num', { num: idx + 1 })}</span>
                      </span>

                      {isConflicting && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {t('tracks.schedule_overlap_badge')}
                        </span>
                      )}
                    </div>

                    {tutoringSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTutoringSession(idx)}
                        className="text-text-muted hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title={t('tracks.schedule_remove_session')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Day Select */}
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">{t('tracks.schedule_day_label')}:</span>
                      <select
                        value={session.day_of_week}
                        onChange={(e) => handleUpdateTutoringSession(idx, 'day_of_week', e.target.value)}
                        className={`w-full p-2 rounded-xl text-xs font-bold text-text-main border ${
                          isConflicting ? 'border-rose-500/60 bg-rose-500/5' : 'bg-surface border-border'
                        }`}
                      >
                        {DAYS_LIST.map((d) => (
                          <option key={d.key} value={d.key}>
                            {getDayName(d.key)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">{t('tracks.schedule_from')}:</span>
                      <TimeInput
                        value={session.start_time}
                        onChange={(e) => handleUpdateTutoringSession(idx, 'start_time', e.target.value)}
                        className={`w-full p-1.5 rounded-xl text-xs font-mono font-bold text-text-main text-center border ${
                          isConflicting ? 'border-rose-500/60 bg-rose-500/5' : isInvalid ? 'border-amber-500/60 bg-amber-500/5' : 'bg-surface border-border'
                        }`}
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <span className="text-[10px] text-text-muted block mb-0.5">{t('tracks.schedule_to')}:</span>
                      <TimeInput
                        value={session.end_time}
                        onChange={(e) => handleUpdateTutoringSession(idx, 'end_time', e.target.value)}
                        className={`w-full p-1.5 rounded-xl text-xs font-mono font-bold text-text-main text-center border ${
                          isConflicting ? 'border-rose-500/60 bg-rose-500/5' : isInvalid ? 'border-amber-500/60 bg-amber-500/5' : 'bg-surface border-border'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {tutoringSessions.length < 7 && (
            <button
              type="button"
              onClick={handleAddTutoringSession}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('tracks.schedule_add_session')}</span>
            </button>
          )}
        </div>
      ) : (
        /* ================= HALAQA TRACK BUILDER ================= */
        <div className="space-y-3 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1.5">
              {t('tracks.schedule_halaqa_days')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_LIST.map((d) => {
                const isSelected = halaqaDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleToggleHalaqaDay(d.key)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-surface-card text-text-muted border-border hover:bg-surface-hover'
                    }`}
                  >
                    {getDayName(d.key)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time range for Halaqa */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-text-muted block mb-1">{t('tracks.schedule_from')}:</span>
              <TimeInput
                value={halaqaStart}
                onChange={(e) => setHalaqaStart(e.target.value)}
                className="w-full p-2 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-text-muted block mb-1">{t('tracks.schedule_to')}:</span>
              <TimeInput
                value={halaqaEnd}
                onChange={(e) => setHalaqaEnd(e.target.value)}
                className="w-full p-2 bg-surface-card border border-border rounded-xl text-sm font-mono font-bold text-text-main text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Generated Schedule Preview */}
      <div className="pt-2 border-t border-border/60">
        <div className="text-[10px] font-bold text-text-muted mb-1">
          {t('tracks.schedule_preview')}
        </div>
        <div className="p-2.5 rounded-xl bg-surface-card border border-border/80 text-xs font-bold text-text-main flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">
            {trackType === 'PRESCHOOL'
              ? preschoolData.text
              : trackType === 'TUTORING'
              ? tutoringData.text
              : halaqaData.text}
          </span>
        </div>
      </div>
    </div>
  );
}

import pool from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

export const getGroupAttendanceByDate = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const selectedDate = date || new Date().toISOString().split('T')[0];

    // 1. Fetch group basic schedule info
    const [groupRows] = await pool.query(`
      SELECT g.id, g.name, g.schedule, g.room, g.teacher_id, t.full_name AS teacher_name
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.id = ?
    `, [groupId]);

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const group = groupRows[0];

    // 2. Fetch timetable sessions for scheduled days
    const [timetableRows] = await pool.query(`
      SELECT DISTINCT day_of_week, start_time, end_time
      FROM timetable_sessions
      WHERE group_id = ?
    `, [groupId]);

    const scheduledDays = timetableRows.map(r => r.day_of_week);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dateObj = new Date(`${selectedDate}T00:00:00`);
    const selectedDayOfWeek = dayNames[dateObj.getDay()];
    const isScheduledDay = scheduledDays.includes(selectedDayOfWeek);

    // 3. Fetch all distinct recorded session dates for this group (sorted newest first)
    const [recordedDateRows] = await pool.query(`
      SELECT DISTINCT DATE_FORMAT(a.date, '%Y-%m-%d') AS date
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.group_id = ?
      ORDER BY a.date DESC
    `, [groupId]);

    const recordedDates = recordedDateRows.map(r => r.date);

    // 4. Fetch students and attendance status for the selected date
    const [rows] = await pool.query(`
      SELECT 
        e.id AS enrollment_id,
        s.id AS student_id,
        s.full_name AS student_name,
        s.reg_no,
        a.id AS attendance_id,
        a.status,
        a.notes
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = ?
      WHERE e.group_id = ? AND e.status = 'ACTIVE'
      ORDER BY s.full_name ASC
    `, [selectedDate, groupId]);

    // Has attendance been officially recorded for this group & date?
    const hasRecord = rows.some(r => r.attendance_id !== null);

    // Prepare processed student data
    const studentData = rows.map(r => ({
      enrollment_id: r.enrollment_id,
      student_id: r.student_id,
      student_name: r.student_name,
      reg_no: r.reg_no,
      attendance_id: r.attendance_id,
      status: r.status || 'PRESENT',
      is_recorded: r.attendance_id !== null,
      notes: r.notes || ''
    }));

    return res.json({ 
      success: true, 
      date: selectedDate, 
      hasRecord,
      recordedDates,
      schedule: group.schedule,
      scheduledDays,
      selectedDayOfWeek,
      isScheduledDay,
      timetableSessions: timetableRows,
      data: studentData 
    });
  } catch (error) {
    console.error('getGroupAttendanceByDate error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const getGroupMonthlyAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { month, date_from, date_to, cycle_number } = req.query;

    // 1. Fetch group details & teacher
    const [groupRows] = await pool.query(`
      SELECT 
        g.id, g.name, g.track_type, g.subject_name, g.room, g.schedule,
        g.month_calculation_type, g.package_quota, g.monthly_fee, g.is_free,
        t.full_name AS teacher_name, t.phone AS teacher_phone,
        ay.label AS academic_year_label
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      LEFT JOIN academic_years ay ON g.academic_year_id = ay.id
      WHERE g.id = ?
    `, [groupId]);

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const group = groupRows[0];
    const isPerSession = group.month_calculation_type === 'PER_SESSION';
    const isPerHour = group.month_calculation_type === 'PER_HOUR';
    const isQuotaBased = isPerSession || isPerHour;

    // 2. Fetch all distinct recorded attendance dates for this group (across all time)
    const [allRecordedDatesRows] = await pool.query(`
      SELECT DISTINCT DATE_FORMAT(a.date, '%Y-%m-%d') AS date
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.group_id = ?
      ORDER BY a.date ASC
    `, [groupId]);

    const allGroupDates = allRecordedDatesRows.map(r => r.date);

    // 3. If hourly package, fetch timetable sessions for duration estimation
    let timetableRows = [];
    if (isPerHour) {
      const [tt] = await pool.query(`
        SELECT day_of_week, start_time, end_time,
               TIMESTAMPDIFF(MINUTE, start_time, end_time) / 60.0 AS duration_hours
        FROM timetable_sessions
        WHERE group_id = ?
      `, [groupId]);
      timetableRows = tt;
    }

    // 4. Partition allGroupDates into logical quota cycles
    const cycles = [];
    if (isPerSession) {
      const quota = group.package_quota > 0 ? parseInt(group.package_quota, 10) : 8;
      if (allGroupDates.length === 0) {
        cycles.push({
          cycleNumber: 1,
          cycleIndex: 0,
          startDate: null,
          endDate: null,
          sessionsCount: 0,
          quota,
          isCompleted: false,
          sessionDates: []
        });
      } else {
        for (let i = 0; i < allGroupDates.length; i += quota) {
          const chunk = allGroupDates.slice(i, i + quota);
          const cycleNum = Math.floor(i / quota) + 1;
          const isCompleted = chunk.length === quota;
          cycles.push({
            cycleNumber: cycleNum,
            cycleIndex: cycles.length,
            startDate: chunk[0],
            endDate: chunk[chunk.length - 1],
            sessionsCount: chunk.length,
            quota,
            isCompleted,
            sessionDates: chunk
          });
        }
      }
    } else if (isPerHour) {
      const quota = group.package_quota > 0 ? parseFloat(group.package_quota) : 12.0;
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      
      if (allGroupDates.length === 0) {
        cycles.push({
          cycleNumber: 1,
          cycleIndex: 0,
          startDate: null,
          endDate: null,
          sessionsCount: 0,
          totalHours: 0,
          quota,
          isCompleted: false,
          sessionDates: []
        });
      } else {
        let currentCycle = {
          cycleNumber: 1,
          cycleIndex: 0,
          startDate: null,
          endDate: null,
          sessionsCount: 0,
          totalHours: 0,
          quota,
          isCompleted: false,
          sessionDates: []
        };

        for (const d of allGroupDates) {
          const dateObj = new Date(d);
          const dayName = dayNames[dateObj.getDay()];
          const tt = timetableRows.find(r => r.day_of_week === dayName);
          const duration = tt && parseFloat(tt.duration_hours) > 0 ? parseFloat(tt.duration_hours) : 2.0;

          if (currentCycle.sessionsCount === 0) {
            currentCycle.startDate = d;
          }
          currentCycle.endDate = d;
          currentCycle.sessionsCount += 1;
          currentCycle.totalHours = parseFloat((currentCycle.totalHours + duration).toFixed(1));
          currentCycle.sessionDates.push(d);

          if (currentCycle.totalHours >= quota) {
            currentCycle.isCompleted = true;
            cycles.push(currentCycle);
            currentCycle = {
              cycleNumber: cycles.length + 1,
              cycleIndex: cycles.length,
              startDate: null,
              endDate: null,
              sessionsCount: 0,
              totalHours: 0,
              quota,
              isCompleted: false,
              sessionDates: []
            };
          }
        }
        if (currentCycle.sessionsCount > 0 || cycles.length === 0) {
          cycles.push(currentCycle);
        }
      }
    }

    // 5. Determine startDate and endDate based on requested scope
    let startDate;
    let endDate;
    let currentMonth = month || new Date().toISOString().slice(0, 7);
    let selectedCycle = null;

    if (date_from && date_to) {
      startDate = date_from;
      endDate = date_to;
      currentMonth = `${date_from} ~ ${date_to}`;
      selectedCycle = cycles.find(c => c.startDate === date_from && c.endDate === date_to) || null;
    } else if (cycle_number !== undefined && cycle_number !== null && cycle_number !== '') {
      const num = parseInt(cycle_number, 10);
      selectedCycle = cycles.find(c => c.cycleNumber === num) || cycles[cycles.length - 1] || null;
      if (selectedCycle && selectedCycle.startDate && selectedCycle.endDate) {
        startDate = selectedCycle.startDate;
        endDate = selectedCycle.endDate;
      } else {
        startDate = `${currentMonth}-01`;
        endDate = `${currentMonth}-28`;
      }
    } else if (isQuotaBased && cycles.length > 0) {
      // Default to the latest active/completed cycle for quota-based groups!
      selectedCycle = cycles[cycles.length - 1];
      if (selectedCycle && selectedCycle.startDate && selectedCycle.endDate) {
        startDate = selectedCycle.startDate;
        endDate = selectedCycle.endDate;
      } else {
        startDate = `${currentMonth}-01`;
        const [yearStr, monthStr] = currentMonth.split('-');
        const year = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const lastDay = new Date(year, m, 0).getDate();
        endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
      }
    } else {
      // Standard CALENDAR_MONTH
      startDate = `${currentMonth}-01`;
      const [yearStr, monthStr] = currentMonth.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const lastDay = new Date(year, m, 0).getDate();
      endDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    // 6. Fetch active students enrolled in this group
    const [students] = await pool.query(`
      SELECT 
        e.id AS enrollment_id,
        s.id AS student_id,
        s.full_name AS student_name,
        s.reg_no,
        s.gender,
        e.status AS enrollment_status
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.group_id = ? AND e.status = 'ACTIVE'
      ORDER BY s.full_name ASC
    `, [groupId]);

    // 7. Fetch all attendance records for these enrollments in this range
    let attendanceRows = [];
    let teacherAttRows = [];
    let recordedDates = [];

    if (startDate && endDate) {
      const [att] = await pool.query(`
        SELECT 
          a.id,
          a.enrollment_id,
          DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
          a.status,
          a.notes
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        WHERE e.group_id = ? AND a.date BETWEEN ? AND ?
        ORDER BY a.date ASC
      `, [groupId, startDate, endDate]);
      attendanceRows = att;

      recordedDates = [...new Set(attendanceRows.map(r => r.date))].sort();

      const [teacherAtt] = await pool.query(`
        SELECT 
          DATE_FORMAT(ta.date, '%Y-%m-%d') AS date,
          ta.status,
          ta.substitute_teacher_id,
          ta.notes,
          st.full_name AS substitute_teacher_name
        FROM teacher_attendance ta
        LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
        WHERE ta.group_id = ? AND ta.date BETWEEN ? AND ?
        ORDER BY ta.date ASC
      `, [groupId, startDate, endDate]);
      teacherAttRows = teacherAtt;
    }

    return res.json({
      success: true,
      month: currentMonth,
      startDate,
      endDate,
      group,
      cycles,
      selectedCycle,
      recordedDates,
      students,
      attendance: attendanceRows,
      teacherAttendance: teacherAttRows
    });
  } catch (error) {
    console.error('getGroupMonthlyAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

export const saveBulkAttendance = async (req, res) => {
  const { date, records } = req.body; // records: [{ enrollment_id, status, notes }]

  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: req.t('bad_request') });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const record of records) {
      const { enrollment_id, status = 'PRESENT', notes = '' } = record;

      // Check if attendance already exists for this enrollment & date
      const [existing] = await connection.query(`
        SELECT id FROM attendance WHERE enrollment_id = ? AND date = ?
      `, [enrollment_id, date]);

      if (existing.length > 0) {
        await connection.query(`
          UPDATE attendance SET status = ?, notes = ? WHERE id = ?
        `, [status, notes, existing[0].id]);
      } else {
        await connection.query(`
          INSERT INTO attendance (enrollment_id, date, status, notes)
          VALUES (?, ?, ?, ?)
        `, [enrollment_id, date, status, notes]);
      }
    }

    await connection.commit();

    logActivity(req, {
      action_type: 'ATTENDANCE',
      data_type: 'ATTENDANCE',
      details: `تسجيل حضور وغياب الطلبة ليوم ${date} (${records.length} طالب)`
    });

    return res.json({ success: true, message: req.t('attendance_saved_success') });
  } catch (error) {
    await connection.rollback();
    console.error('saveBulkAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

// ==================== TEACHER ATTENDANCE & SUBSTITUTION ====================

// 1. Get teacher attendance for a specific group and date
export const getGroupTeacherAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const selectedDate = date || new Date().toISOString().split('T')[0];

    // First fetch group and primary teacher
    const [groupRows] = await pool.query(`
      SELECT g.id, g.name, g.teacher_id, t.full_name AS teacher_name, t.photo_url AS teacher_photo, t.phone AS teacher_phone
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.id = ?
    `, [groupId]);

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }

    const group = groupRows[0];

    // Check if attendance record exists for this date
    const [attRows] = await pool.query(`
      SELECT 
        ta.*,
        pt.full_name AS teacher_name,
        pt.photo_url AS teacher_photo,
        pt.phone AS teacher_phone,
        st.full_name AS substitute_teacher_name,
        st.photo_url AS substitute_teacher_photo,
        st.phone AS substitute_teacher_phone
      FROM teacher_attendance ta
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE ta.group_id = ? AND ta.date = ?
    `, [groupId, selectedDate]);

    if (attRows.length > 0) {
      return res.json({
        success: true,
        date: selectedDate,
        hasRecord: true,
        data: attRows[0]
      });
    }

    // If no record exists, return default state with primary teacher
    return res.json({
      success: true,
      date: selectedDate,
      hasRecord: false,
      data: {
        teacher_id: group.teacher_id,
        group_id: parseInt(groupId, 10),
        date: selectedDate,
        status: 'PRESENT',
        substitute_teacher_id: null,
        notes: '',
        teacher_name: group.teacher_name,
        teacher_photo: group.teacher_photo,
        teacher_phone: group.teacher_phone,
        substitute_teacher_name: null,
        substitute_teacher_photo: null
      }
    });
  } catch (error) {
    console.error('getGroupTeacherAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Save or update teacher attendance & substitution for a session
export const saveTeacherAttendance = async (req, res) => {
  try {
    const { teacher_id, group_id, date, status, substitute_teacher_id, notes } = req.body;

    if (!teacher_id || !group_id || !date) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    const subId = (status === 'ABSENT' || status === 'EXCUSED') && substitute_teacher_id
      ? parseInt(substitute_teacher_id, 10)
      : null;

    const userId = req.user?.id || null;
    const deviceId = req.deviceId || null;

    await pool.query(`
      INSERT INTO teacher_attendance (teacher_id, group_id, date, status, substitute_teacher_id, notes, user_id, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        substitute_teacher_id = VALUES(substitute_teacher_id),
        notes = VALUES(notes),
        user_id = VALUES(user_id),
        device_id = VALUES(device_id)
    `, [
      teacher_id,
      group_id,
      date,
      status || 'PRESENT',
      subId,
      notes ? notes.trim() : null,
      userId,
      deviceId
    ]);

    const [tName] = await pool.query('SELECT full_name FROM teachers WHERE id = ?', [teacher_id]);
    const teacherName = tName?.[0]?.full_name || '';
    logActivity(req, {
      action_type: 'ATTENDANCE',
      data_type: 'TEACHER_ATTENDANCE',
      entity_id: teacher_id,
      entity_name: teacherName,
      details: `تسجيل حضور الأستاذ/الشيخ "${teacherName}" ليوم ${date}: الحالة (${status || 'PRESENT'})`
    });

    // Return the updated record
    const [saved] = await pool.query(`
      SELECT 
        ta.*,
        pt.full_name AS teacher_name,
        pt.photo_url AS teacher_photo,
        st.full_name AS substitute_teacher_name,
        st.photo_url AS substitute_teacher_photo
      FROM teacher_attendance ta
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE ta.group_id = ? AND ta.date = ?
    `, [group_id, date]);

    return res.json({
      success: true,
      message: req.t('attendance_saved_success'),
      data: saved[0]
    });
  } catch (error) {
    console.error('saveTeacherAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 3. Get history of absences and substitutions across teachers
export const getTeacherAbsenceReport = async (req, res) => {
  try {
    const { teacher_id, date_from, date_to } = req.query;

    let query = `
      SELECT 
        ta.*,
        g.name AS group_name,
        g.track_type,
        pt.full_name AS teacher_name,
        pt.phone AS teacher_phone,
        pt.photo_url AS teacher_photo,
        st.full_name AS substitute_teacher_name,
        st.phone AS substitute_teacher_phone,
        st.photo_url AS substitute_teacher_photo
      FROM teacher_attendance ta
      JOIN groups g ON ta.group_id = g.id
      JOIN teachers pt ON ta.teacher_id = pt.id
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (teacher_id) {
      query += ' AND (ta.teacher_id = ? OR ta.substitute_teacher_id = ?)';
      params.push(teacher_id, teacher_id);
    }

    if (date_from) {
      query += ' AND ta.date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND ta.date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY ta.date DESC, ta.id DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getTeacherAbsenceReport error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 4. Set temporary substitution for a date range (multiple days)
export const saveTeacherSubstitutionRange = async (req, res) => {
  try {
    const { teacher_id, group_id, substitute_teacher_id, start_date, end_date, notes } = req.body;

    if (!teacher_id || !group_id || !substitute_teacher_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: req.t('attendance_range_missing_fields')
      });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    // Generate array of date strings (YYYY-MM-DD)
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }

    if (dates.length > 90) {
      return res.status(400).json({
        success: false,
        message: req.t('bad_request')
      });
    }

    const subId = parseInt(substitute_teacher_id, 10);
    const cleanNotes = notes ? notes.trim() : 'Substitution';

    // Bulk upsert for each date in range
    for (const dateStr of dates) {
      await pool.query(`
        INSERT INTO teacher_attendance (teacher_id, group_id, date, status, substitute_teacher_id, notes)
        VALUES (?, ?, ?, 'ABSENT', ?, ?)
        ON DUPLICATE KEY UPDATE
          status = 'ABSENT',
          substitute_teacher_id = VALUES(substitute_teacher_id),
          notes = VALUES(notes)
      `, [
        teacher_id,
        group_id,
        dateStr,
        subId,
        cleanNotes
      ]);
    }

    return res.json({
      success: true,
      message: req.t('attendance_range_sub_success'),
      daysCount: dates.length
    });
  } catch (error) {
    console.error('saveTeacherSubstitutionRange error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// ==================== GROUP SESSIONS HISTORY & LIFECYCLE ====================

// 1. Get full list of recorded sessions for a group with statistics
export const getGroupSessionsList = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Fetch group schedule & timetable
    const [groupRows] = await pool.query(`
      SELECT g.id, g.name, g.schedule, g.room, g.teacher_id, t.full_name AS teacher_name
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.id = ?
    `, [groupId]);

    if (groupRows.length === 0) {
      return res.status(404).json({ success: false, message: req.t('group_not_found') });
    }
    const group = groupRows[0];

    const [timetableRows] = await pool.query(`
      SELECT DISTINCT day_of_week, start_time, end_time
      FROM timetable_sessions
      WHERE group_id = ?
    `, [groupId]);
    const scheduledDays = timetableRows.map(r => r.day_of_week);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    // Fetch distinct recorded dates and summary counts from attendance
    const [sessionRows] = await pool.query(`
      SELECT 
        DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
        COUNT(a.id) AS total_students,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN a.status = 'EXCUSED' THEN 1 ELSE 0 END) AS excused_count,
        SUM(CASE WHEN a.status IN ('ABSENT', 'UNEXCUSED') THEN 1 ELSE 0 END) AS absent_count,
        ta.id AS teacher_attendance_id,
        ta.status AS teacher_status,
        ta.notes AS teacher_notes,
        ta.substitute_teacher_id,
        st.full_name AS substitute_teacher_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      LEFT JOIN teacher_attendance ta ON ta.group_id = e.group_id AND ta.date = a.date
      LEFT JOIN teachers st ON ta.substitute_teacher_id = st.id
      WHERE e.group_id = ?
      GROUP BY a.date, ta.id, ta.status, ta.notes, ta.substitute_teacher_id, st.full_name
      ORDER BY a.date ASC
    `, [groupId]);

    // Format and assign chronological session numbers (ascending)
    const totalSessions = sessionRows.length;
    const formattedSessions = sessionRows.map((s, index) => {
      const dateObj = new Date(`${s.date}T00:00:00`);
      const dayOfWeek = dayNames[dateObj.getDay()];
      const isScheduledDay = scheduledDays.includes(dayOfWeek);
      const total = parseInt(s.total_students, 10) || 0;
      const present = parseInt(s.present_count, 10) || 0;
      const late = parseInt(s.late_count, 10) || 0;
      const excused = parseInt(s.excused_count, 10) || 0;
      const absent = parseInt(s.absent_count, 10) || 0;
      const effectiveAttended = present + late;
      const attendanceRate = total > 0 ? Math.round((effectiveAttended / total) * 100) : 0;

      return {
        session_number: index + 1,
        date: s.date,
        day_of_week: dayOfWeek,
        is_scheduled_day: isScheduledDay,
        total_students: total,
        present_count: present,
        late_count: late,
        excused_count: excused,
        absent_count: absent,
        attendance_rate: attendanceRate,
        teacher: {
          id: group.teacher_id,
          name: group.teacher_name,
          status: s.teacher_status || 'PRESENT',
          notes: s.teacher_notes || '',
          substitute_id: s.substitute_teacher_id || null,
          substitute_name: s.substitute_teacher_name || null
        }
      };
    });

    // Display list newest first for user convenience
    const sessionsNewestFirst = [...formattedSessions].reverse();

    return res.json({
      success: true,
      data: sessionsNewestFirst,
      totalSessions,
      group: {
        id: group.id,
        name: group.name,
        schedule: group.schedule,
        scheduledDays,
        teacher_name: group.teacher_name
      }
    });
  } catch (error) {
    console.error('getGroupSessionsList error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  }
};

// 2. Update date of an existing session
export const updateSessionDate = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { groupId } = req.params;
    const { oldDate, newDate } = req.body;

    if (!oldDate || !newDate) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    if (oldDate === newDate) {
      return res.json({ success: true, message: req.t('session_date_updated_success') });
    }

    await connection.beginTransaction();

    // Check if newDate already has attendance recorded for this group
    const [existing] = await connection.query(`
      SELECT 1 FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.group_id = ? AND a.date = ?
      LIMIT 1
    `, [groupId, newDate]);

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('session_date_conflict_error', 'توجد حصة مسجلة بالفعل في هذا التاريخ الجديد')
      });
    }

    // Update attendance table
    await connection.query(`
      UPDATE attendance
      SET date = ?
      WHERE date = ? AND enrollment_id IN (
        SELECT id FROM enrollments WHERE group_id = ?
      )
    `, [newDate, oldDate, groupId]);

    // Update teacher_attendance table
    await connection.query(`
      UPDATE teacher_attendance
      SET date = ?
      WHERE group_id = ? AND date = ?
    `, [newDate, groupId, oldDate]);

    await connection.commit();

    logActivity(req, {
      action_type: 'UPDATE',
      data_type: 'ATTENDANCE',
      details: `تعديل تاريخ حصة الفوج ${groupId} من ${oldDate} إلى ${newDate}`
    });

    return res.json({
      success: true,
      message: req.t('session_date_updated_success', 'تم تحديث تاريخ الحصة بنجاح'),
      oldDate,
      newDate
    });
  } catch (error) {
    await connection.rollback();
    console.error('updateSessionDate error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};

// 3. Cancel / Delete session attendance for a specific date
export const deleteSessionAttendance = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { groupId } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: req.t('bad_request') });
    }

    await connection.beginTransaction();

    // Delete student attendance rows
    const [attResult] = await connection.query(`
      DELETE a FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.group_id = ? AND a.date = ?
    `, [groupId, date]);

    // Delete teacher attendance
    await connection.query(`
      DELETE FROM teacher_attendance
      WHERE group_id = ? AND date = ?
    `, [groupId, date]);

    await connection.commit();

    logActivity(req, {
      action_type: 'DELETE',
      data_type: 'ATTENDANCE',
      details: `إلغاء وحذف حصة الفوج ${groupId} وتفريغ الحضور لتاريخ ${date} (${attResult.affectedRows} سجل)`
    });

    return res.json({
      success: true,
      message: req.t('session_cancelled_success', 'تم حذف الحصة وإلغاء تسجيل حضورها بنجاح'),
      deletedCount: attResult.affectedRows
    });
  } catch (error) {
    await connection.rollback();
    console.error('deleteSessionAttendance error:', error);
    return res.status(500).json({ success: false, message: req.t('unhandled_server_error') });
  } finally {
    connection.release();
  }
};


import { Student, Teacher, ExamRoom, ExamRoomStudentAllocation, ProctorDutySlot, ProctorDayConfig } from '../types';

/**
 * Natural class hierarchy parser
 * Hierarchy order:
 * Grade X (10) < Grade XI (11) < Grade XII (12)
 * Sub-majors: IPA / MIPA < IPS < Bahasa < Generic Numbers
 */
export function getClassSortRank(className: string): number {
  if (!className) return 9999;
  const upper = className.trim().toUpperCase();

  let gradeBase = 1000;
  if (upper.startsWith('XII') || upper.includes('12') || upper.includes('KELAS XII') || upper.includes('XII.')) {
    gradeBase = 3000;
  } else if (upper.startsWith('XI') || upper.includes('11') || upper.includes('KELAS XI') || upper.includes('XI.')) {
    gradeBase = 2000;
  } else if (upper.startsWith('X') || upper.includes('10') || upper.includes('KELAS X') || upper.includes('X.')) {
    gradeBase = 1000;
  }

  // Major / Specialization rank
  let majorRank = 50;
  if (upper.includes('IPA') || upper.includes('MIPA') || upper.includes('SAINS')) {
    majorRank = 10;
  } else if (upper.includes('IPS') || upper.includes('SOSIAL')) {
    majorRank = 20;
  } else if (upper.includes('BAHASA')) {
    majorRank = 30;
  }

  // Extract trailing digits e.g. "X.1" -> 1, "XII.IPS 2" -> 2
  const match = upper.match(/(\d+)(?!.*\d)/);
  const classNum = match ? parseInt(match[1], 10) : 0;

  return gradeBase + majorRank + classNum;
}

/**
 * Natural Class Sorting:
 * Evaluates hierarchy X.1 through XII.IPS 2
 * Supports single argument call: sortClassNaturally(className) -> number
 * Supports two arguments comparator: sortClassNaturally(classA, classB) -> number
 */
export function sortClassNaturally(classA: string, classB?: string): number {
  if (classB === undefined) {
    return getClassSortRank(classA);
  }
  const rankA = getClassSortRank(classA);
  const rankB = getClassSortRank(classB);
  if (rankA !== rankB) return rankA - rankB;
  return classA.localeCompare(classB, 'id', { numeric: true, sensitivity: 'base' });
}

/**
 * Smart Auto-Generator for Exam Participant Number
 * Format: [KODE_SEKOLAH]-[KODE_TAHUN]-[KODE_RUANG]-[NOMOR_URUT]
 * Example: 12-26-01-001
 * 
 * @param schoolCode default '12'
 * @param year e.g. '26' or 2026
 * @param roomNumber e.g. '01' or 1
 * @param sortedIndex e.g. 1 -> '001'
 */
export function generateParticipantNumber(
  schoolCode: string | number = '12',
  year: string | number = new Date().getFullYear().toString().slice(-2),
  roomNumber: string | number = '01',
  sortedIndex: number = 1
): string {
  const cleanSchool = String(schoolCode).trim() || '12';
  
  // Clean 2-digit year (e.g. 2026 -> 26, or '26' -> 26)
  const rawYearStr = String(year).trim();
  const cleanYear = rawYearStr.length >= 4 ? rawYearStr.slice(-2) : rawYearStr.padStart(2, '0');

  // Clean 2-digit room code (e.g. 1 -> '01', 'Ruang 02' -> '02', '12' -> '12')
  const roomDigits = String(roomNumber).replace(/\D/g, '');
  const cleanRoom = (roomDigits || '01').padStart(2, '0').slice(-2);

  // Clean 3-digit sequential index (e.g. 1 -> '001', 25 -> '025')
  const cleanSeq = Math.max(1, sortedIndex).toString().padStart(3, '0');

  return `${cleanSchool}-${cleanYear}-${cleanRoom}-${cleanSeq}`;
}

/**
 * Re-sync participant number when room changes, preserving sequential order index
 */
export function updateParticipantRoomCode(
  currentParticipantNumber: string,
  newRoomCode: string | number
): string {
  if (!currentParticipantNumber || !currentParticipantNumber.includes('-')) {
    return generateParticipantNumber('12', undefined, newRoomCode, 1);
  }

  const parts = currentParticipantNumber.split('-');
  if (parts.length >= 4) {
    const cleanRoom = String(newRoomCode).replace(/\D/g, '').padStart(2, '0').slice(-2) || '01';
    return `${parts[0]}-${parts[1]}-${cleanRoom}-${parts[3]}`;
  }

  return currentParticipantNumber;
}

/**
 * Smart Auto-Generator for Exam Proctor ID (Nomor ID Pengawas Ujian CBT)
 * Format baku: PGW-[KODE_SEKOLAH]-[KODE_TAHUN]-[NOMOR_URUT]
 * Contoh: PGW-12-26-001, PGW-12-26-002, dst.
 *
 * @param schoolCode default '12'
 * @param year e.g. '26' or 2026
 * @param orderIndex e.g. 1 -> '001'
 * @param prefix default 'PGW'
 */
export function generateProctorId(
  schoolCode: string | number = '12',
  year: string | number = new Date().getFullYear().toString().slice(-2),
  orderIndex: number = 1,
  prefix: string = 'PGW'
): string {
  const cleanPrefix = (prefix || 'PGW').trim().toUpperCase();
  const cleanSchool = String(schoolCode).trim() || '12';
  const rawYear = String(year).trim();
  const cleanYear = rawYear.length >= 4 ? rawYear.slice(-2) : rawYear.padStart(2, '0');
  const cleanSeq = Math.max(1, orderIndex).toString().padStart(3, '0');

  return `${cleanPrefix}-${cleanSchool}-${cleanYear}-${cleanSeq}`;
}

/**
 * Assigns or synchronizes Proctor IDs for a list of teachers sequentially
 */
export function assignProctorIdsToTeachers(
  teachers: Teacher[],
  schoolCode: string | number = '12',
  year: string | number = new Date().getFullYear().toString().slice(-2),
  forceRegenerate: boolean = false
): Teacher[] {
  // Sort teachers by name alphabetically for consistent ordering
  const sorted = [...teachers].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
  const idMap = new Map<string, string>();

  sorted.forEach((t, idx) => {
    if (!forceRegenerate && t.proctorId && t.proctorId.trim()) {
      idMap.set(t.id, t.proctorId.trim());
    } else {
      idMap.set(t.id, generateProctorId(schoolCode, year, idx + 1));
    }
  });

  return teachers.map((t) => ({
    ...t,
    proctorId: idMap.get(t.id) || t.proctorId || generateProctorId(schoolCode, year, 1),
  }));
}

/**
 * Sorts students across the school using Natural Class Sorting (X.1 -> XII.IPS 2)
 * followed by alphabetical student name (A-Z)
 */
export function sortStudentsNaturally(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const classDiff = sortClassNaturally(a.kelas || '', b.kelas || '');
    if (classDiff !== 0) return classDiff;
    return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
  });
}

/**
 * Validates whether a student is already registered in another room
 */
export function validateStudentRoomAssignment(
  rooms: ExamRoom[],
  studentId: string,
  targetRoomId: string
): { isDuplicate: boolean; conflictRoomName?: string } {
  for (const r of rooms) {
    if (r.id !== targetRoomId) {
      const found = r.students.find((s) => s.studentId === studentId);
      if (found) {
        return { isDuplicate: true, conflictRoomName: r.roomName || `Ruang ${r.roomCode}` };
      }
    }
  }
  return { isDuplicate: false };
}

/**
 * Generates balanced multi-class mixed rooms from selected classes
 * E.g. Room 01 gets 18 students from Class A and 18 students from Class B
 */
export function generateMixedExamRooms(
  students: Student[],
  classPairs: [string, string][],
  options: {
    roomCapacity?: number;
    schoolCode?: string;
    yearCode?: string;
    startRoomNumber?: number;
  } = {}
): ExamRoom[] {
  const capacity = options.roomCapacity || 36;
  const schoolCode = options.schoolCode || '12';
  const yearCode = options.yearCode || new Date().getFullYear().toString().slice(-2);
  let roomCounter = options.startRoomNumber || 1;

  const sortedAll = sortStudentsNaturally(students);
  const studentOverallIndexMap = new Map<string, number>();
  sortedAll.forEach((s, idx) => {
    studentOverallIndexMap.set(s.id, idx + 1);
  });

  const generatedRooms: ExamRoom[] = [];

  classPairs.forEach(([classA, classB]) => {
    const studentsA = sortedAll.filter((s) => s.kelas === classA);
    const studentsB = sortedAll.filter((s) => s.kelas === classB);

    // Half capacity from Class A, half from Class B
    const halfCap = Math.floor(capacity / 2);
    const maxBatches = Math.max(
      Math.ceil(studentsA.length / halfCap),
      Math.ceil(studentsB.length / halfCap),
      1
    );

    for (let batch = 0; batch < maxBatches; batch++) {
      const roomCode = String(roomCounter).padStart(2, '0');
      const roomName = `Ruang ${roomCode}`;
      const batchA = studentsA.slice(batch * halfCap, (batch + 1) * halfCap);
      const batchB = studentsB.slice(batch * halfCap, (batch + 1) * halfCap);

      const allocations: ExamRoomStudentAllocation[] = [];
      let seatIdx = 1;

      // Interleave Class A and Class B for exam anti-cheat seat integrity
      const maxLength = Math.max(batchA.length, batchB.length);
      for (let i = 0; i < maxLength; i++) {
        if (batchA[i]) {
          const s = batchA[i];
          const globalOrder = studentOverallIndexMap.get(s.id) || seatIdx;
          const pNum = generateParticipantNumber(schoolCode, yearCode, roomCode, globalOrder);
          allocations.push({
            studentId: s.id,
            studentName: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            roomOrderNumber: seatIdx,
            participantNumber: pNum,
            seatNumber: `A-${String(Math.ceil(seatIdx / 2)).padStart(2, '0')}`,
            sessionNumber: 1,
          });
          seatIdx++;
        }
        if (batchB[i]) {
          const s = batchB[i];
          const globalOrder = studentOverallIndexMap.get(s.id) || seatIdx;
          const pNum = generateParticipantNumber(schoolCode, yearCode, roomCode, globalOrder);
          allocations.push({
            studentId: s.id,
            studentName: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            roomOrderNumber: seatIdx,
            participantNumber: pNum,
            seatNumber: `B-${String(Math.ceil(seatIdx / 2)).padStart(2, '0')}`,
            sessionNumber: 1,
          });
          seatIdx++;
        }
      }

      generatedRooms.push({
        id: `room-${roomCode}`,
        roomCode,
        roomName,
        capacity,
        primaryClass: classA,
        secondaryClass: classB,
        assignedClasses: [classA, classB].filter(Boolean),
        students: allocations,
        notes: `Ruang Campuran ${classA} & ${classB}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      roomCounter++;
    }
  });

  return generatedRooms;
}

/**
 * Checks schedule collision for Proctor (Pengawas) duty assignments
 */
export function checkProctorScheduleConflict(
  existingSchedules: ProctorDutySlot[],
  newSlot: Partial<ProctorDutySlot>
): { hasConflict: boolean; reason?: string } {
  if (!newSlot.teacherId || !newSlot.date || !newSlot.sessionNumber) {
    return { hasConflict: false };
  }

  for (const slot of existingSchedules) {
    if (newSlot.id && slot.id === newSlot.id) continue;

    // Check same teacher on same date and same session
    if (
      slot.teacherId === newSlot.teacherId &&
      slot.date === newSlot.date &&
      slot.sessionNumber === newSlot.sessionNumber
    ) {
      return {
        hasConflict: true,
        reason: `Guru ${slot.teacherName} sudah memiliki jadwal mengawas di ${slot.roomName} pada tanggal ${slot.date} (${slot.sessionName}).`,
      };
    }

    // Check same room already has proctor on same date and session
    if (
      slot.roomCode === newSlot.roomCode &&
      slot.date === newSlot.date &&
      slot.sessionNumber === newSlot.sessionNumber &&
      slot.teacherId !== newSlot.teacherId
    ) {
      return {
        hasConflict: true,
        reason: `${slot.roomName} sudah diawasi oleh ${slot.teacherName} pada ${slot.date} (${slot.sessionName}).`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Detects current active duty slot for logged-in teacher on mobile HP
 */
export function getActiveDutyForTeacher(
  schedules: ProctorDutySlot[],
  teacherId: string,
  now: Date = new Date()
): ProctorDutySlot | null {
  if (!schedules || schedules.length === 0 || !teacherId) return null;

  const todayStr = now.toISOString().split('T')[0];
  const teacherDutiesToday = schedules.filter(
    (s) => s.teacherId === teacherId && s.date === todayStr
  );

  if (teacherDutiesToday.length === 0) {
    // If no duty today, return upcoming duty or first assigned duty for preview
    return schedules.find((s) => s.teacherId === teacherId) || null;
  }

  // Calculate current time in minutes e.g. "08:15" -> 8 * 60 + 15 = 495
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const duty of teacherDutiesToday) {
    const [startH, startM] = (duty.startTime || '07:30').split(':').map(Number);
    const [endH, endM] = (duty.endTime || '09:30').split(':').map(Number);
    const startMin = startH * 60 + startM - 20; // Allow 20 minutes early check-in
    const endMin = endH * 60 + endM + 30; // Allow 30 minutes grace period

    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      return duty;
    }
  }

  return teacherDutiesToday[0];
}

/**
 * Mock / Seed Data Generator for instant interactive testing
 */
export function generateMockExamRoomsAndProctors(
  students: Student[],
  teachers: Teacher[]
): {
  rooms: ExamRoom[];
  proctors: ProctorDutySlot[];
  dayConfigs: ProctorDayConfig[];
} {
  const schoolCode = '12';
  const yearCode = new Date().getFullYear().toString().slice(-2);

  // Group students by natural classes
  const classesPresent = Array.from(new Set(students.map((s) => s.kelas).filter(Boolean))).sort(
    sortClassNaturally
  );

  // Pair classes: e.g. Grade X with Grade XI or Grade XII
  const classPairs: [string, string][] = [];
  if (classesPresent.length >= 2) {
    for (let i = 0; i < classesPresent.length; i += 2) {
      const c1 = classesPresent[i];
      const c2 = classesPresent[i + 1] || classesPresent[0];
      classPairs.push([c1, c2]);
    }
  } else {
    classPairs.push(['X.1', 'XI.IPA 1'], ['X.2', 'XI.IPA 2'], ['XI.IPS 1', 'XII.IPS 1']);
  }

  const rooms = generateMixedExamRooms(students, classPairs, {
    roomCapacity: 36,
    schoolCode,
    yearCode,
  });

  // Default 5-day configuration
  const baseDate = new Date();
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const dayConfigs: ProctorDayConfig[] = dayNames.map((name, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    return {
      dayIndex: i + 1,
      date: d.toISOString().split('T')[0],
      dayName: name,
      sessions: [
        {
          sessionNumber: 1,
          sessionName: 'Sesi 1 (Pagi)',
          startTime: '07:30',
          endTime: '09:30',
        },
        {
          sessionNumber: 2,
          sessionName: 'Sesi 2 (Siang)',
          startTime: '10:00',
          endTime: '12:00',
        },
      ],
    };
  });

  // Generate proctor schedules across rooms, rotated among teachers
  const proctors: ProctorDutySlot[] = [];
  const validTeachers = teachers.length > 0 ? teachers : [
    { id: 'tch-01', nama: 'Drs. Supriyanto, M.Pd.', nip: '197203151998021001' },
    { id: 'tch-02', nama: 'Siti Rahmawati, S.Pd.', nip: '198005122005012003' },
    { id: 'tch-03', nama: 'Ahmad Fauzi, S.Kom.', nip: '198507202009031002' },
    { id: 'tch-04', nama: 'Nurul Hidayah, M.Pd.', nip: '198302142008012004' },
    { id: 'tch-05', nama: 'Bambang Irawan, S.Pd.', nip: '197911082006041005' },
  ];

  let teacherIdx = 0;
  dayConfigs.forEach((day) => {
    day.sessions.forEach((sess) => {
      rooms.forEach((room) => {
        const teacher = validTeachers[teacherIdx % validTeachers.length];
        teacherIdx++;

        proctors.push({
          id: `slot-${day.date}-s${sess.sessionNumber}-${room.roomCode}`,
          date: day.date,
          dayLabel: `Hari Ke-${day.dayIndex} (${day.dayName})`,
          sessionNumber: sess.sessionNumber,
          sessionName: sess.sessionName,
          startTime: sess.startTime,
          endTime: sess.endTime,
          roomId: room.id,
          roomCode: room.roomCode,
          roomName: room.roomName,
          teacherId: teacher.id,
          teacherName: teacher.nama,
          teacherNip: (teacher as any).nip,
          proctorId: (teacher as any).proctorId || generateProctorId(schoolCode, yearCode, (teacherIdx % validTeachers.length) + 1),
          token: `ASAS${sess.sessionNumber}${room.roomCode}`,
          proctorPin: '482910',
          status: 'SCHEDULED',
        });
      });
    });
  });

  return { rooms, proctors, dayConfigs };
}

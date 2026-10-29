import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { ProctorDutySlot, ProctorDayConfig, Teacher, ExamRoom } from '../types';
import {
  checkProctorScheduleConflict,
  generateMockExamRoomsAndProctors,
  generateProctorId,
  assignProctorIdsToTeachers,
} from '../utils/examRoomAndNumberHelper';
import {
  Calendar,
  Clock,
  UserCheck,
  DoorOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Layers,
  ChevronRight,
  Info,
  FileSpreadsheet,
  CreditCard,
  BadgeCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamProctorScheduleViewProps {
  className?: string;
}

export const ExamProctorScheduleView: React.FC<ExamProctorScheduleViewProps> = ({ className = '' }) => {
  const { state, updateExamManagementState, saveTeachersBatch, showToast } = useApp();
  const teachers = state.teachers || [];
  const rooms: ExamRoom[] = state.examManagement?.examRooms || [];
  const existingSchedules: ProctorDutySlot[] = state.examManagement?.proctorSchedules || [];
  const existingDayConfigs: ProctorDayConfig[] = state.examManagement?.proctorDaysConfig || [];

  // Default 5-day setup if none exists
  const defaultDayConfigs = useMemo<ProctorDayConfig[]>(() => {
    if (existingDayConfigs.length > 0) return existingDayConfigs;

    const baseDate = new Date();
    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    return dayNames.map((name, i) => {
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
  }, [existingDayConfigs]);

  const [dayConfigs, setDayConfigs] = useState<ProctorDayConfig[]>(defaultDayConfigs);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return defaultDayConfigs[0]?.date || new Date().toISOString().split('T')[0];
  });
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<number | 'ALL'>('ALL');
  const [searchTeacher, setSearchTeacher] = useState<string>('');

  // Multi-select & Batch Delete Modal State
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    mode: 'SINGLE' | 'MULTI' | 'ALL';
    targetSlot?: ProctorDutySlot;
    count?: number;
  } | null>(null);

  // Add / Edit Duty Slot Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ProctorDutySlot | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formSessionNum, setFormSessionNum] = useState(1);
  const [formRoomCode, setFormRoomCode] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formProctorId, setFormProctorId] = useState('');
  const [formBackupTeacherId, setFormBackupTeacherId] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Quick lookup teacher map
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  // Available room codes from exam rooms or defaults
  const availableRooms = useMemo(() => {
    if (rooms.length > 0) {
      return rooms;
    }
    // Fallback default rooms 01..10
    return Array.from({ length: 8 }, (_, i) => {
      const code = String(i + 1).padStart(2, '0');
      return {
        id: `room-${code}`,
        roomCode: code,
        roomName: `Ruang ${code}`,
        capacity: 36,
        assignedClasses: ['X.1', 'XI.IPA 1'],
        students: [],
      } as ExamRoom;
    });
  }, [rooms]);

  // Selected Day Object
  const selectedDayObj = useMemo(() => {
    return dayConfigs.find((d) => d.date === selectedDate) || dayConfigs[0];
  }, [dayConfigs, selectedDate]);

  // Filtered schedules for selected date & session
  const filteredSchedules = useMemo(() => {
    return existingSchedules.filter((slot) => {
      const matchDate = slot.date === selectedDate;
      const matchSession = selectedSessionFilter === 'ALL' || slot.sessionNumber === selectedSessionFilter;
      const matchTeacher =
        (slot.teacherName || '').toLowerCase().includes(searchTeacher.toLowerCase()) ||
        (slot.roomName || '').toLowerCase().includes(searchTeacher.toLowerCase()) ||
        (slot.proctorId || '').toLowerCase().includes(searchTeacher.toLowerCase());

      return matchDate && matchSession && matchTeacher;
    });
  }, [existingSchedules, selectedDate, selectedSessionFilter, searchTeacher]);

  // Overall Statistics
  const dutyStats = useMemo(() => {
    const totalSlots = existingSchedules.length;
    const uniqueTeachersAssigned = new Set(existingSchedules.map((s) => s.teacherId)).size;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDutiesCount = existingSchedules.filter((s) => s.date === todayStr).length;
    const teachersWithProctorIdCount = teachers.filter((t) => Boolean(t.proctorId && t.proctorId.trim())).length;

    return {
      totalSlots,
      uniqueTeachersAssigned,
      totalTeachersAvailable: teachers.length,
      todayDutiesCount,
      totalDays: dayConfigs.length,
      teachersWithProctorIdCount,
    };
  }, [existingSchedules, teachers, dayConfigs]);

  // Save schedules to AppState & Firestore
  const saveSchedules = async (newSchedules: ProctorDutySlot[], msgTitle: string, msgDesc: string) => {
    const curMgmt = state.examManagement || {};
    await updateExamManagementState({
      ...curMgmt,
      proctorSchedules: newSchedules,
      proctorDaysConfig: dayConfigs,
    });
    showToast(msgTitle, msgDesc, 'success');
  };

  // Generate / Synchronize Proctor IDs for All Registered Teachers
  const handleGenerateAllProctorIds = async () => {
    if (teachers.length === 0) {
      showToast('Data Guru Kosong', 'Tidak ada data guru untuk digenerate ID Pengawas.', 'warning');
      return;
    }

    const schoolCode = state.examManagement?.schoolExamCode || '12';
    const yearCode = new Date().getFullYear().toString().slice(-2);

    const updatedTeachers = assignProctorIdsToTeachers(teachers, schoolCode, yearCode, false);
    await saveTeachersBatch(updatedTeachers);

    // Sync existing proctorSchedules slots with newly generated proctor IDs
    const idMap = new Map(updatedTeachers.map((t) => [t.id, t.proctorId || '']));
    if (existingSchedules.length > 0) {
      const syncedSchedules = existingSchedules.map((slot) => ({
        ...slot,
        proctorId: slot.proctorId || idMap.get(slot.teacherId) || generateProctorId(schoolCode, yearCode, 1),
      }));
      const curMgmt = state.examManagement || {};
      await updateExamManagementState({
        ...curMgmt,
        proctorSchedules: syncedSchedules,
      });
    }

    showToast(
      'ID Pengawas Berhasil Digenerate',
      `Sebanyak ${updatedTeachers.length} guru pengawas telah resmi memiliki Nomor ID Pengawas (${generateProctorId(schoolCode, yearCode, 1)} dst.).`,
      'success'
    );
  };

  // Open Create Modal
  const handleOpenCreateSlot = () => {
    setEditingSlot(null);
    setFormDate(selectedDate);
    setFormSessionNum(selectedSessionFilter === 'ALL' ? 1 : selectedSessionFilter);
    setFormRoomCode(availableRooms[0]?.roomCode || '01');
    const firstTeacher = teachers[0];
    setFormTeacherId(firstTeacher?.id || '');
    setFormProctorId(firstTeacher?.proctorId || generateProctorId('12', undefined, 1));
    setFormBackupTeacherId('');
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditSlot = (slot: ProctorDutySlot) => {
    setEditingSlot(slot);
    setFormDate(slot.date);
    setFormSessionNum(slot.sessionNumber);
    setFormRoomCode(slot.roomCode);
    setFormTeacherId(slot.teacherId);
    setFormProctorId(slot.proctorId || teacherMap.get(slot.teacherId)?.proctorId || generateProctorId('12', undefined, 1));
    setFormBackupTeacherId(slot.backupTeacherId || '');
    setConflictWarning(null);
    setIsModalOpen(true);
  };

  // Conflict check on form change
  const handleTeacherChange = (teacherId: string) => {
    setFormTeacherId(teacherId);
    const teacherObj = teachers.find((t) => t.id === teacherId);
    const roomObj = availableRooms.find((r) => r.roomCode === formRoomCode);

    if (teacherObj?.proctorId) {
      setFormProctorId(teacherObj.proctorId);
    } else {
      const tIdx = teachers.findIndex((t) => t.id === teacherId);
      setFormProctorId(generateProctorId('12', undefined, Math.max(1, tIdx + 1)));
    }

    const testSlot: Partial<ProctorDutySlot> = {
      id: editingSlot?.id,
      date: formDate,
      sessionNumber: formSessionNum,
      roomCode: formRoomCode,
      roomName: roomObj?.roomName || `Ruang ${formRoomCode}`,
      teacherId,
      teacherName: teacherObj?.nama || '',
    };

    const conflict = checkProctorScheduleConflict(existingSchedules, testSlot);
    if (conflict.hasConflict) {
      setConflictWarning(conflict.reason || 'Terdeteksi bentrok jadwal mengawas.');
    } else {
      setConflictWarning(null);
    }
  };

  // Save Slot (Create / Edit)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacherObj = teachers.find((t) => t.id === formTeacherId);
    const backupObj = teachers.find((t) => t.id === formBackupTeacherId);
    const roomObj = availableRooms.find((r) => r.roomCode === formRoomCode);
    const dayObj = dayConfigs.find((d) => d.date === formDate);
    const sessObj = dayObj?.sessions.find((s) => s.sessionNumber === formSessionNum);

    const finalProctorId = formProctorId.trim() || teacherObj?.proctorId || generateProctorId('12', undefined, 1);

    const newSlot: ProctorDutySlot = {
      id: editingSlot?.id || `slot-${formDate}-s${formSessionNum}-${formRoomCode}-${Date.now()}`,
      date: formDate,
      dayLabel: dayObj ? `Hari Ke-${dayObj.dayIndex} (${dayObj.dayName})` : 'Hari Ujian',
      sessionNumber: formSessionNum,
      sessionName: sessObj?.sessionName || `Sesi ${formSessionNum}`,
      startTime: sessObj?.startTime || '07:30',
      endTime: sessObj?.endTime || '09:30',
      roomId: roomObj?.id || `room-${formRoomCode}`,
      roomCode: formRoomCode,
      roomName: roomObj?.roomName || `Ruang ${formRoomCode}`,
      teacherId: formTeacherId,
      teacherName: teacherObj?.nama || 'Guru Pengawas',
      teacherNip: teacherObj?.nip,
      proctorId: finalProctorId,
      backupTeacherId: formBackupTeacherId || undefined,
      backupTeacherName: backupObj?.nama || undefined,
      token: `ASAS${formSessionNum}${formRoomCode}`,
      proctorPin: '482910',
      status: 'SCHEDULED',
    };

    // If teacher doesn't have proctorId, sync it back to teacher profile
    if (teacherObj && !teacherObj.proctorId) {
      saveTeachersBatch([{ ...teacherObj, proctorId: finalProctorId }]);
    }

    // Strict Conflict Check
    const conflict = checkProctorScheduleConflict(existingSchedules, newSlot);
    if (conflict.hasConflict) {
      showToast('Bentrok Jadwal Pengawas!', conflict.reason || 'Guru sudah dijadwalkan di ruang lain pada waktu yang sama.', 'warning');
      setConflictWarning(conflict.reason || null);
      return;
    }

    let updated = [...existingSchedules];
    if (editingSlot) {
      const idx = updated.findIndex((s) => s.id === editingSlot.id);
      if (idx >= 0) updated[idx] = newSlot;
    } else {
      updated.push(newSlot);
    }

    await saveSchedules(updated, 'Jadwal Pengawas Disimpan', `${teacherObj?.nama || 'Pengawas'} (${finalProctorId}) ditugaskan di ${newSlot.roomName}.`);
    setIsModalOpen(false);
  };

  // Selection Handlers
  const handleToggleSelectSlot = (slotId: string) => {
    setSelectedSlotIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredSchedules.map((s) => s.id);
    const allSelected = visibleIds.every((id) => selectedSlotIds.includes(id));
    if (allSelected) {
      setSelectedSlotIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedSlotIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Open Delete Confirmation Modal
  const handleRequestDeleteSingle = (slot: ProctorDutySlot) => {
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'SINGLE',
      targetSlot: slot,
      count: 1,
    });
  };

  const handleRequestDeleteMulti = () => {
    if (selectedSlotIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'MULTI',
      count: selectedSlotIds.length,
    });
  };

  const handleRequestDeleteAll = () => {
    if (existingSchedules.length === 0) {
      showToast('Data Sudah Kosong', 'Tidak ada jadwal pengawas yang dapat dihapus.', 'info');
      return;
    }
    setDeleteConfirmModal({
      isOpen: true,
      mode: 'ALL',
      count: existingSchedules.length,
    });
  };

  // Execute Confirmed Delete Operation
  const handleExecuteDelete = async () => {
    if (!deleteConfirmModal) return;

    if (deleteConfirmModal.mode === 'SINGLE' && deleteConfirmModal.targetSlot) {
      const targetId = deleteConfirmModal.targetSlot.id;
      const updated = existingSchedules.filter((s) => s.id !== targetId);
      setSelectedSlotIds((prev) => prev.filter((id) => id !== targetId));
      await saveSchedules(
        updated,
        'Jadwal Dihapus',
        `Jadwal pengawas ${deleteConfirmModal.targetSlot.teacherName} di ${deleteConfirmModal.targetSlot.roomName} telah dihapus.`
      );
    } else if (deleteConfirmModal.mode === 'MULTI') {
      const toDelete = new Set(selectedSlotIds);
      const updated = existingSchedules.filter((s) => !toDelete.has(s.id));
      const deletedCount = selectedSlotIds.length;
      setSelectedSlotIds([]);
      await saveSchedules(
        updated,
        'Jadwal Pengawas Dihapus',
        `Sebanyak ${deletedCount} jadwal pengawas terpilih telah berhasil dihapus permanen.`
      );
    } else if (deleteConfirmModal.mode === 'ALL') {
      setSelectedSlotIds([]);
      await saveSchedules(
        [],
        'Seluruh Jadwal Pengawas Dihapus',
        'Seluruh jadwal pengawas (0 data) telah dibersihkan dan direset permanen.'
      );
    }

    setDeleteConfirmModal(null);
  };

  // Fair Auto-Rotation Distributor
  const handleAutoDistributeProctors = async () => {
    if (teachers.length === 0) {
      showToast('Data Guru Kosong', 'Tidak ada data guru untuk dijadwalkan.', 'warning');
      return;
    }

    if (
      existingSchedules.length > 0 &&
      !window.confirm(
        'Generate Ulang Seluruh Jadwal Rotasi Pengawas?\n\nSemua jadwal pengawas akan disusun ulang secara adil dan merata ke seluruh ruang dan sesi tanpa bentrok. Lanjutkan?'
      )
    ) {
      return;
    }

    const schoolCode = state.examManagement?.schoolExamCode || '12';
    const yearCode = new Date().getFullYear().toString().slice(-2);
    const newSchedules: ProctorDutySlot[] = [];
    let teacherCounter = 0;

    dayConfigs.forEach((day) => {
      day.sessions.forEach((sess) => {
        availableRooms.forEach((room) => {
          const teacher = teachers[teacherCounter % teachers.length];
          const assignedProctorId = teacher.proctorId || generateProctorId(schoolCode, yearCode, (teacherCounter % teachers.length) + 1);
          teacherCounter++;

          newSchedules.push({
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
            teacherNip: teacher.nip,
            proctorId: assignedProctorId,
            token: `ASAS${sess.sessionNumber}${room.roomCode}`,
            proctorPin: '482910',
            status: 'SCHEDULED',
          });
        });
      });
    });

    await saveSchedules(
      newSchedules,
      'Rotasi Pengawas Berhasil',
      `${newSchedules.length} penugasan pengawas berhasil dibuat merata untuk ${dayConfigs.length} hari pelaksanaan lengkap dengan Nomor ID Pengawas resmi.`
    );
  };

  // Export All Proctor Schedules to Excel
  const handleExportProctorExcel = () => {
    if (existingSchedules.length === 0) {
      showToast('Data Kosong', 'Belum ada jadwal pengawas untuk diekspor.', 'warning');
      return;
    }
    const exportData = existingSchedules.map((s) => ({
      'Tanggal': s.date,
      'Hari': s.dayLabel,
      'Sesi': s.sessionName,
      'Waktu': `${s.startTime} - ${s.endTime} WIB`,
      'Ruang Ujian': s.roomName,
      'Kode Ruang': s.roomCode,
      'ID Pengawas': s.proctorId || teacherMap.get(s.teacherId)?.proctorId || '-',
      'Nama Pengawas': s.teacherName,
      'NIP': s.teacherNip || '-',
      'Token Sesi': s.token || '',
      'PIN Pengawas': s.proctorPin || '482910',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal_Pengawas_CBT');
    XLSX.writeFile(workbook, `Jadwal_Pengawas_CBT_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Ekspor Berhasil', 'Jadwal pengawas ujian berhasil diekspor ke Excel.', 'success');
  };

  // Add extra day (e.g. Day 6, Day 7)
  const handleAddNewDay = () => {
    const nextIdx = dayConfigs.length + 1;
    const lastDate = new Date(dayConfigs[dayConfigs.length - 1]?.date || new Date());
    lastDate.setDate(lastDate.getDate() + 1);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const newDayName = dayNames[lastDate.getDay()] || `Hari ${nextIdx}`;
    const newDateStr = lastDate.toISOString().split('T')[0];

    const newDay: ProctorDayConfig = {
      dayIndex: nextIdx,
      date: newDateStr,
      dayName: newDayName,
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

    const updated = [...dayConfigs, newDay];
    setDayConfigs(updated);
    setSelectedDate(newDateStr);
    showToast('Hari Ujian Ditambahkan', `Hari ke-${nextIdx} (${newDayName}, ${newDateStr}) berhasil ditambahkan ke jadwal ujian.`, 'success');
  };

  // Print Official Schedule (HTML print)
  const handlePrintSchedule = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Stats Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>PENJADWALAN PENGAWAS UJIAN &bull; MULTI-HARI &amp; MULTI-SESI</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Jadwal Pengawas Ruang Ujian CBT</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {dayConfigs.length} Hari Pelaksanaan
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
              Konfigurasi pembagian tugas Guru Mapel sebagai Pengawas Ruang ujian multi-hari dan multi-sesi, dilengkapi rotasi ruang otomatis dan Conflict Checker aktif untuk mencegah bentrok jadwal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateAllProctorIds}
              className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-amber-300 active:scale-95 shadow-sm"
              title="Generate Nomor ID Pengawas resmi (PGW-12-26-XXX) untuk seluruh Guru Mapel"
            >
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Generate ID Pengawas</span>
            </button>

            <button
              type="button"
              onClick={handleAutoDistributeProctors}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rotasi Pengawas Otomatis</span>
            </button>

            <button
              type="button"
              onClick={handleAddNewDay}
              className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200 active:scale-95"
              title="Tambah hari pelaksanaan ujian (Hari 6, Hari 7, dst.)"
            >
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Tambah Hari</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateSlot}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Pengawas</span>
            </button>

            <button
              type="button"
              onClick={handleExportProctorExcel}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-200 active:scale-95"
              title="Ekspor Jadwal Pengawas ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handleRequestDeleteAll}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-rose-300 active:scale-95 shadow-2xs"
              title="Hapus seluruh data jadwal pengawas (Reset ke 0)"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua Pengawas</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSchedule}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 active:scale-95"
              title="Cetak Jadwal Pengawas A4"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Jadwal</span>
            </button>
          </div>
        </div>

        {/* 5 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Jadwal Mengawas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{dutyStats.totalSlots}</span>
              <span className="text-xs text-slate-500 font-bold">Slot Tugas</span>
            </div>
            <p className="text-[10px] text-slate-400">Tersebar di {availableRooms.length} Ruangan</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-700 block">Guru Ditugaskan</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-900 font-mono">{dutyStats.uniqueTeachersAssigned}</span>
              <span className="text-xs text-purple-700 font-bold">/ {dutyStats.totalTeachersAvailable} Guru</span>
            </div>
            <p className="text-[10px] text-purple-600 font-semibold truncate">
              {dutyStats.totalTeachersAvailable > 0
                ? `${Math.round((dutyStats.uniqueTeachersAssigned / dutyStats.totalTeachersAvailable) * 100)}% Partisipasi Guru`
                : '0%'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">ID Pengawas CBT</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">{dutyStats.teachersWithProctorIdCount}</span>
              <span className="text-xs text-amber-700 font-bold">/ {dutyStats.totalTeachersAvailable} Guru</span>
            </div>
            <p className="text-[10px] text-amber-700 font-semibold truncate">
              {dutyStats.teachersWithProctorIdCount === dutyStats.totalTeachersAvailable && dutyStats.totalTeachersAvailable > 0
                ? 'Semua Guru Memiliki ID'
                : 'Klik Generate ID Pengawas'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Conflict Checker</span>
            <div className="flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-900">Proteksi Aktif</span>
            </div>
            <p className="text-[10px] text-emerald-700">Mencegah tugas ganda di jam sama</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Ruang Tercover</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono">{availableRooms.length}</span>
              <span className="text-xs text-indigo-700 font-bold">Ruang Siap</span>
            </div>
            <p className="text-[10px] text-indigo-600">Sesi 1 (07:30) &amp; Sesi 2 (10:00)</p>
          </div>
        </div>
      </div>

      {/* Day Selector Tabs (Hari 1 s.d. Hari 5) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {dayConfigs.map((d) => {
          const isSelected = d.date === selectedDate;
          const slotsForDay = existingSchedules.filter((s) => s.date === d.date);

          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelectedDate(d.date)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Hari {d.dayIndex} ({d.dayName})</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {slotsForDay.length} Ruang
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Schedule Table Box */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold mr-1">Filter Sesi:</span>
            <button
              type="button"
              onClick={() => setSelectedSessionFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedSessionFilter === 'ALL'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Sesi
            </button>
            <button
              type="button"
              onClick={() => setSelectedSessionFilter(1)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedSessionFilter === 1
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Sesi 1 (07:30 - 09:30)
            </button>
            <button
              type="button"
              onClick={() => setSelectedSessionFilter(2)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedSessionFilter === 2
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Sesi 2 (10:00 - 12:00)
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama guru atau ruang..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {selectedSlotIds.length > 0 && (
              <button
                type="button"
                onClick={handleRequestDeleteMulti}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedSlotIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredSchedules.length > 0 &&
                      filteredSchedules.every((s) => selectedSlotIds.includes(s.id))
                    }
                    onChange={handleToggleSelectAllVisible}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Pilih Semua yang Tampak"
                  />
                </th>
                <th className="py-3 px-3 w-14 text-center">Ruang</th>
                <th className="py-3 px-3">Nama Ruangan</th>
                <th className="py-3 px-3">Sesi / Jam Pelaksanaan</th>
                <th className="py-3 px-3">ID Pengawas CBT</th>
                <th className="py-3 px-3">Pengawas Utama (Guru Mapel)</th>
                <th className="py-3 px-3">NIP Pengawas</th>
                <th className="py-3 px-3 text-center">Token / PIN Otorisasi</th>
                <th className="py-3 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    Belum ada jadwal pengawas untuk tanggal dan sesi ini. Klik &quot;Tambah Jadwal Pengawas&quot; atau &quot;Rotasi Pengawas Otomatis&quot;.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((slot) => {
                  const isSelected = selectedSlotIds.includes(slot.id);
                  return (
                    <tr
                      key={slot.id}
                      className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSlot(slot.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-black text-xs text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          {slot.roomCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        {slot.roomName}
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">{slot.sessionName}</span>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{slot.startTime} - {slot.endTime} WIB</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300">
                          <CreditCard className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{slot.proctorId || teacherMap.get(slot.teacherId)?.proctorId || 'PGW-12-26-001'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {slot.teacherName.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-slate-950 block font-bold">{slot.teacherName}</strong>
                            {slot.backupTeacherName && (
                              <span className="text-[10px] text-slate-400">Cadangan: {slot.backupTeacherName}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {slot.teacherNip || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Token Sesi">
                            {slot.token || 'ASAS-01'}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px]" title="PIN Pengawas Rahasia">
                            PIN: 482910
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlot(slot)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                            title="Edit Jadwal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteSingle(slot)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Proctor Schedule Slot */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 cursor-default space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {editingSlot ? 'Edit Tugas Pengawas' : 'Tambah Penugasan Pengawas'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Penetapan guru mapel di ruang ujian</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Conflict Warning Banner */}
              {conflictWarning && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs flex items-start gap-2.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Peringatan Bentrok Jadwal!</strong>
                    <p className="text-[11px] leading-relaxed mt-0.5">{conflictWarning}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Pelaksanaan:</label>
                    <select
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {dayConfigs.map((d) => (
                        <option key={d.date} value={d.date}>
                          Hari {d.dayIndex} ({d.dayName}, {d.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Sesi Pelaksanaan:</label>
                    <select
                      value={formSessionNum}
                      onChange={(e) => setFormSessionNum(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>Sesi 1 (07:30 - 09:30)</option>
                      <option value={2}>Sesi 2 (10:00 - 12:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ruang Ujian:</label>
                  <select
                    value={formRoomCode}
                    onChange={(e) => setFormRoomCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableRooms.map((r) => (
                      <option key={r.roomCode} value={r.roomCode}>
                        {r.roomName} (Kode: {r.roomCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Guru Pengawas Utama:</label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => handleTeacherChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Guru Mapel</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} {t.mataPelajaran ? `(${t.mataPelajaran})` : ''} {t.proctorId ? `• ID: ${t.proctorId}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor ID Pengawas CBT:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formProctorId}
                        onChange={(e) => setFormProctorId(e.target.value)}
                        placeholder="Contoh: PGW-12-26-001"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormProctorId(generateProctorId('12', undefined, Math.max(1, teachers.findIndex((t) => t.id === formTeacherId) + 1)))}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 cursor-pointer"
                      title="Generate format baku PGW-12-26-XXX"
                    >
                      Auto
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Format baku: PGW-[KODE_SEKOLAH]-[KODE_TAHUN]-[NOMOR_URUT]</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pengawas Cadangan (Opsional):</label>
                  <select
                    value={formBackupTeacherId}
                    onChange={(e) => setFormBackupTeacherId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Tidak Ada Pengawas Cadangan</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Penugasan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Hapus Schedule Pengawas (Single / Multi / Hapus Semua) */}
      <AnimatePresence>
        {deleteConfirmModal?.isOpen && (
          <div
            onClick={() => setDeleteConfirmModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 cursor-default space-y-4"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center font-bold shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    Konfirmasi Hapus Schedule Pengawas
                  </h3>
                  <p className="text-[11px] text-slate-500">Tindakan ini memerlukan verifikasi resmi</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-rose-900 block">
                      {deleteConfirmModal.mode === 'SINGLE'
                        ? 'Hapus Single Penugasan'
                        : deleteConfirmModal.mode === 'MULTI'
                        ? `Hapus ${deleteConfirmModal.count} Penugasan Terpilih`
                        : 'HAPUS SELURUH JADWAL PENGAWAS (RESET KE 0)'}
                    </strong>
                    <p className="leading-relaxed text-[11.5px]">
                      {deleteConfirmModal.mode === 'SINGLE' && deleteConfirmModal.targetSlot
                        ? `Apakah Anda yakin ingin menghapus tugas mengawas ${deleteConfirmModal.targetSlot.teacherName} di ${deleteConfirmModal.targetSlot.roomName} (${deleteConfirmModal.targetSlot.sessionName})?`
                        : deleteConfirmModal.mode === 'MULTI'
                        ? `Apakah Anda yakin ingin menghapus ${deleteConfirmModal.count} jadwal pengawas yang telah Anda pilih?`
                        : `PERINGATAN: Seluruh data jadwal pengawas (${deleteConfirmModal.count} slot tugas) akan dihapus permanen dan direset ke 0.`}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Data yang telah dihapus tidak dapat dipulihkan secara otomatis.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Permanen</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { ExamRoom, ExamRoomStudentAllocation, Student } from '../types';
import {
  generateParticipantNumber,
  sortClassNaturally,
  sortStudentsNaturally,
  validateStudentRoomAssignment,
  generateMixedExamRooms,
  updateParticipantRoomCode,
  generateMockExamRoomsAndProctors,
} from '../utils/examRoomAndNumberHelper';
import {
  DoorClosed,
  DoorOpen,
  Plus,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Printer,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Layers,
  ChevronRight,
  Filter,
  X,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamMultiClassRoomsViewProps {
  onNavigateToCards?: () => void;
  className?: string;
}

export const ExamMultiClassRoomsView: React.FC<ExamMultiClassRoomsViewProps> = ({
  onNavigateToCards,
  className = '',
}) => {
  const { state, updateExamManagementState, showToast, setCurrentView } = useApp();
  const students = state.students || [];
  const classes = state.classes || [];
  const school = state.schoolInfo;

  const currentYearCode = new Date().getFullYear().toString().slice(-2);
  const schoolCode = state.examManagement?.schoolExamCode || '12';

  // Read existing rooms or empty array
  const rooms: ExamRoom[] = state.examManagement?.examRooms || [];

  // Active Selected Room
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    return rooms[0]?.id || '';
  });

  // State for Create / Edit Room Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('01');
  const [roomNameInput, setRoomNameInput] = useState('Ruang 01');
  const [roomCapacityInput, setRoomCapacityInput] = useState(36);
  const [primaryClassInput, setPrimaryClassInput] = useState('');
  const [secondaryClassInput, setSecondaryClassInput] = useState('');
  const [roomNotesInput, setRoomNotesInput] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<'ALL' | 'CLASS_A' | 'CLASS_B'>('ALL');

  // Manual Add Student Modal
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedClassToAdd, setSelectedClassToAdd] = useState('');
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);

  // Manual Edit Individual Student Allocation Modal (Fitur 2: Input Manual)
  const [editingStudentAlloc, setEditingStudentAlloc] = useState<ExamRoomStudentAllocation | null>(null);
  const [manualParticipantNumber, setManualParticipantNumber] = useState('');
  const [manualSeatNumber, setManualSeatNumber] = useState('');
  const [manualSessionNumber, setManualSessionNumber] = useState(1);

  // Unique classes in students list
  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(students.map((s) => s.kelas).filter(Boolean)));
    return list.sort(sortClassNaturally);
  }, [students]);

  // Active Selected Room Object
  const activeRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null;
  }, [rooms, selectedRoomId]);

  // Overall statistics
  const roomStats = useMemo(() => {
    const totalRooms = rooms.length;
    const totalAssignedStudents = rooms.reduce((acc, r) => acc + r.students.length, 0);
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 36), 0);
    const unassignedCount = Math.max(0, students.length - totalAssignedStudents);

    return {
      totalRooms,
      totalAssignedStudents,
      totalCapacity,
      unassignedCount,
      totalStudents: students.length,
    };
  }, [rooms, students]);

  // Save rooms to AppState & Firestore
  const saveRoomsToState = async (newRooms: ExamRoom[], msgTitle: string, msgDesc: string) => {
    const curMgmt = state.examManagement || {};
    
    // Also sync examParticipantNumber and examRoom onto state.students so Cards pick it up automatically!
    const updatedStudents = [...students];
    const studentAllocMap = new Map<string, { participantNumber: string; roomCode: string; seatNumber?: string }>();
    
    newRooms.forEach((r) => {
      r.students.forEach((s) => {
        studentAllocMap.set(s.studentId, {
          participantNumber: s.participantNumber,
          roomCode: r.roomCode,
          seatNumber: s.seatNumber,
        });
      });
    });

    updatedStudents.forEach((st) => {
      const alloc = studentAllocMap.get(st.id);
      if (alloc) {
        st.examParticipantNumber = alloc.participantNumber;
        st.examRoom = `Ruang ${alloc.roomCode}`;
        st.examSeatNumber = alloc.seatNumber;
      }
    });

    await updateExamManagementState({
      ...curMgmt,
      examRooms: newRooms,
      schoolExamCode: schoolCode,
    });

    showToast(msgTitle, msgDesc, 'success');
  };

  // Open Room Modal
  const handleOpenCreateRoom = () => {
    const nextNum = rooms.length + 1;
    const code = String(nextNum).padStart(2, '0');
    setEditingRoom(null);
    setRoomCodeInput(code);
    setRoomNameInput(`Ruang ${code}`);
    setRoomCapacityInput(36);
    setPrimaryClassInput(availableClasses[0] || 'X.1');
    setSecondaryClassInput(availableClasses[1] || 'XI.IPA 1');
    setRoomNotesInput(`Ruang Campuran ${availableClasses[0] || 'X.1'} & ${availableClasses[1] || 'XI.IPA 1'}`);
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: ExamRoom) => {
    setEditingRoom(room);
    setRoomCodeInput(room.roomCode);
    setRoomNameInput(room.roomName);
    setRoomCapacityInput(room.capacity || 36);
    setPrimaryClassInput(room.primaryClass || room.assignedClasses[0] || '');
    setSecondaryClassInput(room.secondaryClass || room.assignedClasses[1] || '');
    setRoomNotesInput(room.notes || '');
    setIsRoomModalOpen(true);
  };

  // Save Room (Create or Edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.replace(/\D/g, '').padStart(2, '0') || '01';
    const cleanName = roomNameInput.trim() || `Ruang ${cleanCode}`;
    const cleanCapacity = Math.max(10, roomCapacityInput || 36);

    let updatedRooms = [...rooms];

    if (editingRoom) {
      // Edit existing
      const existingIdx = updatedRooms.findIndex((r) => r.id === editingRoom.id);
      if (existingIdx >= 0) {
        // Re-sync participant numbers if room code changed
        const reSyncedStudents = editingRoom.students.map((st) => ({
          ...st,
          participantNumber: updateParticipantRoomCode(st.participantNumber, cleanCode),
        }));

        updatedRooms[existingIdx] = {
          ...editingRoom,
          roomCode: cleanCode,
          roomName: cleanName,
          capacity: cleanCapacity,
          primaryClass: primaryClassInput,
          secondaryClass: secondaryClassInput,
          assignedClasses: [primaryClassInput, secondaryClassInput].filter(Boolean),
          students: reSyncedStudents,
          notes: roomNotesInput,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Check duplicate room code
      if (updatedRooms.some((r) => r.roomCode === cleanCode)) {
        showToast('Kode Ruang Sudah Ada', `Kode ruang ${cleanCode} telah digunakan. Gunakan nomor ruang lain.`, 'warning');
        return;
      }

      // Automatically allocate students from Primary Class and Secondary Class
      const halfCap = Math.floor(cleanCapacity / 2);
      const sortedAll = sortStudentsNaturally(students);

      // Filter unallocated students for Primary and Secondary classes
      const alreadyAllocatedIds = new Set<string>();
      updatedRooms.forEach((r) => r.students.forEach((s) => alreadyAllocatedIds.add(s.studentId)));

      const availA = sortedAll.filter((s) => s.kelas === primaryClassInput && !alreadyAllocatedIds.has(s.id)).slice(0, halfCap);
      const availB = sortedAll.filter((s) => s.kelas === secondaryClassInput && !alreadyAllocatedIds.has(s.id)).slice(0, halfCap);

      const allocations: ExamRoomStudentAllocation[] = [];
      let seatCounter = 1;
      const maxLength = Math.max(availA.length, availB.length);

      for (let i = 0; i < maxLength; i++) {
        if (availA[i]) {
          const s = availA[i];
          const globalOrder = sortedAll.findIndex((allS) => allS.id === s.id) + 1 || seatCounter;
          const pNum = generateParticipantNumber(schoolCode, currentYearCode, cleanCode, globalOrder);
          allocations.push({
            studentId: s.id,
            studentName: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            roomOrderNumber: seatCounter,
            participantNumber: pNum,
            seatNumber: `A-${String(Math.ceil(seatCounter / 2)).padStart(2, '0')}`,
            sessionNumber: 1,
          });
          seatCounter++;
        }
        if (availB[i]) {
          const s = availB[i];
          const globalOrder = sortedAll.findIndex((allS) => allS.id === s.id) + 1 || seatCounter;
          const pNum = generateParticipantNumber(schoolCode, currentYearCode, cleanCode, globalOrder);
          allocations.push({
            studentId: s.id,
            studentName: s.nama,
            nisn: s.nisn,
            kelas: s.kelas,
            roomOrderNumber: seatCounter,
            participantNumber: pNum,
            seatNumber: `B-${String(Math.ceil(seatCounter / 2)).padStart(2, '0')}`,
            sessionNumber: 1,
          });
          seatCounter++;
        }
      }

      const newRoom: ExamRoom = {
        id: `room-${cleanCode}-${Date.now()}`,
        roomCode: cleanCode,
        roomName: cleanName,
        capacity: cleanCapacity,
        primaryClass: primaryClassInput,
        secondaryClass: secondaryClassInput,
        assignedClasses: [primaryClassInput, secondaryClassInput].filter(Boolean),
        students: allocations,
        notes: roomNotesInput,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updatedRooms.push(newRoom);
      setSelectedRoomId(newRoom.id);
    }

    await saveRoomsToState(updatedRooms, 'Ruang Disimpan', `${cleanName} berhasil diperbarui.`);
    setIsRoomModalOpen(false);
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    if (!window.confirm(`Hapus ${target.roomName}? Siswa yang terdaftar akan dikembalikan ke daftar belum terbagi.`)) {
      return;
    }
    const updated = rooms.filter((r) => r.id !== roomId);
    await saveRoomsToState(updated, 'Ruang Dihapus', `${target.roomName} berhasil dihapus.`);
    if (selectedRoomId === roomId) {
      setSelectedRoomId(updated[0]?.id || '');
    }
  };

  // Smart Auto-Generator: Generate All Mixed Rooms across all classes naturally
  const handleAutoGenerateAllRooms = async () => {
    if (students.length === 0) {
      showToast('Data Siswa Kosong', 'Tidak ada data siswa untuk dialokasikan.', 'warning');
      return;
    }

    if (
      rooms.length > 0 &&
      !window.confirm(
        'Generate Ulang Semua Ruang Campuran & Nomor Peserta?\n\nSemua pembagian ruang saat ini akan disusun ulang secara cerdas dengan urutan kelas alami (X.1 s/d XII.IPS 2) dan format 12-26-XX-XXX. Lanjutkan?'
      )
    ) {
      return;
    }

    // Pair classes naturally: X.1 with XI.IPA 1, X.2 with XI.IPA 2, etc.
    const classPairs: [string, string][] = [];
    const sortedClasses = [...availableClasses];

    if (sortedClasses.length >= 2) {
      const half = Math.ceil(sortedClasses.length / 2);
      const groupA = sortedClasses.slice(0, half);
      const groupB = sortedClasses.slice(half);

      for (let i = 0; i < half; i++) {
        classPairs.push([groupA[i] || sortedClasses[0], groupB[i] || sortedClasses[1] || sortedClasses[0]]);
      }
    } else {
      classPairs.push([sortedClasses[0] || 'X.1', sortedClasses[0] || 'X.1']);
    }

    const newGenerated = generateMixedExamRooms(students, classPairs, {
      roomCapacity: 36,
      schoolCode,
      yearCode: currentYearCode,
      startRoomNumber: 1,
    });

    await saveRoomsToState(
      newGenerated,
      'Smart Generator Berhasil',
      `${newGenerated.length} Ruang Campuran dan Nomor Peserta (Format ${schoolCode}-${currentYearCode}-XX-XXX) berhasil dibuat otomatis.`
    );
    if (newGenerated.length > 0) {
      setSelectedRoomId(newGenerated[0].id);
    }
  };

  // Re-sync all participant numbers across all rooms
  const handleReSyncAllNumbers = async () => {
    if (rooms.length === 0) return;
    const sortedAll = sortStudentsNaturally(students);
    const globalOrderMap = new Map<string, number>();
    sortedAll.forEach((s, idx) => {
      globalOrderMap.set(s.id, idx + 1);
    });

    const updatedRooms = rooms.map((r) => {
      const updatedStudents = r.students.map((st) => {
        const order = globalOrderMap.get(st.studentId) || st.roomOrderNumber;
        const newNum = generateParticipantNumber(schoolCode, currentYearCode, r.roomCode, order);
        return {
          ...st,
          participantNumber: newNum,
        };
      });
      return {
        ...r,
        students: updatedStudents,
      };
    });

    await saveRoomsToState(
      updatedRooms,
      'Nomor Peserta Disinkronkan',
      'Format [KODE_SEKOLAH]-[KODE_TAHUN]-[KODE_RUANG]-[NOMOR_URUT] berhasil disinkronkan ulang.'
    );
  };

  // Remove single student from active room
  const handleRemoveStudentFromRoom = async (studentId: string) => {
    if (!activeRoom) return;
    const updatedAllocations = activeRoom.students.filter((s) => s.studentId !== studentId);
    // Re-index room order number
    const reIndexed = updatedAllocations.map((st, idx) => ({
      ...st,
      roomOrderNumber: idx + 1,
    }));

    const updatedRooms = rooms.map((r) => (r.id === activeRoom.id ? { ...r, students: reIndexed } : r));
    await saveRoomsToState(updatedRooms, 'Peserta Dihapus', 'Siswa dikeluarkan dari ruang ini.');
  };

  // Add bulk students from checklist
  const handleAddSelectedStudentsToRoom = async () => {
    if (!activeRoom || selectedStudentIdsToAdd.length === 0) return;

    const sortedAll = sortStudentsNaturally(students);
    const globalOrderMap = new Map<string, number>();
    sortedAll.forEach((s, idx) => globalOrderMap.set(s.id, idx + 1));

    const newAllocations = [...activeRoom.students];
    let nextSeatNum = newAllocations.length + 1;

    for (const sId of selectedStudentIdsToAdd) {
      const st = students.find((s) => s.id === sId);
      if (!st) continue;

      // Validation: double allocation
      const val = validateStudentRoomAssignment(rooms, st.id, activeRoom.id);
      if (val.isDuplicate) {
        showToast('Siswa Sudah Terdaftar', `${st.nama} sudah berada di ${val.conflictRoomName}.`, 'warning');
        continue;
      }

      const globalIdx = globalOrderMap.get(st.id) || nextSeatNum;
      const pNum = generateParticipantNumber(schoolCode, currentYearCode, activeRoom.roomCode, globalIdx);

      newAllocations.push({
        studentId: st.id,
        studentName: st.nama,
        nisn: st.nisn,
        kelas: st.kelas,
        roomOrderNumber: nextSeatNum,
        participantNumber: pNum,
        seatNumber: `${st.kelas === activeRoom.primaryClass ? 'A' : 'B'}-${String(Math.ceil(nextSeatNum / 2)).padStart(2, '0')}`,
        sessionNumber: 1,
      });
      nextSeatNum++;
    }

    const updatedRooms = rooms.map((r) => (r.id === activeRoom.id ? { ...r, students: newAllocations } : r));
    await saveRoomsToState(updatedRooms, 'Peserta Ditambahkan', `${selectedStudentIdsToAdd.length} siswa berhasil dimasukkan ke ${activeRoom.roomName}.`);
    setIsAddStudentModalOpen(false);
    setSelectedStudentIdsToAdd([]);
  };

  // Open Manual Edit Modal for Single Student
  const handleOpenEditStudentModal = (alloc: ExamRoomStudentAllocation) => {
    setEditingStudentAlloc(alloc);
    setManualParticipantNumber(alloc.participantNumber || '');
    setManualSeatNumber(alloc.seatNumber || '');
    setManualSessionNumber(alloc.sessionNumber || 1);
  };

  // Save Manual Edit for Single Student
  const handleSaveStudentManualAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !editingStudentAlloc) return;

    const updatedAllocations = activeRoom.students.map((st) => {
      if (st.studentId === editingStudentAlloc.studentId) {
        return {
          ...st,
          participantNumber: manualParticipantNumber.trim() || st.participantNumber,
          seatNumber: manualSeatNumber.trim() || st.seatNumber,
          sessionNumber: manualSessionNumber || 1,
        };
      }
      return st;
    });

    const updatedRooms = rooms.map((r) =>
      r.id === activeRoom.id ? { ...r, students: updatedAllocations, updatedAt: new Date().toISOString() } : r
    );

    await saveRoomsToState(
      updatedRooms,
      'Data Peserta Diperbarui',
      `Nomor Peserta ${editingStudentAlloc.studentName} berhasil diperbarui.`
    );
    setEditingStudentAlloc(null);
  };

  // Export Active Room to Excel (xlsx)
  const handleExportExcel = () => {
    if (!activeRoom || activeRoom.students.length === 0) {
      showToast('Data Kosong', 'Tidak ada siswa di ruang ini untuk diekspor.', 'warning');
      return;
    }
    const exportData = activeRoom.students.map((st) => ({
      'No. Urut': st.roomOrderNumber,
      'Nomor Peserta': st.participantNumber,
      'NISN': st.nisn || '',
      'Nama Siswa': st.studentName,
      'Kelas Asal': st.kelas,
      'Ruang Ujian': activeRoom.roomName,
      'Kode Ruang': activeRoom.roomCode,
      'Nomor Kursi': st.seatNumber || '',
      'Sesi': st.sessionNumber || 1,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Ruang_${activeRoom.roomCode}`);
    XLSX.writeFile(workbook, `Daftar_Peserta_CBT_${activeRoom.roomName.replace(/\s+/g, '_')}.xlsx`);
    showToast('Ekspor Berhasil', `Data ${activeRoom.roomName} berhasil diekspor ke Excel.`, 'success');
  };

  // 1-Click Simulation Mock Generator
  const handleSeedDemoRooms = async () => {
    const mock = generateMockExamRoomsAndProctors(students, state.teachers || []);
    await saveRoomsToState(
      mock.rooms,
      'Simulasi Berhasil Dibuat',
      `${mock.rooms.length} Ruang Campuran lengkap dengan Nomor Peserta 12-26-XX-XXX siap diuji coba.`
    );
    if (mock.rooms.length > 0) setSelectedRoomId(mock.rooms[0].id);
  };

  // Filtered students for active room table
  const filteredRoomStudents = useMemo(() => {
    if (!activeRoom) return [];
    return activeRoom.students.filter((st) => {
      const matchSearch =
        (st.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.nisn || '').includes(searchQuery) ||
        (st.participantNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.kelas || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchClass = true;
      if (filterClass === 'CLASS_A') matchClass = st.kelas === activeRoom.primaryClass;
      if (filterClass === 'CLASS_B') matchClass = st.kelas === activeRoom.secondaryClass;

      return matchSearch && matchClass;
    });
  }, [activeRoom, searchQuery, filterClass]);

  // Candidates for manual addition modal
  const candidatesToAdd = useMemo(() => {
    if (!selectedClassToAdd) return [];
    const alreadyAllocated = new Set<string>();
    rooms.forEach((r) => r.students.forEach((s) => alreadyAllocated.add(s.studentId)));

    return students.filter((s) => s.kelas === selectedClassToAdd && !alreadyAllocated.has(s.id));
  }, [students, selectedClassToAdd, rooms]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Metric Counters */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>MANAJEMEN RUANG UJIAN CAMPURAN &bull; SMART NO. PESERTA</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ruang Ujian Campuran Multi-Kelas</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                Format {schoolCode}-{currentYearCode}-XX-XXX
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
              Mendukung konfigurasi 1 Ruang Ujian berisi gabungan 2 kelas berbeda (misal X.1 &amp; XI.IPA 1) untuk menjaga integritas asesmen, lengkap dengan Smart Auto-Generator Nomor Peserta berurutan alami dan sinkronisasi otomatis ke Kartu Peserta Ujian.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoGenerateAllRooms}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Generator Ruang &amp; Nomor</span>
            </button>

            <button
              type="button"
              onClick={handleReSyncAllNumbers}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 active:scale-95"
              title="Sinkronkan kode ruang pada nomor peserta"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
              <span>Re-sync Nomor</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-200 active:scale-95"
              title="Ekspor daftar peserta ruang aktif ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSeedDemoRooms}
              className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200 active:scale-95"
              title="Generate simulasi ruang campuran dan nomor peserta instan"
            >
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Data Simulasi</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateRoom}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ruang Baru</span>
            </button>

            {onNavigateToCards && (
              <button
                type="button"
                onClick={onNavigateToCards}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md shadow-slate-900/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Lihat Kartu Ujian</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Ruang Ujian</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{roomStats.totalRooms}</span>
              <span className="text-xs text-slate-500 font-bold">Ruang Terdaftar</span>
            </div>
            <p className="text-[10px] text-slate-400">Kapasitas {roomStats.totalCapacity} Kursi</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-700 block">Siswa Teralokasi</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono">{roomStats.totalAssignedStudents}</span>
              <span className="text-xs text-indigo-700 font-bold">/ {roomStats.totalStudents} Siswa</span>
            </div>
            <p className="text-[10px] text-indigo-600 font-semibold truncate">
              {roomStats.totalStudents > 0 ? `${Math.round((roomStats.totalAssignedStudents / roomStats.totalStudents) * 100)}% Terbagi ke Ruangan` : '0%'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Format Nomor Peserta</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-900 font-mono">12-{currentYearCode}-XX-XXX</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold truncate">
              Urutan Alami Kelas &bull; A-Z Nama
            </p>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            roomStats.unassignedCount > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[10px] uppercase font-bold block ${
              roomStats.unassignedCount > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}>
              Belum Masuk Ruang
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${
                roomStats.unassignedCount > 0 ? 'text-amber-900' : 'text-slate-700'
              }`}>
                {roomStats.unassignedCount}
              </span>
              <span className="text-xs text-slate-500 font-bold">Siswa</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {roomStats.unassignedCount > 0 ? 'Perlu penambahan ruang baru' : 'Semua siswa telah teralokasi'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left (Room List) & Right (Room Details & Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Room Pills & Selectors (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
              <DoorClosed className="w-4 h-4 text-indigo-600" />
              <span>Daftar Ruang ({rooms.length})</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">Pilih untuk Kelola</span>
          </div>

          {rooms.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <DoorClosed className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">Belum ada Ruang Ujian</p>
              <p className="text-[11px] text-slate-400">Klik Smart Generator untuk membuat ruang campuran otomatis.</p>
              <button
                type="button"
                onClick={handleAutoGenerateAllRooms}
                className="px-3.5 py-2 rounded-xl bg-orange-600 text-white font-black text-xs cursor-pointer shadow-sm"
              >
                Generate Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {rooms.map((r) => {
                const isSelected = r.id === selectedRoomId;
                const isFull = r.students.length >= (r.capacity || 36);

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-500 shadow-sm ring-2 ring-indigo-400/30'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-indigo-950">
                          {r.roomName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-600">
                          Kode: {r.roomCode}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${
                        isFull ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {r.students.length}/{r.capacity || 36}
                      </span>
                    </div>

                    {/* Classes badge */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100/90 text-indigo-900 font-bold border border-indigo-200">
                        {r.primaryClass || 'Kelas 1'}
                      </span>
                      <span className="text-slate-400 font-black">+</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100/90 text-purple-900 font-bold border border-purple-200">
                        {r.secondaryClass || 'Kelas 2'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Room Student Details & Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeRoom ? (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              {/* Active Room Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      {activeRoom.roomName}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Kode: {activeRoom.roomCode}
                    </span>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      Kapasitas: {activeRoom.students.length}/{activeRoom.capacity || 36} Kursi
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                    <span>Campuran 2 Rombel:</span>
                    <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {activeRoom.primaryClass || '-'}
                    </strong>
                    <span>&amp;</span>
                    <strong className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      {activeRoom.secondaryClass || '-'}
                    </strong>
                    {activeRoom.notes && <span>&bull; {activeRoom.notes}</span>}
                  </p>
                </div>

                {/* Edit & Add Student Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditRoom(activeRoom)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer text-xs font-bold flex items-center gap-1.5 border border-slate-200"
                    title="Ubah Konfigurasi Ruang"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit Ruang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassToAdd(activeRoom.primaryClass || availableClasses[0] || '');
                      setSelectedStudentIdsToAdd([]);
                      setIsAddStudentModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRoom(activeRoom.id)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer border border-rose-200"
                    title="Hapus Ruangan Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar within Active Room */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 font-bold mr-1">Tampilkan:</span>
                  <button
                    type="button"
                    onClick={() => setFilterClass('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
                      filterClass === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({activeRoom.students.length})
                  </button>
                  {activeRoom.primaryClass && (
                    <button
                      type="button"
                      onClick={() => setFilterClass('CLASS_A')}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
                        filterClass === 'CLASS_A' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {activeRoom.primaryClass} ({activeRoom.students.filter((s) => s.kelas === activeRoom.primaryClass).length})
                    </button>
                  )}
                  {activeRoom.secondaryClass && (
                    <button
                      type="button"
                      onClick={() => setFilterClass('CLASS_B')}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
                        filterClass === 'CLASS_B' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      {activeRoom.secondaryClass} ({activeRoom.students.filter((s) => s.kelas === activeRoom.secondaryClass).length})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari siswa atau No Peserta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Participants Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">No.</th>
                      <th className="py-3 px-3">Nomor Peserta Ujian</th>
                      <th className="py-3 px-3">NISN</th>
                      <th className="py-3 px-3">Nama Lengkap Siswa</th>
                      <th className="py-3 px-3">Kelas Asal</th>
                      <th className="py-3 px-3 text-center">Kursi / Sesi</th>
                      <th className="py-3 px-3 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredRoomStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                          Tidak ada peserta di ruang ini sesuai filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredRoomStudents.map((st) => {
                        const isPrimary = st.kelas === activeRoom.primaryClass;

                        return (
                          <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                              {st.roomOrderNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-black text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {st.participantNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {st.nisn || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900 truncate max-w-[200px]" title={st.studentName}>
                              {st.studentName}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                isPrimary
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              }`}>
                                {st.kelas}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {st.seatNumber || `K-${st.roomOrderNumber}`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStudentModal(st)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                                  title="Edit Nomor Peserta &amp; Kursi (Input Manual)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudentFromRoom(st.studentId)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="Keluarkan dari Ruangan Ini"
                                >
                                  <X className="w-3.5 h-3.5" />
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
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <DoorClosed className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">Pilih Ruang Ujian</h4>
              <p className="text-xs text-slate-400">Pilih ruang pada panel kiri atau buat ruang baru untuk mulai mengelola.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create or Edit Room */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <div
            onClick={() => setIsRoomModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 cursor-default space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {editingRoom ? `Edit ${editingRoom.roomName}` : 'Tambah Ruang Ujian Campuran'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Konfigurasi 2 kelas per ruang ujian</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kode Ruang (2 Digit):</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="01"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 01, 02, dst.</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nama Ruang:</label>
                    <input
                      type="text"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      placeholder="Ruang 01"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kelas Asal 1 (Primary):</label>
                    <select
                      value={primaryClassInput}
                      onChange={(e) => setPrimaryClassInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Pilih Kelas 1</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kelas Asal 2 (Secondary):</label>
                    <select
                      value={secondaryClassInput}
                      onChange={(e) => setSecondaryClassInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Pilih Kelas 2 (Campuran)</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kapasitas Kursi:</label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={roomCapacityInput}
                      onChange={(e) => setRoomCapacityInput(parseInt(e.target.value) || 36)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Standar: 36 Kursi (18 per kelas)</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Catatan Ruang:</label>
                    <input
                      type="text"
                      value={roomNotesInput}
                      onChange={(e) => setRoomNotesInput(e.target.value)}
                      placeholder="Gedung A Lantai 2"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRoomModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Ruang Ujian</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add Students to Active Room from Checklist */}
      <AnimatePresence>
        {isAddStudentModalOpen && activeRoom && (
          <div
            onClick={() => setIsAddStudentModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 text-slate-800 cursor-default space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Tambah Peserta ke {activeRoom.roomName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih siswa yang belum terbagi untuk dimasukkan ke ruangan ini
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Class Selector for Candidates */}
              <div className="flex items-center gap-3 text-xs">
                <span className="font-bold text-slate-700 shrink-0">Pilih Kelas:</span>
                <select
                  value={selectedClassToAdd}
                  onChange={(e) => setSelectedClassToAdd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidates List with Checklist */}
              <div className="border border-slate-200 rounded-2xl max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                {candidatesToAdd.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold">
                    Tidak ada siswa yang tersedia di kelas {selectedClassToAdd} (semua sudah masuk ruangan).
                  </div>
                ) : (
                  candidatesToAdd.map((s) => {
                    const isChecked = selectedStudentIdsToAdd.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIdsToAdd((prev) => [...prev, s.id]);
                              } else {
                                setSelectedStudentIdsToAdd((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <strong className="text-slate-900 block font-bold">{s.nama}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {s.kelas}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIdsToAdd(candidatesToAdd.map((s) => s.id))}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    Pilih Semua ({candidatesToAdd.length})
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIdsToAdd([])}
                    className="text-slate-500 hover:underline"
                  >
                    Batal Pilih
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    disabled={selectedStudentIdsToAdd.length === 0}
                    onClick={handleAddSelectedStudentsToRoom}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tambahkan ({selectedStudentIdsToAdd.length}) Siswa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Manual Edit Individual Student Allocation (Fitur 2: Input Manual) */}
        {editingStudentAlloc && (
          <div
            onClick={() => setEditingStudentAlloc(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 cursor-default space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      Edit Data Peserta Ujian (Manual)
                    </h3>
                    <p className="text-[11px] text-slate-500">{editingStudentAlloc.studentName} &bull; {editingStudentAlloc.kelas}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudentAlloc(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStudentManualAlloc} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nomor Peserta Ujian:
                  </label>
                  <input
                    type="text"
                    required
                    value={manualParticipantNumber}
                    onChange={(e) => setManualParticipantNumber(e.target.value.toUpperCase())}
                    placeholder="Contoh: 12-26-01-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Format baku: [KODE_SEKOLAH]-[KODE_TAHUN]-[KODE_RUANG]-[NOMOR_URUT]
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Nomor Kursi:
                    </label>
                    <input
                      type="text"
                      value={manualSeatNumber}
                      onChange={(e) => setManualSeatNumber(e.target.value.toUpperCase())}
                      placeholder="Contoh: A-01"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Sesi Ujian:
                    </label>
                    <select
                      value={manualSessionNumber}
                      onChange={(e) => setManualSessionNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>Sesi 1 (Pagi)</option>
                      <option value={2}>Sesi 2 (Siang)</option>
                      <option value={3}>Sesi 3 (Sore)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudentAlloc(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

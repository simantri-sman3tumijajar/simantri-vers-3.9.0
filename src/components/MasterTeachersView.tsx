import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher, TeacherExamAssignment, TeacherRole } from '../types';
import { PaginationControls } from './PaginationControls';
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Shield,
  User,
  Key,
  Camera,
  Layers,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  BookOpen,
  Users,
  Laptop,
  Sliders,
  ShieldAlert,
  KeyRound,
  Award,
  Check,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { downloadTeacherTemplateExcel } from '../utils/excelExport';
import { formatMataPelajaran } from '../utils/subjectNormalization';
import { normalizeTeacherSubjectList } from '../utils/subjectNormalization';
import { compressImageBase64 } from '../utils/imageCompressor';
import { resolveTeacherRealtimeActivity } from '../utils/teacherActivityHelper';

export const MasterTeachersView: React.FC = () => {
  const {
    state,
    currentUser,
    currentView,
    setCurrentView,
    selectedModule,
    setSelectedModule,
    saveTeacher,
    saveTeachersBatch,
    deleteTeacher,
    deleteTeachersBatch,
    toggleTeacherOnlineStatus,
    setTeachersStatusBatch,
    saveTeacherExamAssignment,
    deleteTeacherExamAssignment,
    updateSchoolInfo,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // CBT Exam Assignment Modal State
  const [cbtAssignTargetTeacher, setCbtAssignTargetTeacher] = useState<Teacher | null>(null);
  const [cbtCategory, setCbtCategory] = useState<TeacherExamAssignment['category']>('ASAS');
  const [cbtSubject, setCbtSubject] = useState<string>('');
  const [cbtClasses, setCbtClasses] = useState<string[]>([]);
  const [cbtTargetQuestions, setCbtTargetQuestions] = useState<number>(40);
  const [cbtDueDate, setCbtDueDate] = useState<string>('');
  const [cbtNotes, setCbtNotes] = useState<string>('');

  // Status Filter & Checklist Selection State (Upgrade: support multi-role filter)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'online' | 'offline' | 'mapel' | 'bk' | 'admin_op' | 'wali' | 'litnum' | 'kesiswaan' | 'proctor' | 'proctor_role'>('ALL');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());

  // Excel Import State
  const [previewTeachers, setPreviewTeachers] = useState<Teacher[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Mode Edit Tabel Sekaligus (Batch Inline Edit)
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  const [batchEditedTeachersMap, setBatchEditedTeachersMap] = useState<Record<string, Teacher>>({});

  const handleToggleBatchEditMode = () => {
    if (!isBatchEditMode) {
      const map: Record<string, Teacher> = {};
      filteredTeachers.forEach((t) => {
        map[t.id] = { ...t };
      });
      setBatchEditedTeachersMap(map);
      setIsBatchEditMode(true);
    } else {
      setIsBatchEditMode(false);
      setBatchEditedTeachersMap({});
    }
  };

  const handleUpdateBatchTeacherField = (id: string, field: keyof Teacher, value: any) => {
    setBatchEditedTeachersMap((prev) => {
      const existing = prev[id] || state.teachers.find((t) => t.id === id);
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleUpdateBatchTeacherRoleCheckbox = (
    id: string,
    roleField: 'isGuruMapel' | 'isGuruBK' | 'isAdmin' | 'isOperator' | 'isKepalaSekolah' | 'isWaliKelas' | 'isKoordinatorLitnum' | 'isTimKesiswaan' | 'isProctor' | 'supervisorAccess',
    checked: boolean
  ) => {
    setBatchEditedTeachersMap((prev) => {
      const existing = prev[id] || state.teachers.find((t) => t.id === id);
      if (!existing) return prev;

      const updated: Teacher = {
        ...existing,
        [roleField]: checked,
      };

      if (roleField === 'isProctor' && checked) {
        updated.isProctorEnabled = true;
        updated.supervisorAccess = true;
      }
      if (roleField === 'supervisorAccess') {
        updated.isProctorEnabled = checked;
      }

      // Resolve primary role
      let primaryRole: 'admin' | 'operator' | 'kepala_sekolah' | 'guru' = 'guru';
      if (updated.isAdmin) primaryRole = 'admin';
      else if (updated.isOperator) primaryRole = 'operator';
      else if (updated.isKepalaSekolah) primaryRole = 'kepala_sekolah';
      else primaryRole = 'guru';
      updated.role = primaryRole;

      // Build roles array
      const assignedRoles: TeacherRole[] = [];
      if (updated.isGuruMapel) assignedRoles.push('guru');
      if (updated.isGuruBK) assignedRoles.push('bk');
      if (updated.isAdmin) assignedRoles.push('admin');
      if (updated.isOperator) assignedRoles.push('operator');
      if (updated.isKepalaSekolah) assignedRoles.push('kepala_sekolah');
      if (updated.isWaliKelas) assignedRoles.push('wali_kelas');
      if (updated.isTimKesiswaan) assignedRoles.push('kesiswaan');
      if (updated.isProctor) assignedRoles.push('proctor');
      updated.roles = assignedRoles;

      if (roleField === 'isGuruBK') {
        const curMapel = Array.isArray(updated.mataPelajaran) ? updated.mataPelajaran : [];
        if (checked) {
          if (!curMapel.some((m) => m.toLowerCase().includes('bimbingan') || m.toLowerCase() === 'bk')) {
            updated.mataPelajaran = [...curMapel, 'Bimbingan Konseling (BK)'];
          }
        } else {
          updated.mataPelajaran = curMapel.filter(
            (m) => !m.toLowerCase().includes('bimbingan') && m.toLowerCase() !== 'bk'
          );
        }
      }

      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const handleSaveAllBatchTeachers = async () => {
    const listToSave = Object.values(batchEditedTeachersMap).map((t) => {
      let primaryRole: 'admin' | 'operator' | 'kepala_sekolah' | 'guru' = 'guru';
      if (t.isAdmin) primaryRole = 'admin';
      else if (t.isOperator) primaryRole = 'operator';
      else if (t.isKepalaSekolah) primaryRole = 'kepala_sekolah';
      else primaryRole = 'guru';

      const assignedRoles: TeacherRole[] = [];
      if (t.isGuruMapel) assignedRoles.push('guru');
      if (t.isGuruBK) assignedRoles.push('bk');
      if (t.isAdmin) assignedRoles.push('admin');
      if (t.isOperator) assignedRoles.push('operator');
      if (t.isKepalaSekolah) assignedRoles.push('kepala_sekolah');
      if (t.isWaliKelas) assignedRoles.push('wali_kelas');
      if (t.isTimKesiswaan) assignedRoles.push('kesiswaan');
      if (t.isProctor) assignedRoles.push('proctor');

      return {
        ...t,
        role: primaryRole,
        roles: assignedRoles.length > 0 ? assignedRoles : [primaryRole],
      };
    });

    if (listToSave.length === 0) return;

    await saveTeachersBatch(listToSave);
    setIsBatchEditMode(false);
    setBatchEditedTeachersMap({});
    showToast('Simpan Sekaligus Berhasil', `Berhasil memperbarui dan menyimpan ${listToSave.length} data akun guru secara bersamaan.`, 'success');
  };

  if (!state) return null;

  // Compute duplicate/overwrite count from preview list
  const duplicateCount = previewTeachers.filter((pt) => 
    state.teachers.some((et) => et.id === pt.id)
  ).length;

  const rawSubjectNames = state.subjects.map((s) => s.nama);
  const subjectsList = Array.from(new Set([...rawSubjectNames, 'Bimbingan Konseling (BK)']));

  const isTeacherOnline = (t: Teacher) => {
    // If explicitly marked offline, immediately return false with ZERO delay
    if (t.status === 'offline') return false;
    // If current active session belongs to this teacher and user is logged in
    if (currentUser && currentUser.id === t.id) return true;
    // Otherwise strictly verify online status
    return t.status === 'online';
  };

  const totalCount = state.teachers.length;
  const onlineCount = state.teachers.filter(isTeacherOnline).length;
  const offlineCount = state.teachers.filter((t) => !isTeacherOnline(t)).length;
  const mapelCount = state.teachers.filter(
    (t) =>
      t.isGuruMapel ??
      (t.role === 'guru' ||
        (t.mataPelajaran && t.mataPelajaran.some((m) => !m.toLowerCase().includes('bimbingan'))))
  ).length;
  const bkCount = state.teachers.filter(
    (t) =>
      t.isGuruBK ||
      t.mataPelajaran?.some(
        (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
      )
  ).length;
  const adminOpCount = state.teachers.filter(
    (t) => t.isAdmin || t.isOperator || t.role === 'admin' || t.role === 'operator'
  ).length;
  const waliCount = state.teachers.filter((t) => t.isWaliKelas).length;
  const litnumCount = state.teachers.filter((t) => t.isKoordinatorLitnum).length;
  const kesiswaanCount = state.teachers.filter((t) => t.isTimKesiswaan).length;
  const proctorSupervisorCount = state.teachers.filter((t) => t.supervisorAccess || t.isProctorEnabled).length;
  const proctorRoleCount = state.teachers.filter((t) => t.isProctor || t.roles?.includes('proctor')).length;

  const filteredTeachers = state.teachers.filter((t) => {
    const matchesSearch =
      t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.nip && t.nip.includes(searchQuery));
    const isBK = Boolean(
      t.isGuruBK ||
      t.mataPelajaran?.some(
        (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
      )
    );
    const isMapel = Boolean(
      t.isGuruMapel ??
      (t.role === 'guru' ||
        (t.mataPelajaran && t.mataPelajaran.some((m) => !m.toLowerCase().includes('bimbingan'))))
    );
    const isAdminOp = Boolean(t.isAdmin || t.isOperator || t.role === 'admin' || t.role === 'operator');
    const isWali = Boolean(t.isWaliKelas);
    const isKesiswaan = Boolean(t.isTimKesiswaan);
    const isProctorUser = Boolean(t.isProctor || t.roles?.includes('proctor'));
    const isSupervisorUser = Boolean(t.supervisorAccess || t.isProctorEnabled);

    let matchesStatus = true;
    if (statusFilter === 'online') matchesStatus = isTeacherOnline(t);
    else if (statusFilter === 'offline') matchesStatus = !isTeacherOnline(t);
    else if (statusFilter === 'mapel') matchesStatus = isMapel;
    else if (statusFilter === 'bk') matchesStatus = isBK;
    else if (statusFilter === 'admin_op') matchesStatus = isAdminOp;
    else if (statusFilter === 'wali') matchesStatus = isWali;
    else if (statusFilter === 'litnum') matchesStatus = Boolean(t.isKoordinatorLitnum);
    else if (statusFilter === 'kesiswaan') matchesStatus = isKesiswaan;
    else if (statusFilter === 'proctor_role') matchesStatus = isProctorUser;
    else if (statusFilter === 'proctor') matchesStatus = isSupervisorUser;

    return matchesSearch && matchesStatus;
  });

  // Table Pagination State
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(25);

  useEffect(() => {
    setTeacherPage(1);
  }, [searchQuery, statusFilter]);

  const totalTeacherPages = Math.ceil(filteredTeachers.length / teacherPageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherPageSize;
    return filteredTeachers.slice(start, start + teacherPageSize);
  }, [filteredTeachers, teacherPage, teacherPageSize]);

  // Checklist Selection Handlers
  const isAllSelected =
    filteredTeachers.length > 0 &&
    filteredTeachers.every((t) => selectedTeacherIds.has(t.id));

  const isIndeterminate =
    filteredTeachers.some((t) => selectedTeacherIds.has(t.id)) && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTeacherIds(new Set());
    } else {
      setSelectedTeacherIds(new Set(filteredTeachers.map((t) => t.id)));
    }
  };

  const handleToggleSelectOne = (teacherId: string) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  const handleBatchSetStatus = async (targetStatus: 'online' | 'offline') => {
    const ids = Array.from(selectedTeacherIds);
    if (ids.length === 0) return;
    await setTeachersStatusBatch(ids, targetStatus);
    showToast(
      'Status Guru Diperbarui',
      `${ids.length} akun guru berhasil diubah statusnya menjadi ${targetStatus === 'online' ? 'Online (Aktif)' : 'Offline'}.`,
      'success'
    );
  };

  
  const isGlobalProctorActive = Boolean(state?.schoolInfo?.globalProctorMode);

  const handleToggleGlobalProctorMode = async () => {
    const nextMode = !Boolean(state.schoolInfo?.globalProctorMode);
    await updateSchoolInfo({ globalProctorMode: nextMode });
    showToast(
      nextMode ? 'Mode Pengawas Ujian Diaktifkan' : 'Mode Pengawas Ujian Dinonaktifkan',
      nextMode
        ? 'Fitur Pengawas Ujian CBT (Mode Ujian Umum) berhasil diaktifkan. Seluruh Guru/GTK dengan izin pengawas kini dapat mengakses Portal Pengawas saat login.'
        : 'Seluruh akses fitur Pengawas Ujian bagi akun Guru/GTK dinonaktifkan secara serentak. Data jadwal mengawas tetap tersimpan aman.',
      nextMode ? 'success' : 'info'
    );
  };

  const handleToggleTeacherProctorAccess = async (teacher: Teacher) => {
    const nextVal = !Boolean(teacher.supervisorAccess ?? teacher.isProctorEnabled);
    const updated: Teacher = {
      ...teacher,
      isProctorEnabled: nextVal,
      supervisorAccess: nextVal,
    };
    await saveTeacher(updated);
    showToast(
      nextVal ? 'Izin Pengawas Aktif' : 'Izin Pengawas Nonaktif',
      `Izin Pengawas Ujian CBT untuk ${teacher.nama} kini ${nextVal ? 'Aktif (Tombol Portal Pengawas akan tampil)' : 'Nonaktif (Akses terkunci)'}.`,
      nextVal ? 'success' : 'info'
    );
  };

  const handleToggleProctorRole = async (teacher: Teacher) => {
    const isCurrentlyProctor = Boolean(teacher.isProctor || teacher.roles?.includes('proctor'));
    const nextProctor = !isCurrentlyProctor;
    const currentRoles: TeacherRole[] = Array.isArray(teacher.roles) ? [...teacher.roles] : [];
    let updatedRoles: TeacherRole[] = currentRoles.filter((r) => r !== 'proctor');
    if (nextProctor) {
      updatedRoles.push('proctor');
    }

    const updatedTeacher: Teacher = {
      ...teacher,
      isProctor: nextProctor,
      roles: updatedRoles,
      ...(nextProctor ? { isProctorEnabled: true, supervisorAccess: true } : {}),
    };

    await saveTeacher(updatedTeacher);

    showToast(
      nextProctor ? 'Mode Proktor CBT Diaktifkan' : 'Mode Proktor CBT Dinonaktifkan',
      nextProctor
        ? `${teacher.nama} resmi ditugaskan sebagai Proktor Ujian CBT. Memiliki kewenangan operasional sesi CBT, token harian, saklar pengawas, live control, & BAP.`
        : `Peran Proktor Ujian CBT untuk ${teacher.nama} telah dinonaktifkan.`,
      nextProctor ? 'success' : 'info'
    );
  };

  const handleBulkToggleProctorAccess = async (targetEnabled: boolean) => {
    if (selectedTeacherIds.size === 0) return;
    const ids = Array.from(selectedTeacherIds);
    const updatedTeachers: Teacher[] = [];
    for (const id of ids) {
      const t = state.teachers.find((tch) => tch.id === id);
      if (t) {
        updatedTeachers.push({
          ...t,
          isProctorEnabled: targetEnabled,
        });
      }
    }
    if (updatedTeachers.length > 0) {
      await saveTeachersBatch(updatedTeachers);
      showToast(
        targetEnabled ? 'Akses Pengawas Diaktifkan' : 'Akses Pengawas Dinonaktifkan',
        `${updatedTeachers.length} akun guru berhasil ${targetEnabled ? 'diaktifkan' : 'dinonaktifkan'} akses pengawas ujiannya secara serentak.`,
        targetEnabled ? 'success' : 'info'
      );
    }
  };

  const handleSingleToggleStatus = async (teacher: Teacher) => {
    const nextStatus = await toggleTeacherOnlineStatus(teacher.id);
    showToast(
      'Status Guru Diperbarui',
      `Status ${teacher.nama} kini ${nextStatus === 'online' ? 'Online (Aktif)' : 'Offline'}.`,
      nextStatus === 'online' ? 'success' : 'info'
    );
  };

  const handleAddNew = () => {
    setEditingTeacher({
      id: '',
      username: '',
      password: '',
      nama: '',
      nip: '',
      mataPelajaran: subjectsList.length > 0 ? [subjectsList[0]] : ['Bahasa Indonesia'],
      role: 'guru',
      roles: ['guru'],
      status: 'offline',
      isGuruMapel: true,
      isGuruBK: false,
      isTimKesiswaan: false,
      isAdmin: false,
      isOperator: false,
      isKepalaSekolah: false,
      isWaliKelas: false,
      isProctor: false,
      supervisorAccess: false,
      isProctorEnabled: false,
      waliKelasName: '',
      fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
    setIsModalOpen(true);
  };

  const handleQuickToggleBK = async (teacher: Teacher) => {
    const isCurrentlyBK = Boolean(
      teacher.isGuruBK ||
      teacher.mataPelajaran?.some(
        (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
      )
    );
    const nextBK = !isCurrentlyBK;
    const currentMapel = teacher.mataPelajaran || [];
    let updatedMapel = [...currentMapel];

    if (nextBK) {
      if (!updatedMapel.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')) {
        updatedMapel.push('Bimbingan Konseling (BK)');
      }
    } else {
      updatedMapel = updatedMapel.filter(
        (m) => !m.toLowerCase().includes('bimbingan konseling') && m.toLowerCase() !== 'bk'
      );
    }

    const updatedTeacher: Teacher = {
      ...teacher,
      isGuruBK: nextBK,
      mataPelajaran: updatedMapel,
    };

    await saveTeacher(updatedTeacher);

    if (nextBK) {
      showToast(
        'Penugasan Guru BK Hebat Berhasil',
        `${teacher.nama} resmi ditugaskan sebagai Guru Bimbingan Konseling (BK). Seluruh modul 7 Jurus BK Kemendikdasmen RI otomatis aktif untuk akun ini.`,
        'success'
      );
    } else {
      showToast(
        'Penugasan BK Dinonaktifkan',
        `Penugasan Guru BK untuk ${teacher.nama} telah dinonaktifkan.`,
        'info'
      );
    }
  };

  const handleQuickToggleKesiswaan = async (teacher: Teacher) => {
    const isCurrentlyKesiswaan = Boolean(
      teacher.isTimKesiswaan || teacher.roles?.includes('kesiswaan')
    );
    const nextKesiswaan = !isCurrentlyKesiswaan;
    const currentRoles: TeacherRole[] = Array.isArray(teacher.roles) ? [...teacher.roles] : [];
    let updatedRoles: TeacherRole[] = currentRoles.filter((r) => r !== 'kesiswaan');
    if (nextKesiswaan) {
      updatedRoles.push('kesiswaan');
    }

    const updatedTeacher: Teacher = {
      ...teacher,
      isTimKesiswaan: nextKesiswaan,
      roles: updatedRoles,
    };

    await saveTeacher(updatedTeacher);

    if (nextKesiswaan) {
      showToast(
        'Penugasan Tim Kesiswaan Berhasil',
        `${teacher.nama} resmi ditugaskan sebagai Tim Kesiswaan & Guru Piket. Modul Presensi Siswa otomatis aktif untuk akun ini.`,
        'success'
      );
    } else {
      showToast(
        'Penugasan Kesiswaan Dinonaktifkan',
        `Penugasan Tim Kesiswaan untuk ${teacher.nama} telah dinonaktifkan.`,
        'info'
      );
    }
  };

  const handleEdit = (teacher: Teacher) => {
    const isBK = Boolean(
      teacher.isGuruBK ||
      teacher.mataPelajaran?.some(
        (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
      )
    );
    const isMapel =
      teacher.isGuruMapel ??
      (teacher.role === 'guru' ||
        (teacher.mataPelajaran &&
          teacher.mataPelajaran.some((m) => !m.toLowerCase().includes('bimbingan'))) ||
        !isBK);
    const isAdminRole = teacher.isAdmin ?? (teacher.role === 'admin');
    const isOpRole = teacher.isOperator ?? (teacher.role === 'operator');
    const isKepsekRole = teacher.isKepalaSekolah ?? (teacher.role === 'kepala_sekolah');
    const isWali = Boolean(teacher.isWaliKelas);
    const isKesiswaan = Boolean(teacher.isTimKesiswaan || teacher.roles?.includes('kesiswaan'));
    const isProctorRole = Boolean(teacher.isProctor || teacher.roles?.includes('proctor'));
    const isSupervisor = Boolean(teacher.supervisorAccess ?? teacher.isProctorEnabled);

    setEditingTeacher({
      ...teacher,
      isGuruMapel: isMapel,
      isGuruBK: isBK,
      isTimKesiswaan: isKesiswaan,
      isAdmin: isAdminRole,
      isOperator: isOpRole,
      isKepalaSekolah: isKepsekRole,
      isWaliKelas: isWali,
      isKoordinatorLitnum: Boolean(teacher.isKoordinatorLitnum),
      isProctor: isProctorRole,
      supervisorAccess: isSupervisor,
      isProctorEnabled: isSupervisor,
      waliKelasName: teacher.waliKelasName || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    // Build roles array from checkboxes
    const assignedRoles: TeacherRole[] = [];
    if (editingTeacher.isGuruMapel) assignedRoles.push('guru');
    if (editingTeacher.isGuruBK) assignedRoles.push('bk');
    if (editingTeacher.isAdmin) assignedRoles.push('admin');
    if (editingTeacher.isOperator) assignedRoles.push('operator');
    if (editingTeacher.isKepalaSekolah) assignedRoles.push('kepala_sekolah');
    if (editingTeacher.isWaliKelas) assignedRoles.push('wali_kelas');
    if (editingTeacher.isTimKesiswaan) assignedRoles.push('kesiswaan');
    if (editingTeacher.isProctor) assignedRoles.push('proctor');

    // Default to Guru Mapel if none selected
    const effectiveRoles = assignedRoles.length > 0 ? assignedRoles : (['guru'] as TeacherRole[]);
    const isMapelEffective = Boolean(editingTeacher.isGuruMapel || assignedRoles.length === 0);

    let primaryRole: TeacherRole = 'guru';
    if (editingTeacher.isAdmin) primaryRole = 'admin';
    else if (editingTeacher.isOperator) primaryRole = 'operator';
    else if (editingTeacher.isKepalaSekolah) primaryRole = 'kepala_sekolah';
    else if (editingTeacher.isTimKesiswaan && !editingTeacher.isGuruMapel) primaryRole = 'kesiswaan';
    else primaryRole = 'guru';

    let currentMapel = [...(editingTeacher.mataPelajaran || [])];
    if (editingTeacher.isGuruBK) {
      if (!currentMapel.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')) {
        currentMapel.push('Bimbingan Konseling (BK)');
      }
    } else {
      currentMapel = currentMapel.filter(
        (m) => !m.toLowerCase().includes('bimbingan konseling') && m.toLowerCase() !== 'bk'
      );
    }

    const supervisorStatus = Boolean(editingTeacher.supervisorAccess ?? editingTeacher.isProctorEnabled);

    const teacherToSave: Teacher = {
      ...editingTeacher,
      role: primaryRole,
      roles: Array.from(new Set(effectiveRoles)),
      mataPelajaran: currentMapel,
      isGuruMapel: isMapelEffective,
      isGuruBK: Boolean(editingTeacher.isGuruBK),
      isTimKesiswaan: Boolean(editingTeacher.isTimKesiswaan),
      isAdmin: Boolean(editingTeacher.isAdmin),
      isOperator: Boolean(editingTeacher.isOperator),
      isKepalaSekolah: Boolean(editingTeacher.isKepalaSekolah),
      isWaliKelas: Boolean(editingTeacher.isWaliKelas),
      isKoordinatorLitnum: Boolean(editingTeacher.isKoordinatorLitnum),
      isProctor: Boolean(editingTeacher.isProctor),
      supervisorAccess: supervisorStatus,
      isProctorEnabled: supervisorStatus,
      waliKelasName: editingTeacher.isWaliKelas ? (editingTeacher.waliKelasName || '') : '',
    };

    saveTeacher(teacherToSave);
    setStatusFilter('ALL');
    setSearchQuery('');
    setIsModalOpen(false);
    setEditingTeacher(null);
    setSaving(false);

    const rolesLabels = [
      ...effectiveRoles.map((r) => (r === 'guru' ? 'Guru Mapel' : r === 'bk' ? 'Guru BK' : r === 'operator' ? 'Operator' : r === 'admin' ? 'Admin' : r === 'wali_kelas' ? 'Wali Kelas' : r === 'kesiswaan' ? 'Tim Kesiswaan' : 'Kepsek')),
      ...(teacherToSave.isKoordinatorLitnum ? ['Koordinator LitNum'] : [])
    ];

    showToast(
      'Akun Guru Disimpan',
      `${teacherToSave.nama} tersimpan dengan peran: ${rolesLabels.join(', ')}.`,
      'success'
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    const target = deleteId;
    setDeleteId(null);
    await deleteTeacher(target);
  };

  const handleOpenCBTAssign = (teacher: Teacher) => {
    setCbtAssignTargetTeacher(teacher);
    const existing = state.examManagement?.teacherAssignments?.find(
      (a) =>
        a.teacherId === teacher.id ||
        (a.teacherName && a.teacherName.toLowerCase().trim() === teacher.nama.toLowerCase().trim())
    );

    if (existing) {
      setCbtCategory(existing.category);
      setCbtSubject(existing.subjectName);
      setCbtClasses(existing.targetClasses || []);
      setCbtTargetQuestions(existing.targetQuestions || 40);
      setCbtDueDate(existing.dueDate || '');
      setCbtNotes(existing.notes || '');
    } else {
      const defaultSubj = teacher.mataPelajaran?.[0] || state.subjects?.[0]?.nama || 'Matematika';
      setCbtCategory('ASAS');
      setCbtSubject(defaultSubj);
      const defaultCls = state.classes?.slice(0, 3).map((c) => c.nama) || ['X.1'];
      setCbtClasses(defaultCls);
      setCbtTargetQuestions(40);
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setCbtDueDate(d.toISOString().split('T')[0]);
      setCbtNotes('');
    }
  };

  const handleCbtCategoryChange = (val: TeacherExamAssignment['category']) => {
    setCbtCategory(val);
    if (val === "Simulasi D'SMART Lampung") {
      setCbtSubject("Simulasi D'SMART Lampung (4 Instrumen Utama)");
      setCbtTargetQuestions(50);
    } else if (cbtSubject.includes("D'SMART")) {
      const defaultSubj = cbtAssignTargetTeacher?.mataPelajaran?.[0] || state.subjects?.[0]?.nama || '';
      setCbtSubject(defaultSubj);
      setCbtTargetQuestions(40);
    }
  };

  const handleSaveCbtAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbtAssignTargetTeacher) return;
    const isDSmart = cbtCategory === "Simulasi D'SMART Lampung";
    const subj = isDSmart ? "Simulasi D'SMART Lampung (4 Instrumen Utama)" : (cbtSubject || 'Semua Mata Pelajaran');
    const existing = state.examManagement?.teacherAssignments?.find(
      (a) =>
        a.teacherId === cbtAssignTargetTeacher.id ||
        (a.teacherName && a.teacherName.toLowerCase().trim() === cbtAssignTargetTeacher.nama.toLowerCase().trim())
    );

    const assignment: TeacherExamAssignment = {
      id: existing?.id || `assign-${Date.now()}`,
      teacherId: cbtAssignTargetTeacher.id,
      teacherName: cbtAssignTargetTeacher.nama,
      subjectName: subj,
      category: cbtCategory,
      targetClasses: cbtClasses.length > 0 ? cbtClasses : ['Semua Kelas'],
      dueDate: cbtDueDate || new Date().toISOString().split('T')[0],
      targetQuestions: isDSmart ? 50 : Number(cbtTargetQuestions || 40),
      currentQuestionsCount: existing?.currentQuestionsCount || 0,
      status: existing?.status || 'Draft',
      notes: cbtNotes,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    await saveTeacherExamAssignment(assignment);
    showToast('Tugas CBT Terhubung!', `Penugasan pembuatan soal CBT untuk ${cbtAssignTargetTeacher.nama} tersambung secara real-time.`, 'success');
    setCbtAssignTargetTeacher(null);
  };

  const handleDeleteCbtAssignment = async (assignmentId: string) => {
    await deleteTeacherExamAssignment(assignmentId);
    showToast('Tugas CBT Dihapus', 'Penugasan pembuatan soal CBT telah dicabut.', 'info');
    setCbtAssignTargetTeacher(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingTeacher) {
      const compressed = await compressImageBase64(file, 320, 0.85);
      if (compressed) {
        setEditingTeacher({ ...editingTeacher, fotoUrl: compressed });
      }
    }
  };

  const toggleSubjectSelection = (subjectName: string) => {
    if (!editingTeacher) return;
    const current = editingTeacher.mataPelajaran || [];
    const isBKSubject = subjectName.toLowerCase().includes('bimbingan konseling') || subjectName.toLowerCase() === 'bk';

    if (current.includes(subjectName)) {
      const updated = current.filter((s) => s !== subjectName);
      setEditingTeacher({
        ...editingTeacher,
        mataPelajaran: updated,
        isGuruBK: isBKSubject ? false : editingTeacher.isGuruBK,
      });
    } else {
      const updated = [...current, subjectName];
      setEditingTeacher({
        ...editingTeacher,
        mataPelajaran: updated,
        isGuruBK: isBKSubject ? true : editingTeacher.isGuruBK,
      });
    }
  };

  // Excel Upload Handler for Teacher Accounts
  const handleTeacherExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawRows || rawRows.length <= 1) {
          showToast('Berkas Kosong', 'Tidak ada baris data guru yang valid dalam file Excel.', 'error');
          return;
        }

        const parsedList: Teacher[] = [];
        // Skip header row (index 0)
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || (!row[2] && !row[3] && !row[1])) continue;

          const nip = String(row[1] || '').trim();
          const nama = String(row[2] || row[1] || '').toUpperCase().trim();
          const username = String(row[3] || nama.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
          const password = String(row[4] || '123456').trim();
          const mapelRaw = String(row[5] || '').trim();
          const roleRaw = String(row[6] || 'guru').toLowerCase().trim();

          const rawList = mapelRaw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => {
              const lower = s.toLowerCase();
              return (
                s.length > 0 &&
                lower !== 'semua pelajaran' &&
                lower !== 'semua mata pelajaran' &&
                s !== '-'
              );
            });

          const mataPelajaran = normalizeTeacherSubjectList(rawList, state.subjects || []);

          const existingTeacher = state.teachers.find(
            (t) => t.nama.toUpperCase().trim() === nama ||
                   t.username.toLowerCase().trim() === username.toLowerCase() ||
                   (nip && t.nip && t.nip.trim() === nip)
          );

          if (nama) {
            parsedList.push({
              id: existingTeacher ? existingTeacher.id : `tch-imp-${Date.now()}-${i}`,
              nama,
              nip,
              username,
              password,
              mataPelajaran: mataPelajaran,
              role: roleRaw === 'admin' ? 'admin' : 'guru',
              status: existingTeacher ? existingTeacher.status : 'offline',
              fotoUrl: existingTeacher ? existingTeacher.fotoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            });
          }
        }

        if (parsedList.length > 0) {
          setPreviewTeachers(parsedList);
          setIsPreviewModalOpen(true);
        } else {
          showToast('Format Tidak Sesuai', 'Pastikan Excel memiliki kolom NIP, NAMA, USERNAME, PASSWORD.', 'error');
        }
      } catch (err: any) {
        console.error('Teacher Excel Import Error:', err);
        showToast('Gagal Membaca Excel', 'Pastikan file berformat .xlsx atau .xls standar.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleConfirmSaveTeacherBatch = async () => {
    if (previewTeachers.length === 0) return;

    if (duplicateCount > 0 && !confirmOverwrite) {
      showToast('Konfirmasi Diperlukan', 'Harap beri tanda centang pada persetujuan penimpaan data guru.', 'error');
      return;
    }

    setSaving(true);
    let successCount = 0;
    for (const tch of previewTeachers) {
      await saveTeacher(tch);
      successCount++;
    }
    setSaving(false);
    setStatusFilter('ALL');
    setSearchQuery('');
    setIsPreviewModalOpen(false);
    setPreviewTeachers([]);
    setConfirmOverwrite(false);
    showToast('Impor Guru Berhasil!', `${successCount} data akun guru berhasil ditambahkan & diperbarui ke cloud.`, 'success');
  };

  const isKepalaSekolah = currentUser?.role === 'kepala_sekolah';

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            {isKepalaSekolah ? 'Roster & Direktori Pengampu Guru' : 'Master Data Guru & Akun Asesmen'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isKepalaSekolah
              ? 'Monitoring roster pengampu mata pelajaran, kelas terdaftar, dan status keaktifan akademik guru SMAN 3 Tumijajar'
              : 'Kelola kredensial username, password, NIP (opsional), mata pelajaran diampu, dan status online'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isKepalaSekolah ? (
            <button
              onClick={() => setCurrentView('supervisi-kepsek')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Buka Dasbor Supervisi Eksekutif</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 sm:items-end">
              {/* Baris Utama - Tambah & Edit Massal */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Tambah Guru Baru</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBatchEditMode}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 ${
                    isBatchEditMode
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold ring-2 ring-amber-400'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title="Edit seluruh data akun guru sekaligus secara terbuka"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBatchEditMode ? 'Matikan Mode Edit Massal' : 'Edit Akun Sekaligus'}</span>
                </button>
              </div>

              {/* Baris Sekunder (Diletakkan di Bawahnya) - Impor Excel & Template */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 w-full sm:w-auto sm:justify-end">
                <label
                  htmlFor="excel-teacher-file"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Excel Guru</span>
                  <input
                    id="excel-teacher-file"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleTeacherExcelUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={downloadTeacherTemplateExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  title="Unduh Format Excel untuk Impor Akun Guru"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Format Excel Guru</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      
      {/* 1. MASTER SWITCH: SAKLAR GLOBAL MODE PENGAWAS UJIAN UMUM (ADMIN & OPERATOR) */}
      {!isKepalaSekolah && (currentUser?.role === 'admin' || currentUser?.role === 'operator' || currentUser?.isAdmin || currentUser?.isOperator) && (
        <div
          className={`p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 relative overflow-hidden shadow-sm ${
            isGlobalProctorActive
              ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/60 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 border-slate-300'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-colors ${
                  isGlobalProctorActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/30'
                    : 'bg-slate-200 text-slate-500 border-slate-300'
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                      isGlobalProctorActive
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {isGlobalProctorActive ? '● MODE UJIAN UMUM: AKTIF' : '○ MODE UJIAN UMUM: NONAKTIF'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                    Kendali Utama Administrator &amp; Operator
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Aktifkan Fitur Pengawas Ujian untuk Guru/GTK (Mode Ujian Umum)
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  {isGlobalProctorActive
                    ? 'Fitur Pengawas Ujian CBT aktif untuk seluruh Guru/GTK yang telah diizinkan. Menu Portal Pengawas akan muncul di antarmuka pasca-login masing-masing guru.'
                    : 'Fitur Pengawas Ujian CBT saat ini dinonaktifkan (mode KBM reguler). Seluruh akses pengawas bagi Guru/GTK ditutup secara serentak tanpa menghapus data jadwal mengawas yang sudah dibuat.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:self-center shrink-0 bg-white/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={handleToggleGlobalProctorMode}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                  isGlobalProctorActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
                title={isGlobalProctorActive ? 'Matikan Mode Pengawas Ujian Umum' : 'Aktifkan Mode Pengawas Ujian Umum'}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                    isGlobalProctorActive ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="text-left">
                <span
                  className={`text-xs font-black uppercase tracking-wider block ${
                    isGlobalProctorActive ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {isGlobalProctorActive ? 'AKTIF' : 'NONAKTIF'}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isGlobalProctorActive ? 'Akses Dibuka' : 'Akses Ditutup'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Filter, Search & Checklist Toolbar */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status & Role Filter Tabs (Pilihan Ceklis Filter) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter Peran & Sesi:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('mapel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'mapel'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Filter guru mata pelajaran"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guru Mapel ({mapelCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('bk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'bk'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
              title="Filter guru bimbingan konseling (BK) Hebat"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Guru BK ({bkCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('admin_op')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'admin_op'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
              title="Filter Administrator dan Operator"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin / Operator ({adminOpCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('litnum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'litnum'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
              title="Filter Koordinator Literasi dan Numerasi"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Koordinator LitNum ({litnumCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('kesiswaan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'kesiswaan'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
              title="Filter Tim Kesiswaan & Presensi Siswa"
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>Tim Kesiswaan ({kesiswaanCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('proctor_role')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'proctor_role'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
              }`}
              title="Filter akun yang ditugaskan sebagai Proktor Ujian CBT"
            >
              <Laptop className="w-3.5 h-3.5 text-teal-700" />
              <span>Proktor CBT ({proctorRoleCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('proctor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'proctor'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Filter guru dengan izin pengawas ujian aktif"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Izin Pengawas ({proctorSupervisorCount})</span>
            </button>
            {waliCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('wali')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'wali'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
                title="Filter guru wali kelas"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Wali Kelas ({waliCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusFilter('online')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'online'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Online ({onlineCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('offline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'offline'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Offline ({offlineCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, username, NIP..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Checklist Selection Bar (Pilih Semua atau Salah Satu) - Admin / Operator only */}
        {!isKepalaSekolah && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 select-none transition-colors">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span>
                {isAllSelected
                  ? `Batalkan Pilihan Semua (${filteredTeachers.length} Guru)`
                  : `Pilih Semua (${filteredTeachers.length} Guru)`}
              </span>
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>
                {selectedTeacherIds.size > 0 ? (
                  <strong className="text-indigo-600 font-bold">
                    {selectedTeacherIds.size} dari {filteredTeachers.length} dipilih
                  </strong>
                ) : (
                  `Centang kotak pada kartu guru untuk memilih satu atau beberapa guru`
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Mode Edit Tabel Sekaligus Banner */}
      <AnimatePresence>
        {isBatchEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white rounded-2xl shadow-2xl border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-20"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                <Edit2 className="w-5 h-5 text-slate-950" />
              </span>
              <div>
                <span className="text-xs font-black text-amber-200 block">
                  Mode Edit Akun Guru Sekaligus Aktif ({filteredTeachers.length} Akun)
                </span>
                <span className="text-[11px] text-slate-200">
                  Ubah nama, NIP, username, password, role, dan status online/offline sekaligus pada kartu di bawah ini.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveAllBatchTeachers}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Simpan Semua Perubahan ({filteredTeachers.length} Akun Guru)</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBatchEditMode}
                className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-700"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating / Sticky Batch Action Bar when teachers are checked */}
      <AnimatePresence>
        {selectedTeacherIds.size > 0 && !isBatchEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-20"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                {selectedTeacherIds.size}
              </span>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedTeacherIds.size} Akun Guru Terpilih
                </span>
                <span className="text-[11px] text-slate-300">
                  Ubah status sesi online / offline secara massal sekaligus
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleBatchSetStatus('online')}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                title="Ubah seluruh akun guru terpilih menjadi Online"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ubah ke Online ({selectedTeacherIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchSetStatus('offline')}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                title="Ubah seluruh akun guru terpilih menjadi Offline"
              >
                <XCircle className="w-4 h-4 text-slate-300" />
                <span>Ubah ke Offline ({selectedTeacherIds.size})</span>
              </button>

              {!isKepalaSekolah && (
                <button
                  type="button"
                  onClick={async () => {
                    const ids = Array.from(selectedTeacherIds);
                    if (ids.length === 0) return;
                    if (confirm(`Apakah Anda yakin ingin menghapus ${ids.length} akun guru terpilih secara permanen?`)) {
                      await deleteTeachersBatch(ids);
                      setSelectedTeacherIds(new Set());
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  title="Hapus seluruh akun guru terpilih secara permanen"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Terpilih ({selectedTeacherIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedTeacherIds(new Set())}
                className="px-3.5 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal Pilihan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const isAdmin = teacher.role === 'admin';
          const isSelected = selectedTeacherIds.has(teacher.id);
          const curEdit = batchEditedTeachersMap[teacher.id] || teacher;

          if (isBatchEditMode) {
            return (
              <div
                key={teacher.id}
                className="p-5 rounded-3xl bg-amber-50/50 border-2 border-amber-300 shadow-md flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-11 rounded-[50%] overflow-hidden ring-2 ring-amber-400 shrink-0 bg-white">
                        <img
                          src={curEdit.fotoUrl || teacher.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={teacher.nama}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Edit Akun Massal
                        </span>
                        <p className="text-[10px] font-bold text-slate-800 truncate max-w-[130px]">{teacher.nama}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                      ID: {teacher.id}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Nama Lengkap Guru</label>
                    <input
                      type="text"
                      value={curEdit.nama || ''}
                      onChange={(e) => handleUpdateBatchTeacherField(teacher.id, 'nama', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Username</label>
                      <input
                        type="text"
                        value={curEdit.username || ''}
                        onChange={(e) => handleUpdateBatchTeacherField(teacher.id, 'username', e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Password</label>
                      <input
                        type="text"
                        value={curEdit.password || ''}
                        onChange={(e) => handleUpdateBatchTeacherField(teacher.id, 'password', e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase">NIP / NUPTK</label>
                    <input
                      type="text"
                      value={curEdit.nip || ''}
                      onChange={(e) => handleUpdateBatchTeacherField(teacher.id, 'nip', e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      placeholder="NIP..."
                    />
                  </div>

                  {/* Pilihan Ceklis Peran Multi-Tugas (No dropdown!) */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                      Pilihan Ceklis Peran & Tugas:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={curEdit.isGuruMapel ?? (curEdit.role === 'guru' || (curEdit.mataPelajaran && curEdit.mataPelajaran.filter((m) => !m.toLowerCase().includes('bimbingan')).length > 0) || !curEdit.isGuruBK)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isGuruMapel', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                        />
                        <span className="truncate">Guru Mapel</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-purple-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isGuruBK || curEdit.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan') || m.toLowerCase() === 'bk'))}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isGuruBK', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-purple-600 accent-purple-600 cursor-pointer"
                        />
                        <span className="truncate">Guru BK</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-blue-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isWaliKelas)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isWaliKelas', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                        />
                        <span className="truncate">Wali Kelas</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-cyan-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isOperator || curEdit.role === 'operator')}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isOperator', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 accent-cyan-600 cursor-pointer"
                        />
                        <span className="truncate">Operator</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-indigo-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isAdmin || curEdit.role === 'admin')}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isAdmin', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="truncate">Admin Sistem</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-amber-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isKepalaSekolah || curEdit.role === 'kepala_sekolah')}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isKepalaSekolah', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-600 accent-amber-600 cursor-pointer"
                        />
                        <span className="truncate">Kepala Sekolah</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-amber-950">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isKoordinatorLitnum)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isKoordinatorLitnum', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-600 accent-amber-600 cursor-pointer"
                        />
                        <span className="truncate">Koordinator LitNum</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-rose-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isTimKesiswaan)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isTimKesiswaan', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-rose-600 accent-rose-600 cursor-pointer"
                        />
                        <span className="truncate">Tim Kesiswaan</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-teal-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.isProctor)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'isProctor', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-teal-600 accent-teal-600 cursor-pointer"
                        />
                        <span className="truncate">Proktor CBT</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold text-emerald-900">
                        <input
                          type="checkbox"
                          checked={Boolean(curEdit.supervisorAccess ?? curEdit.isProctorEnabled)}
                          onChange={(e) => handleUpdateBatchTeacherRoleCheckbox(teacher.id, 'supervisorAccess', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                        />
                        <span className="truncate">Izin Pengawas</span>
                      </label>
                    </div>
                  </div>

                  {/* Status Sesi - Dua tombol cepat */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Status Sesi</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateBatchTeacherField(teacher.id, 'status', 'online')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          curEdit.status === 'online'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Online (Aktif)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBatchTeacherField(teacher.id, 'status', 'offline')}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          curEdit.status === 'offline'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Offline
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Mata Pelajaran (Pisah Koma)</label>
                    <input
                      type="text"
                      value={Array.isArray(curEdit.mataPelajaran) ? curEdit.mataPelajaran.join(', ') : ''}
                      onChange={(e) =>
                        handleUpdateBatchTeacherField(
                          teacher.id,
                          'mataPelajaran',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      placeholder="Contoh: Matematika, Fisika"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 flex justify-end">
                  <span className="text-[10px] text-amber-900 font-extrabold bg-amber-200 px-2 py-0.5 rounded-md">
                    Siap Disimpan
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={teacher.id}
              className={`p-5 rounded-3xl bg-white border shadow-xs transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Kartu: Checkbox, Foto Profil Oval, Identitas Guru */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox per item (Pilih Salah Satu) - Admin / Operator only */}
                    {!isKepalaSekolah && (
                      <label className="cursor-pointer shrink-0" title={`Pilih ${teacher.nama}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(teacher.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </label>
                    )}

                    {/* Foto Profil Bentuk Oval Presisi (Anti-Terhalang & Mewah) */}
                    <div className="relative shrink-0">
                      <div className="w-13 h-17 sm:w-14 sm:h-18 rounded-[50%] overflow-hidden ring-2 ring-indigo-200/90 shadow-sm border-2 border-white bg-slate-100 flex items-center justify-center">
                        <img
                          src={teacher.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={teacher.nama}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center z-10">
                        {isTeacherOnline(teacher) && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-3.5 w-3.5 ring-2 ring-white ${
                            isTeacherOnline(teacher) ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={isTeacherOnline(teacher) ? 'Online (Sesi Aktif Real-Time)' : 'Offline'}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                        {teacher.nama}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        @{teacher.username}
                      </p>
                    </div>
                  </div>

                  {/* ID Akun Guru */}
                  <div className="shrink-0 flex items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      #{teacher.id.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* Baris Khusus Badges Peran & Tugas (Full Width - Anti Terhalang Foto Profil) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-2.5 border-t border-slate-100 min-h-[34px]">
                  {(teacher.isGuruMapel ?? (teacher.role === 'guru' || (teacher.mataPelajaran && teacher.mataPelajaran.some((m) => !m.toLowerCase().includes('bimbingan'))))) && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5 text-emerald-700" />
                      <span>Guru Mapel</span>
                    </span>
                  )}

                  {(teacher.isGuruBK || teacher.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')) && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                      <HeartHandshake className="w-3 h-3 text-purple-700" />
                      <span>Guru BK</span>
                    </span>
                  )}

                  {teacher.isWaliKelas && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-blue-700" />
                      <span>Wali {teacher.waliKelasName || 'Kelas'}</span>
                    </span>
                  )}

                  {(teacher.isOperator || teacher.role === 'operator') && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                      <Laptop className="w-2.5 h-2.5 text-cyan-700" />
                      <span>Operator</span>
                    </span>
                  )}

                  {(teacher.isAdmin || teacher.role === 'admin') && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5 text-indigo-700" />
                      <span>Admin</span>
                    </span>
                  )}

                  {(teacher.isKepalaSekolah || teacher.role === 'kepala_sekolah') && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                      <span>Kepala Sekolah</span>
                    </span>
                  )}

                  {teacher.isKoordinatorLitnum && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-gradient-to-r from-amber-100 to-orange-100 text-amber-950 border border-amber-300 flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                      <span>Koordinator LitNum</span>
                    </span>
                  )}

                  {(teacher.isTimKesiswaan || teacher.roles?.includes('kesiswaan')) && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 shadow-2xs">
                      <UserCheck className="w-2.5 h-2.5 text-rose-700" />
                      <span>Tim Kesiswaan</span>
                    </span>
                  )}

                  {(teacher.isProctor || teacher.roles?.includes('proctor')) && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-teal-100 text-teal-900 border border-teal-300 flex items-center gap-1 shadow-2xs">
                      <Laptop className="w-2.5 h-2.5 text-teal-700" />
                      <span>Proktor CBT</span>
                    </span>
                  )}

                  {(teacher.supervisorAccess || teacher.isProctorEnabled) && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                      <span>Izin Pengawas</span>
                    </span>
                  )}

                  {teacher.proctorId && (
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1 font-mono shadow-2xs">
                      <CreditCard className="w-2.5 h-2.5 text-amber-600" />
                      <span>ID Pengawas: {teacher.proctorId}</span>
                    </span>
                  )}

                  {/* Status Penugasan CBT Real-Time */}
                  {(() => {
                    const cbtList = state.examManagement?.teacherAssignments?.filter(
                      (a) => a.teacherId === teacher.id || (a.teacherName && a.teacherName.toLowerCase().trim() === teacher.nama.toLowerCase().trim())
                    ) || [];
                    if (cbtList.length > 0) {
                      const first = cbtList[0];
                      return (
                        <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1 shadow-2xs">
                          <Laptop className="w-2.5 h-2.5 text-cyan-700" />
                          <span>CBT: {first.category} ({first.status})</span>
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                        <Laptop className="w-2.5 h-2.5 text-slate-400" />
                        <span>CBT: Siap Ditugaskan</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl mb-4">
                  <div>
                    <span className="font-semibold text-slate-700">NIP / NUPTK: </span>
                    <span className="text-slate-600">{teacher.nip || 'Belum diisi (Opsional)'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Mata Pelajaran: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {teacher.mataPelajaran && teacher.mataPelajaran.length > 0 ? (
                        teacher.mataPelajaran.map((m, i) => {
                          const isBKMapel = m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk';
                          return (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded-md text-[10px] ${
                                isBKMapel
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold flex items-center gap-1'
                                  : 'bg-white border border-slate-200 text-slate-700 font-medium'
                              }`}
                            >
                              {isBKMapel && <HeartHandshake className="w-2.5 h-2.5 text-purple-700" />}
                              <span>{m}</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum ditentukan (Kosong)</span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Status Sesi Switch per Guru */}
                  <div className="pt-2 border-t border-slate-100/80 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Status Real-Time:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSingleToggleStatus(teacher)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border cursor-pointer transition-all active:scale-95 shadow-2xs ${
                          isTeacherOnline(teacher)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={`Klik untuk ubah status ${teacher.nama} (${isTeacherOnline(teacher) ? 'Offline' : 'Online'})`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isTeacherOnline(teacher) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>
                          {teacher.id === currentUser?.id
                            ? 'ONLINE (Sesi Anda)'
                            : isTeacherOnline(teacher)
                            ? 'ONLINE (Aktif)'
                            : 'OFFLINE'}
                        </span>
                        <RefreshCw className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                      </button>
                    </div>

                    {/* Active Module & Real-time Activity Display */}
                    {isTeacherOnline(teacher) && (() => {
                      const activityInfo = resolveTeacherRealtimeActivity(
                        teacher,
                        state,
                        currentUser,
                        selectedModule,
                        currentView
                      );
                      return (
                        <div className="bg-gradient-to-br from-emerald-50/95 via-teal-50/70 to-emerald-50/90 border border-emerald-200/90 rounded-xl p-2.5 text-[11px] space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 text-[10px] text-emerald-900 font-bold min-w-0">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                              </span>
                              <Laptop className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-slate-500 font-medium shrink-0">Modul:</span>
                              <span className="font-extrabold text-emerald-900 bg-white/95 px-1.5 py-0.5 rounded border border-emerald-200/80 truncate shadow-2xs">
                                {activityInfo.moduleName}
                              </span>
                            </span>
                            <span className="text-[9px] font-mono font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded shrink-0 border border-emerald-200/60">
                              {activityInfo.timeAgoText}
                            </span>
                          </div>

                          <div className="bg-white/95 rounded-lg p-2 border border-emerald-200/80 shadow-2xs space-y-1">
                            <div className="flex items-start gap-1.5 text-emerald-950 font-semibold text-[10.5px] leading-snug">
                              <span className="text-emerald-600 font-extrabold shrink-0 mt-0.5">⚡</span>
                              <span className="line-clamp-2">
                                {activityInfo.activity}
                              </span>
                            </div>
                            {(activityInfo.detailBadge || activityInfo.isSelf) && (
                              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-emerald-100/80">
                                {activityInfo.detailBadge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate max-w-[170px]" title={activityInfo.detailBadge}>
                                    {activityInfo.detailBadge}
                                  </span>
                                )}
                                {activityInfo.isSelf && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Sesi Anda
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {isKepalaSekolah ? (
                  <button
                    onClick={() => setCurrentView('supervisi-kepsek')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Supervisi dan pantau hasil kerja guru ini"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Supervisi Hasil Kerja</span>
                  </button>
                ) : (
                  <>
                    {/* Quick BK Assignment / Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickToggleBK(teacher)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        teacher.isGuruBK || teacher.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                      title={
                        teacher.isGuruBK
                          ? `Penugasan Guru BK Aktif untuk ${teacher.nama}. Klik untuk menonaktifkan.`
                          : `Tugaskan ${teacher.nama} sebagai Guru Bimbingan Konseling (BK) Hebat`
                      }
                    >
                      <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {teacher.isGuruBK || teacher.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')
                          ? 'Guru BK Aktif'
                          : '+ Jadikan Guru BK'}
                      </span>
                    </button>

                    {/* Status Badge if Teacher is BK */}
                    {(teacher.isGuruBK || teacher.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk')) && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold"
                        title="Guru Bimbingan Konseling (BK) Hebat"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Guru BK</span>
                      </span>
                    )}

                    {/* Quick Kesiswaan Assignment / Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickToggleKesiswaan(teacher)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        teacher.isTimKesiswaan || teacher.roles?.includes('kesiswaan')
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                      title={
                        teacher.isTimKesiswaan
                          ? `Penugasan Tim Kesiswaan Aktif untuk ${teacher.nama}. Klik untuk menonaktifkan.`
                          : `Tugaskan ${teacher.nama} sebagai Tim Kesiswaan & Guru Piket`
                      }
                    >
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {teacher.isTimKesiswaan || teacher.roles?.includes('kesiswaan')
                          ? 'Kesiswaan'
                          : '+ Kesiswaan'}
                      </span>
                    </button>

                    {/* Tombol Atur Penugasan Soal CBT */}
                    <button
                      type="button"
                      onClick={() => handleOpenCBTAssign(teacher)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        (state.examManagement?.teacherAssignments?.some(
                          (a) => a.teacherId === teacher.id || (a.teacherName && a.teacherName.toLowerCase().trim() === teacher.nama.toLowerCase().trim())
                        ))
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                          : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200'
                      }`}
                      title={`Tugaskan atau kelola penugasan perancangan soal CBT untuk ${teacher.nama}`}
                    >
                      <Laptop className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {(state.examManagement?.teacherAssignments?.some(
                          (a) => a.teacherId === teacher.id || (a.teacherName && a.teacherName.toLowerCase().trim() === teacher.nama.toLowerCase().trim())
                        ))
                          ? 'Edit Tugas CBT'
                          : '+ Tugaskan CBT'}
                      </span>
                    </button>

                    {/* Quick Mode Proktor CBT Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleProctorRole(teacher)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        teacher.isProctor || teacher.roles?.includes('proctor')
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                          : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                      }`}
                      title={
                        teacher.isProctor || teacher.roles?.includes('proctor')
                          ? `Mode Proktor CBT Aktif untuk ${teacher.nama}. Klik untuk menonaktifkan.`
                          : `Tugaskan ${teacher.nama} sebagai Proktor Ujian CBT (Akses Operasional Ujian)`
                      }
                    >
                      <Laptop className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {teacher.isProctor || teacher.roles?.includes('proctor')
                          ? 'Proktor: Aktif'
                          : '+ Mode Proktor'}
                      </span>
                    </button>

                    {/* Quick Izin Pengawas Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTeacherProctorAccess(teacher)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        teacher.supervisorAccess || teacher.isProctorEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                      title={
                        teacher.supervisorAccess || teacher.isProctorEnabled
                          ? `Izin Pengawas Ujian AKTIF untuk ${teacher.nama}. Klik untuk menonaktifkan.`
                          : `Aktifkan Izin Pengawas Ujian CBT untuk ${teacher.nama}`
                      }
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{teacher.supervisorAccess || teacher.isProctorEnabled ? 'Pengawas: ON' : '+ Izin Pengawas'}</span>
                    </button>

                    <button
                      onClick={() => handleEdit(teacher)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Akun</span>
                    </button>

                    {!isAdmin && (
                      <button
                        onClick={() => setDeleteId(teacher.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                        title="Hapus Akun Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Modal */}
      <AnimatePresence>
        {isModalOpen && editingTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800"
            >
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base">
                    {editingTeacher.id ? 'Edit Akun Guru & Asesmen' : 'Tambah Akun Guru Baru'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                {/* Photo (Bentuk Oval) */}
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-14 h-18 rounded-[50%] overflow-hidden ring-2 ring-indigo-500 shrink-0 bg-slate-200 shadow-sm border border-white flex items-center justify-center">
                    <img
                      src={editingTeacher.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt="Foto Profil"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Foto Profil Guru (Bentuk Oval)</label>
                    <p className="text-[11px] text-slate-500 mb-2">Tampilan otomatis presisi pas di wajah dalam bingkai oval.</p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl cursor-pointer font-semibold shadow-xs">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Unggah / Ganti Foto</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Guru</label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.nama}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, nama: e.target.value })}
                    placeholder="Nama lengkap beserta gelar..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK (Opsional)</label>
                  <input
                    type="text"
                    value={editingTeacher.nip || ''}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, nip: e.target.value })}
                    placeholder="Contoh: 19850720 201001 1 012 (dapat dikosongkan)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Username Login</label>
                    <input
                      type="text"
                      required
                      value={editingTeacher.username}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, username: e.target.value })}
                      placeholder="username_guru"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="text"
                      required
                      value={editingTeacher.password || ''}
                      onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                      placeholder="Password login..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Status Kehadiran Akun (Tanpa Dropdown) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Status Kehadiran Akun</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTeacher({ ...editingTeacher, status: 'online' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        editingTeacher.status === 'online'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                      <span>Online (Aktif)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTeacher({ ...editingTeacher, status: 'offline' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        editingTeacher.status === 'offline'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span>Offline</span>
                    </button>
                  </div>
                </div>

                {/* PILIHAN CEKLIS PERAN & PENUGASAN (PENGGANTI DROPDOWN) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                        <span>Pilihan Ceklis Peran &amp; Penugasan</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Centang satu atau beberapa peran sekaligus (bisa merangkap tugas, misal Guru Mapel + Guru BK / Operator / Admin).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Ceklis 1: Guru Mata Pelajaran */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isGuruMapel: !editingTeacher.isGuruMapel,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isGuruMapel
                          ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isGuruMapel ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Guru Mata Pelajaran</span>
                            <span className="text-[9.5px] font-semibold text-emerald-700">Asesmen &amp; Koreksi AI</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isGuruMapel)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Mengampu mata pelajaran, menyusun asesmen ASTS/ASAS, dan melakukan koreksi otomatis jawaban siswa.
                      </p>
                    </div>

                    {/* Ceklis: Mode Proktor Ujian CBT */}
                    <div
                      onClick={() => {
                        const nextProctor = !editingTeacher.isProctor;
                        setEditingTeacher({
                          ...editingTeacher,
                          isProctor: nextProctor,
                          ...(nextProctor ? { isProctorEnabled: true, supervisorAccess: true } : {})
                        });
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isProctor
                          ? 'bg-teal-50/70 border-teal-300 ring-2 ring-teal-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isProctor ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Proktor Ujian CBT</span>
                            <span className="text-[9.5px] font-semibold text-teal-700">Operasional CBT &amp; BAP</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isProctor)}
                          onChange={() => {}}
                          className="w-4 h-4 text-teal-600 accent-teal-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Penugasan operasional CBT: kendali saklar izin pengawas, kelola token, monitor live, PIN anti-cheat, dan BAP digital.
                      </p>
                    </div>

                    {/* Ceklis Akses Pengawas Ujian CBT (Mode Ujian Umum) */}
                    <div
                      onClick={() => {
                        const nextVal = !Boolean(editingTeacher.supervisorAccess ?? editingTeacher.isProctorEnabled);
                        setEditingTeacher({
                          ...editingTeacher,
                          isProctorEnabled: nextVal,
                          supervisorAccess: nextVal,
                        });
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        (editingTeacher.supervisorAccess ?? editingTeacher.isProctorEnabled)
                          ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              (editingTeacher.supervisorAccess ?? editingTeacher.isProctorEnabled) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Izin Pengawas Ujian</span>
                            <span className="text-[9.5px] font-semibold text-emerald-700">CBT &amp; Ujian Umum</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.supervisorAccess ?? editingTeacher.isProctorEnabled)}
                          onChange={() => {}}
                          className="w-4 h-4 text-emerald-600 accent-emerald-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Izin akses Portal Pengawas Ujian CBT bagi guru ini saat Mode Ujian Umum diaktifkan oleh Admin/Operator/Proktor.
                      </p>
                    </div>

                    {/* Ceklis 2: Guru Bimbingan Konseling (BK) Hebat */}
                    <div
                      onClick={() => {
                        const nextBK = !editingTeacher.isGuruBK;
                        const currentMapel = editingTeacher.mataPelajaran || [];
                        let updatedMapel = [...currentMapel];
                        if (nextBK) {
                          if (!updatedMapel.includes('Bimbingan Konseling (BK)')) {
                            updatedMapel.push('Bimbingan Konseling (BK)');
                          }
                        } else {
                          updatedMapel = updatedMapel.filter(
                            (m) => m !== 'Bimbingan Konseling (BK)' && m !== 'Bimbingan Konseling'
                          );
                        }
                        setEditingTeacher({
                          ...editingTeacher,
                          isGuruBK: nextBK,
                          mataPelajaran: updatedMapel,
                        });
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isGuruBK
                          ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isGuruBK ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <HeartHandshake className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Guru Bimbingan Konseling</span>
                            <span className="text-[9.5px] font-semibold text-purple-700">7 Jurus BK Hebat</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isGuruBK)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-purple-600 accent-purple-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses Modul BK Hebat Kemendikdasmen (Profil Potensi, Jurnal Emosi, Peta Kerawanan, Rujukan MTSS, Karir SNBP).
                      </p>
                    </div>

                    {/* Ceklis 3: Wali Kelas */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isWaliKelas: !editingTeacher.isWaliKelas,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isWaliKelas
                          ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isWaliKelas ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Wali Kelas</span>
                            <span className="text-[9.5px] font-semibold text-blue-700">Binaan Rombel</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isWaliKelas)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-blue-600 accent-blue-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Mendampingi kelas binaan (rekapitulasi rapor kelas, absensi siswa, catatan wali kelas).
                      </p>
                      {editingTeacher.isWaliKelas && (
                        <div className="mt-2 pt-2 border-t border-blue-200" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTeacher.waliKelasName || ''}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, waliKelasName: e.target.value })}
                            placeholder="Contoh nama kelas: X-A / XI-MIPA 1"
                            className="w-full p-1.5 bg-white border border-blue-300 rounded-lg text-[11px] font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                      )}
                    </div>

                    {/* Ceklis 4: Operator Website & Sekolah */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isOperator: !editingTeacher.isOperator,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isOperator
                          ? 'bg-cyan-50/70 border-cyan-300 ring-2 ring-cyan-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isOperator ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Operator Sekolah</span>
                            <span className="text-[9.5px] font-semibold text-cyan-700">Manajemen Data</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isOperator)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-cyan-600 accent-cyan-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses menu Manajemen Data (Master Siswa, Guru, Rombel/Kelas, Kalender Pendidikan &amp; Pengumuman).
                      </p>
                    </div>

                    {/* Ceklis 6: Koordinator Literasi & Numerasi */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isKoordinatorLitnum: !editingTeacher.isKoordinatorLitnum,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isKoordinatorLitnum
                          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isKoordinatorLitnum ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Koordinator LitNum</span>
                            <span className="text-[9.5px] font-semibold text-amber-800">Literasi &amp; Numerasi</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isKoordinatorLitnum)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-amber-600 accent-amber-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses penuh tombol &amp; modul Manajemen Literasi dan Numerasi SMAN 3 Tumijajar.
                      </p>
                    </div>

                    {/* Ceklis 7: Tim Kesiswaan & Presensi Siswa */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isTimKesiswaan: !editingTeacher.isTimKesiswaan,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isTimKesiswaan
                          ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isTimKesiswaan ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Tim Kesiswaan</span>
                            <span className="text-[9.5px] font-semibold text-rose-700">Presensi &amp; Rekap Absensi</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isTimKesiswaan)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-rose-600 accent-rose-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses modul Kesiswaan - Presensi Siswa (Ringkasan Harian, Input Absensi Kelas, Deteksi Dini Siswa &amp; Rekap Excel/PDF).
                      </p>
                    </div>

                    {/* Ceklis 5: Administrator Sistem */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isAdmin: !editingTeacher.isAdmin,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isAdmin
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Administrator Sistem</span>
                            <span className="text-[9.5px] font-semibold text-indigo-700">Hak Akses Penuh</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isAdmin)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses penuh konfigurasi instansi, AI Studio Engine, pencadangan database, dan pengaturan server.
                      </p>
                    </div>

                    {/* Ceklis 6: Kepala Sekolah (Supervisi) */}
                    <div
                      onClick={() =>
                        setEditingTeacher({
                          ...editingTeacher,
                          isKepalaSekolah: !editingTeacher.isKepalaSekolah,
                        })
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        editingTeacher.isKepalaSekolah
                          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              editingTeacher.isKepalaSekolah ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">Kepala Sekolah</span>
                            <span className="text-[9.5px] font-semibold text-amber-700">Supervisi Eksekutif</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(editingTeacher.isKepalaSekolah)}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-amber-600 accent-amber-600 rounded cursor-pointer shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                        Akses supervisi eksekutif KBM, monitoring bank soal &amp; berita acara, telaah nilai rapor, audit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mata Pelajaran yang Diampu (Integrasi Ceklis Guru Mapel) */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    editingTeacher.isGuruMapel
                      ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mata Pelajaran yang Diampu</span>
                      </label>
                      <p className="text-[10.5px] text-slate-500">
                        {editingTeacher.isGuruMapel
                          ? 'Pilih mata pelajaran yang diampu oleh guru ini untuk pembuatan soal & koreksi asesmen:'
                          : 'Guru ini belum dicentang sebagai Guru Mapel. Centang di bawah untuk otomatis mengaktifkan peran Guru Mapel:'}
                      </p>
                    </div>

                    {!editingTeacher.isGuruMapel && (
                      <button
                        type="button"
                        onClick={() => setEditingTeacher({ ...editingTeacher, isGuruMapel: true })}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors shrink-0"
                      >
                        + Aktifkan Guru Mapel
                      </button>
                    )}
                  </div>

                  <div className="max-h-40 overflow-y-auto p-2 bg-white border border-slate-200 rounded-xl space-y-1 mt-2">
                    {subjectsList.map((subj) => {
                      const isChecked = editingTeacher.mataPelajaran?.includes(subj);
                      const isBKSubj = subj.toLowerCase().includes('bimbingan') || subj.toLowerCase() === 'bk';
                      return (
                        <label
                          key={subj}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer select-none transition-all ${
                            isChecked
                              ? isBKSubj
                                ? 'bg-purple-50 font-bold text-purple-900 border border-purple-200'
                                : 'bg-emerald-50 font-bold text-emerald-900 border border-emerald-200'
                              : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 pr-2">
                            {isBKSubj ? (
                              <HeartHandshake className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span>{subj}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              toggleSubjectSelection(subj);
                              if (!editingTeacher.isGuruMapel && !isBKSubj) {
                                setEditingTeacher((prev) => (prev ? { ...prev, isGuruMapel: true } : null));
                              }
                            }}
                            className={`w-4 h-4 rounded cursor-pointer shrink-0 ${
                              isBKSubj ? 'accent-purple-600' : 'accent-emerald-600'
                            }`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* KKTP Kurikulum Merdeka Information Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Rentang KKTP Kurikulum Merdeka Akun Guru</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Sistem penilaian akun guru menggunakan interval kompetensi otomatis: <strong>(0-60) Kurang</strong>, <strong>(61-70) Cukup</strong>, <strong>(71-80) Baik</strong>, dan <strong>(81-100) Sangat Baik</strong> saat mengoreksi lembar jawaban siswa.
                  </p>
                </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Akun</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center text-slate-800 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">Hapus Akun Guru?</h4>
              <p className="text-xs text-slate-500 mb-5">
                Akun guru ini tidak akan dapat login kembali ke sistem asesmen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Excel Import Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-slate-800 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] my-auto"
            >
              <div className="p-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Pratinjau Impor Akun Guru ({previewTeachers.length} Guru)</h3>
                    <p className="text-xs text-emerald-200/80">
                      Periksa data NIP, Nama, Username, dan Password sebelum disimpan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sistem berhasil mengekstrak {previewTeachers.length} calon akun guru dari file Excel.</span>
                </div>

                {duplicateCount > 0 && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                      <span>Konfirmasi Penimpaan Data Guru Terdeteksi!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      Terdapat <strong>{duplicateCount} data guru</strong> dengan nama, username, atau NIP yang sama dengan yang sudah terdaftar di sistem. Mengimpor file ini akan menimpa data lama mereka dengan data baru dari Excel.
                    </p>
                    <label className="flex items-center gap-2 mt-2 font-bold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmOverwrite}
                        onChange={(e) => setConfirmOverwrite(e.target.checked)}
                        className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-amber-900">Saya menyetujui penimpaan {duplicateCount} akun guru yang sudah terdaftar tersebut.</span>
                    </label>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">NIP</th>
                        <th className="p-2.5">Nama Lengkap</th>
                        <th className="p-2.5">Username</th>
                        <th className="p-2.5">Password</th>
                        <th className="p-2.5">Mata Pelajaran</th>
                        <th className="p-2.5 text-center">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {previewTeachers.map((t, idx) => {
                        const isDupRow = state.teachers.some((et) => et.id === t.id);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2.5">
                              {isDupRow ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                  TIMPA DATA
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  BARU
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{t.nip || '-'}</td>
                            <td className="p-2.5 font-bold text-slate-900">{t.nama}</td>
                            <td className="p-2.5 font-mono text-indigo-600">{t.username}</td>
                            <td className="p-2.5 font-mono text-slate-600">{t.password}</td>
                            <td className="p-2.5 text-[11px] text-slate-600">{formatMataPelajaran(t.mataPelajaran) !== '-' ? formatMataPelajaran(t.mataPelajaran) : <span className="text-slate-400 italic">Kosong</span>}</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {t.role}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setConfirmOverwrite(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveTeacherBatch}
                  disabled={saving || (duplicateCount > 0 && !confirmOverwrite)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-300 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Memproses...' : `Simpan & Tambahkan (${previewTeachers.length} Guru)`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Atur Penugasan CBT Khusus Guru Mapel */}
        {cbtAssignTargetTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800"
            >
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-snug">
                      Penugasan Perancangan Soal CBT
                    </h3>
                    <p className="text-[11px] text-cyan-200">
                      Tersambung otomatis ke akun <strong className="text-white">{cbtAssignTargetTeacher.nama}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCbtAssignTargetTeacher(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCbtAssignment} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                {/* Info Guru */}
                <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-cyan-900 tracking-wider block">
                      Target Akun Guru
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {cbtAssignTargetTeacher.nama}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      @{cbtAssignTargetTeacher.username} • {cbtAssignTargetTeacher.nip || 'Tanpa NIP'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0 border border-emerald-200">
                    Akun Siap Terkoneksi
                  </span>
                </div>

                {/* Kategori Ujian */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Ujian CBT:
                  </label>
                  <select
                    value={cbtCategory}
                    onChange={(e) => handleCbtCategoryChange(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="ASAS">ASAS (Asesmen Sumatif Akhir Semester)</option>
                    <option value="ASTS">ASTS (Asesmen Sumatif Tengah Semester)</option>
                    <option value="Simulasi D'SMART Lampung">Simulasi D&apos;SMART Lampung (50 Soal PG HOTS)</option>
                    <option value="Simulasi CBT">Simulasi CBT</option>
                    <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade</option>
                    <option value="Remedial/Susulan">Remedial / Susulan</option>
                  </select>
                </div>

                {/* Mata Pelajaran - Auto-locked if D'SMART Lampung */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Mata Pelajaran:</label>
                    {cbtCategory === "Simulasi D'SMART Lampung" && (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Dinonaktifkan Otomatis
                      </span>
                    )}
                  </div>
                  <select
                    required
                    disabled={cbtCategory === "Simulasi D'SMART Lampung"}
                    value={cbtSubject}
                    onChange={(e) => setCbtSubject(e.target.value)}
                    className={`w-full p-2.5 rounded-xl font-bold transition-all ${
                      cbtCategory === "Simulasi D'SMART Lampung"
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 cursor-not-allowed shadow-inner'
                        : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500'
                    }`}
                  >
                    <option value="">Pilih Mata Pelajaran...</option>
                    {cbtCategory === "Simulasi D'SMART Lampung" && (
                      <option value="Simulasi D'SMART Lampung (4 Instrumen Utama)">
                        Simulasi D&apos;SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)
                      </option>
                    )}
                    {state.subjects.map((sub) => (
                      <option key={sub.id} value={sub.nama}>
                        {sub.nama}
                      </option>
                    ))}
                  </select>

                  {cbtCategory === "Simulasi D'SMART Lampung" && (
                    <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[10.5px] text-emerald-800 leading-tight">
                      <strong>Pilihan mapel dinonaktifkan otomatis:</strong> Terikat langsung pada 4 instrumen evaluasi utama (Literasi Membaca 15, Numerasi 15, Pra Kampus 10, dan Karakter 10).
                    </div>
                  )}
                </div>

                {/* Target Kelas (Multi-select Checkboxes) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700">Target Rombel Kelas:</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (cbtClasses.length === state.classes.length) {
                          setCbtClasses([]);
                        } else {
                          setCbtClasses(state.classes.map((c) => c.nama));
                        }
                      }}
                      className="text-[10.5px] font-bold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                    >
                      {cbtClasses.length === state.classes.length ? 'Hapus Semua' : 'Pilih Semua Kelas'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {state.classes.map((cls) => {
                      const isChecked = cbtClasses.includes(cls.nama);
                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                            isChecked
                              ? 'bg-cyan-500 text-white border-cyan-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCbtClasses([...cbtClasses, cls.nama]);
                              } else {
                                setCbtClasses(cbtClasses.filter((c) => c !== cls.nama));
                              }
                            }}
                            className="hidden"
                          />
                          <span className="truncate">{cls.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Target Soal & Tenggat Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Jumlah Soal:</label>
                    <input
                      type="number"
                      required
                      disabled={cbtCategory === "Simulasi D'SMART Lampung"}
                      min={5}
                      max={100}
                      value={cbtTargetQuestions}
                      onChange={(e) => setCbtTargetQuestions(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl font-bold ${
                        cbtCategory === "Simulasi D'SMART Lampung"
                          ? 'bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tenggat Waktu:</label>
                    <input
                      type="date"
                      required
                      value={cbtDueDate}
                      onChange={(e) => setCbtDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Catatan Admin */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan &amp; Instruksi Khusus (Opsional):</label>
                  <textarea
                    rows={2}
                    value={cbtNotes}
                    onChange={(e) => setCbtNotes(e.target.value)}
                    placeholder="Contoh: Fokus pada soal penalaran HOTS dan konteks lokal Lampung..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                </div>

                {/* Submit & Delete actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                  {(() => {
                    const existing = state.examManagement?.teacherAssignments?.find(
                      (a) =>
                        a.teacherId === cbtAssignTargetTeacher.id ||
                        (a.teacherName && a.teacherName.toLowerCase().trim() === cbtAssignTargetTeacher.nama.toLowerCase().trim())
                    );
                    if (existing) {
                      return (
                        <button
                          type="button"
                          onClick={() => handleDeleteCbtAssignment(existing.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Tugas</span>
                        </button>
                      );
                    }
                    return <div />;
                  })()}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCbtAssignTargetTeacher(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan &amp; Hubungkan ke Akun Guru</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

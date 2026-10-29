import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export type LanguageCode = 'ID' | 'EN' | 'CHN' | 'ARB';

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  nativeName: string;
  country: string;
  flag: string; // Clean country code label
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  ID: {
    code: 'ID',
    label: 'Indonesia',
    nativeName: 'Bahasa Indonesia',
    country: 'Indonesia',
    flag: 'ID',
    dir: 'ltr',
  },
  EN: {
    code: 'EN',
    label: 'English',
    nativeName: 'English (US/UK)',
    country: 'United Kingdom / Global',
    flag: 'EN',
    dir: 'ltr',
  },
  CHN: {
    code: 'CHN',
    label: 'China',
    nativeName: '中文 (简体)',
    country: 'China',
    flag: 'CN',
    dir: 'ltr',
  },
  ARB: {
    code: 'ARB',
    label: 'Arab Saudi',
    nativeName: 'العربية',
    country: 'Saudi Arabia',
    flag: 'AR',
    dir: 'rtl',
  },
};

// Comprehensive Multi-Language Translation Dictionary
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  ID: {
    // Navigation / Sidebar
    'nav.dashboard': 'Dasbor Analitik',
    'nav.dashboard.desc': 'Ringkasan & performa belajar',
    'nav.grading': 'Pengoreksian Jawaban',
    'nav.grading.desc': 'Koreksi essay ASTS & pilihan ganda ASAS',
    'nav.assessments': 'Bank Asesmen (ASTS/ASAS)',
    'nav.assessments.desc': 'Kelola soal essay & pilihan ganda',
    'nav.item_analysis': 'Analisis Butir Soal',
    'nav.item_analysis.desc': 'Tingkat kesukaran, pembeda & distraktor',
    'nav.raport': 'Rapor STS',
    'nav.raport.desc': 'Rapor bayangan / sisipan tengah semester & cetak PDF resmi',
    'nav.roster': 'Daftar Nilai Siswa',
    'nav.roster.desc': 'Rekap multi-klasifikasi & top 3',
    'nav.students': 'Master Data Siswa',
    'nav.students.desc': 'Daftar siswa & data rombel',
    'nav.classes': 'Data Kelas & Mapel',
    'nav.classes.desc': 'Wali kelas, ketentuan KKTP mapel',
    'nav.teachers': 'Akun Guru & Asesmen',
    'nav.teachers.desc': 'Manajemen akun & hak akses',
    'nav.feedback_center': 'Pusat Feedback Guru',
    'nav.feedback_center.desc': 'Monitoring masukan & saran guru',
    'nav.feedback': 'Umpan Balik Guru',
    'nav.feedback.desc': 'Kirim saran & masukan tak terhingga',
    'nav.system_mode': 'Sistem Berkelanjutan',
    'nav.system_unlimited': 'Kapasitas Tanpa Batas',

    // Header
    'header.deep_learning': 'Pembelajaran Mendalam',
    'header.academic_year': 'Tahun Pelajaran',
    'header.semester': 'Semester',
    'header.feedback': 'Umpan Balik',
    'header.settings': 'Pengaturan Sekolah',
    'header.profile': 'Profil Saya',
    'header.logout': 'Keluar Akun',
    'header.administrator': 'Administrator',
    'header.teacher': 'Guru Mata Pelajaran',
    'header.change_language': 'Pilih Bahasa',
    'header.sub_title': 'Platform Terpadu Layanan Akademik, Asesmen & AI',

    // Common Actions
    'action.save': 'Simpan',
    'action.save_changes': 'Simpan Perubahan',
    'action.cancel': 'Batal',
    'action.edit': 'Edit Manual',
    'action.delete': 'Hapus',
    'action.close': 'Tutup',
    'action.back': 'Kembali',
    'action.next': 'Lanjut',
    'action.process': 'Proses Sekarang',
    'action.refresh': 'Muat Ulang',
    'action.search': 'Cari...',
    'action.filter': 'Filter',
    'action.export_csv': 'Ekspor CSV',
    'action.download_pdf': 'Unduh PDF',
    'action.download_word': 'Unduh Word (.docx)',
    'action.print': 'Cetak Dokumen',
    'action.all': 'Semua',
    'action.done': 'Selesai',
    'action.pause': 'Jeda',
    'action.resume': 'Lanjutkan',
    'action.stop': 'Hentikan',
    'action.create_new': 'Buat Baru',
    'action.upload': 'Unggah Berkas',
    'action.upload_photo': 'Unggah Foto Jawaban',
    'action.camera': 'Gunakan Kamera',
    'action.import_excel': 'Impor dari Excel',
    'action.download_template': 'Unduh Format Template',
    'action.select_class': 'Pilih Kelas',
    'action.select_subject': 'Pilih Mata Pelajaran',
    'action.confirm': 'Konfirmasi',
    'action.yes': 'Ya',
    'action.no': 'Tidak',
    'action.reset': 'Reset',
    'action.preview': 'Pratinjau',

    // Grading View
    'grading.title': 'Pengoreksian Jawaban Siswa',
    'grading.subtitle': 'Pilih mode koreksi: 1 Siswa Ini, Siswa Terpilih, 1 Kelas Sekaligus, atau Semua Kelas yang Diajar.',
    'grading.btn_class': 'Koreksi 1 Kelas Sekaligus',
    'grading.btn_selected': 'Koreksi Siswa Terpilih',
    'grading.btn_single': 'Koreksi Siswa Ini',
    'grading.next_student': 'Siswa Berikutnya',
    'grading.filter_all': 'Semua',
    'grading.filter_ready': 'Foto Siap',
    'grading.filter_ungraded': 'Belum Dikoreksi',
    'grading.filter_completed': 'Selesai',
    'grading.select_all': 'Pilih Semua',
    'grading.select_all_ready': 'Centang Semua Foto Siap',
    'grading.transcription_title': 'Jawaban Siswa (Transkripsi Gemini AI Vision Ultra-Tinggi)',
    'grading.transcription_editable': 'Dapat dicek dan diedit manual',
    'grading.reason_title': 'Alasan Pemberian Skor (Justifikasi & Umpan Balik Akademis)',
    'grading.regenerate_reason': 'Regenerate Alasan Otomatis',
    'grading.score': 'Skor',
    'grading.raw_score': 'Nilai Murni',
    'grading.final_score': 'Nilai Akhir',
    'grading.competency': 'Capaian Kompetensi (Taksonomi Bloom & Pembelajaran Mendalam)',
    'grading.passed': 'Tuntas',
    'grading.remedial': 'Remedial / Belum Tuntas',
    'grading.saved_drafts': 'Draf Tersimpan',
    'grading.sheet_photos': 'Lembar Foto',
    'grading.rubric_reference': 'Kunci / Rubrik Acuan',
    'grading.batch_in_progress': 'Sedang Memproses Koreksi Massal...',
    'grading.teacher_notes_title': 'Catatan Jawaban Guru / Pedoman Koreksi',
    'grading.manual_adjust': 'Penyesuaian Manual Nilai',

    // Dashboard Overview
    'dashboard.title': 'Ringkasan Dasbor Analitik',
    'dashboard.subtitle': 'Pantau kemajuan koreksi, performa siswa, dan distribusi ketuntasan.',
    'dashboard.total_students': 'Total Siswa Terdaftar',
    'dashboard.total_assessments': 'Modul Asesmen Aktif',
    'dashboard.completion_rate': 'Tingkat Ketuntasan',
    'dashboard.avg_score': 'Rata-rata Nilai',
    'dashboard.subject_kktp': 'KKTP Sesuai Mata Pelajaran',
    'dashboard.top_rank': 'Podium Peringkat Teratas',
    'dashboard.recent_assessments': 'Asesmen Terbaru',
    'dashboard.recent_activity': 'Aktivitas Koreksi Terkini',
    'dashboard.grade_distribution': 'Distribusi Nilai Siswa',

    // Student Roster
    'roster.title': 'Daftar Rekapitulasi Nilai Siswa',
    'roster.subtitle': 'Rekap nilai lengkap per kelas, per mata pelajaran, dan multi-asesmen.',
    'roster.top3': 'Podium Top 3 Prestasi Siswa',
    'roster.rank': 'Peringkat',
    'roster.name': 'Nama Peserta Didik',
    'roster.nisn': 'NISN',
    'roster.class': 'Kelas',
    'roster.gender': 'L/P',
    'roster.total': 'Total',
    'roster.average': 'Rata-rata',
    'roster.status': 'Ketuntasan',
    'roster.kktp_note': 'KKTP Sesuai Ketentuan Tiap Mapel',
    'roster.mode_by_subject': 'Per Mata Pelajaran',
    'roster.mode_by_class': 'Per Kelas (Multi Mapel)',
    'roster.mode_all': 'Seluruh Data',

    // Assessment Bank
    'bank.title': 'Bank Soal & Asesmen (ASTS / ASAS)',
    'bank.subtitle': 'Kelola butir soal, pedoman rubrik, kunci jawaban, dan ekspor draft naskah soal.',
    'bank.btn_create': 'Buat Modul Asesmen Baru',
    'bank.type_asts': 'ASTS (Asesmen Sumatif Tengah Semester)',
    'bank.type_asas': 'ASAS (Asesmen Sumatif Akhir Semester)',
    'bank.export_pdf_draft': 'Ekspor Draft Naskah Soal (PDF)',
    'bank.export_word_draft': 'Ekspor Naskah Soal (Word)',
    'bank.total_questions': 'Jumlah Soal',
    'bank.teacher_author': 'Guru Penyusun',
    'bank.duplicate': 'Duplikat Asesmen',
    'bank.delete_confirm': 'Apakah Anda yakin ingin menghapus modul asesmen ini?',

    // Assessment Modal
    'assessment.new_title': 'Buat Modul Asesmen Baru',
    'assessment.edit_title': 'Edit Modul Asesmen',
    'assessment.subject': 'Mata Pelajaran',
    'assessment.class': 'Kelas / Rombel',
    'assessment.grade_phase': 'Fase Kurikulum',
    'assessment.teacher': 'Guru Pengampu',
    'assessment.subject_kktp': 'KKTP Mata Pelajaran',
    'assessment.questions': 'Daftar Butir Soal',
    'assessment.rubric': 'Rubrik Penilaian & Kunci Jawaban',
    'assessment.teacher_notes': 'Catatan Jawaban Guru / Pedoman Tambahan (Opsional)',
    'assessment.teacher_notes_desc': 'Disandingkan dengan kunci jawaban saat koreksi otomatis AI untuk akurasi maksimal.',
    'assessment.item_number': 'Nomor Soal',
    'assessment.item_question': 'Teks Pertanyaan / Soal',
    'assessment.item_key': 'Kunci Jawaban',
    'assessment.item_max_score': 'Skor Maksimal',

    // Official Raport
    'raport.title': 'Rapor STS (Rapor Bayangan Tengah Semester)',
    'raport.subtitle': 'Format resmi rapor bayangan / sisipan tengah semester standar dinas pendidikan lengkap dengan kop dan tanda tangan.',
    'raport.preview_title': 'Pratinjau Lembar Raport',
    'raport.student_list': 'Daftar Peserta Didik',
    'raport.export_all_pdf': 'Cetak Raport Seluruh Siswa (PDF)',
    'raport.signature_headmaster': 'Kepala Sekolah',
    'raport.signature_teacher': 'Guru Mata Pelajaran',
    'raport.signature_homeroom': 'Wali Kelas',

    // Master Data
    'master.students_title': 'Master Data Peserta Didik',
    'master.students_subtitle': 'Kelola data identitas siswa, NISN, rombel, dan jenis kelamin.',
    'master.add_student': 'Tambah Siswa Baru',
    'master.classes_title': 'Master Data Kelas & Mata Pelajaran',
    'master.classes_subtitle': 'Kelola daftar rombel, wali kelas, dan ketentuan KKTP tiap mata pelajaran.',
    'master.teachers_title': 'Manajemen Akun Guru & Pengawas',
    'master.teachers_subtitle': 'Kelola hak akses pengampu mata pelajaran dan akun masuk.',

    // Feedback
    'feedback.title': 'Pusat Umpan Balik & Aspirasi Guru',
    'feedback.subtitle': 'Sampaikan masukan, saran fitur baru, atau catatan pengalaman Anda.',
    'feedback.send_btn': 'Kirim Masukan Guru',
    'feedback.category': 'Kategori Masukan',
    'feedback.rating': 'Tingkat Kepuasan',
    'feedback.message': 'Isi Umpan Balik / Saran',
    'feedback.success_toast': 'Terima kasih! Umpan balik Anda berhasil dikirim ke Administrator.',

    // Login
    'auth.welcome': 'Selamat Datang di Portal Asesmen',
    'auth.school_name': 'SMA NEGERI 3 TUMIJAJAR',
    'auth.subtitle': 'Platform Terpadu Layanan Akademik, Asesmen & AI',
    'auth.select_account': 'Pilih Akun Guru / Masuk sebagai Administrator',
    'auth.pin_label': 'Masukkan PIN Keamanan',
    'auth.login_btn': 'Masuk ke Sistem',
    'auth.admin_quick': 'Masuk Cepat Administrator',
  },

  EN: {
    // Navigation / Sidebar
    'nav.dashboard': 'Analytics Dashboard',
    'nav.dashboard.desc': 'Summary & learning performance',
    'nav.grading': 'Answer Grading',
    'nav.grading.desc': 'Grade ASTS essay & ASAS multiple choice',
    'nav.assessments': 'Assessment Bank (ASTS/ASAS)',
    'nav.assessments.desc': 'Manage essay & multiple-choice questions',
    'nav.item_analysis': 'Item Analysis (Psychometrics)',
    'nav.item_analysis.desc': 'Difficulty index, discrimination & distractors',
    'nav.raport': 'STS Midterm Report',
    'nav.raport.desc': 'Midterm interim report card & official PDF',
    'nav.roster': 'Student Grade Roster',
    'nav.roster.desc': 'Multi-classification & top 3 ranks',
    'nav.students': 'Master Student Data',
    'nav.students.desc': 'Student roster & class groups',
    'nav.classes': 'Classes & Subjects',
    'nav.classes.desc': 'Homeroom teachers, subject criteria',
    'nav.teachers': 'Teacher Accounts & Access',
    'nav.teachers.desc': 'Account management & permissions',
    'nav.feedback_center': 'Teacher Feedback Center',
    'nav.feedback_center.desc': 'Monitor teacher feedback & advice',
    'nav.feedback': 'Teacher Feedback',
    'nav.feedback.desc': 'Send unlimited feedback & suggestions',
    'nav.system_mode': 'Continuous System',
    'nav.system_unlimited': 'Unlimited Capacity',

    // Header
    'header.deep_learning': 'Deep Learning Guide',
    'header.academic_year': 'Academic Year',
    'header.semester': 'Semester',
    'header.feedback': 'Feedback',
    'header.settings': 'School Settings',
    'header.profile': 'My Profile',
    'header.logout': 'Sign Out',
    'header.administrator': 'Administrator',
    'header.teacher': 'Subject Teacher',
    'header.change_language': 'Select Language',
    'header.sub_title': 'ASTS & ASAS Assessments with AI-Powered Grading',

    // Common Actions
    'action.save': 'Save',
    'action.save_changes': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.edit': 'Manual Edit',
    'action.delete': 'Delete',
    'action.close': 'Close',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.process': 'Process Now',
    'action.refresh': 'Reload',
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.export_csv': 'Export CSV',
    'action.download_pdf': 'Download PDF',
    'action.download_word': 'Download Word (.docx)',
    'action.print': 'Print Document',
    'action.all': 'All',
    'action.done': 'Completed',
    'action.pause': 'Pause',
    'action.resume': 'Resume',
    'action.stop': 'Stop',
    'action.create_new': 'Create New',
    'action.upload': 'Upload Files',
    'action.upload_photo': 'Upload Answer Photo',
    'action.camera': 'Use Camera',
    'action.import_excel': 'Import from Excel',
    'action.download_template': 'Download Template',
    'action.select_class': 'Select Class',
    'action.select_subject': 'Select Subject',
    'action.confirm': 'Confirm',
    'action.yes': 'Yes',
    'action.no': 'No',
    'action.reset': 'Reset',
    'action.preview': 'Preview',

    // Grading View
    'grading.title': 'Student Answer Grading',
    'grading.subtitle': 'Choose grading mode: Single Student, Selected Students, Entire Class, or All Taught Classes.',
    'grading.btn_class': 'Grade Entire Class at Once',
    'grading.btn_selected': 'Grade Selected Students',
    'grading.btn_single': 'Grade This Student',
    'grading.next_student': 'Next Student',
    'grading.filter_all': 'All',
    'grading.filter_ready': 'Photos Ready',
    'grading.filter_ungraded': 'Ungraded',
    'grading.filter_completed': 'Completed',
    'grading.select_all': 'Select All',
    'grading.select_all_ready': 'Select All Ready Photos',
    'grading.transcription_title': 'Student Answer (Ultra-High Gemini AI Vision Transcription)',
    'grading.transcription_editable': 'Can be manually verified and edited',
    'grading.reason_title': 'Score Justification (Academic Feedback & Reasoning)',
    'grading.regenerate_reason': 'Regenerate Justification Automatically',
    'grading.score': 'Score',
    'grading.raw_score': 'Raw Score',
    'grading.final_score': 'Final Score',
    'grading.competency': 'Competency Achievement (Bloom Taxonomy & Deep Learning)',
    'grading.passed': 'Mastered / Passed',
    'grading.remedial': 'Remedial / In Progress',
    'grading.saved_drafts': 'Saved Drafts',
    'grading.sheet_photos': 'Sheet Photos',
    'grading.rubric_reference': 'Answer Key / Scoring Rubric',
    'grading.batch_in_progress': 'Batch Grading in Progress...',
    'grading.teacher_notes_title': "Teacher's Reference Notes / Grading Rubric",
    'grading.manual_adjust': 'Manual Score Adjustment',

    // Dashboard Overview
    'dashboard.title': 'Analytics Dashboard Overview',
    'dashboard.subtitle': 'Monitor grading progress, student performance, and mastery distribution.',
    'dashboard.total_students': 'Total Enrolled Students',
    'dashboard.total_assessments': 'Active Assessment Modules',
    'dashboard.completion_rate': 'Mastery Rate',
    'dashboard.avg_score': 'Average Score',
    'dashboard.subject_kktp': 'Per-Subject Passing Criteria',
    'dashboard.top_rank': 'Top Performance Podium',
    'dashboard.recent_assessments': 'Recent Assessments',
    'dashboard.recent_activity': 'Recent Grading Activity',
    'dashboard.grade_distribution': 'Grade Distribution',

    // Student Roster
    'roster.title': 'Student Grade Recapitulation Roster',
    'roster.subtitle': 'Complete grade records per class, per subject, and across multiple assessments.',
    'roster.top3': 'Top 3 Student Performance Podium',
    'roster.rank': 'Rank',
    'roster.name': 'Student Name',
    'roster.nisn': 'Student ID (NISN)',
    'roster.class': 'Class',
    'roster.gender': 'Gender',
    'roster.total': 'Total',
    'roster.average': 'Average',
    'roster.status': 'Mastery Status',
    'roster.kktp_note': 'Passing Criteria Set per Subject',
    'roster.mode_by_subject': 'By Subject',
    'roster.mode_by_class': 'By Class (Multi-Subject)',
    'roster.mode_all': 'All Records',

    // Assessment Bank
    'bank.title': 'Question & Assessment Bank (ASTS / ASAS)',
    'bank.subtitle': 'Manage questions, rubrics, answer keys, and export official exam drafts.',
    'bank.btn_create': 'Create New Assessment Module',
    'bank.type_asts': 'ASTS (Midterm Summative Assessment)',
    'bank.type_asas': 'ASAS (Final Summative Assessment)',
    'bank.export_pdf_draft': 'Export Exam Draft (PDF)',
    'bank.export_word_draft': 'Export Exam Draft (Word)',
    'bank.total_questions': 'Total Questions',
    'bank.teacher_author': 'Authoring Teacher',
    'bank.duplicate': 'Duplicate Assessment',
    'bank.delete_confirm': 'Are you sure you want to delete this assessment module?',

    // Assessment Modal
    'assessment.new_title': 'Create New Assessment Module',
    'assessment.edit_title': 'Edit Assessment Module',
    'assessment.subject': 'Subject',
    'assessment.class': 'Class / Group',
    'assessment.grade_phase': 'Curriculum Phase',
    'assessment.teacher': 'Assigned Teacher',
    'assessment.subject_kktp': 'Subject Passing Threshold',
    'assessment.questions': 'Questions List',
    'assessment.rubric': 'Scoring Rubric & Answer Key',
    'assessment.teacher_notes': "Teacher's Reference Notes / Additional Criteria (Optional)",
    'assessment.teacher_notes_desc': 'Cross-referenced with answer keys during AI grading for maximum accuracy.',
    'assessment.item_number': 'Question No.',
    'assessment.item_question': 'Question Stem',
    'assessment.item_key': 'Answer Key',
    'assessment.item_max_score': 'Max Score',

    // Official Raport
    'raport.title': 'STS Midterm Report (Interim Report Card)',
    'raport.subtitle': 'Standard official midterm shadow report card format complete with header and signatures.',
    'raport.preview_title': 'Report Card Sheet Preview',
    'raport.student_list': 'Enrolled Students List',
    'raport.export_all_pdf': 'Print All Student Reports (PDF)',
    'raport.signature_headmaster': 'School Principal',
    'raport.signature_teacher': 'Subject Teacher',
    'raport.signature_homeroom': 'Homeroom Teacher',

    // Master Data
    'master.students_title': 'Master Student Registry',
    'master.students_subtitle': 'Manage student demographics, IDs, class assignments, and gender.',
    'master.add_student': 'Add New Student',
    'master.classes_title': 'Master Classes & Subjects',
    'master.classes_subtitle': 'Manage class rosters, homeroom teachers, and passing thresholds.',
    'master.teachers_title': 'Teacher Accounts & Access Control',
    'master.teachers_subtitle': 'Manage subject assignment and system login credentials.',

    // Feedback
    'feedback.title': 'Teacher Feedback & Suggestions Center',
    'feedback.subtitle': 'Submit constructive feedback, new feature requests, or user notes.',
    'feedback.send_btn': 'Submit Feedback',
    'feedback.category': 'Feedback Category',
    'feedback.rating': 'Satisfaction Rating',
    'feedback.message': 'Feedback Content / Notes',
    'feedback.success_toast': 'Thank you! Your feedback has been sent to the Administrator.',

    // Login
    'auth.welcome': 'Welcome to Assessment Portal',
    'auth.school_name': 'SMA NEGERI 3 TUMIJAJAR',
    'auth.subtitle': 'AI Vision Ultra-High Resolution Student Sheet Grading System',
    'auth.select_account': 'Select Teacher Account / Sign in as Administrator',
    'auth.pin_label': 'Enter Security PIN',
    'auth.login_btn': 'Sign In to Portal',
    'auth.admin_quick': 'Quick Administrator Login',
  },

  CHN: {
    // Navigation / Sidebar
    'nav.dashboard': '数据分析仪表板',
    'nav.dashboard.desc': '学习表现与成绩概览',
    'nav.grading': '试卷评阅',
    'nav.grading.desc': '批改期中问答与期末单选',
    'nav.assessments': '测评题库管理 (ASTS/ASAS)',
    'nav.assessments.desc': '管理问答题与选择题库',
    'nav.item_analysis': '试题质量分析 (心理测量)',
    'nav.item_analysis.desc': '难度指数、区分度及选项诱答分析',
    'nav.raport': '期中报告册 (STS)',
    'nav.raport.desc': '期中阶段性学情报告单与正式打印',
    'nav.roster': '学生成绩总册',
    'nav.roster.desc': '多分类汇总与前三名榜单',
    'nav.students': '学生花名册',
    'nav.students.desc': '班级学生与花名册管理',
    'nav.classes': '班级与学科管理',
    'nav.classes.desc': '班主任与学科达标要求',
    'nav.teachers': '教师账户管理',
    'nav.teachers.desc': '账户权限与测评分配',
    'nav.feedback_center': '教师反馈中心',
    'nav.feedback_center.desc': '监控教师建议与意见',
    'nav.feedback': '教师意见反馈',
    'nav.feedback.desc': '提交教学建议与优化意见',
    'nav.system_mode': '持续稳定系统',
    'nav.system_unlimited': '无配额限制运行',

    // Header
    'header.deep_learning': '深度学习指南',
    'header.academic_year': '学年',
    'header.semester': '学期',
    'header.feedback': '意见反馈',
    'header.settings': '学校设置',
    'header.profile': '个人资料',
    'header.logout': '退出登录',
    'header.administrator': '系统管理员',
    'header.teacher': '学科任课教师',
    'header.change_language': '选择语言',
    'header.sub_title': 'ASTS与ASAS测评及AI智能视觉批阅系统',

    // Common Actions
    'action.save': '保存',
    'action.save_changes': '保存修改',
    'action.cancel': '取消',
    'action.edit': '手动编辑',
    'action.delete': '删除',
    'action.close': '关闭',
    'action.back': '返回',
    'action.next': '下一步',
    'action.process': '立即批改',
    'action.refresh': '刷新',
    'action.search': '搜索...',
    'action.filter': '筛选',
    'action.export_csv': '导出CSV',
    'action.download_pdf': '下载PDF',
    'action.download_word': '下载Word (.docx)',
    'action.print': '打印文档',
    'action.all': '全部',
    'action.done': '完成',
    'action.pause': '暂停',
    'action.resume': '继续',
    'action.stop': '停止',
    'action.create_new': '新建测评',
    'action.upload': '上传文件',
    'action.upload_photo': '上传答题卡照片',
    'action.camera': '使用摄像头',
    'action.import_excel': '从Excel导入',
    'action.download_template': '下载标准模板',
    'action.select_class': '选择班级',
    'action.select_subject': '选择学科',
    'action.confirm': '确认',
    'action.yes': '是',
    'action.no': '否',
    'action.reset': '重置',
    'action.preview': '预览',

    // Grading View
    'grading.title': '学生答卷批量智能批改',
    'grading.subtitle': '选择批改模式：全班一次性批改、选定多名学生批改、或单个学生独立批改。',
    'grading.btn_class': '全班一次性批改',
    'grading.btn_selected': '批改选定学生',
    'grading.btn_single': '批改当前学生',
    'grading.next_student': '下一个学生',
    'grading.filter_all': '全部',
    'grading.filter_ready': '照片已就绪',
    'grading.filter_ungraded': '待批改',
    'grading.filter_completed': '已完成',
    'grading.select_all': '全选',
    'grading.select_all_ready': '全选就绪照片',
    'grading.transcription_title': '学生手写答案（Gemini超清AI视觉转录文字）',
    'grading.transcription_editable': '支持人工复核与修改',
    'grading.reason_title': '给分依据与学术评语（自动生成理由）',
    'grading.regenerate_reason': '自动重新生成理由',
    'grading.score': '得分',
    'grading.raw_score': '原始分',
    'grading.final_score': '最终得分',
    'grading.competency': '能力素养达成（布鲁姆深度认知层级）',
    'grading.passed': '达标合格',
    'grading.remedial': '需辅导补考',
    'grading.saved_drafts': '已存草稿',
    'grading.sheet_photos': '张答题卡照片',
    'grading.rubric_reference': '参考答案及评分细则',
    'grading.batch_in_progress': '正在批量自动阅卷中...',
    'grading.teacher_notes_title': '教师参考注解 / 阅卷补充细则',
    'grading.manual_adjust': '人工成绩微调',

    // Dashboard Overview
    'dashboard.title': '数据分析仪表板概览',
    'dashboard.subtitle': '监控阅卷进度、学生表现及学业达标率分布。',
    'dashboard.total_students': '在册学生总数',
    'dashboard.total_assessments': '活跃测评模块',
    'dashboard.completion_rate': '学业达标率',
    'dashboard.avg_score': '综合平均分',
    'dashboard.subject_kktp': '依各学科独立合格标准',
    'dashboard.top_rank': '优秀学生荣誉榜',
    'dashboard.recent_assessments': '最新测评模块',
    'dashboard.recent_activity': '最新批改动态',
    'dashboard.grade_distribution': '成绩分布区间',

    // Student Roster
    'roster.title': '学生成绩总汇总册',
    'roster.subtitle': '按班级、按学科及跨多项测评完整成绩记录。',
    'roster.top3': '前三名学业优秀榜单',
    'roster.rank': '排名',
    'roster.name': '学生姓名',
    'roster.nisn': '学号 (NISN)',
    'roster.class': '班级',
    'roster.gender': '性别',
    'roster.total': '总分',
    'roster.average': '平均分',
    'roster.status': '达标状态',
    'roster.kktp_note': '按各学科单独设定达标标准',
    'roster.mode_by_subject': '按单科展示',
    'roster.mode_by_class': '按班级多科展示',
    'roster.mode_all': '全部数据',

    // Assessment Bank
    'bank.title': '测评试题库管理 (ASTS / ASAS)',
    'bank.subtitle': '管理试题、评分细则、标准答案并导出正规试卷草案。',
    'bank.btn_create': '创建新测评模块',
    'bank.type_asts': 'ASTS (期中总结性测评)',
    'bank.type_asas': 'ASAS (期末总结性测评)',
    'bank.export_pdf_draft': '导出试卷草案 (PDF)',
    'bank.export_word_draft': '导出试卷文档 (Word)',
    'bank.total_questions': '题目总数',
    'bank.teacher_author': '出题教师',
    'bank.duplicate': '复制测评',
    'bank.delete_confirm': '确定要删除此测评模块吗？',

    // Assessment Modal
    'assessment.new_title': '创建新测评模块',
    'assessment.edit_title': '编辑测评模块',
    'assessment.subject': '学科名称',
    'assessment.class': '适用班级',
    'assessment.grade_phase': '课程学段',
    'assessment.teacher': '任课教师',
    'assessment.subject_kktp': '学科合格分数线',
    'assessment.questions': '题目列表',
    'assessment.rubric': '评分标准与标准答案',
    'assessment.teacher_notes': '教师答案备忘 / 补充评分依据 (可选)',
    'assessment.teacher_notes_desc': '在AI智能阅卷时与标准答案进行对照以确保最高评分精确度。',
    'assessment.item_number': '题号',
    'assessment.item_question': '题目正文',
    'assessment.item_key': '标准答案',
    'assessment.item_max_score': '满分分值',

    // Official Raport
    'raport.title': '打印正式 STS 与 SAS 成绩单',
    'raport.subtitle': '符合官方标准F4/Folio规格的完整正式成绩单。',
    'raport.preview_title': '成绩单版面预览',
    'raport.student_list': '在册学生名单',
    'raport.export_all_pdf': '批量打印全班成绩单 (PDF)',
    'raport.signature_headmaster': '学校校长',
    'raport.signature_teacher': '学科任课教师',
    'raport.signature_homeroom': '班主任',

    // Master Data
    'master.students_title': '学生基础信息数据库',
    'master.students_subtitle': '管理学生学号、姓名、班级及性别。',
    'master.add_student': '新增学生',
    'master.classes_title': '班级与学科基础数据库',
    'master.classes_subtitle': '管理班级名册、班主任及各学科及格线。',
    'master.teachers_title': '教师账户与权限管理',
    'master.teachers_subtitle': '分配任教学科与系统登录凭证。',

    // Feedback
    'feedback.title': '教师意见与建议反馈中心',
    'feedback.subtitle': '提交使用反馈、新功能需求或教学心得。',
    'feedback.send_btn': '提交反馈意见',
    'feedback.category': '意见分类',
    'feedback.rating': '满意度评价',
    'feedback.message': '反馈内容与建议',
    'feedback.success_toast': '感谢您的建议！反馈已成功发送至管理员。',

    // Login
    'auth.welcome': '欢迎访问测评综合门户',
    'auth.school_name': 'SMA NEGERI 3 TUMIJAJAR',
    'auth.subtitle': '基于Gemini超高清AI视觉的学生答题卡智能批阅系统',
    'auth.select_account': '选择教师账户 / 以管理员身份登录',
    'auth.pin_label': '输入安全PIN码',
    'auth.login_btn': '登录系统',
    'auth.admin_quick': '管理员一键快捷登录',
  },

  ARB: {
    // Navigation / Sidebar
    'nav.dashboard': 'لوحة التحليلات',
    'nav.dashboard.desc': 'ملخص ومؤشرات أداء التعلم',
    'nav.grading': 'تصحيح الإجابات',
    'nav.grading.desc': 'تصحيح المقالي للاختبار النصفي والاختيار من متعدد للنهائي',
    'nav.assessments': 'بنك التقييمات والاختبارات (ASTS/ASAS)',
    'nav.assessments.desc': 'إدارة الأسئلة المقالية والاختيار من متعدد',
    'nav.item_analysis': 'تحليل بنود الأسئلة القياسي',
    'nav.item_analysis.desc': 'معامل الصعوبة، التمييز وفاعلية البدائل والمشتتات',
    'nav.raport': 'تقرير منتصف الفصل (STS)',
    'nav.raport.desc': 'الشهادة المرحلية النصفية وطباعة المستندات الرسمية',
    'nav.roster': 'سجل درجات الطلاب',
    'nav.roster.desc': 'تصنيف شامل وقائمة أفضل المتفوقين',
    'nav.students': 'بيانات الطلاب الأساسية',
    'nav.students.desc': 'قائمة الطلاب والفصول المسجلة',
    'nav.classes': 'الفصول والمواد الدراسية',
    'nav.classes.desc': 'رواد الفصول ومعايير النجاح لكل مادة',
    'nav.teachers': 'حسابات المعلمين والصلاحيات',
    'nav.teachers.desc': 'إدارة الحسابات وصلاحيات التقييم',
    'nav.feedback_center': 'مركز ملاحظات المعلمين',
    'nav.feedback_center.desc': 'متابعة اقتراحات وآراء المعلمين',
    'nav.feedback': 'ملاحظات المعلم',
    'nav.feedback.desc': 'إرسال الاقتراحات والملاحظات',
    'nav.system_mode': 'نظام مستمر ومستدام',
    'nav.system_unlimited': 'سعة غير محدودة',

    // Header
    'header.deep_learning': 'دليل التعلم العميق',
    'header.academic_year': 'العام الدراسي',
    'header.semester': 'الفصل الدراسي',
    'header.feedback': 'الملاحظات',
    'header.settings': 'إعدادات المدرسة',
    'header.profile': 'ملفي الشخصي',
    'header.logout': 'تسجيل الخروج',
    'header.administrator': 'مدير النظام',
    'header.teacher': 'معلم المادة',
    'header.change_language': 'اختر اللغة',
    'header.sub_title': 'نظام تقييمات ASTS و ASAS والتصحيح بالذكاء الاصطناعي',

    // Common Actions
    'action.save': 'حفظ',
    'action.save_changes': 'حفظ التغييرات',
    'action.cancel': 'إلغاء',
    'action.edit': 'تعديل يدوي',
    'action.delete': 'حذف',
    'action.close': 'إغلاق',
    'action.back': 'رجوع',
    'action.next': 'التالي',
    'action.process': 'بدء التصحيح الآن',
    'action.refresh': 'تحديث',
    'action.search': 'بحث...',
    'action.filter': 'تصفية',
    'action.export_csv': 'تصدير CSV',
    'action.download_pdf': 'تحميل PDF',
    'action.download_word': 'تحميل Word (.docx)',
    'action.print': 'طباعة المستند',
    'action.all': 'الكل',
    'action.done': 'اكتمل',
    'action.pause': 'إيقاف مؤقت',
    'action.resume': 'استئناف',
    'action.stop': 'إيقاف',
    'action.create_new': 'إنشاء تقييم جديد',
    'action.upload': 'رفع الملفات',
    'action.upload_photo': 'رفع صورة الإجابة',
    'action.camera': 'استخدام الكاميرا',
    'action.import_excel': 'استيراد من Excel',
    'action.download_template': 'تحميل النموذج القياسي',
    'action.select_class': 'اختر الفصل',
    'action.select_subject': 'اختر المادة',
    'action.confirm': 'تأكيد',
    'action.yes': 'نعم',
    'action.no': 'لا',
    'action.reset': 'إعادة ضبط',
    'action.preview': 'معاينة',

    // Grading View
    'grading.title': 'تصحيح أوراق الطلاب المجمعة بالذكاء الاصطناعي',
    'grading.subtitle': 'اختر وضع التصحيح: تصحيح الفصل كاملاً دفعة واحدة، أو طلاب محددين، أو طالب فردي.',
    'grading.btn_class': 'تصحيح الفصل كاملاً دفعة واحدة',
    'grading.btn_selected': 'تصحيح الطلاب المحددين',
    'grading.btn_single': 'تصحيح هذا الطالب',
    'grading.next_student': 'الطالب التالي',
    'grading.filter_all': 'الكل',
    'grading.filter_ready': 'الصور جاهزة',
    'grading.filter_ungraded': 'غير مصحح',
    'grading.filter_completed': 'مكتمل',
    'grading.select_all': 'تحديد الكل',
    'grading.select_all_ready': 'تحديد كل الصور الجاهزة',
    'grading.transcription_title': 'إجابة الطالب (نص منسوخ برؤية الذكاء الاصطناعي فائقة الدقة)',
    'grading.transcription_editable': 'يمكن مراجعته وتعديله يدوياً',
    'grading.reason_title': 'مبررات منح الدرجة (التعليق والتقييم الأكاديمي)',
    'grading.regenerate_reason': 'إعادة توليد المبررات تلقائياً',
    'grading.score': 'الدرجة',
    'grading.raw_score': 'الدرجة الخام',
    'grading.final_score': 'الدرجة النهائية',
    'grading.competency': 'تحقيق الكفايات التعليمية (تصنيف بلوم والتعلم العميق)',
    'grading.passed': 'متقن / ناجح',
    'grading.remedial': 'يحتاج إلى تحسين / علاجي',
    'grading.saved_drafts': 'المسودات المحفوظة',
    'grading.sheet_photos': 'صور الأوراق',
    'grading.rubric_reference': 'نموذج الإجابة ومعايير التصحيح',
    'grading.batch_in_progress': 'جاري التصحيح المجمع تلقائياً...',
    'grading.teacher_notes_title': 'ملاحظات المعلم / معايير التصحيح المرجعية',
    'grading.manual_adjust': 'تعديل الدرجة يدوياً',

    // Dashboard Overview
    'dashboard.title': 'نظرة عامة على لوحة التحليلات',
    'dashboard.subtitle': 'متابعة تقدم التصحيح ومستويات أداء الطلاب وتوزيع نسب الإتقان.',
    'dashboard.total_students': 'إجمالي الطلاب المسجلين',
    'dashboard.total_assessments': 'وحدات التقييم النشطة',
    'dashboard.completion_rate': 'نسبة الإتقان والنجاح',
    'dashboard.avg_score': 'المعدل العام للدرجات',
    'dashboard.subject_kktp': 'معايير الإتقان الخاصة بكل مادة',
    'dashboard.top_rank': 'منصة المتفوقين الأوائل',
    'dashboard.recent_assessments': 'أحدث التقييمات',
    'dashboard.recent_activity': 'آخر نشاطات التصحيح',
    'dashboard.grade_distribution': 'توزيع الدرجات',

    // Student Roster
    'roster.title': 'سجل تجميع درجات وترتيب الطلاب',
    'roster.subtitle': 'سجلات الدرجات الكاملة لكل فصل ومادة وعبر التقييمات المتعددة.',
    'roster.top3': 'منصة الطلاب الثلاثة الأوائل',
    'roster.rank': 'الترتيب',
    'roster.name': 'اسم الطالب',
    'roster.nisn': 'الرقم الوطني للطلاب (NISN)',
    'roster.class': 'الفصل',
    'roster.gender': 'الجنس',
    'roster.total': 'المجموع',
    'roster.average': 'المعدل',
    'roster.status': 'حالة النجاح',
    'roster.kktp_note': 'معيار النجاح مخصص حسب كل مادة دراسية',
    'roster.mode_by_subject': 'حسب المادة الدراسية',
    'roster.mode_by_class': 'حسب الفصل (مواد متعددة)',
    'roster.mode_all': 'كافة السجلات',

    // Assessment Bank
    'bank.title': 'بنك الأسئلة والتقييمات (ASTS / ASAS)',
    'bank.subtitle': 'إدارة بنود الأسئلة ومعايير التقدير ونماذج الإجابة وتصدير مسودات الاختبارات.',
    'bank.btn_create': 'إنشاء وحدة تقييم جديدة',
    'bank.type_asts': 'ASTS (التقييم التراكمي النصفي)',
    'bank.type_asas': 'ASAS (التقييم التراكمي النهائي)',
    'bank.export_pdf_draft': 'تصدير مسودة الاختبار (PDF)',
    'bank.export_word_draft': 'تصدير مسودة الاختبار (Word)',
    'bank.total_questions': 'عدد الأسئلة',
    'bank.teacher_author': 'المعلم واضع الاختبار',
    'bank.duplicate': 'نسخ التقييم',
    'bank.delete_confirm': 'هل أنت متأكد من رغبتك في حذف وحدة التقييم هذه؟',

    // Assessment Modal
    'assessment.new_title': 'إنشاء وحدة تقييم جديدة',
    'assessment.edit_title': 'تعديل وحدة التقييم',
    'assessment.subject': 'المادة الدراسية',
    'assessment.class': 'الفصل / الشعبة',
    'assessment.grade_phase': 'المرحلة التعليمية',
    'assessment.teacher': 'المعلم القائم بالتدريس',
    'assessment.subject_kktp': 'معيار النجاح للمادة',
    'assessment.questions': 'قائمة بنود الأسئلة',
    'assessment.rubric': 'معايير وسلم التقدير ونموذج الإجابة',
    'assessment.teacher_notes': 'ملاحظات المعلم للإجابة / معايير إضافية (اختياري)',
    'assessment.teacher_notes_desc': 'تتم مقارنتها بنموذج الإجابة أثناء التصحيح بالذكاء الاصطناعي لتحقيق أعلى دقة.',
    'assessment.item_number': 'رقم السؤال',
    'assessment.item_question': 'نص السؤال',
    'assessment.item_key': 'نموذج الإجابة الصحيحة',
    'assessment.item_max_score': 'الدرجة القصوى',

    // Official Raport
    'raport.title': 'طباعة بطاقات درجات STS و SAS الرسمية',
    'raport.subtitle': 'تنسيق قياسي رسمي بحجم F4/Folio معتمد مع الترويسة والتوقيعات الرسمية.',
    'raport.preview_title': 'معاينة ورقة بطاقة الدرجات',
    'raport.student_list': 'قائمة الطلاب المقيدين',
    'raport.export_all_pdf': 'طباعة بطاقات جميع الطلاب (PDF)',
    'raport.signature_headmaster': 'مدير المدرسة',
    'raport.signature_teacher': 'معلم المادة',
    'raport.signature_homeroom': 'رائد الفصل',

    // Master Data
    'master.students_title': 'سجل بيانات الطلاب الأساسي',
    'master.students_subtitle': 'إدارة أرقام الطلاب والأسماء والفصول والجنس.',
    'master.add_student': 'إضافة طالب جديد',
    'master.classes_title': 'بيانات الفصول والمواد الدراسية',
    'master.classes_subtitle': 'إدارة الفصول ورواد الفصول ومعايير النجاح لكل مادة.',
    'master.teachers_title': 'إدارة حسابات المعلمين والصلاحيات',
    'master.teachers_subtitle': 'توزيع المواد الدراسية وبيانات تسجيل الدخول.',

    // Feedback
    'feedback.title': 'مركز ملاحظات واقتراحات المعلمين',
    'feedback.subtitle': 'أرسل ملاحظاتك أو طلب ميزات جديدة أو تجاربك التعليمية.',
    'feedback.send_btn': 'إرسال الملاحظات',
    'feedback.category': 'فئة الملاحظة',
    'feedback.rating': 'مستوى الرضا',
    'feedback.message': 'محتوى الملاحظة / المقترح',
    'feedback.success_toast': 'شكراً لك! تم إرسال ملاحظاتك بنجاح إلى مدير النظام.',

    // Login
    'auth.welcome': 'مرحباً بك في بوابة التقييمات',
    'auth.school_name': 'SMA NEGERI 3 TUMIJAJAR',
    'auth.subtitle': 'نظام تصحيح أوراق إجابات الطلاب برؤية الذكاء الاصطناعي فائقة الدقة',
    'auth.select_account': 'اختر حساب المعلم / تسجيل الدخول كمدير',
    'auth.pin_label': 'أدخل رمز PIN السري',
    'auth.login_btn': 'الدخول إلى النظام',
    'auth.admin_quick': 'الدخول السريع كمدير النظام',
  },
};

// Common Text Mapping for direct phrase lookup fallback
const PHRASE_LOOKUP: Record<string, Record<LanguageCode, string>> = {
  'Tutup': { ID: 'Tutup', EN: 'Close', CHN: '关闭', ARB: 'إغلاق' },
  'Batal': { ID: 'Batal', EN: 'Cancel', CHN: '取消', ARB: 'إلغاء' },
  'Simpan': { ID: 'Simpan', EN: 'Save', CHN: '保存', ARB: 'حفظ' },
  'Simpan Perubahan': { ID: 'Simpan Perubahan', EN: 'Save Changes', CHN: '保存修改', ARB: 'حفظ التغييرات' },
  'Hapus': { ID: 'Hapus', EN: 'Delete', CHN: '删除', ARB: 'حذف' },
  'Edit': { ID: 'Edit', EN: 'Edit', CHN: '编辑', ARB: 'تعديل' },
  'Kembali': { ID: 'Kembali', EN: 'Back', CHN: '返回', ARB: 'رجوع' },
  'Lanjut': { ID: 'Lanjut', EN: 'Next', CHN: '下一步', ARB: 'التالي' },
  'Selesai': { ID: 'Selesai', EN: 'Done', CHN: '完成', ARB: 'اكتمل' },
  'Semua': { ID: 'Semua', EN: 'All', CHN: '全部', ARB: 'الكل' },
  'Cari...': { ID: 'Cari...', EN: 'Search...', CHN: '搜索...', ARB: 'بحث...' },
  'Filter': { ID: 'Filter', EN: 'Filter', CHN: '筛选', ARB: 'تصفية' },
  'Ekspor CSV': { ID: 'Ekspor CSV', EN: 'Export CSV', CHN: '导出CSV', ARB: 'تصدير CSV' },
  'Unduh PDF': { ID: 'Unduh PDF', EN: 'Download PDF', CHN: '下载PDF', ARB: 'تحميل PDF' },
  'Cetak Dokumen': { ID: 'Cetak Dokumen', EN: 'Print Document', CHN: '打印文档', ARB: 'طباعة المستند' },
  'Pilih Bahasa': { ID: 'Pilih Bahasa', EN: 'Select Language', CHN: '选择语言', ARB: 'اختر اللغة' },
  'Pembelajaran Mendalam': { ID: 'Pembelajaran Mendalam', EN: 'Deep Learning', CHN: '深度学习', ARB: 'التعلم العميق' },
  'Pengaturan Sekolah': { ID: 'Pengaturan Sekolah', EN: 'School Settings', CHN: '学校设置', ARB: 'إعدادات المدرسة' },
  'Profil Saya': { ID: 'Profil Saya', EN: 'My Profile', CHN: '个人资料', ARB: 'ملفي الشخصي' },
  'Keluar Akun': { ID: 'Keluar Akun', EN: 'Sign Out', CHN: '退出登录', ARB: 'تسجيل الخروج' },
  'Tuntas': { ID: 'Tuntas', EN: 'Passed', CHN: '合格达标', ARB: 'ناجح / متقن' },
  'Remedial': { ID: 'Remedial', EN: 'Remedial', CHN: '需辅导补考', ARB: 'علاجي / غير متقن' },
  'Belum Dikoreksi': { ID: 'Belum Dikoreksi', EN: 'Ungraded', CHN: '未批改', ARB: 'غير مصحح' },
  'Foto Siap': { ID: 'Foto Siap', EN: 'Photo Ready', CHN: '照片就绪', ARB: 'الصورة جاهزة' },
};

interface LanguageContextType {
  language: LanguageCode;
  languageInfo: LanguageInfo;
  setLanguage: (lang: LanguageCode) => void;
  t: (keyOrPhrase: string, fallback?: string) => string;
  supportedLanguages: Record<LanguageCode, LanguageInfo>;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'smantri_selected_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('ID');

  const languageInfo = SUPPORTED_LANGUAGES.ID;
  const isRtl = false;

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  // Synchronize document direction and lang attribute for clean standard UI
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.setAttribute('lang', 'id');
      html.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl-layout');
      try {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      } catch (e) {}
    }
  }, []);

  const t = (keyOrPhrase: string, fallback?: string): string => {
    // 1. Direct key match in current language dictionary
    const dict = TRANSLATIONS[language];
    if (dict && dict[keyOrPhrase]) {
      return dict[keyOrPhrase];
    }

    // 2. Direct phrase lookup in common phrases
    if (PHRASE_LOOKUP[keyOrPhrase] && PHRASE_LOOKUP[keyOrPhrase][language]) {
      return PHRASE_LOOKUP[keyOrPhrase][language];
    }

    // 3. Fallback phrase lookup from fallback string if provided
    if (fallback && PHRASE_LOOKUP[fallback] && PHRASE_LOOKUP[fallback][language]) {
      return PHRASE_LOOKUP[fallback][language];
    }

    // 4. Fallback to Indonesian if key exists in ID dictionary
    const defaultDict = TRANSLATIONS.ID;
    if (defaultDict && defaultDict[keyOrPhrase]) {
      return defaultDict[keyOrPhrase];
    }

    return fallback !== undefined ? fallback : keyOrPhrase;
  };

  const value = useMemo(
    () => ({
      language,
      languageInfo,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      isRtl,
    }),
    [language, languageInfo, isRtl]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

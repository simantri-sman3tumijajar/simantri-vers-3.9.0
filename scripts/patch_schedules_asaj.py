with open('src/components/ExamSchedulesView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
if 'Smartphone' not in text:
    text = text.replace("import {\n  Calendar,", "import {\n  Calendar,\n  Smartphone,\n  GraduationCap,", 1)

# 2. Update scheduleForm initial state with sessionMode, sessions, and devicePolicy
old_state = """    durationMinutes: 90,
    tokenRequired: true,
    activationMode: 'scheduled' as 'manual' | 'scheduled',
    isManuallyActive: false,
    roomName: 'Ruang CBT Utama',
  });"""

new_state = """    durationMinutes: 90,
    tokenRequired: true,
    activationMode: 'scheduled' as 'manual' | 'scheduled',
    isManuallyActive: false,
    roomName: 'Ruang CBT Utama',
    sessionMode: 'non-session' as 'non-session' | 'multi-session',
    sessions: [
      {
        sessionNumber: 1,
        sessionName: 'Sesi 1 (Pagi)',
        startTime: '07:30',
        endTime: '09:30',
        token: 'ASAJ01',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-1'],
      },
      {
        sessionNumber: 2,
        sessionName: 'Sesi 2 (Siang)',
        startTime: '09:45',
        endTime: '11:45',
        token: 'ASAJ02',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-2'],
      },
      {
        sessionNumber: 3,
        sessionName: 'Sesi 3 (Sore)',
        startTime: '13:00',
        endTime: '15:00',
        token: 'ASAJ03',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-3'],
      },
    ] as any[],
    devicePolicy: 'hybrid' as 'android_only' | 'lab_client_only' | 'hybrid',
  });"""

if old_state in text:
    text = text.replace(old_state, new_state, 1)
    print('scheduleForm state updated')

# 3. Update handleSaveSchedule
old_save = """      status: scheduleForm.isManuallyActive ? 'Sedang Berlangsung' : 'Belum Dimulai',
      roomName: scheduleForm.roomName || 'Ruang CBT Utama',
    };"""

new_save = """      status: scheduleForm.isManuallyActive ? 'Sedang Berlangsung' : 'Belum Dimulai',
      roomName: scheduleForm.roomName || 'Ruang CBT Utama',
      sessionMode: scheduleForm.sessionMode,
      sessions: scheduleForm.sessionMode === 'multi-session' ? scheduleForm.sessions : undefined,
      devicePolicy: scheduleForm.devicePolicy,
    };"""

if old_save in text:
    text = text.replace(old_save, new_save, 1)
    print('handleSaveSchedule updated with sessions and devicePolicy')

# 4. Add ASAJ option in category dropdown
old_cat_opt = '<option value="ASAS">ASAS (Akhir Semester)</option>'
new_cat_opt = """<option value="ASAJ">ASAJ (Asesmen Sumatif Akhir Jenjang - Khusus Kelas XII)</option>
                        <option value="ASAS">ASAS (Akhir Semester)</option>"""
if old_cat_opt in text:
    text = text.replace(old_cat_opt, new_cat_opt, 1)
    print('ASAJ option added to category dropdown')

# 5. Add Auto-lock Kelas XII button in class selection
old_class_btns = """                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, targetClasses: classes.map((c) => c.nama) })}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-[11px] transition-colors"
                        >
                          Pilih Semua Kelas
                        </button>"""

new_class_btns = """                        {scheduleForm.category === 'ASAJ' && (
                          <button
                            type="button"
                            onClick={() => {
                              const grade12 = classes.filter((c) => /XII|12/i.test(c.nama)).map((c) => c.nama);
                              setScheduleForm({ ...scheduleForm, targetClasses: grade12 });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Kunci Khusus Kelas XII ({classes.filter((c) => /XII|12/i.test(c.nama)).length} Rombel)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, targetClasses: classes.map((c) => c.nama) })}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-[11px] transition-colors"
                        >
                          Pilih Semua Kelas
                        </button>"""

if old_class_btns in text:
    text = text.replace(old_class_btns, new_class_btns, 1)
    print('Auto-lock Kelas XII button added')

# 6. Add Mode Pengaturan Sesi & Kebijakan Perangkat in the form modal
target_before_token = '{/* Token Requirement Switch */}'
asaj_session_and_device_ui = """{/* KONFIGURASI SESI & KEBIJAKAN PERANGKAT (ASAJ & CBT) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 border border-indigo-200/90 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4.5 h-4.5 text-indigo-600" />
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                          Mode Pengaturan Sesi &amp; Kebijakan Perangkat
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-100 text-indigo-800">
                        Fleksibilitas Pelaksanaan
                      </span>
                    </div>

                    {/* Mode Pengaturan Sesi (Toggle Switch) */}
                    <div className="space-y-2">
                      <label className="block font-bold text-slate-800 text-xs">
                        Skema Pelaksanaan Sesi Ujian:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, sessionMode: 'non-session' })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            scheduleForm.sessionMode === 'non-session'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-black text-xs block mb-0.5">Mode Tanpa Sesi (Serentak)</span>
                          <span className={`text-[10.5px] block leading-tight ${scheduleForm.sessionMode === 'non-session' ? 'text-indigo-100' : 'text-slate-500'}`}>
                            Seluruh siswa mengerjakan di waktu yang sama tanpa pembagian sesi (cocok untuk HP Android BYOD).
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, sessionMode: 'multi-session' })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            scheduleForm.sessionMode === 'multi-session'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="font-black text-xs block mb-0.5">Mode Multi-Sesi (1, 2, 3 Sesi/Hari)</span>
                          <span className={`text-[10.5px] block leading-tight ${scheduleForm.sessionMode === 'multi-session' ? 'text-purple-100' : 'text-slate-500'}`}>
                            Bergantian menggunakan perangkat/lab sekolah (misal 3 sesi untuk 3 rombel Kelas XII).
                          </span>
                        </button>
                      </div>

                      {/* Detail Konfigurasi Multi-Sesi jika aktif */}
                      {scheduleForm.sessionMode === 'multi-session' && (
                        <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-3 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900">
                              Daftar Alokasi Sesi &amp; Rombel:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const grade12 = classes.filter((c) => /XII|12/i.test(c.nama)).map((c) => c.nama);
                                const updated = scheduleForm.sessions.map((s, idx) => ({
                                  ...s,
                                  assignedClasses: grade12[idx] ? [grade12[idx]] : s.assignedClasses,
                                }));
                                setScheduleForm({ ...scheduleForm, sessions: updated });
                              }}
                              className="px-2 py-1 rounded-md text-[10.5px] font-black bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                            >
                              Petakan 1 Kelas per Sesi Otomatis
                            </button>
                          </div>

                          <div className="space-y-2">
                            {scheduleForm.sessions.map((ses, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{ses.sessionName}</span>
                                  <span className="text-[10px] text-slate-500">Token: <strong className="text-purple-700">{ses.token}</strong></span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 block">Waktu Sesi:</span>
                                  <span className="font-bold text-slate-800">{ses.startTime} - {ses.endTime} WIB</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 block">Ruang Lab:</span>
                                  <span className="font-bold text-slate-800">{ses.roomName}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 block">Kelas Terpetakan:</span>
                                  <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10.5px]">
                                    {ses.assignedClasses?.join(', ') || 'Belum ada'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Kebijakan Perangkat (Device Policy) */}
                    <div className="space-y-2 pt-2 border-t border-indigo-100">
                      <label className="block font-bold text-slate-800 text-xs">
                        Kebijakan Perangkat &amp; Deteksi Otomatis:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, devicePolicy: 'android_only' })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            scheduleForm.devicePolicy === 'android_only'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs mb-0.5">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Khusus HP Android</span>
                          </div>
                          <span className={`text-[10px] block leading-tight ${scheduleForm.devicePolicy === 'android_only' ? 'text-emerald-100' : 'text-slate-500'}`}>
                            BYOD Siswa &bull; 1 HP terikat ke 1 Siswa (Proteksi Anti-Joki otomatis).
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, devicePolicy: 'lab_client_only' })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            scheduleForm.devicePolicy === 'lab_client_only'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs mb-0.5">
                            <Laptop className="w-3.5 h-3.5" />
                            <span>Klien Lab (Chromebook)</span>
                          </div>
                          <span className={`text-[10px] block leading-tight ${scheduleForm.devicePolicy === 'lab_client_only' ? 'text-blue-100' : 'text-slate-500'}`}>
                            Shared Lab Mode &bull; Dapat dipakai bergantian siswa antar-sesi.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, devicePolicy: 'hybrid' })}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            scheduleForm.devicePolicy === 'hybrid'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs mb-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mode Hibrida</span>
                          </div>
                          <span className={`text-[10px] block leading-tight ${scheduleForm.devicePolicy === 'hybrid' ? 'text-slate-300' : 'text-slate-500'}`}>
                            Izinkan HP Android maupun Laptop dengan telemetri otomatis.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  """

if target_before_token in text:
    text = text.replace(target_before_token, asaj_session_and_device_ui + target_before_token, 1)
    print('ASAJ session and device policy UI added to modal')

with open('src/components/ExamSchedulesView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('ExamSchedulesView.tsx successfully patched for ASAJ')

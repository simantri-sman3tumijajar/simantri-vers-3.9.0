with open('src/components/CreateAssessmentModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update CreateAssessmentModalProps initialJenis
old_props = "  initialJenis?: 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI';"
new_props = "  initialJenis?: 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI';"
text = text.replace(old_props, new_props, 1)

# 2. Update state declaration for jenis
old_jenis_state = "const [jenis, setJenis] = useState<'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' | 'SIMULASI'>(effectiveInitialJenis);"
new_jenis_state = """const [jenis, setJenis] = useState<'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI'>(effectiveInitialJenis);
  // ASAJ Specific States
  const [paketUjian, setPaketUjian] = useState<'Utama' | 'Susulan'>(initialData?.paketUjian || 'Utama');
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(initialData?.randomizeQuestions ?? true);
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(initialData?.randomizeOptions ?? true);
  const [validationStatus, setValidationStatus] = useState<'Draft' | 'Siap Uji / Tervalidasi' | 'Terjadwal'>(initialData?.validationStatus || 'Siap Uji / Tervalidasi');
  const [weights, setWeights] = useState({
    pg: initialData?.questionWeights?.pg ?? 50,
    pgKompleks: initialData?.questionWeights?.pgKompleks ?? 20,
    menjodohkan: initialData?.questionWeights?.menjodohkan ?? 15,
    isian: initialData?.questionWeights?.isian ?? 5,
    uraian: initialData?.questionWeights?.uraian ?? 10,
  });"""
text = text.replace(old_jenis_state, new_jenis_state, 1)

# 3. Add GraduationCap to lucide-react imports if not present
if 'GraduationCap' not in text:
    text = text.replace("Award,\n}", "Award,\n  GraduationCap,\n  Shuffle,\n  Sliders,\n}", 1)

# 4. Update newAssessment in handleSave
old_new_asm = """      const newAssessment: Assessment = {
        id: initialData?.id || `asm-${Date.now()}`,
        guruId: currentUser?.id,
        jenis,"""

new_new_asm = """      const newAssessment: Assessment = {
        id: initialData?.id || `asm-${Date.now()}`,
        guruId: currentUser?.id,
        jenis,
        paketUjian: jenis === 'ASAJ' ? paketUjian : undefined,
        randomizeQuestions,
        randomizeOptions,
        validationStatus: jenis === 'ASAJ' ? validationStatus : undefined,
        questionWeights: jenis === 'ASAJ' ? weights : undefined,"""
text = text.replace(old_new_asm, new_new_asm, 1)

# 5. Add ASAJ to judul generator
old_judul = "            ? `SIMULASI D'SMART LAMPUNG - KELAS XII T.P ${tahunAjaran}`"
new_judul = """            ? `ASAJ KELAS XII (UJIAN SEKOLAH) ${paketUjian.toUpperCase()} - ${mataPelajaran.toUpperCase()} T.P ${tahunAjaran}`
            : jenis === 'DSMART'
            ? `SIMULASI D'SMART LAMPUNG - KELAS XII T.P ${tahunAjaran}`"""
text = text.replace(old_judul, new_judul, 1)

# 6. Add ASAJ button in the tabs grid
old_grid = '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-1.5 bg-slate-100 rounded-2xl">'
new_grid = '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-1.5 bg-slate-100 rounded-2xl">'
text = text.replace(old_grid, new_grid, 1)

asaj_button = """              {/* Opsi ASAJ Khusus Kelas XII */}
              <button
                type="button"
                onClick={() => {
                  setJenis('ASAJ');
                  setFase('Fase F');
                  // Auto-lock to Grade XII classes
                  const grade12 = state.classes.filter((c) => /XII|12/i.test(c.nama)).map((c) => c.nama);
                  if (grade12.length > 0) {
                    setClassSelectionMode('multi');
                    setSelectedClasses(grade12);
                    setKelas(grade12[0]);
                  }
                  if (mataPelajaran.toLowerCase().includes("d'smart") || mataPelajaran.toLowerCase().includes("olimpiade")) {
                    setMataPelajaran(filteredSubjectsForTeacher[0]?.nama || '');
                  }
                  setPetunjukUmum("Pilihlah salah satu jawaban yang paling tepat (A, B, C, D, E) atau jawablah uraian dengan jelas dan cermat pada lembar jawaban CBT ASAJ Kelas XII SMAN 3 Tumijajar.");
                  showToast("Mode ASAJ Kelas XII", "Target rombel terkunci otomatis pada seluruh Kelas XII (Fase F).", "info");
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'ASAJ'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-amber-500" />
                <span>ASAJ Kelas XII</span>
              </button>"""

text = text.replace(new_grid, new_grid + "\n" + asaj_button, 1)

# 7. Add ASAJ Configuration Box right under the tabs
asaj_config_panel = """            {/* PANEL KHUSUS ASAJ KELAS XII: Paket, Validasi, Pengacakan, dan Bobot Soal */}
            {jenis === 'ASAJ' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-200/90 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                      <GraduationCap className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Konfigurasi Khusus ASAJ (Asesmen Sumatif Akhir Jenjang)
                      </h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Standar Ujian Sekolah Kelas XII &bull; Rombel Terkunci Otomatis ke Seluruh Kelas XII
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    Target: Kelas XII SMAN 3 Tumijajar
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Pilihan Paket Soal */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-800">
                      Pilihan Paket Ujian
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaketUjian('Utama')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          paketUjian === 'Utama'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Paket Utama
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaketUjian('Susulan')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          paketUjian === 'Susulan'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Paket Susulan
                      </button>
                    </div>
                  </div>

                  {/* Status Validasi Bank Soal */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5">
                    <label className="block text-[11px] font-extrabold text-slate-800">
                      Status Validasi Bank Soal
                    </label>
                    <select
                      value={validationStatus}
                      onChange={(e) => setValidationStatus(e.target.value as any)}
                      className="w-full py-1.5 px-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-800 focus:outline-hidden"
                    >
                      <option value="Draft">Draft (Sedang Disusun)</option>
                      <option value="Siap Uji / Tervalidasi">Siap Uji / Tervalidasi (Kurikulum)</option>
                      <option value="Terjadwal">Terjadwal (Siap di Jadwal CBT)</option>
                    </select>
                  </div>

                  {/* Opsi Pengacakan Butir & Jawaban */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-2">
                    <label className="block text-[11px] font-extrabold text-slate-800">
                      Opsi Pengacakan (Anti-Joki/Curang)
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={randomizeQuestions}
                          onChange={(e) => setRandomizeQuestions(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Acak Urutan Soal per Siswa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={randomizeOptions}
                          onChange={(e) => setRandomizeOptions(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Acak Opsi Jawaban (A-E)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bobot Proporsi Tipe Soal (Total = 100%) */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] font-extrabold text-slate-800">
                      Proporsi &amp; Bobot Penilaian Soal (Total Otomatis Tervalidasi 100%)
                    </label>
                    {weights.pg + weights.pgKompleks + weights.menjodohkan + weights.isian + weights.uraian === 100 ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Total: 100% (Valid)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Total: {weights.pg + weights.pgKompleks + weights.menjodohkan + weights.isian + weights.uraian}% (Harus 100%)</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold mb-1">PG Biasa</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights.pg}
                        onChange={(e) => setWeights({ ...weights, pg: Number(e.target.value) || 0 })}
                        className="w-full text-center font-black text-slate-800 bg-white border border-slate-200 rounded py-0.5"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">%</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold mb-1">PG Kompleks</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights.pgKompleks}
                        onChange={(e) => setWeights({ ...weights, pgKompleks: Number(e.target.value) || 0 })}
                        className="w-full text-center font-black text-slate-800 bg-white border border-slate-200 rounded py-0.5"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">%</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold mb-1">Menjodohkan</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights.menjodohkan}
                        onChange={(e) => setWeights({ ...weights, menjodohkan: Number(e.target.value) || 0 })}
                        className="w-full text-center font-black text-slate-800 bg-white border border-slate-200 rounded py-0.5"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">%</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold mb-1">Isian Singkat</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights.isian}
                        onChange={(e) => setWeights({ ...weights, isian: Number(e.target.value) || 0 })}
                        className="w-full text-center font-black text-slate-800 bg-white border border-slate-200 rounded py-0.5"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">%</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold mb-1">Uraian / Essay</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights.uraian}
                        onChange={(e) => setWeights({ ...weights, uraian: Number(e.target.value) || 0 })}
                        className="w-full text-center font-black text-slate-800 bg-white border border-slate-200 rounded py-0.5"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}"""

# Insert panel right after closing </div> of the tabs
target_closing_div = '                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${'
# Let's find the closing tag of the tabs grid
target_end_tabs = '            </div>\n\n            {/* DSMART Prompt & Payload Quick Helper */}'
if target_end_tabs in text:
    text = text.replace(target_end_tabs, '            </div>\n\n' + asaj_config_panel + '\n\n            {/* DSMART Prompt & Payload Quick Helper */}', 1)
    print('ASAJ config panel inserted')
else:
    print('target_end_tabs not found, inserting before basic info')
    text = text.replace('{/* Basic Info Form */}\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">', asaj_config_panel + '\n\n            {/* Basic Info Form */}\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">', 1)
    print('ASAJ config panel inserted before Basic Info Form')

with open('src/components/CreateAssessmentModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('CreateAssessmentModal.tsx successfully patched for ASAJ')

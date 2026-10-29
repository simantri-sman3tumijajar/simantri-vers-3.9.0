with open('src/components/ProctorMonitorDashboard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add session filter state
old_state = "  const [searchQuery, setSearchQuery] = useState<string>('');"
new_state = """  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');"""
text = text.replace(old_state, new_state, 1)

# 2. Add handleResetDeviceBinding
old_action_marker = "  // ACTION 3: Force Submit (Paksa Selesai)"
new_action_code = """  // ACTION 4: Reset Ikatan Perangkat HP Android (Anti-Joki Rebind)
  const handleResetDeviceBinding = async (docData: ExamActivityLogDoc) => {
    const confirmReset = window.confirm(
      `Reset Ikatan Perangkat (Device Binding) Siswa "${docData.studentName}"?\\n\\nHP Android lama akan dilepas ikatannya sehingga siswa dapat login kembali menggunakan HP baru atau Chromebook cadangan. Lanjutkan?`
    );
    if (!confirmReset) return;

    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', docData.id);
        await updateDoc(docRef, {
          boundStudentId: null,
          boundStudentName: null,
          deviceFingerprint: null,
          deviceType: null,
          deviceDetails: 'Ikatan Perangkat Direset oleh Proktor',
          warningMessage: 'Ikatan perangkat telah direset oleh Proktor. Silakan login kembali di perangkat baru.',
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Ikatan Perangkat Direset',
        `Perangkat HP untuk siswa ${docData.studentName} berhasil dilepas dari ikatan.`,
        'success'
      );
    } catch (err) {
      console.warn('Error resetting device binding:', err);
      showToast('Gagal Mereset Ikatan', 'Pastikan koneksi internet proktor aktif.', 'error');
    }
  };

  // ACTION 3: Force Submit (Paksa Selesai)"""

text = text.replace(old_action_marker, new_action_code, 1)

# 3. Update filter logic for ASAJ and Sesi
old_type_filter = """      // Exam Type filter (CBT vs LITNUM)
      if (examTypeFilter !== 'ALL') {
        const itemType = (item.examType || 'CBT').toUpperCase();
        if (examTypeFilter === 'LITNUM' && !itemType.includes('LITNUM')) return false;
        if (examTypeFilter === 'CBT' && itemType.includes('LITNUM')) return false;
      }"""

new_type_filter = """      // Exam Type filter (ASAJ, CBT, LITNUM)
      if (examTypeFilter !== 'ALL') {
        const itemType = (item.examType || 'CBT').toUpperCase();
        if (examTypeFilter === 'ASAJ' && !itemType.includes('ASAJ')) return false;
        if (examTypeFilter === 'LITNUM' && !itemType.includes('LITNUM')) return false;
        if (examTypeFilter === 'CBT' && (itemType.includes('LITNUM') || itemType.includes('ASAJ'))) return false;
      }

      // Sesi filter (Sesi 1, Sesi 2, Sesi 3, Non-Sesi)
      if (selectedSessionFilter !== 'ALL') {
        if (selectedSessionFilter === 'NON_SESSION') {
          if (item.sessionNumber && item.sessionNumber > 0) return false;
        } else {
          if (String(item.sessionNumber) !== selectedSessionFilter) return false;
        }
      }"""

text = text.replace(old_type_filter, new_type_filter, 1)

# 4. Add ASAJ and Sesi dropdowns in the filter bar
old_select_exam = """              <option value="ALL">Semua (CBT &amp; LitNum)</option>
              <option value="CBT">Ujian CBT Reguler</option>
              <option value="LITNUM">Asesmen LitNum Mingguan</option>"""

new_select_exam = """              <option value="ALL">Semua Jenis Ujian</option>
              <option value="ASAJ">ASAJ (Kelas XII)</option>
              <option value="CBT">Ujian CBT Reguler</option>
              <option value="LITNUM">Asesmen LitNum Mingguan</option>"""

text = text.replace(old_select_exam, new_select_exam, 1)

# Add Sesi dropdown right after Exam Type dropdown
old_filter_div = """          {/* Status & Color Filter */}
          <div className="flex items-center gap-1.5">"""

sesi_filter_div = """          {/* Filter Sesi Ujian */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Sesi:</span>
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Sesi</option>
              <option value="1">Sesi 1 (Pagi)</option>
              <option value="2">Sesi 2 (Siang)</option>
              <option value="3">Sesi 3 (Sore)</option>
              <option value="NON_SESSION">Mode Non-Sesi (Serentak)</option>
            </select>
          </div>

          {/* Status & Color Filter */}
          <div className="flex items-center gap-1.5">"""

text = text.replace(old_filter_div, sesi_filter_div, 1)

# 5. Add Device indicator and Reset Binding button to student cards
old_dev_metric = """                {/* Device & Violation Metric */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{item.deviceInfo || 'Mobile Web'}</span>
                  </div>"""

new_dev_metric = """                {/* Device & Violation Metric with Real-Time Hardware Indicator */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                    {item.deviceType === 'chromebook' || (item.deviceInfo || '').toLowerCase().includes('chromebook') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200 truncate" title="Klien Lab Chromebook">
                        <Laptop className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">Chromebook Lab</span>
                      </span>
                    ) : item.deviceType === 'laptop' || (item.deviceInfo || '').toLowerCase().includes('laptop') || (item.deviceInfo || '').toLowerCase().includes('windows') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 truncate" title="Laptop / PC Client">
                        <Laptop className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Laptop/PC Lab</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 truncate" title={`HP Android Terikat: ${item.boundStudentName || item.studentName}`}>
                        <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Android (Terikat)</span>
                      </span>
                    )}
                  </div>"""

text = text.replace(old_dev_metric, new_dev_metric, 1)

# Add Reset Ikatan button in the action footer
old_actions_footer = """                    {/* Action: Force Submit */}
                    <button
                      type="button"
                      onClick={() => handleForceSubmit(item)}"""

new_actions_footer = """                    {/* Action: Reset Ikatan Perangkat (Unbind) */}
                    <button
                      type="button"
                      onClick={() => handleResetDeviceBinding(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10.5px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Reset Ikatan HP jika baterai habis atau siswa ganti perangkat"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Reset HP</span>
                    </button>

                    {/* Action: Force Submit */}
                    <button
                      type="button"
                      onClick={() => handleForceSubmit(item)}"""

text = text.replace(old_actions_footer, new_actions_footer, 1)

with open('src/components/ProctorMonitorDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('ProctorMonitorDashboard.tsx successfully patched for ASAJ, Sessions, and Device Telemetry')

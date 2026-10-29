with open('src/components/ExamSchedulesView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

needle = """                    {/* Category Badge */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                      {sch.category}
                    </span>"""

replacement = """                    {/* Category Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                      sch.category === 'ASAJ'
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-purple-100 text-purple-900 border-purple-200'
                    }`}>
                      {sch.category === 'ASAJ' ? 'ASAJ (Kelas XII)' : sch.category}
                    </span>

                    {/* Sesi Mode Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      sch.sessionMode === 'multi-session'
                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {sch.sessionMode === 'multi-session' ? `Multi-Sesi (${sch.sessions?.length || 3} Sesi)` : 'Serentak (Non-Sesi)'}
                    </span>

                    {/* Device Policy Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      sch.devicePolicy === 'android_only'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : sch.devicePolicy === 'lab_client_only'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {sch.devicePolicy === 'android_only' ? (
                        <>
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                          <span>BYOD HP Android</span>
                        </>
                      ) : sch.devicePolicy === 'lab_client_only' ? (
                        <>
                          <Laptop className="w-3 h-3 text-blue-600" />
                          <span>Klien Lab Chromebook</span>
                        </>
                      ) : (
                        <span>Hibrida</span>
                      )}
                    </span>"""

if needle in text:
    text = text.replace(needle, replacement, 1)
    with open('src/components/ExamSchedulesView.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Card badges patched successfully')

with open('src/components/AssessmentBankView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update filterType state definition
old_ft = "const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade'>('ALL');"
new_ft = "const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade'>('ALL');"
text = text.replace(old_ft, new_ft, 1)

# 2. Add GraduationCap to imports
if 'GraduationCap' not in text:
    text = text.replace("import {\n  FileQuestion,", "import {\n  GraduationCap,\n  FileQuestion,", 1)

# 3. Add ASAJ filter button
old_btn = "            <button\n              onClick={() => setFilterType('DSMART')}"
new_btn = """            <button
              onClick={() => setFilterType('ASAJ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ASAJ'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>ASAJ (Kelas XII)</span>
            </button>
            <button
              onClick={() => setFilterType('DSMART')}"""

text = text.replace(old_btn, new_btn, 1)

# 4. Display ASAJ & validation badge on assessment cards
card_badge_needle = """                  <span className="font-bold text-xs text-slate-800">
                    {a.jenis === 'ASTS' ? 'ASTS (Essay)' : a.jenis === 'ASAS' ? 'ASAS (PG)' : a.jenis === 'DSMART' ? "Simulasi D'SMART" : a.jenis === 'Olimpiade' ? 'Olimpiade' : 'Asesmen'}
                  </span>"""

card_badge_new = """                  <span className="font-bold text-xs text-slate-800">
                    {a.jenis === 'ASAJ' ? 'ASAJ (Kelas XII)' : a.jenis === 'ASTS' ? 'ASTS (Essay)' : a.jenis === 'ASAS' ? 'ASAS (PG)' : a.jenis === 'DSMART' ? "Simulasi D'SMART" : a.jenis === 'Olimpiade' ? 'Olimpiade' : 'Asesmen'}
                  </span>
                  {a.jenis === 'ASAJ' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300">
                      Paket {a.paketUjian || 'Utama'} &bull; {a.validationStatus || 'Siap Uji'}
                    </span>
                  )}"""

if card_badge_needle in text:
    text = text.replace(card_badge_needle, card_badge_new, 1)

with open('src/components/AssessmentBankView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('AssessmentBankView successfully patched for ASAJ filter and badges')

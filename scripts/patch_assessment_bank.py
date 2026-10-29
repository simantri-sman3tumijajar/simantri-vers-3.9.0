with open('src/components/AssessmentBankView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Import TeacherQuestionAssignmentsPanel
if 'TeacherQuestionAssignmentsPanel' not in text:
    old_imp = "import { TemplateGuideModal } from './TemplateGuideModal';"
    new_imp = "import { TemplateGuideModal } from './TemplateGuideModal';\nimport { TeacherQuestionAssignmentsPanel } from './TeacherQuestionAssignmentsPanel';"
    text = text.replace(old_imp, new_imp, 1)

# 2. Add bankTab state
if 'bankTab' not in text:
    old_state = "  const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade'>('ALL');"
    new_state = "  const [bankTab, setBankTab] = useState<'PACKAGES' | 'ASSIGNMENTS'>('PACKAGES');\n  const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade'>('ALL');"
    text = text.replace(old_state, new_state, 1)

# 3. Insert Tab Switcher right before {/* Banner Sesi Ujian Aktif Ditetapkan Sekolah */}
tab_code = """      {/* Tab Switcher: Paket Bank Soal vs Tugas Pembuatan Soal Guru (Multi-Role) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setBankTab('PACKAGES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            bankTab === 'PACKAGES'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Paket Asesmen &amp; Bank Soal ({allList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setBankTab('ASSIGNMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            bankTab === 'ASSIGNMENTS'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Tugas Pembuatan Soal ({state.examManagement?.teacherAssignments?.length || 0})</span>
        </button>
      </div>

      {bankTab === 'ASSIGNMENTS' ? (
        <TeacherQuestionAssignmentsPanel
          onStartCrafting={(asgn) => {
            setEditingAssessment(null);
            setIsCreateModalOpen(true);
          }}
        />
      ) : (
        <>"""

old_banner_loc = "      {/* Banner Sesi Ujian Aktif Ditetapkan Sekolah */}"
if tab_code not in text and old_banner_loc in text:
    text = text.replace(old_banner_loc, tab_code + "\n      " + old_banner_loc, 1)

# 4. Close the <> fragment before the modals
old_modals = "      {/* Create / Edit Assessment Modal */}"
new_modals = "        </>\n      )}\n\n      {/* Create / Edit Assessment Modal */}"
if '</>' not in text and old_modals in text:
    text = text.replace(old_modals, new_modals, 1)

with open('src/components/AssessmentBankView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('AssessmentBankView successfully patched with Teacher Question Assignments Panel')

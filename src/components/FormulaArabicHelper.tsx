import React, { useState } from 'react';
import { BookOpen, Calculator, Atom, FlaskConical, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface FormulaArabicHelperProps {
  onInsert: (value: string) => void;
  compact?: boolean;
}

export const ARABIC_HIJAIYAH = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش',
  'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ',
  'و', 'ي', 'ء', 'ة', 'ى', 'ئ', 'ؤ', 'لا'
];

export const ARABIC_HARAKAT = [
  { char: '\u064E', name: 'Fathah' },
  { char: '\u0650', name: 'Kasrah' },
  { char: '\u064F', name: 'Dhammah' },
  { char: '\u064B', name: 'Tanwin Fathah' },
  { char: '\u064D', name: 'Tanwin Kasrah' },
  { char: '\u064C', name: 'Tanwin Dhammah' },
  { char: '\u0652', name: 'Sukun' },
  { char: '\u0651', name: 'Tasydid' },
  { char: '\u0670', name: 'Alif Khanjariyah' },
];

export const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export const ARABIC_PHRASES = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ',
  'الحَمْدُ لِلَّهِ رَبِّ العَالَمِينَ',
  'سُبْحَانَ اللَّهِ',
  'اللهُ أَكْبَرُ',
  'لَا إِلٰهَ إِلَّا اللّٰهُ',
  'صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ',
  'رَضِيَ اللَّهُ عَنْهُ',
  'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ',
  'أَسْتَغْفِرُ اللَّهَ العَظِيمَ',
  'مَا شَاءَ اللَّهُ',
  'جَزَاكُمُ اللهُ خَيْرًا',
  '۝',
  '۞',
  'ۖ',
  'ۗ',
  'ۚ',
];

export const MATH_SYMBOLS = [
  '√x', '∛x', 'x²', 'x³', 'xⁿ', 'a/b', '±', '≠', '≤', '≥', '≈', '½', '¼', '¾',
  'π', '∞', '∑', '∫', '∂', 'lim', 'log', 'ln', 'sin', 'cos', 'tan',
  'θ', 'α', 'β', 'γ', 'λ', 'μ', 'σ', 'Δ', '°'
];

export const PHYSICS_SYMBOLS = [
  'F=ma', 'E=mc²', 'v=s/t', 'P=W/t', 'V=IR', 'W=F·s', 'Ek=½mv²', 'Ep=mgh',
  'Ω', 'μm', 'm/s²', 'kg·m/s', 'J', 'W', 'N', 'Hz', 'Pa', 'C', 'V', 'T',
  'ρ', 'ω', 'τ', 'ε', 'Φ', 'Ψ'
];

export const CHEMISTRY_SYMBOLS = [
  'H₂O', 'CO₂', 'O₂', 'N₂', 'H₂SO₄', 'NaCl', 'HCl', 'NaOH', 'C₆H₁₂O₆',
  'CH₄', 'NH₃', 'Fe²⁺', 'Fe³⁺', 'SO₄²⁻', 'OH⁻', 'H⁺', 'Ca²⁺', 'Cl⁻',
  '→', '⇄', '⇌', 'ΔH', 'pH', 'pOH', 'mol/L', '°C', '(s)', '(l)', '(g)', '(aq)'
];

export const FormulaArabicHelper: React.FC<FormulaArabicHelperProps> = ({ onInsert, compact = false }) => {
  const [activeTab, setActiveTab] = useState<'arab' | 'math' | 'physics' | 'chem'>('arab');
  const [arabicSubTab, setArabicSubTab] = useState<'hijaiyah' | 'harakat' | 'phrases' | 'angka'>('hijaiyah');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCharClick = (val: string) => {
    onInsert(val);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('arab')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'arab' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <span>Arab / PAI</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('math')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'math' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <span>MTK</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('physics')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'physics' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-sky-700'
            }`}
          >
            <span>Fisika</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chem')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'chem' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <span>Kimia</span>
          </button>
        </div>

        {/* Quick Chips preview */}
        <div className="flex flex-wrap items-center gap-1 max-w-full overflow-x-auto py-0.5">
          {activeTab === 'arab' && (
            <>
              {['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'س', 'ص', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'و', 'ي'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCharClick(c)}
                  className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-200 text-emerald-900 border border-emerald-200 font-bold text-xs rounded transition-colors cursor-pointer"
                  title={`Sisipkan huruf ${c}`}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded cursor-pointer"
              >
                {isExpanded ? 'Tutup Papan' : '+ Arab Lengkap & Harakat'}
              </button>
            </>
          )}

          {activeTab === 'math' && (
            MATH_SYMBOLS.slice(0, 12).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCharClick(` ${s} `)}
                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-200 text-indigo-900 border border-indigo-200 font-extrabold text-[10px] rounded transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))
          )}

          {activeTab === 'physics' && (
            PHYSICS_SYMBOLS.slice(0, 10).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCharClick(` ${s} `)}
                className="px-1.5 py-0.5 bg-sky-50 hover:bg-sky-200 text-sky-900 border border-sky-200 font-extrabold text-[10px] rounded transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))
          )}

          {activeTab === 'chem' && (
            CHEMISTRY_SYMBOLS.slice(0, 10).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleCharClick(` ${s} `)}
                className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-200 text-purple-900 border border-purple-200 font-extrabold text-[10px] rounded transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))
          )}
        </div>

        {/* Expandable Drawer if activeTab === 'arab' && isExpanded */}
        {activeTab === 'arab' && isExpanded && (
          <div className="w-full mt-2 p-3 bg-emerald-50/70 border border-emerald-300 rounded-2xl shadow-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                <span>Papan Karakter Arab Lengkap (Pendidikan Agama Islam)</span>
              </span>
              <div className="flex items-center gap-1">
                {(['hijaiyah', 'harakat', 'phrases', 'angka'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setArabicSubTab(sub)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                      arabicSubTab === sub
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {sub === 'phrases' ? 'Frasa/Lafaz' : sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Hijaiyah */}
            {arabicSubTab === 'hijaiyah' && (
              <div className="grid grid-cols-11 sm:grid-cols-17 gap-1" dir="rtl">
                {ARABIC_HIJAIYAH.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleCharClick(h)}
                    className="p-1.5 bg-white hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg text-center font-bold text-sm text-slate-900 transition-colors cursor-pointer shadow-2xs"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {/* Harakat */}
            {arabicSubTab === 'harakat' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {ARABIC_HARAKAT.map((hk) => (
                  <button
                    key={hk.name}
                    type="button"
                    onClick={() => handleCharClick(hk.char)}
                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-center font-bold text-xs text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title={`Sisipkan ${hk.name}`}
                  >
                    <span className="text-base text-emerald-800 font-extrabold bg-emerald-50 px-1 rounded">ـ{hk.char}</span>
                    <span className="text-[10px] text-slate-600">{hk.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Phrases */}
            {arabicSubTab === 'phrases' && (
              <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
                {ARABIC_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleCharClick(` ${phrase} `)}
                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center font-bold text-xs text-emerald-950 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <span>{phrase}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Angka */}
            {arabicSubTab === 'angka' && (
              <div className="flex items-center gap-1.5">
                {ARABIC_NUMERALS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleCharClick(n)}
                    className="w-8 h-8 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-center font-bold text-sm text-emerald-900 transition-colors cursor-pointer shadow-2xs"
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full View Helper
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('arab')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'arab'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pendidikan Agama Islam (Arab)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('math')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'math'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Matematika</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('physics')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'physics'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-sky-700'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Fisika</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chem')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'chem'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Kimia</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-semibold">
          Klik untuk langsung menyisipkan ke butir soal
        </span>
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'arab' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            {(['hijaiyah', 'harakat', 'phrases', 'angka'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setArabicSubTab(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                  arabicSubTab === sub
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {sub === 'phrases' ? 'Frasa / Potongan Ayat' : sub}
              </button>
            ))}
          </div>

          {arabicSubTab === 'hijaiyah' && (
            <div className="grid grid-cols-11 sm:grid-cols-17 gap-1.5" dir="rtl">
              {ARABIC_HIJAIYAH.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleCharClick(h)}
                  className="h-10 bg-emerald-50/50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center font-bold text-base text-slate-900 transition-all cursor-pointer shadow-2xs hover:scale-105"
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          {arabicSubTab === 'harakat' && (
            <div className="flex flex-wrap items-center gap-2">
              {ARABIC_HARAKAT.map((hk) => (
                <button
                  key={hk.name}
                  type="button"
                  onClick={() => handleCharClick(hk.char)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center font-bold text-xs text-slate-800 transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  <span className="text-xl text-emerald-800 font-extrabold bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                    ـ{hk.char}
                  </span>
                  <span className="text-xs text-slate-700 font-semibold">{hk.name}</span>
                </button>
              ))}
            </div>
          )}

          {arabicSubTab === 'phrases' && (
            <div className="flex flex-wrap items-center gap-2" dir="rtl">
              {ARABIC_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleCharClick(` ${phrase} `)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center font-bold text-sm text-emerald-950 transition-colors cursor-pointer shadow-2xs hover:scale-102"
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {arabicSubTab === 'angka' && (
            <div className="flex items-center gap-2">
              {ARABIC_NUMERALS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleCharClick(n)}
                  className="w-10 h-10 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-center font-bold text-base text-emerald-900 transition-colors cursor-pointer shadow-2xs"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'math' && (
        <div className="flex flex-wrap gap-1.5">
          {MATH_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleCharClick(` ${sym} `)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 font-extrabold text-xs rounded-xl cursor-pointer shadow-2xs hover:scale-105 transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'physics' && (
        <div className="flex flex-wrap gap-1.5">
          {PHYSICS_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleCharClick(` ${sym} `)}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-950 border border-sky-200 font-extrabold text-xs rounded-xl cursor-pointer shadow-2xs hover:scale-105 transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'chem' && (
        <div className="flex flex-wrap gap-1.5">
          {CHEMISTRY_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleCharClick(` ${sym} `)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-extrabold text-xs rounded-xl cursor-pointer shadow-2xs hover:scale-105 transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

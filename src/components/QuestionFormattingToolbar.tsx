import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  ListOrdered,
  List,
  Sparkles,
  ChevronDown,
  Sigma,
  Eye,
  EyeOff,
  Type,
  Check,
  Highlighter,
  RotateCcw,
  Eraser,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { FormattedQuestionText, normalizeFormattedString } from './FormattedQuestionText';
import {
  ARABIC_HIJAIYAH,
  ARABIC_HARAKAT,
  ARABIC_PHRASES,
  MATH_SYMBOLS,
  PHYSICS_SYMBOLS,
  CHEMISTRY_SYMBOLS,
} from './FormulaArabicHelper';

export interface QuestionFormattingToolbarProps {
  value: string;
  onChange: (newValue: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
  showPreviewToggle?: boolean;
  onInsertImagePrompt?: () => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
}

export type NumberingModel =
  | '1_dot'      // 1. 2. 3.
  | 'a_dot'      // a. b. c.
  | 'A_dot'      // A. B. C.
  | '1_paren'    // 1) 2) 3)
  | 'a_paren'    // a) b) c)
  | 'A_paren'    // A) B) C)
  | 'paren_1'    // (1) (2) (3)
  | 'paren_a'    // (a) (b) (c)
  | 'paren_A'    // (A) (B) (C)
  | 'i_dot'      // i. ii. iii.
  | 'I_dot'      // I. II. III.
  | 'paren_i'    // (i) (ii) (iii)
  | 'bullet'     // • • •
  | 'diamond'    // ◆ ◆ ◆
  | 'check';     // ✓ ✓ ✓

export const NUMBERING_MODELS: {
  id: NumberingModel;
  label: string;
  example: string;
  prefixGen: (index: number) => string;
}[] = [
  {
    id: '1_dot',
    label: '1. Angka Titik',
    example: '1. ... 2. ... 3. ...',
    prefixGen: (i) => `${i + 1}. `,
  },
  {
    id: 'a_dot',
    label: 'a. Huruf Kecil Titik',
    example: 'a. ... b. ... c. ...',
    prefixGen: (i) => `${String.fromCharCode(97 + (i % 26))}. `,
  },
  {
    id: 'A_dot',
    label: 'A. Huruf Kapital Titik',
    example: 'A. ... B. ... C. ...',
    prefixGen: (i) => `${String.fromCharCode(65 + (i % 26))}. `,
  },
  {
    id: '1_paren',
    label: '1) Angka Kurung Tutup',
    example: '1) ... 2) ... 3) ...',
    prefixGen: (i) => `${i + 1}) `,
  },
  {
    id: 'a_paren',
    label: 'a) Huruf Kecil Kurung Tutup',
    example: 'a) ... b) ... c) ...',
    prefixGen: (i) => `${String.fromCharCode(97 + (i % 26))}) `,
  },
  {
    id: 'A_paren',
    label: 'A) Huruf Kapital Kurung Tutup',
    example: 'A) ... B) ... C) ...',
    prefixGen: (i) => `${String.fromCharCode(65 + (i % 26))}) `,
  },
  {
    id: 'paren_1',
    label: '(1) Angka Dalam Kurung',
    example: '(1) ... (2) ... (3) ...',
    prefixGen: (i) => `(${i + 1}) `,
  },
  {
    id: 'paren_a',
    label: '(a) Huruf Kecil Dalam Kurung',
    example: '(a) ... (b) ... (c) ...',
    prefixGen: (i) => `(${String.fromCharCode(97 + (i % 26))}) `,
  },
  {
    id: 'paren_A',
    label: '(A) Huruf Kapital Dalam Kurung',
    example: '(A) ... (B) ... (C) ...',
    prefixGen: (i) => `(${String.fromCharCode(65 + (i % 26))}) `,
  },
  {
    id: 'i_dot',
    label: 'i. Romawi Kecil Titik',
    example: 'i. ... ii. ... iii. ...',
    prefixGen: (i) => {
      const rom = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return `${rom[i % rom.length]}. `;
    },
  },
  {
    id: 'I_dot',
    label: 'I. Romawi Kapital Titik',
    example: 'I. ... II. ... III. ...',
    prefixGen: (i) => {
      const rom = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      return `${rom[i % rom.length]}. `;
    },
  },
  {
    id: 'paren_i',
    label: '(i) Romawi Dalam Kurung',
    example: '(i) ... (ii) ... (iii) ...',
    prefixGen: (i) => {
      const rom = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return `(${rom[i % rom.length]}) `;
    },
  },
  {
    id: 'bullet',
    label: '• Poin Bullet',
    example: '• ... • ... • ...',
    prefixGen: () => '• ',
  },
  {
    id: 'diamond',
    label: '◆ Poin Berlian',
    example: '◆ ... ◆ ... ◆ ...',
    prefixGen: () => '◆ ',
  },
  {
    id: 'check',
    label: '✓ Tanda Centang Checklist',
    example: '✓ ... ✓ ... ✓ ...',
    prefixGen: () => '✓ ',
  },
];

/**
 * Converts raw markdown syntax or repeated asterisks (e.g. ********teks********)
 * into real HTML elements so users see genuine visual formatting without asterisks.
 */
export function convertMarkdownToHtml(raw: string): string {
  if (!raw) return '';
  let out = normalizeFormattedString(raw);

  // If plain newlines exist without HTML paragraph/div wrappers, convert \n to <br>
  if (!out.includes('<p>') && !out.includes('<div>') && out.includes('\n')) {
    out = out.replace(/\n/g, '<br>');
  }

  return out;
}

/**
 * Sanitizes HTML from contentEditable before sending to parent state.
 */
export function cleanEditorHtml(html: string): string {
  if (!html) return '';
  const trimmed = html.trim();
  if (
    trimmed === '<br>' ||
    trimmed === '<p><br></p>' ||
    trimmed === '<div><br></div>' ||
    trimmed === '<p></p>' ||
    trimmed === '<div></div>'
  ) {
    return '';
  }
  return trimmed;
}

export const QuestionFormattingToolbar: React.FC<QuestionFormattingToolbarProps> = ({
  value,
  onChange,
  textareaRef: externalTextareaRef,
  compact = false,
  showPreviewToggle = true,
  onInsertImagePrompt,
  placeholder = 'Ketik isi butir soal di sini (dukung Bold Ctrl+B, Italic Ctrl+I, Underline Ctrl+U, penomoran berurutan & rumus)...',
  rows = 3,
  minHeight,
  maxHeight = '280px',
  className = '',
  dir = 'auto',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showNumberingMenu, setShowNumberingMenu] = useState(false);
  const [showSymbolMenu, setShowSymbolMenu] = useState(false);
  const [activeSymbolTab, setActiveSymbolTab] = useState<'math' | 'physics' | 'chemistry' | 'arabic'>('math');
  const [showPreview, setShowPreview] = useState(false);

  // Active command states to highlight toolbar buttons when cursor is inside formatted text
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
  });

  const updateActiveStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        subscript: document.queryCommandState('subscript'),
        superscript: document.queryCommandState('superscript'),
      });
    } catch (e) {}
  }, []);

  // Synchronize incoming value into editor HTML
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const targetHtml = convertMarkdownToHtml(value || '');

    // Only update innerHTML if it's different and user is not actively typing/focused
    if (targetHtml !== currentHtml && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = targetHtml;
    }
  }, [value]);

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = cleanEditorHtml(editorRef.current.innerHTML);
    onChange(html);
    updateActiveStyles();
  };

  /**
   * Execute browser formatting command on selected text in visual editor.
   * Uses e.preventDefault() on toolbar buttons so selection is preserved!
   */
  const executeFormatCommand = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    try {
      document.execCommand(command, false, arg);
    } catch (err) {
      console.warn('execCommand failed:', err);
    }
    handleEditorInput();
    updateActiveStyles();
  };

  /**
   * Keyboard shortcuts handler:
   * Ctrl + B -> Bold
   * Ctrl + I -> Italic
   * Ctrl + U -> Underline
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeFormatCommand('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        executeFormatCommand('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        executeFormatCommand('underline');
        return;
      }
    }

    // Tab key inserts 4 spaces or indents
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
      handleEditorInput();
    }
  };

  /**
   * Insert HTML snippet at current caret position
   */
  const insertHtmlAtCursor = (html: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (editorRef.current) {
        editorRef.current.innerHTML += html;
        handleEditorInput();
      }
      return;
    }

    try {
      document.execCommand('insertHTML', false, html);
    } catch (e) {
      // Fallback
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    handleEditorInput();
    updateActiveStyles();
  };

  /**
   * Insert symbol (e.g. math/physics/Arabic) at caret position
   */
  const handleInsertSymbol = (symbol: string) => {
    insertHtmlAtCursor(symbol);
    setShowSymbolMenu(false);
  };

  /**
   * Insert numbered items model (e.g. 1., a., 1), (1), (a), etc.)
   */
  const handleApplyNumbering = (model: (typeof NUMBERING_MODELS)[0]) => {
    setShowNumberingMenu(false);
    if (editorRef.current) {
      editorRef.current.focus();
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';

    if (selectedText && selectedText.trim().length > 0) {
      const lines = selectedText.split(/\r?\n/);
      const formattedLines = lines
        .map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          return `${model.prefixGen(idx)}${trimmed.replace(/^(\(\w+\)|\d+\)|\w+\)|\d+\.|\w+\.|\([ivxIVX]+\)|[ivxIVX]+\.|[•▪◆⁃✓★])\s+/, '')}`;
        })
        .join('<br>');

      insertHtmlAtCursor(formattedLines);
    } else {
      // Insert clean 3-item numbered sample
      const sample = `${model.prefixGen(0)}...<br>${model.prefixGen(1)}...<br>${model.prefixGen(2)}...<br>`;
      insertHtmlAtCursor(sample);
    }
  };

  /**
   * Insert sequential statements stimulus template (Pernyataan 1-4)
   */
  const handleInsertStimulusStatements = (count: number = 4) => {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    let snippet = '<div style="margin: 4px 0;"><strong>Perhatikan pernyataan-pernyataan berikut:</strong><br>';
    for (let i = 0; i < count; i++) {
      snippet += `(${i + 1}) Pernyataan ${i + 1}...<br>`;
    }
    snippet += '<em>Pernyataan yang tepat ditunjukkan oleh nomor...</em></div><br>';
    insertHtmlAtCursor(snippet);
  };

  /**
   * Clear all formatting on selected text
   */
  const handleClearFormat = () => {
    executeFormatCommand('removeFormat');
  };

  // Determine container min-height
  const computedMinHeight = minHeight || `${Math.max(rows * 24, 68)}px`;

  return (
    <div ref={containerRef} className={`w-full rounded-2xl border border-slate-300 bg-white shadow-2xs transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${className}`}>
      {/* 1. TOP WYSIWYG TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-1.5 sm:p-2 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 border-b border-slate-200 rounded-t-2xl select-none">
        {/* Left Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Bold Button (Ctrl + B) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('bold');
            }}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeStyles.bold
                ? 'bg-indigo-600 text-white shadow-xs scale-105'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Tebal / Bold (Ctrl + B) - Penampakan font bold sesungguhnya"
          >
            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] font-mono hidden sm:inline opacity-80 font-extrabold">Ctrl+B</span>
          </button>

          {/* Italic Button (Ctrl + I) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('italic');
            }}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeStyles.italic
                ? 'bg-indigo-600 text-white shadow-xs scale-105'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Miring / Italic (Ctrl + I) - Penampakan font miring sesungguhnya"
          >
            <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] font-mono hidden sm:inline opacity-80 font-extrabold">Ctrl+I</span>
          </button>

          {/* Underline Button (Ctrl + U) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('underline');
            }}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeStyles.underline
                ? 'bg-indigo-600 text-white shadow-xs scale-105'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Garis Bawah / Underline (Ctrl + U) - Penampakan garis bawah sesungguhnya"
          >
            <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] font-mono hidden sm:inline opacity-80 font-extrabold">Ctrl+U</span>
          </button>

          {/* Strikethrough Button */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('strikeThrough');
            }}
            className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center ${
              activeStyles.strikeThrough
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Coret Teks (Strikethrough)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          {/* Subscript (X₂) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('subscript');
            }}
            className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
              activeStyles.subscript
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Subskrip Bawah (Indeks Kimia / Rumus, misal H₂O)"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>

          {/* Superscript (X²) */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormatCommand('superscript');
            }}
            className={`px-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
              activeStyles.superscript
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Superskrip Atas (Pangkat Matematika / Satuan, misal m²)"
          >
            <Superscript className="w-3.5 h-3.5" />
          </button>

          {/* Highlighter */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const selection = window.getSelection();
              if (selection && selection.toString()) {
                insertHtmlAtCursor(`<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 3px;">${selection.toString()}</mark>`);
              } else {
                insertHtmlAtCursor('<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 3px;">teks penting</mark>');
              }
            }}
            className="p-1.5 rounded-lg text-xs bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 transition-all cursor-pointer flex items-center justify-center"
            title="Stabilo / Sorot Kuning (Highlight)"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          {/* Numbering Variations Dropdown (1., a., 1), (1), (a), etc.) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowNumberingMenu(!showNumberingMenu);
                setShowSymbolMenu(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Pilihan Format Model Nomor Berurutan (1., a., 1), (1), (a), dst.)"
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Model Nomor</span>
              <ChevronDown className="w-3 h-3 text-indigo-500" />
            </button>

            {showNumberingMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Pilih Variasi Penomoran Soal:
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5 py-1">
                  {NUMBERING_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleApplyNumbering(model);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-xs font-medium text-slate-800 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600">{model.label}</span>
                      <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500 bg-slate-100 group-hover:bg-indigo-100 px-1.5 py-0.5 rounded">
                        {model.example.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 mt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInsertStimulusStatements(4);
                      setShowNumberingMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Sisipkan Template 4 Pernyataan (1)-(4)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Symbols & Formulas Modal Trigger (Math, Physics, Chemistry, Arabic) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowSymbolMenu(!showSymbolMenu);
                setShowNumberingMenu(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Simbol Lengkap: Matematika, Fisika/Sains, Kimia, Arab PAI"
            >
              <Sigma className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Simbol & Rumus</span>
              <ChevronDown className="w-3 h-3 text-purple-500" />
            </button>

            {showSymbolMenu && (
              <div className="absolute left-0 sm:left-auto right-auto top-full mt-1.5 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 gap-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSymbolTab('math');
                    }}
                    className={`px-2 py-1 rounded-lg cursor-pointer ${
                      activeSymbolTab === 'math' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Matematika
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSymbolTab('physics');
                    }}
                    className={`px-2 py-1 rounded-lg cursor-pointer ${
                      activeSymbolTab === 'physics' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Fisika/Sains
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSymbolTab('chemistry');
                    }}
                    className={`px-2 py-1 rounded-lg cursor-pointer ${
                      activeSymbolTab === 'chemistry' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Kimia
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveSymbolTab('arabic');
                    }}
                    className={`px-2 py-1 rounded-lg cursor-pointer ${
                      activeSymbolTab === 'arabic' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Arab PAI
                  </button>
                </div>

                {/* Symbols Grid */}
                <div className="max-h-52 overflow-y-auto">
                  {activeSymbolTab === 'math' && (
                    <div className="grid grid-cols-6 gap-1">
                      {MATH_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertSymbol(s);
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer text-center"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeSymbolTab === 'physics' && (
                    <div className="grid grid-cols-4 gap-1">
                      {PHYSICS_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertSymbol(s);
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer text-center truncate"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeSymbolTab === 'chemistry' && (
                    <div className="grid grid-cols-4 gap-1">
                      {CHEMISTRY_SYMBOLS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertSymbol(s);
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-100 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer text-center truncate"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeSymbolTab === 'arabic' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-1" dir="rtl">
                        {ARABIC_HIJAIYAH.map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleInsertSymbol(ch);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-100 text-slate-900 text-base font-arabic border border-slate-200 transition-colors cursor-pointer text-center"
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 pt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Frasa Pilihan:</span>
                        <div className="flex flex-wrap gap-1" dir="rtl">
                          {ARABIC_PHRASES.map((phrase, pIdx) => (
                            <button
                              key={`phrase-${pIdx}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleInsertSymbol(phrase);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-arabic border border-emerald-200 cursor-pointer"
                              title={phrase}
                            >
                              {phrase}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear Formatting */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleClearFormat();
            }}
            className="p-1.5 rounded-lg text-xs bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition-all cursor-pointer flex items-center justify-center"
            title="Hapus Format / Netralkan Gaya Teks Terpilih"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Image Prompt Shortcut */}
          {onInsertImagePrompt && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onInsertImagePrompt();
              }}
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
              title="Sisipkan kalimat pembuka: 'Perhatikan gambar di bawah ini!'"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span className="hidden md:inline">+ Teks Gambar</span>
            </button>
          )}

          {/* Live Preview Toggle */}
          {showPreviewToggle && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowPreview(!showPreview);
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                showPreview
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title="Pratinjau Nyata Tampilan Siswa & Cetak"
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span className="hidden sm:inline">{showPreview ? 'Tutup Preview' : 'Preview'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TRUE WYSIWYG CONTENTEDITABLE EDITING CANVAS */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        dir={dir}
        data-placeholder={placeholder}
        onInput={handleEditorInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveStyles}
        onMouseUp={updateActiveStyles}
        onSelect={updateActiveStyles}
        className="wysiwyg-editor w-full p-3 rounded-b-2xl bg-white text-xs font-medium text-slate-900 focus:outline-none leading-relaxed overflow-y-auto selection:bg-indigo-500 selection:text-white"
        style={{
          minHeight: computedMinHeight,
          maxHeight,
        }}
        suppressContentEditableWarning
      />

      {/* 3. OPTIONAL LIVE PREVIEW DISPLAY */}
      {showPreview && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            <span>Pratinjau Hasil Tampilan Soal Siswa &amp; Cetak:</span>
            <span className="text-indigo-600 font-semibold lowercase">wysiwyg rendering</span>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed shadow-2xs">
            <FormattedQuestionText text={value || 'Belum ada teks butir soal.'} />
          </div>
        </div>
      )}
    </div>
  );
};

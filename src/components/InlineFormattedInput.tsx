import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { normalizeFormattedString } from './FormattedQuestionText';

export interface InlineFormattedInputProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  showFormatButtons?: boolean;
}

export const InlineFormattedInput: React.FC<InlineFormattedInputProps> = ({
  value,
  onChange,
  placeholder = 'Ketik di sini (dukung Bold Ctrl+B, Italic Ctrl+I, Underline Ctrl+U)...',
  className = '',
  dir = 'auto',
  onFocus,
  onBlur,
  onKeyDown,
  showFormatButtons = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastSentValueRef = useRef(value);

  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  const updateActiveStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setActiveStyles({
        bold: !!document.queryCommandState('bold'),
        italic: !!document.queryCommandState('italic'),
        underline: !!document.queryCommandState('underline'),
      });
    } catch (e) {}
  }, []);

  // Sync value prop to editor innerHTML
  useEffect(() => {
    if (!editorRef.current) return;
    const targetHtml = normalizeFormattedString(value || '');
    if (value !== lastSentValueRef.current || document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== targetHtml) {
        editorRef.current.innerHTML = targetHtml;
      }
      lastSentValueRef.current = value;
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML.trim();
    if (html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>') {
      html = '';
      editorRef.current.innerHTML = '';
    }
    lastSentValueRef.current = html;
    onChange(html);
    updateActiveStyles();
  };

  const executeFormat = (command: 'bold' | 'italic' | 'underline') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    try {
      document.execCommand(command, false, undefined);
    } catch (e) {}
    handleInput();
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeFormat('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        executeFormat('italic');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        executeFormat('underline');
        return;
      }
    }
    if (e.key === 'Enter') {
      // Prevent multiline break in single-line option inputs
      e.preventDefault();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className={`relative flex items-center gap-1 group ${className}`}>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="false"
        dir={dir}
        data-placeholder={placeholder}
        onInput={handleInput}
        onFocus={() => {
          setIsFocused(true);
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          setIsFocused(false);
          if (onBlur) onBlur();
        }}
        onKeyDown={handleKeyDownInternal}
        onKeyUp={updateActiveStyles}
        onMouseUp={updateActiveStyles}
        onSelect={updateActiveStyles}
        className="wysiwyg-editor flex-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all overflow-x-auto whitespace-nowrap"
        suppressContentEditableWarning
      />

      {/* Floating Quick Formatting Controls */}
      {showFormatButtons && (
        <div className={`flex items-center gap-0.5 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormat('bold');
            }}
            className={`p-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              activeStyles.bold ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Tebal / Bold (Ctrl + B)"
          >
            <Bold className="w-3 h-3 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormat('italic');
            }}
            className={`p-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              activeStyles.italic ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Miring / Italic (Ctrl + I)"
          >
            <Italic className="w-3 h-3 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              executeFormat('underline');
            }}
            className={`p-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
              activeStyles.underline ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Garis Bawah / Underline (Ctrl + U)"
          >
            <Underline className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};

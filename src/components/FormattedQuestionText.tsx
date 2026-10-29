import React from 'react';

interface FormattedQuestionTextProps {
  text?: string;
  className?: string;
}

// Regex to identify numbered list prefixes like:
// 1. , 2. , 10.
// a. , b. , z. , A. , B.
// 1) , 2) , a) , b) , A) , B)
// (1) , (2) , (a) , (b) , (A) , (B)
// i. , ii. , iii. , iv. , v. , I. , II. , III.
// (i) , (ii) , (iii) , (iv)
// • , ▪ , ◆ , ⁃ , ✓ , ★
const LIST_PREFIX_REGEX = /^(\s*)(\(\w+\)|\d+\)|\w+\)|\d+\.|\w+\.|\([ivxIVX]+\)|[ivxIVX]+\.|[•▪◆⁃✓★])\s+(.*)$/;

/**
 * Normalizes any markdown formatting and eliminates repeated asterisk loops (e.g. ********teks tebal********).
 * Ensures only real, authentic HTML tags (<strong>, <em>, <u>, <del>, <mark>) are fed into rendering.
 */
export function normalizeFormattedString(text: string): string {
  if (!text) return '';
  let out = text;

  // 1. Normalize multi-asterisks (e.g. ********teks tebal******** or ****teks**** or **teks**)
  // Any pair of 2 or more asterisks wrapping text -> <strong>$1</strong>
  out = out.replace(/\*{2,}\s*([\s\S]*?)\s*\*{2,}/g, '<strong>$1</strong>');

  // 2. Clean leftover stray 2+ asterisks if any
  out = out.replace(/\*{2,}/g, '');

  // 3. Normalize single asterisks for italic (only if not preceded/followed by asterisk)
  out = out.replace(/(^|[^\*])\*([^\*\s][^\*]*?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

  // 4. Normalize double underscores __...__ -> <u>...</u>
  out = out.replace(/_{2,}\s*([\s\S]*?)\s*_{2,}/g, '<u>$1</u>');

  // 5. Normalize single underscore _..._ -> <em>...</em> (only if not in a word or identifier)
  out = out.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1<em>$2</em>$3');

  // 6. Normalize strikethrough ~~...~~ -> <del>$1</del>
  out = out.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // 7. Normalize highlight ==...== -> <mark>$1</mark>
  out = out.replace(/==(.*?)==/g, '<mark>$1</mark>');

  return out;
}

/**
 * Parses inline formatting into genuine React DOM elements:
 * - <b> / <strong> -> Real Bold font-bold
 * - <i> / <em> -> Real Italic font-style
 * - <u> -> Real Underline text-decoration
 * - <s> / <del> -> Real Strikethrough
 * - <sub> -> Real Subscript
 * - <sup> -> Real Superscript
 * - <mark> -> Real Highlight
 * - Supports inline style spans (e.g. font-weight: bold, text-decoration: underline)
 */
export const renderInlineFormattedText = (rawText: string, keyPrefix: string = 'inline'): React.ReactNode[] => {
  if (!rawText) return [];

  const preProcessed = normalizeFormattedString(rawText);

  // Tokenize using a comprehensive regex supporting tags with attributes and styles
  const tokenRegex = /(?:<(b|strong)(?:\s+[^>]*)?>(.*?)<\/\1>|<(i|em)(?:\s+[^>]*)?>(.*?)<\/\3>|<u(?:\s+[^>]*)?>(.*?)<\/u>|<(s|del)(?:\s+[^>]*)?>(.*?)<\/\6>|<sub(?:\s+[^>]*)?>(.*?)<\/sub>|<sup(?:\s+[^>]*)?>(.*?)<\/sup>|<mark(?:\s+[^>]*)?>(.*?)<\/mark>|<span\s+[^>]*font-weight:\s*(?:bold|[7-9]00)[^>]*>(.*?)<\/span>|<span\s+[^>]*font-style:\s*italic[^>]*>(.*?)<\/span>|<span\s+[^>]*text-decoration:\s*underline[^>]*>(.*?)<\/span>|<br\s*\/?>)/gi;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = tokenRegex.exec(preProcessed)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;

    // Push preceding plain text
    if (matchStart > lastIndex) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-t-${counter++}`}>
          {preProcessed.slice(lastIndex, matchStart)}
        </React.Fragment>
      );
    }

    const matchedStr = match[0];

    if (/^<br\s*\/?>$/i.test(matchedStr)) {
      nodes.push(<br key={`${keyPrefix}-br-${counter++}`} />);
    } else if (match[2] !== undefined) {
      // <b> or <strong>
      nodes.push(
        <strong key={`${keyPrefix}-b-${counter++}`} className="font-bold text-inherit">
          {renderInlineFormattedText(match[2], `${keyPrefix}-b-sub`)}
        </strong>
      );
    } else if (match[4] !== undefined) {
      // <i> or <em>
      nodes.push(
        <em key={`${keyPrefix}-i-${counter++}`} className="italic text-inherit">
          {renderInlineFormattedText(match[4], `${keyPrefix}-i-sub`)}
        </em>
      );
    } else if (match[5] !== undefined) {
      // <u>
      nodes.push(
        <span key={`${keyPrefix}-u-${counter++}`} className="underline underline-offset-3 decoration-1">
          {renderInlineFormattedText(match[5], `${keyPrefix}-u-sub`)}
        </span>
      );
    } else if (match[7] !== undefined) {
      // <s> or <del>
      nodes.push(
        <del key={`${keyPrefix}-del-${counter++}`} className="line-through opacity-75">
          {renderInlineFormattedText(match[7], `${keyPrefix}-del-sub`)}
        </del>
      );
    } else if (match[8] !== undefined) {
      // <sub>
      nodes.push(
        <sub key={`${keyPrefix}-sub-${counter++}`} className="text-[0.78em] font-mono leading-none align-baseline relative -bottom-0.5">
          {match[8]}
        </sub>
      );
    } else if (match[9] !== undefined) {
      // <sup>
      nodes.push(
        <sup key={`${keyPrefix}-sup-${counter++}`} className="text-[0.78em] font-mono leading-none align-baseline relative -top-1">
          {match[9]}
        </sup>
      );
    } else if (match[10] !== undefined) {
      // <mark>
      nodes.push(
        <mark key={`${keyPrefix}-mark-${counter++}`} className="bg-amber-200/80 text-amber-950 px-1 rounded-sm font-semibold">
          {renderInlineFormattedText(match[10], `${keyPrefix}-mark-sub`)}
        </mark>
      );
    } else if (match[11] !== undefined) {
      // <span style="font-weight: bold">
      nodes.push(
        <strong key={`${keyPrefix}-sp-b-${counter++}`} className="font-bold text-inherit">
          {renderInlineFormattedText(match[11], `${keyPrefix}-sp-b-sub`)}
        </strong>
      );
    } else if (match[12] !== undefined) {
      // <span style="font-style: italic">
      nodes.push(
        <em key={`${keyPrefix}-sp-i-${counter++}`} className="italic text-inherit">
          {renderInlineFormattedText(match[12], `${keyPrefix}-sp-i-sub`)}
        </em>
      );
    } else if (match[13] !== undefined) {
      // <span style="text-decoration: underline">
      nodes.push(
        <span key={`${keyPrefix}-sp-u-${counter++}`} className="underline underline-offset-3 decoration-1">
          {renderInlineFormattedText(match[13], `${keyPrefix}-sp-u-sub`)}
        </span>
      );
    }

    lastIndex = matchEnd;
  }

  // Push remaining plain text
  if (lastIndex < preProcessed.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-t-${counter++}`}>
        {preProcessed.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return nodes;
};

/**
 * Universal Formatted Question Renderer
 * Renders authentic bold, italic, underline, superscript, subscript,
 * and beautifully aligns sequential numbered lists (1. , a. , 1) , (1) , (a) , etc.)
 */
export const FormattedQuestionText: React.FC<FormattedQuestionTextProps> = ({
  text = '',
  className = '',
}) => {
  if (!text) return null;

  // Convert HTML block tags (p, div) into standard newline breaks for consistent list parsing
  let normalized = text
    .replace(/<p(?:\s+[^>]*)?>(.*?)<\/p>/gi, '$1\n')
    .replace(/<div(?:\s+[^>]*)?><br\s*\/?><\/div>/gi, '\n')
    .replace(/<div(?:\s+[^>]*)?>(.*?)<\/div>/gi, '$1\n');

  // Split text by lines to properly detect and format numbered lists
  const lines = normalized.split('\n');

  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          // Empty line / paragraph break
          return <div key={`empty-${lineIdx}`} className="h-2" />;
        }

        const listMatch = line.match(LIST_PREFIX_REGEX);
        if (listMatch) {
          const [, indent, prefix, content] = listMatch;
          const indentLevel = Math.min(4, Math.floor(indent.length / 2));
          const paddingClass = indentLevel === 1 ? 'pl-4' : indentLevel >= 2 ? 'pl-8' : '';

          return (
            <div
              key={`line-${lineIdx}`}
              className={`flex items-start gap-2 text-inherit ${paddingClass}`}
            >
              <span className="font-bold text-indigo-700 dark:text-indigo-400 select-none shrink-0 min-w-[20px] text-right font-mono">
                {prefix}
              </span>
              <span className="flex-1 text-inherit">
                {renderInlineFormattedText(content, `l-${lineIdx}`)}
              </span>
            </div>
          );
        }

        return (
          <p key={`line-${lineIdx}`} className="text-inherit">
            {renderInlineFormattedText(line, `l-${lineIdx}`)}
          </p>
        );
      })}
    </div>
  );
};

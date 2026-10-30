import React from 'react';

interface MarkdownViewProps {
  content: string;
}

function parseFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-bold text-white tracking-wide mt-3 mb-1">
              {trimmed.slice(4)}
            </h4>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-white tracking-wide mt-3 mb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 mt-1 text-xs">•</span>
              <span className="flex-1">{parseFormattedText(trimmed.slice(2))}</span>
            </div>
          );
        }

        const matchNumbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (matchNumbered) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 font-semibold text-xs mt-0.5">{matchNumbered[1]}.</span>
              <span className="flex-1">{parseFormattedText(matchNumbered[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{parseFormattedText(trimmed)}</p>;
      })}
    </div>
  );
};

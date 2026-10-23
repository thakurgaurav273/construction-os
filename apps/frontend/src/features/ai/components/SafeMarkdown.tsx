import React from 'react';

/**
 * Renders the small Markdown subset models use (headings, lists, bold, italics, inline code) as React elements.
 * Nothing is ever inserted as HTML, so model output can't inject markup or scripts.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string };

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = (): void => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const rawLine of markdown.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line || line.startsWith('```')) { flush(); continue; }
    if (heading) { flush(); blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] }); continue; }
    if (bullet || numbered) {
      flush();
      const ordered = !!numbered;
      const item = (bullet ?? numbered)?.[1] ?? '';
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === 'list' && previous.ordered === ordered) previous.items.push(item);
      else blocks.push({ kind: 'list', ordered, items: [item] });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

export function SafeMarkdown({ content, className }: { content: string; className?: string }): React.ReactElement {
  return (
    <div className={['space-y-2 text-sm leading-relaxed', className].filter(Boolean).join(' ')}>
      {toBlocks(content).map((block, index) => {
        const key = `b${index}`;
        if (block.kind === 'heading') return <p key={key} className="font-semibold">{renderInline(block.text, key)}</p>;
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={key} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
              {block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>)}
            </List>
          );
        }
        return <p key={key}>{renderInline(block.text, key)}</p>;
      })}
    </div>
  );
}

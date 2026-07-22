import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  children: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <div className="[&_:not(pre)>code]:text-[#10B981] [&_:not(pre)>code]:text-sm [&_:not(pre)>code]:font-mono text-[#0B1F3A]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({node, ...props}) => (
            <div className="my-6 relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="w-full text-left border-collapse min-w-max" {...props} />
              </div>
            </div>
          ),
          th: ({node, ...props}) => (
            <th className="p-4 border-b border-slate-200 font-bold text-[#0B1F3A] bg-slate-50 whitespace-nowrap pl-6" {...props} />
          ),
          td: ({node, ...props}) => (
            <td className="p-4 border-b border-slate-100 text-slate-700 bg-transparent transition-colors hover:bg-slate-50 pl-6" {...props} />
          ),
          pre: ({node, ...props}) => (
            <pre className="overflow-x-auto my-6 text-sm font-mono text-[#10B981] bg-slate-50 p-4 rounded-xl border border-slate-200" {...props} />
          ),
          code: ({node, inline, className, children, ...props}: any) => {
            return (
              <code className={className} style={!inline ? { color: '#10B981' } : undefined} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

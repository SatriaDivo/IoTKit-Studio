"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  let actionPlanSummary = "";
  let actionPlanJson = "";

  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"type"') && trimmed.includes('"action_plan"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.summary) {
        actionPlanSummary = parsed.summary;
        actionPlanJson = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // not strict json, fallback to normal markdown rendering
    }
  }

  if (actionPlanSummary) {
    return (
      <div className={`space-y-2 text-xs text-[#0F172A] ${className}`}>
        <p className="leading-relaxed font-sans">{actionPlanSummary}</p>
        {actionPlanJson && (
          <details className="group mt-2 border border-[#E2E8F0] rounded bg-[#F8FAFC] overflow-hidden">
            <summary className="px-2.5 py-1.5 text-[11px] font-mono text-[#64748B] hover:text-[#0F172A] cursor-pointer select-none bg-[#F1F5F9] transition-colors flex items-center justify-between">
              <span>CONFIG_ACTION_PLAN.JSON</span>
              <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <pre className="p-2.5 text-[10px] font-mono bg-[#0B0F19] text-[#E2E8F0] overflow-x-auto">
              <code>{actionPlanJson}</code>
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className={`markdown-body text-xs text-[#0F172A] leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-sm font-bold text-[#0F172A] mt-3 mb-1.5 font-sans border-b border-[#E2E8F0] pb-1" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xs font-bold text-[#0F172A] mt-3 mb-1 font-sans" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xs font-bold text-[#1E293B] mt-2.5 mb-1 font-sans" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-xs font-semibold text-[#334155] mt-2 mb-0.5 font-sans" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="text-xs text-[#0F172A] leading-relaxed mb-2 last:mb-0" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 mb-2 text-xs text-[#0F172A]" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 mb-2 text-xs text-[#0F172A]" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="text-xs text-[#0F172A] leading-relaxed" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-[#0F172A]" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic text-[#334155]" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="my-2.5 border-t border-[#E2E8F0]" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-2 border-[#2563EB] pl-3 py-1 my-2 text-xs italic text-[#475569] bg-[#F8FAFC] rounded-r" {...props} />
          ),
          code: ({ className, children, ...props }: any) => {
            const isBlock = String(children).includes("\n") || Boolean(className);
            if (!isBlock) {
              return (
                <code
                  className="font-mono text-[11px] bg-[#F1F5F9] text-[#0F172A] px-1 py-0.5 rounded border border-[#E2E8F0]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="font-mono text-[11px] bg-[#0B0F19] text-[#F8FAFC] p-3 rounded my-2 overflow-x-auto border border-[#1E293B]">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-2 rounded border border-[#E2E8F0]">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-xs" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-[#F8FAFC]" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="px-3 py-1.5 text-left font-semibold text-[#334155] border-b border-[#E2E8F0]" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-3 py-1.5 text-[#0F172A] border-b border-[#F1F5F9]" {...props} />
          ),
          a: ({ ...props }) => (
            <a target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

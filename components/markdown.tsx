import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/*
 Markdown for content written by course authors and graders (writing prompts, feedback). GFM for
 tables — exam graph items give their data as one. Raw HTML is not rendered (react-markdown's
 default), so a prompt or a feedback note can't inject markup.
*/
export const Markdown = ({ children, className }: { children: string; className?: string }) => (
  <div className={cn("space-y-3 text-[15px] leading-relaxed text-neutral-700 [word-break:keep-all]", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="text-base font-bold text-neutral-800">{children}</h3>,
        h2: ({ children }) => <h3 className="text-base font-bold text-neutral-800">{children}</h3>,
        h3: ({ children }) => <h4 className="font-bold text-neutral-800">{children}</h4>,
        strong: ({ children }) => <strong className="font-bold text-neutral-800">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="space-y-2 rounded-xl border-l-4 border-sky-300 bg-sky-50/60 px-4 py-3">{children}</blockquote>,
        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">{children}</code>,
        table: ({ children }) => (
          <div className="overflow-x-auto rounded-xl border-2 border-slate-200">
            <table className="w-full border-collapse text-center text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border-b-2 border-slate-200 bg-slate-50 px-2 py-2 font-bold text-neutral-700">{children}</th>,
        td: ({ children }) => <td className="border-t border-slate-100 px-2 py-2">{children}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

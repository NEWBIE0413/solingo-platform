import Image from "next/image";

type QuestionBubbleProps = { question: string };

const isScript = (t: string) => /[぀-ヿ가-힣一-龯]/.test(t) && t.length <= 3;

// ASSIST prompt. A short script token (a kana, a word) is shown huge — that *is* the question.
export const QuestionBubble = ({ question }: QuestionBubbleProps) => {
  const big = isScript(question);
  return (
    <div className="mb-6 flex items-center gap-x-4">
      <Image src="/mascot.svg" alt="Mascot" height={60} width={60} className="hidden lg:block" />
      <Image src="/mascot.svg" alt="Mascot" height={40} width={40} className="block lg:hidden" />
      <div className={`relative rounded-xl border-2 px-4 py-2 [word-break:keep-all] [overflow-wrap:anywhere] ${big ? "kana text-4xl leading-tight text-neutral-700 lg:text-5xl" : "text-lg lg:text-xl"}`}>
        {question}
        <div className="absolute -left-3 top-1/2 h-0 w-0 -translate-y-1/2 transform border-y-8 border-r-8 border-y-transparent" aria-hidden />
      </div>
    </div>
  );
};

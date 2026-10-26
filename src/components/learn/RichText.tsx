import type { ReactNode } from "react";

// 강의 설명 글을 읽기 쉽게: 문장 속 코드는 코드 칩, "따옴표 속 말"은 형광펜으로 자동 강조해요.
// (lessons.json 글은 손대지 않고 보여 줄 때만 꾸며요)

const KEYWORDS = [
  "print", "input", "int", "float", "str", "bool", "type", "len", "sum", "max", "min", "sorted", "range", "split",
  "append", "pop", "insert", "remove", "import", "random", "randint", "choice", "def", "return", "if", "elif", "else",
  "for", "while", "break", "continue", "in", "and", "or", "not", "True", "False", "None", "sep", "end",
];

// 순서가 중요해요: 함수 부르기(print("Hi")) → 따옴표 → 낱말 키워드 → 기호 연산자
const PATTERN = new RegExp(
  [
    String.raw`[A-Za-z_][\w.]*\((?:"[^"]*"|'[^']*'|\([^()]*\)|[^()"'])*\)`, // print("Hello"), int(input()) (괄호 한 겹까지)
    String.raw`"[^"\n]{1,40}"`, // "보여 줘!"
    String.raw`(?<![A-Za-z_])(?:${KEYWORDS.join("|")})(?![A-Za-z_\w])`, // print, if, True
    String.raw`(?<=\s|^)(?://|\*\*|==|!=|\+=|-=|>=|<=|[#%])(?=\s|$|[,.)])`, // // ** == # %
  ].join("|"),
  "g",
);

const isCode = (s: string) => !s.startsWith('"');

export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const token = m[0];
    parts.push(
      isCode(token) ? (
        <code key={start} className="mx-0.5 whitespace-nowrap border-2 border-navy-900 bg-ink px-1 font-typing text-[0.95em] text-lime-400">
          {token}
        </code>
      ) : (
        <mark key={start} className="bg-yellow-400/70 px-0.5 font-bold text-navy-900">
          {token}
        </mark>
      ),
    );
    last = start + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ───────── 예시 코드 색칠 (설명 화면만. 타자 칸은 꾸미지 않아요) ───────── */

const CODE_TOKENS = new RegExp(
  [
    String.raw`#.*$`, // 주석
    String.raw`"[^"\n]*"|'[^'\n]*'`, // 글자(문자열)
    String.raw`\b\d+(?:\.\d+)?\b`, // 숫자
    String.raw`\b(?:if|elif|else|for|while|in|def|return|import|break|continue|and|or|not|True|False|None)\b`, // 명령어
    String.raw`\b[A-Za-z_]\w*(?=\()`, // 함수 이름
  ].join("|"),
  "gm",
);

const tokenClass = (t: string) =>
  t.startsWith("#")
    ? "text-text-muted italic"
    : t.startsWith('"') || t.startsWith("'")
      ? "text-lime-800"
      : /^\d/.test(t)
        ? "text-sky-500 font-bold"
        : /^(if|elif|else|for|while|in|def|return|import|break|continue|and|or|not|True|False|None)$/.test(t)
          ? "text-pink-400 font-bold"
          : "text-navy-700 font-bold underline decoration-dotted underline-offset-4";

export function ColoredCode({ code }: { code: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(CODE_TOKENS)) {
    const start = m.index ?? 0;
    if (start > last) parts.push(code.slice(last, start));
    parts.push(
      <span key={start} className={tokenClass(m[0])}>
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < code.length) parts.push(code.slice(last));
  return <>{parts}</>;
}

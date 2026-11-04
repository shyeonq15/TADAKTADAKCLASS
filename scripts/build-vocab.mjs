// 영단어 목록(scripts/vocab-words.txt) → src/data/vocab.json
// 실행: node scripts/build-vocab.mjs
// 목록 한 줄 = 번호|영어|뜻. 번호 앞 ! = 학생 활동에서 숨김, * = 원본 뜻을 고친 단어

import fs from "node:fs";

const SRC = new URL("./vocab-words.txt", import.meta.url);
const OUT = new URL("../src/data/vocab.json", import.meta.url);

const words = [];
const seen = new Set();
for (const line of fs.readFileSync(SRC, "utf8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [raw, en, ko] = line.split("|").map((s) => s.trim());
  const hide = raw.startsWith("!");
  const fixed = raw.startsWith("*");
  const n = Number(raw.replace(/^[!*]/, ""));
  if (!n || !en || !ko) throw new Error(`줄 모양이 이상해요: ${line}`);
  if (seen.has(en)) throw new Error(`같은 단어가 두 번 있어요: ${en}`);
  seen.add(en);
  words.push({ n, en, ko, ...(hide ? { hide: true } : {}), ...(fixed ? { fixed: true } : {}) });
}

const nums = new Set(words.map((w) => w.n));
const min = Math.min(...nums);
const max = Math.max(...nums);
for (let i = min; i <= max; i++) if (!nums.has(i)) throw new Error(`${i}번이 빠졌어요`);

// 25번씩 한 묶음, 100번 = 한 탄
const PART = 25;
const parts = [];
for (let from = min; from <= max; from += PART) {
  const set = Math.floor((from - 1) / 100) + 1;
  const k = Math.floor(((from - 1) % 100) / PART) + 1;
  parts.push({ part: parts.length + 1, set, k, from, to: Math.min(max, from + PART - 1) });
}

const data = {
  title: `교육부 지정 중고등 기초 영단어 ${min}~${max}`,
  source: "교육부 지정 중고등 기초 영단어 1200개 4탄~10탄 (영어 선생님 제공 목록). 단어와 뜻만 옮김",
  notes: [
    "fixed: 원본 뜻이 틀려 고친 단어 (gun 총액→총, mount 산업→오르다·산, sheep 양식→양, rise 르다→오르다, spare 명분의→여분의, nerve 신경 쓰다→신경·용기, match 성냥→경기·성냥, press 출판물→누르다·언론, medicine 의학→약·의학, rail 난간→철도·난간, jeans 바지→청바지)",
    "hide: 학생 활동에서 뺀 단어. 넣으려면 scripts/vocab-words.txt 에서 번호 앞 ! 를 지우고 다시 실행",
    "여러 철자가 있는 단어는 미국식 하나만 (disk, favor, honor, humor, labor, license, neighbor, practice, realize, enroll, laboratory)",
    "parts: 번호 25개씩 한 묶음 (같은 번호에 딸린 낱말 dirty·easy 등은 그 묶음에 함께)",
  ],
  parts,
  words,
};
fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(`${words.length}개 (숨김 ${words.filter((w) => w.hide).length}, 뜻 고침 ${words.filter((w) => w.fixed).length}), 묶음 ${parts.length}개`);

// 선생님 계정 만들기 / 비밀번호 바꾸기
// 실행: npm run teacher:create
// 비밀번호는 이 터미널에만 입력하고, 화면에 보이지 않아요.

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, TEACHER_EMAILS = "" } = process.env;
if (!url || !secret) {
  console.error(".env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SECRET_KEY 가 필요해요.");
  process.exit(1);
}
const teacherEmails = TEACHER_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "*".repeat(s.length ? 1 : 0));
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const email = (await ask("선생님 이메일: ")).toLowerCase();
if (!teacherEmails.includes(email)) {
  console.error(`\n이 이메일이 .env.local 의 TEACHER_EMAILS 에 없어요. 먼저 거기에 추가해 주세요.`);
  process.exit(1);
}
const password = await ask("비밀번호 (8자 이상): ", true);
if (password.length < 8) {
  console.error("비밀번호는 8자 이상으로 해 주세요.");
  process.exit(1);
}
const again = await ask("비밀번호 한 번 더: ", true);
if (password !== again) {
  console.error("두 비밀번호가 달라요. 다시 실행해 주세요.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

// 이미 있는 계정이면 비밀번호만 바꿈
let existing = null;
for (let page = 1; page < 20 && !existing; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  existing = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 200) break;
}

const res = existing
  ? await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
  : await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (res.error) {
  console.error("실패했어요:", res.error.message);
  process.exit(1);
}
console.log(existing ? "\n✅ 비밀번호를 바꿨어요." : "\n✅ 선생님 계정을 만들었어요.");
console.log("   로그인 화면 → '선생님' 탭에서 이 이메일과 비밀번호로 들어가세요.");

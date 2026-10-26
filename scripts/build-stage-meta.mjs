// 트랙 연습팩 JSON(src/data/packs/*-track.json)에서 화면용 요약(stage-meta.json)을 만들어요.
// 지문 전체는 서버에서만 쓰고, 학생 화면에는 단계 이름·연결 강·지문 수만 보내서 가볍게 해요.
// 연습팩 JSON 을 바꾸면 꼭 다시 실행: npm run packs:meta
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src/data/packs");
const meta = {};
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith("-track.json")).sort()) {
  const pack = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const stages = {};
  for (const tier of pack.tiers) {
    for (const s of tier.stages) {
      stages[`${tier.id}-${s.stage}`] = {
        title: s.title ?? tier.contentType,
        lessons: s.lessons ?? [],
        passages: s.passages.length,
        roundSize: tier.round.passagesPerRound,
      };
    }
  }
  meta[pack.track] = { version: pack.version, stages };
}
fs.writeFileSync(path.join(dir, "stage-meta.json"), JSON.stringify(meta, null, 1) + "\n");
console.log("stage-meta.json:", Object.entries(meta).map(([t, m]) => `${t} ${Object.keys(m.stages).length}단계`).join(", "));

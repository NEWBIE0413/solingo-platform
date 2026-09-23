# 코스 작성 가이드

Solingo에는 커리큘럼이 들어 있지 않다. 샘플(일본어 가나)만 있다. 배울 언어와 목표는 사람마다 다르니 코스는 각자 만든다. 이 문서는 그 코스를 쓰는 사람, 또는 대신 써 줄 AI에게 주는 명세다. 이 문서 하나만 AI에게 건네도 코스를 만들 수 있게 썼다.

## 1. 어디에 두는가

코스는 저장소 밖에 둔다. 자기 커리큘럼(학습자 정보가 담긴 계획서, 진단 결과, 음성 파일)이 오픈소스 저장소에 섞이지 않게 하려는 것이다. 비공개 git 저장소를 하나 만들어 두는 것을 권한다.

```
my-courses/                      ← CONTENT_DIR 로 지정
  es-a1.json                     코스 머리(제목, 아이콘) — 유닛을 여기 직접 넣어도 된다
  es-a1/units/unit-01.json       유닛 파일. 파일 이름 순서대로 이어 붙는다
  es-a1/units/unit-02.json
  audio/es-a1/<해시>.mp3         음성 (스크립트가 만든다)
```

앱과 스크립트는 `CONTENT_DIR`을 먼저 보고, 없으면 저장소의 `content/`(샘플)를 본다. 그래서 내 폴더에는 내 코스만 두면 되고 샘플은 옆에서 그대로 동작한다.

## 2. 형식

```jsonc
// es-a1.json
{ "id": "es-a1", "title": "스페인어 A1", "imageSrc": "/es.svg", "units": [] }

// es-a1/units/unit-01.json — 유닛 하나, 또는 { "units": [...] }
{
  "title": "1주차 · 인사",
  "description": "만나고 헤어질 때 쓰는 말",
  "lessons": [
    { "title": "1-1 아침·낮·저녁", "challenges": [ /* 아래 7가지 문제 */ ] }
  ]
}
```

- `title`(코스)이 곧 식별자다. 같은 제목으로 다시 시드하면 그 코스를 갱신한다.
- 문제 공통 필드는 `type`, `question`, `options: [{ text, correct, audioSrc?, imageSrc?, meta? }]`, 그리고 선택 필드 `level`, `tag`, `meta`다.
- `meta.explanation`이 있으면 틀렸을 때 판정 아래에 보여 준다. 헷갈리는 문제에는 반드시 쓴다.
- `audioSrc`는 직접 쓰지 않는다. 음성 스크립트가 채운다(5절).

## 3. 문제 유형 7가지

| 유형 | 화면 | 필수 | 판정 |
|---|---|---|---|
| `SELECT` | `question`을 제목으로, 보기 카드 2열 | 보기 2개 이상, 정답 1개 | 고른 보기가 `correct` |
| `ASSIST` | `question`을 말풍선으로, 보기 1열 | 보기 2개 이상, 정답 1개 | 같음 |
| `LISTEN` | 스피커 버튼, 보기 카드 | `meta.say`(들려줄 말), 보기 2개 이상·정답 1개 | 같음 |
| `MATCH` | 좌우 두 열 짝 맞추기 | 보기 6개 이상 짝수, 각 보기 `meta: { pair, side: "left"\|"right" }` | 모든 짝을 맞추면 끝 |
| `BUILD` | 단어 타일로 문장 조립 | `meta.target`(정답 문장), 정답 타일 `correct: true`(순서대로), 방해 타일 `correct: false` | 이어 붙인 문자열 = `meta.target` |
| `TRACE` | 캔버스에 따라 쓰기 | `meta.target`(글자) | 자기 판정 |
| `SPEAK` | 따라 말하기(브라우저 음성 인식) | `meta.target`, 선택 `meta.reading`·`meta.meaning` | 관대한 유사도, 인식이 안 되면 건너뛰기 가능 |

세부 규칙:

- **ASSIST 제목**은 `tag`로 정해진다. `kana`면 "어떻게 읽어요?", `word`·`vocab`·`expression`이면 "무슨 뜻일까요?", 그 밖엔 "알맞은 것을 고르세요". `question`에는 묻는 대상(단어·표현)만 넣는다.
- **BUILD 타일 잇기**: 한글이 들어 있는 타일은 공백으로, 그 밖(일본어 등)은 공백 없이 붙인다. 비교할 때 공백은 정규화되므로 타일 끝 공백은 신경 쓰지 않아도 된다. 문법 덩어리(예: `닮기 마련이에요`)는 타일 하나로 묶어 방해 타일과 크기를 맞춘다. 모양만 보고 정답을 알 수 없어야 한다.
- **BUILD 방해 타일**은 흔히 틀리는 형태(조사, 활용 오형태)로 넣되, 넣어도 문장이 맞게 되는 대체 답은 넣지 않는다. 판정은 `meta.target`과의 완전 일치라서 맞는 답을 오답 처리하게 된다.
- **SPEAK 언어**: 목표 문장의 문자로 정해진다. 한글이면 ko-KR, 가나·한자면 ja-JP, 그 밖엔 en-US다. 다른 언어면 `meta.lang`(예: `"es-ES"`)을 쓴다.
- **LISTEN**은 보기 카드에서 소리를 내지 않는다(듣기 문제가 보기 소리로 풀리면 안 된다). 다른 유형의 보기는 `meta.say`가 있으면 누를 때 읽어 준다.

## 4. 좋은 문제의 조건

실제 코스 두 벌(일본어 13주, 한국어 13주)을 만들고 고치며 남은 기준이다.

1. **방해 보기는 같은 범주에서 뽑는다.** 조사끼리(は/が/も/の), 같은 활용 계열끼리(です/ですか/じゃありません), 모양이나 소리가 닮은 어휘끼리 둔다. 범주가 다르면 문제가 아니라 눈치 게임이 된다.
2. **레슨 안에서 난이도가 오른다.** 쉬운 인식 문제 2~3개로 시작해서, 헷갈리는 SELECT·LISTEN·BUILD를 지나, 두 절짜리 종합 문제로 끝낸다.
3. **같은 유형을 세 번 연속 두지 않는다.**
4. **헷갈리는 문제에는 해설을 붙인다**(`meta.explanation`). 왜 이 답이고 다른 보기는 왜 아닌지 한두 문장으로 쓴다.
5. **폰 한 화면에 들어오는 길이.** SELECT 지문과 물음은 합쳐서 150자 이하, LISTEN으로 들려주는 말은 70자 이하, 한 사람의 발화로 쓴다. 다시 듣기 버튼 하나뿐인 구조라 그보다 길면 청해가 아니라 기억력 시험이 된다.
6. **레슨 하나에 10문제 안팎.** 틀린 문제는 레슨이 끝나기 전에 최대 두 번 다시 나오므로 실제로 푸는 수는 더 많다.

## 5. 음성, 검증, 시드

```bash
export CONTENT_DIR=../my-courses

# 1) 형식 검증 — DB 없이. 문제가 있으면 위치와 함께 알려 준다
pnpm exec tsx scripts/seed-course.ts es-a1 --check

# 2) 음성 — LISTEN의 meta.say, BUILD·SPEAK·TRACE의 meta.target, 보기의 meta.say를 읽어서
#    $CONTENT_DIR/audio/es-a1/ 에 mp3를 만들고 audioSrc를 채운다 (edge-tts 필요: pip install edge-tts)
python3 scripts/gen_course_audio.py es-a1 es-ES-ElviraNeural

# 3) 다시 검증 — 이번엔 모든 audioSrc가 실제 파일을 가리키는지까지 본다
pnpm exec tsx scripts/seed-course.ts es-a1 --check

# 4) 시드
pnpm run db:seed:course es-a1
pnpm run db:seed:course es-a1 --units 3주차    # 고친 유닛만 교체. 다른 유닛의 학습 기록은 그대로
```

- 유닛 단위 시드는 지정한 유닛의 학습 기록을 지운다. 이미 누가 풀고 있는 유닛은 고칠 때 신중해야 한다.
- 음성 스크립트는 코스의 유닛 파일을 전부 다시 쓴다. 누가 유닛을 편집하는 중이면 끝난 뒤에 돌린다.
- 음성 목록은 `edge-tts --list-voices`로 본다.

## 6. 레벨 테스트

유닛 제목을 `레벨 테스트`로 두면 그 유닛이 진단 시험이 된다. 각 문제의 `level`(숫자)과 `tag`(예: grammar, vocab, reading, listening)를 쓰면 `/level` 화면에 급수×영역별 첫 시도 정답률 표가 나오고, 마크다운으로 복사할 수 있다. 그 표를 AI에게 다시 주면 다음 유닛의 배분을 조정하게 할 수 있다. 첫 시도만 세므로, 학습자가 풀기 시작한 뒤에는 이 유닛을 다시 시드하지 않는다.

## 7. AI에게 줄 부탁 예시

```
너는 <언어> 커리큘럼 설계자다. 첨부한 docs/COURSES.md의 형식과 "좋은 문제의 조건"을 지켜서
<학습자 설명: 모국어, 현재 수준, 목표, 기한>을 위한 코스 <id>의 1주차 유닛을
<id>/units/unit-01.json 으로 써 줘. 레슨 6개, 레슨당 10문제, 7가지 유형을 고루 쓰고,
헷갈리는 문제에는 meta.explanation을 붙여.
```

AI가 쓴 파일은 반드시 `--check`로 검증한다. 형식 오류는 검사기가 잡지만 내용 오류(정답이 틀림, 비문)는 못 잡는다. 사람이나 다른 AI가 한 번 검토한 뒤 시드한다.

## 8. 쓰기 과제 (채점은 밖에서)

객관식으로 잴 수 없는 쓰기는 과제로 낸다. 학습자가 답안을 제출하면 DB에 쌓이고, 채점자(사람이든 AI든)가 점수와 첨삭을 돌려주면 학습자 화면에 뜬다. 코스에 과제가 하나라도 있으면 학습 화면에 "쓰기 과제" 줄이 생긴다.

```jsonc
// <root>/<course>/writing/w53-01.json — 파일 하나가 과제 하나
{
  "id": "w53-01",            // 영문·숫자·-·_ (주소에 쓰인다)
  "number": 53,              // 선택: 시험 문항 번호 배지
  "order": 1,                // 선택: 목록 순서 (없으면 id 순)
  "title": "53번 · 1인 가구 비율의 변화",
  "prompt": "다음을 참고하여 …\n\n| 연도 | 2005년 | … |",   // 마크다운, 표 가능
  "maxScore": 30,
  "minChars": 200, "maxChars": 300,   // 선택: 띄어쓰기 포함, 줄바꿈 제외로 센다
  "blanks": ["㉠", "㉡"],              // 선택: 빈칸마다 입력칸. 없어도 지시문에 ㉠ ㉡가 둘 이상이면 자동
  "rubric": "채점 기준·모범 답안 …"      // 채점자용. 학습자에게는 보내지 않는다
}
```

채점 흐름:

```bash
export DATABASE_URL=… CONTENT_DIR=../my-courses
pnpm exec tsx scripts/writing.ts pending > batch.json   # 미채점 답안 + 과제 정보 + rubric
# batch.json의 각 항목에 "score"(0..maxScore)와 "feedback"(마크다운)을 채운다 — AI에게 맡겨도 된다
WRITING_GRADER=tutor pnpm exec tsx scripts/writing.ts grade batch.json
```

채점자에게는 이 표 하나만 읽고 점수 칸만 쓸 수 있는 DB 계정을 따로 주면 된다:

```sql
create role solingo_grader login password '…';
grant connect on database solingo to solingo_grader;
grant usage on schema public to solingo_grader;
grant select on writing_submissions to solingo_grader;
grant update (score, feedback, graded_at, grader) on writing_submissions to solingo_grader;
```

`seed-course --check`는 과제 파일도 검사한다(필수 필드, id 중복, 글자 수 범위).

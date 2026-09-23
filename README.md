# Solingo

셀프호스팅하는 듀오링고식 언어 학습 플랫폼입니다. **커리큘럼은 들어 있지 않습니다.** 배우려는 언어와 목표에 맞는 코스를 AI로 직접 만들어 얹어 쓰는 것을 전제로 만들었습니다.

*A self-hosted, Duolingo-style learning platform. It ships without a curriculum: you write your own courses (typically with an AI) against a JSON spec and load them in. The UI is Korean.*

## 들어 있는 것

- **학습 경로**: 코스 → 유닛 → 레슨. 유닛마다 진행 막대, 레슨을 끝내면 다음이 열린다.
- **문제 유형 7가지**: 고르기(SELECT), 말풍선 고르기(ASSIST), 듣고 고르기(LISTEN), 짝 맞추기(MATCH), 타일로 문장 만들기(BUILD), 따라 쓰기(TRACE), 따라 말하기(SPEAK, 브라우저 음성 인식).
- **학습 루프**: 틀린 문제는 레슨이 끝나기 전에 다시 나오고, 약점 복습이 모아서 다시 낸다. 레벨 테스트 결과는 급수×영역 표로 나온다.
- **쓰기 과제**: 지시문(마크다운·표), 글자 수 카운터, 빈칸별 입력칸, 제출 이력과 점수·첨삭. 채점은 스크립트로(사람이든 AI든).
- **동기 장치**: XP, 연속 출석(보호권), 커플 연속 출석, 일일 퀘스트와 젬, 상점(프로필 꾸미기), 업적, 주간 리더보드, 콤보와 축하 애니메이션.
- **히라가나 훈련**: 가나 전용 적응형 엔진(`public/kana`). 새 글자 소개 → 따라 쓰기 → 4라운드 반복, 계정에 진도 저장.
- **자체 인증**(Better Auth, 이메일+비밀번호)과 **아무 Postgres**.
- 샘플 코스 하나: **일본어 가나**(15유닛 886문제, 음성 포함).

## 띄우기

```sh
docker run -d --name solingo-pg -e POSTGRES_USER=solingo -e POSTGRES_PASSWORD=solingo \
  -e POSTGRES_DB=solingo -p 5433:5432 -v solingo-pg:/var/lib/postgresql/data postgres:16-alpine
cp .env.example .env        # BETTER_AUTH_SECRET(openssl rand -hex 32), ADMIN_EMAILS
pnpm install
pnpm run db:push
pnpm run db:seed:kana       # 샘플: 일본어 가나
pnpm dev
```

## 내 코스 만들기

1. 저장소 밖에 코스 폴더를 만든다. 비공개 git 저장소를 권한다. 학습자 정보와 진단 결과가 담기는 곳이라 이 저장소에 섞지 않는다.
2. `.env`에 `CONTENT_DIR=../my-courses`를 넣는다. 앱과 스크립트는 이 폴더를 먼저 보고, 없으면 저장소의 `content/`(샘플)를 본다.
3. [`docs/COURSES.md`](docs/COURSES.md)를 AI에게 주고 유닛을 쓰게 한다. 이 문서에 형식, 7가지 유형의 필수 필드, 좋은 문제의 조건, 부탁 예시가 있다.
4. 검증하고, 음성을 만들고, 시드한다:

```sh
pnpm exec tsx scripts/seed-course.ts my-course --check          # DB 없이 형식·음성 검증
python3 scripts/gen_course_audio.py my-course ko-KR-SunHiNeural  # edge-tts로 음성 생성
pnpm run db:seed:course my-course
```

유닛 제목을 `레벨 테스트`로 두면 진단 시험이 된다. 결과 표를 AI에게 다시 주면 다음 유닛의 배분을 맞출 수 있다.

쓰기처럼 자동 채점이 안 되는 것은 **쓰기 과제**로 낸다. 학습자가 제출하면 `scripts/writing.ts`로 채점자(사람이나 AI)가 점수와 첨삭을 돌려준다([COURSES.md §8](docs/COURSES.md)).

## 배포

도커 이미지 하나에 Postgres가 붙는다. 코스 폴더는 이미지에 넣지 않고 마운트한다.

```sh
docker build -t solingo .
docker run -d --name solingo --env-file .env -p 3000:3000 \
  -v /srv/my-courses:/courses:ro -e CONTENT_DIR=/courses solingo
# 스키마: docker exec solingo sh -c 'cd /app && node_modules/.bin/drizzle-kit push --force'
# 시드:   docker exec solingo sh -c 'cd /app && node_modules/.bin/tsx scripts/seed-course.ts my-course'
```

음성은 `/audio/<코스>/<파일>` 경로로 앱이 코스 폴더에서 직접 서빙한다(Range 요청 지원, 해시 이름이라 영구 캐시).

## 출처

[sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone)(MIT, © 2024 Sanidhya Kumar Verma)을 포크해 시작했다. 학습 경로·하트·상점의 뼈대가 거기서 왔고, 인증(Clerk → Better Auth), DB 드라이버, 문제 유형, 콘텐츠 파이프라인, 가나 엔진은 이 저장소에서 새로 만들었다. 라이선스는 [LICENSE](LICENSE).

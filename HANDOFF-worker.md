# 핸드오프 — ja-worker (opencode, 팬 %208) → 오케스트레이터 (claude@%205)

2026-09-03 기준. 이 세션에서 한 일과 현재 상태.

## 1) 한 작업

### 튜터 세션의 미완 작업 이어받기
- 튜터(n4zh)가 리밋으로 멈춘 일본어 커리큘럼을 완성: `content/ja-jlpt/units/week-05~13.json` (주당 6레슨 × 10문항 = 540문항) + `curriculum.md`.
- N5(5~7주차) → N4(8~11주차, 한자 후리가나 없이 노출 + TRACE) → 기출 모드(12~13주차) 설계는 ko-topik/BRIEF.md의 지시를 따름.
- 540문항은 손작성 대신 `content/ja-jlpt/gen/` (DSL → JSON 제너레이터)로 만들고, 빌드 시 규칙 검증: 같은 형식 연달아 3개 금지 / 선택형 보기 4개·정답 1개 / MATCH 4쌍 균형 / BUILD target = 정답 타일 연결.

### 다정 피드백 반영 (앱 러너 수정)
1. **오답 해설**: `challenge.meta.explanation`을 오답 푸터에 표시(quiz.tsx + footer.tsx). placement 68문항 전부 해설 작성(`patch_explanations.py`), ja-jlpt 신규 문항에도 해설 포함.
2. **정답 1번 고정 버그**: 배치 테스트 68/68문항 정답이 보기 1번이었음을 실증. 수정은 두 층: (a) 러너가 렌더 시점에 문항 id 기반 결정론적 셔플(quiz.tsx useMemo — 기존 콘텐츠도 자동 적용), (b) 새 콘텐츠는 빌드 시 정답 위치 순환 배치.
3. **가독성**: 보기 카드 36px→20px, `word-break: keep-all`(어절 중간 줄바꿈 제거), 큰 글씨(kana) 처리를 2자 이하로 제한(card.tsx, question-bubble.tsx).
4. **렌더 버그 수정(249455c)**: (2)의 셔플이 판정에만 쓰이고 화면엔 원본이 나가던 문제 — 셔플된 options를 Challenge 프롭으로 전달.

### prod 배포 (승인받고 완료)
- 흐름: worktree rsync → 서버 docker build(`~/solingo-platform/Dockerfile`) → `solingo-app` 컨테이너 교체(`--network solingo`, `--env-file ~/solingo-platform/.env`) → 시드.
- 시드: `seed-course.ts ko-topik/placement`(해설 반영, 68문항) + `ja-jlpt`(13 유닛 786문항 — `content/ja-jlpt.json` 셸 파일 필요해서 서버/컨테이너에 생성).
- 검증(prod, QA 계정 로그인): 정답 보기 위치 3,1,1,2,1,4,2로 분산(이전 68/68이 1번), 오답 시 해설 표시, keep-all CSS 적용. 컨테이너 청크에 셔플/해설/keep-all 모두 확인.
- DB 백업: `~/backups/solingo-pre-deploy-20260903-1733.sql`(배치 재시드 전 시점).

### 진행 중 (미완)
- 다정 피드백 "진단 유형이 옛날 스타일" → 60회차 실제 TOPIK II 읽기 유형(빈칸·비슷한 의미·무엇에 대한 글·내용 일치·순서 배열·제목 설명·심정·주제·<보기> 삽입·쓴 목적·필자 태도 + 듣기)을 그대로 재현한 placement 재작성을 준비 중. **파일은 아직 미작성.** 60회 전체 문항 구조는 확보해 둠.

## 2) 파일·커밋
- 브랜치 **ja-jlpt-complete** (커밋 `d807087`, `249455c`):
  - 신규: `content/ja-jlpt/{curriculum.md, units/week-01..13.json, gen/*, build.py}`
  - 수정: `app/lesson/{quiz,footer,card,question-bubble,challenge}.tsx`
  - `content/ko-topik/placement.json`(해설) + `content/ko-topik/patch_explanations.py`
- 서버 `~/solingo-platform`은 git 저장소가 아니라 **rsync 동기화 + docker build** 방식. 병합과 무관하게 배포됨.
- 로컬 main 체크아웃(`~/myworld/solingo-platform`)은 파일 그대로 — 건드리지 않음. ja-jlpt weeks 01~04는 원래 main 체크아웃의 untracked 파일이라, worktree 브랜치에 동일 복사본을 커밋해 둠(병합 시 untracked 충돌 가능 — 그때 로컬 복사본 삭제 후 merge).

## 3) worktree 관계
- `~/myworld/solingo-ja-finish` = `~/myworld/solingo-platform`의 **git worktree**(브랜치 ja-jlpt-complete). 메인 체크아웃 무손상이 목적이었음.
- main에 반영하려면: `git -C ~/myworld/solingo-platform merge ja-jlpt-complete` (week-01~04 untracked 충돌 시 위 참고).

## 4) 미완·미검증 / 조율 필요
1. **placement 최신식 재작성** — 위 "진행 중". 완성하면 `seed-course.ts ko-topik/placement` 재시드 필요. **재시드하면 다정의 진단 응답 기록이 다시 초기화됨**(지금은 진단 1 재응시 직전 상태).
2. **ja-jlpt 오디오 미렌더**: LISTEN/BUILD/SPEAK의 `audioSrc` 비어 있음. `python3 scripts/gen_course_audio.py ja-jlpt ja-JP-NanamiNeural` (edge-tts 필요 — 로컬 맥에는 설치해 둠, 서버는 미확인). 렌더 후 재시드.
3. **prod QA 계정**: `qa@solingo.local / qa123456` 생성해 둠(종단 검증용, 진행 일부 있음). 삭제/유지는 결정 필요.
4. **튜터 세션(n4zh) 19:30 리밋 해제 예정** — placement 재작성 사항을 튜터에게 알리면 커리큘럼(2단계) 작성 시 유형이 맞춰짐. placement-NOTES.md도 재작성 후 업데이트 필요.
5. ja-jlpt 일부 복습 레슨은 해설 커버리지가 낮음(week 6~13 일부). 필요 시 gen DSL에 explanation 추가 후 재빌드.
6. worktree의 `tsc --noEmit`에 stripe API 버전 에러 1개 — main 체크아웃에선 재현 안 됨(node_modules 버전 차이, 내 변경분과 무관).

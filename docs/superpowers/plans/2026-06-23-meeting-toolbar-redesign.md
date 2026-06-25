# Meeting Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회의록 편집 툴바를 HWP/DOCX 계열 문서앱처럼 더 익숙하고 덜 투박하게 보이도록 재배치하고 재스타일링한다.

**Architecture:** 기존 `contenteditable` 기반 편집기와 Firebase 저장 구조는 그대로 유지한다. `meeting-editor.html` 안의 툴바 DOM 순서와 CSS만 재정리하고, 라벨/그룹/버튼 위계를 문서앱형으로 다시 맞춘다.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Firebase Realtime Database

---

### Task 1: 툴바 우선순위 재배치

**Files:**
- Modify: `meeting-editor.html`

- [ ] `폰트 > 크기 > 굵게 > 글자색 > 배경색 > 목록 > 정렬` 순서로 툴바 그룹을 재배치한다.
- [ ] 보조 기능은 시각적 강조를 낮추거나 뒤로 보낸다.

### Task 2: 문서앱형 컨트롤 스타일 적용

**Files:**
- Modify: `meeting-editor.html`

- [ ] 버튼 높이, 패딩, 테두리, 배경을 줄여서 툴바를 더 얇고 가볍게 만든다.
- [ ] 버튼 라벨과 선택 컨트롤 스타일을 HWP/DOCX 계열 문서앱처럼 평평하고 읽기 쉽게 맞춘다.
- [ ] 그룹 구분은 과한 캡슐형 대신 약한 구분선과 간격으로 처리한다.

### Task 3: UX 정리

**Files:**
- Modify: `meeting-editor.html`

- [ ] `좌/중/우` 같은 투박한 표현을 더 익숙한 라벨 또는 아이콘 느낌으로 조정한다.
- [ ] 자주 쓰는 기능이 첫 시선에 읽히도록 순서와 시각 위계를 맞춘다.
- [ ] 기존 저장, 불러오기, 동기화 동작에 영향이 없는지 확인한다.

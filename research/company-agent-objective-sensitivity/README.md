# Objective Sensitivity in Enterprise Agents

## 쉬운 설명 (10문장 이하)

회사를 운영하는 AI에게 무엇을 잘하라고 말하느냐가 회사를 바꿀 수 있습니다.
매출을 최우선으로 한 AI와 신뢰를 최우선으로 한 AI는 같은 상황에서도 다른
결정을 내릴 수 있습니다. 이 연구는 회사의 초기 상태와 도구, 사건, 운을
짝지어 고정하고 구조화된 KPI 메시지를 무작위로 바꿉니다. 그런 다음 행동,
성과, 규칙 위반, 고객 신뢰, 나중에 나타나는
손해를 함께 기록합니다. 중요한 것은 한 KPI 점수만 보지 않고 모든 결과를 같은
장부에 남기는 것입니다. 이미 CoffeeBench가 이익 목표를 매출 목표로 바꾼 작은
실험을 했으므로, 우리는 “최초”라고 주장하지 않습니다. 우리의 후보 기여는
여러 목표를 짝지어 비교하며 직접 효과와 이후 상태 변화가 섞인 총효과를
구분하는 측정 절차입니다. 현재 포함된 숫자는
frontier AI 결과가 아니라 코드가 작동하는지 확인한 합성 heuristic simulation입니다.
실제 논문 결론은 공개 사전등록, 모델 실험, 독립 채점 뒤에만 작성합니다.

## 현재 판정

- Contribution class: **new benchmark/protocol candidate**, not new MORL theory.
- Primary title: **Objective Sensitivity in Enterprise Agents: Paired Audits of
  KPI-Induced Behavior**.
- Novelty status: **HOLD / conditional GO**. CoffeeBench replication plus a systematic
  factorial extension is required; a generic “different rewards yield different
  policies” claim is a novelty failure.
- Data status: synthetic only. No Ralphthon participant or company record was used.
- Pilot status: 72 deterministic heuristic episodes are plumbing evidence only.

## Reproduce

```bash
uv sync
uv run pytest -q
uv run company-objective-pilot \
  --output-dir results \
  --seeds 11 22 33 44 55 66 77 88 99 111 222 333 \
  --horizon 6
```

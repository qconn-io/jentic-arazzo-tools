# Unfamiliar-reader comprehension protocol

Status: prepared, not conducted. Automated browser navigation and layout checks are recorded separately in `browser-evidence/acceptance/observations.json`. They establish operability, not human comprehension. No completion rate, timing, assistance result, or participant quotation has been collected.

Recruit API Owners and Developers who have not authored these fixtures or seen the implementation. Record role, relevant experience, prior exposure, viewport, build asset hashes, and document revision. Use both 1440- and 480-pixel widths, counterbalancing order to avoid treating learned answers as first-use results. Let each participant use the viewer with its default controls; do not show source YAML or coach them initially. Ask them to think aloud and explain the evidence for each answer. Stop a task at five minutes or at their request; record the actual stop condition.

| Task | Prompt without solution | Evidence rubric for observer |
| --- | --- | --- |
| Small purchase | Explain how the client obtains a usable digital product. What evidence establishes payment and readiness? | Distinguishes client purchase from descriptive server implementation; explains reserve → capture evidence → license and guarded activation. Does not equate request acceptance with payment or activation success. |
| Capture uncertainty | Locate the guard for an unknown payment capture outcome. What recovery is possible, and how does decline differ? | Finds UNKNOWN/503 criteria, reconcile-payment, retry of capture-payment, limit 3 and delay 0.5; identifies separate DECLINED abort. Does not claim that displayed action order evaluates or selects an action. |
| Second item | Inspect the second item in batch fulfilment. Which values are passed, and which outputs belong to it? Return from its callee. | Identifies second-item, 2499, digital-upgrade, and -B mapping; distinguishes caller values from callee declarations; returns to the exact call occurrence. |
| Timeout fallback | Explain what happens if the event completion receive cannot establish readiness. What links the event to this purchase? | Finds correlation $inputs.purchaseId, timeout 12000, receive retries with limit 2 and delay 0.5, and one-way polling fallback. Does not infer delivery guarantees or business success from send/receipt. |
| Boundary content | Find observation-250, inspect it, and explain what the display limit means. Explore a recursion/depth marker. | Uses authored search or complete docs beyond 200 displayed rows; opens the scoped step; understands finite scenes and marker navigation without treating omitted content as absent or executed. |

Capture a fresh row for each participant/task/width. Leave unknown results blank, not successful by default. Count interactions and elapsed effort from task presentation until their final explanation. Record assistance in order (none, neutral prompt, control hint, domain hint, supplied answer), including its wording and time. After unassisted time expires, optional assisted completion is a separate outcome. Preserve incorrect interpretations even if the participant later corrects them.

| Participant / role / experience | Task / width / order | Build hashes / document revision | Unassisted outcome and stop condition | Elapsed seconds / interactions | Assistance with time and wording | Explanation or quotation, only if collected | Incorrect interpretations and corrections | Assisted outcome | Observer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Not conducted | | | | | | | | | |

For keyboard sessions also record whether focus reached distinguishable repeated-operation/action controls, stayed inside the narrow inspector, and returned to a valid control after Escape. These observations supplement the task explanation; clicking a control alone does not pass the comprehension rubric.

Release objective: unassisted completion of the critical tasks without incorrect claims of payment, event delivery, or activation success. Report per-task failures and assistance openly. This protocol does not establish that objective has been achieved; human sessions remain to be performed.

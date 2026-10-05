# Private sequence scene

`buildSequence(model, rootWorkflowId, expansion)` projects already inspected facts
without parsing, resolution, network access, expression evaluation, or mutation.
It is shared by React/SVG and static Mermaid. Nothing in this directory is a
public export.

Rows retain their owning workflow, step/action, classified target and complete
call path. IDs serialize document identity, root workflow, path and local fact
identity. Repeated calls have separate IDs and mapping contexts; source lifelines
are shared only for an identifiable declared source. Workflow lifelines represent
authored control context. Unknown destinations belong to their occurrences.

Direct local calls initially expand. A boolean expansion record overrides each
occurrence independently. Recursion checks the active call path; legitimate
repeated calls are not suppressed by a global visited set. Display budgets are
eight nested call levels and 200 rows, including annotations and markers. The
last row is reserved for contextual omitted-content information. A boundary
offers the classified local target for opening as a new root. It never means
execution ended or succeeded.

Calls have structural continuations. Conditional goto/retry rows are possible
alternatives: goto is one-way, recovery returns to retry its source step.
Prerequisites are dependence annotations, not invocations. Async receive retains
its authored direction. The scene invents no response or activation lifetime and
never chooses an outcome. Full values, source metadata, criteria and diagnostics
remain in the owning facts for the shared details projection.

---
title: Testability
---
Adhering to object composition rather than implementation inheritance also
means that tests for each object can remain focused and relatively easy to
write. With implementation inheritance, you're often not only testing the
behavior of a subclass, but its parents, and its parents' parents, and so on.
This can lead to tests that are complex to set up, confusing to understand,
slow to run, and possibly flaky (i.e. it passes or fails inconsistently).

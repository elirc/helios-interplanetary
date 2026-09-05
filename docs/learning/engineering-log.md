# Engineering learning log

The user requested a separate folder for teaching. The curriculum and human progress record live in [upskilling/](../../upskilling/README.md); avoid duplicating them here.

The first build exposed a useful real integration failure: Next.js loopback normalization conflicted with the original host check. See [the case study](../../upskilling/case-studies/001-framework-host-normalization.md). Its lesson is to verify the actual HTTP boundary in addition to pure and database tests.

Software test success is implementation evidence. No human exercise has been assessed yet.

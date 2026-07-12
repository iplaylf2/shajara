# @shajara/docs

## 0.6.2

### Patch Changes

- [#55](https://github.com/iplaylf2/shajara/pull/55) [`dd100df`](https://github.com/iplaylf2/shajara/commit/dd100dfca9883c9cfd90c2679395ba033cb3eb39) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Document managed-scope shutdown and scheduler lifetime.

  The `createScope()` guide now explains that an open managed scope keeps a Node.js process
  active, while a settled `run(...)` releases scheduler resources. Readers can also see how
  asynchronous disposal completes normal shutdown without surfacing expected cancellation.

- Updated dependencies [[`dd100df`](https://github.com/iplaylf2/shajara/commit/dd100dfca9883c9cfd90c2679395ba033cb3eb39), [`dd100df`](https://github.com/iplaylf2/shajara/commit/dd100dfca9883c9cfd90c2679395ba033cb3eb39)]:
  - @shajara/host@0.11.0

## 0.6.1

### Patch Changes

- [#53](https://github.com/iplaylf2/shajara/pull/53) [`898cf63`](https://github.com/iplaylf2/shajara/commit/898cf633d9d36e383cfd790e952d5952dcc41d66) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Add shajara branding to the docs site logo, favicon, API Map, and Flow Explorer.

- Updated dependencies [[`898cf63`](https://github.com/iplaylf2/shajara/commit/898cf633d9d36e383cfd790e952d5952dcc41d66)]:
  - @shajara/host@0.10.2

## 0.6.0

### Minor Changes

- [#51](https://github.com/iplaylf2/shajara/pull/51) [`47871fb`](https://github.com/iplaylf2/shajara/commit/47871fb1982a4ad6ca712f0d124de767cb3cdc5d) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Add a Scope Autonomy concept page to the docs site.

  Readers can now use the Concepts section to understand when `autonomy(...)`, `cede()`,
  custom schedulers, and reapers matter for a child scope subtree's local progression and
  closing policy.

## 0.5.2

### Patch Changes

- [#49](https://github.com/iplaylf2/shajara/pull/49) [`f73c082`](https://github.com/iplaylf2/shajara/commit/f73c0824771e2e3711360aec7b17f79630483874) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Refine the docs site around ownership and result terminology.

  Readers now see consistent wording for external handles, scope ownership, future
  completion, process results, and recovery boundaries across guides, topics, concepts, and
  Explorer copy.

- Updated dependencies [[`f73c082`](https://github.com/iplaylf2/shajara/commit/f73c0824771e2e3711360aec7b17f79630483874)]:
  - @shajara/host@0.10.1

## 0.5.1

### Patch Changes

- [#47](https://github.com/iplaylf2/shajara/pull/47) [`b01bf11`](https://github.com/iplaylf2/shajara/commit/b01bf1110f635b7144e030f9ee597aa5aa905ad2) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Align docs with unfulfilled future ownership.

  The docs site and scope-managed objects Explorer example now describe owner-scope closure
  as producing unfulfilled pending futures.

- Updated dependencies [[`b01bf11`](https://github.com/iplaylf2/shajara/commit/b01bf1110f635b7144e030f9ee597aa5aa905ad2)]:
  - @shajara/host@0.10.0

## 0.5.0

### Minor Changes

- [#45](https://github.com/iplaylf2/shajara/pull/45) [`9b72360`](https://github.com/iplaylf2/shajara/commit/9b72360dda5773cf2a8980fbabc4fb31ab9b136a) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Add a Concepts section to the docs site.

  Readers can now move from task-focused guides into concept pages when they need more
  background on how shajara structures routine work and ownership.

## 0.4.1

### Patch Changes

- [#43](https://github.com/iplaylf2/shajara/pull/43) [`a21411a`](https://github.com/iplaylf2/shajara/commit/a21411a493a72fda428d956cdaaa8652e434d8ee) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Refine the Flow Explorer around routine ownership.

  Readers can now follow Flow Explorer examples through the same routine model described in
  the package docs. Replay views make routine ownership and state changes easier to follow.

- Updated dependencies [[`a21411a`](https://github.com/iplaylf2/shajara/commit/a21411a493a72fda428d956cdaaa8652e434d8ee)]:
  - @shajara/host@0.9.1

## 0.4.0

### Minor Changes

- [#41](https://github.com/iplaylf2/shajara/pull/41) [`edba577`](https://github.com/iplaylf2/shajara/commit/edba57726ca19c5a5e371ee87d64879e0db2013b) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Refine the docs site around task-focused guides and topics.

  Readers can now follow a `createScope()` guide for long-lived boundaries and use dedicated
  topic pages for futures, channels, context, and recovery. The refreshed home page
  separates the documentation, Explorer, and API map entry points more clearly, while the
  project and package overviews point readers to the docs.

## 0.3.0

### Minor Changes

- [#38](https://github.com/iplaylf2/shajara/pull/38) [`e59832b`](https://github.com/iplaylf2/shajara/commit/e59832b2d2bde23cbb26c044590a87f4e149ef06) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Expand the docs site beyond the initial preview.

  Readers can now move from first use to the API map with new guides and refreshed home
  navigation.

### Patch Changes

- [#40](https://github.com/iplaylf2/shajara/pull/40) [`75a0a9f`](https://github.com/iplaylf2/shajara/commit/75a0a9f83171460495d203960d055761bd6daece) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Align server-scope docs with managed ownership.

  The server-scope guide and explorer cleanup now match the host behavior for launched work
  ownership and expected shutdown cancellation.

- Updated dependencies [[`e59832b`](https://github.com/iplaylf2/shajara/commit/e59832b2d2bde23cbb26c044590a87f4e149ef06), [`75a0a9f`](https://github.com/iplaylf2/shajara/commit/75a0a9f83171460495d203960d055761bd6daece)]:
  - @shajara/host@0.9.0

## 0.2.2

### Patch Changes

- Updated dependencies [[`4632c43`](https://github.com/iplaylf2/shajara/commit/4632c43233e846a87f28d22276132da219da1af4)]:
  - @shajara/host@0.8.0

## 0.2.1

### Patch Changes

- [#34](https://github.com/iplaylf2/shajara/pull/34) [`0aed734`](https://github.com/iplaylf2/shajara/commit/0aed7346c02fe4632678c4c7fefccdfe05fe05da) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Clarify the recovery boundary example wording so it describes guard recovery
  without implying that only scope failures can reach the handler.
- Updated dependencies [[`0aed734`](https://github.com/iplaylf2/shajara/commit/0aed7346c02fe4632678c4c7fefccdfe05fe05da)]:
  - @shajara/host@0.7.0

## 0.2.0

### Minor Changes

- [#31](https://github.com/iplaylf2/shajara/pull/31) [`d06a128`](https://github.com/iplaylf2/shajara/commit/d06a1283df224e71beb30e8b7d7deef483e1f819) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Publish the initial docs site release and set up automatic deployment for future
  docs releases.

## 0.1.5

### Patch Changes

- Updated dependencies [[`b8f17b2`](https://github.com/iplaylf2/shajara/commit/b8f17b2e7a78c86d492a879ebaeb3b555aff3601)]:
  - @shajara/host@0.6.0

## 0.1.4

### Patch Changes

- Updated dependencies [[`5876ac5`](https://github.com/iplaylf2/shajara/commit/5876ac5d696f40e3757cd8a697aeb2c06a39ab5c)]:
  - @shajara/host@0.5.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`6bea430`](https://github.com/iplaylf2/shajara/commit/6bea43011f61985f5ef5ea23b452324e24e1561d)]:
  - @shajara/host@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [08bfbdc]
  - @shajara/host@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [bd357f9]
- Updated dependencies [2f51241]
- Updated dependencies [0f7c29a]
  - @shajara/host@0.2.0

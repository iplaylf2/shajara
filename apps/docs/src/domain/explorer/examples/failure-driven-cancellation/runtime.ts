// oxlint-disable max-lines-per-function
import { ScopeError, sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";
import {
  branchWait,
  clearCursor,
  codeLine,
  codeSpacer,
  completeEvents,
  cursorAt,
  setCursor,
} from "#/domain/explorer/examples-kit";
import type { ExplorerAuthoredEvent } from "#/domain/explorer/examples-kit";
import type { ExplorerReplayEmit } from "#/domain/explorer/contract";
import type { RiteCoroutine } from "@shajara/host";

// oxlint-disable-next-line explicit-module-boundary-types
export function createFailureDrivenCancellationDemoCode() {
  return [
    codeLine("function-open", "function* launchCampaign() {", ["done"]),
    codeLine("branch-open", "  yield* branch(function* sendCampaign() {", ["scope-closed"]),
    codeLine("spawn-email", "    yield* spawn(function* sendEmailBatch() {", ["email-throw"]),
    codeLine("email-sleep", `      yield* sleep(${EMAIL_DELAY_MS});`, ["email-throw"]),
    codeLine("email-throw", '      throw new Error("email provider failed");', ["email-throw"]),
    codeLine("email-close", "    });", ["email-throw"]),
    codeSpacer(),
    codeLine("spawn-audience", "    yield* spawn(function* refreshAudience() {", [
      "audience-cancel",
    ]),
    codeLine("audience-sleep", `      yield* sleep(${AUDIENCE_DELAY_MS});`, ["audience-cancel"]),
    codeLine("audience-close", "    });", ["audience-cancel"]),
    codeSpacer(),
    codeLine("campaign-sleep", `    yield* sleep(${CAMPAIGN_DELAY_MS});`, ["campaign-cancel"]),
    codeLine("branch-close", "  });", ["scope-closed"]),
    codeLine("done", "}", ["done"]),
  ];
}

export function* failureDrivenCancellationDemo(
  emit: ExplorerReplayEmit<FailureDrivenCancellationDemoEvent>,
): RiteCoroutine<string> {
  return yield* branch(function* launchCampaign(): RiteCoroutine<string> {
    emit({
      actions: [setCursor(cursorAt("root", ["branch-open", "launch-scope"], "running"))],
    });
    try {
      yield* branch(
        branchWait(
          emit,
          { events: ["branch-open", "scope-wait-root"], targetId: "root" },
          function* sendCampaign(): RiteCoroutine<void> {
            emit({
              actions: [
                setCursor(cursorAt("campaign", ["spawn-email", "launch-email"], "running")),
              ],
            });
            yield* spawn(function* sendEmailBatch(): RiteCoroutine<void> {
              emit({ actions: [setCursor(cursorAt("email", "email-sleep", "running"))] });
              yield* sleep(EMAIL_DELAY_MS);
              emit({
                actions: [setCursor(cursorAt("email", ["email-throw", "email-close"], "running"))],
              });
              try {
                throw new Error("email provider failed");
              } catch (error) {
                emit({
                  actions: [clearCursor("email"), completeEvents("email-throw")],
                });
                throw error;
              }
            });

            emit({
              actions: [
                setCursor(cursorAt("campaign", ["spawn-audience", "launch-audience"], "running")),
              ],
            });
            yield* spawn(function* refreshAudience(): RiteCoroutine<void> {
              try {
                emit({
                  actions: [setCursor(cursorAt("audience", "audience-sleep", "running"))],
                });
                yield* sleep(AUDIENCE_DELAY_MS);
              } finally {
                emit({
                  actions: [setCursor(cursorAt("audience", "audience-cancel", "blocked"))],
                });
              }
            });

            try {
              emit({ actions: [setCursor(cursorAt("campaign", "campaign-sleep", "running"))] });
              yield* sleep(CAMPAIGN_DELAY_MS);
            } finally {
              emit({
                actions: [setCursor(cursorAt("campaign", "campaign-cancel", "blocked"))],
              });
            }
          },
        ),
      );
    } catch (error) {
      if (!(error instanceof ScopeError)) {
        throw error;
      }

      emit({
        actions: [
          clearCursor("audience"),
          clearCursor("campaign"),
          clearCursor("root"),
          completeEvents([
            "campaign-cancel",
            "audience-cancel",
            "scope-wait-root",
            "scope-closed",
            "failure-surfaced",
            "done",
          ]),
        ],
      });

      return "campaign canceled";
    }

    return "campaign launched";
  });
}

export type FailureDrivenCancellationDemoEvent = ExplorerAuthoredEvent<
  ReturnType<typeof createFailureDrivenCancellationDemoCode>,
  | "audience-cancel"
  | "campaign-cancel"
  | "launch-audience"
  | "launch-email"
  | "launch-scope"
  | "failure-surfaced"
  | "scope-closed"
  | "scope-wait-root"
>;

const AUDIENCE_DELAY_MS = 6000;
const CAMPAIGN_DELAY_MS = 6000;
const EMAIL_DELAY_MS = 1000;

import { afterEach, expect, it, vi } from "vitest";
import { waitForShellPrompt } from "../scripts/smoke-live-readiness";

const chunk = (text: string) => ({ dataBase64: Buffer.from(text).toString("base64") });
afterEach(() => vi.useRealTimers());

it("waits through slow startup, renders fragmented prompt signals, and resumes at the next sequence", async () => {
  vi.useFakeTimers();
  const events: string[] = [];
  const read = vi.fn()
    .mockResolvedValueOnce({ nextSeq: 1, chunks: [chunk("\x1b]0;bb-fg:shell:zsh\x07")] })
    .mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      return { nextSeq: 2, chunks: [chunk("\x1b]1337;CurrentDir=/tmp\x07\x1b]0;bb-fg:she")] };
    })
    .mockResolvedValueOnce({ nextSeq: 3, chunks: [chunk("ll:zsh\x1b\\")] });
  const ready = waitForShellPrompt({
    read,
    consume: async (output) => { events.push(`render:${output.nextSeq}`); },
  }).then((result) => { events.push("command"); return result; });
  await vi.advanceTimersByTimeAsync(5000);
  expect(events).toEqual(["render:1"]);
  await vi.advanceTimersByTimeAsync(1500);
  expect(await ready).toMatchObject({ nextSeq: 3, elapsedMs: 6200 });
  expect(read.mock.calls).toEqual([[0, true, 15000], [1, false, 14900], [2, false, 8800]]);
  expect(events).toEqual(["render:1", "render:2", "render:3", "command"]);
});

it("does not mistake a launcher title or directory without a later idle title for an interactive prompt", async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockResolvedValue({ nextSeq: 1, chunks: [] });
  read.mockResolvedValueOnce({ nextSeq: 1, chunks: [chunk("\x1b]0;bb-fg:shell:zsh\x07\x1b]1337;CurrentDir=/tmp\x07")] });
  const failure = expect(waitForShellPrompt({ read, consume: async () => {}, timeoutMs: 500 }))
    .rejects.toThrow("Shell startup did not reach its first interactive prompt");
  await vi.advanceTimersByTimeAsync(500);
  await failure;
  expect(read).toHaveBeenCalledTimes(5);
});

it("keeps the startup deadline even when a read returns a prompt after it expires", async () => {
  vi.useFakeTimers();
  const failure = expect(waitForShellPrompt({
    read: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { nextSeq: 1, chunks: [chunk("\x1b]1337;CurrentDir=/tmp\x07\x1b]0;bb-fg:shell:zsh\x07")] };
    },
    consume: async () => {},
    timeoutMs: 500,
  })).rejects.toThrow("Shell startup did not reach its first interactive prompt");
  await vi.advanceTimersByTimeAsync(600);
  await failure;
});

it("reports a shell that exits during startup immediately", async () => {
  const consume = vi.fn(async () => {});
  await expect(waitForShellPrompt({
    read: async () => ({ nextSeq: 0, chunks: [], status: "exited" }),
    consume,
  })).rejects.toThrow("Shell exited before its first interactive prompt");
  expect(consume).toHaveBeenCalledOnce();
});

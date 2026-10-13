interface SmokeOutput {
  chunks: { dataBase64: string }[];
  nextSeq: number;
  status?: string | null;
}

/** PTY creation acknowledges spawn, before the interactive shell reads its rc.
 * Wait for its first directory + idle-title prompt signals before sending a
 * command. Keep this startup budget separate from the command/grid assertion.
 */
export async function waitForShellPrompt(options: {
  read: (sinceSeq: number, firstAttachment: boolean, remainingMs: number) => Promise<SmokeOutput>;
  consume: (output: SmokeOutput) => Promise<void>;
  timeoutMs?: number;
}): Promise<{ nextSeq: number; elapsedMs: number; bytes: number }> {
  const startedAt = Date.now();
  const deadline = startedAt + (options.timeoutMs ?? 15000);
  let nextSeq = 0;
  let firstAttachment = true;
  let tail = "";
  let bytes = 0;
  while (Date.now() < deadline) {
    const output = await options.read(nextSeq, firstAttachment, deadline - Date.now());
    firstAttachment = false;
    nextSeq = output.nextSeq;
    await options.consume(output);
    for (const chunk of output.chunks) {
      const decoded = Buffer.from(chunk.dataBase64, "base64");
      bytes += decoded.length;
      tail = (tail + decoded.toString()).slice(-4096);
    }
    // The launcher title alone precedes rc loading. A prompt reports its
    // directory first, then the idle shell title (possibly in another chunk).
    if (Date.now() < deadline &&
      /\x1b\]1337;CurrentDir=\/[^\x07\x1b]*(?:\x07|\x1b\\)[\s\S]*\x1b\][02];bb-fg:shell:[^\x07\x1b]+(?:\x07|\x1b\\)/.test(tail)) {
      return { nextSeq, elapsedMs: Date.now() - startedAt, bytes };
    }
    if (output.status === "exited" || output.status === "gone") {
      throw new Error("Shell exited before its first interactive prompt");
    }
    const remaining = deadline - Date.now();
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
  }
  throw new Error(`Shell startup did not reach its first interactive prompt (bytes=${bytes}, nextSeq=${nextSeq})`);
}

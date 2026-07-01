import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerQueue } from "./worker-queue.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("foreground work jumps ahead of queued background warmups", async () => {
  const queue = createWorkerQueue({ idleMs: 25 });
  const order = [];

  await queue.run(async () => { order.push("foreground-1"); });
  const background = queue.run(async () => { order.push("background-warm"); }, { background: true });
  await sleep(5);
  assert.deepEqual(order, ["foreground-1"]);

  const foreground = queue.run(async () => { order.push("foreground-2"); });
  await foreground;
  assert.deepEqual(order, ["foreground-1", "foreground-2"]);

  await background;
  assert.deepEqual(order, ["foreground-1", "foreground-2", "background-warm"]);
});

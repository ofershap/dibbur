import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BackgroundUpdater,
  UPDATE_INTERVAL_MS,
} from "../src/components/update-checker/backgroundUpdater.ts";

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setImmediate(r));
function setup(overrides = {}) {
  const calls = [];
  const states = [];
  const pkg = {
    rawJson: { version: "1.0.11" },
    download: async (cb) => {
      calls.push("download");
      cb?.({ event: "Started", data: { contentLength: 100 } });
      cb?.({ event: "Progress", data: { chunkLength: 100 } });
    },
    install: async () => {
      calls.push("install");
    },
    close: async () => {
      calls.push("close");
    },
  };
  const deps = {
    check: async () => {
      calls.push("check");
      return pkg;
    },
    isPortable: async () => false,
    beginInstall: async () => {
      calls.push("lock");
      return true;
    },
    endInstall: async () => {
      calls.push("unlock");
    },
    relaunch: async () => {
      calls.push("relaunch");
    },
    ...overrides,
  };
  const c = new BackgroundUpdater(deps, (s) => states.push(s));
  return { c, calls, states, pkg, deps };
}
test("startup automatically checks and downloads, never installs or restarts", async () => {
  const { c, calls } = setup();
  c.start();
  await tick();
  assert.equal(c.state.phase, "ready");
  assert.deepEqual(calls, ["check", "download"]);
  c.stop();
  await tick();
  assert.equal(calls.at(-1), "close");
});
test("only explicit install reserves idle coordinator, installs and relaunches", async () => {
  const { c, calls } = setup();
  c.start();
  await tick();
  await c.install();
  assert.deepEqual(calls, [
    "check",
    "download",
    "lock",
    "install",
    "relaunch",
    "unlock",
  ]);
  c.stop();
});
test("recording/transcription busy refuses installation and keeps package ready for retry", async () => {
  const { c, calls, deps } = setup({ beginInstall: async () => false });
  c.start();
  await tick();
  await c.install();
  assert.equal(c.state.phase, "busy");
  assert.equal(calls.includes("install"), false);
  deps.beginInstall = async () => true;
  await c.install();
  assert.equal(calls.includes("install"), true);
  c.stop();
});
test("duplicate checks and double starts do not duplicate downloads", async () => {
  const d = deferred();
  const { c, calls } = setup({ check: () => d.promise });
  c.start();
  c.start();
  await c.check();
  d.resolve(null);
  await tick();
  assert.equal(c.state.phase, "idle");
  c.stop();
});
test("double installation clicks reserve only once", async () => {
  const d = deferred();
  const { c, calls } = setup({ beginInstall: () => d.promise });
  c.start();
  await tick();
  const first = c.install();
  await c.install();
  d.resolve(true);
  await first;
  assert.equal(calls.filter((x) => x === "install").length, 1);
  c.stop();
});
test("portable install never downloads or installs automatically", async () => {
  const { c, calls } = setup({ isPortable: async () => true });
  c.start();
  await tick();
  assert.equal(c.state.phase, "portable");
  assert.deepEqual(calls, ["check", "close"]);
  await c.install();
  assert.equal(calls.includes("install"), false);
  c.stop();
});
test("disabled controller does not check", async () => {
  const { c, calls } = setup();
  await c.check();
  await c.install();
  assert.deepEqual(calls, []);
});
test("disable while check pending discards and closes response", async () => {
  const d = deferred();
  const { c, pkg, calls } = setup({ check: () => d.promise });
  c.start();
  c.stop();
  d.resolve(pkg);
  await tick();
  assert.equal(calls.includes("download"), false);
  assert.equal(calls.at(-1), "close");
  assert.equal(c.state.phase, "idle");
});
test("disable while download pending never publishes ready", async () => {
  const d = deferred();
  const { c, pkg } = setup();
  pkg.download = () => d.promise;
  c.start();
  await tick();
  c.stop();
  d.resolve();
  await tick();
  assert.equal(c.state.phase, "idle");
});
test("download/signature failure gives retry and releases resource", async () => {
  const { c, pkg, calls } = setup();
  pkg.download = async () => {
    throw Error("signature rejected");
  };
  c.start();
  await tick();
  assert.equal(c.state.phase, "error");
  assert.equal(calls.at(-1), "close");
  c.stop();
});
test("network failure gives retry, next check can succeed", async () => {
  const { c, deps } = setup({
    check: async () => {
      throw Error("offline");
    },
  });
  c.start();
  await tick();
  assert.equal(c.state.phase, "error");
  deps.check = async () => null;
  await c.check();
  assert.equal(c.state.phase, "idle");
  c.stop();
});
test("installation failure unlocks dictation and requires fresh package", async () => {
  const { c, pkg, calls } = setup();
  pkg.install = async () => {
    throw Error("no write permission");
  };
  c.start();
  await tick();
  await c.install();
  assert.equal(c.state.phase, "error");
  assert.equal(calls.includes("relaunch"), false);
  assert.equal(calls.at(-1), "unlock");
  c.stop();
});
test("relaunch failure unlocks dictation, releases package and shows error", async () => {
  const { c, calls } = setup({
    relaunch: async () => {
      throw Error("restart failed");
    },
  });
  c.start();
  await tick();
  await c.install();
  assert.equal(c.state.phase, "error");
  assert.equal(calls.at(-1), "unlock");
  c.stop();
});
test("downloaded package prevents periodic re-download", async () => {
  const { c, calls } = setup();
  c.start();
  await tick();
  await c.check();
  assert.equal(calls.filter((x) => x === "check").length, 1);
  c.stop();
});
test("period is six hours, stop clears timer", async () => {
  assert.equal(UPDATE_INTERVAL_MS, 21600000);
  const { c } = setup();
  c.start();
  await tick();
  c.stop();
  assert.equal(c.state.phase, "idle");
});

test("disable and re-enable during stale check schedules a fresh check", async () => {
  const d = deferred();
  let count = 0;
  const { c, pkg, calls } = setup({
    check: async () => {
      count++;
      return count === 1 ? d.promise : pkg;
    },
  });
  c.start();
  c.stop();
  c.start();
  d.resolve(null);
  await tick();
  await tick();
  assert.equal(count, 2);
  assert.equal(c.state.phase, "ready");
  c.stop();
});
test("disable while waiting for reservation cancels installation and unlocks", async () => {
  const d = deferred();
  const { c, calls } = setup({ beginInstall: () => d.promise });
  c.start();
  await tick();
  const install = c.install();
  c.stop();
  d.resolve(true);
  await install;
  assert(!calls.includes("install"));
  assert(calls.includes("unlock"));
  assert.equal(c.state.phase, "idle");
});
test("interval performs later checks and stop removes it", async () => {
  const oldSet = globalThis.setInterval,
    oldClear = globalThis.clearInterval;
  let fire,
    cleared = false;
  globalThis.setInterval = (fn, ms) => {
    fire = fn;
    assert.equal(ms, UPDATE_INTERVAL_MS);
    return 999;
  };
  globalThis.clearInterval = (id) => {
    if (id === 999) cleared = true;
  };
  try {
    let checks = 0;
    const { c } = setup({
      check: async () => {
        checks++;
        return null;
      },
    });
    c.start();
    await tick();
    fire();
    await tick();
    assert.equal(checks, 2);
    c.stop();
    assert(cleared);
  } finally {
    globalThis.setInterval = oldSet;
    globalThis.clearInterval = oldClear;
  }
});

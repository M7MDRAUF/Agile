import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { loadChannels } from "./notify/channels.ts";
import { runOnce, type RunResult } from "./run.ts";
import { loadState, saveState } from "./state.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface Flags {
  command: string;
  dryRun: boolean;
  verbose: boolean;
  config: string;
  state: string;
  now?: Date;
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {
    command: argv[0] && !argv[0].startsWith("--") ? argv[0] : "run",
    dryRun: false,
    verbose: false,
    config: process.env.JOB_RADAR_CONFIG ?? resolve(ROOT, "config.json"),
    state: process.env.JOB_RADAR_STATE ?? resolve(ROOT, ".state/state.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--verbose") flags.verbose = true;
    else if (arg === "--config") flags.config = resolve(value());
    else if (arg === "--state") flags.state = resolve(value());
    else if (arg === "--now") {
      flags.now = new Date(value());
      if (Number.isNaN(flags.now.getTime())) throw new Error("--now must be an ISO date");
    }
  }
  return flags;
}

async function runCommand(flags: Flags): Promise<RunResult> {
  const config = loadConfig(flags.config);
  const state = loadState(flags.state);
  const result = await runOnce({
    config,
    state,
    channels: loadChannels(),
    now: flags.now ?? new Date(),
    dryRun: flags.dryRun,
    verbose: flags.verbose,
  });
  if (result.stateChanged) saveState(flags.state, state);
  if (result.error) console.error(`ERROR: ${result.error}`);
  return result;
}

async function watch(flags: Flags): Promise<never> {
  const config = loadConfig(flags.config);
  const intervalMs = config.intervalMinutes * 60_000;
  console.log(`Watching every ${config.intervalMinutes} minutes. Press Ctrl+C to stop.`);
  for (;;) {
    const startedAt = Date.now();
    try {
      await runCommand({ ...flags, now: undefined });
    } catch (error) {
      console.error(`Run failed: ${(error as Error).message}`);
    }
    const wait = Math.max(0, intervalMs - (Date.now() - startedAt));
    console.log(`Next run in ${Math.round(wait / 60_000)} minute(s).`);
    await new Promise((resolveTimer) => setTimeout(resolveTimer, wait));
  }
}

async function testNotify(): Promise<number> {
  const channels = loadChannels();
  if (channels.length === 0) {
    console.error(
      "No channel configured. Set NTFY_TOPIC or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.",
    );
    return 1;
  }
  let failed = 0;
  for (const channel of channels) {
    try {
      await channel.sendRaw(
        "Job Radar: اختبار الإشعارات",
        "إذا وصلتك هذه الرسالة فالإشعارات تعمل بشكل صحيح.",
      );
      console.log(`${channel.name}: OK`);
    } catch (error) {
      failed++;
      console.error(`${channel.name}: FAILED (${(error as Error).message})`);
    }
  }
  return failed === channels.length ? 1 : 0;
}

async function main(): Promise<number> {
  const flags = parseArgs(process.argv.slice(2));
  switch (flags.command) {
    case "run": {
      const result = await runCommand(flags);
      return result.error ? 1 : 0;
    }
    case "watch":
      return watch(flags);
    case "test-notify":
      return testNotify();
    default:
      console.error(`Unknown command "${flags.command}". Use: run | watch | test-notify`);
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  },
);

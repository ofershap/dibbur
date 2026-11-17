import type { DownloadEvent } from "@tauri-apps/plugin-updater";

export const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
export interface UpdatePackage {
  rawJson: Record<string, unknown>;
  download(onEvent?: (event: DownloadEvent) => void): Promise<void>;
  install(): Promise<void>;
  close(): Promise<void>;
}
export type UpdatePhase =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "portable"
  | "installing"
  | "error"
  | "busy";
export interface UpdateState {
  phase: UpdatePhase;
  progress: number;
  rawJson?: Record<string, unknown>;
}
export interface UpdateDependencies {
  check(): Promise<UpdatePackage | null>;
  isPortable(): Promise<boolean>;
  beginInstall(): Promise<boolean>;
  endInstall(): Promise<void>;
  relaunch(): Promise<void>;
}

// One controller per mounted checker. The epoch invalidates every pending async
// continuation when settings change or the component unmounts. Checks never
// install or relaunch; only an explicit install() call can do that.
export class BackgroundUpdater {
  private enabled = false;
  private epoch = 0;
  private checking = false;
  private installing = false;
  private pending: UpdatePackage | null = null;
  private timer?: ReturnType<typeof setInterval>;
  state: UpdateState = { phase: "idle", progress: 0 };
  constructor(
    private deps: UpdateDependencies,
    private publish: (state: UpdateState) => void,
  ) {}
  private emit(
    phase: UpdatePhase,
    progress = 0,
    rawJson?: Record<string, unknown>,
  ) {
    this.state = { phase, progress, rawJson };
    this.publish(this.state);
  }
  private async close(update: UpdatePackage | null) {
    try {
      await update?.close();
    } catch (error) {
      console.error("Failed to release update", error);
    }
  }
  start() {
    if (this.enabled) return;
    this.enabled = true;
    void this.check();
    this.timer = setInterval(() => {
      void this.check();
    }, UPDATE_INTERVAL_MS);
  }
  stop() {
    this.enabled = false;
    this.epoch++;
    clearInterval(this.timer);
    this.timer = undefined;
    // Installation already explicitly started cannot safely be cancelled.
    if (!this.installing) {
      const update = this.pending;
      this.pending = null;
      void this.close(update);
      this.emit("idle");
    }
  }
  async check() {
    if (!this.enabled || this.checking || this.installing || this.pending)
      return;
    const epoch = this.epoch;
    const active = () => this.enabled && this.epoch === epoch;
    this.checking = true;
    let update: UpdatePackage | null = null;
    try {
      this.emit("checking");
      update = await this.deps.check();
      if (!active()) return;
      if (!update) {
        this.emit("idle");
        return;
      }
      if (await this.deps.isPortable()) {
        if (active()) this.emit("portable", 0, update.rawJson);
        return;
      }
      if (!active()) return;
      this.emit("downloading");
      let total = 0;
      let received = 0;
      await update.download((event) => {
        if (!active()) return;
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          received = 0;
        }
        if (event.event === "Progress") received += event.data.chunkLength;
        this.emit(
          "downloading",
          total > 0 ? Math.min(100, Math.round((100 * received) / total)) : 0,
        );
      });
      if (!active()) return;
      this.pending = update;
      update = null;
      this.emit("ready", 100);
    } catch (error) {
      console.error("Failed to prepare update", error);
      if (active()) this.emit("error");
    } finally {
      await this.close(update);
      this.checking = false;
      if (this.enabled && this.epoch !== epoch) void this.check();
    }
  }
  async install() {
    if (!this.enabled || this.installing || !this.pending) return;
    this.installing = true;
    const epoch = this.epoch;
    let locked = false;
    try {
      locked = await this.deps.beginInstall();
      if (!locked) {
        this.emit("busy", 100);
        return;
      }
      if (!this.enabled || this.epoch !== epoch) return;
      this.emit("installing");
      await this.pending.install();
      // Keep the dictation gate closed through relaunch. If relaunch fails the
      // finally block reopens it, leaving a visible retry path.
      await this.deps.relaunch();
    } catch (error) {
      console.error("Failed to install update", error);
      // install() consumes its downloaded byte resource on success. Release
      // metadata and let a later check fetch a fresh package after any error.
      const update = this.pending;
      this.pending = null;
      await this.close(update);
      this.emit("error");
    } finally {
      if (locked) await this.deps.endInstall().catch(console.error);
      this.installing = false;
      if (!this.enabled) {
        const update = this.pending;
        this.pending = null;
        await this.close(update);
        this.emit("idle");
      }
    }
  }
}

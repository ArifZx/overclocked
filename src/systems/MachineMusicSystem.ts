import type { Scene, Time } from "phaser";
import { MACHINE_MUSIC } from "../core/Constants";
import type {
  MachineMusicHarmonyVoice,
  MachineMusicTrack,
  MachineMusicStep,
} from "../core/Constants";

type MachineMusicTrackName = keyof typeof MACHINE_MUSIC;

export class MachineMusicSystem {
  private readonly _scene: Scene;
  private _activeTrack: MachineMusicTrackName | null = null;
  private _loopEvent?: Time.TimerEvent;
  private readonly _scheduledEvents = new Set<Time.TimerEvent>();

  constructor(scene: Scene) {
    this._scene = scene;
  }

  start(trackName: MachineMusicTrackName) {
    if (this._activeTrack === trackName) return;

    this.stop();
    this._activeTrack = trackName;

    const track = MACHINE_MUSIC[trackName];
    this._scheduleLoop(track);
    this._loopEvent = this._scene.time.addEvent({
      delay: track.loopMs,
      loop: true,
      callback: () => {
        if (this._activeTrack !== trackName) return;
        this._scheduleLoop(track);
      },
    });
  }

  stop() {
    this._activeTrack = null;
    this._loopEvent?.remove(false);
    this._loopEvent = undefined;

    for (const event of this._scheduledEvents) {
      event.remove(false);
    }
    this._scheduledEvents.clear();

    this._scene.sound.stopByKey("beep");
  }

  private _scheduleLoop(track: MachineMusicTrack) {
    for (const step of track.steps) {
      if (step.chance !== undefined && Math.random() > step.chance) {
        continue;
      }

      let timerEvent: Time.TimerEvent;
      timerEvent = this._scene.time.delayedCall(step.at, () => {
        this._scheduledEvents.delete(timerEvent);

        if (this._activeTrack === null) return;

        this._playStep(step);
      });

      this._scheduledEvents.add(timerEvent);
    }
  }

  private _playStep(step: MachineMusicStep) {
    const detune = step.detune + this._randomCentered(step.detuneJitter ?? 0);
    const rate = step.rate + this._randomCentered(step.rateJitter ?? 0);

    this._playVoice({ detune, rate, volume: step.volume });

    for (const voice of step.harmony ?? []) {
      this._playVoice({
        detune: detune + voice.detune,
        rate: voice.rate ?? rate,
        volume: voice.volume,
      });
    }
  }

  private _playVoice(
    voice: Pick<MachineMusicHarmonyVoice, "detune" | "volume"> & {
      rate: number;
    },
  ) {
    this._scene.sound.play("beep", {
      rate: Math.max(0.5, voice.rate),
      detune: voice.detune,
      volume: voice.volume,
    });
  }

  private _randomCentered(amount: number) {
    if (amount <= 0) return 0;
    return (Math.random() * 2 - 1) * amount;
  }
}

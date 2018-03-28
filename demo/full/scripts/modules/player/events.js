import { Observable } from "rxjs/Observable";
import "rxjs/add/observable/interval";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/map";
import "rxjs/add/operator/takeUntil";

const POSITION_UPDATES_INTERVAL = 100;

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when dispose$ emit.
 * @param {RxPlayer} player
 * @param {Function} updateState
 * @param {Observable} dispose$
 */
export default function linkPlayerEventsToState(player, updateState, dispose$) {
  const fromPlayerEvent = (event) =>
    Observable.create(obs => {
      const func = (payload) => obs.next(payload);
      player.addEventListener(event, func);

      return () => {
        player.removeEventListener(event, func);
      };
    });

  const linkPlayerEventToState = (event, stateItem) =>
    fromPlayerEvent(event)
      .takeUntil(dispose$)
      .subscribe(arg => updateState({ [stateItem]: arg }));

  linkPlayerEventToState("textTrackChange", "subtitle");
  linkPlayerEventToState("audioTrackChange", "language");
  linkPlayerEventToState("videoBitrateChange", "videoBitrate");
  linkPlayerEventToState("audioBitrateChange", "audioBitrate");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("fullscreenChange", "isFullscreen");
  linkPlayerEventToState("volumeChange", "volume");

  fromPlayerEvent("imageTrackUpdate")
    .distinctUntilChanged()
    .takeUntil(dispose$)
    .map(({ data }) => data)
    .subscribe(images => updateState({ images }));

  // use an interval for current position
  // TODO Only active for content playback
  Observable
    .interval(POSITION_UPDATES_INTERVAL)
    .map(() => {
      return {
        currentTime: player.getPosition(),
        bufferGap: player.getVideoLoadedTime() - player.getVideoPlayedTime(),
        duration: player.getVideoDuration(),
        minimumPosition: player.getMinimumPosition(),
        maximumPosition: player.getMaximumPosition(),
      };
    })
    .takeUntil(dispose$)
    .subscribe(arg => {
      updateState(arg);
    });

  fromPlayerEvent("playerStateChange")
    .distinctUntilChanged()
    .takeUntil(dispose$)
    .subscribe((arg) => {
      const stateUpdates = {
        hasEnded: arg === "ENDED",
        hasLoadedContent: !["STOPPED", "LOADING"].includes(arg),
        isBuffering: arg === "BUFFERING",
        isLoading: arg === "LOADING",
        isSeeking: arg === "SEEKING",
        isStopped: arg === "STOPPED",
        speed: arg === "PLAYING" ? player.getPlaybackRate() : 0,
      };

      if (arg === "ENDED" || arg === "PAUSED") {
        stateUpdates.isPaused = true;
      } else if (arg === "PLAYING") {
        stateUpdates.isPaused = false;
      } else if (arg === "LOADED") {
        stateUpdates.isPaused = true;
        stateUpdates.isLive = player.isLive();
      } else if (arg === "STOPPED") {
        stateUpdates.audioBitrate = undefined;
        stateUpdates.videoBitrate = undefined;
        stateUpdates.availableAudioBitrates = [];
        stateUpdates.availableVideoBitrates = [];
        stateUpdates.availableLanguages = [];
        stateUpdates.availableSubtitles = [];
        stateUpdates.images = [];
        stateUpdates.currentTime = undefined;
        stateUpdates.bufferGap = undefined;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
      }

      if (arg !== "STOPPED") {
        // error is never cleaned up
        stateUpdates.error = null;
      }

      updateState(stateUpdates);
    });

  fromPlayerEvent("periodChange")
    .takeUntil(dispose$)
    .subscribe(() => {
      updateState({
        availableAudioBitrates: player.getAvailableAudioBitrates(),
        availableVideoBitrates: player.getAvailableVideoBitrates(),
        availableLanguages: player.getAvailableAudioTracks(),
        availableSubtitles: player.getAvailableTextTracks(),
      });
    });
}

export {
  linkPlayerEventsToState,
};

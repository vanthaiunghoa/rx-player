/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import { Subject } from "rxjs/Subject";
import linkPlayerEventsToState from "./events.js";

// facilitate DEV mode
const RxPlayer = window.RxPlayer;

export default function PLAYER({ videoElement, textTrackElement }) {
  const player = new RxPlayer({
    limitVideoWidth: false,
    stopAtEnd: false,
    throttleWhenHidden: true,
    videoElement,
  });

  // facilitate DEV mode
  window.player = window.rxPlayer = player;

  const diposeEventListeners$ = new Subject();

  return {

    __INITIAL_STATE__: {
      audioBitrate: undefined,
      audioBitrateAuto: true,
      availableAudioBitrates: [],
      availableLanguages: [],
      availableSubtitles: [],
      availableVideoBitrates: [],
      bufferGap: undefined,
      currentTime: undefined,
      duration: undefined,
      error: null,
      hasEnded: false,
      hasLoadedContent: false,
      images: [],
      isBuffering: false,
      isFullscreen: player.isFullscreen(),
      isLive: false,
      isLoading: false,
      isPaused: false,
      isSeeking: false,
      isStopped: true,
      language: undefined,
      liveGap: undefined,
      loadedVideo: null,
      maximumPosition: undefined,
      minimumPosition: undefined,
      speed: 0,
      subtitle: undefined,
      videoBitrate: undefined,
      videoBitrateAuto: true,
      volume: player.getVolume(),
    },

    __ASYNC__(getState, updateState) {
      linkPlayerEventsToState(player, updateState, diposeEventListeners$);
    },

    __DISPOSE__() {
      diposeEventListeners$.next();
      diposeEventListeners$.complete();
      player.dispose();
    },

    SET_VOLUME(_, volume) {
      player.setVolume(volume);
    },

    SET_POSITION(_, position) {
      player.setPosition(position);
    },

    LOAD(_, arg) {
      player.loadVideo(Object.assign({
        textTrackElement,
        networkConfig: {
          segmentRetry: Infinity,
          manifestRetry: Infinity,
          offlineRetry: Infinity,
        },
      }, arg));

      return {
        state: { loadedVideo: arg },
      };
    },

    PLAY(state) {
      player.play();

      const { isStopped, hasEnded } = state;

      if (isStopped || hasEnded) {
        return;
      }

      return {
        state: { isPaused: false },
      };
    },

    PAUSE(state) {
      player.pause();

      const { isStopped, hasEnded } = state;
      if (isStopped || hasEnded) {
        return;
      }

      return {
        state: {
          isPaused: true,
        },
      };
    },

    STOP() {
      player.stop();
    },

    SEEK(_, position) {
      player.seekTo({ position });
    },

    MUTE() {
      player.mute();
    },

    UNMUTE() {
      player.unMute();
    },

    SET_FULL_SCREEN() {
      player.setFullscreen(true);
    },

    EXIT_FULL_SCREEN() {
      player.setFullscreen(false);
    },

    SET_AUDIO_BITRATE(_, bitrate) {
      player.setAudioBitrate(bitrate || -1);
      return {
        state: {
          audioBitrateAuto: !bitrate,
        },
      };
    },

    SET_VIDEO_BITRATE(_, bitrate) {
      player.setVideoBitrate(bitrate || -1);
      return {
        state: {
          videoBitrateAuto: !bitrate,
        },
      };
    },

    SET_AUDIO_TRACK(_, track) {
      player.setAudioTrack(track.id);
    },

    SET_SUBTITLES_TRACK(_, track) {
      player.setTextTrack(track.id);
    },

    DISABLE_SUBTITLES_TRACK() {
      player.disableTextTrack();
    },
  };
}

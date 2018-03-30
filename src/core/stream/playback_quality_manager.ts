/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Observable} from "rxjs/Observable";
import {Subject} from "rxjs/Subject";
import { getDecodingInfos } from "../../compat";
import config from "../../config";
import Representation from "../../manifest/representation";

const {
  PQM_DEFAULT_AUDIO_CODECS,
  PQM_DEFAULT_VIDEO_CODECS,
  PQM_SMOOTH_BITRATE_RATIO,
} = config;

export interface IDecodingInfos {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

export interface IMediaConfiguration {
  type: "media-source"|"file";
  video: {
    contentType: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: string;
  };
  audio: {
    contentType: string;
    bitrate: number;
    channels: string;
    samplerate: number;
  };
}

/**
 * Find supported video codec on current browser, among popular supported codecs.
 */
function getDefaultVideoCodec() {
  if(!window.MediaSource || !window.MediaSource.isTypeSupported) {
    return "";
  }
  for (const codec of PQM_DEFAULT_VIDEO_CODECS) {
    if (window.MediaSource.isTypeSupported(codec)) {
      return codec;
    }
  }
  return "";
}

/**
 * Find supported audio codec on current browser, among popular supported codecs.
 */
function getDefaultAudioCodec() {
  if(!window.MediaSource || !window.MediaSource.isTypeSupported) {
    return "";
  }
  for (const codec of PQM_DEFAULT_AUDIO_CODECS) {
    if (window.MediaSource.isTypeSupported(codec)) {
      return codec;
    }
  }
  return "";
}

/**
 * Build content type litteral from mime type and codecs.
 * @param {Object} representation
 */
function buildContentType(
  representation: Representation
) {
  if (representation.mimeType && representation.codec) {
    return representation.mimeType + "; codecs=\"" + representation.codec + "\"";
  }
  return undefined;
}

/**
 * Handle metrics from browser playback infos.
 * Manager deduces from these infos what should be the smoother playback bitrate
 * for audio and video.
 */
export default class PlaybackQualityManager {

  private _videoElement: HTMLMediaElement;
  private _sourceType: "media-source"|"file";

  private _currentVideoRep: Representation|undefined;
  private _currentAudioRep: Representation|undefined;
  private _videoBitrateForSmoothPlayback: Subject<number>;
  private _audioBitrateForSmoothPlayback: Subject<number>;
  private _configuration: IMediaConfiguration;

  constructor(
      videoElement: HTMLMediaElement,
      sourceType: "media-source"|"file"
  ) {
    this._videoElement = videoElement;
    this._sourceType = sourceType;

    // Fill config with default values.
    this._configuration = {
      type: this._sourceType,
      video: {
        contentType: getDefaultVideoCodec(),
        width: 1280,
        height: 720,
        bitrate: 10000000,
        framerate: "25",
      },
      audio: {
        contentType: getDefaultAudioCodec(),
        channels: "2",
        bitrate: 10000,
        samplerate: 44100,
      },
    };
    this._videoBitrateForSmoothPlayback = new Subject();
    this._audioBitrateForSmoothPlayback = new Subject();
  }

  /**
   * Update current configuration with current representation.
   * @param {string} type
   * @param {Object} representation
   */
  updateConfigurationWithRepresentation(type: string, representation: Representation) {
    switch(type) {
      case "video":
        this.updateConfigurationWithVideoRepresentation(representation);
        break;
      case "audio":
        this.updateConfigurationWithAudioRepresentation(representation);
        break;
      default:
        break;
    }
  }

  /**
   * Get smooth bitrate for each adaptation type.
   * @param {string} type
   */
  getBitrateForSmoothPlayback$(type: string) {
    switch(type) {
      case "video":
        return this.getVideoBitrateForSmoothPlayback$();
      case "audio":
        return this.getAudioBitrateForSmoothPlayback$();
      default:
        return Observable.empty() as Observable<never>; // TSsss
    }
  }

  /**
   * Update current smooth bitrates bitrates.
   */
  private updateBitratesForSmoothPlayback() {
    getDecodingInfos(this._videoElement, this._configuration)
      .then((infos: IDecodingInfos) => {
        if (!infos.smooth && this._currentVideoRep && this._currentAudioRep) {
          this._videoBitrateForSmoothPlayback.next(this._currentVideoRep.bitrate);
          this._audioBitrateForSmoothPlayback.next(this._currentAudioRep.bitrate);
        }
      });
  }

  /**
   * Update current configuration with current audio representation.
   * @param {Object} audioRepresentation
   */
  private updateConfigurationWithAudioRepresentation(
    audioRepresentation: Representation
  ) {
      this._currentAudioRep = audioRepresentation;
      const { audio } = this._configuration;
      this._configuration.audio = {
        contentType: buildContentType(audioRepresentation) || audio.contentType,
        channels: audioRepresentation.channels || audio.channels,
        bitrate: audioRepresentation.bitrate || audio.bitrate,
        samplerate: audioRepresentation.samplerate || audio.samplerate,
      };
    this.updateBitratesForSmoothPlayback();
  }

  /**
   * Update current configuration with current video representation.
   * @param {Object} videoRepresentation
   */
  private updateConfigurationWithVideoRepresentation(
    videoRepresentation: Representation
  ) {
      this._currentVideoRep = videoRepresentation;
      const { video } = this._configuration;
      this._configuration.video = {
        contentType: buildContentType(videoRepresentation) || video.contentType,
        width: videoRepresentation.width || video.width,
        height: videoRepresentation.height || video.height,
        bitrate: videoRepresentation.bitrate || video.bitrate,
        framerate: videoRepresentation.framerate || video.framerate,
      };
    this.updateBitratesForSmoothPlayback();
  }

  /**
   * Get each new video smooth bitrate.
   */
  private getVideoBitrateForSmoothPlayback$(): Observable<number> {
    let factor = Math.sqrt(2);
    return this._videoBitrateForSmoothPlayback
      .distinctUntilChanged()
      .switchMap((bitrate) => {
        factor = Math.pow(factor, 2);
        return Observable.timer(factor * 10 * 1000)
          .map(() => {
            factor = Math.sqrt(2);
            return Infinity;
          })
          .startWith(bitrate * PQM_SMOOTH_BITRATE_RATIO);
      })
      .startWith(Infinity)
      .share();
  }

  /**
   * Get each new audio smooth bitrate.
   */
  private getAudioBitrateForSmoothPlayback$(): Observable<number> {
    let factor = Math.sqrt(2);
    return this._audioBitrateForSmoothPlayback
      .distinctUntilChanged()
      .switchMap((bitrate) => {
        factor = Math.pow(factor, 2);
        return Observable.timer(factor * 10 * 1000)
          .map(() => {
            factor = Math.sqrt(2);
            return Infinity;
          })
          .startWith(bitrate * PQM_SMOOTH_BITRATE_RATIO);
      })
      .startWith(Infinity)
      .share();
  }
}

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

import config from "../../config";
import { Representation } from "../../manifest";
import log from "../../utils/log";

const {
  PQM_DEFAULT_AUDIO_CODECS,
  PQM_DEFAULT_VIDEO_CODECS,
} = config;

export interface IDecodingInfos {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

export interface IMediaConfiguration {
  type: "media-source" | "file";
  video?: {
    contentType: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: string;
  };
  audio?: {
    contentType: string;
    bitrate: number;
    channels: string;
    samplerate: number;
  };
}

/**
 * Push element in array if not exists in it.
 * @param {Array} array
 * @param {*} element
 */
function pushIfNotExist<T>(array: T[], element: T) {
  if (array.indexOf(element) === -1) {
    array.push(element);
  }
}

/**
 * Find supported video codec on current browser, among popular supported codecs.
 */
function getDefaultVideoCodec() {
  if (!window.MediaSource || !window.MediaSource.isTypeSupported) {
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
  if (!window.MediaSource || !window.MediaSource.isTypeSupported) {
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
 * Get decoding infos from media capabilities.
 * If API is not supported, then return custom decoding infos.
 * @param {Object} mediaConfig
 */
function getDecodingInfo(
  mediaConfig: IMediaConfiguration
): Promise<IDecodingInfos> {
  if (
    (navigator as any).mediaCapabilities &&
    (navigator as any).mediaCapabilities.decodingInfo
  ) {
    return (navigator as any).mediaCapabilities.decodingInfo(mediaConfig)
      .catch((error: Error) => {
        log.warn(
          "\"mediaCapabilities.decodingInfos\" failed. Fallback on custom infos.", error);
        return Promise.resolve({
          supported: true,
          smooth: false,
          powerEfficient: false,
        });
      });
  }
  log.debug("mediaCapabilites and/or decodingInfo API not supported.", mediaConfig);
  return Promise.resolve({
    supported: true,
    smooth: false,
    powerEfficient: false,
  });
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
 * Filter unsmooth representations in manifest, based on smooth informations
 * from mediaCapabilites API.
 * The mediaCapabilites evaluates couples of adaptations (video + audio).
 * If any configuration is not smooth, in case of doubt, we chose to filter
 * both representations, as we can't know what is the troublesome representation.
 *
 * In two cases, no representation may be smooth:
 * - The mediaCapabilites API is judging no rep to be smooth.
 * - The API is not available.
 * In that case, the function does not fitler representations.
 *
 * @param sourceType
 * @param manifest
 */
async function fitlerRepresentationOnDecodingInfos(
  sourceType: "media-source"|"file",
  videoRepresentations: Representation[],
  audioRepresentations: Representation[]
): Promise<{smoothVideo: Representation[]; smoothAudio: Representation[]}> {

  const defaultConfiguration = {
    type: sourceType,
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

  function buildConfigurationFromRepresentations(
    representations: {
      video?: Representation;
      audio?: Representation;
    }
  ): IMediaConfiguration {

    /**
     * Update current configuration with current video representation.
     * @param {Object} videoRepresentation
     */
    function updateConfigurationWithVideoRepresentation(
      videoRepresentation?: Representation
    ) {
      const { video } = defaultConfiguration;
      if (!videoRepresentation) {
        return undefined;
      }
      return {
        contentType: buildContentType(videoRepresentation) || video.contentType,
        width: videoRepresentation.width || video.width,
        height: videoRepresentation.height ||  video.height,
        bitrate: videoRepresentation.bitrate || video.bitrate,
        framerate: videoRepresentation.framerate ||  video.framerate,
      };
    }

    /**
     * Update current configuration with current audio representation.
     * @param {Object} audioRepresentation
     */
    function updateConfigurationWithAudioRepresentation(
      audioRepresentation?: Representation
    ) {
      const { audio } = defaultConfiguration;
      if (!audioRepresentation) {
        return undefined;
      }
      return {
        contentType: buildContentType(audioRepresentation) || audio.contentType,
        channels: audioRepresentation.channels ||  audio.channels,
        bitrate: audioRepresentation.bitrate || audio.bitrate,
        samplerate: audioRepresentation.samplerate ||  audio.samplerate,
      };
    }

    const _config = {
      type: sourceType,
      video: updateConfigurationWithVideoRepresentation(representations.video),
      audio: updateConfigurationWithAudioRepresentation(representations.audio),
    };

    return _config;
  }

  const smoothVideo: Representation[] = [];
  const smoothAudio: Representation[] = [];

  if (audioRepresentations.length === 0 && videoRepresentations.length === 0) {
    return {
      smoothVideo,
      smoothAudio,
    };
  }

    // Audio only stream.
  if (videoRepresentations.length === 0 && audioRepresentations.length >= 1) {
    for (const aRep of audioRepresentations) {
      const conf = buildConfigurationFromRepresentations({ audio: aRep });
      await getDecodingInfo(conf).then((result) => {
        if (result.supported && result.smooth) {
          pushIfNotExist(smoothAudio, aRep);
        }
      });
    }
    return {
      smoothVideo,
      smoothAudio,
    };
  }

    // Video only stream.
  if (audioRepresentations.length === 0 && videoRepresentations.length >= 1) {
    for (const vRep of videoRepresentations) {
      const conf = buildConfigurationFromRepresentations({ video: vRep });
      await getDecodingInfo(conf).then((result) => {
        if (result.supported && result.smooth) {
          pushIfNotExist(smoothVideo, vRep);
        }
      });
    }
    return {
      smoothVideo,
      smoothAudio,
    };
  }

  for (const vRep of videoRepresentations) {
    for (const aRep of audioRepresentations) {
      const conf =
        buildConfigurationFromRepresentations({ video: vRep, audio: aRep });
      await getDecodingInfo(conf)
        .then((results: IDecodingInfos) => {
          if (results.supported && results.smooth) {
            pushIfNotExist(smoothAudio, aRep);
            pushIfNotExist(smoothVideo, vRep);
          }
        });
    }
  }
  if (!(smoothVideo.length === 0 || smoothAudio.length === 0)) {
    return {
      smoothVideo: videoRepresentations,
      smoothAudio: audioRepresentations,
    };
  }
  return {
    smoothVideo,
    smoothAudio,
  };
}

export default fitlerRepresentationOnDecodingInfos;

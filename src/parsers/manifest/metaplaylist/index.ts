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

import config from "../../../config";
import Manifest, {
  Adaptation,
  IManifestArguments,
  Period,
} from "../../../manifest";
import { StaticRepresentationIndex } from "../../../manifest/representation_index";
import generateNewId from "../../../utils/id";
import {
  IIncompleteParserPeriod,
  IParsedAdaptation,
  IParsedManifest,
  IParsedPeriod,
} from "../types";
import MetaRepresentationIndex from "./representation_index";

export type AdaptationType = "video"|"audio"|"text"|"image";

const { DEFAULT_LIVE_GAP } = config;

const transformPeriod = (
  parsedPeriod: IParsedPeriod|IIncompleteParserPeriod,
  content: {
    manifest?: IParsedManifest;
    url: string;
    transport: "dash"|"smooth";
    startTime: number;
    endTime: number;
    textTracks: Array<{
      url: string;
      language: string;
      mimeType: string;
    }>;
  },
  contentEnding: number
) => {
  const baseManifest = content.manifest ?
    new Manifest(content.manifest as IManifestArguments) :
    undefined;
  parsedPeriod.start = content.startTime;
  parsedPeriod.end = parsedPeriod.start + (parsedPeriod.duration || 0);
  const textTracks = content.textTracks;
  if (textTracks && textTracks.length > 0) {
    textTracks.forEach((track) => {
      const textAdaptation = {
        id: "gen-text-ada-" + generateNewId(),
        representations: [{
          mimeType: track.mimeType,
          bitrate: 0,
          index: new StaticRepresentationIndex({
            media: track.url,
            startTime: parsedPeriod.start,
            endTime: parsedPeriod.end || Number.MAX_VALUE,
          }),
          id: "gen-text-rep-" + generateNewId(),
        }],
        type: "text",
        normalizedLanguage: track.language,
      };
      parsedPeriod.adaptations.push(textAdaptation);
    });
  }

  const adaptations = parsedPeriod.adaptations;
  adaptations.forEach((adaptation) => {
    const representations = adaptation.representations;
    representations.forEach((representation) => {
      const index = representation.index;

      // Store base contents info
      const baseAdaptation = ["audio", "video", "image", "text"]
        .reduce((acc: Adaptation[], type) => {
          const _adaptation = baseManifest ?
            baseManifest.adaptations[type as AdaptationType] :
            undefined;
          if (_adaptation) {
            return acc.concat(_adaptation);
          }
          return acc;
        }, []).find((a: Adaptation) => a.id === adaptation.id);
      const baseRepresentation =
        baseAdaptation ?
          baseAdaptation.representations.find((r) => r.id === representation.id) :
          undefined;
      const basePeriod = baseManifest ?
        baseManifest.periods
          .find((p) => {
            if ((p as Period).id !== undefined &&
            (parsedPeriod as IParsedPeriod).id !== undefined) {
              return (p as Period).id === (parsedPeriod as IParsedPeriod).id;
            }
            return false;
          }) : undefined;
      const baseContentInfos = {
        manifest: baseManifest,
        period: basePeriod,
        adaptation: baseAdaptation,
        representation: baseRepresentation,
      };

      const newIndex = new MetaRepresentationIndex(
        index,
        parsedPeriod.start,
        content.transport,
        contentEnding,
        baseContentInfos
      );
      representation.index = newIndex;
    });
  });
  return parsedPeriod;
};

/**
 * From several parsed manifests, generate a single manifest
 * which fakes live content playback.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} contents
 * @param {string} baseURL
 */
export default function parseMetaManifest(
  contents: Array<{
      manifest?: IParsedManifest;
      url: string;
      transport: "dash"|"smooth";
      startTime: number;
      endTime: number;
      textTracks: Array<{
        url: string;
        language: string;
        mimeType: string;
      }>;
  }>,
  attributes: {
    timeShiftBufferDepth: number;
  },
  baseURL: string
): IParsedManifest {

  const contentEnding = contents[contents.length - 1].endTime;

  const parsedPeriods = contents
    .map((content) => {
      if (content.manifest) {
        return content.manifest.periods[0];
      } else {
        content.contentEnding = contentEnding;
        return {
          start: 0,
          duration: content.endTime - content.startTime,
          adaptations: [] as IParsedAdaptation[],
          end: undefined,
          content,
        };
      }
    });

  // Build manifest root attributes
  const presentationLiveGap =
  (contents
    .filter(content => content.manifest)
    .map(content => (content.manifest as IParsedManifest).presentationLiveGap)
    .reduce((acc, val) =>
      Math.min(acc || DEFAULT_LIVE_GAP, val || DEFAULT_LIVE_GAP), DEFAULT_LIVE_GAP
    )) || DEFAULT_LIVE_GAP;

  const suggestedPresentationDelay =
    (contents
      .filter(content => content.manifest)
      .map(content => (content.manifest as IParsedManifest).suggestedPresentationDelay)
      .reduce((acc, val) => Math.min(acc || 10, val || 10), 10)) || 10;

  const maxSegmentDuration =
    contents
      .filter(content => content.manifest)
      .map(content => (content.manifest as IParsedManifest).maxSegmentDuration)
      .reduce((acc, val) => Math.min((acc || 0), (val || 0)), 0);

  const minBufferTime =
    contents
      .filter(content => content.manifest)
      .map(content => (content.manifest as IParsedManifest).minBufferTime)
      .reduce((acc, val) => Math.min((acc || 0), (val || 0)), 0);

  // Build new period array
  const newPeriods: Array<(IParsedPeriod|IIncompleteParserPeriod)> = [];

  for (let j = 0; j < parsedPeriods.length; j++) {
    newPeriods.push(transformPeriod(parsedPeriods[j], contents[j], contentEnding));
  }

  const manifest = {
    availabilityStartTime: 0,
    presentationLiveGap,
    timeShiftBufferDepth: attributes.timeShiftBufferDepth,
    duration: Infinity,
    id: "gen-metaplaylist-man-" + generateNewId(),
    maxSegmentDuration,
    minBufferTime,
    periods: newPeriods,
    suggestedPresentationDelay,
    transportType: "metaplaylist",
    type: "dynamic",
    uris: [baseURL],
  };

  return manifest;
}

export { transformPeriod };

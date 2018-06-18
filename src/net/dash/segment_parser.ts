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

import { of as observableOf } from "rxjs";
import {
  getMDHDTimescale,
  parseSidx,
} from "../../parsers/containers/isobmff";
import {
  ISegmentParserArguments,
  SegmentParserObservable,
} from "../types";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
import { addNextSegments } from "./utils";

export default function dashSegmentParser({
  response,
  infos,
} : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
) : SegmentParserObservable {
  const {
    segment,
    representation,
    init,
  } = infos;
  const { responseData } = response;
  if (responseData == null) {
    return observableOf({ segmentData: null, segmentInfos: null });
  }
  const segmentData : Uint8Array = responseData instanceof Uint8Array ?
    responseData :
    new Uint8Array(responseData);
  const indexRange = segment.indexRange;
  const sidxSegments = parseSidx(segmentData, indexRange ? indexRange[0] : 0);

  if (!segment.isInit) {
    return observableOf({
      segmentData,
      segmentInfos: getISOBMFFTimingInfos(segment, segmentData, sidxSegments, init),
    });
  }

  if (sidxSegments) {
    const nextSegments = sidxSegments;
    addNextSegments(representation, nextSegments);
  }
  const timescale = getMDHDTimescale(segmentData);
  return observableOf({
    segmentData,
    segmentInfos: timescale > 0 ? { time: -1, duration: 0, timescale } : null,
  });
}

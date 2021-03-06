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

import probeFromDecodingConfig from "./decodingInfos";
import probeFromDRMInfos from "./DRMInfos";
import probeFromHDCPPolicy from "./HDCPPolicy";
import probeFromMediaContentType from "./mediaContentType";
import probeFromMediaContentTypeWithFeatures from "./mediaContentTypeWithFeatures";
import probeFromMediaDisplayInfos from "./mediaDisplayInfos";

import { IMediaConfiguration } from "../types";

const probers: {
  [id: string]: [(config: IMediaConfiguration) => Promise<number>, string];
} = {
  isTypeSupported: [probeFromMediaContentType, "warn"],
  isTypeSupportedWithFeatures: [probeFromMediaContentTypeWithFeatures, "debug"],
  matchMedia: [probeFromMediaDisplayInfos, "warn"],
  decodingInfos: [probeFromDecodingConfig, "warn"],
  requestMediaKeySystemAccess: [probeFromDRMInfos, "warn"],
  getStatusForPolicy: [probeFromHDCPPolicy, "warn"],
};

export default probers;

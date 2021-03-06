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

import {
  ErrorCodes,
  ErrorTypes,
} from "./constants";

import errorMessage from "./errorMessage";

/**
 * Error linked to the Index part of the Manifest.
 *
 * TODO Rename ManifestError or something?
 *
 * @class IndexError
 * @extends Error
 */
export default class IndexError extends Error {
  public readonly name : "IndexError";
  public readonly type : string;
  public readonly message : string;
  public readonly code : string;
  public readonly reason? : { message : string }|string|null;
  public fatal : boolean;

  constructor(code : string, fatal? : boolean) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, IndexError.prototype);

    this.name = "IndexError";
    this.type = ErrorTypes.INDEX_ERROR;

    this.reason = null;
    this.code = ErrorCodes.hasOwnProperty(code) ?
      (ErrorCodes as Record<string, string>)[code] : "";
    this.fatal = !!fatal;
    this.message = errorMessage(this.name, this.code, null);
  }

}

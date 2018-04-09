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

import objectAssign = require("object-assign");
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { TimeoutError } from "rxjs/util/TimeoutError";
import {
  IMediaKeySession,
  IMockMediaKeys,
} from "../../compat";
import {
  onKeyError$,
  onKeyMessage$,
  onKeyStatusesChange$,
} from "../../compat/events";
import {
  CustomError,
  EncryptedMediaError,
  ErrorCodes,
  ErrorTypes,
  isKnownError,
} from "../../errors";
import arrayIncludes from "../../utils/array-includes";
import castToObservable from "../../utils/castToObservable";
import log from "../../utils/log";
import { retryObsWithBackoff } from "../../utils/retry";
import tryCatch from "../../utils/rx-tryCatch";
import {
  KEY_STATUS_ERRORS,
} from "./constants";
import {
  $loadedSessions,
  $storedSessions,
} from "./globals";
import {
  IKeySystemAccessInfos,
  IKeySystemOption,
} from "./key_system";

type ErrorStream = Subject<Error|CustomError>;

export interface IMediaKeysInfos extends IKeySystemAccessInfos {
  mediaKeys : MediaKeys|IMockMediaKeys;
}

type sessionManagementEvents =
  "generated-request" |
  "reuse-session" |
  "created-session" |
  "loaded-session" |
  "loaded-session-failed";

interface ISessionManagementEvent {
  type : "ISessionManagementEvent";
  value : {
    name : sessionManagementEvents;
    session : IMediaKeySession|MediaKeySession;
  };
}

interface IUpdateSessionEvent {
  type : "IUpdateSessionEvent";
  value : {
    name : string;
    session : IMediaKeySession|MediaKeySession;
    license : LicenseObject;
  };
}

type ISessionEvent = ISessionManagementEvent|IUpdateSessionEvent;

interface ISessionManagementEventOptions {
  updatedWith?: LicenseObject;
  initData?: Uint8Array;
  initDataType?: string;
  storedSessionId?: string;
}

type LicenseObject =
  BufferSource |
  ArrayBuffer |
  ArrayBufferView;

/**
 * Create the Object emitted by the EME Observable.
 * @param {string} name - name of the event
 * @param {MediaKeySession} session - MediaKeySession concerned
 * @param {Object} [options] - Supplementary data, will be merged with the
 * session information in the returned object.
 * @returns {Object}
 */
function createSessionManagementEvent(
  name : sessionManagementEvents,
  session : IMediaKeySession|MediaKeySession,
  options? : ISessionManagementEventOptions
) : ISessionManagementEvent {
  return {
    type: "ISessionManagementEvent",
    value: objectAssign({ name, session }, options),
  };
}

/**
 * Create the Object emitted by the EME Observable.
 * @param {string} name - name of the event
 * @param {MediaKeySession} session - MediaKeySession concerned
 * @param {Object} [options] - Supplementary data, will be merged with the
 * session information in the returned object.
 * @returns {Object}
 */
function createUpdateSessionEvent(
  name : string,
  session : IMediaKeySession|MediaKeySession,
  license : LicenseObject
) : IUpdateSessionEvent {
  return {
    type: "IUpdateSessionEvent",
    value: {
      name,
      session,
      license,
    },
  };
}

/**
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function sessionEventsHandler(
  session: IMediaKeySession|MediaKeySession,
  keySystem: IKeySystemOption,
  errorStream: ErrorStream
) : Observable<IUpdateSessionEvent> {
  log.debug("eme: handle message events", session);

  /**
   * @param {Error|Object} error
   * @param {Boolean} fatal
   * @returns {Error|Object}
   */
  function licenseErrorSelector(
    error: CustomError|Error,
    fatal: boolean
  ) : CustomError|Error {
    if (isKnownError(error)) {
      if (error.type === ErrorTypes.ENCRYPTED_MEDIA_ERROR) {
        error.fatal = fatal;
        return error;
      }
    }
    return new EncryptedMediaError("KEY_LOAD_ERROR", error, fatal);
  }

  const getLicenseRetryOptions = {
    totalRetry: 2,
    retryDelay: 200,
    errorSelector: (error: CustomError|Error) => licenseErrorSelector(error, true),
    onRetry: (
      error: CustomError|Error) => errorStream.next(licenseErrorSelector(error, false)
    ),
  };

  const keyErrors: Observable<never> = onKeyError$(session).map((error) => {
    throw new EncryptedMediaError("KEY_ERROR", error, true);
  });

  const keyStatusesChanges : Observable<{ license: LicenseObject; msg: string }> =
    onKeyStatusesChange$(session).mergeMap((keyStatusesEvent: Event) => {
      log.debug(
        "eme: keystatuseschange event",
        session,
        keyStatusesEvent
      );

      // find out possible errors associated with this event
      session.keyStatuses.forEach((keyStatus: any, keyId: any) => {
        // Hack present because the order of the arguments has changed in spec
        // and is not the same between some versions of Edge and Chrome.
        if (KEY_STATUS_ERRORS[keyId]) {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyId, true);
        } else if (KEY_STATUS_ERRORS[keyStatus]) {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyStatus, true);
        }
      });

      const license = tryCatch(() => {
        if (keySystem && keySystem.onKeyStatusesChange) {
          return castToObservable(
            keySystem.onKeyStatusesChange(keyStatusesEvent, session)
          );
        } else {
          return Observable.empty();
        }
      });

      return license.catch((error: Error) => {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
      }).map((licenseObject) => {
        return {
          license: licenseObject as LicenseObject,
          msg: "key-status-change",
        };
      });
    });

  const keyMessages$ : Observable<{ license: LicenseObject; msg: string }> =
    onKeyMessage$(session).mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      const getLicense$ : Observable<LicenseObject> = Observable.defer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        return castToObservable(getLicense)
          .timeout(10 * 1000)
          .catch(error => {
            if (error instanceof TimeoutError) {
              throw new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false);
            } else {
              throw error;
            }
          }) as Observable<LicenseObject>;
      });

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions).map((license) => {
        return {
          license,
          msg: messageType,
        };
      });
    });

  const sessionUpdates: Observable<IUpdateSessionEvent> =
    Observable.merge(keyMessages$, keyStatusesChanges)
      .concatMap((res) => {
        log.debug("eme: update session", res);

        const { license, msg } = res;
        const sessionEvent = createUpdateSessionEvent(msg, session, license);
        return castToObservable(
          (session as any).update(res)
        )
          .catch((error) => {
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
          })
          .mapTo(sessionEvent);
      });

  const sessionEvents: Observable<IUpdateSessionEvent> =
    Observable.merge(sessionUpdates, keyErrors);

  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Create MediaKeySession and cache loaded session.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {UInt8Array} initData
 * @returns {Observable}
 */
function createSession(
  mediaKeys: IMockMediaKeys|MediaKeys,
  sessionType: MediaKeySessionType,
  initData: Uint8Array
) : Observable<IMediaKeySession|MediaKeySession> {
  log.debug(`eme: create a new ${sessionType} session`);
  if (mediaKeys.createSession == null) {
    throw new Error("Invalid MediaKeys implementation: Missing createSession");
  }

  // TODO TS bug? I don't get the problem here.
  const session : IMediaKeySession|MediaKeySession =
    (mediaKeys as any).createSession(sessionType);

  $loadedSessions.add(initData, session);
  return Observable.of(session);
}

export function handleSessionEvents(
  session: MediaKeySession|IMediaKeySession,
  keySystem: IKeySystemOption,
  initData: Uint8Array,
  errorStream: ErrorStream
) : Observable<IUpdateSessionEvent> {
  const sessionEvents = sessionEventsHandler(session, keySystem, errorStream)
    .finally(() => {
      $loadedSessions.deleteAndClose(session);
      $storedSessions.delete(initData);
    });

  return sessionEvents;
}

/**
 * Generate a request from session.
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
function generateKeyRequest(
  session: MediaKeySession|IMediaKeySession,
  initData: Uint8Array,
  initDataType: string
) : Observable<ISessionManagementEvent> {
  return Observable.defer(() => {
    return castToObservable(
      (session as any).generateRequest(initDataType, initData)
    )
      .catch((error) => {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
      })
      .mapTo(
        createSessionManagementEvent(
          "generated-request", session, { initData, initDataType })
      );
  });
}

/**
 * If session creating fails, retry once session creation/reuse.
 * @param initData
 * @param initDataType
 * @param mediaKeysInfos
 * @returns {Observable}
 */
export function createOrReuseSessionWithRetry(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ISessionManagementEvent> {
  return createOrReuseSession(
    initData,
    initDataType,
    mediaKeysInfos
  ).catch((error) => {
    if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
      throw error;
    }
    const firstLoadedSession = $loadedSessions.getFirst();
    if (!firstLoadedSession) {
      throw error;
    }

    log.warn("eme: could not create a new session, " +
      "retry after closing a currently loaded session", error);

    return $loadedSessions.deleteAndClose(firstLoadedSession)
      .mergeMap(() => {
        return createOrReuseSession(
          initData,
          initDataType,
          mediaKeysInfos
        );
      }
      );
  });
}

/**
 * Create session, or reuse persistent stored session.
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {Object} mediaKeysInfos
 */
function createOrReuseSession(
  initData: Uint8Array,
  initDataType: string,
  mediaKeysInfos: IMediaKeysInfos
) : Observable<ISessionManagementEvent> {

  const loadedSession = $loadedSessions.get(initData);
  if (loadedSession && loadedSession.sessionId) {
    log.debug("eme: reuse loaded session", loadedSession.sessionId);
    return Observable.of(createSessionManagementEvent("reuse-session", loadedSession));
  }

  const {
    keySystem,
    keySystemAccess,
    mediaKeys,
  } = mediaKeysInfos;
  const mksConfig = keySystemAccess.getConfiguration();
  const sessionTypes = mksConfig.sessionTypes;
  const hasPersistence = (
    sessionTypes && arrayIncludes(sessionTypes, "persistent-license")
  );

  const sessionType = hasPersistence && keySystem.persistentLicense ?
    "persistent-license" : "temporary";

  return createSession(mediaKeys, sessionType, initData)
    .mergeMap((session) => {
      if (hasPersistence && keySystem.persistentLicense) {
        // if a persisted session exists in the store associated to this initData,
        // we reuse it without a new license request through the `load` method.
        const storedEntry = $storedSessions.get(initData);

        if (storedEntry) {
          return loadPersistentSession(
            storedEntry.sessionId, initData, session, initDataType
          ).do(() => $storedSessions.add(initData, session));
        }
      }

      return generateKeyRequest(session, initData, initDataType)
        .startWith(createSessionManagementEvent(
          "created-session",
          session
        ));
    });
}

/**
 * Load persistent session from stored session id.
 * If loading fails, delete persistent session from cache.
 * If loading succeed, update cache with new session.
 * @param {string} storedSessionId
 * @param {Uint8Array} initData
 * @param {MediaKeySession} session
 */
function loadPersistentSession(
  storedSessionId: string,
  initData: Uint8Array,
  session: MediaKeySession|IMediaKeySession,
  initDataType: string
) : Observable<ISessionManagementEvent> {
  log.debug("eme: load persisted session", storedSessionId);

  return castToObservable(session.load(storedSessionId))
    .catch((error) => {
      log.warn("eme: no data stored for the loaded session.",
        storedSessionId);

      $loadedSessions.deleteById(storedSessionId);
      $storedSessions.delete(initData);

      throw error;
    })
    .mergeMap((success) => {
      if (success) {
        $loadedSessions.add(initData, session);
        $storedSessions.add(initData, session);
        return Observable.of(
          createSessionManagementEvent("loaded-session", session, { storedSessionId }));
      } else {
        return Observable.of(createSessionManagementEvent(
          "loaded-session-failed",
          session,
          { storedSessionId }
        )).concat(
          generateKeyRequest(session, initData, initDataType));
      }
    });
}

export {
  ISessionManagementEvent,
  IUpdateSessionEvent,
  ErrorStream,
  ISessionEvent,
};

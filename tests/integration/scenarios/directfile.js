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

import { expect } from "chai";
import nise from "nise";
import RxPlayer from "../../../src";
import sleep from "../utils/sleep.js";
import waitForState, {
  waitForLoadedStateAfterLoadVideo,
} from "../utils/waitForPlayerState";

const WebMFile = require("arraybuffer-loader!../mocks/fixtures/directfile/Schlossbergbahn.webm.480p.webm");
const WebMURL = "http://www.example.org/example.webm";

describe("basic playback use cases: direct file", function () {

  let player;
  const fakeServer = nise.fakeServer;
  let server;

  beforeEach(() => {
    player = new RxPlayer();
    server = fakeServer.create();
    server.autoRespond = true;
    server.respondWith("GET", WebMURL,
      [200, {
        "Content-Type": "video/webm",
      }, WebMFile]);
  });

  afterEach(() => {
    player.dispose();
    server.restore();
  });

  it("should begin playback on play", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(200);
    expect(player.getPosition()).to.be.above(0);
    expect(player.getPosition()).to.be.below(0.25);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
  });

  it("should play slowly for a speed inferior to 1", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.setPlaybackRate(0.5);
    player.play();
    const lastPosition = player.getPosition();
    await sleep(300);
    expect(player.getPosition()).to.be.below(0.35);
    expect(player.getPosition()).to.be.above(0.05);
    expect(player.getPosition()).to.be.above(lastPosition);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
    expect(player.getPlaybackRate()).to.equal(0.5);
    expect(player.getVideoElement().playbackRate).to.equal(0.5);
  });

  it("should play faster for a speed superior to 1", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.setPlaybackRate(3);
    player.play();
    await sleep(300);
    expect(player.getPosition()).to.be.below(1);
    expect(player.getPosition()).to.be.above(0.5);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);
    expect(player.getPlaybackRate()).to.equal(3);
    expect(player.getVideoElement().playbackRate).to.equal(3);
  });

  it("should be able to seek when loaded", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(2);
    expect(player.getPosition()).to.equal(2);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(200);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(2);
  });

  it("should seek to minimum position for negative positions when loaded", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(200);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(player.getMinimumPosition());
  });

  it("should seek to maximum position if manual seek is higher than maximum when loaded", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(200);
    expect(player.getPlayerState()).to.equal("LOADED");
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
  });

  it("should seek to minimum position for negative positions after playing", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should seek to maximum position if manual seek is higher than maximum after playing", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    player.seekTo(200);
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
  });

  it("should seek to minimum position for negative positions when paused", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    player.pause();
    await sleep(10);
    expect(player.getPlayerState()).to.equal("PAUSED");
    player.seekTo(-2);
    expect(player.getPosition()).to.equal(player.getMinimumPosition());
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should seek to maximum position if manual seek is higher than maximum when paused", async function () {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(100);
    player.pause();
    await sleep(10);
    expect(player.getPlayerState()).to.equal("PAUSED");
    player.seekTo(10000);
    expect(player.getPosition()).to.equal(player.getMaximumPosition());
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should be in SEEKING state when seeking to a buffered part when playing", async function() {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getVideoBufferGap()).to.be.above(10);

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getVideoBufferGap()).to.be.above(10);
    await sleep(100);
    expect(player.getVideoBufferGap()).to.be.above(10);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  // TODO How to simulate this
  xit("should be in SEEKING state when seeking to a non-buffered part when playing", async function() {
    player.loadVideo({
      url: WebMURL,
      transport: "directfile",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");

    // deactivate autoRespond for now
    server.autoRespond = false;

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getVideoBufferGap()).to.equal(Infinity);

    await sleep(100);
    expect(player.getPlayerState()).to.equal("SEEKING");
    expect(player.getVideoBufferGap()).to.equal(Infinity);

    server.respond();
    await sleep(100);
    expect(player.getVideoBufferGap()).to.be.above(1);
    expect(player.getVideoBufferGap()).to.be.below(10);
    expect(player.getPlayerState()).to.equal("PLAYING");

    server.autoRespond = true;
  });
});


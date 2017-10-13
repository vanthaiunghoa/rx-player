# <a name="tutorials"></a>Tutorial

## Table of Contents
- [Basic media playback](#meth-basicmediaplayback)
- [Encrypted media playback](#meth-encryptedmediaplayback)

See [README](../../README.md) for prerequisities for using Rx-player.
Consider `player` to be a JavaScript instance of Rx-player. 

### <a name="meth-basicmediaplayback"></a>Media playback

Let's consider a DASH or Smooth stream, whose URL is `http://manifestURL`. 

**1. Load video**

You may initiate media loading, using method from API ``loadVideo``, providing the following configuration:
- url ( `string` ) : `"http://manifestURL"`
  - The URL to the the DASH or Smooth manifest. Manifest file may end with .mpd for DASH content, and .ism for Smooth content.
- transport ( `string` ) : `"dash"` or `"smooth"`
  - The type of adaptive bitrate streaming technique corresponding to provided manifest.
- autoPlay ( `boolean` )
  - Default is `false`. You might want to start playback automatically when enough media has been loaded.

```js
// loading dash stream with autoplay
player.loadVideo({
  url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
  transport: "dash",
  autoPlay: true,
});
```

**2. Follow player state**

Once you've triggered video loading, you may check for player state with ``getPlayerState`` method. First, state should be `LOADING` and then switch to `LOADED`. 

State will switch to `PLAYING` if autoPlay is enabled, or if user starts playback himself. Manual playback must be triggered at `LOADED` state.

You may listen to event `playerStateChange` to follow player state.

**3. Media controls**

Basic playback controls are defined by methods:
- play : Trigger playback. 
- pause : Pause on current time. State switches to `PAUSED`
- stop : Stop playback. Once you've stopped, you must reload video in order to play again. State switches to `STOPPED`.

### <a name="meth-encryptedmediaplayback"></a>Encrypted media playback

Encrypted content playback implies an additional configuration layer against basic media playback.  

Each browser implements a Content Decryption Module (CDM), with witch the player interacts to negociate rights for playing content. Content may be encrypted with a specific key system type (widevine, playready, clearkey, etc). The CDM implements various key systems ( https://drmtoday.com/platforms/ ).

At one point in the rights negociating workflow, the player needs a procedure to obtain the license to provide to the CDM.

You must add the `keySystems` parameter to the `loadVideo` call, which is an array that provides for each key systems :
- type ( `string` ) : Defines the key system to use. Either the canonical name of a key system (e.g. `"widevine"` ).
- getLicense ( `function` ) : Defines the procedure to get license. 
  - Example: As specified in recommendations for playready key systems, you get, as argument to the getLicense() callback, the challenge sent by the CDM. You must send this challenge to a license server request, then return a promise with the response, which should be the adequate license. 

  ```js
  var getLicense = function (challenge) {

    const req = new XMLHttpRequest();
    req.open('POST'
    'http://playready-testserver.azurewebsites.net/rightsmanager.asmx?PlayRight=1&UseSimpleNonPersistentLicense=1', true);
    req.responseType("arraybuffer");
    req.setRequestHeader('Content-type','application/xml');

    var licensePromise = new Promise((resolve) => {
      req.onload = resolve(req.response)
    });

    req.send(challenge);

    return licensePromise;

  }
  ```

The CDM will check each key system configuration, until he reaches a compatible key system.

Your configuration may looks like:

```js
// loading dash stream with autoplay and keySystems
player.loadVideo({
  url: "http://playready.eastus2.cloudapp.azure.com/smoothstreaming/SSWSS720H264PR/SuperSpeedway_720.ism/Manifest",
  transport: "smooth",
  autoPlay: true,
  keySystems: [{
    type: "playready",
    getLicense,
  }],
});
```
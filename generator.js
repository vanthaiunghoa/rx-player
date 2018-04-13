const playListGenerator = function (
  original_playlist, // in format [{url, duration}, ...]
  baseTime, // in format timestamp e.g 1516961850
  occurences // number of loops to reproduce
) {
  function loopGeneration(datas, times) {
    const array = [];
    const durations = datas
      .map((data) => data.endTime - data.startTime);
    const somme = durations
      .reduce((a, b) => a + b, 0);

    for (let i = 0; i <= times - 1; i++) {
      for (let k = 0; k <= datas.length - 1; k++) {
        array.push(
          {
            url: datas[k].url,
            startTime: datas[k].startTime + (somme * (i)),
            endTime: datas[k].endTime + (somme * (i)),
            transport: datas[k].transport,
            textTracks: datas[k].textTracks,
            overlays: datas[k].overlays,
          }
        );
      }
    }
    return array;
  }

  const generated = [];
  for (let i = 0; i < original_playlist.length; i++) {
    const playlist_before =
      (generated.length != 0) ? generated[generated.length - 1] : undefined;
    const url = original_playlist[i].url;
    const transport = original_playlist[i].transport;
    const startTime = playlist_before ?
      playlist_before.endTime : (0 + baseTime);
    const duration = original_playlist[i].duration;
    const endTime = startTime + duration;
    const textTracks = original_playlist[i].textTracks;
    const overlays = original_playlist[i].overlays;
    generated.push(
      {
        url,
        startTime,
        endTime,
        transport,
        textTracks,
        overlays,
      }
    );
  }
  const contents = loopGeneration(generated, occurences);
  const generatedAt = new Date();
  const mplVersion = "1.0";
  const metaplaylist = {
    metadata: {
      name: "Demo HAPI contents",
      mplVersion,
      generatedAt,
    },
    contents,
  };
  const result = JSON.stringify(metaplaylist, null, " ");
  console.log(result);
};

// const getLicense = (challenge) => {
//     let xhr = new XMLHttpRequest();
//     xhr.open("POST", "https://cwip-shaka-proxy.appspot.com/no_auth", true);
//     xhr.responseType = "arraybuffer";
//     xhr.send(challenge);
//     return new Promise((resolve) => {
//         xhr.onload = (evt) => {
//             const license = evt.target.response;
//             resolve(license);
//         }
//     })
// }

const data = [
  {
    name: "Logan",
    url: "https://hss-od.snl-lv3.canalplus-cdn.net/replay/cplus/ssd/cpl100004057-ant-1191026-1/ANT-1191026-1.ism/manifest",
    transport: "smooth",
    duration: 7906.4960000,
    textTracks: [{
      url: "https://hss-od.snl-lv3.canalplus-cdn.net/replay/cplus/ssd/cpl100004057-ant-1191026-1/ANT-1191026-1.vtt",
      language: "fra",
      mimeType: "text/vtt",
    }],
    overlays: [{
      start: 0,
      end: Number.MAX_VALUE,
      version: 1,
      element: {
        url: "http://127.0.0.1:8084/canal_plus_logo.png",
        format: "png",
        xAxis: "85%",
        yAxis: "5%",
        height: "",
        width: "10%",
      },
    }],
  },
  {
    name: "Benjamin Button",
    url: "https://hss-od.snl-lv3.canalplus-cdn.net/replay/csat/ssd/csa100061986-canal.fr-1172893-1-vm-hd-mtbd/canal-fr-1172893-1-VM-HD-MTBD.ism/manifest",
    transport: "smooth",
    duration: 9564.8853333,
    textTracks: [{
      url: "https://hss-od.snl-lv3.canalplus-cdn.net/replay/csat/ssd/csa100061986-canal.fr-1172893-1-vm-hd-mtbd/canal-fr-1172893-1-VM-HD-MTBD.vtt",
      language: "fra",
      mimeType: "text/vtt", // "application/ttml+xml" // "application/x-sami" // "text/vtt"
    }],
    overlays: [{
      start: 0,
      end: Number.MAX_VALUE,
      version: 1,
      element: {
        url: "http://127.0.0.1:8084/canal_plus_logo.png",
        format: "png",
        xAxis: "85%",
        yAxis: "85%",
        height: "",
        width: "10%",
      },
    }],
  },
  {
    name: "Gardiens de la galaxie",
    url : "https://hss-od.snl-lv3.canalplus-cdn.net/replay/cplus/ssd/cpl100002535-ant-1191566-1/ANT-1191566-1.ism/manifest",
    transport: "smooth",
    duration: 7823.0400000,
    overlays: [{
      start: 0,
      end: Number.MAX_VALUE,
      version: 1,
      element: {
        url: "http://127.0.0.1:8084/canal_plus_logo.png",
        format: "png",
        xAxis: "85%",
        yAxis: "5%",
        height: "",
        width: "10%",
      },
    }],
  },
  {
    name: "Un homme à la hauteur",
    url: "https://hss-od.snl-lv3.canalplus-cdn.net/replay/csat/ssd/csa100079961-canal.fr-1168480-1-ar-hd-mtbd/canal-fr-1168480-1-AR-HD-MTBD.ism/manifest",
    transport: "smooth",
    duration: 5639.3386666,
    overlays: [{
      start: 0,
      end: Number.MAX_VALUE,
      version: 1,
      element: {
        url: "http://127.0.0.1:8084/canal_plus_logo.png",
        format: "png",
        xAxis: "85%",
        yAxis: "85%",
        height: "",
        width: "10%",
      },
    }],
  },
];

playListGenerator(data, Date.now() / 1000 - 10000, 1);

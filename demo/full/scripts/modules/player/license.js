const token = "10501iObW9VdwlLPyTU1NGuydH2UNMmVjMuw6wD_sHZhPB3tcSg3FhHD0ukLdfjJ34aqzhKel1x1XXbmsv_tonybGZrptgPaert3HD6xF6tZiTwy7r0iwvEKvFuZsfyrz7m6ux32pYsjwiu7aNbZ1HiW-yMLMoaaLz2iGmt_O_0nwWLWMyhxQm_mqmwoUZGeglG84XoCyr3LgOVwHiU5LX9fVL1_hPptxfd_n6BGwAno8pB_u0aPjfp1XhEP2XOcEsA5nmH94azV-BPgSXwlFVU_-viNxijmpdUgs62qGLz4vKfluMTVzkdhMuhcSFsWGeCWfrZRDT4cvvxEGxX5E5P1i87P-Dc7FrM2D73Fs--6rc2re2f54_EddZ4CDI-7xiBW2ram14CQRjQsCYipAa1ESh63V-DSpoSGpUEDFa9oBxCAiV-_R5aCf9FeloUT60rb33CHdmRE_WlGW7bPgalEjw8fXIwr3pndmd3MMw2-YcTdM2YlAhK9UcT2t8a-0yQOniMiiom9gjjhYy9D11tqVa8h7JMMEqgCnMNp9RDzFZw6e8yxeuY1YN7CSTypK7j2-mT5l41XnYqqzEPiGzuRMSTEw_CLmbgmeEguAjmBQucWwX0l86tgFeapYWZLybjmLO1V9z1w4CUfBW8KBcl81SXDK6gi067O319gjr_bj_VV1VBrgwG5uQT1jn9AgTJU2Uo_Xvxv7ex5VHD_fKbifYsNaSHWhsPIwqYe9l5rcR5IaHwpBnEBPYOjgQAOCRiI0d0P8eUuy1TI0GIOBImlT7vcaWzyJWUXMQWiSoQOdy4HPXceV-ohSLPYFqKFAMaB7qlTrXsbEzvcwgVgUyyqs5gt8yT_LXBwNr19aTfmzBcK0_Ix_M3DxR9mT5s93cVNOvk4lRHWnhqeXUvrTbCBjTAFSqK1ZlDepLSRdlPBWv-1tFCQPLJvaK1w_33nJ9pJ2M_bOiHW-lMooyfxzjdIvve1i2m_oUplykmYtjt7jAHucFStw8WrfCADjpzGzNe50_eUfjUXajfA0iy5AmRYDTR4sGDNFmrzdU7DVFxn_Rin98qsOUucZ48tq0rrgYqnIkQssA0wipzKpGcjVlULzLiponvRuLqkSaWiFOaoLP5zjJdf6vBptFHOJfTUbPaC8wd93FWjF9Gol9PL8p59rIelnyRysiHg1h5BAwpSajy4S0rGE5O3ejwqVKjTbioPvDSApw8daGmnxuiXbulEPsGLSC5VfJd69EEmv7a1YLWNkHPWG48zvrcQlAEHu0OnjqcZOyy33jWA944km3tyDjYegN1IUFxvbwtENbNo2ixNWzNYNMyAEIoYthVZAulG7";

const urls = {};
const contentIds = ["8265349_50001", "727336_50002", "8519753_50001", "6735270_50002"];
const kids = {
  "0e8324682cc34d77b10f215f3df03a82": "8265349_50001",
  "230a8b24a9bf4a3f948629a3b14fc554": "727336_50002",
  "5398543281d84452a6c755222285fe44": "8519753_50001", // Gardiens de la galaxie
  "448df68c83214129b5544514438026ee": "6735270_50002",
};

////////////////////////////////// BYTES //////////////////////////////////////
/**
 * Returns Uint8Array from UTF16 string.
 * /!\ Take only the first byte from each UTF16 code.
 * @param {string} str
 * @returns {Uint8Array}
 */
function strToBytes(str) {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

/**
 * construct string from unicode values.
 * /!\ does not support non-UCS-2 values
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToStr(bytes) {
  return String.fromCharCode.apply(null, bytes);
}

function be4toi(bytes, offset) {
  return (
    (bytes[offset + 0] * 0x1000000) +
    (bytes[offset + 1] * 0x0010000) +
    (bytes[offset + 2] * 0x0000100) +
    (bytes[offset + 3]));
}

function bytesToHex(bytes, sep = "") {
  let hex = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += (bytes[i] >>> 4).toString(16);
    hex += (bytes[i] & 0xF).toString(16);
    if (sep.length && i < bytes.byteLength - 1) {
      hex += sep;
    }
  }
  return hex;
}

///////////////////////////////////// License //////////////////////////////////

const getPlaysets = (contentId) => {
  const baseURL = "https://secure-gen-hapi.canal-plus.com/conso/playset?contentId=";
  const url = baseURL + contentId;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.setRequestHeader("Authorization", "PASS Token=\"" +token+ "\"");
  xhr.setRequestHeader("XX-API-VERSION","2.1");
  xhr.setRequestHeader("XX-DEVICE","pc db913929-61ec-4be2-9249-5ba7f7bbe0ae");
  xhr.setRequestHeader("XX-DOMAIN","json");
  xhr.setRequestHeader("XX-DISTMODES","catchup");
  xhr.setRequestHeader("XX-Profile-Id","0");
  xhr.setRequestHeader("XX-OPERATOR","pc");
  xhr.setRequestHeader("XX-SERVICE","mycanal");
  xhr.setRequestHeader("XX-SUBOFFERS","CP_ALD");
  xhr.send();
  return JSON.parse(xhr.response);
};

const getView = (playset) => {
  const url = "https://secure-gen-hapi.canal-plus.com/conso/view";
  const xhr = new XMLHttpRequest();
  xhr.open("PUT", url, false);
  xhr.setRequestHeader("Authorization", "PASS Token=\"" +token+ "\"");
  xhr.setRequestHeader("XX-API-VERSION","2.1");
  xhr.setRequestHeader("XX-DEVICE","pc db913929-61ec-4be2-9249-5ba7f7bbe0ae");
  xhr.setRequestHeader("XX-DOMAIN","json");
  xhr.setRequestHeader("XX-DISTMODES","catchup");
  xhr.setRequestHeader("XX-Profile-Id","0");
  xhr.setRequestHeader("XX-OPERATOR","pc");
  xhr.setRequestHeader("XX-SERVICE","mycanal");
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
  xhr.send(JSON.stringify(playset));
  return JSON.parse(xhr.response);
};

const buildURLs = (contentIds) => {
  contentIds.forEach((contentId) => {
    const playsets = getPlaysets(contentId);
    const widevinePlayset = playsets.available.find((playset) => playset.drmType === "DRM Widevine");
    const infos = getView(widevinePlayset);
    const url = "https://secure-gen-hapi.canal-plus.com" + infos["@licence"];
    urls[contentId] = url;
  });
};

export default function getLicense(challenge, _messageType, initData) {
  const decoder = new TextDecoder();
  const idx = decoder.decode(initData).lastIndexOf("pssh");
  const length = be4toi(initData, idx - 4);
  const widevinePssh = initData.subarray(idx + 4, idx + 4 + 52);
  const version = be4toi(widevinePssh, 0);
  return new Promise((resolve, reject) => {
    if (version === 0) {
      const privateData = widevinePssh.subarray(24, Infinity);
      const keyId = privateData.subarray(4, Infinity);
      const hexKeyId = bytesToHex(keyId);
      const contentId = kids[hexKeyId];
      const url = urls[contentId];
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", "PASS Token=\"" +token+ "\"");
      xhr.setRequestHeader("XX-API-VERSION","2.1");
      xhr.setRequestHeader("XX-DEVICE","pc db913929-61ec-4be2-9249-5ba7f7bbe0ae");
      xhr.setRequestHeader("XX-DOMAIN","json");
      xhr.setRequestHeader("XX-DISTMODES","catchup");
      xhr.setRequestHeader("XX-Profile-Id","0");
      xhr.setRequestHeader("XX-OPERATOR","pc");
      xhr.setRequestHeader("XX-SERVICE","mycanal");
      xhr.responseType = "document";
      xhr.send(btoa(bytesToStr(challenge)));
      xhr.onload = (evt) => {
        const xmlLicense = evt.target.response;
        const strLicence = xmlLicense.getElementsByTagName("license")[0].textContent;
        const license = strToBytes(atob(strLicence));
        resolve(license);
      };
    } else {
      reject();
    }
  });
}

///////////////// Load Video ///////////////////////////////////////////////////
buildURLs(contentIds);

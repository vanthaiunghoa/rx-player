/* eslint-disable no-console */
export default function passInit(env = 'prod', callback) {
  const head = document.getElementsByTagName('head')[0];
  const passScript = document.createElement('script');
  passScript.type = 'text/javascript';
  const passCSS = document.createElement('link');
  passCSS.type = 'text/css';
  passCSS.rel = 'stylesheet';
  passCSS.media = 'screen';
  if (env === 'prod') {
    passScript.src = 'https://media-pass.canal-plus.com/latest/js/bundle.js';
    passCSS.href = 'https://media-pass.canal-plus.com/1/css/basic.css';
  } else {
    passScript.src = 'https://preprod-media-pass.canal-bis.com/latest/js/bundle.js';
    passCSS.href = 'https://preprod-media-pass.canal-bis.com/1/css/basic.css';
  }

  // document.querySelector('#login').style.display = 'block';
  passScript.onload = () => {
    try {
      window.waitForPassJSON(() => {
        const passToken = window.getPassToken();
        // const { isSubscriber } = window.passJSON;
        // if (passToken !== '' && passToken !== null && isSubscriber) {
        //   document.querySelector('#pass').style.display = 'block';
        //   document.querySelector('#login').style.display = 'none';
        // }
        window.passToken = passToken;

        if (callback) callback();
      });
    } catch (e) {
      console.error(e);
    }
  };
  head.appendChild(passScript);
  // head.appendChild(passCSS);
}

const fs = require('fs');
const request = require('request');
const path = require('path');
const Config = require('../config');
const Util = require('../util');
const {remote} = require('electron');

const config = Config.load();

function download (url, filename) {
  console.info(`download start: ${url}`);
  if (config.autoSaveFavUrlName) {
    filename = Util.getFileName(url);
  }
  const savepath = (config.autoSavePath || '').trim()
    || path.join(Util.getWritableRootPath(), 'Favorited Images');
  try {
    fs.mkdirSync(savepath);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      window.toastErrorMessage('Failed - Save Image : Cannot make folder');
      return;
    }
  }
  const filepath = path.join(savepath, filename);
  try {
    request(url).pipe(fs.createWriteStream(filepath));
  } catch (e) {
    window.toastErrorMessage(`Failed - Save Image : Cannot save image to ${filepath}`);
  }
}

function generateFilename (imgurl, index) {
  const splitted = imgurl.split('.');
  const ext = splitted[splitted.length - 1]
    .replace(/:\w+/, '');
  const now = new Date();
  let [date, time, zone] = now.toISOString().split(/T|Z/);
  time = time.replace(/:/g, '');
  const result = `${date} ${time}.${ext}`;
  return result;
}

function favoriteAutoSave (tweet) {
  // Already favorited. quit function
  // if (tweet.hasClass('is-favorite')) return;

  // in detail view
  const images = tweet.find('img.media-img');
  if (images.length > 0) {
    let index = 1;
    images.each((i, elem) => {
      let imageURL = Util.getOrigPath(elem.src);
      let filename = generateFilename(imageURL, index++);
      download(imageURL, filename);
    });
  } else {
    // in timeline
    const images = tweet.find('a.js-media-image-link');
    let index = 1;
    images.each((i, elem) => {
      let match = elem.style.backgroundImage.match(/url\("(.+)"\)/);
      if (!match) return;
      let imageURL = Util.getOrigPath(match[1]);
      let filename = generateFilename(imageURL, index++);
      download(imageURL, filename);
    });
  }
  // find GIF
  const video = tweet.find('video.js-media-gif');
  if (video.length > 0) {
    const src = video[0].currentSrc;
    const filename = generateFilename(src);
    download(src, filename);
  }
}

function tossElement (e) {
  if (typeof e === 'undefined') return;
  if (process.platform === 'darwin'
    ? remote.getGlobal('keyState').alt
    : remote.getGlobal('keyState').ctrl
  ) {
    return;
  } else if (config.enableAutoSaveFav) {
    favoriteAutoSave(window.$(`[data-key="${e}"]`).eq(0));
  }
}

module.exports = tossElement;

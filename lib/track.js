
/**
 * Module dependencies.
 */

var util = require('./util');
var Track = require('./schemas').build('metadata','Track');
var PassThrough = require('stream').PassThrough;
var Speaker = require('speaker');
var Lame = require('lame');

var debug = require('debug')('spotify-web:track');

// node v0.8.x compat
if (!PassThrough) PassThrough = require('readable-stream/passthrough');

/**
 * Module exports.
 */

exports = module.exports = Track;

/**
 * Track URI getter.
 */

Object.defineProperty(Track.prototype, 'uri', {
  get: function () {
    return util.gid2uri('track', this.gid);
  },
  enumerable: true,
  configurable: true
});

/**
 * Track Preview URL getter
 */
Object.defineProperty(Track.prototype, 'previewUrl', {
  get: function () {
    var previewUrlBase = 'http://d318706lgtcm8e.cloudfront.net/mp3-preview/'
    return this.preview.length && (previewUrlBase + util.gid2id(this.preview[0].fileId));
  },
  enumerable: true,
  configurable: true
})

/**
 * Loads all the metadata for this Track instance. Useful for when you get an only
 * partially filled Track instance from an Album instance for example.
 *
 * @param {Function} fn callback function
 * @api public
 */

Track.prototype.get =
Track.prototype.metadata = function (fn) {
  if (this._loaded) {
    // already been loaded...
    debug('track already loaded');
    return process.nextTick(fn.bind(null, null, this));
  }
  var spotify = this._spotify;
  var self = this;
  spotify.get(this.uri, function (err, track) {
    if (err) return fn(err);
    // extend this Track instance with the new one's properties
    Object.keys(track).forEach(function (key) {
      if (!self.hasOwnProperty(key)) {
        self[key] = track[key];
      }
    });
    fn(null, self);
  });
};

/**
 * Begins playing this track, returns a Readable stream that outputs MP3 data.
 *
 * @api public
 */

Track.prototype.play = function (offset, fn) {
  if(!offset) offset = 0;
  // TODO: add formatting options once we figure that out
  var spotify = this._spotify;
  var stream = new PassThrough();

  var frameSize = (144*160000)/44100; // ~522 bytes for 160kbps MP3
  var frameLength = (1152/44100)*1000; // ~26ms per frame

  // if a song was playing before this, the "track_end" command needs to be sent
  var track = spotify.currentTrack;
  
  if (track && track._playSession) {
    console.log("sending end");
    spotify.sendTrackEnd(track._playSession.lid, track.uri, track.duration);
    console.log("sent end");

    track._playSession = null;
  }

  // set this Track instance as the "currentTrack"
  spotify.currentTrack = track = this;
  var audio = {
    decoder: new Lame.Decoder(),
    speaker: new Speaker()
  }
  audio.decoder.pipe(audio.speaker);
  track.audio = audio;

  // initiate a "play session" for this Track
  spotify.trackUri(track, function (err, res) {
    if (err) return stream.emit('error', err);
    if (!res.uri) return stream.emit('error', new Error('response contained no "uri"'));
    debug('GET %s', res.uri);
    track._playSession = res;
    var req = spotify.agent.get(res.uri)
      .set({ 'User-Agent': spotify.userAgent })
      .set('Range', "bytes=" + (Math.floor((offset/frameLength) * frameSize) + "-"))
      .end()
      .request();
    req.on('response', response);
  });

  function response (res) {
    debug('HTTP/%s %s', res.httpVersion, res.statusCode);
    if (res.statusCode == 200 || res.statusCode == 206) {
      console.log("res: " + JSON.stringify(res.headers));
      res.pipe(audio.decoder);
      fn(null);
    } else {
      fn(new Error('HTTP Status Code ' + res.statusCode));
    }
  }
};

Track.prototype.resume = function() {
  var track = this._spotify.currentTrack;
  track.audio.decoder.unpipe();
  track.audio.speaker = new Speaker();
  track.audio.decoder.pipe(track.audio.speaker);
};

Track.prototype.pause = function() {
  var track = this._spotify.currentTrack;
  track.audio.speaker.end();
  debugger;
};

Track.prototype.stop = function() {
  var track = this._spotify.currentTrack;
  track.pause();
  track.audio.decoder.end();
};

/**
 * Begins playing a preview of the track, returns a Readable stream that outputs MP3 data.
 *
 * @api public
 */

Track.prototype.playPreview = function () {
  var spotify = this._spotify;
  var stream = new PassThrough();
  var previewUrl = this.previewUrl;

  if (!previewUrl) {
    process.nextTick(function() {
      stream.emit('error', new Error('Track does not have preview available'));
    });
    return stream;
  }

  debug('GET %s', previewUrl);
  var req = spotify.agent.get(previewUrl)
    .set({ 'User-Agent': spotify.userAgent })
    .end()
    .request();
  req.on('response', response);

  function response (res) {
    debug('HTTP/%s %s', res.httpVersion, res.statusCode);
    if (res.statusCode == 200) {
      res.pipe(stream);
    } else {
      stream.emit('error', new Error('HTTP Status Code ' + res.statusCode));
    }
  }

};

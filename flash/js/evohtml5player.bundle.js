!function (e) {
	if ("function" == typeof bootstrap)
		bootstrap("simplewebrtc", e);
	else if ("object" == typeof exports)
		module.exports = e();
	else if ("function" == typeof define && define.amd)
		define(e);
	else if ("undefined" != typeof ses) {
		if (!ses.ok())
			return;
		ses.makeSimpleWebRTC = e
	} else
		"undefined" != typeof window ? window.SimpleWebRTC = e() : global.SimpleWebRTC = e()
}
(function () {
	var define,
	ses,
	bootstrap,
	module,
	exports;
	return function (e, t, n) {
		function i(n, s) {
			if (!t[n]) {
				if (!e[n]) {
					var o = "function" == typeof require && require;
					if (!s && o)
						return o(n, !0);
					if (r)
						return r(n, !0);
					throw new Error("Cannot find module '" + n + "'")
				}
				var u = t[n] = {
					exports: {}
				};
				e[n][0].call(u.exports, function (t) {
					var r = e[n][1][t];
					return i(r ? r : t)
				}, u, u.exports)
			}
			return t[n].exports
		}
		for (var r = "function" == typeof require && require, s = 0; s < n.length; s++)
			i(n[s]);
		return i
	}
	({
		1: [function (require, module, exports) {
				function SimpleWebRTC(opts) {
					var item,
					connection,
					self = this,
					options = opts || {},
					config = this.config = {
						url: "https://signaling.simplewebrtc.com:443/",
						socketio: {},
						connection: null,
						debug: !1,
						localVideoEl: "",
						remoteVideosEl: "",
						enableDataChannels: !0,
						autoRequestMedia: !1,
						autoRemoveVideos: !0,
						adjustPeerVolume: !1,
						peerVolumeWhenSpeaking: .25,
						media: {
							video: !0,
							audio: !0
						},
						receiveMedia: {
							offerToReceiveAudio: 1,
							offerToReceiveVideo: 1
						},
						localVideo: {
							autoplay: !0,
							mirror: !0,
							muted: !0
						}
					};
					this.logger = function () {
						return opts.debug ? opts.logger || console : opts.logger || mockconsole
					}
					();
					for (item in options)
						this.config[item] = options[item];
					this.capabilities = webrtcSupport,
					WildEmitter.call(this),
					connection = null === this.config.connection ? this.connection = new SocketIoConnection(this.config) : this.connection = this.config.connection,
					connection.on("connect", function () {
						self.emit("connectionReady", connection.getSessionid()),
						self.sessionReady = !0,
						self.testReadiness()
					}),
					connection.on("message", function (message) {
						var peer,
						peers = self.webrtc.getPeers(message.from, message.roomType);
						"offer" === message.type ? (peers.length && peers.forEach(function (p) {
								p.sid == message.sid && (peer = p)
							}), peer || (peer = self.webrtc.createPeer({
										id: message.from,
										sid: message.sid,
										type: message.roomType,
										enableDataChannels: self.config.enableDataChannels && "screen" !== message.roomType,
										sharemyscreen: "screen" === message.roomType && !message.broadcaster,
										broadcaster: "screen" !== message.roomType || message.broadcaster ? null : self.connection.getSessionid()
									}), self.emit("createdPeer", peer)), peer.handleMessage(message)) : peers.length && peers.forEach(function (peer) {
							message.sid ? peer.sid === message.sid && peer.handleMessage(message) : peer.handleMessage(message)
						})
					}),
					connection.on("remove", function (room) {
						room.id !== self.connection.getSessionid() && self.webrtc.removePeers(room.id, room.type)
					}),
					opts.logger = this.logger,
					opts.debug = !1,
					this.webrtc = new WebRTC(opts),
					["mute", "unmute", "pauseVideo", "resumeVideo", "pause", "resume", "sendToAll", "sendDirectlyToAll"].forEach(function (method) {
						self[method] = self.webrtc[method].bind(self.webrtc)
					}),
					this.webrtc.on("*", function () {
						self.emit.apply(self, arguments)
					}),
					config.debug && this.on("*", this.logger.log.bind(this.logger, "SimpleWebRTC event:")),
					this.webrtc.on("localStream", function () {
						self.testReadiness()
					}),
					this.webrtc.on("message", function (payload) {
						self.connection.emit("message", payload)
					}),
					this.webrtc.on("peerStreamAdded", this.handlePeerStreamAdded.bind(this)),
					this.webrtc.on("peerStreamRemoved", this.handlePeerStreamRemoved.bind(this)),
					this.config.adjustPeerVolume && (this.webrtc.on("speaking", this.setVolumeForAll.bind(this, this.config.peerVolumeWhenSpeaking)), this.webrtc.on("stoppedSpeaking", this.setVolumeForAll.bind(this, 1))),
					connection.on("stunservers", function (args) {
						self.webrtc.config.peerConnectionConfig.iceServers = args,
						self.emit("stunservers", args)
					}),
					connection.on("turnservers", function (args) {
						self.webrtc.config.peerConnectionConfig.iceServers = self.webrtc.config.peerConnectionConfig.iceServers.concat(args),
						self.emit("turnservers", args)
					}),
					this.webrtc.on("iceFailed", function (peer) {}),
					this.webrtc.on("connectivityError", function (peer) {}),
					this.webrtc.on("audioOn", function () {
						self.webrtc.sendToAll("unmute", {
							name: "audio"
						})
					}),
					this.webrtc.on("audioOff", function () {
						self.webrtc.sendToAll("mute", {
							name: "audio"
						})
					}),
					this.webrtc.on("videoOn", function () {
						self.webrtc.sendToAll("unmute", {
							name: "video"
						})
					}),
					this.webrtc.on("videoOff", function () {
						self.webrtc.sendToAll("mute", {
							name: "video"
						})
					}),
					this.webrtc.on("localScreen", function (stream) {
						var el = document.createElement("video"),
						container = self.getRemoteVideoContainer();
						el.oncontextmenu = function () {
							return !1
						},
						el.id = "localScreen",
						attachMediaStream(stream, el),
						container && container.appendChild(el),
						self.emit("localScreenAdded", el),
						self.connection.emit("shareScreen"),
						self.webrtc.peers.forEach(function (existingPeer) {
							var peer;
							"video" === existingPeer.type && (peer = self.webrtc.createPeer({
										id: existingPeer.id,
										type: "screen",
										sharemyscreen: !0,
										enableDataChannels: !1,
										receiveMedia: {
											offerToReceiveAudio: 0,
											offerToReceiveVideo: 0
										},
										broadcaster: self.connection.getSessionid()
									}), self.emit("createdPeer", peer), peer.start())
						})
					}),
					this.webrtc.on("localScreenStopped", function (stream) {
						self.stopScreenShare()
					}),
					this.webrtc.on("channelMessage", function (peer, label, data) {
						"volume" == data.type && self.emit("remoteVolumeChange", peer, data.volume)
					}),
					this.config.autoRequestMedia && this.startLocalVideo()
				}
				var WebRTC = require("./webrtc"),
				WildEmitter = require("wildemitter"),
				webrtcSupport = require("webrtcsupport"),
				attachMediaStream = require("attachmediastream"),
				mockconsole = require("mockconsole"),
				SocketIoConnection = require("./socketioconnection");
				SimpleWebRTC.prototype = Object.create(WildEmitter.prototype, {
						constructor: {
							value: SimpleWebRTC
						}
					}),
				SimpleWebRTC.prototype.leaveRoom = function () {
					this.roomName && (this.connection.emit("leave"), this.webrtc.peers.forEach(function (peer) {
							peer.end()
						}), this.getLocalScreen() && this.stopScreenShare(), this.emit("leftRoom", this.roomName), this.roomName = void 0)
				},
				SimpleWebRTC.prototype.disconnect = function () {
					this.connection.disconnect(),
					delete this.connection
				},
				SimpleWebRTC.prototype.handlePeerStreamAdded = function (peer) {
					var self = this,
					container = this.getRemoteVideoContainer(),
					video = attachMediaStream(peer.stream);
					peer.videoEl = video,
					video.id = this.getDomId(peer),
					container && container.appendChild(video),
					this.emit("videoAdded", video, peer),
					window.setTimeout(function () {
						self.webrtc.isAudioEnabled() || peer.send("mute", {
							name: "audio"
						}),
						self.webrtc.isVideoEnabled() || peer.send("mute", {
							name: "video"
						})
					}, 250)
				},
				SimpleWebRTC.prototype.handlePeerStreamRemoved = function (peer) {
					var container = this.getRemoteVideoContainer(),
					videoEl = peer.videoEl;
					this.config.autoRemoveVideos && container && videoEl && container.removeChild(videoEl),
					videoEl && this.emit("videoRemoved", videoEl, peer)
				},
				SimpleWebRTC.prototype.getDomId = function (peer) {
					return [peer.id, peer.type, peer.broadcaster ? "broadcasting" : "incoming"].join("_")
				},
				SimpleWebRTC.prototype.setVolumeForAll = function (volume) {
					this.webrtc.peers.forEach(function (peer) {
						peer.videoEl && (peer.videoEl.volume = volume)
					})
				},
				SimpleWebRTC.prototype.joinRoom = function (name, data, cb) {
					var self = this;
					this.roomName = name,
					this.connection.emit("join", name, data, function (err, roomDescription) {
						if (err)
							self.emit("error", err);
						else {
							var id,
							client,
							type,
							peer;
							for (id in roomDescription.clients) {
								client = roomDescription.clients[id];
								for (type in client)
									client[type] && (peer = self.webrtc.createPeer({
												id: id,
												type: type,
												enableDataChannels: self.config.enableDataChannels && "screen" !== type,
												receiveMedia: {
													offerToReceiveAudio: "screen" !== type && self.config.receiveMedia.offerToReceiveAudio ? 1 : 0,
													offerToReceiveVideo: self.config.receiveMedia.offerToReceiveVideo
												}
											}), self.emit("createdPeer", peer), peer.start())
							}
						}
						cb && cb(err, roomDescription),
						err || self.emit("joinedRoom", name)
					})
				},
				SimpleWebRTC.prototype.getEl = function (idOrEl) {
					return "string" == typeof idOrEl ? document.getElementById(idOrEl) : idOrEl
				},
				SimpleWebRTC.prototype.startLocalVideo = function () {
					var self = this;
					this.webrtc.startLocalMedia(this.config.media, function (err, stream) {
						err ? self.emit("localMediaError", err) : attachMediaStream(stream, self.getLocalVideoContainer(), self.config.localVideo)
					})
				},
				SimpleWebRTC.prototype.stopLocalVideo = function () {
					this.webrtc.stopLocalMedia()
				},
				SimpleWebRTC.prototype.getLocalVideoContainer = function () {
					var el = this.getEl(this.config.localVideoEl);
					if (el && "VIDEO" === el.tagName)
						return el.oncontextmenu = function () {
							return !1
						},
					el;
					if (el) {
						var video = document.createElement("video");
						return video.oncontextmenu = function () {
							return !1
						},
						el.appendChild(video),
						video
					}
				},
				SimpleWebRTC.prototype.getRemoteVideoContainer = function () {
					return this.getEl(this.config.remoteVideosEl)
				},
				SimpleWebRTC.prototype.shareScreen = function (cb) {
					this.webrtc.startScreenShare(cb)
				},
				SimpleWebRTC.prototype.getLocalScreen = function () {
					return this.webrtc.localScreen
				},
				SimpleWebRTC.prototype.stopScreenShare = function () {
					this.connection.emit("unshareScreen");
					var videoEl = document.getElementById("localScreen"),
					container = this.getRemoteVideoContainer(),
					stream = this.getLocalScreen();
					this.config.autoRemoveVideos && container && videoEl && container.removeChild(videoEl),
					videoEl && this.emit("videoRemoved", videoEl),
					stream && stream.stop(),
					this.webrtc.peers.forEach(function (peer) {
						peer.broadcaster && peer.end()
					})
				},
				SimpleWebRTC.prototype.testReadiness = function () {
					var self = this;
					this.webrtc.localStream && this.sessionReady && self.emit("readyToCall", self.connection.getSessionid())
				},
				SimpleWebRTC.prototype.createRoom = function (name, cb) {
					2 === arguments.length ? this.connection.emit("create", name, cb) : this.connection.emit("create", name)
				},
				SimpleWebRTC.prototype.sendFile = function () {
					return webrtcSupport.dataChannel ? void 0 : this.emit("error", new Error("DataChannelNotSupported"))
				},
				module.exports = SimpleWebRTC
			}, {
				"./socketioconnection": 3,
				"./webrtc": 2,
				attachmediastream: 6,
				mockconsole: 7,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		4: [function (require, module, exports) {
				var prefix,
				version;
				window.mozRTCPeerConnection || navigator.mozGetUserMedia ? (prefix = "moz", version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10)) : (window.webkitRTCPeerConnection || navigator.webkitGetUserMedia) && (prefix = "webkit", version = navigator.userAgent.match(/Chrom(e|ium)/) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
				var PC = window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
				IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate,
				SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription,
				MediaStream = window.webkitMediaStream || window.MediaStream,
				screenSharing = "https:" === window.location.protocol && ("webkit" === prefix && version >= 26 || "moz" === prefix && version >= 33),
				AudioContext = window.AudioContext || window.webkitAudioContext,
				videoEl = document.createElement("video"),
				supportVp8 = videoEl && videoEl.canPlayType && "probably" === videoEl.canPlayType('video/webm; codecs="vp8", vorbis'),
				getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia;
				module.exports = {
					prefix: prefix,
					browserVersion: version,
					support: !!PC && supportVp8 && !!getUserMedia,
					supportRTCPeerConnection: !!PC,
					supportVp8: supportVp8,
					supportGetUserMedia: !!getUserMedia,
					supportDataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
					supportWebAudio: !(!AudioContext || !AudioContext.prototype.createMediaStreamSource),
					supportMediaStream: !(!MediaStream || !MediaStream.prototype.removeTrack),
					supportScreenSharing: !!screenSharing,
					dataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
					webAudio: !(!AudioContext || !AudioContext.prototype.createMediaStreamSource),
					mediaStream: !(!MediaStream || !MediaStream.prototype.removeTrack),
					screenSharing: !!screenSharing,
					AudioContext: AudioContext,
					PeerConnection: PC,
					SessionDescription: SessionDescription,
					IceCandidate: IceCandidate,
					MediaStream: MediaStream,
					getUserMedia: getUserMedia
				}
			}, {}
		],
		5: [function (require, module, exports) {
				function WildEmitter() {
					this.isWildEmitter = !0,
					this.callbacks = {}
				}
				module.exports = WildEmitter,
				WildEmitter.prototype.on = function (event, groupName, fn) {
					var hasGroup = 3 === arguments.length,
					group = hasGroup ? arguments[1] : void 0,
					func = hasGroup ? arguments[2] : arguments[1];
					return func._groupName = group,
					(this.callbacks[event] = this.callbacks[event] || []).push(func),
					this
				},
				WildEmitter.prototype.once = function (event, groupName, fn) {
					function on() {
						self.off(event, on),
						func.apply(this, arguments)
					}
					var self = this,
					hasGroup = 3 === arguments.length,
					group = hasGroup ? arguments[1] : void 0,
					func = hasGroup ? arguments[2] : arguments[1];
					return this.on(event, group, on),
					this
				},
				WildEmitter.prototype.releaseGroup = function (groupName) {
					var item,
					i,
					len,
					handlers;
					for (item in this.callbacks)
						for (handlers = this.callbacks[item], i = 0, len = handlers.length; len > i; i++)
							handlers[i]._groupName === groupName && (handlers.splice(i, 1), i--, len--);
					return this
				},
				WildEmitter.prototype.off = function (event, fn) {
					var i,
					callbacks = this.callbacks[event];
					return callbacks ? 1 === arguments.length ? (delete this.callbacks[event], this) : (i = callbacks.indexOf(fn), callbacks.splice(i, 1), 0 === callbacks.length && delete this.callbacks[event], this) : this
				},
				WildEmitter.prototype.emit = function (event) {
					var i,
					len,
					listeners,
					args = [].slice.call(arguments, 1),
					callbacks = this.callbacks[event],
					specialCallbacks = this.getWildcardCallbacks(event);
					if (callbacks)
						for (listeners = callbacks.slice(), i = 0, len = listeners.length; len > i && listeners[i]; ++i)
							listeners[i].apply(this, args);
					if (specialCallbacks)
						for (len = specialCallbacks.length, listeners = specialCallbacks.slice(), i = 0, len = listeners.length; len > i && listeners[i]; ++i)
							listeners[i].apply(this, [event].concat(args));
					return this
				},
				WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
					var item,
					split,
					result = [];
					for (item in this.callbacks)
						split = item.split("*"), ("*" === item || 2 === split.length && eventName.slice(0, split[0].length) === split[0]) && (result = result.concat(this.callbacks[item]));
					return result
				}
			}, {}
		],
		6: [function (require, module, exports) {
				module.exports = function (stream, el, options) {
					var item,
					URL = window.URL,
					opts = {
						autoplay: !0,
						mirror: !1,
						muted: !1
					},
					element = el || document.createElement("video");
					if (options)
						for (item in options)
							opts[item] = options[item];
					if (opts.autoplay && (element.autoplay = "autoplay"), opts.muted && (element.muted = !0), opts.mirror && ["", "moz", "webkit", "o", "ms"].forEach(function (prefix) {
							var styleName = prefix ? prefix + "Transform" : "transform";
							element.style[styleName] = "scaleX(-1)"
						}), URL && URL.createObjectURL)
						element.src = URL.createObjectURL(stream);
					else if (element.srcObject)
						element.srcObject = stream;
					else {
						if (!element.mozSrcObject)
							return !1;
						element.mozSrcObject = stream
					}
					return element
				}
			}, {}
		],
		7: [function (require, module, exports) {
				for (var methods = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","), l = methods.length, fn = function () {}, mockconsole = {}; l--; )
					mockconsole[methods[l]] = fn;
				module.exports = mockconsole
			}, {}
		],
		3: [function (require, module, exports) {
				function SocketIoConnection(config) {
					this.connection = io.connect(config.url, config.socketio)
				}
				var io = require("socket.io-client");
				SocketIoConnection.prototype.on = function (ev, fn) {
					this.connection.on(ev, fn)
				},
				SocketIoConnection.prototype.emit = function () {
					this.connection.emit.apply(this.connection, arguments)
				},
				SocketIoConnection.prototype.getSessionid = function () {
					return this.connection.socket.sessionid
				},
				SocketIoConnection.prototype.disconnect = function () {
					return this.connection.disconnect()
				},
				module.exports = SocketIoConnection
			}, {
				"socket.io-client": 8
			}
		],
		2: [function (require, module, exports) {
				function WebRTC(opts) {
					var item,
					self = this,
					options = opts || {};
					this.config = {
						debug: !1,
						peerConnectionConfig: {
							iceServers: [{
									url: "stun:stun.l.google.com:19302"
								}
							]
						},
						peerConnectionConstraints: {
							optional: [{
									DtlsSrtpKeyAgreement: !0
								}
							]
						},
						receiveMedia: {
							offerToReceiveAudio: 0,
							offerToReceiveVideo: 0
						},
						enableDataChannels: !0
					};
					this.screenSharingSupport = webrtc.screenSharing,
					this.logger = function () {
						return opts.debug ? opts.logger || console : opts.logger || mockconsole
					}
					();
					for (item in options)
						this.config[item] = options[item];
					webrtc.support || this.logger.error("Your browser doesn't seem to support WebRTC"),
					this.peers = [],
					localMedia.call(this, this.config),
					this.on("speaking", function () {
						self.hardMuted || self.peers.forEach(function (peer) {
							if (peer.enableDataChannels) {
								var dc = peer.getDataChannel("hark");
								if ("open" != dc.readyState)
									return;
								dc.send(JSON.stringify({
										type: "speaking"
									}))
							}
						})
					}),
					this.on("stoppedSpeaking", function () {
						self.hardMuted || self.peers.forEach(function (peer) {
							if (peer.enableDataChannels) {
								var dc = peer.getDataChannel("hark");
								if ("open" != dc.readyState)
									return;
								dc.send(JSON.stringify({
										type: "stoppedSpeaking"
									}))
							}
						})
					}),
					this.on("volumeChange", function (volume, treshold) {
						self.hardMuted || self.peers.forEach(function (peer) {
							if (peer.enableDataChannels) {
								var dc = peer.getDataChannel("hark");
								if ("open" != dc.readyState)
									return;
								dc.send(JSON.stringify({
										type: "volume",
										volume: volume
									}))
							}
						})
					}),
					this.config.debug && this.on("*", function (event, val1, val2) {
						var logger;
						logger = self.config.logger === mockconsole ? console : self.logger,
						logger.log("event:", event, val1, val2)
					})
				}
				var util = require("util"),
				webrtc = require("webrtcsupport"),
				mockconsole = (require("wildemitter"), require("mockconsole")),
				localMedia = require("localmedia"),
				Peer = require("./peer");
				util.inherits(WebRTC, localMedia),
				WebRTC.prototype.createPeer = function (opts) {
					var peer;
					return opts.parent = this,
					peer = new Peer(opts),
					this.peers.push(peer),
					peer
				},
				WebRTC.prototype.removePeers = function (id, type) {
					this.getPeers(id, type).forEach(function (peer) {
						peer.end()
					})
				},
				WebRTC.prototype.getPeers = function (sessionId, type) {
					return this.peers.filter(function (peer) {
						return !(sessionId && peer.id !== sessionId || type && peer.type !== type)
					})
				},
				WebRTC.prototype.sendToAll = function (message, payload) {
					this.peers.forEach(function (peer) {
						peer.send(message, payload)
					})
				},
				WebRTC.prototype.sendDirectlyToAll = function (channel, message, payload) {
					this.peers.forEach(function (peer) {
						peer.enableDataChannels && peer.sendDirectly(channel, message, payload)
					})
				},
				module.exports = WebRTC
			}, {
				"./peer": 10,
				localmedia: 11,
				mockconsole: 7,
				util: 9,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		9: [function (require, module, exports) {
				function isArray(ar) {
					return Array.isArray(ar) || "object" == typeof ar && "[object Array]" === Object.prototype.toString.call(ar)
				}
				function isRegExp(re) {
					"object" == typeof re && "[object RegExp]" === Object.prototype.toString.call(re)
				}
				function isDate(d) {
					return "object" == typeof d && "[object Date]" === Object.prototype.toString.call(d)
				}
				require("events");
				exports.isArray = isArray,
				exports.isDate = function (obj) {
					return "[object Date]" === Object.prototype.toString.call(obj)
				},
				exports.isRegExp = function (obj) {
					return "[object RegExp]" === Object.prototype.toString.call(obj)
				},
				exports.print = function () {},
				exports.puts = function () {},
				exports.debug = function () {},
				exports.inspect = function (obj, showHidden, depth, colors) {
					function format(value, recurseTimes) {
						if (value && "function" == typeof value.inspect && value !== exports && (!value.constructor || value.constructor.prototype !== value))
							return value.inspect(recurseTimes);
						switch (typeof value) {
						case "undefined":
							return stylize("undefined", "undefined");
						case "string":
							var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
							return stylize(simple, "string");
						case "number":
							return stylize("" + value, "number");
						case "boolean":
							return stylize("" + value, "boolean")
						}
						if (null === value)
							return stylize("null", "null");
						var visible_keys = Object_keys(value),
						keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;
						if ("function" == typeof value && 0 === keys.length) {
							if (isRegExp(value))
								return stylize("" + value, "regexp");
							var name = value.name ? ": " + value.name : "";
							return stylize("[Function" + name + "]", "special")
						}
						if (isDate(value) && 0 === keys.length)
							return stylize(value.toUTCString(), "date");
						var base,
						type,
						braces;
						if (isArray(value) ? (type = "Array", braces = ["[", "]"]) : (type = "Object", braces = ["{", "}"]), "function" == typeof value) {
							var n = value.name ? ": " + value.name : "";
							base = isRegExp(value) ? " " + value : " [Function" + n + "]"
						} else
							base = "";
						if (isDate(value) && (base = " " + value.toUTCString()), 0 === keys.length)
							return braces[0] + base + braces[1];
						if (0 > recurseTimes)
							return isRegExp(value) ? stylize("" + value, "regexp") : stylize("[Object]", "special");
						seen.push(value);
						var output = keys.map(function (key) {
								var name,
								str;
								if (value.__lookupGetter__ && (value.__lookupGetter__(key) ? str = value.__lookupSetter__(key) ? stylize("[Getter/Setter]", "special") : stylize("[Getter]", "special") : value.__lookupSetter__(key) && (str = stylize("[Setter]", "special"))), visible_keys.indexOf(key) < 0 && (name = "[" + key + "]"), str || (seen.indexOf(value[key]) < 0 ? (str = null === recurseTimes ? format(value[key]) : format(value[key], recurseTimes - 1), str.indexOf("\n") > -1 && (str = isArray(value) ? str.split("\n").map(function (line) {
														return "  " + line
													}).join("\n").substr(2) : "\n" + str.split("\n").map(function (line) {
														return "   " + line
													}).join("\n"))) : str = stylize("[Circular]", "special")), "undefined" == typeof name) {
									if ("Array" === type && key.match(/^\d+$/))
										return str;
									name = JSON.stringify("" + key),
									name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/) ? (name = name.substr(1, name.length - 2), name = stylize(name, "name")) : (name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'"), name = stylize(name, "string"))
								}
								return name + ": " + str
							});
						seen.pop();
						var numLinesEst = 0,
						length = output.reduce(function (prev, cur) {
								return numLinesEst++,
								cur.indexOf("\n") >= 0 && numLinesEst++,
								prev + cur.length + 1
							}, 0);
						return output = length > 50 ? braces[0] + ("" === base ? "" : base + "\n ") + " " + output.join(",\n  ") + " " + braces[1] : braces[0] + base + " " + output.join(", ") + " " + braces[1]
					}
					var seen = [],
					stylize = function (str, styleType) {
						var styles = {
							bold: [1, 22],
							italic: [3, 23],
							underline: [4, 24],
							inverse: [7, 27],
							white: [37, 39],
							grey: [90, 39],
							black: [30, 39],
							blue: [34, 39],
							cyan: [36, 39],
							green: [32, 39],
							magenta: [35, 39],
							red: [31, 39],
							yellow: [33, 39]
						},
						style = {
							special: "cyan",
							number: "blue",
							"boolean": "yellow",
							undefined: "grey",
							"null": "bold",
							string: "green",
							date: "magenta",
							regexp: "red"
						}
						[styleType];
						return style ? "[" + styles[style][0] + "m" + str + "[" + styles[style][1] + "m" : str
					};
					return colors || (stylize = function (str, styleType) {
						return str
					}),
					format(obj, "undefined" == typeof depth ? 2 : depth)
				};
				exports.log = function (msg) {},
				exports.pump = null;
				var Object_keys = Object.keys || function (obj) {
					var res = [];
					for (var key in obj)
						res.push(key);
					return res
				},
				Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
					var res = [];
					for (var key in obj)
						Object.hasOwnProperty.call(obj, key) && res.push(key);
					return res
				},
				Object_create = Object.create || function (prototype, properties) {
					var object;
					if (null === prototype)
						object = {
							__proto__: null
						};
					else {
						if ("object" != typeof prototype)
							throw new TypeError("typeof prototype[" + typeof prototype + "] != 'object'");
						var Type = function () {};
						Type.prototype = prototype,
						object = new Type,
						object.__proto__ = prototype
					}
					return "undefined" != typeof properties && Object.defineProperties && Object.defineProperties(object, properties),
					object
				};
				exports.inherits = function (ctor, superCtor) {
					ctor.super_ = superCtor,
					ctor.prototype = Object_create(superCtor.prototype, {
							constructor: {
								value: ctor,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						})
				};
				var formatRegExp = /%[sdj%]/g;
				exports.format = function (f) {
					if ("string" != typeof f) {
						for (var objects = [], i = 0; i < arguments.length; i++)
							objects.push(exports.inspect(arguments[i]));
						return objects.join(" ")
					}
					for (var i = 1, args = arguments, len = args.length, str = String(f).replace(formatRegExp, function (x) {
								if ("%%" === x)
									return "%";
								if (i >= len)
									return x;
								switch (x) {
								case "%s":
									return String(args[i++]);
								case "%d":
									return Number(args[i++]);
								case "%j":
									return JSON.stringify(args[i++]);
								default:
									return x
								}
							}), x = args[i]; len > i; x = args[++i])
						str += null === x || "object" != typeof x ? " " + x : " " + exports.inspect(x);
					return str
				}
			}, {
				events: 12
			}
		],
		8: [function (require, module, exports) {
				var io = "undefined" == typeof module ? {}
				 : module.exports;
				!function () {
					if (function (exports, global) {
						var io = exports;
						io.version = "0.9.16",
						io.protocol = 1,
						io.transports = [],
						io.j = [],
						io.sockets = {},
						io.connect = function (host, details) {
							var uuri,
							socket,
							uri = io.util.parseUri(host);
							global && global.location && (uri.protocol = uri.protocol || global.location.protocol.slice(0, -1), uri.host = uri.host || (global.document ? global.document.domain : global.location.hostname), uri.port = uri.port || global.location.port),
							uuri = io.util.uniqueUri(uri);
							var options = {
								host: uri.host,
								secure: "https" == uri.protocol,
								port: uri.port || ("https" == uri.protocol ? 443 : 80),
								query: uri.query || ""
							};
							return io.util.merge(options, details),
							(options["force new connection"] || !io.sockets[uuri]) && (socket = new io.Socket(options)),
							!options["force new connection"] && socket && (io.sockets[uuri] = socket),
							socket = socket || io.sockets[uuri],
							socket.of(uri.path.length > 1 ? uri.path : "")
						}
					}
						("object" == typeof module ? module.exports : this.io = {}, this), function (exports, global) {
						var util = exports.util = {},
						re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
						parts = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
						util.parseUri = function (str) {
							for (var m = re.exec(str || ""), uri = {}, i = 14; i--; )
								uri[parts[i]] = m[i] || "";
							return uri
						},
						util.uniqueUri = function (uri) {
							var protocol = uri.protocol,
							host = uri.host,
							port = uri.port;
							return "document" in global ? (host = host || document.domain, port = port || ("https" == protocol && "https:" !== document.location.protocol ? 443 : document.location.port)) : (host = host || "localhost", port || "https" != protocol || (port = 443)),
							(protocol || "http") + "://" + host + ":" + (port || 80)
						},
						util.query = function (base, addition) {
							var query = util.chunkQuery(base || ""),
							components = [];
							util.merge(query, util.chunkQuery(addition || ""));
							for (var part in query)
								query.hasOwnProperty(part)
									 && components.push(part + "=" + query[part]);
								return components.length ? "?" + components.join("&") : ""
							},
							util.chunkQuery = function (qs) {
								for (var kv, query = {}, params = qs.split("&"), i = 0, l = params.length; l > i; ++i)
									kv = params[i].split("="), kv[0] && (query[kv[0]] = kv[1]);
								return query
							};
							var pageLoaded = !1;
							util.load = function (fn) {
								return "document" in global && "complete" === document.readyState || pageLoaded ? fn() : void util.on(global, "load", fn, !1)
							},
							util.on = function (element, event, fn, capture) {
								element.attachEvent ? element.attachEvent("on" + event, fn) : element.addEventListener && element.addEventListener(event, fn, capture)
							},
							util.request = function (xdomain) {
								if (xdomain && "undefined" != typeof XDomainRequest && !util.ua.hasCORS)
									return new XDomainRequest;
								if ("undefined" != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS))
									return new XMLHttpRequest;
								if (!xdomain)
									try {
										return new(window[["Active"].concat("Object").join("X")])("Microsoft.XMLHTTP")
									} catch (e) {}
								return null
							},
							"undefined" != typeof window && util.load(function () {
								pageLoaded = !0
							}),
							util.defer = function (fn) {
								return util.ua.webkit && "undefined" == typeof importScripts ? void util.load(function () {
									setTimeout(fn, 100)
								}) : fn()
							},
							util.merge = function (target, additional, deep, lastseen) {
								var prop,
								seen = lastseen || [],
								depth = "undefined" == typeof deep ? 2 : deep;
								for (prop in additional)
									additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0 && ("object" == typeof target[prop] && depth ? util.merge(target[prop], additional[prop], depth - 1, seen) : (target[prop] = additional[prop], seen.push(additional[prop])));
								return target
							},
							util.mixin = function (ctor, ctor2) {
								util.merge(ctor.prototype, ctor2.prototype)
							},
							util.inherit = function (ctor, ctor2) {
								function f() {}
								f.prototype = ctor2.prototype,
								ctor.prototype = new f
							},
							util.isArray = Array.isArray || function (obj) {
								return "[object Array]" === Object.prototype.toString.call(obj)
							},
							util.intersect = function (arr, arr2) {
								for (var ret = [], longest = arr.length > arr2.length ? arr : arr2, shortest = arr.length > arr2.length ? arr2 : arr, i = 0, l = shortest.length; l > i; i++)
									~util.indexOf(longest, shortest[i]) && ret.push(shortest[i]);
								return ret
							},
							util.indexOf = function (arr, o, i) {
								for (var j = arr.length, i = 0 > i ? 0 > i + j ? 0 : i + j : i || 0; j > i && arr[i] !== o; i++);
								return i >= j ? -1 : i
							},
							util.toArray = function (enu) {
								for (var arr = [], i = 0, l = enu.length; l > i; i++)
									arr.push(enu[i]);
								return arr
							},
							util.ua = {},
							util.ua.hasCORS = "undefined" != typeof XMLHttpRequest && function () {
								try {
									var a = new XMLHttpRequest
								} catch (e) {
									return !1
								}
								return void 0 != a.withCredentials
							}
							(),
							util.ua.webkit = "undefined" != typeof navigator && /webkit/i.test(navigator.userAgent),
							util.ua.iDevice = "undefined" != typeof navigator && /iPad|iPhone|iPod/i.test(navigator.userAgent)
						}
							("undefined" != typeof io ? io : module.exports, this), function (exports, io) {
							function EventEmitter() {}
							exports.EventEmitter = EventEmitter,
							EventEmitter.prototype.on = function (name, fn) {
								return this.$events || (this.$events = {}),
								this.$events[name] ? io.util.isArray(this.$events[name]) ? this.$events[name].push(fn) : this.$events[name] = [this.$events[name], fn] : this.$events[name] = fn,
								this
							},
							EventEmitter.prototype.addListener = EventEmitter.prototype.on,
							EventEmitter.prototype.once = function (name, fn) {
								function on() {
									self.removeListener(name, on),
									fn.apply(this, arguments)
								}
								var self = this;
								return on.listener = fn,
								this.on(name, on),
								this
							},
							EventEmitter.prototype.removeListener = function (name, fn) {
								if (this.$events && this.$events[name]) {
									var list = this.$events[name];
									if (io.util.isArray(list)) {
										for (var pos = -1, i = 0, l = list.length; l > i; i++)
											if (list[i] === fn || list[i].listener && list[i].listener === fn) {
												pos = i;
												break
											}
										if (0 > pos)
											return this;
										list.splice(pos, 1),
										list.length || delete this.$events[name]
									} else (list === fn || list.listener && list.listener === fn) && delete this.$events[name]
								}
								return this
							},
							EventEmitter.prototype.removeAllListeners = function (name) {
								return void 0 === name ? (this.$events = {}, this) : (this.$events && this.$events[name] && (this.$events[name] = null), this)
							},
							EventEmitter.prototype.listeners = function (name) {
								return this.$events || (this.$events = {}),
								this.$events[name] || (this.$events[name] = []),
								io.util.isArray(this.$events[name]) || (this.$events[name] = [this.$events[name]]),
								this.$events[name]
							},
							EventEmitter.prototype.emit = function (name) {
								if (!this.$events)
									return !1;
								var handler = this.$events[name];
								if (!handler)
									return !1;
								var args = Array.prototype.slice.call(arguments, 1);
								if ("function" == typeof handler)
									handler.apply(this, args);
								else {
									if (!io.util.isArray(handler))
										return !1;
									for (var listeners = handler.slice(), i = 0, l = listeners.length; l > i; i++)
										listeners[i].apply(this, args)
								}
								return !0
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), function (exports, nativeJSON) {
							"use strict";
							function f(n) {
								return 10 > n ? "0" + n : n
							}
							function date(d, key) {
								return isFinite(d.valueOf()) ? d.getUTCFullYear() + "-" + f(d.getUTCMonth() + 1) + "-" + f(d.getUTCDate()) + "T" + f(d.getUTCHours()) + ":" + f(d.getUTCMinutes()) + ":" + f(d.getUTCSeconds()) + "Z" : null
							}
							function quote(string) {
								return escapable.lastIndex = 0,
								escapable.test(string) ? '"' + string.replace(escapable, function (a) {
									var c = meta[a];
									return "string" == typeof c ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
								}) + '"' : '"' + string + '"'
							}
							function str(key, holder) {
								var i,
								k,
								v,
								length,
								partial,
								mind = gap,
								value = holder[key];
								switch (value instanceof Date && (value = date(key)), "function" == typeof rep && (value = rep.call(holder, key, value)), typeof value) {
								case "string":
									return quote(value);
								case "number":
									return isFinite(value) ? String(value) : "null";
								case "boolean":
								case "null":
									return String(value);
								case "object":
									if (!value)
										return "null";
									if (gap += indent, partial = [], "[object Array]" === Object.prototype.toString.apply(value)) {
										for (length = value.length, i = 0; length > i; i += 1)
											partial[i] = str(i, value) || "null";
										return v = 0 === partial.length ? "[]" : gap ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" : "[" + partial.join(",") + "]",
										gap = mind,
										v
									}
									if (rep && "object" == typeof rep)
										for (length = rep.length, i = 0; length > i; i += 1)
											"string" == typeof rep[i] && (k = rep[i], v = str(k, value), v && partial.push(quote(k) + (gap ? ": " : ":") + v));
									else
										for (k in value)
											Object.prototype.hasOwnProperty.call(value, k) && (v = str(k, value), v && partial.push(quote(k) + (gap ? ": " : ":") + v));
									return v = 0 === partial.length ? "{}" : gap ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" : "{" + partial.join(",") + "}",
									gap = mind,
									v
								}
							}
							if (nativeJSON && nativeJSON.parse)
								return exports.JSON = {
									parse: nativeJSON.parse,
									stringify: nativeJSON.stringify
								};
							var JSON = exports.JSON = {},
							cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
							escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
							gap,
							indent,
							meta = {
								"\b": "\\b",
								"	": "\\t",
								"\n": "\\n",
								"\f": "\\f",
								"\r": "\\r",
								'"': '\\"',
								"\\": "\\\\"
							},
							rep;
							JSON.stringify = function (value, replacer, space) {
								var i;
								if (gap = "", indent = "", "number" == typeof space)
									for (i = 0; space > i; i += 1)
										indent += " ";
								else
									"string" == typeof space && (indent = space);
								if (rep = replacer, replacer && "function" != typeof replacer && ("object" != typeof replacer || "number" != typeof replacer.length))
									throw new Error("JSON.stringify");
								return str("", {
									"": value
								})
							},
							JSON.parse = function (text, reviver) {
								function walk(holder, key) {
									var k,
									v,
									value = holder[key];
									if (value && "object" == typeof value)
										for (k in value)
											Object.prototype.hasOwnProperty.call(value, k) && (v = walk(value, k), void 0 !== v ? value[k] = v : delete value[k]);
									return reviver.call(holder, key, value)
								}
								var j;
								if (text = String(text), cx.lastIndex = 0, cx.test(text) && (text = text.replace(cx, function (a) {
												return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
											})), /^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, "")))
									return j = eval("(" + text + ")"), "function" == typeof reviver ? walk({
										"": j
									}, "") : j;
								throw new SyntaxError("JSON.parse")
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof JSON ? JSON : void 0), function (exports, io) {
							var parser = exports.parser = {},
							packets = parser.packets = ["disconnect", "connect", "heartbeat", "message", "json", "event", "ack", "error", "noop"],
							reasons = parser.reasons = ["transport not supported", "client not handshaken", "unauthorized"],
							advice = parser.advice = ["reconnect"],
							JSON = io.JSON,
							indexOf = io.util.indexOf;
							parser.encodePacket = function (packet) {
								var type = indexOf(packets, packet.type),
								id = packet.id || "",
								endpoint = packet.endpoint || "",
								ack = packet.ack,
								data = null;
								switch (packet.type) {
								case "error":
									var reason = packet.reason ? indexOf(reasons, packet.reason) : "",
									adv = packet.advice ? indexOf(advice, packet.advice) : "";
									("" !== reason || "" !== adv) && (data = reason + ("" !== adv ? "+" + adv : ""));
									break;
								case "message":
									"" !== packet.data && (data = packet.data);
									break;
								case "event":
									var ev = {
										name: packet.name
									};
									packet.args && packet.args.length && (ev.args = packet.args),
									data = JSON.stringify(ev);
									break;
								case "json":
									data = JSON.stringify(packet.data);
									break;
								case "connect":
									packet.qs && (data = packet.qs);
									break;
								case "ack":
									data = packet.ackId + (packet.args && packet.args.length ? "+" + JSON.stringify(packet.args) : "")
								}
								var encoded = [type, id + ("data" == ack ? "+" : ""), endpoint];
								return null !== data && void 0 !== data && encoded.push(data),
								encoded.join(":")
							},
							parser.encodePayload = function (packets) {
								var decoded = "";
								if (1 == packets.length)
									return packets[0];
								for (var i = 0, l = packets.length; l > i; i++) {
									var packet = packets[i];
									decoded += "�" + packet.length + "�" + packets[i]
								}
								return decoded
							};
							var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;
							parser.decodePacket = function (data) {
								var pieces = data.match(regexp);
								if (!pieces)
									return {};
								var id = pieces[2] || "",
								data = pieces[5] || "",
								packet = {
									type: packets[pieces[1]],
									endpoint: pieces[4] || ""
								};
								switch (id && (packet.id = id, pieces[3] ? packet.ack = "data" : packet.ack = !0), packet.type) {
								case "error":
									var pieces = data.split("+");
									packet.reason = reasons[pieces[0]] || "",
									packet.advice = advice[pieces[1]] || "";
									break;
								case "message":
									packet.data = data || "";
									break;
								case "event":
									try {
										var opts = JSON.parse(data);
										packet.name = opts.name,
										packet.args = opts.args
									} catch (e) {}
									packet.args = packet.args || [];
									break;
								case "json":
									try {
										packet.data = JSON.parse(data)
									} catch (e) {}
									break;
								case "connect":
									packet.qs = data || "";
									break;
								case "ack":
									var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
									if (pieces && (packet.ackId = pieces[1], packet.args = [], pieces[3]))
										try {
											packet.args = pieces[3] ? JSON.parse(pieces[3]) : []
										} catch (e) {}
									break;
								case "disconnect":
								case "heartbeat":
								}
								return packet
							},
							parser.decodePayload = function (data) {
								if ("�" == data.charAt(0)) {
									for (var ret = [], i = 1, length = ""; i < data.length; i++)
										"�" == data.charAt(i) ? (ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length))), i += Number(length) + 1, length = "") : length += data.charAt(i);
									return ret
								}
								return [parser.decodePacket(data)]
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), function (exports, io) {
							function Transport(socket, sessid) {
								this.socket = socket,
								this.sessid = sessid
							}
							exports.Transport = Transport,
							io.util.mixin(Transport, io.EventEmitter),
							Transport.prototype.heartbeats = function () {
								return !0
							},
							Transport.prototype.onData = function (data) {
								if (this.clearCloseTimeout(), (this.socket.connected || this.socket.connecting || this.socket.reconnecting) && this.setCloseTimeout(), "" !== data) {
									var msgs = io.parser.decodePayload(data);
									if (msgs && msgs.length)
										for (var i = 0, l = msgs.length; l > i; i++)
											this.onPacket(msgs[i])
								}
								return this
							},
							Transport.prototype.onPacket = function (packet) {
								return this.socket.setHeartbeatTimeout(),
								"heartbeat" == packet.type ? this.onHeartbeat() : ("connect" == packet.type && "" == packet.endpoint && this.onConnect(), "error" == packet.type && "reconnect" == packet.advice && (this.isOpen = !1), this.socket.onPacket(packet), this)
							},
							Transport.prototype.setCloseTimeout = function () {
								if (!this.closeTimeout) {
									var self = this;
									this.closeTimeout = setTimeout(function () {
											self.onDisconnect()
										}, this.socket.closeTimeout)
								}
							},
							Transport.prototype.onDisconnect = function () {
								return this.isOpen && this.close(),
								this.clearTimeouts(),
								this.socket.onDisconnect(),
								this
							},
							Transport.prototype.onConnect = function () {
								return this.socket.onConnect(),
								this
							},
							Transport.prototype.clearCloseTimeout = function () {
								this.closeTimeout && (clearTimeout(this.closeTimeout), this.closeTimeout = null)
							},
							Transport.prototype.clearTimeouts = function () {
								this.clearCloseTimeout(),
								this.reopenTimeout && clearTimeout(this.reopenTimeout)
							},
							Transport.prototype.packet = function (packet) {
								this.send(io.parser.encodePacket(packet))
							},
							Transport.prototype.onHeartbeat = function (heartbeat) {
								this.packet({
									type: "heartbeat"
								})
							},
							Transport.prototype.onOpen = function () {
								this.isOpen = !0,
								this.clearCloseTimeout(),
								this.socket.onOpen()
							},
							Transport.prototype.onClose = function () {
								this.isOpen = !1,
								this.socket.onClose(),
								this.onDisconnect()
							},
							Transport.prototype.prepareUrl = function () {
								var options = this.socket.options;
								return this.scheme() + "://" + options.host + ":" + options.port + "/" + options.resource + "/" + io.protocol + "/" + this.name + "/" + this.sessid
							},
							Transport.prototype.ready = function (socket, fn) {
								fn.call(this)
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), function (exports, io, global) {
							function Socket(options) {
								if (this.options = {
										port: 80,
										secure: !1,
										document: "document" in global ? document : !1,
										resource: "socket.io",
										transports: io.transports,
										"connect timeout": 1e4,
										"try multiple transports": !0,
										reconnect: !0,
										"reconnection delay": 500,
										"reconnection limit": 1 / 0,
										"reopen delay": 3e3,
										"max reconnection attempts": 10,
										"sync disconnect on unload": !1,
										"auto connect": !0,
										"flash policy port": 10843,
										manualFlush: !1
									}, io.util.merge(this.options, options), this.connected = !1, this.open = !1, this.connecting = !1, this.reconnecting = !1, this.namespaces = {}, this.buffer = [], this.doBuffer = !1, this.options["sync disconnect on unload"] && (!this.isXDomain() || io.util.ua.hasCORS)) {
									var self = this;
									io.util.on(global, "beforeunload", function () {
										self.disconnectSync()
									}, !1)
								}
								this.options["auto connect"] && this.connect()
							}
							function empty() {}
							exports.Socket = Socket,
							io.util.mixin(Socket, io.EventEmitter),
							Socket.prototype.of = function (name) {
								return this.namespaces[name] || (this.namespaces[name] = new io.SocketNamespace(this, name), "" !== name && this.namespaces[name].packet({
										type: "connect"
									})),
								this.namespaces[name]
							},
							Socket.prototype.publish = function () {
								this.emit.apply(this, arguments);
								var nsp;
								for (var i in this.namespaces)
									this.namespaces.hasOwnProperty(i) && (nsp = this.of(i), nsp.$emit.apply(nsp, arguments))
							},
							Socket.prototype.handshake = function (fn) {
								function complete(data) {
									data instanceof Error ? (self.connecting = !1, self.onError(data.message)) : fn.apply(null, data.split(":"))
								}
								var self = this,
								options = this.options,
								url = ["http" + (options.secure ? "s" : "") + ":/", options.host + ":" + options.port, options.resource, io.protocol, io.util.query(this.options.query, "t=" + +new Date)].join("/");
								if (this.isXDomain() && !io.util.ua.hasCORS) {
									var insertAt = document.getElementsByTagName("script")[0],
									script = document.createElement("script");
									script.src = url + "&jsonp=" + io.j.length,
									insertAt.parentNode.insertBefore(script, insertAt),
									io.j.push(function (data) {
										complete(data),
										script.parentNode.removeChild(script)
									})
								} else {
									var xhr = io.util.request();
									xhr.open("GET", url, !0),
									this.isXDomain() && (xhr.withCredentials = !0),
									xhr.onreadystatechange = function () {
										4 == xhr.readyState && (xhr.onreadystatechange = empty, 200 == xhr.status ? complete(xhr.responseText) : 403 == xhr.status ? self.onError(xhr.responseText) : (self.connecting = !1, !self.reconnecting && self.onError(xhr.responseText)))
									},
									xhr.send(null)
								}
							},
							Socket.prototype.getTransport = function (override) {
								for (var transport, transports = override || this.transports, i = 0; transport = transports[i]; i++)
									if (io.Transport[transport] && io.Transport[transport].check(this) && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this)))
										return new io.Transport[transport](this, this.sessionid);
								return null
							},
							Socket.prototype.connect = function (fn) {
								if (this.connecting)
									return this;
								var self = this;
								return self.connecting = !0,
								this.handshake(function (sid, heartbeat, close, transports) {
									function connect(transports) {
										return self.transport && self.transport.clearTimeouts(),
										self.transport = self.getTransport(transports),
										self.transport ? void self.transport.ready(self, function () {
											self.connecting = !0,
											self.publish("connecting", self.transport.name),
											self.transport.open(),
											self.options["connect timeout"] && (self.connectTimeoutTimer = setTimeout(function () {
														if (!self.connected && (self.connecting = !1, self.options["try multiple transports"])) {
															for (var remaining = self.transports; remaining.length > 0 && remaining.splice(0, 1)[0] != self.transport.name; );
															remaining.length ? connect(remaining) : self.publish("connect_failed")
														}
													}, self.options["connect timeout"]))
										}) : self.publish("connect_failed")
									}
									self.sessionid = sid,
									self.closeTimeout = 1e3 * close,
									self.heartbeatTimeout = 1e3 * heartbeat,
									self.transports || (self.transports = self.origTransports = transports ? io.util.intersect(transports.split(","), self.options.transports) : self.options.transports),
									self.setHeartbeatTimeout(),
									connect(self.transports),
									self.once("connect", function () {
										clearTimeout(self.connectTimeoutTimer),
										fn && "function" == typeof fn && fn()
									})
								}),
								this
							},
							Socket.prototype.setHeartbeatTimeout = function () {
								if (clearTimeout(this.heartbeatTimeoutTimer), !this.transport || this.transport.heartbeats()) {
									var self = this;
									this.heartbeatTimeoutTimer = setTimeout(function () {
											self.transport.onClose()
										}, this.heartbeatTimeout)
								}
							},
							Socket.prototype.packet = function (data) {
								return this.connected && !this.doBuffer ? this.transport.packet(data) : this.buffer.push(data),
								this
							},
							Socket.prototype.setBuffer = function (v) {
								this.doBuffer = v,
								!v && this.connected && this.buffer.length && (this.options.manualFlush || this.flushBuffer())
							},
							Socket.prototype.flushBuffer = function () {
								this.transport.payload(this.buffer),
								this.buffer = []
							},
							Socket.prototype.disconnect = function () {
								return (this.connected || this.connecting) && (this.open && this.of("").packet({
										type: "disconnect"
									}), this.onDisconnect("booted")),
								this
							},
							Socket.prototype.disconnectSync = function () {
								var xhr = io.util.request(),
								uri = ["http" + (this.options.secure ? "s" : "") + ":/", this.options.host + ":" + this.options.port, this.options.resource, io.protocol, "", this.sessionid].join("/") + "/?disconnect=1";
								xhr.open("GET", uri, !1),
								xhr.send(null),
								this.onDisconnect("booted")
							},
							Socket.prototype.isXDomain = function () {
								var port = global.location.port || ("https:" == global.location.protocol ? 443 : 80);
								return this.options.host !== global.location.hostname || this.options.port != port
							},
							Socket.prototype.onConnect = function () {
								this.connected || (this.connected = !0, this.connecting = !1, this.doBuffer || this.setBuffer(!1), this.emit("connect"))
							},
							Socket.prototype.onOpen = function () {
								this.open = !0
							},
							Socket.prototype.onClose = function () {
								this.open = !1,
								clearTimeout(this.heartbeatTimeoutTimer)
							},
							Socket.prototype.onPacket = function (packet) {
								this.of(packet.endpoint).onPacket(packet)
							},
							Socket.prototype.onError = function (err) {
								err && err.advice && "reconnect" === err.advice && (this.connected || this.connecting) && (this.disconnect(), this.options.reconnect && this.reconnect()),
								this.publish("error", err && err.reason ? err.reason : err)
							},
							Socket.prototype.onDisconnect = function (reason) {
								var wasConnected = this.connected,
								wasConnecting = this.connecting;
								this.connected = !1,
								this.connecting = !1,
								this.open = !1,
								(wasConnected || wasConnecting) && (this.transport.close(), this.transport.clearTimeouts(), wasConnected && (this.publish("disconnect", reason), "booted" != reason && this.options.reconnect && !this.reconnecting && this.reconnect()))
							},
							Socket.prototype.reconnect = function () {
								function reset() {
									if (self.connected) {
										for (var i in self.namespaces)
											self.namespaces.hasOwnProperty(i) && "" !== i && self.namespaces[i].packet({
												type: "connect"
											});
										self.publish("reconnect", self.transport.name, self.reconnectionAttempts)
									}
									clearTimeout(self.reconnectionTimer),
									self.removeListener("connect_failed", maybeReconnect),
									self.removeListener("connect", maybeReconnect),
									self.reconnecting = !1,
									delete self.reconnectionAttempts,
									delete self.reconnectionDelay,
									delete self.reconnectionTimer,
									delete self.redoTransports,
									self.options["try multiple transports"] = tryMultiple
								}
								function maybeReconnect() {
									return self.reconnecting ? self.connected ? reset() : self.connecting && self.reconnecting ? self.reconnectionTimer = setTimeout(maybeReconnect, 1e3) : void(self.reconnectionAttempts++ >= maxAttempts ? self.redoTransports ? (self.publish("reconnect_failed"), reset()) : (self.on("connect_failed", maybeReconnect), self.options["try multiple transports"] = !0, self.transports = self.origTransports, self.transport = self.getTransport(), self.redoTransports = !0, self.connect()) : (self.reconnectionDelay < limit && (self.reconnectionDelay *= 2), self.connect(), self.publish("reconnecting", self.reconnectionDelay, self.reconnectionAttempts), self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay))) : void 0
								}
								this.reconnecting = !0,
								this.reconnectionAttempts = 0,
								this.reconnectionDelay = this.options["reconnection delay"];
								var self = this,
								maxAttempts = this.options["max reconnection attempts"],
								tryMultiple = this.options["try multiple transports"],
								limit = this.options["reconnection limit"];
								this.options["try multiple transports"] = !1,
								this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay),
								this.on("connect", maybeReconnect)
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), function (exports, io) {
							function SocketNamespace(socket, name) {
								this.socket = socket,
								this.name = name || "",
								this.flags = {},
								this.json = new Flag(this, "json"),
								this.ackPackets = 0,
								this.acks = {}
							}
							function Flag(nsp, name) {
								this.namespace = nsp,
								this.name = name
							}
							exports.SocketNamespace = SocketNamespace,
							io.util.mixin(SocketNamespace, io.EventEmitter),
							SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit,
							SocketNamespace.prototype.of = function () {
								return this.socket.of.apply(this.socket, arguments)
							},
							SocketNamespace.prototype.packet = function (packet) {
								return packet.endpoint = this.name,
								this.socket.packet(packet),
								this.flags = {},
								this
							},
							SocketNamespace.prototype.send = function (data, fn) {
								var packet = {
									type: this.flags.json ? "json" : "message",
									data: data
								};
								return "function" == typeof fn && (packet.id = ++this.ackPackets, packet.ack = !0, this.acks[packet.id] = fn),
								this.packet(packet)
							},
							SocketNamespace.prototype.emit = function (name) {
								var args = Array.prototype.slice.call(arguments, 1),
								lastArg = args[args.length - 1],
								packet = {
									type: "event",
									name: name
								};
								return "function" == typeof lastArg && (packet.id = ++this.ackPackets, packet.ack = "data", this.acks[packet.id] = lastArg, args = args.slice(0, args.length - 1)),
								packet.args = args,
								this.packet(packet)
							},
							SocketNamespace.prototype.disconnect = function () {
								return "" === this.name ? this.socket.disconnect() : (this.packet({
										type: "disconnect"
									}), this.$emit("disconnect")),
								this
							},
							SocketNamespace.prototype.onPacket = function (packet) {
								function ack() {
									self.packet({
										type: "ack",
										args: io.util.toArray(arguments),
										ackId: packet.id
									})
								}
								var self = this;
								switch (packet.type) {
								case "connect":
									this.$emit("connect");
									break;
								case "disconnect":
									"" === this.name ? this.socket.onDisconnect(packet.reason || "booted") : this.$emit("disconnect", packet.reason);
									break;
								case "message":
								case "json":
									var params = ["message", packet.data];
									"data" == packet.ack ? params.push(ack) : packet.ack && this.packet({
										type: "ack",
										ackId: packet.id
									}),
									this.$emit.apply(this, params);
									break;
								case "event":
									var params = [packet.name].concat(packet.args);
									"data" == packet.ack && params.push(ack),
									this.$emit.apply(this, params);
									break;
								case "ack":
									this.acks[packet.ackId] && (this.acks[packet.ackId].apply(this, packet.args), delete this.acks[packet.ackId]);
									break;
								case "error":
									packet.advice ? this.socket.onError(packet) : "unauthorized" == packet.reason ? this.$emit("connect_failed", packet.reason) : this.$emit("error", packet.reason)
								}
							},
							Flag.prototype.send = function () {
								this.namespace.flags[this.name] = !0,
								this.namespace.send.apply(this.namespace, arguments)
							},
							Flag.prototype.emit = function () {
								this.namespace.flags[this.name] = !0,
								this.namespace.emit.apply(this.namespace, arguments)
							}
						}
							("undefined" != typeof io ? io : module.exports, "undefined" != typeof io ? io : module.parent.exports), function (exports, io, global) {
							function WS(socket) {
								io.Transport.apply(this, arguments)
							}
							exports.websocket = WS,
							io.util.inherit(WS, io.Transport),
							WS.prototype.name = "websocket",
							WS.prototype.open = function () {
								var Socket,
								query = io.util.query(this.socket.options.query),
								self = this;
								return Socket || (Socket = global.MozWebSocket || global.WebSocket),
								this.websocket = new Socket(this.prepareUrl() + query),
								this.websocket.onopen = function () {
									self.onOpen(),
									self.socket.setBuffer(!1)
								},
								this.websocket.onmessage = function (ev) {
									self.onData(ev.data)
								},
								this.websocket.onclose = function () {
									self.onClose(),
									self.socket.setBuffer(!0)
								},
								this.websocket.onerror = function (e) {
									self.onError(e)
								},
								this
							},
							io.util.ua.iDevice ? WS.prototype.send = function (data) {
								var self = this;
								return setTimeout(function () {
									self.websocket.send(data)
								}, 0),
								this
							}
							 : WS.prototype.send = function (data) {
								return this.websocket.send(data),
								this
							},
							WS.prototype.payload = function (arr) {
								for (var i = 0, l = arr.length; l > i; i++)
									this.packet(arr[i]);
								return this
							},
							WS.prototype.close = function () {
								return this.websocket.close(),
								this
							},
							WS.prototype.onError = function (e) {
								this.socket.onError(e)
							},
							WS.prototype.scheme = function () {
								return this.socket.options.secure ? "wss" : "ws"
							},
							WS.check = function () {
								return "WebSocket" in global && !("__addTask" in WebSocket) || "MozWebSocket" in global
							},
							WS.xdomainCheck = function () {
								return !0
							},
							io.transports.push("websocket")
						}
							("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this), function (exports, io) {
							function Flashsocket() {
								io.Transport.websocket.apply(this, arguments)
							}
							exports.flashsocket = Flashsocket,
							io.util.inherit(Flashsocket, io.Transport.websocket),
							Flashsocket.prototype.name = "flashsocket",
							Flashsocket.prototype.open = function () {
								var self = this,
								args = arguments;
								return WebSocket.__addTask(function () {
									io.Transport.websocket.prototype.open.apply(self, args)
								}),
								this
							},
							Flashsocket.prototype.send = function () {
								var self = this,
								args = arguments;
								return WebSocket.__addTask(function () {
									io.Transport.websocket.prototype.send.apply(self, args)
								}),
								this
							},
							Flashsocket.prototype.close = function () {
								return WebSocket.__tasks.length = 0,
								io.Transport.websocket.prototype.close.call(this),
								this
							},
							Flashsocket.prototype.ready = function (socket, fn) {
								function init() {
									var options = socket.options,
									port = options["flash policy port"],
									path = ["http" + (options.secure ? "s" : "") + ":/", options.host + ":" + options.port, options.resource, "static/flashsocket", "WebSocketMain" + (socket.isXDomain() ? "Insecure" : "") + ".swf"];
									Flashsocket.loaded || ("undefined" == typeof WEB_SOCKET_SWF_LOCATION && (WEB_SOCKET_SWF_LOCATION = path.join("/")), 843 !== port && WebSocket.loadFlashPolicyFile("xmlsocket://" + options.host + ":" + port), WebSocket.__initialize(), Flashsocket.loaded = !0),
									fn.call(self)
								}
								var self = this;
								return document.body ? init() : void io.util.load(init)
							},
							Flashsocket.check = function () {
								return "undefined" != typeof WebSocket && "__initialize" in WebSocket && swfobject ? swfobject.getFlashPlayerVersion().major >= 10 : !1
							},
							Flashsocket.xdomainCheck = function () {
								return !0
							},
							"undefined" != typeof window && (WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = !0),
							io.transports.push("flashsocket")
						}
							("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports), "undefined" != typeof window)var swfobject = function () {
							function f() {
								if (!J) {
									try {
										var Z = j.getElementsByTagName("body")[0].appendChild(C("span"));
										Z.parentNode.removeChild(Z)
									} catch (aa) {
										return
									}
									J = !0;
									for (var X = U.length, Y = 0; X > Y; Y++)
										U[Y]()
								}
							}
							function K(X) {
								J ? X() : U[U.length] = X
							}
							function s(Y) {
								if (typeof O.addEventListener != D)
									O.addEventListener("load", Y, !1);
								else if (typeof j.addEventListener != D)
									j.addEventListener("load", Y, !1);
								else if (typeof O.attachEvent != D)
									i(O, "onload", Y);
								else if ("function" == typeof O.onload) {
									var X = O.onload;
									O.onload = function () {
										X(),
										Y()
									}
								} else
									O.onload = Y
							}
							function h() {
								T ? V() : H()
							}
							function V() {
								var X = j.getElementsByTagName("body")[0],
								aa = C(r);
								aa.setAttribute("type", q);
								var Z = X.appendChild(aa);
								if (Z) {
									var Y = 0;
									!function () {
										if (typeof Z.GetVariable != D) {
											var ab = Z.GetVariable("$version");
											ab && (ab = ab.split(" ")[1].split(","), M.pv = [parseInt(ab[0], 10), parseInt(ab[1], 10), parseInt(ab[2], 10)])
										} else if (10 > Y)
											return Y++, void setTimeout(arguments.callee, 10);
										X.removeChild(aa),
										Z = null,
										H()
									}
									()
								} else
									H()
							}
							function H() {
								var ag = o.length;
								if (ag > 0)
									for (var af = 0; ag > af; af++) {
										var Y = o[af].id,
										ab = o[af].callbackFn,
										aa = {
											success: !1,
											id: Y
										};
										if (M.pv[0] > 0) {
											var ae = c(Y);
											if (ae)
												if (!F(o[af].swfVersion) || M.wk && M.wk < 312)
													if (o[af].expressInstall && A()) {
														var ai = {};
														ai.data = o[af].expressInstall,
														ai.width = ae.getAttribute("width") || "0",
														ai.height = ae.getAttribute("height") || "0",
														ae.getAttribute("class") && (ai.styleclass = ae.getAttribute("class")),
														ae.getAttribute("align") && (ai.align = ae.getAttribute("align"));
														for (var ah = {}, X = ae.getElementsByTagName("param"), ac = X.length, ad = 0; ac > ad; ad++)
															"movie" != X[ad].getAttribute("name").toLowerCase() && (ah[X[ad].getAttribute("name")] = X[ad].getAttribute("value"));
														P(ai, ah, Y, ab)
													} else
														p(ae), ab && ab(aa);
												else
													w(Y, !0), ab && (aa.success = !0, aa.ref = z(Y), ab(aa))
										} else if (w(Y, !0), ab) {
											var Z = z(Y);
											Z && typeof Z.SetVariable != D && (aa.success = !0, aa.ref = Z),
											ab(aa)
										}
									}
							}
							function z(aa) {
								var X = null,
								Y = c(aa);
								if (Y && "OBJECT" == Y.nodeName)
									if (typeof Y.SetVariable != D)
										X = Y;
									else {
										var Z = Y.getElementsByTagName(r)[0];
										Z && (X = Z)
									}
								return X
							}
							function A() {
								return !a && F("6.0.65") && (M.win || M.mac) && !(M.wk && M.wk < 312)
							}
							function P(aa, ab, X, Z) {
								a = !0,
								E = Z || null,
								B = {
									success: !1,
									id: X
								};
								var ae = c(X);
								if (ae) {
									"OBJECT" == ae.nodeName ? (l = g(ae), Q = null) : (l = ae, Q = X),
									aa.id = R,
									(typeof aa.width == D || !/%$/.test(aa.width) && parseInt(aa.width, 10) < 310) && (aa.width = "310"),
									(typeof aa.height == D || !/%$/.test(aa.height) && parseInt(aa.height, 10) < 137) && (aa.height = "137"),
									j.title = j.title.slice(0, 47) + " - Flash Player Installation";
									var ad = M.ie && M.win ? ["Active"].concat("").join("X") : "PlugIn",
									ac = "MMredirectURL=" + O.location.toString().replace(/&/g, "%26") + "&MMplayerType=" + ad + "&MMdoctitle=" + j.title;
									if (typeof ab.flashvars != D ? ab.flashvars += "&" + ac : ab.flashvars = ac, M.ie && M.win && 4 != ae.readyState) {
										var Y = C("div");
										X += "SWFObjectNew",
										Y.setAttribute("id", X),
										ae.parentNode.insertBefore(Y, ae),
										ae.style.display = "none",
										function () {
											4 == ae.readyState ? ae.parentNode.removeChild(ae) : setTimeout(arguments.callee, 10)
										}
										()
									}
									u(aa, ab, X)
								}
							}
							function p(Y) {
								if (M.ie && M.win && 4 != Y.readyState) {
									var X = C("div");
									Y.parentNode.insertBefore(X, Y),
									X.parentNode.replaceChild(g(Y), X),
									Y.style.display = "none",
									function () {
										4 == Y.readyState ? Y.parentNode.removeChild(Y) : setTimeout(arguments.callee, 10)
									}
									()
								} else
									Y.parentNode.replaceChild(g(Y), Y)
							}
							function g(ab) {
								var aa = C("div");
								if (M.win && M.ie)
									aa.innerHTML = ab.innerHTML;
								else {
									var Y = ab.getElementsByTagName(r)[0];
									if (Y) {
										var ad = Y.childNodes;
										if (ad)
											for (var X = ad.length, Z = 0; X > Z; Z++)
												1 == ad[Z].nodeType && "PARAM" == ad[Z].nodeName || 8 == ad[Z].nodeType || aa.appendChild(ad[Z].cloneNode(!0))
									}
								}
								return aa
							}
							function u(ai, ag, Y) {
								var X,
								aa = c(Y);
								if (M.wk && M.wk < 312)
									return X;
								if (aa)
									if (typeof ai.id == D && (ai.id = Y), M.ie && M.win) {
										var ah = "";
										for (var ae in ai)
											ai[ae] != Object.prototype[ae] && ("data" == ae.toLowerCase() ? ag.movie = ai[ae] : "styleclass" == ae.toLowerCase() ? ah += ' class="' + ai[ae] + '"' : "classid" != ae.toLowerCase() && (ah += " " + ae + '="' + ai[ae] + '"'));
										var af = "";
										for (var ad in ag)
											ag[ad] != Object.prototype[ad] && (af += '<param name="' + ad + '" value="' + ag[ad] + '" />');
										aa.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + ah + ">" + af + "</object>",
										N[N.length] = ai.id,
										X = c(ai.id)
									} else {
										var Z = C(r);
										Z.setAttribute("type", q);
										for (var ac in ai)
											ai[ac] != Object.prototype[ac] && ("styleclass" == ac.toLowerCase() ? Z.setAttribute("class", ai[ac]) : "classid" != ac.toLowerCase() && Z.setAttribute(ac, ai[ac]));
										for (var ab in ag)
											ag[ab] != Object.prototype[ab] && "movie" != ab.toLowerCase() && e(Z, ab, ag[ab]);
										aa.parentNode.replaceChild(Z, aa),
										X = Z
									}
								return X
							}
							function e(Z, X, Y) {
								var aa = C("param");
								aa.setAttribute("name", X),
								aa.setAttribute("value", Y),
								Z.appendChild(aa)
							}
							function y(Y) {
								var X = c(Y);
								X && "OBJECT" == X.nodeName && (M.ie && M.win ? (X.style.display = "none", function () {
										4 == X.readyState ? b(Y) : setTimeout(arguments.callee, 10)
									}
										()) : X.parentNode.removeChild(X))
							}
							function b(Z) {
								var Y = c(Z);
								if (Y) {
									for (var X in Y)
										"function" == typeof Y[X] && (Y[X] = null);
									Y.parentNode.removeChild(Y)
								}
							}
							function c(Z) {
								var X = null;
								try {
									X = j.getElementById(Z)
								} catch (Y) {}
								return X
							}
							function C(X) {
								return j.createElement(X)
							}
							function i(Z, X, Y) {
								Z.attachEvent(X, Y),
								I[I.length] = [Z, X, Y]
							}
							function F(Z) {
								var Y = M.pv,
								X = Z.split(".");
								return X[0] = parseInt(X[0], 10),
								X[1] = parseInt(X[1], 10) || 0,
								X[2] = parseInt(X[2], 10) || 0,
								Y[0] > X[0] || Y[0] == X[0] && Y[1] > X[1] || Y[0] == X[0] && Y[1] == X[1] && Y[2] >= X[2] ? !0 : !1
							}
							function v(ac, Y, ad, ab) {
								if (!M.ie || !M.mac) {
									var aa = j.getElementsByTagName("head")[0];
									if (aa) {
										var X = ad && "string" == typeof ad ? ad : "screen";
										if (ab && (n = null, G = null), !n || G != X) {
											var Z = C("style");
											Z.setAttribute("type", "text/css"),
											Z.setAttribute("media", X),
											n = aa.appendChild(Z),
											M.ie && M.win && typeof j.styleSheets != D && j.styleSheets.length > 0 && (n = j.styleSheets[j.styleSheets.length - 1]),
											G = X
										}
										M.ie && M.win ? n && typeof n.addRule == r && n.addRule(ac, Y) : n && typeof j.createTextNode != D && n.appendChild(j.createTextNode(ac + " {" + Y + "}"))
									}
								}
							}
							function w(Z, X) {
								if (m) {
									var Y = X ? "visible" : "hidden";
									J && c(Z) ? c(Z).style.visibility = Y : v("#" + Z, "visibility:" + Y)
								}
							}
							function L(Y) {
								var Z = /[\\\"<>\.;]/,
								X = null != Z.exec(Y);
								return X && typeof encodeURIComponent != D ? encodeURIComponent(Y) : Y
							}
							var l,
							Q,
							E,
							B,
							n,
							G,
							D = "undefined",
							r = "object",
							S = "Shockwave Flash",
							W = "ShockwaveFlash.ShockwaveFlash",
							q = "application/x-shockwave-flash",
							R = "SWFObjectExprInst",
							x = "onreadystatechange",
							O = window,
							j = document,
							t = navigator,
							T = !1,
							U = [h],
							o = [],
							N = [],
							I = [],
							J = !1,
							a = !1,
							m = !0,
							M = function () {
								var aa = typeof j.getElementById != D && typeof j.getElementsByTagName != D && typeof j.createElement != D,
								ah = t.userAgent.toLowerCase(),
								Y = t.platform.toLowerCase(),
								ae = Y ? /win/.test(Y) : /win/.test(ah),
								ac = Y ? /mac/.test(Y) : /mac/.test(ah),
								af = /webkit/.test(ah) ? parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : !1,
								X = !1,
								ag = [0, 0, 0],
								ab = null;
								if (typeof t.plugins != D && typeof t.plugins[S] == r)
									ab = t.plugins[S].description, !ab || typeof t.mimeTypes != D && t.mimeTypes[q] && !t.mimeTypes[q].enabledPlugin || (T = !0, X = !1, ab = ab.replace(/^.*\s+(\S+\s+\S+$)/, "$1"), ag[0] = parseInt(ab.replace(/^(.*)\..*$/, "$1"), 10), ag[1] = parseInt(ab.replace(/^.*\.(.*)\s.*$/, "$1"), 10), ag[2] = /[a-zA-Z]/.test(ab) ? parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/, "$1"), 10) : 0);
								else if (typeof O[["Active"].concat("Object").join("X")] != D)
									try {
										var ad = new(window[["Active"].concat("Object").join("X")])(W);
										ad && (ab = ad.GetVariable("$version"), ab && (X = !0, ab = ab.split(" ")[1].split(","), ag = [parseInt(ab[0], 10), parseInt(ab[1], 10), parseInt(ab[2], 10)]))
									} catch (Z) {}
								return {
									w3: aa,
									pv: ag,
									wk: af,
									ie: X,
									win: ae,
									mac: ac
								}
							}
							();
							(function () {
								M.w3 && ((typeof j.readyState != D && "complete" == j.readyState || typeof j.readyState == D && (j.getElementsByTagName("body")[0] || j.body)) && f(), J || (typeof j.addEventListener != D && j.addEventListener("DOMContentLoaded", f, !1), M.ie && M.win && (j.attachEvent(x, function () {
												"complete" == j.readyState && (j.detachEvent(x, arguments.callee), f())
											}), O == top && !function () {
											if (!J) {
												try {
													j.documentElement.doScroll("left")
												} catch (X) {
													return void setTimeout(arguments.callee, 0)
												}
												f()
											}
										}
											()), M.wk && !function () {
										return J ? void 0 : /loaded|complete/.test(j.readyState) ? void f() : void setTimeout(arguments.callee, 0)
									}
										(), s(f)))
							})(),
							function () {
								M.ie && M.win && window.attachEvent("onunload", function () {
									for (var ac = I.length, ab = 0; ac > ab; ab++)
										I[ab][0].detachEvent(I[ab][1], I[ab][2]);
									for (var Z = N.length, aa = 0; Z > aa; aa++)
										y(N[aa]);
									for (var Y in M)
										M[Y] = null;
									M = null;
									for (var X in swfobject)
										swfobject[X] = null;
									swfobject = null
								})
							}
							();
							return {
								registerObject: function (ab, X, aa, Z) {
									if (M.w3 && ab && X) {
										var Y = {};
										Y.id = ab,
										Y.swfVersion = X,
										Y.expressInstall = aa,
										Y.callbackFn = Z,
										o[o.length] = Y,
										w(ab, !1)
									} else
										Z && Z({
											success: !1,
											id: ab
										})
								},
								getObjectById: function (X) {
									return M.w3 ? z(X) : void 0
								},
								embedSWF: function (ab, ah, ae, ag, Y, aa, Z, ad, af, ac) {
									var X = {
										success: !1,
										id: ah
									};
									M.w3 && !(M.wk && M.wk < 312) && ab && ah && ae && ag && Y ? (w(ah, !1), K(function () {
											ae += "",
											ag += "";
											var aj = {};
											if (af && typeof af === r)
												for (var al in af)
													aj[al] = af[al];
											aj.data = ab,
											aj.width = ae,
											aj.height = ag;
											var am = {};
											if (ad && typeof ad === r)
												for (var ak in ad)
													am[ak] = ad[ak];
											if (Z && typeof Z === r)
												for (var ai in Z)
													typeof am.flashvars != D ? am.flashvars += "&" + ai + "=" + Z[ai] : am.flashvars = ai + "=" + Z[ai];
											if (F(Y)) {
												var an = u(aj, am, ah);
												aj.id == ah && w(ah, !0),
												X.success = !0,
												X.ref = an
											} else {
												if (aa && A())
													return aj.data = aa, void P(aj, am, ah, ac);
												w(ah, !0)
											}
											ac && ac(X)
										})) : ac && ac(X)
								},
								switchOffAutoHideShow: function () {
									m = !1
								},
								ua: M,
								getFlashPlayerVersion: function () {
									return {
										major: M.pv[0],
										minor: M.pv[1],
										release: M.pv[2]
									}
								},
								hasFlashPlayerVersion: F,
								createSWF: function (Z, Y, X) {
									return M.w3 ? u(Z, Y, X) : void 0
								},
								showExpressInstall: function (Z, aa, X, Y) {
									M.w3 && A() && P(Z, aa, X, Y)
								},
								removeSWF: function (X) {
									M.w3 && y(X)
								},
								createCSS: function (aa, Z, Y, X) {
									M.w3 && v(aa, Z, Y, X)
								},
								addDomLoadEvent: K,
								addLoadEvent: s,
								getQueryParamValue: function (aa) {
									var Z = j.location.search || j.location.hash;
									if (Z) {
										if (/\?/.test(Z) && (Z = Z.split("?")[1]), null == aa)
											return L(Z);
										for (var Y = Z.split("&"), X = 0; X < Y.length; X++)
											if (Y[X].substring(0, Y[X].indexOf("=")) == aa)
												return L(Y[X].substring(Y[X].indexOf("=") + 1))
									}
									return ""
								},
								expressInstallCallback: function () {
									if (a) {
										var X = c(R);
										X && l && (X.parentNode.replaceChild(l, X), Q && (w(Q, !0), M.ie && M.win && (l.style.display = "block")), E && E(B)),
										a = !1
									}
								}
							}
						}
					();
					!function () {
						if ("undefined" != typeof window && !window.WebSocket) {
							var console = window.console;
							if (console && console.log && console.error || (console = {
										log: function () {},
										error: function () {}
									}), !swfobject.hasFlashPlayerVersion("10.0.0"))
								return void console.error("Flash Player >= 10.0.0 is required.");
							"file:" == location.protocol && console.error("WARNING: web-socket-js doesn't work in file:///... URL unless you set Flash Security Settings properly. Open the page via Web server i.e. http://..."),
							WebSocket = function (url, protocols, proxyHost, proxyPort, headers) {
								var self = this;
								self.__id = WebSocket.__nextId++,
								WebSocket.__instances[self.__id] = self,
								self.readyState = WebSocket.CONNECTING,
								self.bufferedAmount = 0,
								self.__events = {},
								protocols ? "string" == typeof protocols && (protocols = [protocols]) : protocols = [],
								setTimeout(function () {
									WebSocket.__addTask(function () {
										WebSocket.__flash.create(self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null)
									})
								}, 0)
							},
							WebSocket.prototype.send = function (data) {
								if (this.readyState == WebSocket.CONNECTING)
									throw "INVALID_STATE_ERR: Web Socket connection has not been established";
								var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
								return 0 > result ? !0 : (this.bufferedAmount += result, !1)
							},
							WebSocket.prototype.close = function () {
								this.readyState != WebSocket.CLOSED && this.readyState != WebSocket.CLOSING && (this.readyState = WebSocket.CLOSING, WebSocket.__flash.close(this.__id))
							},
							WebSocket.prototype.addEventListener = function (type, listener, useCapture) {
								type in this.__events || (this.__events[type] = []),
								this.__events[type].push(listener)
							},
							WebSocket.prototype.removeEventListener = function (type, listener, useCapture) {
								if (type in this.__events)
									for (var events = this.__events[type], i = events.length - 1; i >= 0; --i)
										if (events[i] === listener) {
											events.splice(i, 1);
											break
										}
							},
							WebSocket.prototype.dispatchEvent = function (event) {
								for (var events = this.__events[event.type] || [], i = 0; i < events.length; ++i)
									events[i](event);
								var handler = this["on" + event.type];
								handler && handler(event)
							},
							WebSocket.prototype.__handleEvent = function (flashEvent) {
								"readyState" in flashEvent && (this.readyState = flashEvent.readyState),
								"protocol" in flashEvent && (this.protocol = flashEvent.protocol);
								var jsEvent;
								if ("open" == flashEvent.type || "error" == flashEvent.type)
									jsEvent = this.__createSimpleEvent(flashEvent.type);
								else if ("close" == flashEvent.type)
									jsEvent = this.__createSimpleEvent("close");
								else {
									if ("message" != flashEvent.type)
										throw "unknown event type: " + flashEvent.type;
									var data = decodeURIComponent(flashEvent.message);
									jsEvent = this.__createMessageEvent("message", data)
								}
								this.dispatchEvent(jsEvent)
							},
							WebSocket.prototype.__createSimpleEvent = function (type) {
								if (document.createEvent && window.Event) {
									var event = document.createEvent("Event");
									return event.initEvent(type, !1, !1),
									event
								}
								return {
									type: type,
									bubbles: !1,
									cancelable: !1
								}
							},
							WebSocket.prototype.__createMessageEvent = function (type, data) {
								if (document.createEvent && window.MessageEvent && !window.opera) {
									var event = document.createEvent("MessageEvent");
									return event.initMessageEvent("message", !1, !1, data, null, null, window, null),
									event
								}
								return {
									type: type,
									data: data,
									bubbles: !1,
									cancelable: !1
								}
							},
							WebSocket.CONNECTING = 0,
							WebSocket.OPEN = 1,
							WebSocket.CLOSING = 2,
							WebSocket.CLOSED = 3,
							WebSocket.__flash = null,
							WebSocket.__instances = {},
							WebSocket.__tasks = [],
							WebSocket.__nextId = 0,
							WebSocket.loadFlashPolicyFile = function (url) {
								WebSocket.__addTask(function () {
									WebSocket.__flash.loadManualPolicyFile(url)
								})
							},
							WebSocket.__initialize = function () {
								if (!WebSocket.__flash) {
									if (WebSocket.__swfLocation && (window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation), !window.WEB_SOCKET_SWF_LOCATION)
										return void console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
									var container = document.createElement("div");
									container.id = "webSocketContainer",
									container.style.position = "absolute",
									WebSocket.__isFlashLite() ? (container.style.left = "0px", container.style.top = "0px") : (container.style.left = "-100px", container.style.top = "-100px");
									var holder = document.createElement("div");
									holder.id = "webSocketFlash",
									container.appendChild(holder),
									document.body.appendChild(container),
									swfobject.embedSWF(WEB_SOCKET_SWF_LOCATION, "webSocketFlash", "1", "1", "10.0.0", null, null, {
										hasPriority: !0,
										swliveconnect: !0,
										allowScriptAccess: "always"
									}, null, function (e) {
										e.success || console.error("[WebSocket] swfobject.embedSWF failed")
									})
								}
							},
							WebSocket.__onFlashInitialized = function () {
								setTimeout(function () {
									WebSocket.__flash = document.getElementById("webSocketFlash"),
									WebSocket.__flash.setCallerUrl(location.href),
									WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
									for (var i = 0; i < WebSocket.__tasks.length; ++i)
										WebSocket.__tasks[i]();
									WebSocket.__tasks = []
								}, 0)
							},
							WebSocket.__onFlashEvent = function () {
								return setTimeout(function () {
									try {
										for (var events = WebSocket.__flash.receiveEvents(), i = 0; i < events.length; ++i)
											WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i])
									} catch (e) {
										console.error(e)
									}
								}, 0),
								!0
							},
							WebSocket.__log = function (message) {
								console.log(decodeURIComponent(message))
							},
							WebSocket.__error = function (message) {
								console.error(decodeURIComponent(message))
							},
							WebSocket.__addTask = function (task) {
								WebSocket.__flash ? task() : WebSocket.__tasks.push(task)
							},
							WebSocket.__isFlashLite = function () {
								if (!window.navigator || !window.navigator.mimeTypes)
									return !1;
								var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
								return mimeType && mimeType.enabledPlugin && mimeType.enabledPlugin.filename && mimeType.enabledPlugin.filename.match(/flashlite/i) ? !0 : !1
							},
							window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION || (window.addEventListener ? window.addEventListener("load", function () {
									WebSocket.__initialize()
								}, !1) : window.attachEvent("onload", function () {
									WebSocket.__initialize()
								}))
						}
					}
					(),
					function (exports, io, global) {
						function XHR(socket) {
							socket && (io.Transport.apply(this, arguments), this.sendBuffer = [])
						}
						function empty() {}
						exports.XHR = XHR,
						io.util.inherit(XHR, io.Transport),
						XHR.prototype.open = function () {
							return this.socket.setBuffer(!1),
							this.onOpen(),
							this.get(),
							this.setCloseTimeout(),
							this
						},
						XHR.prototype.payload = function (payload) {
							for (var msgs = [], i = 0, l = payload.length; l > i; i++)
								msgs.push(io.parser.encodePacket(payload[i]));
							this.send(io.parser.encodePayload(msgs))
						},
						XHR.prototype.send = function (data) {
							return this.post(data),
							this
						},
						XHR.prototype.post = function (data) {
							function stateChange() {
								4 == this.readyState && (this.onreadystatechange = empty, self.posting = !1, 200 == this.status ? self.socket.setBuffer(!1) : self.onClose())
							}
							function onload() {
								this.onload = empty,
								self.socket.setBuffer(!1)
							}
							var self = this;
							this.socket.setBuffer(!0),
							this.sendXHR = this.request("POST"),
							global.XDomainRequest && this.sendXHR instanceof XDomainRequest ? this.sendXHR.onload = this.sendXHR.onerror = onload : this.sendXHR.onreadystatechange = stateChange,
							this.sendXHR.send(data)
						},
						XHR.prototype.close = function () {
							return this.onClose(),
							this
						},
						XHR.prototype.request = function (method) {
							var req = io.util.request(this.socket.isXDomain()),
							query = io.util.query(this.socket.options.query, "t=" + +new Date);
							if (req.open(method || "GET", this.prepareUrl() + query, !0), "POST" == method)
								try {
									req.setRequestHeader ? req.setRequestHeader("Content-type", "text/plain;charset=UTF-8") : req.contentType = "text/plain"
								} catch (e) {}
							return req
						},
						XHR.prototype.scheme = function () {
							return this.socket.options.secure ? "https" : "http"
						},
						XHR.check = function (socket, xdomain) {
							try {
								var request = io.util.request(xdomain),
								usesXDomReq = global.XDomainRequest && request instanceof XDomainRequest,
								socketProtocol = socket && socket.options && socket.options.secure ? "https:" : "http:",
								isXProtocol = global.location && socketProtocol != global.location.protocol;
								if (request && (!usesXDomReq || !isXProtocol))
									return !0
							} catch (e) {}
							return !1
						},
						XHR.xdomainCheck = function (socket) {
							return XHR.check(socket, !0)
						}
					}
					("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this),
					function (exports, io) {
						function HTMLFile(socket) {
							io.Transport.XHR.apply(this, arguments)
						}
						exports.htmlfile = HTMLFile,
						io.util.inherit(HTMLFile, io.Transport.XHR),
						HTMLFile.prototype.name = "htmlfile",
						HTMLFile.prototype.get = function () {
							this.doc = new(window[["Active"].concat("Object").join("X")])("htmlfile"),
							this.doc.open(),
							this.doc.write("<html></html>"),
							this.doc.close(),
							this.doc.parentWindow.s = this;
							var iframeC = this.doc.createElement("div");
							iframeC.className = "socketio",
							this.doc.body.appendChild(iframeC),
							this.iframe = this.doc.createElement("iframe"),
							iframeC.appendChild(this.iframe);
							var self = this,
							query = io.util.query(this.socket.options.query, "t=" + +new Date);
							this.iframe.src = this.prepareUrl() + query,
							io.util.on(window, "unload", function () {
								self.destroy()
							})
						},
						HTMLFile.prototype._ = function (data, doc) {
							data = data.replace(/\\\//g, "/"),
							this.onData(data);
							try {
								var script = doc.getElementsByTagName("script")[0];
								script.parentNode.removeChild(script)
							} catch (e) {}
						},
						HTMLFile.prototype.destroy = function () {
							if (this.iframe) {
								try {
									this.iframe.src = "about:blank"
								} catch (e) {}
								this.doc = null,
								this.iframe.parentNode.removeChild(this.iframe),
								this.iframe = null,
								CollectGarbage()
							}
						},
						HTMLFile.prototype.close = function () {
							return this.destroy(),
							io.Transport.XHR.prototype.close.call(this)
						},
						HTMLFile.check = function (socket) {
							if ("undefined" != typeof window && ["Active"].concat("Object").join("X")in window)
								try {
									var a = new(window[["Active"].concat("Object").join("X")])("htmlfile");
									return a && io.Transport.XHR.check(socket)
								} catch (e) {}
							return !1
						},
						HTMLFile.xdomainCheck = function () {
							return !1
						},
						io.transports.push("htmlfile")
					}
					("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports),
					function (exports, io, global) {
						function XHRPolling() {
							io.Transport.XHR.apply(this, arguments)
						}
						function empty() {}
						exports["xhr-polling"] = XHRPolling,
						io.util.inherit(XHRPolling, io.Transport.XHR),
						io.util.merge(XHRPolling, io.Transport.XHR),
						XHRPolling.prototype.name = "xhr-polling",
						XHRPolling.prototype.heartbeats = function () {
							return !1
						},
						XHRPolling.prototype.open = function () {
							var self = this;
							return io.Transport.XHR.prototype.open.call(self),
							!1
						},
						XHRPolling.prototype.get = function () {
							function stateChange() {
								4 == this.readyState && (this.onreadystatechange = empty, 200 == this.status ? (self.onData(this.responseText), self.get()) : self.onClose())
							}
							function onload() {
								this.onload = empty,
								this.onerror = empty,
								self.retryCounter = 1,
								self.onData(this.responseText),
								self.get()
							}
							function onerror() {
								self.retryCounter++,
								!self.retryCounter || self.retryCounter > 3 ? self.onClose() : self.get()
							}
							if (this.isOpen) {
								var self = this;
								this.xhr = this.request(),
								global.XDomainRequest && this.xhr instanceof XDomainRequest ? (this.xhr.onload = onload, this.xhr.onerror = onerror) : this.xhr.onreadystatechange = stateChange,
								this.xhr.send(null)
							}
						},
						XHRPolling.prototype.onClose = function () {
							if (io.Transport.XHR.prototype.onClose.call(this), this.xhr) {
								this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
								try {
									this.xhr.abort()
								} catch (e) {}
								this.xhr = null
							}
						},
						XHRPolling.prototype.ready = function (socket, fn) {
							var self = this;
							io.util.defer(function () {
								fn.call(self)
							})
						},
						io.transports.push("xhr-polling")
					}
					("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this),
					function (exports, io, global) {
						function JSONPPolling(socket) {
							io.Transport["xhr-polling"].apply(this, arguments),
							this.index = io.j.length;
							var self = this;
							io.j.push(function (msg) {
								self._(msg)
							})
						}
						var indicator = global.document && "MozAppearance" in global.document.documentElement.style;
						exports["jsonp-polling"] = JSONPPolling,
						io.util.inherit(JSONPPolling, io.Transport["xhr-polling"]),
						JSONPPolling.prototype.name = "jsonp-polling",
						JSONPPolling.prototype.post = function (data) {
							function complete() {
								initIframe(),
								self.socket.setBuffer(!1)
							}
							function initIframe() {
								self.iframe && self.form.removeChild(self.iframe);
								try {
									iframe = document.createElement('<iframe name="' + self.iframeId + '">')
								} catch (e) {
									iframe = document.createElement("iframe"),
									iframe.name = self.iframeId
								}
								iframe.id = self.iframeId,
								self.form.appendChild(iframe),
								self.iframe = iframe
							}
							var self = this,
							query = io.util.query(this.socket.options.query, "t=" + +new Date + "&i=" + this.index);
							if (!this.form) {
								var iframe,
								form = document.createElement("form"),
								area = document.createElement("textarea"),
								id = this.iframeId = "socketio_iframe_" + this.index;
								form.className = "socketio",
								form.style.position = "absolute",
								form.style.top = "0px",
								form.style.left = "0px",
								form.style.display = "none",
								form.target = id,
								form.method = "POST",
								form.setAttribute("accept-charset", "utf-8"),
								area.name = "d",
								form.appendChild(area),
								document.body.appendChild(form),
								this.form = form,
								this.area = area
							}
							this.form.action = this.prepareUrl() + query,
							initIframe(),
							this.area.value = io.JSON.stringify(data);
							try {
								this.form.submit()
							} catch (e) {}
							this.iframe.attachEvent ? iframe.onreadystatechange = function () {
								"complete" == self.iframe.readyState && complete()
							}
							 : this.iframe.onload = complete,
							this.socket.setBuffer(!0)
						},
						JSONPPolling.prototype.get = function () {
							var self = this,
							script = document.createElement("script"),
							query = io.util.query(this.socket.options.query, "t=" + +new Date + "&i=" + this.index);
							this.script && (this.script.parentNode.removeChild(this.script), this.script = null),
							script.async = !0,
							script.src = this.prepareUrl() + query,
							script.onerror = function () {
								self.onClose()
							};
							var insertAt = document.getElementsByTagName("script")[0];
							insertAt.parentNode.insertBefore(script, insertAt),
							this.script = script,
							indicator && setTimeout(function () {
								var iframe = document.createElement("iframe");
								document.body.appendChild(iframe),
								document.body.removeChild(iframe)
							}, 100)
						},
						JSONPPolling.prototype._ = function (msg) {
							return this.onData(msg),
							this.isOpen && this.get(),
							this
						},
						JSONPPolling.prototype.ready = function (socket, fn) {
							var self = this;
							return indicator ? void io.util.load(function () {
								fn.call(self)
							}) : fn.call(this)
						},
						JSONPPolling.check = function () {
							return "document" in global
						},
						JSONPPolling.xdomainCheck = function () {
							return !0
						},
						io.transports.push("jsonp-polling")
					}
					("undefined" != typeof io ? io.Transport : module.exports, "undefined" != typeof io ? io : module.parent.exports, this),
					"function" == typeof define && define.amd && define([], function () {
						return io
					})
				}
				()
			}, {}
		],
		13: [function (require, module, exports) {
				var process = module.exports = {};
				process.nextTick = function () {
					var canSetImmediate = "undefined" != typeof window && window.setImmediate,
					canPost = "undefined" != typeof window && window.postMessage && window.addEventListener;
					if (canSetImmediate)
						return function (f) {
							return window.setImmediate(f)
						};
					if (canPost) {
						var queue = [];
						return window.addEventListener("message", function (ev) {
							var source = ev.source;
							if ((source === window || null === source) && "process-tick" === ev.data && (ev.stopPropagation(), queue.length > 0)) {
								var fn = queue.shift();
								fn()
							}
						}, !0),
						function (fn) {
							queue.push(fn),
							window.postMessage("process-tick", "*")
						}
					}
					return function (fn) {
						setTimeout(fn, 0)
					}
				}
				(),
				process.title = "browser",
				process.browser = !0,
				process.env = {},
				process.argv = [],
				process.binding = function (name) {
					throw new Error("process.binding is not supported")
				},
				process.cwd = function () {
					return "/"
				},
				process.chdir = function (dir) {
					throw new Error("process.chdir is not supported")
				}
			}, {}
		],
		12: [function (require, module, exports) {
				function indexOf(xs, x) {
					if (xs.indexOf)
						return xs.indexOf(x);
					for (var i = 0; i < xs.length; i++)
						if (x === xs[i])
							return i;
					return -1
				}
				var process = require("__browserify_process");
				process.EventEmitter || (process.EventEmitter = function () {});
				var EventEmitter = exports.EventEmitter = process.EventEmitter,
				isArray = "function" == typeof Array.isArray ? Array.isArray : function (xs) {
					return "[object Array]" === Object.prototype.toString.call(xs)
				},
				defaultMaxListeners = 10;
				EventEmitter.prototype.setMaxListeners = function (n) {
					this._events || (this._events = {}),
					this._events.maxListeners = n
				},
				EventEmitter.prototype.emit = function (type) {
					if ("error" === type && (!this._events || !this._events.error || isArray(this._events.error) && !this._events.error.length))
						throw arguments[1]instanceof Error ? arguments[1] : new Error("Uncaught, unspecified 'error' event.");
					if (!this._events)
						return !1;
					var handler = this._events[type];
					if (!handler)
						return !1;
					if ("function" == typeof handler) {
						switch (arguments.length) {
						case 1:
							handler.call(this);
							break;
						case 2:
							handler.call(this, arguments[1]);
							break;
						case 3:
							handler.call(this, arguments[1], arguments[2]);
							break;
						default:
							var args = Array.prototype.slice.call(arguments, 1);
							handler.apply(this, args)
						}
						return !0
					}
					if (isArray(handler)) {
						for (var args = Array.prototype.slice.call(arguments, 1), listeners = handler.slice(), i = 0, l = listeners.length; l > i; i++)
							listeners[i].apply(this, args);
						return !0
					}
					return !1
				},
				EventEmitter.prototype.addListener = function (type, listener) {
					if ("function" != typeof listener)
						throw new Error("addListener only takes instances of Function");
					if (this._events || (this._events = {}), this.emit("newListener", type, listener), this._events[type])
						if (isArray(this._events[type])) {
							if (!this._events[type].warned) {
								var m;
								m = void 0 !== this._events.maxListeners ? this._events.maxListeners : defaultMaxListeners,
								m && m > 0 && this._events[type].length > m && (this._events[type].warned = !0, console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[type].length), console.trace())
							}
							this._events[type].push(listener)
						} else
							this._events[type] = [this._events[type], listener];
					else
						this._events[type] = listener;
					return this
				},
				EventEmitter.prototype.on = EventEmitter.prototype.addListener,
				EventEmitter.prototype.once = function (type, listener) {
					var self = this;
					return self.on(type, function g() {
						self.removeListener(type, g),
						listener.apply(this, arguments)
					}),
					this
				},
				EventEmitter.prototype.removeListener = function (type, listener) {
					if ("function" != typeof listener)
						throw new Error("removeListener only takes instances of Function");
					if (!this._events || !this._events[type])
						return this;
					var list = this._events[type];
					if (isArray(list)) {
						var i = indexOf(list, listener);
						if (0 > i)
							return this;
						list.splice(i, 1),
						0 == list.length && delete this._events[type]
					} else
						this._events[type] === listener && delete this._events[type];
					return this
				},
				EventEmitter.prototype.removeAllListeners = function (type) {
					return 0 === arguments.length ? (this._events = {}, this) : (type && this._events && this._events[type] && (this._events[type] = null), this)
				},
				EventEmitter.prototype.listeners = function (type) {
					return this._events || (this._events = {}),
					this._events[type] || (this._events[type] = []),
					isArray(this._events[type]) || (this._events[type] = [this._events[type]]),
					this._events[type]
				},
				EventEmitter.listenerCount = function (emitter, type) {
					var ret;
					return ret = emitter._events && emitter._events[type] ? "function" == typeof emitter._events[type] ? 1 : emitter._events[type].length : 0
				}
			}, {
				__browserify_process: 13
			}
		],
		10: [function (require, module, exports) {
				function Peer(options) {
					var self = this;
					this.id = options.id,
					this.parent = options.parent,
					this.type = options.type || "video",
					this.oneway = options.oneway || !1,
					this.sharemyscreen = options.sharemyscreen || !1,
					this.browserPrefix = options.prefix,
					this.stream = options.stream,
					this.enableDataChannels = void 0 === options.enableDataChannels ? this.parent.config.enableDataChannels : options.enableDataChannels,
					this.receiveMedia = options.receiveMedia || this.parent.config.receiveMedia,
					this.channels = {},
					this.sid = options.sid || Date.now().toString(),
					this.pc = new PeerConnection(this.parent.config.peerConnectionConfig, this.parent.config.peerConnectionConstraints),
					this.pc.on("ice", this.onIceCandidate.bind(this)),
					this.pc.on("offer", function (offer) {
						self.send("offer", offer)
					}),
					this.pc.on("answer", function (offer) {
						self.send("answer", offer)
					}),
					this.pc.on("addStream", this.handleRemoteStreamAdded.bind(this)),
					this.pc.on("addChannel", this.handleDataChannelAdded.bind(this)),
					this.pc.on("removeStream", this.handleStreamRemoved.bind(this)),
					this.pc.on("negotiationNeeded", this.emit.bind(this, "negotiationNeeded")),
					this.pc.on("iceConnectionStateChange", this.emit.bind(this, "iceConnectionStateChange")),
					this.pc.on("iceConnectionStateChange", function () {
						switch (self.pc.iceConnectionState) {
						case "failed":
							"offer" === self.pc.pc.peerconnection.localDescription.type && (self.parent.emit("iceFailed", self), self.send("connectivityError"))
						}
					}),
					this.pc.on("signalingStateChange", this.emit.bind(this, "signalingStateChange")),
					this.logger = this.parent.logger,
					this.fmp4Receiver = new FileTransfer.Receiver,
					this.fmp4Sender = new FileTransfer.Sender,
					"screen" === options.type ? this.parent.localScreen && this.sharemyscreen && (this.logger.log("adding local screen stream to peer connection"), this.pc.addStream(this.parent.localScreen), this.broadcaster = options.broadcaster) : this.parent.localStreams.forEach(function (stream) {
						self.pc.addStream(stream)
					}),
					WildEmitter.call(this),
					this.on("channelOpen", function (channel) {
						channel.protocol === INBAND_FILETRANSFER_V1 ? channel.onmessage = function (event) {
							var metadata = JSON.parse(event.data),
							receiver = new FileTransfer.Receiver;
							receiver.receive(metadata, channel),
							self.emit("fileTransfer", metadata, receiver),
							receiver.on("receivedFile", function (file, metadata) {
								receiver.channel.close()
							})
						}
						 : channel.protocol === INBAND_FMP4TRANSFER && (channel.onmessage = function (event) {
							var metadata = JSON.parse(event.data);
							self.fmp4Receiver.receiveFragment(metadata, channel),
							self.emit("fmp4Transfer", metadata),
							self.fmp4Receiver.on("receivedFile", function (file, metadata) {
								self.emit("fmp4Received", metadata, file)
							})
						})
					}),
					this.on("*", function () {
						self.parent.emit.apply(self.parent, arguments)
					})
				}
				var util = require("util"),
				webrtc = require("webrtcsupport"),
				PeerConnection = require("rtcpeerconnection"),
				WildEmitter = require("wildemitter"),
				FileTransfer = require("filetransfer"),
				INBAND_FILETRANSFER_V1 = "https://simplewebrtc.com/protocol/filetransfer#inband-v1",
				INBAND_FMP4TRANSFER = "SimilarTo_INBAND_FILETRANSFER_V1_ButWouldNotCloseChannel";
				util.inherits(Peer, WildEmitter),
				Peer.prototype.handleMessage = function (message) {
					var self = this;
					this.logger.log("getting", message.type, message),
					message.prefix && (this.browserPrefix = message.prefix),
					"offer" === message.type ? (message.payload.sdp = message.payload.sdp.replace("a=fmtp:0 profile-level-id=0x42e00c;packetization-mode=1\r\n", ""), this.pc.handleOffer(message.payload, function (err) {
							err || self.pc.answer(self.receiveMedia, function (err, sessionDescription) {})
						})) : "answer" === message.type ? this.pc.handleAnswer(message.payload) : "candidate" === message.type ? this.pc.processIce(message.payload) : "connectivityError" === message.type ? this.parent.emit("connectivityError", self) : "mute" === message.type ? this.parent.emit("mute", {
						id: message.from,
						name: message.payload.name
					}) : "unmute" === message.type && this.parent.emit("unmute", {
						id: message.from,
						name: message.payload.name
					})
				},
				Peer.prototype.send = function (messageType, payload) {
					var message = {
						to: this.id,
						sid: this.sid,
						broadcaster: this.broadcaster,
						roomType: this.type,
						type: messageType,
						payload: payload,
						prefix: webrtc.prefix
					};
					this.logger.log("sending", messageType, message),
					this.parent.emit("message", message)
				},
				Peer.prototype.sendDirectly = function (channel, messageType, payload) {
					var message = {
						type: messageType,
						payload: payload
					};
					this.logger.log("sending via datachannel", channel, messageType, message);
					var dc = this.getDataChannel(channel);
					return "open" !== dc.readyState ? !1 : (dc.send(JSON.stringify(message)), !0)
				},
				Peer.prototype._observeDataChannel = function (channel) {
					var self = this;
					channel.onclose = this.emit.bind(this, "channelClose", channel),
					channel.onerror = this.emit.bind(this, "channelError", channel),
					channel.onmessage = function (event) {
						var data;
						data = "String" === Object.prototype.toString.call(event.data).slice(8, -1) ? JSON.parse(event.data) : event.data,
						self.emit("channelMessage", self, channel.label, data, channel, event)
					},
					channel.onopen = this.emit.bind(this, "channelOpen", channel)
				},
				Peer.prototype.getDataChannel = function (name, opts) {
					if (!webrtc.supportDataChannel)
						return this.emit("error", new Error("createDataChannel not supported"));
					var channel = this.channels[name];
					return opts || (opts = {}),
					channel ? channel : (channel = this.channels[name] = this.pc.createDataChannel(name, opts), this._observeDataChannel(channel), channel)
				},
				Peer.prototype.onIceCandidate = function (candidate) {
					this.closed || (candidate ? this.send("candidate", candidate) : this.logger.log("End of candidates."))
				},
				Peer.prototype.start = function () {
					this.enableDataChannels && this.getDataChannel("emsCommandChannel"),
					this.pc.offer(this.receiveMedia, function (err, sessionDescription) {})
				},
				Peer.prototype.icerestart = function () {
					var constraints = this.receiveMedia;
					constraints.mandatory.IceRestart = !0,
					this.pc.offer(constraints, function (err, success) {})
				},
				Peer.prototype.end = function () {
					this.closed || (this.pc.close(), this.handleStreamRemoved())
				},
				Peer.prototype.handleRemoteStreamAdded = function (event) {
					var self = this;
					this.stream ? this.logger.warn("Already have a remote stream") : (this.stream = event.stream, this.stream.onended = function () {
						self.end()
					}, this.parent.emit("peerStreamAdded", this))
				},
				Peer.prototype.handleStreamRemoved = function () {
					this.parent.peers.splice(this.parent.peers.indexOf(this), 1),
					this.closed = !0,
					this.parent.emit("peerStreamRemoved", this)
				},
				Peer.prototype.handleDataChannelAdded = function (channel) {
					this.channels[channel.label] = channel,
					this._observeDataChannel(channel)
				},
				Peer.prototype.sendFile = function (file) {
					var sender = new FileTransfer.Sender,
					dc = this.getDataChannel("filetransfer" + (new Date).getTime(), {
							protocol: INBAND_FILETRANSFER_V1
						});
					return dc.onopen = function () {
						dc.send(JSON.stringify({
								size: file.size,
								name: file.name
							})),
						sender.send(file, dc)
					},
					dc.onclose = function () {
						console.log("sender received transfer"),
						sender.emit("complete")
					},
					sender
				},
				Peer.prototype.initFmp4Channel = function () {
					var self = this,
					dc = this.getDataChannel("fmp4Transfer", {
							protocol: INBAND_FMP4TRANSFER
						});
					dc.onclose = function () {
						self.fmp4Sender.emit("complete")
					}
				},
				Peer.prototype.sendFragment = function (file, seqNum) {
					var self = this,
					dc = this.getDataChannel("fmp4Transfer", {
							protocol: INBAND_FMP4TRANSFER
						});
					dc.send(JSON.stringify({
							size: file.size,
							name: file.name,
							seqNum: seqNum
						})),
					self.fmp4Sender.send(file, dc)
				},
				module.exports = Peer
			}, {
				filetransfer: 15,
				rtcpeerconnection: 14,
				util: 9,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		16: [function (require, module, exports) {
				var func = window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia;
				module.exports = function (constraints, cb) {
					var error,
					haveOpts = 2 === arguments.length,
					defaultOpts = {
						video: !0,
						audio: !0
					},
					denied = "PermissionDeniedError",
					altDenied = "PERMISSION_DENIED",
					notSatisfied = "ConstraintNotSatisfiedError";
					return haveOpts || (cb = constraints, constraints = defaultOpts),
					func ? constraints.audio || constraints.video ? (localStorage && "true" === localStorage.useFirefoxFakeDevice && (constraints.fake = !0), void func.call(window.navigator, constraints, function (stream) {
							cb(null, stream)
						}, function (err) {
							var error;
							"string" == typeof err ? (error = new Error("MediaStreamError"), err === denied || err === altDenied ? error.name = denied : error.name = notSatisfied) : (error = err, error.name || (error[denied] ? err.name = denied : err.name = notSatisfied)),
							cb(error)
						})) : (error = new Error("MediaStreamError"), error.name = "NoMediaRequestedError", window.setTimeout(function () {
							cb(error)
						}, 0)) : (error = new Error("MediaStreamError"), error.name = "NotSupportedError", window.setTimeout(function () {
							cb(error)
						}, 0))
				}
			}, {}
		],
		11: [function (require, module, exports) {
				function LocalMedia(opts) {
					WildEmitter.call(this);
					var item,
					config = this.config = {
						autoAdjustMic: !1,
						detectSpeakingEvents: !0,
						media: {
							audio: !0,
							video: !0
						},
						logger: mockconsole
					};
					for (item in opts)
						this.config[item] = opts[item];
					this.logger = config.logger,
					this._log = this.logger.log.bind(this.logger, "LocalMedia:"),
					this._logerror = this.logger.error.bind(this.logger, "LocalMedia:"),
					this.screenSharingSupport = webrtc.screenSharing,
					this.localStreams = [],
					this.localScreens = [],
					webrtc.support || this._logerror("Your browser does not support local media capture.")
				}
				var util = require("util"),
				hark = require("hark"),
				webrtc = require("webrtcsupport"),
				getUserMedia = require("getusermedia"),
				getScreenMedia = require("getscreenmedia"),
				WildEmitter = require("wildemitter"),
				GainController = require("mediastream-gain"),
				mockconsole = require("mockconsole");
				util.inherits(LocalMedia, WildEmitter),
				LocalMedia.prototype.start = function (mediaConstraints, cb) {
					var self = this,
					constraints = mediaConstraints || this.config.media;
					getUserMedia(constraints, function (err, stream) {
						return err || (constraints.audio && self.config.detectSpeakingEvents && self.setupAudioMonitor(stream, self.config.harkOptions), self.localStreams.push(stream), self.config.autoAdjustMic && (self.gainController = new GainController(stream), self.setMicIfEnabled(.5)), stream.onended = function () {}, self.emit("localStream", stream)),
						cb ? cb(err, stream) : void 0
					})
				},
				LocalMedia.prototype.stop = function (stream) {
					var self = this;
					if (stream) {
						stream.stop(),
						self.emit("localStreamStopped", stream);
						var idx = self.localStreams.indexOf(stream);
						idx > -1 && (self.localStreams = self.localStreams.splice(idx, 1))
					} else
						this.audioMonitor && (this.audioMonitor.stop(), delete this.audioMonitor), this.localStreams.forEach(function (stream) {
							stream.stop(),
							self.emit("localStreamStopped", stream)
						}), this.localStreams = []
				},
				LocalMedia.prototype.startScreenShare = function (cb) {
					var self = this;
					getScreenMedia(function (err, stream) {
						return err || (self.localScreens.push(stream), stream.onended = function () {
							var idx = self.localScreens.indexOf(stream);
							idx > -1 && self.localScreens.splice(idx, 1),
							self.emit("localScreenStopped", stream)
						}, self.emit("localScreen", stream)),
						cb ? cb(err, stream) : void 0
					})
				},
				LocalMedia.prototype.stopScreenShare = function (stream) {
					stream ? stream.stop() : (this.localScreens.forEach(function (stream) {
							stream.stop()
						}), this.localScreens = [])
				},
				LocalMedia.prototype.mute = function () {
					this._audioEnabled(!1),
					this.hardMuted = !0,
					this.emit("audioOff")
				},
				LocalMedia.prototype.unmute = function () {
					this._audioEnabled(!0),
					this.hardMuted = !1,
					this.emit("audioOn")
				},
				LocalMedia.prototype.setupAudioMonitor = function (stream, harkOptions) {
					this._log("Setup audio");
					var timeout,
					audio = this.audioMonitor = hark(stream, harkOptions),
					self = this;
					audio.on("speaking", function () {
						self.emit("speaking"),
						self.hardMuted || self.setMicIfEnabled(1)
					}),
					audio.on("stopped_speaking", function () {
						timeout && clearTimeout(timeout),
						timeout = setTimeout(function () {
								self.emit("stoppedSpeaking"),
								self.hardMuted || self.setMicIfEnabled(.5)
							}, 1e3)
					}),
					audio.on("volume_change", function (volume, treshold) {
						self.emit("volumeChange", volume, treshold)
					})
				},
				LocalMedia.prototype.setMicIfEnabled = function (volume) {
					this.config.autoAdjustMic && this.gainController.setGain(volume)
				},
				LocalMedia.prototype.pauseVideo = function () {
					this._videoEnabled(!1),
					this.emit("videoOff")
				},
				LocalMedia.prototype.resumeVideo = function () {
					this._videoEnabled(!0),
					this.emit("videoOn")
				},
				LocalMedia.prototype.pause = function () {
					this.mute(),
					this.pauseVideo()
				},
				LocalMedia.prototype.resume = function () {
					this.unmute(),
					this.resumeVideo()
				},
				LocalMedia.prototype._audioEnabled = function (bool) {
					this.setMicIfEnabled(bool ? 1 : 0),
					this.localStreams.forEach(function (stream) {
						stream.getAudioTracks().forEach(function (track) {
							track.enabled = !!bool
						})
					})
				},
				LocalMedia.prototype._videoEnabled = function (bool) {
					this.localStreams.forEach(function (stream) {
						stream.getVideoTracks().forEach(function (track) {
							track.enabled = !!bool
						})
					})
				},
				LocalMedia.prototype.isAudioEnabled = function () {
					var enabled = !0;
					return this.localStreams.forEach(function (stream) {
						stream.getAudioTracks().forEach(function (track) {
							enabled = enabled && track.enabled
						})
					}),
					enabled
				},
				LocalMedia.prototype.isVideoEnabled = function () {
					var enabled = !0;
					return this.localStreams.forEach(function (stream) {
						stream.getVideoTracks().forEach(function (track) {
							enabled = enabled && track.enabled
						})
					}),
					enabled
				},
				LocalMedia.prototype.startLocalMedia = LocalMedia.prototype.start,
				LocalMedia.prototype.stopLocalMedia = LocalMedia.prototype.stop,
				Object.defineProperty(LocalMedia.prototype, "localStream", {
					get: function () {
						return this.localStreams.length > 0 ? this.localStreams[0] : null
					}
				}),
				Object.defineProperty(LocalMedia.prototype, "localScreen", {
					get: function () {
						return this.localScreens.length > 0 ? this.localScreens[0] : null
					}
				}),
				module.exports = LocalMedia
			}, {
				getscreenmedia: 18,
				getusermedia: 16,
				hark: 17,
				"mediastream-gain": 19,
				mockconsole: 7,
				util: 9,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		14: [function (require, module, exports) {
				function PeerConnection(config, constraints) {
					var item,
					self = this;
					WildEmitter.call(this),
					config = config || {},
					config.iceServers = config.iceServers || [],
					this.enableChromeNativeSimulcast = !1,
					constraints && constraints.optional && "webkit" === webrtc.prefix && null === navigator.appVersion.match(/Chromium\//) && constraints.optional.forEach(function (constraint, idx) {
						constraint.enableChromeNativeSimulcast && (self.enableChromeNativeSimulcast = !0)
					}),
					this.enableMultiStreamHacks = !1,
					constraints && constraints.optional && "webkit" === webrtc.prefix && constraints.optional.forEach(function (constraint, idx) {
						constraint.enableMultiStreamHacks && (self.enableMultiStreamHacks = !0)
					}),
					this.restrictBandwidth = 0,
					constraints && constraints.optional && constraints.optional.forEach(function (constraint, idx) {
						constraint.andyetRestrictBandwidth && (self.restrictBandwidth = constraint.andyetRestrictBandwidth)
					}),
					this.batchIceCandidates = 0,
					constraints && constraints.optional && constraints.optional.forEach(function (constraint, idx) {
						constraint.andyetBatchIce && (self.batchIceCandidates = constraint.andyetBatchIce)
					}),
					this.batchedIceCandidates = [],
					constraints && constraints.optional && "webkit" === webrtc.prefix && constraints.optional.forEach(function (constraint, idx) {
						constraint.andyetFasterICE && (self.eliminateDuplicateCandidates = constraint.andyetFasterICE)
					}),
					constraints && constraints.optional && constraints.optional.forEach(function (constraint, idx) {
						constraint.andyetDontSignalCandidates && (self.dontSignalCandidates = constraint.andyetDontSignalCandidates)
					}),
					this.assumeSetLocalSuccess = !1,
					constraints && constraints.optional && constraints.optional.forEach(function (constraint, idx) {
						constraint.andyetAssumeSetLocalSuccess && (self.assumeSetLocalSuccess = constraint.andyetAssumeSetLocalSuccess)
					}),
					"moz" === webrtc.prefix && constraints && constraints.optional && (this.wtFirefox = 0, constraints.optional.forEach(function (constraint, idx) {
							constraint.andyetFirefoxMakesMeSad && (self.wtFirefox = constraint.andyetFirefoxMakesMeSad, self.wtFirefox > 0 && (self.firefoxcandidatebuffer = []))
						})),
					this.pc = new peerconn(config, constraints),
					this.getLocalStreams = this.pc.getLocalStreams.bind(this.pc),
					this.getRemoteStreams = this.pc.getRemoteStreams.bind(this.pc),
					this.addStream = this.pc.addStream.bind(this.pc),
					this.removeStream = this.pc.removeStream.bind(this.pc),
					this.pc.on("*", function () {
						self.emit.apply(self, arguments)
					}),
					this.pc.onremovestream = this.emit.bind(this, "removeStream"),
					this.pc.onaddstream = this.emit.bind(this, "addStream"),
					this.pc.onnegotiationneeded = this.emit.bind(this, "negotiationNeeded"),
					this.pc.oniceconnectionstatechange = this.emit.bind(this, "iceConnectionStateChange"),
					this.pc.onsignalingstatechange = this.emit.bind(this, "signalingStateChange"),
					this.pc.onicecandidate = this._onIce.bind(this),
					this.pc.ondatachannel = this._onDataChannel.bind(this),
					this.localDescription = {
						contents: []
					},
					this.remoteDescription = {
						contents: []
					},
					this.config = {
						debug: !1,
						ice: {},
						sid: "",
						isInitiator: !0,
						sdpSessionID: Date.now(),
						useJingle: !1
					};
					for (item in config)
						this.config[item] = config[item];
					this.config.debug && this.on("*", function (eventName, event) {
						var logger = config.logger || console;
						logger.log("PeerConnection event:", arguments)
					}),
					this.hadLocalStunCandidate = !1,
					this.hadRemoteStunCandidate = !1,
					this.hadLocalRelayCandidate = !1,
					this.hadRemoteRelayCandidate = !1,
					this.hadLocalIPv6Candidate = !1,
					this.hadRemoteIPv6Candidate = !1,
					this._remoteDataChannels = [],
					this._localDataChannels = [],
					this._candidateBuffer = []
				}
				var util = require("util"),
				each = require("lodash.foreach"),
				pluck = require("lodash.pluck"),
				webrtc = require("webrtcsupport"),
				SJJ = require("sdp-jingle-json"),
				WildEmitter = require("wildemitter"),
				peerconn = require("traceablepeerconnection");
				util.inherits(PeerConnection, WildEmitter),
				Object.defineProperty(PeerConnection.prototype, "signalingState", {
					get: function () {
						return this.pc.signalingState
					}
				}),
				Object.defineProperty(PeerConnection.prototype, "iceConnectionState", {
					get: function () {
						return this.pc.iceConnectionState
					}
				}),
				PeerConnection.prototype._role = function () {
					return this.isInitiator ? "initiator" : "responder"
				},
				PeerConnection.prototype.addStream = function (stream) {
					this.localStream = stream,
					this.pc.addStream(stream)
				},
				PeerConnection.prototype._checkLocalCandidate = function (candidate) {
					var cand = SJJ.toCandidateJSON(candidate);
					"srflx" == cand.type ? this.hadLocalStunCandidate = !0 : "relay" == cand.type && (this.hadLocalRelayCandidate = !0),
					-1 != cand.ip.indexOf(":") && (this.hadLocalIPv6Candidate = !0)
				},
				PeerConnection.prototype._checkRemoteCandidate = function (candidate) {
					var cand = SJJ.toCandidateJSON(candidate);
					"srflx" == cand.type ? this.hadRemoteStunCandidate = !0 : "relay" == cand.type && (this.hadRemoteRelayCandidate = !0),
					-1 != cand.ip.indexOf(":") && (this.hadRemoteIPv6Candidate = !0)
				},
				PeerConnection.prototype.processIce = function (update, cb) {
					cb = cb || function () {};
					var self = this;
					if ("closed" === this.pc.signalingState)
						return cb();
					if (update.contents || update.jingle && update.jingle.contents) {
						var contentNames = pluck(this.remoteDescription.contents, "name"),
						contents = update.contents || update.jingle.contents;
						contents.forEach(function (content) {
							var transport = content.transport || {},
							candidates = transport.candidates || [],
							mline = contentNames.indexOf(content.name),
							mid = content.name;
							candidates.forEach(function (candidate) {
								var iceCandidate = SJJ.toCandidateSDP(candidate) + "\r\n";
								self.pc.addIceCandidate(new webrtc.IceCandidate({
										candidate: iceCandidate,
										sdpMLineIndex: mline,
										sdpMid: mid
									}), function () {}, function (err) {
									self.emit("error", err)
								}),
								self._checkRemoteCandidate(iceCandidate)
							})
						})
					} else {
						if (update.candidate && 0 !== update.candidate.candidate.indexOf("a=") && (update.candidate.candidate = "a=" + update.candidate.candidate), this.wtFirefox && null !== this.firefoxcandidatebuffer && this.pc.localDescription && "offer" === this.pc.localDescription.type)
							return this.firefoxcandidatebuffer.push(update.candidate), cb();
						self.pc.addIceCandidate(new webrtc.IceCandidate(update.candidate), function () {}, function (err) {
							self.emit("error", err)
						}),
						self._checkRemoteCandidate(update.candidate.candidate)
					}
					cb()
				},
				PeerConnection.prototype.offer = function (constraints, cb) {
					var self = this,
					hasConstraints = 2 === arguments.length,
					mediaConstraints = hasConstraints && constraints ? constraints : {
						offerToReceiveAudio: 1,
						offerToReceiveVideo: 1
					};
					return cb = hasConstraints ? cb : constraints,
					cb = cb || function () {},
					"closed" === this.pc.signalingState ? cb("Already closed") : void this.pc.createOffer(function (offer) {
						var expandedOffer = {
							type: "offer",
							sdp: offer.sdp
						};
						self.assumeSetLocalSuccess && (self.emit("offer", expandedOffer), cb(null, expandedOffer)),
						self._candidateBuffer = [],
						self.pc.setLocalDescription(offer, function () {
							var jingle;
							self.config.useJingle && (jingle = SJJ.toSessionJSON(offer.sdp, {
										role: self._role(),
										direction: "outgoing"
									}), jingle.sid = self.config.sid, self.localDescription = jingle, each(jingle.contents, function (content) {
									var transport = content.transport || {};
									transport.ufrag && (self.config.ice[content.name] = {
											ufrag: transport.ufrag,
											pwd: transport.pwd
										})
								}), expandedOffer.jingle = jingle),
							expandedOffer.sdp.split("\r\n").forEach(function (line) {
								0 === line.indexOf("a=candidate:") && self._checkLocalCandidate(line)
							}),
							self.assumeSetLocalSuccess || (self.emit("offer", expandedOffer), cb(null, expandedOffer))
						}, function (err) {
							self.emit("error", err),
							cb(err)
						})
					}, function (err) {
						self.emit("error", err),
						cb(err)
					}, mediaConstraints)
				},
				PeerConnection.prototype.handleOffer = function (offer, cb) {
					cb = cb || function () {};
					var self = this;
					if (offer.type = "offer", offer.jingle) {
						if (this.enableChromeNativeSimulcast && offer.jingle.contents.forEach(function (content) {
								"video" === content.name && (content.description.googConferenceFlag = !0)
							}), this.enableMultiStreamHacks && offer.jingle.contents.forEach(function (content) {
								if ("video" === content.name) {
									var sources = content.description.sources || [];
									(0 === sources.length || "3735928559" !== sources[0].ssrc) && (sources.unshift({
											ssrc: "3735928559",
											parameters: [{
													key: "cname",
													value: "deadbeef"
												}, {
													key: "msid",
													value: "mixyourfecintothis please"
												}
											]
										}), content.description.sources = sources)
								}
							}), self.restrictBandwidth > 0 && offer.jingle.contents.length >= 2 && "video" === offer.jingle.contents[1].name) {
							var content = offer.jingle.contents[1],
							hasBw = content.description && content.description.bandwidth;
							hasBw || (offer.jingle.contents[1].description.bandwidth = {
									type: "AS",
									bandwidth: self.restrictBandwidth.toString()
								}, offer.sdp = SJJ.toSessionSDP(offer.jingle, {
										sid: self.config.sdpSessionID,
										role: self._role(),
										direction: "outgoing"
									}))
						}
						offer.sdp = SJJ.toSessionSDP(offer.jingle, {
								sid: self.config.sdpSessionID,
								role: self._role(),
								direction: "incoming"
							}),
						self.remoteDescription = offer.jingle
					}
					offer.sdp.split("\r\n").forEach(function (line) {
						0 === line.indexOf("a=candidate:") && self._checkRemoteCandidate(line)
					}),
					self.pc.setRemoteDescription(new webrtc.SessionDescription(offer), function () {
						cb()
					}, cb)
				},
				PeerConnection.prototype.answerAudioOnly = function (cb) {
					var mediaConstraints = {
						offerToReceiveAudio: 1,
						offerToReceiveVideo: 0
					};
					this._answer(mediaConstraints, cb)
				},
				PeerConnection.prototype.answerBroadcastOnly = function (cb) {
					var mediaConstraints = {
						offerToReceiveAudio: 0,
						offerToReceiveVideo: 0
					};
					this._answer(mediaConstraints, cb)
				},
				PeerConnection.prototype.answer = function (constraints, cb) {
					var hasConstraints = 2 === arguments.length,
					callback = hasConstraints ? cb : constraints,
					mediaConstraints = hasConstraints && constraints ? constraints : {
						offerToReceiveAudio: 1,
						offerToReceiveVideo: 1
					};
					this._answer(mediaConstraints, callback)
				},
				PeerConnection.prototype.handleAnswer = function (answer, cb) {
					cb = cb || function () {};
					var self = this;
					answer.jingle && (answer.sdp = SJJ.toSessionSDP(answer.jingle, {
								sid: self.config.sdpSessionID,
								role: self._role(),
								direction: "incoming"
							}), self.remoteDescription = answer.jingle),
					answer.sdp.split("\r\n").forEach(function (line) {
						0 === line.indexOf("a=candidate:") && self._checkRemoteCandidate(line)
					}),
					self.pc.setRemoteDescription(new webrtc.SessionDescription(answer), function () {
						self.wtFirefox && window.setTimeout(function () {
							self.firefoxcandidatebuffer.forEach(function (candidate) {
								self.pc.addIceCandidate(new webrtc.IceCandidate(candidate), function () {}, function (err) {
									self.emit("error", err)
								}),
								self._checkRemoteCandidate(candidate.candidate)
							}),
							self.firefoxcandidatebuffer = null
						}, self.wtFirefox),
						cb(null)
					}, cb)
				},
				PeerConnection.prototype.close = function () {
					this.pc.close(),
					this._localDataChannels = [],
					this._remoteDataChannels = [],
					this.emit("close")
				},
				PeerConnection.prototype._answer = function (constraints, cb) {
					cb = cb || function () {};
					var self = this;
					if (!this.pc.remoteDescription)
						throw new Error("remoteDescription not set");
					return "closed" === this.pc.signalingState ? cb("Already closed") : void self.pc.createAnswer(function (answer) {
						var sim = [];
						if (self.enableChromeNativeSimulcast && (answer.jingle = SJJ.toSessionJSON(answer.sdp, {
										role: self._role(),
										direction: "outgoing"
									}), answer.jingle.contents.length >= 2 && "video" === answer.jingle.contents[1].name)) {
							var groups = answer.jingle.contents[1].description.sourceGroups || [],
							hasSim = !1;
							if (groups.forEach(function (group) {
									"SIM" == group.semantics && (hasSim = !0)
								}), !hasSim && answer.jingle.contents[1].description.sources.length) {
								var newssrc = JSON.parse(JSON.stringify(answer.jingle.contents[1].description.sources[0]));
								newssrc.ssrc = "" + Math.floor(4294967295 * Math.random()),
								answer.jingle.contents[1].description.sources.push(newssrc),
								sim.push(answer.jingle.contents[1].description.sources[0].ssrc),
								sim.push(newssrc.ssrc),
								groups.push({
									semantics: "SIM",
									sources: sim
								});
								var rtxssrc = JSON.parse(JSON.stringify(newssrc));
								rtxssrc.ssrc = "" + Math.floor(4294967295 * Math.random()),
								answer.jingle.contents[1].description.sources.push(rtxssrc),
								groups.push({
									semantics: "FID",
									sources: [newssrc.ssrc, rtxssrc.ssrc]
								}),
								answer.jingle.contents[1].description.sourceGroups = groups,
								answer.sdp = SJJ.toSessionSDP(answer.jingle, {
										sid: self.config.sdpSessionID,
										role: self._role(),
										direction: "outgoing"
									})
							}
						}
						var expandedAnswer = {
							type: "answer",
							sdp: answer.sdp
						};
						self.assumeSetLocalSuccess && (self.emit("answer", expandedAnswer), cb(null, expandedAnswer)),
						self._candidateBuffer = [],
						self.pc.setLocalDescription(answer, function () {
							if (self.config.useJingle) {
								var jingle = SJJ.toSessionJSON(answer.sdp, {
										role: self._role(),
										direction: "outgoing"
									});
								jingle.sid = self.config.sid,
								self.localDescription = jingle,
								expandedAnswer.jingle = jingle
							}
							if (self.enableChromeNativeSimulcast) {
								expandedAnswer.jingle || (expandedAnswer.jingle = SJJ.toSessionJSON(answer.sdp, {
											role: self._role(),
											direction: "outgoing"
										}));
								expandedAnswer.jingle.contents[1].description.sourceGroups || [];
								expandedAnswer.jingle.contents[1].description.sources.forEach(function (source, idx) {
									source.parameters = source.parameters.map(function (parameter) {
											return "msid" === parameter.key && (parameter.value += "-" + Math.floor(idx / 2)),
											parameter
										})
								}),
								expandedAnswer.sdp = SJJ.toSessionSDP(expandedAnswer.jingle, {
										sid: self.sdpSessionID,
										role: self._role(),
										direction: "outgoing"
									})
							}
							expandedAnswer.sdp.split("\r\n").forEach(function (line) {
								0 === line.indexOf("a=candidate:") && self._checkLocalCandidate(line)
							}),
							self.assumeSetLocalSuccess || (self.emit("answer", expandedAnswer), cb(null, expandedAnswer))
						}, function (err) {
							self.emit("error", err),
							cb(err)
						})
					}, function (err) {
						self.emit("error", err),
						cb(err)
					}, constraints)
				},
				PeerConnection.prototype._onIce = function (event) {
					var self = this;
					if (event.candidate) {
						if (this.dontSignalCandidates)
							return;
						var ice = event.candidate,
						expandedCandidate = {
							candidate: {
								candidate: ice.candidate,
								sdpMid: ice.sdpMid,
								sdpMLineIndex: ice.sdpMLineIndex
							}
						};
						this._checkLocalCandidate(ice.candidate);
						var already,
						idx,
						cand = SJJ.toCandidateJSON(ice.candidate);
						if (this.eliminateDuplicateCandidates && "relay" === cand.type && (already = this._candidateBuffer.filter(function (c) {
										return "relay" === c.type
									}).map(function (c) {
										return c.foundation + ":" + c.component
									}), idx = already.indexOf(cand.foundation + ":" + cand.component), idx > -1 && cand.priority >> 24 >= already[idx].priority >> 24))
							return;
						if ("max-bundle" === this.config.bundlePolicy && (already = this._candidateBuffer.filter(function (c) {
										return cand.type === c.type
									}).map(function (cand) {
										return cand.address + ":" + cand.port
									}), idx = already.indexOf(cand.address + ":" + cand.port), idx > -1))
							return;
						if ("require" === this.config.rtcpMuxPolicy && "2" === cand.component)
							return;
						if (this._candidateBuffer.push(cand), self.config.useJingle) {
							if (ice.sdpMid || (self.pc.remoteDescription && "offer" === self.pc.remoteDescription.type ? ice.sdpMid = self.remoteDescription.contents[ice.sdpMLineIndex].name : ice.sdpMid = self.localDescription.contents[ice.sdpMLineIndex].name), !self.config.ice[ice.sdpMid]) {
								var jingle = SJJ.toSessionJSON(self.pc.localDescription.sdp, {
										role: self._role(),
										direction: "outgoing"
									});
								each(jingle.contents, function (content) {
									var transport = content.transport || {};
									transport.ufrag && (self.config.ice[content.name] = {
											ufrag: transport.ufrag,
											pwd: transport.pwd
										})
								})
							}
							if (expandedCandidate.jingle = {
									contents: [{
											name: ice.sdpMid,
											creator: self._role(),
											transport: {
												transType: "iceUdp",
												ufrag: self.config.ice[ice.sdpMid].ufrag,
												pwd: self.config.ice[ice.sdpMid].pwd,
												candidates: [cand]
											}
										}
									]
								}, self.batchIceCandidates > 0)
								return 0 === self.batchedIceCandidates.length && window.setTimeout(function () {
									var contents = {};
									self.batchedIceCandidates.forEach(function (content) {
										content = content.contents[0],
										contents[content.name] || (contents[content.name] = content),
										contents[content.name].transport.candidates.push(content.transport.candidates[0])
									});
									var newCand = {
										jingle: {
											contents: []
										}
									};
									Object.keys(contents).forEach(function (name) {
										newCand.jingle.contents.push(contents[name])
									}),
									self.batchedIceCandidates = [],
									self.emit("ice", newCand)
								}, self.batchIceCandidates), void self.batchedIceCandidates.push(expandedCandidate.jingle)
						}
						this.emit("ice", expandedCandidate)
					} else
						this.emit("endOfCandidates")
				},
				PeerConnection.prototype._onDataChannel = function (event) {
					var channel = event.channel;
					this._remoteDataChannels.push(channel),
					this.emit("addChannel", channel)
				},
				PeerConnection.prototype.createDataChannel = function (name, opts) {
					var channel = this.pc.createDataChannel(name, opts);
					return this._localDataChannels.push(channel),
					channel
				},
				PeerConnection.prototype.getStats = function (cb) {
					"moz" === webrtc.prefix ? this.pc.getStats(function (res) {
						var items = [];
						for (var result in res)
							"object" == typeof res[result] && items.push(res[result]);
						cb(null, items)
					}, cb) : this.pc.getStats(function (res) {
						var items = [];
						res.result().forEach(function (result) {
							var item = {};
							result.names().forEach(function (name) {
								item[name] = result.stat(name)
							}),
							item.id = result.id,
							item.type = result.type,
							item.timestamp = result.timestamp,
							items.push(item)
						}),
						cb(null, items)
					})
				},
				module.exports = PeerConnection
			}, {
				"lodash.foreach": 22,
				"lodash.pluck": 23,
				"sdp-jingle-json": 20,
				traceablepeerconnection: 21,
				util: 9,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		15: [function (require, module, exports) {
				function Sender(opts) {
					WildEmitter.call(this);
					var options = opts || {};
					this.config = {
						chunksize: 16384,
						pacing: 0
					};
					var item;
					for (item in options)
						this.config[item] = options[item];
					this.file = null,
					this.channel = null
				}
				function Receiver() {
					WildEmitter.call(this),
					this.receiveBuffer = [],
					this.received = 0,
					this.metadata = {},
					this.channel = null
				}
				var WildEmitter = require("wildemitter"),
				util = require("util");
				util.inherits(Sender, WildEmitter),
				Sender.prototype.send = function (file, channel) {
					var self = this;
					this.file = file,
					this.channel = channel;
					var sliceFile = function (offset) {
						var reader = new window.FileReader;
						reader.onload = function () {
							return function (e) {
								self.channel.send(e.target.result),
								self.emit("progress", offset, file.size, e.target.result),
								file.size > offset + e.target.result.byteLength ? window.setTimeout(sliceFile, self.config.pacing, offset + self.config.chunksize) : (self.emit("progress", file.size, file.size, null), self.emit("sentFile"))
							}
						}
						(file);
						var slice = file.slice(offset, offset + self.config.chunksize);
						reader.readAsArrayBuffer(slice)
					};
					window.setTimeout(sliceFile, 0, 0)
				},
				util.inherits(Receiver, WildEmitter),
				Receiver.prototype.receive = function (metadata, channel) {
					var self = this;
					metadata && (this.metadata = metadata),
					this.channel = channel,
					channel.binaryType = "arraybuffer",
					this.channel.onmessage = function (event) {
						var len = event.data.byteLength;
						self.received += len,
						self.receiveBuffer.push(event.data),
						self.emit("progress", self.received, self.metadata.size, event.data),
						self.received === self.metadata.size ? (self.emit("receivedFile", new window.Blob(self.receiveBuffer), self.metadata), self.receiveBuffer = []) : self.received > self.metadata.size && (console.error("received more than expected, discarding..."), self.receiveBuffer = [])
					}
				},
				Receiver.prototype.receiveFragment = function (metadata, channel) {
					var self = this;
					metadata && (this.metadata = metadata),
					this.channel = channel,
					channel.binaryType = "arraybuffer",
					this.channel.onmessage = function (event) {
						var len = event.data.byteLength;
						return len ? (self.received += len, self.receiveBuffer.push(event.data), self.emit("progress", self.received, self.metadata.size, event.data), void(self.received === self.metadata.size ? (self.emit("receivedFile", new window.Blob(self.receiveBuffer), self.metadata), self.receiveBuffer = [], self.received = 0) : self.received > self.metadata.size && (console.error("received more than expected, discarding..."), self.receiveBuffer = []))) : void(self.metadata = JSON.parse(event.data))
					}
				},
				module.exports = {},
				module.exports.support = window && window.File && window.FileReader && window.Blob,
				module.exports.Sender = Sender,
				module.exports.Receiver = Receiver
			}, {
				util: 9,
				wildemitter: 5
			}
		],
		17: [function (require, module, exports) {
				function getMaxVolume(analyser, fftBins) {
					var maxVolume =  - (1 / 0);
					analyser.getFloatFrequencyData(fftBins);
					for (var i = 4, ii = fftBins.length; ii > i; i++)
						fftBins[i] > maxVolume && fftBins[i] < 0 && (maxVolume = fftBins[i]);
					return maxVolume
				}
				var WildEmitter = require("wildemitter"),
				audioContextType = window.AudioContext || window.webkitAudioContext,
				audioContext = null;
				module.exports = function (stream, options) {
					var harker = new WildEmitter;
					if (!audioContextType)
						return harker;
					var options = options || {},
					smoothing = options.smoothing || .1,
					interval = options.interval || 50,
					threshold = options.threshold,
					play = options.play,
					history = options.history || 10,
					running = !0;
					audioContext || (audioContext = new audioContextType);
					var sourceNode,
					fftBins,
					analyser;
					analyser = audioContext.createAnalyser(),
					analyser.fftSize = 512,
					analyser.smoothingTimeConstant = smoothing,
					fftBins = new Float32Array(analyser.fftSize),
					stream.jquery && (stream = stream[0]),
					stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement ? (sourceNode = audioContext.createMediaElementSource(stream), "undefined" == typeof play && (play = !0), threshold = threshold || -50) : (sourceNode = audioContext.createMediaStreamSource(stream), threshold = threshold || -50),
					sourceNode.connect(analyser),
					play && analyser.connect(audioContext.destination),
					harker.speaking = !1,
					harker.setThreshold = function (t) {
						threshold = t
					},
					harker.setInterval = function (i) {
						interval = i
					},
					harker.stop = function () {
						running = !1,
						harker.emit("volume_change", -100, threshold),
						harker.speaking && (harker.speaking = !1, harker.emit("stopped_speaking"))
					},
					harker.speakingHistory = [];
					for (var i = 0; history > i; i++)
						harker.speakingHistory.push(0);
					var looper = function () {
						setTimeout(function () {
							if (running) {
								var currentVolume = getMaxVolume(analyser, fftBins);
								harker.emit("volume_change", currentVolume, threshold);
								var history = 0;
								if (currentVolume > threshold && !harker.speaking) {
									for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++)
										history += harker.speakingHistory[i];
									history >= 2 && (harker.speaking = !0, harker.emit("speaking"))
								} else if (threshold > currentVolume && harker.speaking) {
									for (var i = 0; i < harker.speakingHistory.length; i++)
										history += harker.speakingHistory[i];
									0 == history && (harker.speaking = !1, harker.emit("stopped_speaking"))
								}
								harker.speakingHistory.shift(),
								harker.speakingHistory.push(0 + (currentVolume > threshold)),
								looper()
							}
						}, interval)
					};
					return looper(),
					harker
				}
			}, {
				wildemitter: 24
			}
		],
		24: [function (require, module, exports) {
				function WildEmitter() {
					this.callbacks = {}
				}
				module.exports = WildEmitter,
				WildEmitter.prototype.on = function (event, groupName, fn) {
					var hasGroup = 3 === arguments.length,
					group = hasGroup ? arguments[1] : void 0,
					func = hasGroup ? arguments[2] : arguments[1];
					return func._groupName = group,
					(this.callbacks[event] = this.callbacks[event] || []).push(func),
					this
				},
				WildEmitter.prototype.once = function (event, groupName, fn) {
					function on() {
						self.off(event, on),
						func.apply(this, arguments)
					}
					var self = this,
					hasGroup = 3 === arguments.length,
					group = hasGroup ? arguments[1] : void 0,
					func = hasGroup ? arguments[2] : arguments[1];
					return this.on(event, group, on),
					this
				},
				WildEmitter.prototype.releaseGroup = function (groupName) {
					var item,
					i,
					len,
					handlers;
					for (item in this.callbacks)
						for (handlers = this.callbacks[item], i = 0, len = handlers.length; len > i; i++)
							handlers[i]._groupName === groupName && (handlers.splice(i, 1), i--, len--);
					return this
				},
				WildEmitter.prototype.off = function (event, fn) {
					var i,
					callbacks = this.callbacks[event];
					return callbacks ? 1 === arguments.length ? (delete this.callbacks[event], this) : (i = callbacks.indexOf(fn), callbacks.splice(i, 1), 0 === callbacks.length && delete this.callbacks[event], this) : this
				},
				WildEmitter.prototype.emit = function (event) {
					var i,
					len,
					listeners,
					args = [].slice.call(arguments, 1),
					callbacks = this.callbacks[event],
					specialCallbacks = this.getWildcardCallbacks(event);
					if (callbacks)
						for (listeners = callbacks.slice(), i = 0, len = listeners.length; len > i && listeners[i]; ++i)
							listeners[i].apply(this, args);
					if (specialCallbacks)
						for (len = specialCallbacks.length, listeners = specialCallbacks.slice(), i = 0, len = listeners.length; len > i && listeners[i]; ++i)
							listeners[i].apply(this, [event].concat(args));
					return this
				},
				WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
					var item,
					split,
					result = [];
					for (item in this.callbacks)
						split = item.split("*"), ("*" === item || 2 === split.length && eventName.slice(0, split[0].length) === split[0]) && (result = result.concat(this.callbacks[item]));
					return result
				}
			}, {}
		],
		20: [function (require, module, exports) {
				var toSDP = require("./lib/tosdp"),
				toJSON = require("./lib/tojson");
				exports.toIncomingSDPOffer = function (session) {
					return toSDP.toSessionSDP(session, {
						role: "responder",
						direction: "incoming"
					})
				},
				exports.toOutgoingSDPOffer = function (session) {
					return toSDP.toSessionSDP(session, {
						role: "initiator",
						direction: "outgoing"
					})
				},
				exports.toIncomingSDPAnswer = function (session) {
					return toSDP.toSessionSDP(session, {
						role: "initiator",
						direction: "incoming"
					})
				},
				exports.toOutgoingSDPAnswer = function (session) {
					return toSDP.toSessionSDP(session, {
						role: "responder",
						direction: "outgoing"
					})
				},
				exports.toIncomingMediaSDPOffer = function (media) {
					return toSDP.toMediaSDP(media, {
						role: "responder",
						direction: "incoming"
					})
				},
				exports.toOutgoingMediaSDPOffer = function (media) {
					return toSDP.toMediaSDP(media, {
						role: "initiator",
						direction: "outgoing"
					})
				},
				exports.toIncomingMediaSDPAnswer = function (media) {
					return toSDP.toMediaSDP(media, {
						role: "initiator",
						direction: "incoming"
					})
				},
				exports.toOutgoingMediaSDPAnswer = function (media) {
					return toSDP.toMediaSDP(media, {
						role: "responder",
						direction: "outgoing"
					})
				},
				exports.toCandidateSDP = toSDP.toCandidateSDP,
				exports.toMediaSDP = toSDP.toMediaSDP,
				exports.toSessionSDP = toSDP.toSessionSDP,
				exports.toIncomingJSONOffer = function (sdp, creators) {
					return toJSON.toSessionJSON(sdp, {
						role: "responder",
						direction: "incoming",
						creators: creators
					})
				},
				exports.toOutgoingJSONOffer = function (sdp, creators) {
					return toJSON.toSessionJSON(sdp, {
						role: "initiator",
						direction: "outgoing",
						creators: creators
					})
				},
				exports.toIncomingJSONAnswer = function (sdp, creators) {
					return toJSON.toSessionJSON(sdp, {
						role: "initiator",
						direction: "incoming",
						creators: creators
					})
				},
				exports.toOutgoingJSONAnswer = function (sdp, creators) {
					return toJSON.toSessionJSON(sdp, {
						role: "responder",
						direction: "outgoing",
						creators: creators
					})
				},
				exports.toIncomingMediaJSONOffer = function (sdp, creator) {
					return toJSON.toMediaJSON(sdp, {
						role: "responder",
						direction: "incoming",
						creator: creator
					})
				},
				exports.toOutgoingMediaJSONOffer = function (sdp, creator) {
					return toJSON.toMediaJSON(sdp, {
						role: "initiator",
						direction: "outgoing",
						creator: creator
					})
				},
				exports.toIncomingMediaJSONAnswer = function (sdp, creator) {
					return toJSON.toMediaJSON(sdp, {
						role: "initiator",
						direction: "incoming",
						creator: creator
					})
				},
				exports.toOutgoingMediaJSONAnswer = function (sdp, creator) {
					return toJSON.toMediaJSON(sdp, {
						role: "responder",
						direction: "outgoing",
						creator: creator
					})
				},
				exports.toCandidateJSON = toJSON.toCandidateJSON,
				exports.toMediaJSON = toJSON.toMediaJSON,
				exports.toSessionJSON = toJSON.toSessionJSON
			}, {
				"./lib/tojson": 26,
				"./lib/tosdp": 25
			}
		],
		18: [function (require, module, exports) {
				var getUserMedia = require("getusermedia"),
				cache = {};
				module.exports = function (constraints, cb) {
					var error,
					hasConstraints = 2 === arguments.length,
					callback = hasConstraints ? cb : constraints;
					if ("undefined" == typeof window || "http:" === window.location.protocol)
						return error = new Error("NavigatorUserMediaError"), error.name = "HTTPS_REQUIRED", callback(error);
					if (window.navigator.userAgent.match("Chrome")) {
						var chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10),
						maxver = 33,
						isCef = !window.chrome.webstore;
						if (window.navigator.userAgent.match("Linux") && (maxver = 35), sessionStorage.getScreenMediaJSExtensionId)
							chrome.runtime.sendMessage(sessionStorage.getScreenMediaJSExtensionId, {
								type: "getScreen",
								id: 1
							}, null, function (data) {
								if ("" === data.sourceId) {
									var error = new Error("NavigatorUserMediaError");
									error.name = "PERMISSION_DENIED",
									callback(error)
								} else {
									var constraints = constraints || {
										audio: !1,
										video: {
											mandatory: {
												chromeMediaSource: "desktop",
												maxWidth: window.screen.width,
												maxHeight: window.screen.height,
												maxFrameRate: 3
											},
											optional: [{
													googLeakyBucket: !0
												}, {
													googTemporalLayeredScreencast: !0
												}
											]
										}
									};
									constraints.video.mandatory.chromeMediaSourceId = data.sourceId,
									getUserMedia(constraints, callback)
								}
							});
						else if (isCef || chromever >= 26 && maxver >= chromever)
							constraints = hasConstraints && constraints || {
								video: {
									mandatory: {
										googLeakyBucket: !0,
										maxWidth: window.screen.width,
										maxHeight: window.screen.height,
										maxFrameRate: 3,
										chromeMediaSource: "screen"
									}
								}
							},
						getUserMedia(constraints, callback);
						else {
							var pending = window.setTimeout(function () {
									return error = new Error("NavigatorUserMediaError"),
									error.name = "EXTENSION_UNAVAILABLE",
									callback(error)
								}, 1e3);
							cache[pending] = [callback, hasConstraints ? constraint : null],
							window.postMessage({
								type: "getScreen",
								id: pending
							}, "*")
						}
					} else if (window.navigator.userAgent.match("Firefox")) {
						var ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
						ffver >= 33 ? (constraints = hasConstraints && constraints || {
								video: {
									mozMediaSource: "window",
									mediaSource: "window"
								}
							}, getUserMedia(constraints, function (err, stream) {
								if (callback(err, stream), !err)
									var lastTime = stream.currentTime, polly = window.setInterval(function () {
											stream || window.clearInterval(polly),
											stream.currentTime == lastTime && (window.clearInterval(polly), stream.onended && stream.onended()),
											lastTime = stream.currentTime
										}, 500)
							})) : (error = new Error("NavigatorUserMediaError"), error.name = "EXTENSION_UNAVAILABLE")
					}
				},
				window.addEventListener("message", function (event) {
					if (event.origin == window.location.origin)
						if ("gotScreen" == event.data.type && cache[event.data.id]) {
							var data = cache[event.data.id],
							constraints = data[1],
							callback = data[0];
							if (delete cache[event.data.id], "" === event.data.sourceId) {
								var error = new Error("NavigatorUserMediaError");
								error.name = "PERMISSION_DENIED",
								callback(error)
							} else
								constraints = constraints || {
									audio: !1,
									video: {
										mandatory: {
											chromeMediaSource: "desktop",
											maxWidth: window.screen.width,
											maxHeight: window.screen.height,
											maxFrameRate: 3
										},
										optional: [{
												googLeakyBucket: !0
											}, {
												googTemporalLayeredScreencast: !0
											}
										]
									}
								},
							constraints.video.mandatory.chromeMediaSourceId = event.data.sourceId,
							getUserMedia(constraints, callback)
						} else
							"getScreenPending" == event.data.type && window.clearTimeout(event.data.id)
				})
			}, {
				getusermedia: 16
			}
		],
		19: [function (require, module, exports) {
				function GainController(stream) {
					if (this.support = support.webAudio && support.mediaStream, this.gain = 1, this.support) {
						var context = this.context = new support.AudioContext;
						this.microphone = context.createMediaStreamSource(stream),
						this.gainFilter = context.createGain(),
						this.destination = context.createMediaStreamDestination(),
						this.outputStream = this.destination.stream,
						this.microphone.connect(this.gainFilter),
						this.gainFilter.connect(this.destination),
						stream.addTrack(this.outputStream.getAudioTracks()[0]),
						stream.removeTrack(stream.getAudioTracks()[0])
					}
					this.stream = stream
				}
				var support = require("webrtcsupport");
				GainController.prototype.setGain = function (val) {
					this.support && (this.gainFilter.gain.value = val, this.gain = val)
				},
				GainController.prototype.getGain = function () {
					return this.gain
				},
				GainController.prototype.off = function () {
					return this.setGain(0)
				},
				GainController.prototype.on = function () {
					this.setGain(1)
				},
				module.exports = GainController
			}, {
				webrtcsupport: 4
			}
		],
		22: [function (require, module, exports) {
				function createForEach(arrayFunc, eachFunc) {
					return function (collection, iteratee, thisArg) {
						return "function" == typeof iteratee && void 0 === thisArg && isArray(collection) ? arrayFunc(collection, iteratee) : eachFunc(collection, bindCallback(iteratee, thisArg, 3))
					}
				}
				var arrayEach = require("lodash._arrayeach"),
				baseEach = require("lodash._baseeach"),
				bindCallback = require("lodash._bindcallback"),
				isArray = require("lodash.isarray"),
				forEach = createForEach(arrayEach, baseEach);
				module.exports = forEach
			}, {
				"lodash._arrayeach": 30,
				"lodash._baseeach": 28,
				"lodash._bindcallback": 27,
				"lodash.isarray": 29
			}
		],
		23: [function (require, module, exports) {
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function basePropertyDeep(path) {
					var pathKey = path + "";
					return path = toPath(path),
					function (object) {
						return baseGet(object, path, pathKey)
					}
				}
				function isKey(value, object) {
					var type = typeof value;
					if ("string" == type && reIsPlainProp.test(value) || "number" == type)
						return !0;
					if (isArray(value))
						return !1;
					var result = !reIsDeepProp.test(value);
					return result || null != object && value in toObject(object)
				}
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function pluck(collection, path) {
					return map(collection, property(path))
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				function property(path) {
					return isKey(path) ? baseProperty(path) : basePropertyDeep(path)
				}
				var baseGet = require("lodash._baseget"),
				toPath = require("lodash._topath"),
				isArray = require("lodash.isarray"),
				map = require("lodash.map"),
				reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
				reIsPlainProp = /^\w*$/;
				module.exports = pluck
			}, {
				"lodash._baseget": 31,
				"lodash._topath": 32,
				"lodash.isarray": 34,
				"lodash.map": 33
			}
		],
		26: [function (require, module, exports) {
				var SENDERS = require("./senders"),
				parsers = require("./parsers"),
				idCounter = Math.random();
				exports._setIdCounter = function (counter) {
					idCounter = counter
				},
				exports.toSessionJSON = function (sdp, opts) {
					var i,
					creators = opts.creators || [],
					role = opts.role || "initiator",
					direction = opts.direction || "outgoing",
					media = sdp.split("\r\nm=");
					for (i = 1; i < media.length; i++)
						media[i] = "m=" + media[i], i !== media.length - 1 && (media[i] += "\r\n");
					var session = media.shift() + "\r\n",
					sessionLines = parsers.lines(session),
					parsed = {},
					contents = [];
					for (i = 0; i < media.length; i++)
						contents.push(exports.toMediaJSON(media[i], session, {
								role: role,
								direction: direction,
								creator: creators[i] || "initiator"
							}));
					parsed.contents = contents;
					var groupLines = parsers.findLines("a=group:", sessionLines);
					return groupLines.length && (parsed.groups = parsers.groups(groupLines)),
					parsed
				},
				exports.toMediaJSON = function (media, session, opts) {
					var creator = opts.creator || "initiator",
					role = opts.role || "initiator",
					direction = opts.direction || "outgoing",
					lines = parsers.lines(media),
					sessionLines = parsers.lines(session),
					mline = parsers.mline(lines[0]),
					content = {
						creator: creator,
						name: mline.media,
						description: {
							descType: "rtp",
							media: mline.media,
							payloads: [],
							encryption: [],
							feedback: [],
							headerExtensions: []
						},
						transport: {
							transType: "iceUdp",
							candidates: [],
							fingerprints: []
						}
					};
					"application" == mline.media && (content.description = {
							descType: "datachannel"
						}, content.transport.sctp = []);
					var desc = content.description,
					trans = content.transport,
					mid = parsers.findLine("a=mid:", lines);
					if (mid && (content.name = mid.substr(6)), parsers.findLine("a=sendrecv", lines, sessionLines) ? content.senders = "both" : parsers.findLine("a=sendonly", lines, sessionLines) ? content.senders = SENDERS[role][direction].sendonly : parsers.findLine("a=recvonly", lines, sessionLines) ? content.senders = SENDERS[role][direction].recvonly : parsers.findLine("a=inactive", lines, sessionLines) && (content.senders = "none"), "rtp" == desc.descType) {
						var bandwidth = parsers.findLine("b=", lines);
						bandwidth && (desc.bandwidth = parsers.bandwidth(bandwidth));
						var ssrc = parsers.findLine("a=ssrc:", lines);
						ssrc && (desc.ssrc = ssrc.substr(7).split(" ")[0]);
						var rtpmapLines = parsers.findLines("a=rtpmap:", lines);
						rtpmapLines.forEach(function (line) {
							var payload = parsers.rtpmap(line);
							payload.parameters = [],
							payload.feedback = [];
							var fmtpLines = parsers.findLines("a=fmtp:" + payload.id, lines);
							fmtpLines.forEach(function (line) {
								payload.parameters = parsers.fmtp(line)
							});
							var fbLines = parsers.findLines("a=rtcp-fb:" + payload.id, lines);
							fbLines.forEach(function (line) {
								payload.feedback.push(parsers.rtcpfb(line))
							}),
							desc.payloads.push(payload)
						});
						var cryptoLines = parsers.findLines("a=crypto:", lines, sessionLines);
						cryptoLines.forEach(function (line) {
							desc.encryption.push(parsers.crypto(line))
						}),
						parsers.findLine("a=rtcp-mux", lines) && (desc.mux = !0);
						var fbLines = parsers.findLines("a=rtcp-fb:*", lines);
						fbLines.forEach(function (line) {
							desc.feedback.push(parsers.rtcpfb(line))
						});
						var extLines = parsers.findLines("a=extmap:", lines);
						extLines.forEach(function (line) {
							var ext = parsers.extmap(line);
							ext.senders = SENDERS[role][direction][ext.senders],
							desc.headerExtensions.push(ext)
						});
						var ssrcGroupLines = parsers.findLines("a=ssrc-group:", lines);
						desc.sourceGroups = parsers.sourceGroups(ssrcGroupLines || []);
						var ssrcLines = parsers.findLines("a=ssrc:", lines);
						desc.sources = parsers.sources(ssrcLines || []),
						parsers.findLine("a=x-google-flag:conference", lines, sessionLines) && (desc.googConferenceFlag = !0)
					}
					var fingerprintLines = parsers.findLines("a=fingerprint:", lines, sessionLines),
					setup = parsers.findLine("a=setup:", lines, sessionLines);
					fingerprintLines.forEach(function (line) {
						var fp = parsers.fingerprint(line);
						setup && (fp.setup = setup.substr(8)),
						trans.fingerprints.push(fp)
					});
					var ufragLine = parsers.findLine("a=ice-ufrag:", lines, sessionLines),
					pwdLine = parsers.findLine("a=ice-pwd:", lines, sessionLines);
					if (ufragLine && pwdLine) {
						trans.ufrag = ufragLine.substr(12),
						trans.pwd = pwdLine.substr(10),
						trans.candidates = [];
						var candidateLines = parsers.findLines("a=candidate:", lines, sessionLines);
						candidateLines.forEach(function (line) {
							trans.candidates.push(exports.toCandidateJSON(line))
						})
					}
					if ("datachannel" == desc.descType) {
						var sctpmapLines = parsers.findLines("a=sctpmap:", lines);
						sctpmapLines.forEach(function (line) {
							var sctp = parsers.sctpmap(line);
							trans.sctp.push(sctp)
						})
					}
					return content
				},
				exports.toCandidateJSON = function (line) {
					var candidate = parsers.candidate(line.split("\r\n")[0]);
					return candidate.id = (idCounter++).toString(36).substr(0, 12),
					candidate
				}
			}, {
				"./parsers": 36,
				"./senders": 35
			}
		],
		25: [function (require, module, exports) {
				var SENDERS = require("./senders");
				exports.toSessionSDP = function (session, opts) {
					var sid = (opts.role || "initiator", opts.direction || "outgoing", opts.sid || session.sid || Date.now()),
					time = opts.time || Date.now(),
					sdp = ["v=0", "o=- " + sid + " " + time + " IN IP4 0.0.0.0", "s=-", "t=0 0"],
					groups = session.groups || [];
					groups.forEach(function (group) {
						sdp.push("a=group:" + group.semantics + " " + group.contents.join(" "))
					});
					var contents = session.contents || [];
					return contents.forEach(function (content) {
						sdp.push(exports.toMediaSDP(content, opts))
					}),
					sdp.join("\r\n") + "\r\n"
				},
				exports.toMediaSDP = function (content, opts) {
					var sdp = [],
					role = opts.role || "initiator",
					direction = opts.direction || "outgoing",
					desc = content.description,
					transport = content.transport,
					payloads = desc.payloads || [],
					fingerprints = transport && transport.fingerprints || [],
					mline = [];
					if ("datachannel" == desc.descType ? (mline.push("application"), mline.push("1"), mline.push("DTLS/SCTP"), transport.sctp && transport.sctp.forEach(function (map) {
								mline.push(map.number)
							})) : (mline.push(desc.media), mline.push("1"), desc.encryption && desc.encryption.length > 0 || fingerprints.length > 0 ? mline.push("RTP/SAVPF") : mline.push("RTP/AVPF"), payloads.forEach(function (payload) {
								mline.push(payload.id)
							})), sdp.push("m=" + mline.join(" ")), sdp.push("c=IN IP4 0.0.0.0"), desc.bandwidth && desc.bandwidth.type && desc.bandwidth.bandwidth && sdp.push("b=" + desc.bandwidth.type + ":" + desc.bandwidth.bandwidth), "rtp" == desc.descType && sdp.push("a=rtcp:1 IN IP4 0.0.0.0"), transport) {
						transport.ufrag && sdp.push("a=ice-ufrag:" + transport.ufrag),
						transport.pwd && sdp.push("a=ice-pwd:" + transport.pwd);
						var pushedSetup = !1;
						fingerprints.forEach(function (fingerprint) {
							sdp.push("a=fingerprint:" + fingerprint.hash + " " + fingerprint.value),
							fingerprint.setup && !pushedSetup && sdp.push("a=setup:" + fingerprint.setup)
						}),
						transport.sctp && transport.sctp.forEach(function (map) {
							sdp.push("a=sctpmap:" + map.number + " " + map.protocol + " " + map.streams)
						})
					}
					"rtp" == desc.descType && sdp.push("a=" + (SENDERS[role][direction][content.senders] || "sendrecv")),
					sdp.push("a=mid:" + content.name),
					desc.mux && sdp.push("a=rtcp-mux");
					var encryption = desc.encryption || [];
					encryption.forEach(function (crypto) {
						sdp.push("a=crypto:" + crypto.tag + " " + crypto.cipherSuite + " " + crypto.keyParams + (crypto.sessionParams ? " " + crypto.sessionParams : ""))
					}),
					desc.googConferenceFlag && sdp.push("a=x-google-flag:conference"),
					payloads.forEach(function (payload) {
						var rtpmap = "a=rtpmap:" + payload.id + " " + payload.name + "/" + payload.clockrate;
						if (payload.channels && "1" != payload.channels && (rtpmap += "/" + payload.channels), sdp.push(rtpmap), payload.parameters && payload.parameters.length) {
							var fmtp = ["a=fmtp:" + payload.id],
							parameters = [];
							payload.parameters.forEach(function (param) {
								parameters.push((param.key ? param.key + "=" : "") + param.value)
							}),
							fmtp.push(parameters.join(";")),
							sdp.push(fmtp.join(" "))
						}
						payload.feedback && payload.feedback.forEach(function (fb) {
							"trr-int" === fb.type ? sdp.push("a=rtcp-fb:" + payload.id + " trr-int " + (fb.value ? fb.value : "0")) : sdp.push("a=rtcp-fb:" + payload.id + " " + fb.type + (fb.subtype ? " " + fb.subtype : ""))
						})
					}),
					desc.feedback && desc.feedback.forEach(function (fb) {
						"trr-int" === fb.type ? sdp.push("a=rtcp-fb:* trr-int " + (fb.value ? fb.value : "0")) : sdp.push("a=rtcp-fb:* " + fb.type + (fb.subtype ? " " + fb.subtype : ""))
					});
					var hdrExts = desc.headerExtensions || [];
					hdrExts.forEach(function (hdr) {
						sdp.push("a=extmap:" + hdr.id + (hdr.senders ? "/" + SENDERS[role][direction][hdr.senders] : "") + " " + hdr.uri)
					});
					var ssrcGroups = desc.sourceGroups || [];
					ssrcGroups.forEach(function (ssrcGroup) {
						sdp.push("a=ssrc-group:" + ssrcGroup.semantics + " " + ssrcGroup.sources.join(" "))
					});
					var ssrcs = desc.sources || [];
					ssrcs.forEach(function (ssrc) {
						for (var i = 0; i < ssrc.parameters.length; i++) {
							var param = ssrc.parameters[i];
							sdp.push("a=ssrc:" + (ssrc.ssrc || desc.ssrc) + " " + param.key + (param.value ? ":" + param.value : ""))
						}
					});
					var candidates = transport.candidates || [];
					return candidates.forEach(function (candidate) {
						sdp.push(exports.toCandidateSDP(candidate))
					}),
					sdp.join("\r\n")
				},
				exports.toCandidateSDP = function (candidate) {
					var sdp = [];
					sdp.push(candidate.foundation),
					sdp.push(candidate.component),
					sdp.push(candidate.protocol.toUpperCase()),
					sdp.push(candidate.priority),
					sdp.push(candidate.ip),
					sdp.push(candidate.port);
					var type = candidate.type;
					return sdp.push("typ"),
					sdp.push(type),
					("srflx" === type || "prflx" === type || "relay" === type) && candidate.relAddr && candidate.relPort && (sdp.push("raddr"), sdp.push(candidate.relAddr), sdp.push("rport"), sdp.push(candidate.relPort)),
					candidate.tcpType && "TCP" == candidate.protocol.toUpperCase() && (sdp.push("tcptype"), sdp.push(candidate.tcpType)),
					sdp.push("generation"),
					sdp.push(candidate.generation || "0"),
					"a=candidate:" + sdp.join(" ")
				}
			}, {
				"./senders": 35
			}
		],
		27: [function (require, module, exports) {
				function bindCallback(func, thisArg, argCount) {
					if ("function" != typeof func)
						return identity;
					if (void 0 === thisArg)
						return func;
					switch (argCount) {
					case 1:
						return function (value) {
							return func.call(thisArg, value)
						};
					case 3:
						return function (value, index, collection) {
							return func.call(thisArg, value, index, collection)
						};
					case 4:
						return function (accumulator, value, index, collection) {
							return func.call(thisArg, accumulator, value, index, collection)
						};
					case 5:
						return function (value, other, key, object, source) {
							return func.call(thisArg, value, other, key, object, source)
						}
					}
					return function () {
						return func.apply(thisArg, arguments)
					}
				}
				function identity(value) {
					return value
				}
				module.exports = bindCallback
			}, {}
		],
		29: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function getNative(object, key) {
					var value = null == object ? void 0 : object[key];
					return isNative(value) ? value : void 0
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function isNative(value) {
					return null == value ? !1 : objToString.call(value) == funcTag ? reIsNative.test(fnToString.call(value)) : isObjectLike(value) && reIsHostCtor.test(value)
				}
				function escapeRegExp(string) {
					return string = baseToString(string),
					string && reHasRegExpChars.test(string) ? string.replace(reRegExpChars, "\\$&") : string
				}
				var arrayTag = "[object Array]",
				funcTag = "[object Function]",
				reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
				reHasRegExpChars = RegExp(reRegExpChars.source),
				reIsHostCtor = /^\[object .+?Constructor\]$/,
				objectProto = Object.prototype,
				fnToString = Function.prototype.toString,
				hasOwnProperty = objectProto.hasOwnProperty,
				objToString = objectProto.toString,
				reIsNative = RegExp("^" + escapeRegExp(fnToString.call(hasOwnProperty)).replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"),
				nativeIsArray = getNative(Array, "isArray"),
				MAX_SAFE_INTEGER = 9007199254740991,
				isArray = nativeIsArray || function (value) {
					return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag
				};
				module.exports = isArray
			}, {}
		],
		31: [function (require, module, exports) {
				function baseGet(object, path, pathKey) {
					if (null != object) {
						void 0 !== pathKey && pathKey in toObject(object) && (path = [pathKey]);
						for (var index = 0, length = path.length; null != object && length > index; )
							object = object[path[index++]];
						return index && index == length ? object : void 0
					}
				}
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				module.exports = baseGet
			}, {}
		],
		30: [function (require, module, exports) {
				function arrayEach(array, iteratee) {
					for (var index = -1, length = array.length; ++index < length && iteratee(array[index], index, array) !== !1; );
					return array
				}
				module.exports = arrayEach
			}, {}
		],
		34: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function getNative(object, key) {
					var value = null == object ? void 0 : object[key];
					return isNative(value) ? value : void 0
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function isNative(value) {
					return null == value ? !1 : objToString.call(value) == funcTag ? reIsNative.test(fnToString.call(value)) : isObjectLike(value) && reIsHostCtor.test(value)
				}
				function escapeRegExp(string) {
					return string = baseToString(string),
					string && reHasRegExpChars.test(string) ? string.replace(reRegExpChars, "\\$&") : string
				}
				var arrayTag = "[object Array]",
				funcTag = "[object Function]",
				reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
				reHasRegExpChars = RegExp(reRegExpChars.source),
				reIsHostCtor = /^\[object .+?Constructor\]$/,
				objectProto = Object.prototype,
				fnToString = Function.prototype.toString,
				hasOwnProperty = objectProto.hasOwnProperty,
				objToString = objectProto.toString,
				reIsNative = RegExp("^" + escapeRegExp(fnToString.call(hasOwnProperty)).replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"),
				nativeIsArray = getNative(Array, "isArray"),
				MAX_SAFE_INTEGER = 9007199254740991,
				isArray = nativeIsArray || function (value) {
					return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag
				};
				module.exports = isArray
			}, {}
		],
		35: [function (require, module, exports) {
				module.exports = {
					initiator: {
						incoming: {
							initiator: "recvonly",
							responder: "sendonly",
							both: "sendrecv",
							none: "inactive",
							recvonly: "initiator",
							sendonly: "responder",
							sendrecv: "both",
							inactive: "none"
						},
						outgoing: {
							initiator: "sendonly",
							responder: "recvonly",
							both: "sendrecv",
							none: "inactive",
							recvonly: "responder",
							sendonly: "initiator",
							sendrecv: "both",
							inactive: "none"
						}
					},
					responder: {
						incoming: {
							initiator: "sendonly",
							responder: "recvonly",
							both: "sendrecv",
							none: "inactive",
							recvonly: "responder",
							sendonly: "initiator",
							sendrecv: "both",
							inactive: "none"
						},
						outgoing: {
							initiator: "recvonly",
							responder: "sendonly",
							both: "sendrecv",
							none: "inactive",
							recvonly: "initiator",
							sendonly: "responder",
							sendrecv: "both",
							inactive: "none"
						}
					}
				}
			}, {}
		],
		36: [function (require, module, exports) {
				exports.lines = function (sdp) {
					return sdp.split("\r\n").filter(function (line) {
						return line.length > 0
					})
				},
				exports.findLine = function (prefix, mediaLines, sessionLines) {
					for (var prefixLength = prefix.length, i = 0; i < mediaLines.length; i++)
						if (mediaLines[i].substr(0, prefixLength) === prefix)
							return mediaLines[i];
					if (!sessionLines)
						return !1;
					for (var j = 0; j < sessionLines.length; j++)
						if (sessionLines[j].substr(0, prefixLength) === prefix)
							return sessionLines[j];
					return !1
				},
				exports.findLines = function (prefix, mediaLines, sessionLines) {
					for (var results = [], prefixLength = prefix.length, i = 0; i < mediaLines.length; i++)
						mediaLines[i].substr(0, prefixLength) === prefix && results.push(mediaLines[i]);
					if (results.length || !sessionLines)
						return results;
					for (var j = 0; j < sessionLines.length; j++)
						sessionLines[j].substr(0, prefixLength) === prefix && results.push(sessionLines[j]);
					return results
				},
				exports.mline = function (line) {
					for (var parts = line.substr(2).split(" "), parsed = {
							media: parts[0],
							port: parts[1],
							proto: parts[2],
							formats: []
						}, i = 3; i < parts.length; i++)
						parts[i] && parsed.formats.push(parts[i]);
					return parsed
				},
				exports.rtpmap = function (line) {
					var parts = line.substr(9).split(" "),
					parsed = {
						id: parts.shift()
					};
					return parts = parts[0].split("/"),
					parsed.name = parts[0],
					parsed.clockrate = parts[1],
					parsed.channels = 3 == parts.length ? parts[2] : "1",
					parsed
				},
				exports.sctpmap = function (line) {
					var parts = line.substr(10).split(" "),
					parsed = {
						number: parts.shift(),
						protocol: parts.shift(),
						streams: parts.shift()
					};
					return parsed
				},
				exports.fmtp = function (line) {
					for (var kv, key, value, parts = line.substr(line.indexOf(" ") + 1).split(";"), parsed = [], i = 0; i < parts.length; i++)
						kv = parts[i].split("="), key = kv[0].trim(), value = kv[1], key && value ? parsed.push({
							key: key,
							value: value
						}) : key && parsed.push({
							key: "",
							value: key
						});
					return parsed
				},
				exports.crypto = function (line) {
					var parts = line.substr(9).split(" "),
					parsed = {
						tag: parts[0],
						cipherSuite: parts[1],
						keyParams: parts[2],
						sessionParams: parts.slice(3).join(" ")
					};
					return parsed
				},
				exports.fingerprint = function (line) {
					var parts = line.substr(14).split(" ");
					return {
						hash: parts[0],
						value: parts[1]
					}
				},
				exports.extmap = function (line) {
					var parts = line.substr(9).split(" "),
					parsed = {},
					idpart = parts.shift(),
					sp = idpart.indexOf("/");
					return sp >= 0 ? (parsed.id = idpart.substr(0, sp), parsed.senders = idpart.substr(sp + 1)) : (parsed.id = idpart, parsed.senders = "sendrecv"),
					parsed.uri = parts.shift() || "",
					parsed
				},
				exports.rtcpfb = function (line) {
					var parts = line.substr(10).split(" "),
					parsed = {};
					return parsed.id = parts.shift(),
					parsed.type = parts.shift(),
					"trr-int" === parsed.type ? parsed.value = parts.shift() : parsed.subtype = parts.shift() || "",
					parsed.parameters = parts,
					parsed
				},
				exports.candidate = function (line) {
					var parts;
					parts = 0 === line.indexOf("a=candidate:") ? line.substring(12).split(" ") : line.substring(10).split(" ");
					for (var candidate = {
							foundation: parts[0],
							component: parts[1],
							protocol: parts[2].toLowerCase(),
							priority: parts[3],
							ip: parts[4],
							port: parts[5],
							type: parts[7],
							generation: "0"
						}, i = 8; i < parts.length; i += 2)
						"raddr" === parts[i] ? candidate.relAddr = parts[i + 1] : "rport" === parts[i] ? candidate.relPort = parts[i + 1] : "generation" === parts[i] ? candidate.generation = parts[i + 1] : "tcptype" === parts[i] && (candidate.tcpType = parts[i + 1]);
					return candidate.network = "1",
					candidate
				},
				exports.sourceGroups = function (lines) {
					for (var parsed = [], i = 0; i < lines.length; i++) {
						var parts = lines[i].substr(13).split(" ");
						parsed.push({
							semantics: parts.shift(),
							sources: parts
						})
					}
					return parsed
				},
				exports.sources = function (lines) {
					for (var parsed = [], sources = {}, i = 0; i < lines.length; i++) {
						var parts = lines[i].substr(7).split(" "),
						ssrc = parts.shift();
						if (!sources[ssrc]) {
							var source = {
								ssrc: ssrc,
								parameters: []
							};
							parsed.push(source),
							sources[ssrc] = source
						}
						parts = parts.join(" ").split(":");
						var attribute = parts.shift(),
						value = parts.join(":") || null;
						sources[ssrc].parameters.push({
							key: attribute,
							value: value
						})
					}
					return parsed
				},
				exports.groups = function (lines) {
					for (var parts, parsed = [], i = 0; i < lines.length; i++)
						parts = lines[i].substr(8).split(" "), parsed.push({
							semantics: parts.shift(),
							contents: parts
						});
					return parsed
				},
				exports.bandwidth = function (line) {
					var parts = line.substr(2).split(":"),
					parsed = {};
					return parsed.type = parts.shift(),
					parsed.bandwidth = parts.shift(),
					parsed
				}
			}, {}
		],
		21: [function (require, module, exports) {
				function dumpSDP(description) {
					return {
						type: description.type,
						sdp: description.sdp
					}
				}
				function dumpStream(stream) {
					var info = {
						label: stream.id
					};
					return stream.getAudioTracks().length && (info.audio = stream.getAudioTracks().map(function (track) {
								return track.id
							})),
					stream.getVideoTracks().length && (info.video = stream.getVideoTracks().map(function (track) {
								return track.id
							})),
					info
				}
				function TraceablePeerConnection(config, constraints) {
					var self = this;
					WildEmitter.call(this),
					this.peerconnection = new webrtc.PeerConnection(config, constraints),
					this.trace = function (what, info) {
						self.emit("PeerConnectionTrace", {
							time: new Date,
							type: what,
							value: info || ""
						})
					},
					this.onicecandidate = null,
					this.peerconnection.onicecandidate = function (event) {
						self.trace("onicecandidate", event.candidate),
						null !== self.onicecandidate && self.onicecandidate(event)
					},
					this.onaddstream = null,
					this.peerconnection.onaddstream = function (event) {
						self.trace("onaddstream", dumpStream(event.stream)),
						null !== self.onaddstream && self.onaddstream(event)
					},
					this.onremovestream = null,
					this.peerconnection.onremovestream = function (event) {
						self.trace("onremovestream", dumpStream(event.stream)),
						null !== self.onremovestream && self.onremovestream(event)
					},
					this.onsignalingstatechange = null,
					this.peerconnection.onsignalingstatechange = function (event) {
						self.trace("onsignalingstatechange", self.signalingState),
						null !== self.onsignalingstatechange && self.onsignalingstatechange(event)
					},
					this.oniceconnectionstatechange = null,
					this.peerconnection.oniceconnectionstatechange = function (event) {
						self.trace("oniceconnectionstatechange", self.iceConnectionState),
						null !== self.oniceconnectionstatechange && self.oniceconnectionstatechange(event)
					},
					this.onnegotiationneeded = null,
					this.peerconnection.onnegotiationneeded = function (event) {
						self.trace("onnegotiationneeded"),
						null !== self.onnegotiationneeded && self.onnegotiationneeded(event)
					},
					self.ondatachannel = null,
					this.peerconnection.ondatachannel = function (event) {
						self.trace("ondatachannel", event),
						null !== self.ondatachannel && self.ondatachannel(event)
					},
					this.getLocalStreams = this.peerconnection.getLocalStreams.bind(this.peerconnection),
					this.getRemoteStreams = this.peerconnection.getRemoteStreams.bind(this.peerconnection)
				}
				var util = require("util"),
				webrtc = require("webrtcsupport"),
				WildEmitter = require("wildemitter");
				util.inherits(TraceablePeerConnection, WildEmitter),
				Object.defineProperty(TraceablePeerConnection.prototype, "signalingState", {
					get: function () {
						return this.peerconnection.signalingState
					}
				}),
				Object.defineProperty(TraceablePeerConnection.prototype, "iceConnectionState", {
					get: function () {
						return this.peerconnection.iceConnectionState
					}
				}),
				Object.defineProperty(TraceablePeerConnection.prototype, "localDescription", {
					get: function () {
						return this.peerconnection.localDescription
					}
				}),
				Object.defineProperty(TraceablePeerConnection.prototype, "remoteDescription", {
					get: function () {
						return this.peerconnection.remoteDescription
					}
				}),
				TraceablePeerConnection.prototype.addStream = function (stream) {
					this.trace("addStream", dumpStream(stream)),
					this.peerconnection.addStream(stream)
				},
				TraceablePeerConnection.prototype.removeStream = function (stream) {
					this.trace("removeStream", dumpStream(stream)),
					this.peerconnection.removeStream(stream)
				},
				TraceablePeerConnection.prototype.createDataChannel = function (label, opts) {
					return this.trace("createDataChannel", label, opts),
					this.peerconnection.createDataChannel(label, opts)
				},
				TraceablePeerConnection.prototype.setLocalDescription = function (description, successCallback, failureCallback) {
					var self = this;
					this.trace("setLocalDescription", dumpSDP(description)),
					this.peerconnection.setLocalDescription(description, function () {
						self.trace("setLocalDescriptionOnSuccess"),
						successCallback()
					}, function (err) {
						self.trace("setLocalDescriptionOnFailure", err),
						failureCallback(err)
					})
				},
				TraceablePeerConnection.prototype.setRemoteDescription = function (description, successCallback, failureCallback) {
					var self = this;
					this.trace("setRemoteDescription", dumpSDP(description)),
					this.peerconnection.setRemoteDescription(description, function () {
						self.trace("setRemoteDescriptionOnSuccess"),
						successCallback()
					}, function (err) {
						self.trace("setRemoteDescriptionOnFailure", err),
						failureCallback(err)
					})
				},
				TraceablePeerConnection.prototype.close = function () {
					this.trace("stop"),
					null !== this.statsinterval && (window.clearInterval(this.statsinterval), this.statsinterval = null),
					"closed" != this.peerconnection.signalingState && this.peerconnection.close()
				},
				TraceablePeerConnection.prototype.createOffer = function (successCallback, failureCallback, constraints) {
					var self = this;
					this.trace("createOffer", constraints),
					this.peerconnection.createOffer(function (offer) {
						self.trace("createOfferOnSuccess", dumpSDP(offer)),
						successCallback(offer)
					}, function (err) {
						self.trace("createOfferOnFailure", err),
						failureCallback(err)
					}, constraints)
				},
				TraceablePeerConnection.prototype.createAnswer = function (successCallback, failureCallback, constraints) {
					var self = this;
					this.trace("createAnswer", constraints),
					this.peerconnection.createAnswer(function (answer) {
						self.trace("createAnswerOnSuccess", dumpSDP(answer)),
						successCallback(answer)
					}, function (err) {
						self.trace("createAnswerOnFailure", err),
						failureCallback(err)
					}, constraints)
				},
				TraceablePeerConnection.prototype.addIceCandidate = function (candidate, successCallback, failureCallback) {
					var self = this;
					this.trace("addIceCandidate", candidate),
					this.peerconnection.addIceCandidate(candidate, function () {
						successCallback && successCallback()
					}, function (err) {
						self.trace("addIceCandidateOnFailure", err),
						failureCallback && failureCallback(err)
					})
				},
				TraceablePeerConnection.prototype.getStats = function (callback, errback) {
					navigator.mozGetUserMedia ? this.peerconnection.getStats(null, callback, errback) : this.peerconnection.getStats(callback)
				},
				module.exports = TraceablePeerConnection
			}, {
				util: 9,
				webrtcsupport: 4,
				wildemitter: 5
			}
		],
		28: [function (require, module, exports) {
				function baseForOwn(object, iteratee) {
					return baseFor(object, iteratee, keys)
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function createBaseEach(eachFunc, fromRight) {
					return function (collection, iteratee) {
						var length = collection ? getLength(collection) : 0;
						if (!isLength(length))
							return eachFunc(collection, iteratee);
						for (var index = fromRight ? length : -1, iterable = toObject(collection); (fromRight ? index-- : ++index < length) && iteratee(iterable[index], index, iterable) !== !1; );
						return collection
					}
				}
				function createBaseFor(fromRight) {
					return function (object, iteratee, keysFunc) {
						for (var iterable = toObject(object), props = keysFunc(object), length = props.length, index = fromRight ? length : -1; fromRight ? index-- : ++index < length; ) {
							var key = props[index];
							if (iteratee(iterable[key], key, iterable) === !1)
								break
						}
						return object
					}
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				var keys = require("lodash.keys"),
				MAX_SAFE_INTEGER = 9007199254740991,
				baseEach = createBaseEach(baseForOwn),
				baseFor = createBaseFor(),
				getLength = baseProperty("length");
				module.exports = baseEach
			}, {
				"lodash.keys": 37
			}
		],
		38: [function (require, module, exports) {
				function arrayMap(array, iteratee) {
					for (var index = -1, length = array.length, result = Array(length); ++index < length; )
						result[index] = iteratee(array[index], index, array);
					return result
				}
				module.exports = arrayMap
			}, {}
		],
		32: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function toPath(value) {
					if (isArray(value))
						return value;
					var result = [];
					return baseToString(value).replace(rePropName, function (match, number, quote, string) {
						result.push(quote ? string.replace(reEscapeChar, "$1") : number || match)
					}),
					result
				}
				var isArray = require("lodash.isarray"),
				rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,
				reEscapeChar = /\\(\\)?/g;
				module.exports = toPath
			}, {
				"lodash.isarray": 34
			}
		],
		33: [function (require, module, exports) {
				function baseMap(collection, iteratee) {
					var index = -1,
					result = isArrayLike(collection) ? Array(collection.length) : [];
					return baseEach(collection, function (value, key, collection) {
						result[++index] = iteratee(value, key, collection)
					}),
					result
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function isArrayLike(value) {
					return null != value && isLength(getLength(value))
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function map(collection, iteratee, thisArg) {
					var func = isArray(collection) ? arrayMap : baseMap;
					return iteratee = baseCallback(iteratee, thisArg, 3),
					func(collection, iteratee)
				}
				var arrayMap = require("lodash._arraymap"),
				baseCallback = require("lodash._basecallback"),
				baseEach = require("lodash._baseeach"),
				isArray = require("lodash.isarray"),
				MAX_SAFE_INTEGER = 9007199254740991,
				getLength = baseProperty("length");
				module.exports = map
			}, {
				"lodash._arraymap": 38,
				"lodash._basecallback": 40,
				"lodash._baseeach": 39,
				"lodash.isarray": 34
			}
		],
		41: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function getNative(object, key) {
					var value = null == object ? void 0 : object[key];
					return isNative(value) ? value : void 0
				}
				function isNative(value) {
					return null == value ? !1 : objToString.call(value) == funcTag ? reIsNative.test(fnToString.call(value)) : isObjectLike(value) && reIsHostCtor.test(value)
				}
				function escapeRegExp(string) {
					return string = baseToString(string),
					string && reHasRegExpChars.test(string) ? string.replace(reRegExpChars, "\\$&") : string
				}
				var funcTag = "[object Function]",
				reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
				reHasRegExpChars = RegExp(reRegExpChars.source),
				reIsHostCtor = /^\[object .+?Constructor\]$/,
				objectProto = Object.prototype,
				fnToString = Function.prototype.toString,
				hasOwnProperty = objectProto.hasOwnProperty,
				objToString = objectProto.toString,
				reIsNative = RegExp("^" + escapeRegExp(fnToString.call(hasOwnProperty)).replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
				module.exports = getNative
			}, {}
		],
		42: [function (require, module, exports) {
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function isArrayLike(value) {
					return null != value && isLength(getLength(value))
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function isArguments(value) {
					return isObjectLike(value) && isArrayLike(value) && objToString.call(value) == argsTag
				}
				var argsTag = "[object Arguments]",
				objectProto = Object.prototype,
				objToString = objectProto.toString,
				MAX_SAFE_INTEGER = 9007199254740991,
				getLength = baseProperty("length");
				module.exports = isArguments
			}, {}
		],
		43: [function (require, module, exports) {
				function bindCallback(func, thisArg, argCount) {
					if ("function" != typeof func)
						return identity;
					if (void 0 === thisArg)
						return func;
					switch (argCount) {
					case 1:
						return function (value) {
							return func.call(thisArg, value)
						};
					case 3:
						return function (value, index, collection) {
							return func.call(thisArg, value, index, collection)
						};
					case 4:
						return function (accumulator, value, index, collection) {
							return func.call(thisArg, accumulator, value, index, collection)
						};
					case 5:
						return function (value, other, key, object, source) {
							return func.call(thisArg, value, other, key, object, source)
						}
					}
					return function () {
						return func.apply(thisArg, arguments)
					}
				}
				function identity(value) {
					return value
				}
				module.exports = bindCallback
			}, {}
		],
		39: [function (require, module, exports) {
				function baseForOwn(object, iteratee) {
					return baseFor(object, iteratee, keys)
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function createBaseEach(eachFunc, fromRight) {
					return function (collection, iteratee) {
						var length = collection ? getLength(collection) : 0;
						if (!isLength(length))
							return eachFunc(collection, iteratee);
						for (var index = fromRight ? length : -1, iterable = toObject(collection); (fromRight ? index-- : ++index < length) && iteratee(iterable[index], index, iterable) !== !1; );
						return collection
					}
				}
				function createBaseFor(fromRight) {
					return function (object, iteratee, keysFunc) {
						for (var iterable = toObject(object), props = keysFunc(object), length = props.length, index = fromRight ? length : -1; fromRight ? index-- : ++index < length; ) {
							var key = props[index];
							if (iteratee(iterable[key], key, iterable) === !1)
								break
						}
						return object
					}
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				var keys = require("lodash.keys"),
				MAX_SAFE_INTEGER = 9007199254740991,
				baseEach = createBaseEach(baseForOwn),
				baseFor = createBaseFor(),
				getLength = baseProperty("length");
				module.exports = baseEach
			}, {
				"lodash.keys": 44
			}
		],
		37: [function (require, module, exports) {
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function isArrayLike(value) {
					return null != value && isLength(getLength(value))
				}
				function isIndex(value, length) {
					return value = "number" == typeof value || reIsUint.test(value) ? +value : -1,
					length = null == length ? MAX_SAFE_INTEGER : length,
					value > -1 && value % 1 == 0 && length > value
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function shimKeys(object) {
					for (var props = keysIn(object), propsLength = props.length, length = propsLength && object.length, allowIndexes = !!length && isLength(length) && (isArray(object) || isArguments(object)), index = -1, result = []; ++index < propsLength; ) {
						var key = props[index];
						(allowIndexes && isIndex(key, length) || hasOwnProperty.call(object, key)) && result.push(key)
					}
					return result
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				function keysIn(object) {
					if (null == object)
						return [];
					isObject(object) || (object = Object(object));
					var length = object.length;
					length = length && isLength(length) && (isArray(object) || isArguments(object)) && length || 0;
					for (var Ctor = object.constructor, index = -1, isProto = "function" == typeof Ctor && Ctor.prototype === object, result = Array(length), skipIndexes = length > 0; ++index < length; )
						result[index] = index + "";
					for (var key in object)
						skipIndexes && isIndex(key, length) || "constructor" == key && (isProto || !hasOwnProperty.call(object, key)) || result.push(key);
					return result
				}
				var getNative = require("lodash._getnative"),
				isArguments = require("lodash.isarguments"),
				isArray = require("lodash.isarray"),
				reIsUint = /^\d+$/,
				objectProto = Object.prototype,
				hasOwnProperty = objectProto.hasOwnProperty,
				nativeKeys = getNative(Object, "keys"),
				MAX_SAFE_INTEGER = 9007199254740991,
				getLength = baseProperty("length"),
				keys = nativeKeys ? function (object) {
					var Ctor = null == object ? null : object.constructor;
					return "function" == typeof Ctor && Ctor.prototype === object || "function" != typeof object && isArrayLike(object) ? shimKeys(object) : isObject(object) ? nativeKeys(object) : []
				}
				 : shimKeys;
				module.exports = keys
			}, {
				"lodash._getnative": 41,
				"lodash.isarguments": 42,
				"lodash.isarray": 29
			}
		],
		40: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function baseCallback(func, thisArg, argCount) {
					var type = typeof func;
					return "function" == type ? void 0 === thisArg ? func : bindCallback(func, thisArg, argCount) : null == func ? identity : "object" == type ? baseMatches(func) : void 0 === thisArg ? property(func) : baseMatchesProperty(func, thisArg)
				}
				function baseGet(object, path, pathKey) {
					if (null != object) {
						void 0 !== pathKey && pathKey in toObject(object) && (path = [pathKey]);
						for (var index = 0, length = path.length; null != object && length > index; )
							object = object[path[index++]];
						return index && index == length ? object : void 0
					}
				}
				function baseIsMatch(object, matchData, customizer) {
					var index = matchData.length,
					length = index,
					noCustomizer = !customizer;
					if (null == object)
						return !length;
					for (object = toObject(object); index--; ) {
						var data = matchData[index];
						if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0]in object))
							return !1
					}
					for (; ++index < length; ) {
						data = matchData[index];
						var key = data[0],
						objValue = object[key],
						srcValue = data[1];
						if (noCustomizer && data[2]) {
							if (void 0 === objValue && !(key in object))
								return !1
						} else {
							var result = customizer ? customizer(objValue, srcValue, key) : void 0;
							if (!(void 0 === result ? baseIsEqual(srcValue, objValue, customizer, !0) : result))
								return !1
						}
					}
					return !0
				}
				function baseMatches(source) {
					var matchData = getMatchData(source);
					if (1 == matchData.length && matchData[0][2]) {
						var key = matchData[0][0],
						value = matchData[0][1];
						return function (object) {
							return null == object ? !1 : object[key] === value && (void 0 !== value || key in toObject(object))
						}
					}
					return function (object) {
						return baseIsMatch(object, matchData)
					}
				}
				function baseMatchesProperty(path, srcValue) {
					var isArr = isArray(path),
					isCommon = isKey(path) && isStrictComparable(srcValue),
					pathKey = path + "";
					return path = toPath(path),
					function (object) {
						if (null == object)
							return !1;
						var key = pathKey;
						if (object = toObject(object), (isArr || !isCommon) && !(key in object)) {
							if (object = 1 == path.length ? object : baseGet(object, baseSlice(path, 0, -1)), null == object)
								return !1;
							key = last(path),
							object = toObject(object)
						}
						return object[key] === srcValue ? void 0 !== srcValue || key in object : baseIsEqual(srcValue, object[key], void 0, !0)
					}
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function basePropertyDeep(path) {
					var pathKey = path + "";
					return path = toPath(path),
					function (object) {
						return baseGet(object, path, pathKey)
					}
				}
				function baseSlice(array, start, end) {
					var index = -1,
					length = array.length;
					start = null == start ? 0 : +start || 0,
					0 > start && (start = -start > length ? 0 : length + start),
					end = void 0 === end || end > length ? length : +end || 0,
					0 > end && (end += length),
					length = start > end ? 0 : end - start >>> 0,
					start >>>= 0;
					for (var result = Array(length); ++index < length; )
						result[index] = array[index + start];
					return result
				}
				function getMatchData(object) {
					for (var result = pairs(object), length = result.length; length--; )
						result[length][2] = isStrictComparable(result[length][1]);
					return result
				}
				function isKey(value, object) {
					var type = typeof value;
					if ("string" == type && reIsPlainProp.test(value) || "number" == type)
						return !0;
					if (isArray(value))
						return !1;
					var result = !reIsDeepProp.test(value);
					return result || null != object && value in toObject(object)
				}
				function isStrictComparable(value) {
					return value === value && !isObject(value)
				}
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function toPath(value) {
					if (isArray(value))
						return value;
					var result = [];
					return baseToString(value).replace(rePropName, function (match, number, quote, string) {
						result.push(quote ? string.replace(reEscapeChar, "$1") : number || match)
					}),
					result
				}
				function last(array) {
					var length = array ? array.length : 0;
					return length ? array[length - 1] : void 0
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				function identity(value) {
					return value
				}
				function property(path) {
					return isKey(path) ? baseProperty(path) : basePropertyDeep(path)
				}
				var baseIsEqual = require("lodash._baseisequal"),
				bindCallback = require("lodash._bindcallback"),
				isArray = require("lodash.isarray"),
				pairs = require("lodash.pairs"),
				reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
				reIsPlainProp = /^\w*$/,
				rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,
				reEscapeChar = /\\(\\)?/g;
				module.exports = baseCallback
			}, {
				"lodash._baseisequal": 45,
				"lodash._bindcallback": 43,
				"lodash.isarray": 34,
				"lodash.pairs": 46
			}
		],
		47: [function (require, module, exports) {
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function isTypedArray(value) {
					return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)]
				}
				var argsTag = "[object Arguments]",
				arrayTag = "[object Array]",
				boolTag = "[object Boolean]",
				dateTag = "[object Date]",
				errorTag = "[object Error]",
				funcTag = "[object Function]",
				mapTag = "[object Map]",
				numberTag = "[object Number]",
				objectTag = "[object Object]",
				regexpTag = "[object RegExp]",
				setTag = "[object Set]",
				stringTag = "[object String]",
				weakMapTag = "[object WeakMap]",
				arrayBufferTag = "[object ArrayBuffer]",
				float32Tag = "[object Float32Array]",
				float64Tag = "[object Float64Array]",
				int8Tag = "[object Int8Array]",
				int16Tag = "[object Int16Array]",
				int32Tag = "[object Int32Array]",
				uint8Tag = "[object Uint8Array]",
				uint8ClampedTag = "[object Uint8ClampedArray]",
				uint16Tag = "[object Uint16Array]",
				uint32Tag = "[object Uint32Array]",
				typedArrayTags = {};
				typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = !0,
				typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = !1;
				var objectProto = Object.prototype,
				objToString = objectProto.toString,
				MAX_SAFE_INTEGER = 9007199254740991;
				module.exports = isTypedArray
			}, {}
		],
		48: [function (require, module, exports) {
				function baseToString(value) {
					return "string" == typeof value ? value : null == value ? "" : value + ""
				}
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function getNative(object, key) {
					var value = null == object ? void 0 : object[key];
					return isNative(value) ? value : void 0
				}
				function isNative(value) {
					return null == value ? !1 : objToString.call(value) == funcTag ? reIsNative.test(fnToString.call(value)) : isObjectLike(value) && reIsHostCtor.test(value)
				}
				function escapeRegExp(string) {
					return string = baseToString(string),
					string && reHasRegExpChars.test(string) ? string.replace(reRegExpChars, "\\$&") : string
				}
				var funcTag = "[object Function]",
				reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
				reHasRegExpChars = RegExp(reRegExpChars.source),
				reIsHostCtor = /^\[object .+?Constructor\]$/,
				objectProto = Object.prototype,
				fnToString = Function.prototype.toString,
				hasOwnProperty = objectProto.hasOwnProperty,
				objToString = objectProto.toString,
				reIsNative = RegExp("^" + escapeRegExp(fnToString.call(hasOwnProperty)).replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
				module.exports = getNative
			}, {}
		],
		49: [function (require, module, exports) {
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function isArrayLike(value) {
					return null != value && isLength(getLength(value))
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function isArguments(value) {
					return isObjectLike(value) && isArrayLike(value) && objToString.call(value) == argsTag
				}
				var argsTag = "[object Arguments]",
				objectProto = Object.prototype,
				objToString = objectProto.toString,
				MAX_SAFE_INTEGER = 9007199254740991,
				getLength = baseProperty("length");
				module.exports = isArguments
			}, {}
		],
		46: [function (require, module, exports) {
				function toObject(value) {
					return isObject(value) ? value : Object(value)
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				function pairs(object) {
					object = toObject(object);
					for (var index = -1, props = keys(object), length = props.length, result = Array(length); ++index < length; ) {
						var key = props[index];
						result[index] = [key, object[key]]
					}
					return result
				}
				var keys = require("lodash.keys");
				module.exports = pairs
			}, {
				"lodash.keys": 44
			}
		],
		45: [function (require, module, exports) {
				function isObjectLike(value) {
					return !!value && "object" == typeof value
				}
				function arraySome(array, predicate) {
					for (var index = -1, length = array.length; ++index < length; )
						if (predicate(array[index], index, array))
							return !0;
					return !1
				}
				function baseIsEqual(value, other, customizer, isLoose, stackA, stackB) {
					return value === other ? !0 : null == value || null == other || !isObject(value) && !isObjectLike(other) ? value !== value && other !== other : baseIsEqualDeep(value, other, baseIsEqual, customizer, isLoose, stackA, stackB)
				}
				function baseIsEqualDeep(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
					var objIsArr = isArray(object),
					othIsArr = isArray(other),
					objTag = arrayTag,
					othTag = arrayTag;
					objIsArr || (objTag = objToString.call(object), objTag == argsTag ? objTag = objectTag : objTag != objectTag && (objIsArr = isTypedArray(object))),
					othIsArr || (othTag = objToString.call(other), othTag == argsTag ? othTag = objectTag : othTag != objectTag && (othIsArr = isTypedArray(other)));
					var objIsObj = objTag == objectTag,
					othIsObj = othTag == objectTag,
					isSameTag = objTag == othTag;
					if (isSameTag && !objIsArr && !objIsObj)
						return equalByTag(object, other, objTag);
					if (!isLoose) {
						var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"),
						othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
						if (objIsWrapped || othIsWrapped)
							return equalFunc(objIsWrapped ? object.value() : object, othIsWrapped ? other.value() : other, customizer, isLoose, stackA, stackB)
					}
					if (!isSameTag)
						return !1;
					stackA || (stackA = []),
					stackB || (stackB = []);
					for (var length = stackA.length; length--; )
						if (stackA[length] == object)
							return stackB[length] == other;
					stackA.push(object),
					stackB.push(other);
					var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isLoose, stackA, stackB);
					return stackA.pop(),
					stackB.pop(),
					result
				}
				function equalArrays(array, other, equalFunc, customizer, isLoose, stackA, stackB) {
					var index = -1,
					arrLength = array.length,
					othLength = other.length;
					if (arrLength != othLength && !(isLoose && othLength > arrLength))
						return !1;
					for (; ++index < arrLength; ) {
						var arrValue = array[index],
						othValue = other[index],
						result = customizer ? customizer(isLoose ? othValue : arrValue, isLoose ? arrValue : othValue, index) : void 0;
						if (void 0 !== result) {
							if (result)
								continue;
							return !1
						}
						if (isLoose) {
							if (!arraySome(other, function (othValue) {
									return arrValue === othValue || equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB)
								}))
								return !1
						} else if (arrValue !== othValue && !equalFunc(arrValue, othValue, customizer, isLoose, stackA, stackB))
							return !1
					}
					return !0
				}
				function equalByTag(object, other, tag) {
					switch (tag) {
					case boolTag:
					case dateTag:
						return +object == +other;
					case errorTag:
						return object.name == other.name && object.message == other.message;
					case numberTag:
						return object != +object ? other != +other : object == +other;
					case regexpTag:
					case stringTag:
						return object == other + ""
					}
					return !1
				}
				function equalObjects(object, other, equalFunc, customizer, isLoose, stackA, stackB) {
					var objProps = keys(object),
					objLength = objProps.length,
					othProps = keys(other),
					othLength = othProps.length;
					if (objLength != othLength && !isLoose)
						return !1;
					for (var index = objLength; index--; ) {
						var key = objProps[index];
						if (!(isLoose ? key in other : hasOwnProperty.call(other, key)))
							return !1
					}
					for (var skipCtor = isLoose; ++index < objLength; ) {
						key = objProps[index];
						var objValue = object[key],
						othValue = other[key],
						result = customizer ? customizer(isLoose ? othValue : objValue, isLoose ? objValue : othValue, key) : void 0;
						if (!(void 0 === result ? equalFunc(objValue, othValue, customizer, isLoose, stackA, stackB) : result))
							return !1;
						skipCtor || (skipCtor = "constructor" == key)
					}
					if (!skipCtor) {
						var objCtor = object.constructor,
						othCtor = other.constructor;
						if (objCtor != othCtor && "constructor" in object && "constructor" in other && !("function" == typeof objCtor && objCtor instanceof objCtor && "function" == typeof othCtor && othCtor instanceof othCtor))
							return !1
					}
					return !0
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				var isArray = require("lodash.isarray"),
				isTypedArray = require("lodash.istypedarray"),
				keys = require("lodash.keys"),
				argsTag = "[object Arguments]",
				arrayTag = "[object Array]",
				boolTag = "[object Boolean]",
				dateTag = "[object Date]",
				errorTag = "[object Error]",
				numberTag = "[object Number]",
				objectTag = "[object Object]",
				regexpTag = "[object RegExp]",
				stringTag = "[object String]",
				objectProto = Object.prototype,
				hasOwnProperty = objectProto.hasOwnProperty,
				objToString = objectProto.toString;
				module.exports = baseIsEqual
			}, {
				"lodash.isarray": 34,
				"lodash.istypedarray": 47,
				"lodash.keys": 44
			}
		],
		44: [function (require, module, exports) {
				function baseProperty(key) {
					return function (object) {
						return null == object ? void 0 : object[key]
					}
				}
				function isArrayLike(value) {
					return null != value && isLength(getLength(value))
				}
				function isIndex(value, length) {
					return value = "number" == typeof value || reIsUint.test(value) ? +value : -1,
					length = null == length ? MAX_SAFE_INTEGER : length,
					value > -1 && value % 1 == 0 && length > value
				}
				function isLength(value) {
					return "number" == typeof value && value > -1 && value % 1 == 0 && MAX_SAFE_INTEGER >= value
				}
				function shimKeys(object) {
					for (var props = keysIn(object), propsLength = props.length, length = propsLength && object.length, allowIndexes = !!length && isLength(length) && (isArray(object) || isArguments(object)), index = -1, result = []; ++index < propsLength; ) {
						var key = props[index];
						(allowIndexes && isIndex(key, length) || hasOwnProperty.call(object, key)) && result.push(key)
					}
					return result
				}
				function isObject(value) {
					var type = typeof value;
					return !!value && ("object" == type || "function" == type)
				}
				function keysIn(object) {
					if (null == object)
						return [];
					isObject(object) || (object = Object(object));
					var length = object.length;
					length = length && isLength(length) && (isArray(object) || isArguments(object)) && length || 0;
					for (var Ctor = object.constructor, index = -1, isProto = "function" == typeof Ctor && Ctor.prototype === object, result = Array(length), skipIndexes = length > 0; ++index < length; )
						result[index] = index + "";
					for (var key in object)
						skipIndexes && isIndex(key, length) || "constructor" == key && (isProto || !hasOwnProperty.call(object, key)) || result.push(key);
					return result
				}
				var getNative = require("lodash._getnative"),
				isArguments = require("lodash.isarguments"),
				isArray = require("lodash.isarray"),
				reIsUint = /^\d+$/,
				objectProto = Object.prototype,
				hasOwnProperty = objectProto.hasOwnProperty,
				nativeKeys = getNative(Object, "keys"),
				MAX_SAFE_INTEGER = 9007199254740991,
				getLength = baseProperty("length"),
				keys = nativeKeys ? function (object) {
					var Ctor = null == object ? null : object.constructor;
					return "function" == typeof Ctor && Ctor.prototype === object || "function" != typeof object && isArrayLike(object) ? shimKeys(object) : isObject(object) ? nativeKeys(object) : []
				}
				 : shimKeys;
				module.exports = keys
			}, {
				"lodash._getnative": 48,
				"lodash.isarguments": 49,
				"lodash.isarray": 34
			}
		]
	}, {}, [1])(1)
});
function initializePlayer(r, a) {
	if (c("Initializing player..."), b(254), "undefined" == typeof a && (a = !1), "undefined" == typeof r ? R = !0 : (I = r, R = !1), window.MediaSource = window.MediaSource || window.WebKitMediaSource, !window.MediaSource)
		throw alert("MediaSource API is not enabled or supported!"), new Error("MediaSource API is not enabled or supported!");
	M || (S = document.getElementById("videoElement"), a ? S.poster = "loading.gif" : S.poster = "evo.png", E = new MediaSource, E.addEventListener("sourceopen", e, !1), S.src = g.createObjectURL(E), S.load(), T = document.getElementById("debugPane"))
}
function e() {
	c("Media source is now ready."),
	u(p),
	M = !0,
	r(),
	E.removeEventListener("sourceopen", e)
}
function r() {
	if (M && null !== I) {
		if (!MediaSource.isTypeSupported(I))
			throw alert("Codec " + I + " is not supported!"), new Error("Codec " + I + " is not supported!");
		c("Initializing source buffer..."),
		b(253);
		try {
			B = E.addSourceBuffer(I)
		} catch (e) {
			c("Adding new source buffer failed: " + e.message)
		}
		L = 0,
		t(),
		a(!1)
	}
}
function feedFragment(e) {
	for (; y > e; ) {
		if (!MediaSource.isTypeSupported(I))
			throw alert("Codec " + I + " is not supported!"), new Error("Codec " + I + " is not supported!");
		try {
			B = E.addSourceBuffer(I)
		} catch (r) {
			c("Adding new source buffer failed: " + r.message)
		}
		t(),
		e++
	}
}
function a(e) {
	M && (F.a = null, F.c = null, F.d = null, F.e = null, F.f = null, F.g = !1, F.h = e)
}
function n(e) {
	return ("00" + e.toString(16)).slice(-2)
}
function u(e) {
	if (249 !== e)
		switch (e) {
		case w:
			F.g = !0;
			break;
		case p:
			var u = rawBuffer[4];
			0 == u ? (F.b = rawBuffer.subarray(4), u = 3, c("Older video format")) : 240 === (240 & u) ? (R && (P = "avc1." + n(rawBuffer[5]) + n(rawBuffer[6]) + n(rawBuffer[7])), F.b = rawBuffer.subarray(8), u = 15 & u) : F.b = rawBuffer.subarray(5),
			feedFragment(u),
			R ? r() : t();
			break;
		case v:
			if (!F.g)
				break;
			null === F.e ? F.e = rawBuffer.subarray(4) : F.e = f(F.e, rawBuffer.subarray(4));
			break;
		case m:
			if (!F.g)
				break;
			null === F.f ? F.f = rawBuffer.subarray(4) : F.f = f(F.f, rawBuffer.subarray(4));
			break;
		case y:
			if (!F.g)
				break;
			null === F.c ? F.c = rawBuffer.subarray(4) : F.c = f(F.c, rawBuffer.subarray(4));
			break;
		case h:
			if (!F.g)
				break;
			F.d = rawBuffer.subarray(4);
			break;
		case k:
			if (!F.g)
				break;
			F.a = f(F.h ? F.b : null, F.c, F.d, F.e, F.f),
			s(B, F.a),
			b(179);
			break;
		default:
			a(!0)
		}
}
function t() {
	if (B && F.b) {
		B.addEventListener("updateend", d);
		try {
			B.appendBuffer(F.b)
		} catch (e) {
			c("Failed adding initialization data: " + e.message)
		}
	}
}
function parseData(e) {
	switch (e[0]) {
	case p:
		F.g = !0,
		u(e[0]);
		break;
	case w:
		var i = e[4];
		0 == i ? (F.b = e.subarray(4), i = 3, c("Older video format")) : 240 === (240 & i) ? (R && (P = "avc1." + n(e[5]) + n(e[6]) + n(e[7])), F.b = e.subarray(8), i = 15 & i) : F.b = e.subarray(5),
		R ? (I = 3 === i ? 'video/mp4;codecs="' + P + "," + U + '"' : 1 === i ? 'video/mp4;codecs="' + P + '"' : 'video/mp4;codecs="' + U + '"', r()) : t();
		break;
	case m:
		if (!F.g)
			break;
		null === F.e ? F.e = e.subarray(4) : F.e = f(F.e, e.subarray(4));
		break;
	case v:
		if (!F.g)
			break;
		null === F.f ? F.f = e.subarray(4) : F.f = f(F.f, e.subarray(4));
		break;
	case y:
		if (!F.g)
			break;
		null === F.c ? F.c = e.subarray(4) : F.c = f(F.c, e.subarray(4));
		break;
	case h:
		if (!F.g)
			break;
		F.d = e.subarray(4);
		break;
	case k:
		if (!F.g)
			break;
		F.a = f(F.h ? F.b : null, F.c, F.d, F.e, F.f),
		s(B, F.a),
		a(!1);
		break;
	default:
		a(!0)
	}
}
function f() {
	for (var e = 0, r = 0; r < arguments.length; r++)
		null !== arguments[r] && (e += arguments[r].length);
	var a = new Uint8Array(e);
	e = 0;
	for (var r = 0; r < arguments.length; r++)
		null !== arguments[r] && (a.set(arguments[r], e), e += arguments[r].length);
	return a
}
function i(e, r) {
	var n = r;
	try {
		c("Adding data..."),
		B.appendBuffer(e)
	} catch (u) {
		return c("AppendBuffer issue. Possible codec mismatch."),
		a(!0),
		void feedFragment(253)
	}
	B.buffered && B.buffered.length && (!n || B.buffered.length > D) && (D = B.buffered.length, 1 !== D ? (c("Time range(s): " + D), n = S.buffered.start(S.buffered.length - 1)) : (n = S.buffered.end(S.buffered.length - 1) - .5, 0 > n && (n = 0)), c("Playing video..."), S.currentTime = n, S.play()),
	L = n
}
function o() {
	return "open" !== E.readyState ? (c("Media source not open! State: " + E.readyState), !1) : 0 === E.sourceBuffers.length ? (c("No available media source buffer!"), !1) : B.updating ? (c("Source buffer still updating!"), z = 0, !1) : A
}
function d() {
	c("Initialization data added."),
	B.removeEventListener("updateend", d),
	A = !0,
	o() && O.length > 0 && i(O.shift(), 0)
}
function s(e, r) {
	if (M) {
		O.push(r);
		var a = S.currentTime,
		n = Date.now();
		if (a === L) {
			0 === C && (C = n);
			var u = (n - C) / 1e3;
			if (z && (c("Timestamp: " + a), c("Frozen for " + u + " second(s).")), z > 2 && u > 5 || u > 15)
				return stopPlayer(!0), void initializePlayer(I, !0);
			z++
		} else
			z = 0, C = n;
		o() && i(O.shift(), a)
	}
}
function stopPlayer(e) {
	M && ( "undefined" == typeof e && (e = !1), e || (S.poster = "evo.png", I = null), feedFragment(254), O = [], B = null, S = null, E = null, M = !1, L = 0, A = !1, z = 0, C = 0)
}
function l(e) {
	"undefined" == typeof e && (e = !0),
	fmp4LogEnabled = e
}
function c(e) {
	if (T && fmp4LogEnabled) {
		var r = "<p><b>" + Date.now() + "</b>: " + e + "</p>";
		T.insertAdjacentHTML("afterbegin", r)
	}
}
function showDebugMessages(e) {
	l(e),
	e ? document.getElementById("debugPane").style.display = "block" : document.getElementById("debugPane").style.display = "none"
}
function b(e) {
	for (; w > e && (u(243), M); ) {
		var r = S.currentTime,
		a = Date.now();
		if (r === L) {
			0 === C && (C = a);
			var n = (a - C) / 1e3;
			if (z && (c("Timestamp: " + r), c("Frozen for " + n + " second(s).")), z > 2 && n > 5 || n > 15)
				return stopPlayer(!0), void initializePlayer(I, !0);
			z++
		} else
			z = 0, C = a;
		o() && i(O.shift(), r)
	}
}
var g = window.URL || window.webkitURL || window.mozURL || window.msURL, p = 249, w = 250, y = 251, m = 252, v = 253, h = 254, k = 255, B = null, S, fmp4LogEnabled = !1, E = null, M = !1, L = 0, I = null, T = null, A = !1, z = 0, P = "avc1.4D401F", U = "mp4a.40.2", R = !0, C = 0, D = 1, F = {
	a: null,
	b: null,
	c: null,
	d: null,
	e: null,
	f: null,
	g: !1,
	h: !1
}, O = [];
function Log(msg, divName) {
	if (fmp4LogEnabled) {
		var msgHtml = "<p><b>" + Date.now() + "</b>: " + msg + "</p>";
		divName.insertAdjacentHTML("afterbegin", msgHtml)
	}
}
function LogObject(msg, obj, divName) {
	if (null !== obj) {
		"" !== msg && (msg += " ");
		var cache = [];
		Log(msg + JSON.stringify(obj, function (key, value) {
				if ("object" == typeof value && null !== value) {
					if (-1 !== cache.indexOf(value))
						return;
					cache.push(value)
				}
				return value
			}), divName),
		cache = null
	}
}
function sendFmp4Request() {
	if (!fmp4RequestSent) {
		Log("Sending request for fmp4...", debugPane);
		var payload = {
			name: streamName
		};
		webrtc.sendDirectlyToAll("emsCommandChannel", "fmp4Request", payload),
		fmp4RequestSent = !0
	}
}
function evoDoWebRtc(tStream, tRoom, tErsip, token) {
	tStream && (streamName = tStream),
	tRoom && (roomName = tRoom),
	tErsip && (ersIpStr = tErsip),
	debugPane = document.getElementById("debugPane"),
	fmp4RequestSent = !1,
	webrtc = new SimpleWebRTC({
			url: "http://" + ersIpStr,
			localVideoEl: "",
			remoteVideosEl: "",
			autoRequestMedia: !1,
			receiveMedia: {
				offerToReceiveAudio: 0,
				offerToReceiveVideo: 0
			}
		}),
	webrtc.on("channelClose", function (channel) {
		Log("channelClose " + channel.label, debugPane)
	}),
	webrtc.on("channelError", function (channel) {
		Log("channelError " + channel.label, debugPane)
	}),
	webrtc.on("channelOpen", function (channel) {
		Log("channelOpen " + channel.label, debugPane),
		sendFmp4Request(),
		"emsStreamChannel" === channel.label && (channel.binaryType = "arraybuffer", initializePlayer())
	}),
	webrtc.on("createdPeer", function (peer) {
		Log("Peer " + peer.id + " created.", debugPane),
		peer && peer.pc && peer.pc.on("iceConnectionStateChange", function (event) {
			switch (peer.pc.iceConnectionState) {
			case "checking":
				Log("Connecting to peer " + peer.id + "...", debugPane);
				break;
			case "connected":
			case "completed":
				Log("Connection established with " + peer.id, debugPane);
				break;
			case "disconnected":
				Log("Disconnected.", debugPane);
				break;
			case "failed":
				Log("Connection failed.", debugPane);
				break;
			case "closed":
				Log("Connection closed.", debugPane)
			}
		})
	}),
	webrtc.on("channelMessage", function (peer, label, data) {
		if ("emsCommandChannel" === label && ("metadata" === data.type ? handleMetadata(data.payload.data, data.payload.timestamp) : LogObject("Command:", data, debugPane)), "emsStreamChannel" === label) {
			var arrayView = new Uint8Array(data);
			parseData(arrayView)
		}
	}),
	webrtc.on("joinedRoom", function (name) {
		Log("Joined room " + name, debugPane)
	}),
	webrtc.on("connectionReady", function () {
		Log("Connection ready.", debugPane)
	});
	var data = {
		token: token
	};
	webrtc.joinRoom(roomName, data, function (err, res) {
		LogObject("Error:", err, debugPane),
		LogObject("Result:", res, debugPane)
	})
}
function registerMetadataHandler(handler) {
	handleMetadata = handler
}
var debugPane, fmp4RequestSent = !1, webrtc, parseParameters = function () {
	var str = window.location.search,
	objURL = {};
	return str.replace(new RegExp("([^?=&]+)(=([^&]*))?", "g"), function ($0, $1, $2, $3) {
		objURL[$1] = $3
	}),
	objURL
}, roomName = "ThisIsATestRoomName", streamName = "test1", ersIpStr = "52.6.14.61:3535", handleMetadata = function (metadata, timestamp) {
	Log("Metadata timestamp: " + timestamp, debugPane),
	LogObject("Metadata payload:", metadata, debugPane)
};

var emsVideo = {
		SPIKE_BUFFER: null,
		SPIKE_RANGE: 5e3,
		SPIKE_TIMEOUT: null,
		SIMULATE_SPIKES: !1,
		hasAudio: !0,
		bufferTime: 1.1,
		segmentLength: 1.1,
		end: 0,
		appendTimes: null,
		segmentLengths: null,
		isReady: !1,
		isPlaying: !1,
		playbackRate: 1,
		mediaSource: null,
		init: function () {
			var e,
			t;
			return t = this.mediaSource,
			t && (this.cleanup(), t.endOfStream()),
			t = this.mediaSource = new MediaSource,
			this.sourceBufferReady = !1,
			e = function () {
				var e;
				return this.mediaSource && "open" === this.mediaSource.readyState ? (e = t.addSourceBuffer('video/mp4;codecs="avc1.4D0029' + ("") + '"'), e.addEventListener("error", function () {
						this.cleanup()
					}
						.bind(this)), e.addEventListener("abort", function () {
						this.cleanup()
					}
						.bind(this)), this.sourceBuffer = e, this.syncInterval && (window.clearInterval(this.syncInterval), this.syncInterval = null), this.sourceBufferReady = !0, void(this.syncInterval = window.setInterval(this.bufferCheck.bind(this), 300))) : void this.cleanup()
			}
			.bind(this),
			t.addEventListener("sourceopen", e),
			t.addEventListener("webkitsourceopen", e)
		},
		attachVideo: function () {
			e = document.getElementById("videoElement");
			return e && this.mediaSource && (e.src = window.URL.createObjectURL(this.mediaSource))
		},
		concatBuffers: function () {
			var e,
			t,
			n,
			r,
			i;
			for (e = [], r = 0, n = 0; n < arguments.length; n++)
				arguments[n] && (t = {
						index: r,
						buffer: arguments[n]
					}, r += t.buffer.byteLength, e.push(t));
			for (i = new Uint8Array(r), n = 0; n < e.length; n++)
				t = e[n], i.set(new Uint8Array(t.buffer), t.index);
			return i.buffer
		},
		download: function () {
			var e,
			t;
			e = document.createElement("a"),
			document.body.appendChild(e),
			e.style = "display : none",
			t = new Blob([this.fmp4Data], {
					type: "video/mp4"
				}),
			e.href = window.URL.createObjectURL(t),
			e.download = "fmp4.mp4",
			e.click(),
			window.URL.revokeObjectURL(e.href),
			document.body.removeChild(e)
		},
		appendSegment: function (e) {
			var t,
			n,
			r,
			i,
			a,
			s,
			o,
			l,
			c,
			d,
			h;
			if (c = this.sourceBuffer, l = this.appendTimes = this.appendTimes || [], h = this.segmentLengths = this.segmentLengths || [], o = 0)
				if (c.updating || c.closed)
					n = function () {
						c.removeEventListener("update", n),
						this.appendSegment(e)
					}
			.bind(this),
			c.addEventListener("update", n);
			else {
				a = this.concatBuffers(e.moov, e.moof, e.mdat, e.video, e.audio),
				App.get("session.debugMode") && (this.fmp4Data = this.concatBuffers(this.fmp4Data, a)),
				s = function () {
					if (r && !c.closed) {
						if (l.push(Date.now()), l.length > 40 && l.splice(0, l.length - 40), i = c.buffered.end(c.buffered.length - 1), d = Math.ceil(100 * (i - r)) / 100) {
							for (t = 0; t < h.length; t++)
								d = Math.max(d || 0, h[t]);
							for (this.set("segmentLength", d), h.push(d), h.length > 10 && h.splice(0, h.length - 10), t = 0; t < l.length; t++)
								o = Math.max(o, (l[t + 1] || Date.now()) - l[t]);
							o = o > 1500 ? o + 2e3 : o,
							o = Math.max(d, o / 1e3),
							this.set("bufferTime", o),
							l.length > 3 && this.trigger(Date.now() - l[0] > l.length * d * 1e3 ? "bw2low" : "bwok"),
							this.bufferCheck()
						}
						c.removeEventListener("updateend", s)
					}
				}
				.bind(this),
				r = c.buffered.length ? c.buffered.end(c.buffered.length - 1) : null;
				try {
					c.appendBuffer(a)
				} catch (u) {
					this.cleanup()
				}
				c.addEventListener("updateend", s)
			}
		},
		bufferCheck: function () {
			var e,
			t,
			n,
			r,
			i,
			a,
			s,
			o,
			l,
			c;
			if (i =  document.getElementById("videoElement"), l = this.sourceBuffer, !l.updating && !l.closed && l.buffered) {
				if (t = l.buffered.length, !t)
					return;
				if (n = l.buffered.end(t - 1), r = l.buffered.start(0), s = n - r, App.session.get("debugMode") && l.buffered.length > 1)
					for (e = 0; e < l.buffered.length; e++)
						console.log({
							i: e,
							gap: e > 0 ? l.buffered.start(e) - l.buffered.end(e - 1) : 0,
							s: l.buffered.start(e),
							e: l.buffered.end(e)
						});
				if (s > o && (this.trigger("ready"), !i)
					return;
				a = i.currentTime,
				this.set("end", n),
				this.set("start", r),
				this.set("current", a),
				i.readyState > 0 && ((o >= 1.5 ? .5 : .1) >= n - a ? (this.trigger("buffering"), i.paused || (i.pause(), this.isPlaying = !1)) : (!a && s > o ? i.currentTime = Math.max(r, n - o, a) : a && a === this.lastCurrentTime ? a = i.currentTime = Math.max(r, Math.min(n, a + .1)) : n - o - 2 * c > a ? 1.2 !== this.playbackRate && (i.playbackRate = this.playbackRate = 1.2) : a >= n - o && 1 !== this.playbackRate && (i.playbackRate = this.playbackRate = 1), this.trigger("playing"), i.play(), this.isPlaying = !0), a > 2 && !l.updating && l.remove(0, a - 1)),
				this.lastCurrentTime = a
			}
		},
		appendChunk: function (e) {
			var t,
			n,
			r,
			i,
			a,
			s,
			o = 249,
			l = 250,
			c = 251,
			d = 252,
			h = 253,
			u = 254,
			p = 255;
			if (s = this.sourceBuffer, this.leftoverBytes = this.leftoverBytes || [], this.leftoverBytes.length && (e && this.leftoverBytes.push(e), e = this.concatBuffers.apply(this, this.leftoverBytes), this.leftoverBytes = []), e && e.byteLength) {
				if (t = new Uint8Array(e.slice(0, 4)), r = t[0], a = (t[1] << 8 | t[2]) << 8 | t[3], e.byteLength < a + 4 || !this.sourceBufferReady)
					return void this.leftoverBytes.push(e);
				switch (i = e.slice(4, 4 + a), n = this.currentSegment = this.currentSegment || {}, r) {
				case o:
				    console.log(o + ' = case o');
					n.hasBegin = !0;
					break;
				case l:
				    console.log(l + ' = case l');
					n.moov = this.concatBuffers(n.moov, i);
					break;
				case c:
				    console.log(c + ' = case c');
					n.moof = this.concatBuffers(n.moof, i);
					break;
				case u:
				    console.log(u + ' = case u');
					n.mdat = this.concatBuffers(n.mdat, i);
					break;
				case d:
				    console.log(d + ' = case d');
					n.video = this.concatBuffers(n.video, i);
					break;
				case h:
				    console.log(h + ' = case h');
					n.audio = this.concatBuffers(n.audio, i);
					break;
				case p:
				    console.log(p + ' = case p');
					n.hasBegin && (this.SIMULATE_SPIKES ? (this.SPIKE_BUFFER = this.SPIKE_BUFFER || [], this.SPIKE_BUFFER.push(n), this.SPIKE_TIMEOUT || (this.SPIKE_TIMEOUT = setTimeout(function (e) {
										for (this.SPIKE_TIMEOUT = null, e = 0; e < this.SPIKE_BUFFER.length; e++)
											this.appendSegment(this.SPIKE_BUFFER[e]);
										this.SPIKE_BUFFER = []
									}
										.bind(this), Math.random() * this.SPIKE_RANGE))) : this.appendSegment(n)),
					this.currentSegment = {},
					n.hasBegin || (this.currentSegment.moov = n.moov)
				}
				e.byteLength > 4 + a && (this.leftoverBytes.push(e.slice(4 + a)), this.appendChunk())
			}
		},
		cleanup: function () {
			var e = this.mediaSource;
			if (this.currentSegment = null, this.syncInterval && (window.clearInterval(this.syncInterval), this.syncInterval = null), e)
				for (; e.sourceBuffers.length; )
					e.sourceBuffers[0].abort(), e.sourceBuffers[0].closed = !0, e.removeSourceBuffer(e.sourceBuffers[0]);
			(this.video && (this.video.src = ""))
		}
	}
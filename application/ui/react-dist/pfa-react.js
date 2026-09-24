//#region \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (e, n) => {
	let r = {};
	for (var i in e) t(r, i, {
		get: e[i],
		enumerable: !0
	});
	return n || t(r, Symbol.toStringTag, { value: "Module" }), r;
}, c = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, l = (n, r, o) => (o = n == null ? {} : e(i(n)), c(r || !n || !n.__esModule || !a.call(n, "default") ? t(o, "default", {
	value: n,
	enumerable: !0
}) : o, n)), u = /* @__PURE__ */ o(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.for("react.activity"), p = Symbol.for("react.view_transition"), m = Symbol.iterator;
	function h(e) {
		return typeof e != "object" || !e ? null : (e = m && e[m] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var g = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, _ = Object.assign, v = {};
	function y(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	y.prototype.isReactComponent = {}, y.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, y.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function b() {}
	b.prototype = y.prototype;
	function x(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	var S = x.prototype = new b();
	S.constructor = x, _(S, y.prototype), S.isPureReactComponent = !0;
	var C = Array.isArray;
	function w() {}
	var T = {
		H: null,
		A: null,
		T: null,
		S: null
	}, E = Object.prototype.hasOwnProperty;
	function D(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function O(e, t) {
		return D(e.type, t, e.props);
	}
	function k(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function A(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var j = /\/+/g;
	function M(e, t) {
		return typeof e == "object" && e && e.key != null ? A("" + e.key) : t.toString(36);
	}
	function N(e) {
		switch (e.status) {
			case "fulfilled": return e.value;
			case "rejected": throw e.reason;
			default: switch (typeof e.status == "string" ? e.then(w, w) : (e.status = "pending", e.then(function(t) {
				e.status === "pending" && (e.status = "fulfilled", e.value = t);
			}, function(t) {
				e.status === "pending" && (e.status = "rejected", e.reason = t);
			})), e.status) {
				case "fulfilled": return e.value;
				case "rejected": throw e.reason;
			}
		}
		throw e;
	}
	function ee(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "bigint":
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n:
					c = !0;
					break;
				case d: return c = e._init, ee(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + M(e, 0) : a, C(o) ? (i = "", c != null && (i = c.replace(j, "$&/") + "/"), ee(o, r, i, "", function(e) {
			return e;
		})) : o != null && (k(o) && (o = O(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(j, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (C(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + M(a, u), c += ee(a, r, i, s, o);
		else if (u = h(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + M(a, u++), c += ee(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return ee(N(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function P(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return ee(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function F(e) {
		if (e._status === -1) {
			var t = e._result, n = t();
			n.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t, n.status === void 0 && (n.status = "fulfilled", n.value = t));
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t, n.status === void 0 && (n.status = "rejected", n.reason = t));
			}), e._status === -1 && (e._status = 0, e._result = n);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var te = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	};
	function ne(e) {
		var t = T.T, n = {};
		n.types = t === null ? null : t.types, T.T = n;
		try {
			var r = e(), i = T.S;
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(w, te);
		} catch (e) {
			te(e);
		} finally {
			t !== null && n.types !== null && (t.types = n.types), T.T = t;
		}
	}
	function re(e) {
		var t = T.T;
		if (t !== null) {
			var n = t.types;
			n === null ? t.types = [e] : n.indexOf(e) === -1 && n.push(e);
		} else ne(re.bind(null, e));
	}
	var ie = {
		map: P,
		forEach: function(e, t, n) {
			P(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return P(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return P(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!k(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = ie, e.Component = y, e.Fragment = r, e.Profiler = a, e.PureComponent = x, e.StrictMode = i, e.Suspense = l, e.ViewTransition = p, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = T, e.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(e) {
			return T.H.useMemoCache(e);
		}
	}, e.addTransitionType = re, e.cache = function(e) {
		return function() {
			return e.apply(null, arguments);
		};
	}, e.cacheSignal = function() {
		return null;
	}, e.cloneElement = function(e, t, n) {
		if (e == null) throw Error("The argument must be a React element, but you passed " + e + ".");
		var r = _({}, e.props), i = e.key;
		if (t != null) for (a in t.key !== void 0 && (i = "" + t.key), t) !E.call(t, a) || a === "key" || a === "__self" || a === "__source" || a === "ref" && t.ref === void 0 || (r[a] = t[a]);
		var a = arguments.length - 2;
		if (a === 1) r.children = n;
		else if (1 < a) {
			for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2];
			r.children = o;
		}
		return D(e.type, i, r);
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		}, e.Provider = e, e.Consumer = {
			$$typeof: o,
			_context: e
		}, e;
	}, e.createElement = function(e, t, n) {
		var r, i = {}, a = null;
		if (t != null) for (r in t.key !== void 0 && (a = "" + t.key), t) E.call(t, r) && r !== "key" && r !== "__self" && r !== "__source" && (i[r] = t[r]);
		var o = arguments.length - 2;
		if (o === 1) i.children = n;
		else if (1 < o) {
			for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2];
			i.children = s;
		}
		if (e && e.defaultProps) for (r in o = e.defaultProps, o) i[r] === void 0 && (i[r] = o[r]);
		return D(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = k, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: F
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = ne, e.unstable_useCacheRefresh = function() {
		return T.H.useCacheRefresh();
	}, e.use = function(e) {
		return T.H.use(e);
	}, e.useActionState = function(e, t, n) {
		return T.H.useActionState(e, t, n);
	}, e.useCallback = function(e, t) {
		return T.H.useCallback(e, t);
	}, e.useContext = function(e) {
		return T.H.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e, t) {
		return T.H.useDeferredValue(e, t);
	}, e.useEffect = function(e, t) {
		return T.H.useEffect(e, t);
	}, e.useEffectEvent = function(e) {
		return T.H.useEffectEvent(e);
	}, e.useId = function() {
		return T.H.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return T.H.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return T.H.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return T.H.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return T.H.useMemo(e, t);
	}, e.useOptimistic = function(e, t) {
		return T.H.useOptimistic(e, t);
	}, e.useReducer = function(e, t, n) {
		return T.H.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return T.H.useRef(e);
	}, e.useState = function(e) {
		return T.H.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return T.H.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return T.H.useTransition();
	}, e.version = "19.3.0";
})), d = /* @__PURE__ */ o(((e, t) => {
	t.exports = u();
})), f = /* @__PURE__ */ o(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) {
			if (n(c) !== null) m = !0, S || (S = !0, O());
			else {
				var t = n(l);
				t !== null && j(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function D() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && j(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? O() : S = !1;
			}
		}
	}
	var O;
	if (typeof y == "function") O = function() {
		y(D);
	};
	else if (typeof MessageChannel < "u") {
		var k = new MessageChannel(), A = k.port2;
		k.port1.onmessage = D, O = function() {
			A.postMessage(null);
		};
	} else O = function() {
		_(D, 0);
	};
	function j(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, j(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, O()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), p = /* @__PURE__ */ o(((e, t) => {
	t.exports = f();
})), m = /* @__PURE__ */ o(((e) => {
	var t = d();
	function n(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function r() {}
	var i = {
		d: {
			f: r,
			r: function() {
				throw Error(n(522));
			},
			D: r,
			C: r,
			L: r,
			m: r,
			X: r,
			S: r,
			M: r
		},
		p: 0,
		findDOMNode: null
	}, a = Symbol.for("react.portal"), o = Symbol.for("react.recoverable"), s = Symbol.for("react.optimistic_key");
	function c(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: a,
			key: r == null ? null : r === s ? s : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var l = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function u(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = i, e.browser = function(e) {
		return {
			$$typeof: o,
			_reason: e
		};
	}, e.createPortal = function(e, t) {
		var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(n(299));
		return c(e, t, null, r);
	}, e.flushSync = function(e) {
		var t = l.T, n = i.p;
		try {
			if (l.T = null, i.p = 2, e) return e();
		} finally {
			l.T = t, i.p = n, i.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, i.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && i.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = u(n, t.crossOrigin), a = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? i.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: a,
				fetchPriority: o
			}) : n === "script" && i.d.X(e, {
				crossOrigin: r,
				integrity: a,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") {
			if (typeof t == "object" && t) {
				if (t.as == null || t.as === "script") {
					var n = u(t.as, t.crossOrigin);
					i.d.M(e, {
						crossOrigin: n,
						integrity: typeof t.integrity == "string" ? t.integrity : void 0,
						nonce: typeof t.nonce == "string" ? t.nonce : void 0,
						fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
					});
				}
			} else t ?? i.d.M(e);
		}
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = u(n, t.crossOrigin);
			i.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") {
			if (t) {
				var n = u(t.as, t.crossOrigin);
				i.d.m(e, {
					as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0,
					nonce: typeof t.nonce == "string" ? t.nonce : void 0,
					fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
				});
			} else i.d.m(e);
		}
	}, e.requestFormReset = function(e) {
		i.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return l.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return l.H.useHostTransitionStatus();
	}, e.version = "19.3.0";
})), h = /* @__PURE__ */ o(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = m();
})), g = /* @__PURE__ */ o(((e) => {
	var t = p(), n = d(), r = h();
	function i(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function a(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function o(e) {
		for (var t = e, n = t; n && !n.alternate;) t = n, t.flags & 4098 && (e = t.return), n = t.return;
		for (; t.return;) t = t.return;
		return t.tag === 3 ? e : null;
	}
	function s(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function c(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function l(e) {
		if (o(e) !== e) throw Error(i(188));
	}
	function u(e) {
		var t = e.alternate;
		if (!t) {
			if (t = o(e), t === null) throw Error(i(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var a = n.return;
			if (a === null) break;
			var s = a.alternate;
			if (s === null) {
				if (r = a.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (a.child === s.child) {
				for (s = a.child; s;) {
					if (s === n) return l(a), e;
					if (s === r) return l(a), t;
					s = s.sibling;
				}
				throw Error(i(188));
			}
			if (n.return !== r.return) n = a, r = s;
			else {
				for (var c = !1, u = a.child; u;) {
					if (u === n) {
						c = !0, n = a, r = s;
						break;
					}
					if (u === r) {
						c = !0, r = a, n = s;
						break;
					}
					u = u.sibling;
				}
				if (!c) {
					for (u = s.child; u;) {
						if (u === n) {
							c = !0, n = s, r = a;
							break;
						}
						if (u === r) {
							c = !0, r = s, n = a;
							break;
						}
						u = u.sibling;
					}
					if (!c) throw Error(i(189));
				}
			}
			if (n.alternate !== r) throw Error(i(190));
		}
		if (n.tag !== 3) throw Error(i(188));
		return n.stateNode.current === n ? e : t;
	}
	function f(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = f(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	function m(e, t, n, r, i, a) {
		for (; e !== null;) {
			if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && n(e, r, i, a) || (e.tag !== 22 || e.memoizedState === null) && (t || e.tag !== 5 && e.tag !== 27) && m(e.child, t, n, r, i, a)) return !0;
			e = e.sibling;
		}
		return !1;
	}
	function g(e) {
		for (e = e.return; e !== null;) {
			if (e.tag === 3 || e.tag === 5 || e.tag === 27) return e;
			e = e.return;
		}
		return null;
	}
	function _(e) {
		var t = !1;
		for (e = e.return; e !== null && (e.tag === 4 && (t = !0), e.tag !== 3 && e.tag !== 5 && e.tag !== 27);) e = e.return;
		return t;
	}
	function v(e) {
		var t = [null, null], n = g(e);
		return n === null || y(t, e, n.child, { foundSelf: !1 }), t;
	}
	function y(e, t, n, r) {
		for (; n !== null;) {
			if (n === t) r.foundSelf = !0;
			else if (n.tag === 5 || n.tag === 27 || n.tag === 6) {
				if (r.foundSelf) return e[1] = n, !0;
				e[0] = n;
			} else if ((n.tag !== 22 || n.memoizedState === null) && y(e, t, n.child, r)) return !0;
			n = n.sibling;
		}
		return !1;
	}
	function b(e) {
		switch (e.tag) {
			case 5:
			case 27:
			case 6: return e.stateNode;
			case 3: return e.stateNode.containerInfo;
			default: throw Error(i(559));
		}
	}
	var x = null, S = null;
	function C(e, t, n) {
		return e === n || e === t && (x = e, !0);
	}
	function w(e, t, n) {
		return e === n ? (S = e, !1) : e === t && (S !== null && (x = e), !0);
	}
	function T(e) {
		if (e === null) return null;
		do
			e = e === null ? null : e.return;
		while (e && e.tag !== 5 && e.tag !== 27 && e.tag !== 3);
		return e || null;
	}
	function E(e, t, n) {
		for (var r = 0, i = e; i; i = n(i)) r++;
		i = 0;
		for (var a = t; a; a = n(a)) i++;
		for (; 0 < r - i;) e = n(e), r--;
		for (; 0 < i - r;) t = n(t), i--;
		for (; r--;) {
			if (e === t || t !== null && e === t.alternate) return e;
			e = n(e), t = n(t);
		}
		return null;
	}
	var D = Object.assign, O = Symbol.for("react.element"), k = Symbol.for("react.transitional.element"), A = Symbol.for("react.portal"), j = Symbol.for("react.fragment"), M = Symbol.for("react.strict_mode"), N = Symbol.for("react.profiler"), ee = Symbol.for("react.consumer"), P = Symbol.for("react.context"), F = Symbol.for("react.forward_ref"), te = Symbol.for("react.suspense"), ne = Symbol.for("react.suspense_list"), re = Symbol.for("react.memo"), ie = Symbol.for("react.lazy"), ae = Symbol.for("react.activity"), oe = Symbol.for("react.legacy_hidden"), se = Symbol.for("react.memo_cache_sentinel"), ce = Symbol.for("react.view_transition"), le = Symbol.for("react.recoverable"), ue = Symbol.iterator;
	function de(e) {
		return typeof e != "object" || !e ? null : (e = ue && e[ue] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var fe = Symbol.for("react.client.reference");
	function pe(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === fe ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case j: return "Fragment";
			case N: return "Profiler";
			case M: return "StrictMode";
			case te: return "Suspense";
			case ne: return "SuspenseList";
			case ae: return "Activity";
			case ce: return "ViewTransition";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case A: return "Portal";
			case P: return e.displayName || "Context";
			case ee: return (e._context.displayName || "Context") + ".Consumer";
			case F:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case re: return t = e.displayName || null, t === null ? pe(e.type) || "Memo" : t;
			case ie:
				t = e._payload, e = e._init;
				try {
					return pe(e(t));
				} catch {}
		}
		return null;
	}
	var me = Array.isArray, I = n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, L = r.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, he = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, ge = [], _e = -1;
	function ve(e) {
		return { current: e };
	}
	function ye(e) {
		0 > _e || (e.current = ge[_e], ge[_e] = null, _e--);
	}
	function be(e, t) {
		_e++, ge[_e] = e.current, e.current = t;
	}
	var xe = ve(null), Se = ve(null), Ce = ve(null), we = ve(null);
	function Te(e, t) {
		switch (be(Ce, t), be(Se, e), be(xe, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? mp(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = mp(t), e = hp(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		ye(xe), be(xe, e);
	}
	function Ee() {
		ye(xe), ye(Se), ye(Ce);
	}
	function De(e) {
		var t = e.memoizedState;
		t !== null && (dh._currentValue = t.memoizedState, be(we, e)), t = xe.current;
		var n = hp(t, e.type);
		t !== n && (be(Se, e), be(xe, n));
	}
	function Oe(e) {
		Se.current === e && (ye(xe), ye(Se)), we.current === e && (ye(we), dh._currentValue = he);
	}
	var ke, Ae;
	function je(e) {
		if (ke === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			ke = t && t[1] || "", Ae = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + ke + e + Ae;
	}
	var Me = !1;
	function Ne(e, t) {
		if (!e || Me) return "";
		Me = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							n = !1;
							try {
								var i = Object.getOwnPropertyDescriptor(e.prototype, "props");
								Object.defineProperty(e.prototype, "props", {
									configurable: !0,
									set: function() {
										throw Error();
									}
								}), n = !0, new e();
							} finally {
								n && (i === void 0 ? delete e.prototype.props : Object.defineProperty(e.prototype, "props", i));
							}
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			Me = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? je(n) : "";
	}
	function Pe(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return je(e.type);
			case 16: return je("Lazy");
			case 13: return e.child !== t && t !== null ? je("Suspense Fallback") : je("Suspense");
			case 19: return je("SuspenseList");
			case 0:
			case 15: return Ne(e.type, !1);
			case 11: return Ne(e.type.render, !1);
			case 1: return Ne(e.type, !0);
			case 31: return je("Activity");
			case 30: return je("ViewTransition");
			default: return "";
		}
	}
	function Fe(e) {
		try {
			var t = "", n = null;
			do
				t += Pe(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var Ie = Object.prototype.hasOwnProperty, Le = t.unstable_scheduleCallback, Re = t.unstable_cancelCallback, ze = t.unstable_shouldYield, Be = t.unstable_requestPaint, Ve = t.unstable_now, He = t.unstable_getCurrentPriorityLevel, Ue = t.unstable_ImmediatePriority, We = t.unstable_UserBlockingPriority, Ge = t.unstable_NormalPriority, Ke = t.unstable_LowPriority, qe = t.unstable_IdlePriority, Je = t.log, Ye = t.unstable_setDisableYieldValue, Xe = null, Ze = null;
	function Qe(e) {
		if (typeof Je == "function" && Ye(e), Ze && typeof Ze.setStrictMode == "function") try {
			Ze.setStrictMode(Xe, e);
		} catch {}
	}
	var $e = Math.clz32 ? Math.clz32 : nt, et = Math.log, tt = Math.LN2;
	function nt(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (et(e) / tt | 0) | 0;
	}
	var rt = 256, it = 262144, at = 4194304;
	function ot(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & -e;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function st(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = ot(n))) : i = ot(o) : i = ot(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = ot(n))) : i = ot(o)) : i = ot(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function ct(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function lt(e, t) {
		t & 8 && (t |= t & 32);
		var n = e.entangledLanes;
		if (n !== 0) for (e = e.entanglements, n &= t; 0 < n;) {
			var r = 31 - $e(n), i = 1 << r;
			t |= e[r], n &= ~i;
		}
		return t;
	}
	function ut(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function dt() {
		var e = at;
		return at <<= 1, !(at & 62914560) && (at = 4194304), e;
	}
	function ft(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function pt(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function mt(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - $e(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && ht(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function ht(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - $e(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function gt(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - $e(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function _t(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : vt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function vt(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function yt(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function bt() {
		var e = L.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : Dh(e.type)) : e;
	}
	function xt(e, t) {
		var n = L.p;
		try {
			return L.p = e, t();
		} finally {
			L.p = n;
		}
	}
	var St = Math.random().toString(36).slice(2), Ct = "__reactFiber$" + St, wt = "__reactProps$" + St, Tt = "__reactContainer$" + St, Et = "__reactEvents$" + St, Dt = "__reactListeners$" + St, Ot = "__reactHandles$" + St, kt = "__reactResources$" + St, At = "__reactMarker$" + St, jt = "__reactLoad$" + St;
	function Mt(e) {
		delete e[Ct], delete e[wt], delete e[Dt], delete e[Ot];
	}
	function Nt(e) {
		var t;
		if (t = e[Ct]) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[Tt] || n[Ct]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = gm(e); e !== null;) {
					if (n = e[Ct]) return n;
					e = gm(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function Pt(e) {
		if (e = e[Ct] || e[Tt]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function Ft(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(i(33));
	}
	function It(e) {
		var t = e[kt];
		return t ||= e[kt] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function Lt(e) {
		e[At] = !0;
	}
	function Rt(e) {
		e[jt] = void 0;
	}
	var zt = /* @__PURE__ */ new Set(), Bt = {};
	function Vt(e, t) {
		Ht(e, t), Ht(e + "Capture", t);
	}
	function Ht(e, t) {
		for (Bt[e] = t, e = 0; e < t.length; e++) zt.add(t[e]);
	}
	var Ut = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Wt = {}, Gt = {};
	function Kt(e) {
		return Ie.call(Gt, e) ? !0 : Ie.call(Wt, e) ? !1 : Ut.test(e) ? Gt[e] = !0 : (Wt[e] = !0, !1);
	}
	var R = !1;
	function qt() {
		var e = R;
		return R = !1, e;
	}
	function Jt(e, t, n) {
		if (Kt(t)) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean":
						var r = t.toLowerCase().slice(0, 5);
						if (r !== "data-" && r !== "aria-") {
							e.removeAttribute(t);
							return;
						}
				}
				e.setAttribute(t, n);
			}
		}
	}
	function Yt(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, n);
		}
	}
	function Xt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, r);
		}
	}
	function Zt(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function Qt(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function $t(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function en(e) {
		if (!e._valueTracker) {
			var t = Qt(e) ? "checked" : "value";
			e._valueTracker = $t(e, t, "" + e[t]);
		}
	}
	function tn(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = Qt(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	var nn = /[\n"\\]/g;
	function rn(e) {
		return e.replace(nn, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function an(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Zt(t)) : e.value !== "" + Zt(t) && (e.value = "" + Zt(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : sn(e, Zt(n)) : o === "number" && e.value == t ? sn(e, Zt(e.value)) : sn(e, Zt(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Zt(s) : e.removeAttribute("name");
	}
	function on(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				en(e);
				return;
			}
			n = n == null ? "" : "" + Zt(n), t = t == null ? n : "" + Zt(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), en(e);
	}
	function sn(e, t) {
		e.defaultValue !== "" + t && (e.defaultValue = "" + t);
	}
	function cn(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Zt(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function ln(e, t, n) {
		if (t != null && (t = "" + Zt(t), t !== e.value && (e.value = t), n == null)) {
			e.defaultValue !== t && (e.defaultValue = t);
			return;
		}
		e.defaultValue = n == null ? "" : "" + Zt(n);
	}
	function un(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(i(92));
				if (me(r)) {
					if (1 < r.length) throw Error(i(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = Zt(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), en(e);
	}
	function dn(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var fn = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function pn(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || fn.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function mn(e, t, n) {
		if (t != null && typeof t != "object") throw Error(i(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "", R = !0);
			for (var a in t) r = t[a], t.hasOwnProperty(a) && n[a] !== r && (pn(e, a, r), R = !0);
		} else for (var o in t) t.hasOwnProperty(o) && pn(e, o, t[o]);
	}
	function hn(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var gn = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["maskType", "mask-type"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), _n = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function vn(e) {
		return _n.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function yn() {}
	var bn = null;
	function xn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var Sn = null, Cn = null;
	function wn(e) {
		var t = Pt(e);
		if (t && (e = t.stateNode)) {
			var n = e[wt] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (an(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + rn("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var a = r[wt] || null;
								if (!a) throw Error(i(90));
								an(r, a.value, a.defaultValue, a.defaultValue, a.checked, a.defaultChecked, a.type, a.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && tn(r);
					}
					break a;
				case "textarea":
					ln(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && cn(e, !!n.multiple, t, !1);
			}
		}
	}
	var Tn = !1;
	function En(e, t, n) {
		if (Tn) return e(t, n);
		Tn = !0;
		try {
			return e(t);
		} finally {
			if (Tn = !1, (Sn !== null || Cn !== null) && (Ud(), Sn && (t = Sn, e = Cn, Cn = Sn = null, wn(t), e))) for (t = 0; t < e.length; t++) wn(e[t]);
		}
	}
	function Dn(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[wt] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(i(231, t, typeof n));
		return n;
	}
	var On = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, kn = !1;
	if (On) try {
		var An = {};
		Object.defineProperty(An, "passive", { get: function() {
			kn = !0;
		} }), window.addEventListener("test", An, An), window.removeEventListener("test", An, An);
	} catch {
		kn = !1;
	}
	var jn = null, Mn = null, Nn = null;
	function Pn() {
		if (Nn) return Nn;
		var e, t = Mn, n = t.length, r, i = "value" in jn ? jn.value : jn.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return Nn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function Fn(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function In() {
		return !0;
	}
	function Ln() {
		return !1;
	}
	function Rn(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? In : Ln, this.isPropagationStopped = Ln, this;
		}
		return D(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = In);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = In);
			},
			persist: function() {},
			isPersistent: In
		}), t;
	}
	var zn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, Bn = Rn(zn), Vn = D({}, zn, {
		view: 0,
		detail: 0
	}), Hn = Rn(Vn), Un, Wn, Gn, Kn = D({}, Vn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: rr,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== Gn && (Gn && e.type === "mousemove" ? (Un = e.screenX - Gn.screenX, Wn = e.screenY - Gn.screenY) : Wn = Un = 0, Gn = e), Un);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Wn;
		}
	}), qn = Rn(Kn), Jn = Rn(D({}, Kn, { dataTransfer: 0 })), Yn = Rn(D({}, Vn, { relatedTarget: 0 })), Xn = Rn(D({}, zn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Zn = Rn(D({}, zn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Qn = Rn(D({}, zn, { data: 0 })), $n = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, er = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, tr = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function nr(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = tr[e]) ? !!t[e] : !1;
	}
	function rr() {
		return nr;
	}
	var ir = Rn(D({}, Vn, {
		key: function(e) {
			if (e.key) {
				var t = $n[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = Fn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? er[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: rr,
		charCode: function(e) {
			return e.type === "keypress" ? Fn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? Fn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), ar = Rn(D({}, Kn, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), or = Rn(D({}, zn, { submitter: 0 })), sr = Rn(D({}, Vn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: rr
	})), cr = Rn(D({}, zn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), lr = Rn(D({}, Kn, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), ur = Rn(D({}, zn, {
		newState: 0,
		oldState: 0,
		source: 0
	})), dr = [
		9,
		13,
		27,
		32
	], fr = On && "CompositionEvent" in window, pr = null;
	On && "documentMode" in document && (pr = document.documentMode);
	var mr = On && "TextEvent" in window && !pr, hr = On && (!fr || pr && 8 < pr && 11 >= pr), gr = " ", _r = !1;
	function vr(e, t) {
		switch (e) {
			case "keyup": return dr.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function yr(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var br = !1;
	function xr(e, t) {
		switch (e) {
			case "compositionend": return yr(t);
			case "keypress": return t.which === 32 ? (_r = !0, gr) : null;
			case "textInput": return e = t.data, e === gr && _r ? null : e;
			default: return null;
		}
	}
	function Sr(e, t) {
		if (br) return e === "compositionend" || !fr && vr(e, t) ? (e = Pn(), Nn = Mn = jn = null, br = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return hr && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var Cr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function wr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!Cr[e.type] : t === "textarea";
	}
	function Tr(e, t, n, r) {
		Sn ? Cn ? Cn.push(r) : Cn = [r] : Sn = r, t = Qf(t, "onChange"), 0 < t.length && (n = new Bn("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var Er = null, Dr = null;
	function Or(e) {
		Gf(e, 0);
	}
	function kr(e) {
		if (tn(Ft(e))) return e;
	}
	function Ar(e, t) {
		if (e === "change") return t;
	}
	var jr = !1;
	if (On) {
		var Mr;
		if (On) {
			var Nr = "oninput" in document;
			if (!Nr) {
				var Pr = document.createElement("div");
				Pr.setAttribute("oninput", "return;"), Nr = typeof Pr.oninput == "function";
			}
			Mr = Nr;
		} else Mr = !1;
		jr = Mr && (!document.documentMode || 9 < document.documentMode);
	}
	function Fr() {
		Er && (Er.detachEvent("onpropertychange", Ir), Dr = Er = null);
	}
	function Ir(e) {
		if (e.propertyName === "value" && kr(Dr)) {
			var t = [];
			Tr(t, Dr, e, xn(e)), En(Or, t);
		}
	}
	function Lr(e, t, n) {
		e === "focusin" ? (Fr(), Er = t, Dr = n, Er.attachEvent("onpropertychange", Ir)) : e === "focusout" && Fr();
	}
	function Rr(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return kr(Dr);
	}
	function zr(e, t) {
		if (e === "click") return kr(t);
	}
	function Br(e, t) {
		if (e === "input" || e === "change") return kr(t);
	}
	function Vr(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var Hr = typeof Object.is == "function" ? Object.is : Vr;
	function Ur(e, t) {
		if (Hr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!Ie.call(t, i) || !Hr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Wr(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function Gr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Kr(e, t) {
		var n = Gr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = Gr(n);
		}
	}
	function qr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? qr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Jr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Wr(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Wr(e.document);
		}
		return t;
	}
	function Yr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Xr = On && "documentMode" in document && 11 >= document.documentMode, Zr = null, Qr = null, $r = null, ei = !1;
	function ti(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		ei || Zr == null || Zr !== Wr(r) || (r = Zr, "selectionStart" in r && Yr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), $r && Ur($r, r) || ($r = r, r = Qf(Qr, "onSelect"), 0 < r.length && (t = new Bn("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Zr)));
	}
	function ni(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var ri = {
		animationend: ni("Animation", "AnimationEnd"),
		animationiteration: ni("Animation", "AnimationIteration"),
		animationstart: ni("Animation", "AnimationStart"),
		transitionrun: ni("Transition", "TransitionRun"),
		transitionstart: ni("Transition", "TransitionStart"),
		transitioncancel: ni("Transition", "TransitionCancel"),
		transitionend: ni("Transition", "TransitionEnd")
	}, ii = {}, ai = {};
	On && (ai = document.createElement("div").style, "AnimationEvent" in window || (delete ri.animationend.animation, delete ri.animationiteration.animation, delete ri.animationstart.animation), "TransitionEvent" in window || delete ri.transitionend.transition);
	function oi(e) {
		if (ii[e]) return ii[e];
		if (!ri[e]) return e;
		var t = ri[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in ai) return ii[e] = t[n];
		return e;
	}
	var si = oi("animationend"), ci = oi("animationiteration"), li = oi("animationstart"), ui = oi("transitionrun"), di = oi("transitionstart"), fi = oi("transitioncancel"), pi = oi("transitionend"), mi = /* @__PURE__ */ new Map(), hi = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	hi.push("scrollEnd");
	function gi(e, t) {
		mi.set(e, t), Vt(t, [e]);
	}
	var _i = 0;
	function vi(e, t) {
		if (e.name != null && e.name !== "auto") return e.name;
		if (t.autoName !== null) return t.autoName;
		e = wd.identifierPrefix;
		var n = _i++;
		return e = "_" + e + "t_" + n.toString(32) + "_", t.autoName = e;
	}
	function yi(e) {
		if (e == null || typeof e == "string") return e;
		var t = null, n = Md;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = e[n[r]];
			if (i != null) {
				if (i === "none") return "none";
				t = t == null ? i : t + (" " + i);
			}
		}
		return t ?? e.default;
	}
	function bi(e, t) {
		return e = yi(e), t = yi(t), t == null ? e === "auto" ? null : e : t === "auto" ? null : t;
	}
	var xi = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, Si = [], Ci = 0, wi = 0;
	function Ti() {
		for (var e = Ci, t = wi = Ci = 0; t < e;) {
			var n = Si[t];
			Si[t++] = null;
			var r = Si[t];
			Si[t++] = null;
			var i = Si[t];
			Si[t++] = null;
			var a = Si[t];
			if (Si[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && ki(n, i, a);
		}
	}
	function Ei(e, t, n, r) {
		Si[Ci++] = e, Si[Ci++] = t, Si[Ci++] = n, Si[Ci++] = r, wi |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function Di(e, t, n, r) {
		return Ei(e, t, n, r), Ai(e);
	}
	function Oi(e, t) {
		return Ei(e, null, null, t), Ai(e);
	}
	function ki(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - $e(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function Ai(e) {
		if (50 < Nd) throw Nd = 0, Pd = null, Error(i(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var ji = {};
	function Mi(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function Ni(e, t, n, r) {
		return new Mi(e, t, n, r);
	}
	function Pi(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function Fi(e, t) {
		var n = e.alternate;
		return n === null ? (n = Ni(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 1206910976, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function Ii(e, t) {
		e.flags &= 1206910978;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function Li(e, t, n, r, a, o) {
		var s = 0;
		if (r = e, typeof r == "function") Pi(r) && (s = 1);
		else if (typeof r == "string") s = Zm(e, n, xe.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (r) {
			case ae: return e = Ni(31, n, t, a), e.elementType = ae, e.lanes = o, e;
			case j: return Ri(n.children, a, o, t);
			case M:
				s = 8, a |= 24;
				break;
			case N: return e = Ni(12, n, t, a | 2), e.elementType = N, e.lanes = o, e;
			case te: return e = Ni(13, n, t, a), e.elementType = te, e.lanes = o, e;
			case ne: return e = Ni(19, n, t, a), e.elementType = ne, e.lanes = o, e;
			case oe:
			case ce: return e = a | 32, e = Ni(30, n, t, e), e.elementType = ce, e.lanes = o, e.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}, e;
			default:
				if (typeof r == "object" && r) switch (r.$$typeof) {
					case P:
						s = 10;
						break a;
					case ee:
						s = 9;
						break a;
					case F:
						s = 11;
						break a;
					case re:
						s = 14;
						break a;
					case ie:
						s = 16, r = null;
						break a;
				}
				s = 29, n = Error(i(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = Ni(s, n, t, a), t.elementType = e, t.type = r, t.lanes = o, t;
	}
	function Ri(e, t, n, r) {
		return e = Ni(7, e, r, t), e.lanes = n, e;
	}
	function zi(e, t, n) {
		return e = Ni(6, e, null, t), e.lanes = n, e;
	}
	function Bi(e) {
		var t = Ni(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function Vi(e, t, n) {
		return t = Ni(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var Hi = /* @__PURE__ */ new WeakMap();
	function Ui(e, t) {
		if (typeof e == "object" && e) {
			var n = Hi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: Fe(t)
			}, Hi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: Fe(t)
		};
	}
	var Wi = [], Gi = 0, Ki = null, qi = 0, Ji = [], Yi = 0, Xi = null, Zi = 1, Qi = "";
	function $i(e, t) {
		Wi[Gi++] = qi, Wi[Gi++] = Ki, Ki = e, qi = t;
	}
	function ea(e, t, n) {
		Ji[Yi++] = Zi, Ji[Yi++] = Qi, Ji[Yi++] = Xi, Xi = e;
		var r = Zi;
		e = Qi;
		var i = 32 - $e(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - $e(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Zi = 1 << 32 - $e(t) + i | n << i | r, Qi = a + e;
		} else Zi = 1 << a | n << i | r, Qi = e;
	}
	function ta(e) {
		e.return !== null && ($i(e, 1), ea(e, 1, 0));
	}
	function na(e) {
		for (; e === Ki;) Ki = Wi[--Gi], Wi[Gi] = null, qi = Wi[--Gi], Wi[Gi] = null;
		for (; e === Xi;) Xi = Ji[--Yi], Ji[Yi] = null, Qi = Ji[--Yi], Ji[Yi] = null, Zi = Ji[--Yi], Ji[Yi] = null;
	}
	function ra(e, t) {
		Ji[Yi++] = Zi, Ji[Yi++] = Qi, Ji[Yi++] = Xi, Zi = t.id, Qi = t.overflow, Xi = e;
	}
	var ia = null, aa = null, z = !1, oa = null, sa = !1, ca = Error(i(519));
	function la(e) {
		throw ha(Ui(Error(i(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), ca;
	}
	function ua(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[Ct] = e, t[wt] = r, n) {
			case "dialog":
				J("cancel", t), J("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				J("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < Uf.length; n++) J(Uf[n], t);
				break;
			case "source":
				J("error", t);
				break;
			case "img":
			case "image":
			case "link":
				J("error", t), J("load", t);
				break;
			case "details":
				J("toggle", t);
				break;
			case "input":
				J("invalid", t), on(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				J("invalid", t);
				break;
			case "textarea": J("invalid", t), un(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || ip(t.textContent, n) ? (r.popover != null && (J("beforetoggle", t), J("toggle", t)), r.onScroll != null && J("scroll", t), r.onScrollEnd != null && J("scrollend", t), r.onClick != null && (t.onclick = yn), t = !0) : t = !1, t || la(e, !0);
	}
	function da(e) {
		for (ia = e.return; ia;) switch (ia.tag) {
			case 5:
			case 31:
			case 13:
				sa = !1;
				return;
			case 27:
			case 3:
				sa = !0;
				return;
			default: ia = ia.return;
		}
	}
	function fa(e) {
		if (e !== ia) return !1;
		if (!z) return da(e), z = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || _p(e.type, e.memoizedProps)), n = !n), n && aa && la(e), da(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			aa = hm(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(317));
			aa = hm(e);
		} else t === 27 ? (t = aa, Ep(e.type) ? (e = mm, mm = null, aa = e) : aa = t) : aa = ia ? pm(e.stateNode.nextSibling) : null;
		return !0;
	}
	function pa() {
		aa = ia = null, z = !1;
	}
	function ma() {
		var e = oa;
		return e !== null && (gd === null ? gd = e : gd.push.apply(gd, e), oa = null), e;
	}
	function ha(e) {
		oa === null ? oa = [e] : oa.push(e);
	}
	var ga = ve(null), _a = null, va = null;
	function ya(e, t, n) {
		be(ga, t._currentValue), t._currentValue = n;
	}
	function ba(e) {
		e._currentValue = ga.current, ye(ga);
	}
	function xa(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function Sa(e, t, n, r) {
		var a = e.child;
		for (a !== null && (a.return = e); a !== null;) {
			var o = a.dependencies;
			if (o !== null) {
				var s = a.child;
				o = o.firstContext;
				a: for (; o !== null;) {
					var c = o;
					o = a;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						o.lanes |= n, c = o.alternate, c !== null && (c.lanes |= n), xa(o.return, n, e), r || (s = null);
						break a;
					}
					o = c.next;
				}
			} else if (a.tag === 18) {
				if (s = a.return, s === null) throw Error(i(341));
				s.lanes |= n, o = s.alternate, o !== null && (o.lanes |= n), xa(s, n, e), s = null;
			} else a.tag === 13 && a.memoizedState !== null && a.memoizedState.dehydrated === null ? (a.lanes |= n, s = a.alternate, s !== null && (s.lanes |= n), xa(a.return, n, e), s = a.child, s = s === null ? null : s.sibling) : s = a.child;
			if (s !== null) s.return = a;
			else for (s = a; s !== null;) {
				if (s === e) {
					s = null;
					break;
				}
				if (a = s.sibling, a !== null) {
					a.return = s.return, s = a;
					break;
				}
				s = s.return;
			}
			a = s;
		}
	}
	function Ca(e, t, n, r) {
		e = null;
		for (var a = t, o = !1; a !== null;) {
			if (!o) {
				if (a.flags & 524288) o = !0;
				else if (a.flags & 262144) break;
			}
			if (a.tag === 10) {
				var s = a.alternate;
				if (s === null) throw Error(i(387));
				if (s = s.memoizedProps, s !== null) {
					var c = a.type;
					Hr(a.pendingProps.value, s.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (a === we.current) {
				if (s = a.alternate, s === null) throw Error(i(387));
				s.memoizedState.memoizedState !== a.memoizedState.memoizedState && (e === null ? e = [dh] : e.push(dh));
			}
			a = a.return;
		}
		return e !== null && Sa(t, e, n, r), t.flags |= 262144, e !== null;
	}
	function wa(e) {
		for (e = e.firstContext; e !== null;) {
			if (!Hr(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function Ta(e) {
		_a = e, va = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function Ea(e) {
		return Oa(_a, e);
	}
	function Da(e, t) {
		return _a === null && Ta(e), Oa(e, t);
	}
	function Oa(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, va === null) {
			if (e === null) throw Error(i(308));
			va = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else va = va.next = t;
		return n;
	}
	var ka = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, Aa = t.unstable_scheduleCallback, ja = t.unstable_NormalPriority, Ma = {
		$$typeof: P,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function Na() {
		return {
			controller: new ka(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function Pa(e) {
		e.refCount--, e.refCount === 0 && Aa(ja, function() {
			e.controller.abort();
		});
	}
	function Fa(e, t) {
		if (e.pendingLanes & 4194048) {
			var n = e.transitionTypes;
			for (n === null && (n = e.transitionTypes = []), e = 0; e < t.length; e++) {
				var r = t[e];
				n.indexOf(r) === -1 && n.push(r);
			}
		}
	}
	var Ia = null;
	function La(e) {
		var t = e.transitionTypes;
		return e.transitionTypes = null, t;
	}
	var Ra = null, za = 0, Ba = 0, Va = null;
	function Ha(e, t) {
		if (Ra === null) {
			var n = Ra = [];
			za = 0, Ba = Rf(), Va = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return za++, t.then(Ua, Ua), t;
	}
	function Ua() {
		if (--za === 0 && (Ia = null, Ra !== null)) {
			Va !== null && (Va.status = "fulfilled");
			var e = Ra;
			Ra = null, Ba = 0, Va = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function Wa(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var Ga = I.S;
	I.S = function(e, t) {
		if (yd = Ve(), typeof t == "object" && t && typeof t.then == "function" && Ha(e, t), Ia !== null) for (var n = wf; n !== null;) Fa(n, Ia), n = n.next;
		if (n = e.types, n !== null) {
			for (var r = wf; r !== null;) Fa(r, n), r = r.next;
			if (Ba !== 0) {
				r = Ia, r === null && (r = Ia = []);
				for (var i = 0; i < n.length; i++) {
					var a = n[i];
					r.indexOf(a) === -1 && r.push(a);
				}
			}
		}
		Ga !== null && Ga(e, t);
	};
	var Ka = ve(null);
	function qa() {
		var e = Ka.current;
		return e === null ? rd.pooledCache : e;
	}
	function Ja(e, t) {
		t === null ? be(Ka, Ka.current) : be(Ka, t.pool);
	}
	function Ya() {
		var e = qa();
		return e === null ? null : {
			parent: Ma._currentValue,
			pool: e
		};
	}
	var Xa = Error(i(460)), Za = Error(i(474)), Qa = Error(i(542)), $a = { then: function() {} };
	function eo(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function to(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(yn, yn), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, ao(e), e === void 0 && !("reason" in t) ? Error(i(600)) : e;
			default:
				if (typeof t.status == "string") t.then(yn, yn);
				else {
					if (e = rd, e !== null && 100 < e.shellSuspendCounter) throw Error(i(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, ao(e), e;
				}
				throw ro = t, Xa;
		}
	}
	function no(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (ro = e, Xa) : e;
		}
	}
	var ro = null;
	function io() {
		if (ro === null) throw Error(i(459));
		var e = ro;
		return ro = null, e;
	}
	function ao(e) {
		if (e === Xa || e === Qa) throw Error(i(483));
	}
	var oo = null, so = 0;
	function co(e) {
		var t = so;
		return so += 1, oo === null && (oo = []), to(oo, e, t);
	}
	function lo(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function uo(e, t) {
		throw t.$$typeof === O ? Error(i(525)) : (e = Object.prototype.toString.call(t), Error(i(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function fo(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function a(e, t) {
			return e = Fi(e, t), e.index = 0, e.sibling = null, e;
		}
		function o(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 134217730, n) : (r = r.index, r < n ? (t.flags |= 2, n) : r)) : (t.flags |= 1048576, n);
		}
		function s(t) {
			return e && t.alternate === null && (t.flags |= 134217730), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = zi(n, e.mode, r), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var i = n.type;
			return i === j ? (e = d(e, t, n.props.children, r, n.key), lo(e, n), e) : t !== null && (t.elementType === i || typeof i == "object" && i && i.$$typeof === ie && no(i) === t.type) ? (t = a(t, n.props), lo(t, n), t.return = e, t) : (t = Li(n.type, n.key, n.props, null, e.mode, r), lo(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = Vi(n, e.mode, r), t.return = e, t) : (t = a(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, i) {
			return t === null || t.tag !== 7 ? (t = Ri(n, e.mode, r, i), t.return = e, t) : (t = a(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = zi("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case k: return n = Li(t.type, t.key, t.props, null, e.mode, n), lo(n, t), n.return = e, n;
					case A: return t = Vi(t, e.mode, n), t.return = e, t;
					case ie: return t = no(t), f(e, t, n);
				}
				if (me(t) || de(t)) return t = Ri(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, co(t), n);
				if (t.$$typeof === P) return f(e, Da(e, t), n);
				uo(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case k: return n.key === i ? l(e, t, n, r) : null;
					case A: return n.key === i ? u(e, t, n, r) : null;
					case ie: return n = no(n), p(e, t, n, r);
				}
				if (me(n) || de(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, co(n), r);
				if (n.$$typeof === P) return p(e, t, Da(e, n), r);
				uo(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case k: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case A: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case ie: return r = no(r), m(e, t, n, r, i);
				}
				if (me(r) || de(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, co(r), i);
				if (r.$$typeof === P) return m(e, t, n, Da(t, r), i);
				uo(t, r);
			}
			return null;
		}
		function h(i, a, s, c) {
			for (var l = null, u = null, d = a, h = a = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), a = o(_, a, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), z && $i(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (a = o(d, a, h), u === null ? l = d : u.sibling = d, u = d);
				return z && $i(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && (_ = g.alternate, _ !== null && d.delete(_.key === null ? h : _.key)), a = o(g, a, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), z && $i(i, h), l;
		}
		function g(a, s, c, l) {
			if (c == null) throw Error(i(151));
			for (var u = null, d = null, h = s, g = s = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(a, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(a, h), s = o(y, s, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(a, h), z && $i(a, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(a, v.value, l), v !== null && (s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
				return z && $i(a, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, a, g, v.value, l), v !== null && (e && (_ = v.alternate, _ !== null && h.delete(_.key === null ? g : _.key)), s = o(v, s, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(a, e);
			}), z && $i(a, g), u;
		}
		function _(e, r, o, c) {
			if (typeof o == "object" && o && o.type === j && o.key === null && o.props.ref === void 0 && (o = o.props.children), typeof o == "object" && o) {
				switch (o.$$typeof) {
					case k:
						a: {
							for (var l = o.key; r !== null;) {
								if (r.key === l) {
									if (l = o.type, l === j) {
										if (r.tag === 7) {
											n(e, r.sibling), c = a(r, o.props.children), lo(c, o), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === ie && no(l) === r.type) {
										n(e, r.sibling), c = a(r, o.props), lo(c, o), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							o.type === j ? (c = Ri(o.props.children, e.mode, c, o.key), lo(c, o), c.return = e, e = c) : (c = Li(o.type, o.key, o.props, null, e.mode, c), lo(c, o), c.return = e, e = c);
						}
						return s(e);
					case A:
						a: {
							for (l = o.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === o.containerInfo && r.stateNode.implementation === o.implementation) {
										n(e, r.sibling), c = a(r, o.children || []), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = Vi(o, e.mode, c), c.return = e, e = c;
						}
						return s(e);
					case ie: return o = no(o), _(e, r, o, c);
				}
				if (me(o)) return h(e, r, o, c);
				if (de(o)) {
					if (l = de(o), typeof l != "function") throw Error(i(150));
					return o = l.call(o), g(e, r, o, c);
				}
				if (typeof o.then == "function") return _(e, r, co(o), c);
				if (o.$$typeof === P) return _(e, r, Da(e, o), c);
				uo(e, o);
			}
			return typeof o == "string" && o !== "" || typeof o == "number" || typeof o == "bigint" ? (o = "" + o, r !== null && r.tag === 6 ? (n(e, r.sibling), c = a(r, o), c.return = e, e = c) : (n(e, r), c = zi(o, e.mode, c), c.return = e, e = c), s(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				so = 0;
				var i = _(e, t, n, r);
				return oo = null, i;
			} catch (t) {
				if (t === Xa || t === Qa) throw t;
				var a = Ni(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var po = fo(!0), mo = fo(!1), ho = !1;
	function go(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function _o(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function vo(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function yo(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, U & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = Ai(e), ki(e, null, n), t;
		}
		return Ei(e, r, t, n), Ai(e);
	}
	function bo(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, gt(e, n);
		}
	}
	function xo(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
			return;
		}
		e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var So = !1;
	function Co() {
		if (So) {
			var e = Va;
			if (e !== null) throw e;
		}
	}
	function wo(e, t, n, r) {
		So = !1;
		var i = e.updateQueue;
		ho = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (G & f) === f : (r & f) === f) {
					f !== 0 && f === Ba && (So = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, h = s;
						f = t;
						var g = n;
						switch (h.tag) {
							case 1:
								if (m = h.payload, typeof m == "function") {
									d = m.call(g, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = h.payload, f = typeof m == "function" ? m.call(g, d, f) : m, f == null) break a;
								d = D({}, d, f);
								break a;
							case 2: ho = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), ud |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function To(e, t) {
		if (typeof e != "function") throw Error(i(191, e));
		e.call(t);
	}
	function Eo(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) To(n[e], t);
	}
	var Do = ve(null), Oo = ve(0);
	function ko(e, t) {
		e = cd, be(Oo, e), be(Do, t), cd = e | t.baseLanes;
	}
	function Ao() {
		be(Oo, cd), be(Do, Do.current);
	}
	function jo() {
		cd = Oo.current, ye(Do), ye(Oo);
	}
	var Mo = ve(null), No = null;
	function Po(e) {
		var t = e.alternate;
		be(zo, zo.current & 1), be(Mo, e), No === null && (t === null || Do.current !== null || t.memoizedState !== null) && (No = e);
	}
	function Fo(e) {
		be(zo, zo.current), be(Mo, e), No === null && (No = e);
	}
	function Io(e) {
		e.tag === 22 ? (be(zo, zo.current), be(Mo, e), No === null && (No = e)) : Lo();
	}
	function Lo() {
		be(zo, zo.current), be(Mo, Mo.current);
	}
	function Ro(e) {
		ye(Mo), No === e && (No = null), ye(zo);
	}
	var zo = ve(0);
	function Bo(e, t) {
		be(Mo, Mo.current), be(zo, t);
	}
	function Vo(e) {
		ye(zo), ye(Mo), No === e && (No = null);
	}
	function Ho(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || um(n) || dm(n))) return t;
			} else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var Uo = 0, B = null, Wo = null, Go = null, Ko = !1, qo = !1, Jo = !1, Yo = 0, Xo = 0, Zo = null, Qo = 0;
	function $o() {
		throw Error(i(321));
	}
	function es(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!Hr(e[n], t[n])) return !1;
		return !0;
	}
	function ts(e, t, n, r, i, a) {
		return Uo = a, B = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, I.H = e === null || e.memoizedState === null ? _c : vc, Jo = !1, a = n(r, i), Jo = !1, qo && (a = rs(t, n, r, i)), ns(e), a;
	}
	function ns(e) {
		I.H = gc;
		var t = Wo !== null && Wo.next !== null;
		if (Uo = 0, Go = Wo = B = null, Ko = !1, Xo = 0, Zo = null, t) throw Error(i(300));
		e === null || Fc || (e = e.dependencies, e !== null && wa(e) && (Fc = !0));
	}
	function rs(e, t, n, r) {
		B = e;
		var a = 0;
		do {
			if (qo && (Zo = null), Xo = 0, qo = !1, 25 <= a) throw Error(i(301));
			if (a += 1, Go = Wo = null, e.updateQueue != null) {
				var o = e.updateQueue;
				o.lastEffect = null, o.events = null, o.stores = null, o.memoCache != null && (o.memoCache.index = 0);
			}
			I.H = yc, o = t(n, r);
		} while (qo);
		return o;
	}
	function is() {
		var e = I.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? ds(t) : t, e = e.useState()[0], (Wo === null ? null : Wo.memoizedState) !== e && (B.flags |= 1024), t;
	}
	function as() {
		var e = Yo !== 0;
		return Yo = 0, e;
	}
	function os(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function ss(e) {
		if (Ko) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			Ko = !1;
		}
		Uo = 0, Go = Wo = B = null, qo = !1, Xo = Yo = 0, Zo = null;
	}
	function cs() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return Go === null ? B.memoizedState = Go = e : Go = Go.next = e, Go;
	}
	function ls() {
		if (Wo === null) {
			var e = B.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = Wo.next;
		var t = Go === null ? B.memoizedState : Go.next;
		if (t !== null) Go = t, Wo = e;
		else {
			if (e === null) throw B.alternate === null ? Error(i(467)) : Error(i(310));
			Wo = e, e = {
				memoizedState: Wo.memoizedState,
				baseState: Wo.baseState,
				baseQueue: Wo.baseQueue,
				queue: Wo.queue,
				next: null
			}, Go === null ? B.memoizedState = Go = e : Go = Go.next = e;
		}
		return Go;
	}
	function us() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function ds(e) {
		var t = Xo;
		return Xo += 1, Zo === null && (Zo = []), e = to(Zo, e, t), t = B, (Go === null ? t.memoizedState : Go.next) === null && (t = t.alternate, I.H = t === null || t.memoizedState === null ? _c : vc), e;
	}
	function fs(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return ds(e);
			if (e.$$typeof === le) return;
			if (e.$$typeof === P) return Ea(e);
		}
		throw Error(i(438, String(e)));
	}
	function ps(e) {
		var t = null, n = B.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = B.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ??= {
			data: [],
			index: 0
		}, n === null && (n = us(), B.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = se;
		return t.index++, n;
	}
	function ms(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function hs(e) {
		return gs(ls(), Wo, e);
	}
	function gs(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(i(311));
		r.lastRenderedReducer = n;
		var a = e.baseQueue, o = r.pending;
		if (o !== null) {
			if (a !== null) {
				var s = a.next;
				a.next = o.next, o.next = s;
			}
			t.baseQueue = a = o, r.pending = null;
		}
		if (o = e.baseState, a === null) e.memoizedState = o;
		else {
			t = a.next;
			var c = s = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (Uo & f) === f : (G & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === Ba && (d = !0);
					else if ((Uo & p) === p) {
						u = u.next, p === Ba && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, s = o) : l = l.next = f, B.lanes |= p, ud |= p;
					f = u.action, Jo && n(o, f), o = u.hasEagerState ? u.eagerState : n(o, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, s = o) : l = l.next = p, B.lanes |= f, ud |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? s = o : l.next = c, !Hr(o, e.memoizedState) && (Fc = !0, d && (n = Va, n !== null))) throw n;
			e.memoizedState = o, e.baseState = s, e.baseQueue = l, r.lastRenderedState = o;
		}
		return a === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function _s(e) {
		var t = ls(), n = t.queue;
		if (n === null) throw Error(i(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, a = n.pending, o = t.memoizedState;
		if (a !== null) {
			n.pending = null;
			var s = a = a.next;
			do
				o = e(o, s.action), s = s.next;
			while (s !== a);
			Hr(o, t.memoizedState) || (Fc = !0), t.memoizedState = o, t.baseQueue === null && (t.baseState = o), n.lastRenderedState = o;
		}
		return [o, r];
	}
	function vs(e, t, n) {
		var r = B, a = ls(), o = z;
		if (o) {
			if (n === void 0) throw Error(i(407));
			n = n();
		} else n = t();
		var s = !Hr((Wo || a).memoizedState, n);
		if (s && (a.memoizedState = n, Fc = !0), a = a.queue, Us(xs.bind(null, r, a, e), [e]), e = a.getSnapshot !== t || s || Go !== null && !!(Go.memoizedState.tag & 1), Rs(e ? 9 : 8, { destroy: void 0 }, bs.bind(null, r, a, n, t), null), e) {
			if (r.flags |= 2048, rd === null) throw Error(i(349));
			o || Uo & 127 || ys(r, t, n);
		}
		return n;
	}
	function ys(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = B.updateQueue, t === null ? (t = us(), B.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function bs(e, t, n, r) {
		t.value = n, t.getSnapshot = r, Ss(t) && Cs(e);
	}
	function xs(e, t, n) {
		return n(function() {
			Ss(t) && Cs(e);
		});
	}
	function Ss(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !Hr(e, n);
		} catch {
			return !0;
		}
	}
	function Cs(e) {
		var t = Oi(e, 2);
		t !== null && Rd(t, e, 2);
	}
	function ws(e) {
		var t = cs();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), Jo) {
				Qe(!0);
				try {
					n();
				} finally {
					Qe(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: ms,
			lastRenderedState: e
		}, t;
	}
	function Ts(e, t, n, r) {
		return e.baseState = n, gs(e, Wo, typeof r == "function" ? r : ms);
	}
	function Es(e, t, n, r, a) {
		if (pc(e)) throw Error(i(485));
		if (e = t.action, e !== null) {
			var o = {
				payload: a,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					o.listeners.push(e);
				}
			};
			I.T === null ? o.isTransition = !1 : n(!0), r(o), n = t.pending, n === null ? (o.next = t.pending = o, Ds(t, o)) : (o.next = n.next, t.pending = n.next = o);
		}
	}
	function Ds(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = I.T, o = {};
			o.types = a === null ? null : a.types, I.T = o;
			try {
				var s = n(i, r), c = I.S;
				c !== null && c(o, s), Os(e, t, s);
			} catch (n) {
				As(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), I.T = a;
			}
		} else try {
			a = n(i, r), Os(e, t, a);
		} catch (n) {
			As(e, t, n);
		}
	}
	function Os(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			ks(e, t, n);
		}, function(n) {
			return As(e, t, n);
		}) : ks(e, t, n);
	}
	function ks(e, t, n) {
		t.status = "fulfilled", t.value = n, js(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Ds(e, n)));
	}
	function As(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, js(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function js(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function Ms(e, t) {
		return t;
	}
	function Ns(e, t) {
		if (z) {
			var n = rd.formState;
			if (n !== null) {
				a: {
					var r = B;
					if (z) {
						if (aa) {
							b: {
								for (var i = aa, a = sa; i.nodeType !== 8;) {
									if (!a) {
										i = null;
										break b;
									}
									if (i = pm(i.nextSibling), i === null) {
										i = null;
										break b;
									}
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								aa = pm(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						la(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = cs(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: Ms,
			lastRenderedState: t
		}, n.queue = r, n = uc.bind(null, B, r), r.dispatch = n, r = ws(!1), a = fc.bind(null, B, !1, r.queue), r = cs(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = Es.bind(null, B, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function Ps(e) {
		return Fs(ls(), Wo, e);
	}
	function Fs(e, t, n) {
		if (t = gs(e, t, Ms)[0], e = hs(ms)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = ds(t);
		} catch (e) {
			throw e === Xa ? Qa : e;
		}
		else r = t;
		t = ls();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (B.flags |= 2048, Rs(9, { destroy: void 0 }, Is.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function Is(e, t) {
		e.action = t;
	}
	function Ls(e) {
		var t = ls(), n = Wo;
		if (n !== null) return Fs(t, n, e);
		ls(), t = t.memoizedState, n = ls();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function Rs(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = B.updateQueue, t === null && (t = us(), B.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function zs() {
		return ls().memoizedState;
	}
	function Bs(e, t, n, r) {
		var i = cs();
		B.flags |= e, i.memoizedState = Rs(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function Vs(e, t, n, r) {
		var i = ls();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		Wo !== null && r !== null && es(r, Wo.memoizedState.deps) ? i.memoizedState = Rs(t, a, n, r) : (B.flags |= e, i.memoizedState = Rs(1 | t, a, n, r));
	}
	function Hs(e, t) {
		Bs(8390656, 8, e, t);
	}
	function Us(e, t) {
		Vs(2048, 8, e, t);
	}
	function Ws(e) {
		B.flags |= 4;
		var t = B.updateQueue;
		if (t === null) t = us(), B.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function Gs(e) {
		var t = ls().memoizedState;
		return Ws({
			ref: t,
			nextImpl: e
		}), function() {
			if (U & 2) throw Error(i(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function Ks(e, t) {
		return Vs(4, 2, e, t);
	}
	function qs(e, t) {
		return Vs(4, 4, e, t);
	}
	function Js(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function Ys(e, t, n) {
		n = n == null ? null : n.concat([e]), Vs(4, 4, Js.bind(null, t, e), n);
	}
	function Xs() {}
	function Zs(e, t) {
		var n = ls();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && es(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function Qs(e, t) {
		var n = ls();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && es(t, r[1])) return r[0];
		if (r = e(), Jo) {
			Qe(!0);
			try {
				e();
			} finally {
				Qe(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function $s(e, t, n) {
		return n === void 0 || Uo & 1073741824 && !(G & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = Id(), B.lanes |= e, ud |= e, n);
	}
	function ec(e, t, n, r) {
		return Hr(n, t) ? n : Do.current === null ? !(Uo & 106) || Uo & 1073741824 && !(G & 261930) ? (Fc = !0, e.memoizedState = n) : (e = Id(), B.lanes |= e, ud |= e, t) : (e = $s(e, n, r), Hr(e, t) || (Fc = !0), e);
	}
	function tc(e, t, n, r, i) {
		var a = L.p;
		L.p = a !== 0 && 8 > a ? a : 8;
		var o = I.T, s = {};
		s.types = o === null ? null : o.types, I.T = s, fc(e, !1, t, n);
		try {
			var c = i(), l = I.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? dc(e, t, Wa(c, r), Fd(e)) : dc(e, t, r, Fd(e));
		} catch (n) {
			dc(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, Fd());
		} finally {
			L.p = a, o !== null && s.types !== null && (o.types = s.types), I.T = o;
		}
	}
	function nc() {}
	function V(e, t, n, r) {
		if (e.tag !== 5) throw Error(i(476));
		var a = rc(e).queue;
		tc(e, a, t, he, n === null ? nc : function() {
			return ic(e), n(r);
		});
	}
	function rc(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: he,
			baseState: he,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ms,
				lastRenderedState: he
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ms,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function ic(e) {
		var t = rc(e);
		t.next === null && (t = e.alternate.memoizedState), dc(e, t.next.queue, {}, Fd());
	}
	function ac() {
		return Ea(dh);
	}
	function oc() {
		return ls().memoizedState;
	}
	function sc() {
		return ls().memoizedState;
	}
	function cc(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = Fd();
					e = vo(n);
					var r = yo(t, e, n);
					r !== null && (Rd(r, t, n), bo(r, t, n)), t = { cache: Na() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function lc(e, t, n) {
		var r = Fd();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, pc(e) ? mc(t, n) : (n = Di(e, t, n, r), n !== null && (Rd(n, e, r), hc(n, t, r)));
	}
	function uc(e, t, n) {
		dc(e, t, n, Fd());
	}
	function dc(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (pc(e)) mc(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, Hr(s, o)) return Ei(e, t, i, 0), rd === null && Ti(), !1;
			} catch {}
			if (n = Di(e, t, i, r), n !== null) return Rd(n, e, r), hc(n, t, r), !0;
		}
		return !1;
	}
	function fc(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: Rf(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, pc(e)) {
			if (t) throw Error(i(479));
		} else t = Di(e, n, r, 2), t !== null && Rd(t, e, 2);
	}
	function pc(e) {
		var t = e.alternate;
		return e === B || t !== null && t === B;
	}
	function mc(e, t) {
		qo = Ko = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function hc(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, gt(e, n);
		}
	}
	var gc = {
		readContext: Ea,
		use: fs,
		useCallback: $o,
		useContext: $o,
		useEffect: $o,
		useImperativeHandle: $o,
		useLayoutEffect: $o,
		useInsertionEffect: $o,
		useMemo: $o,
		useReducer: $o,
		useRef: $o,
		useState: $o,
		useDebugValue: $o,
		useDeferredValue: $o,
		useTransition: $o,
		useSyncExternalStore: $o,
		useId: $o,
		useHostTransitionStatus: $o,
		useFormState: $o,
		useActionState: $o,
		useOptimistic: $o,
		useMemoCache: $o,
		useCacheRefresh: $o,
		useEffectEvent: $o
	}, _c = {
		readContext: Ea,
		use: fs,
		useCallback: function(e, t) {
			return cs().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: Ea,
		useEffect: Hs,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), Bs(4194308, 4, Js.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return Bs(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			Bs(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = cs();
			t = t === void 0 ? null : t;
			var r = e();
			if (Jo) {
				Qe(!0);
				try {
					e();
				} finally {
					Qe(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = cs();
			if (n !== void 0) {
				var i = n(t);
				if (Jo) {
					Qe(!0);
					try {
						n(t);
					} finally {
						Qe(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = lc.bind(null, B, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = cs();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = ws(e);
			var t = e.queue, n = uc.bind(null, B, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: Xs,
		useDeferredValue: function(e, t) {
			return $s(cs(), e, t);
		},
		useTransition: function() {
			var e = ws(!1);
			return e = tc.bind(null, B, e.queue, !0, !1), cs().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = B, a = cs();
			if (z) {
				if (n === void 0) throw Error(i(407));
				n = n();
			} else {
				if (n = t(), rd === null) throw Error(i(349));
				G & 127 || ys(r, t, n);
			}
			a.memoizedState = n;
			var o = {
				value: n,
				getSnapshot: t
			};
			return a.queue = o, Hs(xs.bind(null, r, o, e), [e]), r.flags |= 2048, Rs(9, { destroy: void 0 }, bs.bind(null, r, o, n, t), null), n;
		},
		useId: function() {
			var e = cs(), t = rd.identifierPrefix;
			if (z) {
				var n = Qi, r = Zi;
				n = (r & ~(1 << 32 - $e(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = Yo++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = Qo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: ac,
		useFormState: Ns,
		useActionState: Ns,
		useOptimistic: function(e) {
			var t = cs();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = fc.bind(null, B, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: ps,
		useCacheRefresh: function() {
			return cs().memoizedState = cc.bind(null, B);
		},
		useEffectEvent: function(e) {
			var t = cs(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (U & 2) throw Error(i(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, vc = {
		readContext: Ea,
		use: fs,
		useCallback: Zs,
		useContext: Ea,
		useEffect: Us,
		useImperativeHandle: Ys,
		useInsertionEffect: Ks,
		useLayoutEffect: qs,
		useMemo: Qs,
		useReducer: hs,
		useRef: zs,
		useState: function() {
			return hs(ms);
		},
		useDebugValue: Xs,
		useDeferredValue: function(e, t) {
			return ec(ls(), Wo.memoizedState, e, t);
		},
		useTransition: function() {
			var e = hs(ms)[0], t = ls().memoizedState;
			return [typeof e == "boolean" ? e : ds(e), t];
		},
		useSyncExternalStore: vs,
		useId: oc,
		useHostTransitionStatus: ac,
		useFormState: Ps,
		useActionState: Ps,
		useOptimistic: function(e, t) {
			return Ts(ls(), Wo, e, t);
		},
		useMemoCache: ps,
		useCacheRefresh: sc,
		useEffectEvent: Gs
	}, yc = {
		readContext: Ea,
		use: fs,
		useCallback: Zs,
		useContext: Ea,
		useEffect: Us,
		useImperativeHandle: Ys,
		useInsertionEffect: Ks,
		useLayoutEffect: qs,
		useMemo: Qs,
		useReducer: _s,
		useRef: zs,
		useState: function() {
			return _s(ms);
		},
		useDebugValue: Xs,
		useDeferredValue: function(e, t) {
			var n = ls();
			return Wo === null ? $s(n, e, t) : ec(n, Wo.memoizedState, e, t);
		},
		useTransition: function() {
			var e = _s(ms)[0], t = ls().memoizedState;
			return [typeof e == "boolean" ? e : ds(e), t];
		},
		useSyncExternalStore: vs,
		useId: oc,
		useHostTransitionStatus: ac,
		useFormState: Ls,
		useActionState: Ls,
		useOptimistic: function(e, t) {
			var n = ls();
			return Wo === null ? (n.baseState = e, [e, n.queue.dispatch]) : Ts(n, Wo, e, t);
		},
		useMemoCache: ps,
		useCacheRefresh: sc,
		useEffectEvent: Gs
	};
	function bc(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : D({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var xc = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = Fd(), i = vo(r);
			i.payload = t, n != null && (i.callback = n), t = yo(e, i, r), t !== null && (Rd(t, e, r), bo(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = Fd(), i = vo(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = yo(e, i, r), t !== null && (Rd(t, e, r), bo(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = Fd(), r = vo(n);
			r.tag = 2, t != null && (r.callback = t), t = yo(e, r, n), t !== null && (Rd(t, e, n), bo(t, e, n));
		}
	};
	function Sc(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Ur(n, r) || !Ur(i, a) : !0;
	}
	function Cc(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && xc.enqueueReplaceState(t, t.state, null);
	}
	function wc(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = D({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function Tc(e) {
		xi(e);
	}
	function Ec(e) {
		console.error(e);
	}
	function Dc(e) {
		xi(e);
	}
	function Oc(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function kc(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function Ac(e, t, n) {
		return n = vo(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			Oc(e, t);
		}, n;
	}
	function jc(e) {
		return e = vo(e), e.tag = 3, e;
	}
	function Mc(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				kc(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			kc(t, n, r), typeof i != "function" && (Sd === null ? Sd = /* @__PURE__ */ new Set([this]) : Sd.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function Nc(e, t, n, r, a) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && Ca(t, n, a, !0), n = Mo.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13:
					case 19: return No === null ? Xd() : n.alternate === null && ld === 0 && (ld = 3), n.flags &= -257, n.flags |= 65536, n.lanes = a, r === $a ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), vf(e, r, a)), !1;
					case 22: return n.flags |= 65536, r === $a ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), vf(e, r, a)), !1;
				}
				throw Error(i(435, n.tag));
			}
			return vf(e, r, a), Xd(), !1;
		}
		if (z) return t = Mo.current, t === null ? (r !== ca && (t = Error(i(423), { cause: r }), ha(Ui(t, n))), e = e.current.alternate, e.flags |= 65536, a &= -a, e.lanes |= a, r = Ui(r, n), a = Ac(e.stateNode, r, a), xo(e, a), ld !== 4 && (ld = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = a, r !== ca && (e = Error(i(422), { cause: r }), ha(Ui(e, n)))), !1;
		var o = Error(i(520), { cause: r });
		if (o = Ui(o, n), hd === null ? hd = [o] : hd.push(o), ld !== 4 && (ld = 2), t === null) return !0;
		r = Ui(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = a & -a, n.lanes |= e, e = Ac(n.stateNode, r, e), xo(n, e), !1;
				case 1:
					if (t = n.type, o = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || o !== null && typeof o.componentDidCatch == "function" && (Sd === null || !Sd.has(o)))) return n.flags |= 65536, a &= -a, n.lanes |= a, a = jc(a), Mc(a, e, n, r), xo(n, a), !1;
					break;
				case 22: if (n.memoizedState !== null) return n.flags |= 65536, !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var Pc = Error(i(461)), Fc = !1;
	function Ic(e, t, n, r) {
		t.child = e === null ? mo(t, null, n, r) : po(t, e.child, n, r);
	}
	function Lc(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return Ta(t), r = ts(e, t, n, o, a, i), s = as(), e !== null && !Fc ? (os(e, t, i), dl(e, t, i)) : (z && s && ta(t), t.flags |= 1, Ic(e, t, r, i), t.child);
	}
	function Rc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !Pi(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, zc(e, t, a, r, i)) : (e = Li(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !fl(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Ur : n, n(o, r) && e.ref === t.ref) return dl(e, t, i);
		}
		return t.flags |= 1, e = Fi(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function zc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Ur(a, r) && e.ref === t.ref) {
				if (Fc = !1, t.pendingProps = r = a, fl(e, i)) e.flags & 131072 && (Fc = !0);
				else return t.lanes = e.lanes, dl(e, t, i);
			}
		}
		return qc(e, t, n, r, i);
	}
	function Bc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return Hc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && Ja(t, a === null ? null : a.cachePool), a === null ? Ao() : ko(t, a), Io(t);
			else return r = t.lanes = 536870912, Hc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && Ja(t, null), Ao(), Lo()) : (Ja(t, a.cachePool), ko(t, a), Lo(), t.memoizedState = null);
		return Ic(e, t, i, n), t.child;
	}
	function Vc(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function Hc(e, t, n, r, i) {
		var a = qa();
		return a = a === null ? null : {
			parent: Ma._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && Ja(t, null), Ao(), Io(t), e !== null && Ca(e, t, r, !0), t.childLanes = i, null;
	}
	function Uc(e, t) {
		return t = nl({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function Wc(e, t, n) {
		return po(t, e.child, null, n), e = Uc(t, t.pendingProps), e.flags |= 2, Ro(t), t.memoizedState = null, e;
	}
	function Gc(e, t, n) {
		var r = t.pendingProps, a = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (z) {
				if (r.mode === "hidden") return e = Uc(t, r), t.lanes = 536870912, e.memoizedState = {
					baseLanes: 0,
					cachePool: null
				}, Vc(null, e);
				if (Fo(t), (e = aa) ? (e = lm(e, sa), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Xi === null ? null : {
						id: Zi,
						overflow: Qi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Bi(e), n.return = t, t.child = n, ia = t, aa = null)) : e = null, e === null) throw la(t);
				return t.lanes = 536870912, null;
			}
			return Uc(t, r);
		}
		var o = e.memoizedState;
		if (o !== null) {
			var s = o.dehydrated;
			if (Fo(t), a) {
				if (t.flags & 256) t.flags &= -257, t = Wc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(i(558));
			} else if (Fc || Ca(e, t, n, !1), a = (n & e.childLanes) !== 0, Fc || a) {
				if (Do.current === null) {
					if (r = rd, r !== null && (s = _t(r, n), s !== 0 && s !== o.retryLane)) throw o.retryLane = s, Oi(e, s), Rd(r, e, s), Pc;
					Xd();
				}
				t = Wc(e, t, n);
			} else e = o.treeContext, aa = pm(s.nextSibling), ia = t, z = !0, oa = null, sa = !1, e !== null && ra(t, e), t = Uc(t, r), t.flags |= 134221824;
			return t;
		}
		return e = Fi(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function Kc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(i(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function qc(e, t, n, r, i) {
		return Ta(t), n = ts(e, t, n, r, void 0, i), r = as(), e !== null && !Fc ? (os(e, t, i), dl(e, t, i)) : (z && r && ta(t), t.flags |= 1, Ic(e, t, n, i), t.child);
	}
	function Jc(e, t, n, r, i, a) {
		return Ta(t), t.updateQueue = null, n = rs(t, r, n, i), ns(e), r = as(), e !== null && !Fc ? (os(e, t, a), dl(e, t, a)) : (z && r && ta(t), t.flags |= 1, Ic(e, t, n, a), t.child);
	}
	function Yc(e, t, n, r, i) {
		if (Ta(t), t.stateNode === null) {
			var a = ji, o = n.contextType;
			typeof o == "object" && o && (a = Ea(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = xc, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, go(t), o = n.contextType, a.context = typeof o == "object" && o ? Ea(o) : ji, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (bc(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && xc.enqueueReplaceState(a, a.state, null), wo(t, r, a, i), Co(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = wc(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = ji, typeof u == "object" && u && (o = Ea(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && Cc(t, a, r, o), ho = !1;
			var f = t.memoizedState;
			a.state = f, wo(t, r, a, i), Co(), l = t.memoizedState, s || f !== l || ho ? (typeof d == "function" && (bc(t, n, d, r), l = t.memoizedState), (c = ho || Sc(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, _o(e, t), o = t.memoizedProps, u = wc(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = ji, typeof l == "object" && l && (c = Ea(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && Cc(t, a, r, c), ho = !1, f = t.memoizedState, a.state = f, wo(t, r, a, i), Co();
			var p = t.memoizedState;
			o !== d || f !== p || ho || e !== null && e.dependencies !== null && wa(e.dependencies) ? (typeof s == "function" && (bc(t, n, s, r), p = t.memoizedState), (u = ho || Sc(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && wa(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, Kc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = po(t, e.child, null, i), t.child = po(t, null, n, i)) : Ic(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = dl(e, t, i), e;
	}
	function Xc(e, t, n, r) {
		return pa(), t.flags |= 256, Ic(e, t, n, r), t.child;
	}
	var Zc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function Qc(e) {
		return {
			baseLanes: e,
			cachePool: Ya()
		};
	}
	function $c(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= pd), e;
	}
	function el(e, t, n) {
		var r = t.pendingProps, i = !1, a = !!(t.flags & 128), o;
		if ((o = a) || (o = e !== null && e.memoizedState === null ? !1 : !!(zo.current & 2)), o && (i = !0, t.flags &= -129), o = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (z) {
				if (i ? Po(t) : Lo(), (e = aa) ? (e = lm(e, sa), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Xi === null ? null : {
						id: Zi,
						overflow: Qi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Bi(e), n.return = t, t.child = n, ia = t, aa = null)) : e = null, e === null) throw la(t);
				return t.lanes = dm(e) ? 32 : 536870912, null;
			}
			return a = r.children, r = r.fallback, i ? (Lo(), i = t.mode, a = nl({
				mode: "hidden",
				children: a
			}, i), r = Ri(r, i, n, null), a.return = t, r.return = t, a.sibling = r, t.child = a, r = t.child, r.memoizedState = Qc(n), r.childLanes = $c(e, o, n), t.memoizedState = Zc, Vc(null, r)) : (Po(t), tl(t, a));
		}
		var s = e.memoizedState;
		if (s !== null) {
			var c = s.dehydrated;
			if (c !== null) return il(e, t, a, o, r, c, s, n);
		}
		return i ? (Lo(), i = r.fallback, a = t.mode, s = e.child, c = s.sibling, r = Fi(s, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = s.subtreeFlags & 1206910976, c === null ? (i = Ri(i, a, n, null), i.flags |= 2) : i = Fi(c, i), i.return = t, r.return = t, r.sibling = i, t.child = r, Vc(null, r), r = t.child, i = e.child.memoizedState, i === null ? i = Qc(n) : (a = i.cachePool, a === null ? a = Ya() : (s = Ma._currentValue, a = a.parent === s ? a : {
			parent: s,
			pool: s
		}), i = {
			baseLanes: i.baseLanes | n,
			cachePool: a
		}), r.memoizedState = i, r.childLanes = $c(e, o, n), t.memoizedState = Zc, Vc(e.child, r)) : (Po(t), n = e.child, e = n.sibling, n = Fi(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (o = t.deletions, o === null ? (t.deletions = [e], t.flags |= 16) : o.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function tl(e, t) {
		return t = nl({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function nl(e, t) {
		return e = Ni(22, e, null, t), e.lanes = 0, e;
	}
	function rl(e, t, n) {
		return po(t, e.child, null, n), e = tl(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function il(e, t, n, r, a, o, s, c) {
		if (n) return t.flags & 256 ? (Po(t), t.flags &= -257, rl(e, t, c)) : t.memoizedState === null ? (Lo(), o = a.fallback, s = t.mode, a = nl({
			mode: "visible",
			children: a.children
		}, s), o = Ri(o, s, c, null), o.flags |= 2, a.return = t, o.return = t, a.sibling = o, t.child = a, po(t, e.child, null, c), a = t.child, a.memoizedState = Qc(c), a.childLanes = $c(e, r, c), t.memoizedState = Zc, Vc(null, a)) : (Lo(), t.child = e.child, t.flags |= 128, null);
		if (Po(t), dm(o)) {
			if (r = o.nextSibling && o.nextSibling.dataset, r) var l = r.dgst;
			return r = l, r !== "" && (a = Error(i(419)), a.stack = "", a.digest = r, ha({
				value: a,
				source: null,
				stack: null
			})), rl(e, t, c);
		}
		if (Fc || Ca(e, t, c, !1), r = (c & e.childLanes) !== 0, Fc || r) {
			if (Do.current !== null) return rl(e, t, c);
			if (r = rd, r !== null && (a = _t(r, c), a !== 0 && a !== s.retryLane)) throw s.retryLane = a, Oi(e, a), Rd(r, e, a), Pc;
			return um(o) || Xd(), rl(e, t, c);
		}
		return um(o) ? (t.flags |= 192, t.child = e.child, null) : (e = s.treeContext, aa = pm(o.nextSibling), ia = t, z = !0, oa = null, sa = !1, e !== null && ra(t, e), t = tl(t, a.children), t.flags |= 134221824, t);
	}
	function al(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), xa(e.return, t, n);
	}
	function ol(e) {
		for (var t = null; e !== null;) {
			var n = e.alternate;
			n !== null && Ho(n) === null && (t = e), e = e.sibling;
		}
		return t;
	}
	function sl(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function cl(e) {
		var t = e.child;
		for (e.child = null; t !== null;) {
			var n = t.sibling;
			t.sibling = e.child, e.child = t, t = n;
		}
	}
	function ll(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = zo.current;
		if (t.flags & 128) return Bo(t, o), null;
		var s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, Bo(t, o), i === "backwards" && e !== null ? (cl(e), Ic(e, t, r, n), cl(e)) : Ic(e, t, r, n), r = z ? qi : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && al(e, n, t);
			else if (e.tag === 19) al(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "backwards":
				n = ol(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null, cl(t)), sl(t, !0, i, null, a, r);
				break;
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && Ho(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				sl(t, !0, n, null, a, r);
				break;
			case "together":
				sl(t, !1, null, null, void 0, r);
				break;
			case "independent":
				t.memoizedState = null;
				break;
			default: n = ol(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), sl(t, !1, i, n, a, r);
		}
		return t.child;
	}
	function ul(e, t, n) {
		var r = t.pendingProps;
		return ya(t, t.type, r.value), Ic(e, t, r.children, n), t.child;
	}
	function dl(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), ud |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if (Ca(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(i(153));
		if (t.child !== null) {
			for (e = t.child, n = Fi(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = Fi(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function fl(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && wa(e)));
	}
	function pl(e, t, n) {
		switch (t.tag) {
			case 3:
				Te(t, t.stateNode.containerInfo), ya(t, Ma, e.memoizedState.cache), pa();
				break;
			case 27:
			case 5:
				De(t);
				break;
			case 4:
				Te(t, t.stateNode.containerInfo);
				break;
			case 10:
				ya(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, Fo(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) {
					if (r.dehydrated !== null) return Po(t), t.flags |= 128, null;
					r = Ca(e, t, n, !1);
					var i = t.child.childLanes;
					return r || (n & i) !== 0 ? el(e, t, n) : (Po(t), e = dl(e, t, n), e === null ? null : e.sibling);
				}
				Po(t);
				break;
			case 19:
				if (t.flags & 128) return ll(e, t, n);
				if (i = !!(e.flags & 128), r = (n & t.childLanes) !== 0, r ||= (Ca(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return ll(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), Bo(t, zo.current), r) break;
				return null;
			case 22: return t.lanes = 0, Bc(e, t, n, t.pendingProps);
			case 24: ya(t, Ma, e.memoizedState.cache);
		}
		return dl(e, t, n);
	}
	function ml(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) Fc = !0;
			else {
				if (!fl(e, n) && !(t.flags & 128)) return Fc = !1, pl(e, t, n);
				Fc = !!(e.flags & 131072);
			}
		} else Fc = !1, z && t.flags & 1048576 && ea(t, qi, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = no(t.elementType), t.type = e, typeof e == "function") Pi(e) ? (r = wc(e, r), t.tag = 1, t = Yc(null, t, e, r, n)) : (t.tag = 0, t = qc(null, t, e, r, n));
					else {
						if (e != null) {
							var a = e.$$typeof;
							if (a === F) {
								t.tag = 11, t = Lc(null, t, e, r, n);
								break a;
							}
							if (a === re) {
								t.tag = 14, t = Rc(null, t, e, r, n);
								break a;
							}
							if (a === P) {
								t.tag = 10, t.type = e, t = ul(null, t, n);
								break a;
							}
						}
						throw t = pe(e) || e, Error(i(306, t, ""));
					}
				}
				return t;
			case 0: return qc(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, a = wc(r, t.pendingProps), Yc(e, t, r, a, n);
			case 3:
				a: {
					if (Te(t, t.stateNode.containerInfo), e === null) throw Error(i(387));
					r = t.pendingProps;
					var o = t.memoizedState;
					a = o.element, _o(e, t), wo(t, r, null, n);
					var s = t.memoizedState;
					if (r = s.cache, ya(t, Ma, r), r !== o.cache && Sa(t, [Ma], n, !0), Co(), r = s.element, o.isDehydrated) {
						if (o = {
							element: r,
							isDehydrated: !1,
							cache: s.cache
						}, t.updateQueue.baseState = o, t.memoizedState = o, t.flags & 256) {
							t = Xc(e, t, r, n);
							break a;
						}
						if (r !== a) {
							a = Ui(Error(i(424)), t), ha(a), t = Xc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (aa = pm(e.firstChild), ia = t, z = !0, oa = null, sa = !0, n = mo(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 134221824, n = n.sibling;
					} else {
						if (pa(), r === a) {
							t = dl(e, t, n);
							break a;
						}
						Ic(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return Kc(e, t), e === null ? (n = Lm(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : z || (t.stateNode = gp(t.type, t.pendingProps, Ce.current, t)) : t.memoizedState = Lm(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return De(t), e === null && z && (r = t.stateNode = ym(t.type, t.pendingProps, Ce.current), ia = t, sa = !0, a = aa, Ep(t.type) ? (mm = a, aa = pm(r.firstChild)) : aa = a), Ic(e, t, t.pendingProps.children, n), Kc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && z && ((a = r = aa) && (r = sm(r, t.type, t.pendingProps, sa), r === null ? a = !1 : (t.stateNode = r, ia = t, aa = pm(r.firstChild), sa = !1, a = !0)), a || la(t)), De(t), a = t.type, o = t.pendingProps, s = e === null ? null : e.memoizedProps, r = o.children, _p(a, o) ? r = null : s !== null && _p(a, s) && (t.flags |= 32), t.memoizedState !== null && (a = ts(e, t, is, null, null, n), dh._currentValue = a), Kc(e, t), Ic(e, t, r, n), t.child;
			case 6: return e === null && z && ((e = n = aa) && (n = cm(n, t.pendingProps, sa), n === null ? e = !1 : (t.stateNode = n, ia = t, aa = null, e = !0)), e || la(t)), null;
			case 13: return el(e, t, n);
			case 4: return Te(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = po(t, null, r, n) : Ic(e, t, r, n), t.child;
			case 11: return Lc(e, t, t.type, t.pendingProps, n);
			case 7: return r = t.pendingProps, Kc(e, t), Ic(e, t, r, n), t.child;
			case 8: return Ic(e, t, t.pendingProps.children, n), t.child;
			case 12: return Ic(e, t, t.pendingProps.children, n), t.child;
			case 10: return ul(e, t, n);
			case 9: return a = t.type._context, r = t.pendingProps.children, Ta(t), a = Ea(a), r = r(a), t.flags |= 1, Ic(e, t, r, n), t.child;
			case 14: return Rc(e, t, t.type, t.pendingProps, n);
			case 15: return zc(e, t, t.type, t.pendingProps, n);
			case 19: return ll(e, t, n);
			case 31: return Gc(e, t, n);
			case 22: return Bc(e, t, n, t.pendingProps);
			case 24: return Ta(t), r = Ea(Ma), e === null ? (a = qa(), a === null && (a = rd, o = Na(), a.pooledCache = o, o.refCount++, o !== null && (a.pooledCacheLanes |= n), a = o), t.memoizedState = {
				parent: r,
				cache: a
			}, go(t), ya(t, Ma, a)) : ((e.lanes & n) !== 0 && (_o(e, t), wo(t, null, null, n), Co()), a = e.memoizedState, o = t.memoizedState, a.parent === r ? (r = o.cache, ya(t, Ma, r), r !== a.cache && Sa(t, [Ma], n, !0)) : (a = {
				parent: r,
				cache: r
			}, t.memoizedState = a, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = a), ya(t, Ma, r))), Ic(e, t, t.pendingProps.children, n), t.child;
			case 30: return t.stateNode === null && (t.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}), r = t.pendingProps, r.name != null && r.name !== "auto" ? t.flags |= e === null ? 18882560 : 18874368 : z && ta(t), e !== null && e.memoizedProps.name !== r.name ? t.flags |= 4194816 : Kc(e, t), Ic(e, t, r.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(i(156, t.tag));
	}
	function hl(e) {
		e.flags |= 4;
	}
	function gl(e, t, n, r, i) {
		var a;
		if ((a = !!(e.mode & 32)) && (a = n === null ? Qm(t, r) : Qm(t, r) && (r.src !== n.src || r.srcSet !== n.srcSet)), a) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (qd()) e.flags |= 8192;
				else throw ro = $a, Za;
			}
		} else e.flags &= -16777217;
	}
	function _l(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !$m(t)) {
			if (qd()) e.flags |= 8192;
			else throw ro = $a, Za;
		}
	}
	function vl(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : dt(), e.lanes |= t, md |= t);
	}
	function yl(e, t) {
		if (!z) switch (e.tailMode) {
			case "visible": break;
			case "collapsed":
				for (var n = e.tail, r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
				break;
			default:
				for (t = e.tail, n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
		}
	}
	function bl(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 1206910976, r |= i.flags & 1206910976, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function xl(e, t, n) {
		var r = t.pendingProps;
		switch (na(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return bl(t), null;
			case 1: return bl(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), ba(Ma), Ee(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (fa(t) ? hl(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, ma())), bl(t), null;
			case 26:
				var a = t.type, o = t.memoizedState;
				return e === null ? (hl(t), o === null ? (bl(t), gl(t, a, null, r, n)) : (bl(t), _l(t, o))) : o ? o === e.memoizedState ? (bl(t), t.flags &= -16777217) : (hl(t), bl(t), _l(t, o)) : (e = e.memoizedProps, e !== r && hl(t), bl(t), gl(t, a, e, r, n)), null;
			case 27:
				if (Oe(t), n = Ce.current, a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && hl(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return bl(t), t.subtreeFlags &= -33554433, null;
					}
					e = xe.current, fa(t) ? ua(t, e) : (e = ym(a, r, n), t.stateNode = e, hl(t));
				}
				return bl(t), t.subtreeFlags &= -33554433, null;
			case 5:
				if (Oe(t), a = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && hl(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(i(166));
						return bl(t), t.subtreeFlags &= -33554433, null;
					}
					if (o = xe.current, fa(t)) ua(t, o);
					else {
						var s = pp(Ce.current);
						switch (o) {
							case 1:
								o = s.createElementNS("http://www.w3.org/2000/svg", a);
								break;
							case 2:
								o = s.createElementNS("http://www.w3.org/1998/Math/MathML", a);
								break;
							default: switch (a) {
								case "svg":
									o = s.createElementNS("http://www.w3.org/2000/svg", a);
									break;
								case "math":
									o = s.createElementNS("http://www.w3.org/1998/Math/MathML", a);
									break;
								case "script":
									o = s.createElement("div"), o.innerHTML = "<script><\/script>", o = o.removeChild(o.firstChild);
									break;
								case "select":
									o = typeof r.is == "string" ? s.createElement("select", { is: r.is }) : s.createElement("select"), r.multiple ? o.multiple = !0 : r.size && (o.size = r.size);
									break;
								default: o = typeof r.is == "string" ? s.createElement(a, { is: r.is }) : s.createElement(a);
							}
						}
						o[Ct] = t, o[wt] = r;
						a: for (s = t.child; s !== null;) {
							if (s.tag === 5 || s.tag === 6) o.appendChild(s.stateNode);
							else if (s.tag !== 4 && s.tag !== 27 && s.child !== null) {
								s.child.return = s, s = s.child;
								continue;
							}
							if (s === t) break a;
							for (; s.sibling === null;) {
								if (s.return === null || s.return === t) break a;
								s = s.return;
							}
							s.sibling.return = s.return, s = s.sibling;
						}
						t.stateNode = o;
						a: switch (op(o, a, r), a) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && hl(t);
					}
				}
				return bl(t), t.subtreeFlags &= -33554433, gl(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && hl(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(i(166));
					if (e = Ce.current, fa(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, a = ia, a !== null) switch (a.tag) {
							case 27:
							case 5: r = a.memoizedProps;
						}
						e[Ct] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || ip(e.nodeValue, n)), e || la(t, !0);
					} else e = pp(e).createTextNode(r), e[Ct] = t, t.stateNode = e;
				}
				return bl(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = fa(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(i(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(i(557));
							e[Ct] = t;
						} else pa(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						bl(t), e = !1;
					} else n = ma(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (Ro(t), t) : (Ro(t), null);
					if (t.flags & 128) throw Error(i(558));
				}
				return bl(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (a = fa(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!a) throw Error(i(318));
							if (a = t.memoizedState, a = a === null ? null : a.dehydrated, !a) throw Error(i(317));
							a[Ct] = t;
						} else pa(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						bl(t), a = !1;
					} else a = ma(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = a), a = !0;
					if (!a) return t.flags & 256 ? (Ro(t), t) : (Ro(t), null);
				}
				return Ro(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, a = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (a = r.alternate.memoizedState.cachePool.pool), o = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (o = r.memoizedState.cachePool.pool), o !== a && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), vl(t, t.updateQueue), bl(t), null);
			case 4: return Ee(), e === null && Jf(t.stateNode.containerInfo), t.flags |= 67108864, bl(t), null;
			case 10: return ba(t.type), bl(t), null;
			case 19:
				if (Vo(t), r = t.memoizedState, r === null) return bl(t), null;
				if (a = !!(t.flags & 128), o = r.rendering, o === null) {
					if (a) yl(r, !1);
					else {
						if (ld !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (o = Ho(e), o !== null) {
								for (t.flags |= 128, yl(r, !1), e = o.updateQueue, t.updateQueue = e, vl(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) Ii(n, e), n = n.sibling;
								return Bo(t, zo.current & 1 | 2), z && $i(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && Ve() > bd && (t.flags |= 128, a = !0, yl(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!a) {
						if (e = Ho(o), e !== null) {
							if (t.flags |= 128, a = !0, e = e.updateQueue, t.updateQueue = e, vl(t, e), yl(r, !0), r.tail === null && r.tailMode !== "collapsed" && r.tailMode !== "visible" && !o.alternate && !z) return bl(t), null;
						} else 2 * Ve() - r.renderingStartTime > bd && n !== 536870912 && (t.flags |= 128, a = !0, yl(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (o.sibling = t.child, t.child = o) : (e = r.last, e === null ? t.child = o : e.sibling = o, r.last = o);
				}
				if (r.tail !== null) {
					e = r.tail;
					a: {
						for (n = e; n !== null;) {
							if (n.alternate !== null) {
								n = !1;
								break a;
							}
							n = n.sibling;
						}
						n = !0;
					}
					return r.rendering = e, r.tail = e.sibling, r.renderingStartTime = Ve(), e.sibling = null, o = zo.current, o = a ? o & 1 | 2 : o & 1, r.tailMode === "visible" || r.tailMode === "collapsed" || !n || z ? Bo(t, o) : (n = o, be(Mo, t), be(zo, n), No === null && (No = t)), z && $i(t, r.treeForkCount), e;
				}
				return bl(t), null;
			case 22:
			case 23: return Ro(t), jo(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (bl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : bl(t), n = t.updateQueue, n !== null && vl(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && ye(Ka), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), ba(Ma), bl(t), null;
			case 25: return null;
			case 30: return t.flags |= 33554432, bl(t), null;
		}
		throw Error(i(156, t.tag));
	}
	function Sl(e, t) {
		switch (na(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return ba(Ma), Ee(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return Oe(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (Ro(t), t.alternate === null) throw Error(i(340));
					pa();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (Ro(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(i(340));
					pa();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return Vo(t), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null), t.flags |= 4, t) : null;
			case 4: return Ee(), null;
			case 10: return ba(t.type), null;
			case 22:
			case 23: return Ro(t), jo(), e !== null && ye(Ka), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return ba(Ma), null;
			case 25: return null;
			default: return null;
		}
	}
	function Cl(e, t) {
		switch (na(t), t.tag) {
			case 3:
				ba(Ma), Ee();
				break;
			case 26:
			case 27:
			case 5:
				Oe(t);
				break;
			case 4:
				Ee();
				break;
			case 31:
				t.memoizedState !== null && Ro(t);
				break;
			case 13:
				Ro(t);
				break;
			case 19:
				Vo(t);
				break;
			case 10:
				ba(t.type);
				break;
			case 22:
			case 23:
				Ro(t), jo(), e !== null && ye(Ka);
				break;
			case 24: ba(Ma);
		}
	}
	function wl(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			q(t, t.return, e);
		}
	}
	function Tl(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								q(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			q(t, t.return, e);
		}
	}
	function El(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				Eo(t, n);
			} catch (t) {
				q(e, e.return, t);
			}
		}
	}
	function Dl(e, t, n) {
		n.props = wc(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			q(e, t, n);
		}
	}
	function Ol(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						var i = e.stateNode, a = vi(e.memoizedProps, i);
						(i.ref === null || i.ref.name !== a) && (i.ref = Rp(a)), r = i.ref;
						break;
					case 7:
						if (e.stateNode === null) {
							var o = new zp(e);
							m(e.child, !1, nm, o, void 0, void 0), e.stateNode = o;
						}
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			q(e, t, n);
		}
	}
	function kl(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) {
			if (typeof r == "function") try {
				r();
			} catch (n) {
				q(e, t, n);
			} finally {
				e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
			}
			else if (typeof n == "function") try {
				n(null);
			} catch (n) {
				q(e, t, n);
			}
			else n.current = null;
		}
	}
	function Al(e, t) {
		if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && e.alternate === null && t !== null) for (var n = 0; n < t.length; n++) im(e.stateNode, t[n]);
	}
	function jl(e) {
		for (var t = e.return; t !== null && (Pl(t) && im(e.stateNode, t.stateNode), !Nl(t));) t = t.return;
	}
	function Ml(e) {
		for (var t = e.return; t !== null && (Pl(t) && am(e.stateNode, t.stateNode), !Nl(t));) t = t.return;
	}
	function Nl(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 27;
	}
	function Pl(e) {
		return e && e.tag === 7 && e.stateNode !== null;
	}
	function Fl(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			q(e, e.return, t);
		}
	}
	function Il(e, t, n) {
		try {
			var r = e.stateNode;
			cp(r, e.type, n, t), r[wt] = t;
		} catch (t) {
			q(e, e.return, t);
		}
	}
	function Ll(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Ep(e.type) || e.tag === 4;
	}
	function Rl(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || Ll(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Ep(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function zl(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(i, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(i), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = yn)), Al(e, r), R = !0;
		else if (i !== 4 && (i === 27 && (Al(e, r), r = null, Ep(e.type) && (n = e.stateNode, t = null)), e = e.child, e !== null)) for (zl(e, t, n, r), e = e.sibling; e !== null;) zl(e, t, n, r), e = e.sibling;
	}
	function Bl(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? n.insertBefore(i, t) : n.appendChild(i), Al(e, r), R = !0;
		else if (i !== 4 && (i === 27 && (Al(e, r), r = null, Ep(e.type) && (n = e.stateNode)), e = e.child, e !== null)) for (Bl(e, t, n, r), e = e.sibling; e !== null;) Bl(e, t, n, r), e = e.sibling;
	}
	function Vl(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			op(t, r, n), t[Ct] = e, t[wt] = n;
		} catch (t) {
			q(e, e.return, t);
		}
	}
	var Hl = !1, Ul = null;
	function Wl(e) {
		(e.tag === 30 || e.subtreeFlags & 33554432) && (Hl = !0);
	}
	var Gl = null;
	function Kl() {
		var e = Gl;
		return Gl = null, e;
	}
	var ql = 0;
	function Jl(e, t, n, r, i) {
		return ql = 0, Yl(e.child, t, n, r, i);
	}
	function Yl(e, t, n, r, i) {
		for (var a = !1; e !== null;) {
			if (e.tag === 5) {
				var o = e.stateNode;
				if (r !== null) {
					var s = Mp(o);
					r.push(s), s.view && (a = !0);
				} else a || Mp(o).view && (a = !0);
				Hl = !0, kp(o, ql === 0 ? t : t + "_" + ql, n), ql++;
			} else (e.tag !== 22 || e.memoizedState === null) && (e.tag === 30 && i || Yl(e.child, t, n, r, i) && (a = !0));
			e = e.sibling;
		}
		return a;
	}
	function Xl(e, t) {
		for (; e !== null;) e.tag === 5 ? Ap(e.stateNode, e.memoizedProps) : (e.tag !== 22 || e.memoizedState === null) && (e.tag === 30 && t || Xl(e.child, t)), e = e.sibling;
	}
	function Zl(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if ((e.tag !== 22 || e.memoizedState === null) && (Zl(e), e.tag === 30 && e.flags & 18874368 && e.stateNode.paired)) {
				var t = e.memoizedProps;
				if (t.name == null || t.name === "auto") throw Error(i(544));
				var n = t.name;
				t = bi(t.default, t.share), t !== "none" && (Jl(e, n, t, null, !1) || Xl(e.child, !1));
			}
			e = e.sibling;
		}
	}
	function Ql(e, t) {
		if (e.tag === 30) {
			var n = e.stateNode, r = e.memoizedProps, i = vi(r, n), a = bi(r.default, n.paired ? r.share : r.enter);
			a === "none" ? Zl(e) : Jl(e, i, a, null, !1) ? (Zl(e), n.paired || t || Ld(e, r.onEnter)) : Xl(e.child, !1);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Ql(e, t), e = e.sibling;
		else Zl(e);
	}
	function $l(e) {
		if (Ul !== null && Ul.size !== 0) {
			var t = Ul;
			if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
				if (e.tag !== 22 || e.memoizedState === null) {
					if (e.tag === 30 && e.flags & 18874368) {
						var n = e.memoizedProps, r = n.name;
						if (r != null && r !== "auto") {
							var i = t.get(r);
							if (i !== void 0) {
								var a = bi(n.default, n.share);
								if (a !== "none" && (Jl(e, r, a, null, !1) ? (a = e.stateNode, i.paired = a, a.paired = i, Ld(e, n.onShare)) : Xl(e.child, !1)), t.delete(r), t.size === 0) break;
							}
						}
					}
					$l(e);
				}
				e = e.sibling;
			}
		}
	}
	function eu(e) {
		if (e.tag === 30) {
			var t = e.memoizedProps, n = vi(t, e.stateNode), r = Ul === null ? void 0 : Ul.get(n), i = bi(t.default, r === void 0 ? t.exit : t.share);
			i !== "none" && (Jl(e, n, i, null, !1) ? r === void 0 ? Ld(e, t.onExit) : (i = e.stateNode, r.paired = i, i.paired = r, Ul.delete(n), Ld(e, t.onShare)) : Xl(e.child, !1)), Ul !== null && $l(e);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) eu(e), e = e.sibling;
		else Ul !== null && $l(e);
	}
	function tu(e) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var t = e.memoizedProps, n = vi(t, e.stateNode);
				t = bi(t.default, t.update), e.flags &= -5, t !== "none" && Jl(e, n, t, e.memoizedState = [], !1);
			} else e.subtreeFlags & 33554432 && tu(e);
			e = e.sibling;
		}
	}
	function nu(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if (e.tag !== 22 || e.memoizedState === null) {
				if (e.tag === 30 && e.flags & 18874368) {
					var t = e.stateNode;
					t.paired !== null && (t.paired = null, Xl(e.child, !1));
				}
				nu(e);
			}
			e = e.sibling;
		}
	}
	function ru(e) {
		if (e.tag === 30) e.stateNode.paired = null, Xl(e.child, !1), nu(e);
		else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) ru(e), e = e.sibling;
		else nu(e);
	}
	function iu(e) {
		for (e = e.child; e !== null;) e.tag === 30 ? Xl(e.child, !1) : e.subtreeFlags & 33554432 && iu(e), e = e.sibling;
	}
	function au(e, t, n, r, i, a, o) {
		for (var s = !1; t !== null;) {
			if (t.tag === 5) {
				var c = t.stateNode;
				if (a !== null && ql < a.length) {
					var l = a[ql], u = Mp(c);
					(l.view || u.view) && (s = !0);
					var d;
					if (d = !(e.flags & 4)) {
						if (u.clip) d = !0;
						else {
							d = l.rect;
							var f = u.rect;
							d = d.y !== f.y || d.x !== f.x || d.height !== f.height || d.width !== f.width;
						}
					}
					d && (e.flags |= 4), u.abs ? u = !l.abs : (l = l.rect, u = u.rect, u = l.height !== u.height || l.width !== u.width), u && (e.flags |= 32);
				} else e.flags |= 32;
				e.flags & 4 && kp(c, ql === 0 ? n : n + "_" + ql, i), s && e.flags & 4 || (Gl === null && (Gl = []), Gl.push(c, ql === 0 ? r : r + "_" + ql, t.memoizedProps)), ql++;
			} else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && o ? e.flags |= t.flags & 32 : au(e, t.child, n, r, i, a, o) && (s = !0));
			t = t.sibling;
		}
		return s;
	}
	function ou(e, t) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var n = e.memoizedProps, r = e.stateNode, i = vi(n, r), a = bi(n.default, n.update);
				if (t) {
					r = r.clones;
					var o = r === null ? null : r.map(Np);
				} else o = e.memoizedState, e.memoizedState = null;
				r = e;
				var s = e.child;
				ql = 0, i = au(r, s, i, i, a, o, !1), e.flags & 4 && i && (t || Ld(e, n.onUpdate));
			} else e.subtreeFlags & 33554432 && ou(e, t);
			e = e.sibling;
		}
	}
	var su = !1, cu = !1, lu = !1, uu = !1, du = typeof WeakSet == "function" ? WeakSet : Set, fu = null, pu = !1, mu = !1, hu = !1, gu = !1;
	function _u(e, t, n) {
		if (e = e.containerInfo, dp = bh, e = Jr(e), Yr(e)) {
			if ("selectionStart" in e) var r = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				r = (r = e.ownerDocument) && r.defaultView || window;
				var i = r.getSelection && r.getSelection();
				if (i && i.rangeCount !== 0) {
					r = i.anchorNode;
					var a = i.anchorOffset, o = i.focusNode;
					i = i.focusOffset;
					try {
						r.nodeType, o.nodeType;
					} catch {
						r = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== r || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || i !== 0 && f.nodeType !== 3 || (l = s + i), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === r && ++u === a && (c = s), p === o && ++d === i && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					r = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else r = null;
			}
			r ||= {
				start: 0,
				end: 0
			};
		} else r = null;
		for (fp = {
			focusedElem: e,
			selectionRange: r
		}, bh = !1, n = (n & 335544064) === n, fu = t, t = n ? 9270 : 1024; fu !== null;) {
			if (e = fu, n && (r = e.deletions, r !== null)) for (a = 0; a < r.length; a++) n && eu(r[a]);
			if (e.alternate === null && e.flags & 2) n && Wl(e), vu(n);
			else {
				if (e.tag === 22) {
					if (r = e.alternate, e.memoizedState !== null) {
						r !== null && r.memoizedState === null && n && eu(r), vu(n);
						continue;
					}
					if (r !== null && r.memoizedState !== null) {
						n && Wl(e), vu(n);
						continue;
					}
				}
				r = e.child, (e.subtreeFlags & t) !== 0 && r !== null ? (r.return = e, fu = r) : (n && tu(e), vu(n));
			}
		}
		Ul = null;
	}
	function vu(e) {
		for (; fu !== null;) {
			var t = fu, n = e, r = t.alternate, a = t.flags;
			switch (t.tag) {
				case 0:
				case 11:
				case 15: break;
				case 1:
					if (a & 1024 && r !== null) {
						n = void 0, a = r.memoizedProps, r = r.memoizedState;
						var o = t.stateNode;
						try {
							var s = wc(t.type, a);
							n = o.getSnapshotBeforeUpdate(s, r), o.__reactInternalSnapshotBeforeUpdate = n;
						} catch (e) {
							q(t, t.return, e);
						}
					}
					break;
				case 3:
					if (a & 1024) {
						if (r = t.stateNode.containerInfo, n = r.nodeType, n === 9) om(r);
						else if (n === 1) switch (r.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								om(r);
								break;
							default: r.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				case 30:
					n && r !== null && (n = vi(r.memoizedProps, r.stateNode), a = t.memoizedProps, a = bi(a.default, a.update), a !== "none" && Jl(r, n, a, r.memoizedState = [], !0));
					break;
				default: if (a & 1024) throw Error(i(163));
			}
			if (r = t.sibling, r !== null) {
				r.return = t.return, fu = r;
				break;
			}
			fu = t.return;
		}
	}
	function yu(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				zu(e, n), r & 4 && wl(5, n);
				break;
			case 1:
				if (zu(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						q(n, n.return, e);
					}
					else {
						var i = wc(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							q(n, n.return, e);
						}
					}
				}
				r & 64 && El(n), r & 512 && Ol(n, n.return);
				break;
			case 3:
				if (zu(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						Eo(e, t);
					} catch (e) {
						q(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && Vl(n);
			case 26:
			case 5:
				zu(e, n), t === null && r & 4 && Fl(n), r & 512 && Ol(n, n.return);
				break;
			case 12:
				zu(e, n);
				break;
			case 31:
				zu(e, n), r & 4 && Ou(e, n);
				break;
			case 13:
				zu(e, n), r & 4 && ku(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = xf.bind(null, n), fm(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || su, !r) {
					var a = t !== null && t.memoizedState !== null || cu;
					t = su, i = cu, su = r, (cu = a) && !i ? (r = 2, n.subtreeFlags & 8772 && (r |= 1), Vu(e, n, r)) : zu(e, n), su = t, cu = i;
				}
				break;
			case 30:
				zu(e, n), r & 512 && Ol(n, n.return);
				break;
			case 7: r & 512 && Ol(n, n.return);
			default: zu(e, n);
		}
	}
	function bu(e, t) {
		for (e = e.child; e !== null;) xu(e, t), e = e.sibling;
	}
	function xu(e, t) {
		switch (e.tag) {
			case 5:
			case 26:
				try {
					var n = e.stateNode;
					if (t) {
						var r = n.style;
						typeof r.setProperty == "function" ? r.setProperty("display", "none", "important") : r.display = "none";
					} else {
						var i = e.stateNode, a = e.memoizedProps.style, o = a != null && a.hasOwnProperty("display") ? a.display : null;
						i.style.display = o == null || typeof o == "boolean" ? "" : ("" + o).trim();
					}
				} catch (t) {
					q(e, e.return, t);
				}
				Su(e, t);
				break;
			case 6:
				try {
					e.stateNode.nodeValue = t ? "" : e.memoizedProps, R = !0;
				} catch (t) {
					q(e, e.return, t);
				}
				break;
			case 18:
				try {
					var s = e.stateNode;
					t ? Op(s, !0) : Op(e.stateNode, !1);
				} catch (t) {
					q(e, e.return, t);
				}
				break;
			case 22:
			case 23:
				e.memoizedState === null && bu(e, t);
				break;
			default: bu(e, t);
		}
	}
	function Su(e, t) {
		if (e.subtreeFlags & 67108864) for (e = e.child; e !== null;) {
			a: {
				var n = e, r = t;
				switch (n.tag) {
					case 4:
						xu(n, r);
						break a;
					case 22:
						n.memoizedState === null && Su(n, r);
						break a;
					default: Su(n, r);
				}
			}
			e = e.sibling;
		}
	}
	function Cu(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, Cu(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Mt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var wu = null, Tu = !1;
	function Eu(e, t, n) {
		for (n = n.child; n !== null;) Du(e, t, n), n = n.sibling;
	}
	function Du(e, t, n) {
		if (Ze && typeof Ze.onCommitFiberUnmount == "function") try {
			Ze.onCommitFiberUnmount(Xe, n);
		} catch {}
		switch (n.tag) {
			case 26:
				cu || kl(n, t), Eu(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && !cu && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				cu || kl(n, t), Ml(n);
				var r = wu, i = Tu;
				Ep(n.type) && (wu = n.stateNode, Tu = !1), Eu(e, t, n), bm(n.stateNode, n.type, n.memoizedProps), wu = r, Tu = i;
				break;
			case 5: cu || kl(n, t), Ml(n);
			case 6:
				if (n.tag === 6 && Ml(n), r = wu, i = Tu, wu = null, Eu(e, t, n), wu = r, Tu = i, wu !== null) {
					if (Tu) try {
						(wu.nodeType === 9 ? wu.body : wu.nodeName === "HTML" ? wu.ownerDocument.body : wu).removeChild(n.stateNode), R = !0;
					} catch (e) {
						q(n, t, e);
					}
					else try {
						wu.removeChild(n.stateNode), R = !0;
					} catch (e) {
						q(n, t, e);
					}
				}
				break;
			case 18:
				wu !== null && (Tu ? (e = wu, Dp(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Kh(e)) : Dp(wu, n.stateNode));
				break;
			case 4:
				r = wu, i = Tu, wu = n.stateNode.containerInfo, Tu = !0, Eu(e, t, n), wu = r, Tu = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				Tl(2, n, t), cu || Tl(4, n, t), Eu(e, t, n);
				break;
			case 1:
				cu || (kl(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && Dl(n, t, r)), Eu(e, t, n);
				break;
			case 21:
				Eu(e, t, n);
				break;
			case 22:
				cu = (r = cu) || n.memoizedState !== null, Eu(e, t, n), cu = r;
				break;
			case 30:
				kl(n, t), Eu(e, t, n);
				break;
			case 7:
				cu || kl(n, t), Eu(e, t, n);
				break;
			default: Eu(e, t, n);
		}
	}
	function Ou(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Kh(e);
			} catch (e) {
				q(t, t.return, e);
			}
		}
	}
	function ku(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Kh(e);
		} catch (e) {
			q(t, t.return, e);
		}
	}
	function Au(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new du()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new du()), t;
			default: throw Error(i(435, e.tag));
		}
	}
	function ju(e, t) {
		var n = Au(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = Sf.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function Mu(e, t, n) {
		var r = t.deletions;
		if (r !== null) for (var a = 0; a < r.length; a++) {
			var o = r[a], s = e, c = t, l = c;
			a: for (; l !== null;) {
				switch (l.tag) {
					case 27:
						if (Ep(l.type)) {
							wu = l.stateNode, Tu = !1;
							break a;
						}
						break;
					case 5:
						wu = l.stateNode, Tu = !1;
						break a;
					case 3:
					case 4:
						wu = l.stateNode.containerInfo, Tu = !0;
						break a;
				}
				l = l.return;
			}
			if (wu === null) throw Error(i(160));
			Du(s, c, o), wu = null, Tu = !1, s = o.alternate, s !== null && (s.return = null), o.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) Pu(t, e, n), t = t.sibling;
	}
	var Nu = null;
	function Pu(e, t, n) {
		var r = e.alternate, a = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (a & 4 && (r = e.updateQueue, r = r === null ? null : r.events, r !== null)) for (var o = 0; o < r.length; o++) {
					var s = r[o];
					s.ref.impl = s.nextImpl;
				}
				Mu(t, e, n), Fu(e), a & 4 && (Tl(3, e, e.return), wl(3, e), Tl(5, e, e.return));
				break;
			case 1:
				Mu(t, e, n), Fu(e), a & 512 && (cu || r === null || kl(r, r.return)), a & 64 && su && (e = e.updateQueue, e !== null && (t = e.callbacks, t !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? t : n.concat(t))));
				break;
			case 26:
				if (o = Nu, Mu(t, e, n), Fu(e), a & 512 && (cu || r === null || kl(r, r.return)), a & 4) {
					if (a = r === null ? null : r.memoizedState, n = e.memoizedState, r === null) {
						if (n === null) {
							if (e.stateNode === null) {
								if (su) e.stateNode = gp(e.type, e.memoizedProps, t.containerInfo, e);
								else {
									a: {
										t = e.type, n = e.memoizedProps, a = o.ownerDocument || o;
										b: switch (t) {
											case "title":
												r = a.getElementsByTagName("title")[0], (!r || r[At] || r[Ct] || r.namespaceURI === "http://www.w3.org/2000/svg" || r.hasAttribute("itemprop")) && (r = a.createElement(t), a.head.insertBefore(r, a.querySelector("head > title"))), op(r, t, n), r[Ct] = e, Lt(r), t = r;
												break a;
											case "link":
												if (o = Ym("link", "href", a).get(t + (n.href || ""))) {
													for (s = 0; s < o.length; s++) if (r = o[s], r.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && r.getAttribute("rel") === (n.rel == null ? null : n.rel) && r.getAttribute("title") === (n.title == null ? null : n.title) && r.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
														o.splice(s, 1);
														break b;
													}
												}
												r = a.createElement(t), op(r, t, n), a.head.appendChild(r);
												break;
											case "meta":
												if (o = Ym("meta", "content", a).get(t + (n.content || ""))) {
													for (s = 0; s < o.length; s++) if (r = o[s], r.getAttribute("content") === (n.content == null ? null : "" + n.content) && r.getAttribute("name") === (n.name == null ? null : n.name) && r.getAttribute("property") === (n.property == null ? null : n.property) && r.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && r.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
														o.splice(s, 1);
														break b;
													}
												}
												r = a.createElement(t), op(r, t, n), a.head.appendChild(r);
												break;
											default: throw Error(i(468, t));
										}
										r[Ct] = e, Lt(r), t = r;
									}
									e.stateNode = t;
								}
							} else su || Xm(o, e.type, e.stateNode);
						} else e.stateNode = Wm(o, n, e.memoizedProps);
					} else a === n ? n === null && e.stateNode !== null && Il(e, e.memoizedProps, r.memoizedProps) : (a === null ? (t = r.stateNode, t === null || cu || t.parentNode.removeChild(t)) : a.count--, n === null ? su || Xm(o, e.type, e.stateNode) : Wm(o, n, e.memoizedProps));
				}
				break;
			case 27:
				Mu(t, e, n), Fu(e), a & 512 && (cu || r === null || kl(r, r.return)), r !== null && a & 4 && Il(e, e.memoizedProps, r.memoizedProps);
				break;
			case 5:
				if (o = lu, lu = !1, Mu(t, e, n), lu = o, Fu(e), a & 512 && (cu || r === null || kl(r, r.return)), e.flags & 32) {
					t = e.stateNode;
					try {
						dn(t, ""), R = !0;
					} catch (t) {
						q(e, e.return, t);
					}
				}
				a & 4 && e.stateNode != null && (t = e.memoizedProps, Il(e, t, r === null ? t : r.memoizedProps)), a & 1024 && (uu = !0);
				break;
			case 6:
				if (Mu(t, e, n), Fu(e), a & 4) {
					if (e.stateNode === null) throw Error(i(162));
					t = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = t, R = !0;
					} catch (t) {
						q(e, e.return, t);
					}
				}
				break;
			case 3:
				if (R = !1, Jm = null, o = Nu, Nu = wm(t.containerInfo), Mu(t, e, n), Nu = o, Fu(e), a & 4 && r !== null && r.memoizedState.isDehydrated) try {
					Kh(t.containerInfo);
				} catch (t) {
					q(e, e.return, t);
				}
				uu && (uu = !1, Iu(e)), R = !1;
				break;
			case 4:
				a = lu, lu = su, r = qt(), o = Nu, Nu = wm(e.stateNode.containerInfo), Mu(t, e, n), Fu(e), Nu = o, R && mu && (hu = !0), R = r, lu = a;
				break;
			case 12:
				Mu(t, e, n), Fu(e);
				break;
			case 31:
				Mu(t, e, n), Fu(e), a & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, ju(e, t)));
				break;
			case 13:
				Mu(t, e, n), Fu(e), e.child.flags & 8192 && e.memoizedState !== null != (r !== null && r.memoizedState !== null) && (vd = Ve()), a & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, ju(e, t)));
				break;
			case 22:
				o = e.memoizedState !== null, s = r !== null && r.memoizedState !== null;
				var c = su, l = cu, u = lu;
				su = c || o, lu = u || o, cu = l || s, Mu(t, e, n), cu = l, lu = u, su = c, Fu(e), a & 8192 && (t = e.stateNode, t._visibility = o ? t._visibility & -2 : t._visibility | 1, !o || r === null || s || su || cu || (t = s || cu, n = su, r = cu, su = o || su, cu = t, Bu(e, 2), su = n, cu = r), !o && lu || bu(e, o)), a & 4 && (t = e.updateQueue, t !== null && (n = t.retryQueue, n !== null && (t.retryQueue = null, ju(e, n))));
				break;
			case 19:
				Mu(t, e, n), Fu(e), a & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, ju(e, t)));
				break;
			case 30:
				a & 512 && (cu || r === null || kl(r, r.return)), a = qt(), o = mu, s = (n & 335544064) === n, c = e.memoizedProps, mu = s && bi(c.default, c.update) !== "none", Mu(t, e, n), Fu(e), s && r !== null && R && (e.flags |= 4), mu = o, R = a;
				break;
			case 21: break;
			case 7: a & 512 && (cu || r === null || kl(r, r.return)), r && r.stateNode !== null && (r.stateNode._fragmentFiber = e);
			default: Mu(t, e, n), Fu(e);
		}
	}
	function Fu(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (Ll(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				r = null;
				for (var a = e.return; a !== null;) {
					if (Pl(a)) {
						var o = a.stateNode;
						r === null ? r = [o] : r.push(o);
					}
					if (Nl(a)) break;
					a = a.return;
				}
				var s = r;
				if (n == null) throw Error(i(160));
				switch (n.tag) {
					case 27:
						var c = n.stateNode;
						Bl(e, Rl(e), c, s);
						break;
					case 5:
						var l = n.stateNode;
						n.flags & 32 && (dn(l, ""), n.flags &= -33), Bl(e, Rl(e), l, s);
						break;
					case 3:
					case 4:
						var u = n.stateNode.containerInfo;
						zl(e, Rl(e), u, s);
						break;
					default: throw Error(i(161));
				}
			} catch (t) {
				q(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function Iu(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			Iu(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, bh = !0, t.reset(), bh = !1), e = e.sibling;
		}
	}
	function Lu(e, t) {
		if (t.subtreeFlags & 9270) for (t = t.child; t !== null;) Ru(t, e), t = t.sibling;
		else ou(t, !1);
	}
	function Ru(e, t) {
		var n = e.alternate;
		if (n === null) Ql(e, !1);
		else switch (e.tag) {
			case 3:
				if (gu = pu = !1, Kl(), Lu(t, e), !pu && !hu) {
					if (e = Gl, e !== null) for (var r = 0; r < e.length; r += 3) {
						n = e[r];
						var i = e[r + 1];
						Ap(n, e[r + 2]), n = n.ownerDocument.documentElement, n !== null && n.animate({
							opacity: [0, 0],
							pointerEvents: ["none", "none"]
						}, {
							duration: 0,
							fill: "forwards",
							pseudoElement: "::view-transition-group(" + i + ")"
						});
					}
					e = t.containerInfo, e = e.nodeType === 9 ? e.documentElement : e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "" && (e.style.viewTransitionName = "none", e.animate({
						opacity: [0, 0],
						pointerEvents: ["none", "none"]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition-group(root)"
					}), e.animate({
						width: [0, 0],
						height: [0, 0]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition"
					})), gu = !0;
				}
				Gl = null;
				break;
			case 5:
				Lu(t, e);
				break;
			case 4:
				r = pu, pu = !1, Lu(t, e), pu && (hu = !0), pu = r;
				break;
			case 22:
				e.memoizedState === null && (n.memoizedState === null ? Lu(t, e) : Ql(e, !1));
				break;
			case 30:
				r = pu, i = Kl(), pu = !1, Lu(t, e), pu && (e.flags |= 4);
				var a = e.memoizedProps, o = e.stateNode;
				t = vi(a, o), o = vi(n.memoizedProps, o);
				var s = bi(a.default, a.update);
				s === "none" ? t = !1 : (a = n.memoizedState, n.memoizedState = null, n = e.child, ql = 0, t = au(e, n, t, o, s, a, !0), ql !== (a === null ? 0 : a.length) && (e.flags |= 32)), e.flags & 4 && t ? (Ld(e, e.memoizedProps.onUpdate), Gl = i) : i !== null && (i.push.apply(i, Gl), Gl = i), pu = e.flags & 32 ? !0 : r;
				break;
			default: Lu(t, e);
		}
	}
	function zu(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) yu(e, t.alternate, t), t = t.sibling;
	}
	function Bu(e, t) {
		for (e = e.child; e !== null;) {
			var n = e, r = t;
			switch (n.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					Tl(4, n, n.return), Bu(n, r);
					break;
				case 1:
					kl(n, n.return);
					var i = n.stateNode;
					typeof i.componentWillUnmount == "function" && Dl(n, n.return, i), Bu(n, r);
					break;
				case 27: r & 2 && bm(n.stateNode, n.type, n.memoizedProps);
				case 5:
					kl(n, n.return), n.tag !== 5 && n.tag !== 27 || Ml(n), Bu(n, r);
					break;
				case 6:
					Ml(n);
					break;
				case 26:
					kl(n, n.return), i = n.stateNode, n.memoizedState !== null || i === null || cu || i.parentNode.removeChild(i), Bu(n, r);
					break;
				case 22:
					n.memoizedState === null && Bu(n, r);
					break;
				case 30:
					kl(n, n.return), Bu(n, r);
					break;
				case 7: kl(n, n.return);
				default: Bu(n, r);
			}
			e = e.sibling;
		}
	}
	function Vu(e, t, n) {
		for (n = t.subtreeFlags & 8772 ? n : n & -2, t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags, s = !!(n & 1);
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					Vu(i, a, n), wl(4, a);
					break;
				case 1:
					if (Vu(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						q(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var c = r.stateNode;
						try {
							var l = i.shared.hiddenCallbacks;
							if (l !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < l.length; i++) To(l[i], c);
						} catch (e) {
							q(r, r.return, e);
						}
					}
					s && o & 64 && El(a), Ol(a, a.return);
					break;
				case 27: n & 2 && Vl(a);
				case 5:
					a.tag !== 5 && a.tag !== 27 || jl(a), Vu(i, a, n), s && r === null && o & 4 && Fl(a), Ol(a, a.return);
					break;
				case 6:
					jl(a);
					break;
				case 26:
					c = a.stateNode, a.memoizedState !== null || c === null || su || Xm(wm(c.ownerDocument), a.type, c), Vu(i, a, n), s && r === null && o & 4 && Fl(a), Ol(a, a.return);
					break;
				case 12:
					Vu(i, a, n);
					break;
				case 31:
					Vu(i, a, n), s && o & 4 && Ou(i, a);
					break;
				case 13:
					Vu(i, a, n), s && o & 4 && ku(i, a);
					break;
				case 22:
					a.memoizedState === null && Vu(i, a, n), Ol(a, a.return);
					break;
				case 30:
					Vu(i, a, n), Ol(a, a.return);
					break;
				case 7: Ol(a, a.return);
				default: Vu(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Hu(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && Pa(n));
	}
	function Uu(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && Pa(e));
	}
	function Wu(e, t, n, r) {
		var i = (n & 335544064) === n;
		if (t.subtreeFlags & (i ? 10262 : 10256)) for (t = t.child; t !== null;) Gu(e, t, n, r), t = t.sibling;
		else i && iu(t);
	}
	function Gu(e, t, n, r) {
		var i = (n & 335544064) === n;
		i && t.alternate === null && t.return !== null && t.return.alternate !== null && ru(t);
		var a = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Wu(e, t, n, r), a & 2048 && wl(9, t);
				break;
			case 1:
				Wu(e, t, n, r);
				break;
			case 3:
				Wu(e, t, n, r), i && gu && (e = e.containerInfo, e = e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, e.style.viewTransitionName === "root" && (e.style.viewTransitionName = ""), e = e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "none" && (e.style.viewTransitionName = "")), a & 2048 && (a = null, t.alternate !== null && (a = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== a && (t.refCount++, a != null && Pa(a)));
				break;
			case 12:
				if (a & 2048) {
					Wu(e, t, n, r), a = t.stateNode;
					try {
						var o = t.memoizedProps, s = o.id, c = o.onPostCommit;
						typeof c == "function" && c(s, t.alternate === null ? "mount" : "update", a.passiveEffectDuration, -0);
					} catch (e) {
						q(t, t.return, e);
					}
				} else Wu(e, t, n, r);
				break;
			case 31:
				Wu(e, t, n, r);
				break;
			case 13:
				Wu(e, t, n, r);
				break;
			case 23: break;
			case 22:
				o = t.stateNode, s = t.alternate, t.memoizedState === null ? (i && s !== null && s.memoizedState !== null && ru(t), o._visibility & 2 ? Wu(e, t, n, r) : (o._visibility |= 2, Ku(e, t, n, r, !!(t.subtreeFlags & 10256) || !1))) : (i && s !== null && s.memoizedState === null && ru(s), o._visibility & 2 ? Wu(e, t, n, r) : qu(e, t)), a & 2048 && Hu(s, t);
				break;
			case 24:
				Wu(e, t, n, r), a & 2048 && Uu(t.alternate, t);
				break;
			case 30:
				i && (a = t.alternate, a !== null && (Xl(a.child, !0), Xl(t.child, !0))), Wu(e, t, n, r);
				break;
			default: Wu(e, t, n, r);
		}
	}
	function Ku(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Ku(a, o, s, c, i), wl(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Ku(a, o, s, c, i)) : u._visibility & 2 ? Ku(a, o, s, c, i) : qu(a, o), i && l & 2048 && Hu(o.alternate, o);
					break;
				case 24:
					Ku(a, o, s, c, i), i && l & 2048 && Uu(o.alternate, o);
					break;
				default: Ku(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function qu(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					qu(n, r), i & 2048 && Hu(r.alternate, r);
					break;
				case 24:
					qu(n, r), i & 2048 && Uu(r.alternate, r);
					break;
				default: qu(n, r);
			}
			t = t.sibling;
		}
	}
	var Ju = 8192;
	function Yu(e, t, n) {
		if (e.subtreeFlags & Ju) for (e = e.child; e !== null;) H(e, t, n), e = e.sibling;
	}
	function H(e, t, n) {
		switch (e.tag) {
			case 26:
				Yu(e, t, n), e.flags & Ju && (e.memoizedState === null ? (e = e.stateNode, (t & 335544128) === t && th(n, e)) : nh(n, Nu, e.memoizedState, e.memoizedProps));
				break;
			case 5:
				Yu(e, t, n), e.flags & Ju && (e = e.stateNode, (t & 335544128) === t && th(n, e));
				break;
			case 3:
			case 4:
				var r = Nu;
				Nu = wm(e.stateNode.containerInfo), Yu(e, t, n), Nu = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = Ju, Ju = 16777216, Yu(e, t, n), Ju = r) : Yu(e, t, n));
				break;
			case 30:
				if ((e.flags & Ju) !== 0 && (r = e.memoizedProps.name, r != null && r !== "auto")) {
					var i = e.stateNode;
					i.paired = null, Ul === null && (Ul = /* @__PURE__ */ new Map()), Ul.set(r, i);
				}
				Yu(e, t, n);
				break;
			default: Yu(e, t, n);
		}
	}
	function Xu(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Zu(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				fu = r, ed(r, e);
			}
			Xu(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Qu(e), e = e.sibling;
	}
	function Qu(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Zu(e), e.flags & 2048 && Tl(9, e, e.return);
				break;
			case 3:
				Zu(e);
				break;
			case 12:
				Zu(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, $u(e)) : Zu(e);
				break;
			default: Zu(e);
		}
	}
	function $u(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				fu = r, ed(r, e);
			}
			Xu(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					Tl(8, t, t.return), $u(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, $u(t));
					break;
				default: $u(t);
			}
			e = e.sibling;
		}
	}
	function ed(e, t) {
		for (; fu !== null;) {
			var n = fu;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					Tl(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: Pa(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, fu = r;
			else a: for (n = e; fu !== null;) {
				r = fu;
				var i = r.sibling, a = r.return;
				if (Cu(r), r === n) {
					fu = null;
					break a;
				}
				if (i !== null) {
					i.return = a, fu = i;
					break a;
				}
				fu = a;
			}
		}
	}
	var td = {
		getCacheForType: function(e) {
			var t = Ea(Ma), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return Ea(Ma).controller.signal;
		}
	}, nd = typeof WeakMap == "function" ? WeakMap : Map, U = 0, rd = null, W = null, G = 0, id = 0, ad = null, K = !1, od = !1, sd = !1, cd = 0, ld = 0, ud = 0, dd = 0, fd = 0, pd = 0, md = 0, hd = null, gd = null, _d = !1, vd = 0, yd = 0, bd = Infinity, xd = null, Sd = null, Cd = 0, wd = null, Td = null, Ed = 0, Dd = 0, Od = null, kd = null, Ad = null, jd = null, Md = null, Nd = 0, Pd = null;
	function Fd() {
		return U & 2 && G !== 0 ? G & -G : I.T === null ? bt() : Rf();
	}
	function Id() {
		if (pd === 0) {
			if (!(G & 536870912) || z) {
				var e = it;
				it <<= 1, !(it & 3932160) && (it = 262144), pd = e;
			} else pd = 536870912;
		}
		return e = Mo.current, e !== null && (e.flags |= 32), pd;
	}
	function Ld(e, t) {
		if (t != null) {
			var n = e.stateNode, r = n.ref;
			r === null && (r = n.ref = Rp(vi(e.memoizedProps, n))), jd === null && (jd = []), jd.push(t.bind(null, r));
		}
	}
	function Rd(e, t, n) {
		(e === rd && (id === 2 || id === 9) || e.cancelPendingCommit !== null) && (Gd(e, 0), Hd(e, G, pd, !1)), pt(e, n), (!(U & 2) || e !== rd) && (e === rd && (!(U & 2) && (dd |= n), ld === 4 && Hd(e, G, pd, !1)), Af(e));
	}
	function zd(e, t, n) {
		if (U & 6) throw Error(i(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || ct(e, t), a = r ? $d(e, t) : Zd(e, t, !0), o = r;
		do {
			if (a === 0) {
				od && !r && Hd(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, o && !Vd(n)) {
				a = Zd(e, t, !1), o = !1;
				continue;
			}
			if (a === 2) {
				if (o = t, e.errorRecoveryDisabledLanes & o) var s = 0;
				else s = e.pendingLanes & -536870913, s = s === 0 ? s & 536870912 ? 536870912 : 0 : s;
				if (s !== 0) {
					t = s;
					a: {
						var c = e;
						a = hd;
						var l = c.current.memoizedState.isDehydrated;
						if (l && (Gd(c, s).flags |= 256), s = Zd(c, s, !1), s !== 2 && s !== 6) {
							if (sd && !l) {
								c.errorRecoveryDisabledLanes |= o, dd |= o, a = 4;
								break a;
							}
							o = gd, gd = a, o !== null && (gd === null ? gd = o : gd.push.apply(gd, o));
						}
						a = s;
					}
					if (o = !1, a !== 2) continue;
				}
			}
			if (a === 1) {
				Gd(e, 0), Hd(e, t, 0, !0);
				break;
			}
			a: {
				switch (r = e, o = a, o) {
					case 0:
					case 1: throw Error(i(345));
					case 4: if ((t & 4194048) !== t && (t & 62914560) !== t) break;
					case 6:
						Hd(r, t, pd, !K);
						break a;
					case 2:
						gd = null;
						break;
					case 3:
					case 5: break;
					default: throw Error(i(329));
				}
				if ((t & 62914560) === t && (a = vd + 300 - Ve(), 10 < a)) {
					if (Hd(r, t, pd, !K), st(r, 0, !0) !== 0) break a;
					Ed = t, r.timeoutHandle = bp(Bd.bind(null, r, n, gd, xd, _d, t, pd, dd, md, K, o, "Throttled", -0, 0), a);
					break a;
				}
				Bd(r, n, gd, xd, _d, t, pd, dd, md, K, o, null, -0, 0);
			}
			break;
		} while (1);
		Af(e);
	}
	function Bd(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		e.timeoutHandle = -1;
		var m = t.subtreeFlags, h = (a & 335544064) === a;
		if (d = null, (h || m & 8192 || (m & 16785408) == 16785408) && (d = {
			stylesheets: null,
			count: 0,
			imgCount: 0,
			imgBytes: 0,
			suspenseyImages: [],
			waitingForImages: !0,
			waitingForViewTransition: !1,
			unsuspend: yn
		}, Ul = null, H(t, a, d), h && (m = d, h = e.containerInfo, h = (h.nodeType === 9 ? h : h.ownerDocument).__reactViewTransition, h != null && (m.count++, m.waitingForViewTransition = !0, m = oh.bind(m), h.finished.then(m, m))), m = (a & 62914560) === a ? vd - Ve() : (a & 4194048) === a ? yd - Ve() : 0, m = ih(d, m), m !== null)) {
			Ed = a, e.cancelPendingCommit = m(sf.bind(null, e, t, a, n, r, i, o, s, c, l, u, d, null, f, p)), Hd(e, a, o, !l);
			return;
		}
		sf(e, t, a, n, r, i, o, s, c, l, u, d);
	}
	function Vd(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!Hr(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function Hd(e, t, n, r) {
		t = lt(e, t), t &= ~fd, t &= ~dd, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - $e(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && ht(e, n, t);
	}
	function Ud() {
		return U & 6 ? !0 : (jf(0, !1), !1);
	}
	function Wd() {
		if (W !== null) {
			if (id === 0) var e = W.return;
			else e = W, va = _a = null, ss(e), oo = null, so = 0, e = W;
			for (; e !== null;) Cl(e.alternate, e), e = e.return;
			W = null;
		}
	}
	function Gd(e, t) {
		var n = e.timeoutHandle;
		return n !== -1 && (e.timeoutHandle = -1, xp(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), Ed = 0, Wd(), rd = e, W = n = Fi(e.current, null), G = t, id = 0, ad = null, K = !1, od = ct(e, t), sd = !1, md = pd = fd = dd = ud = ld = 0, gd = hd = null, _d = !1, cd = lt(e, t), Ti(), n;
	}
	function Kd(e, t) {
		B = null, I.H = gc, t === Xa || t === Qa ? (t = io(), id = 3) : t === Za ? (t = io(), id = 4) : id = t === Pc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, ad = t, W === null && (ld = 1, Oc(e, Ui(t, e.current)));
	}
	function qd() {
		var e = Mo.current;
		return e === null ? !0 : (G & 4194048) === G ? No === null : (G & 62914560) === G || G & 536870912 ? e === No : !1;
	}
	function Jd() {
		var e = I.H;
		return I.H = gc, e === null ? gc : e;
	}
	function Yd() {
		var e = I.A;
		return I.A = td, e;
	}
	function Xd() {
		ld = 4, K || (G & 4194048) !== G && Mo.current !== null || (od = !0), !(ud & 134217727) && !(dd & 134217727) || rd === null || Hd(rd, G, pd, !1);
	}
	function Zd(e, t, n) {
		var r = U;
		U |= 2;
		var i = Jd(), a = Yd();
		(rd !== e || G !== t) && (xd = null, Gd(e, t)), t = !1;
		var o = ld;
		a: do
			try {
				if (id !== 0 && W !== null) {
					var s = W, c = ad;
					switch (id) {
						case 8:
							Wd(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							Mo.current === null && (t = !0);
							var l = id;
							if (id = 0, ad = null, rf(e, s, c, l), n && od) {
								o = 0;
								break a;
							}
							break;
						default: l = id, id = 0, ad = null, rf(e, s, c, l);
					}
				}
				Qd(), o = ld;
				break;
			} catch (t) {
				Kd(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, va = _a = null, U = r, I.H = i, I.A = a, W === null && (rd = null, G = 0, Ti()), o;
	}
	function Qd() {
		for (; W !== null;) tf(W);
	}
	function $d(e, t) {
		var n = U;
		U |= 2;
		var r = Jd(), a = Yd();
		rd !== e || G !== t ? (xd = null, bd = Ve() + 500, Gd(e, t)) : od = ct(e, t);
		a: do
			try {
				if (id !== 0 && W !== null) {
					t = W;
					var o = ad;
					b: switch (id) {
						case 1:
							id = 0, ad = null, rf(e, t, o, 1);
							break;
						case 2:
						case 9:
							if (eo(o)) {
								id = 0, ad = null, nf(t);
								break;
							}
							t = function() {
								id !== 2 && id !== 9 || rd !== e || (id = 7), Af(e);
							}, o.then(t, t);
							break a;
						case 3:
							id = 7;
							break a;
						case 4:
							id = 5;
							break a;
						case 7:
							eo(o) ? (id = 0, ad = null, nf(t)) : (id = 0, ad = null, rf(e, t, o, 7));
							break;
						case 5:
							var s = null;
							switch (W.tag) {
								case 26: s = W.memoizedState;
								case 5:
								case 27:
									var c = W;
									if (s ? $m(s) : c.stateNode.complete) {
										id = 0, ad = null;
										var l = c.sibling;
										if (l !== null) W = l;
										else {
											var u = c.return;
											u === null ? W = null : (W = u, af(u));
										}
										break b;
									}
							}
							id = 0, ad = null, rf(e, t, o, 5);
							break;
						case 6:
							id = 0, ad = null, rf(e, t, o, 6);
							break;
						case 8:
							Wd(), ld = 6;
							break a;
						default: throw Error(i(462));
					}
				}
				ef();
				break;
			} catch (t) {
				Kd(e, t);
			}
		while (1);
		return va = _a = null, I.H = r, I.A = a, U = n, W === null ? (rd = null, G = 0, Ti(), ld) : 0;
	}
	function ef() {
		for (; W !== null && !ze();) tf(W);
	}
	function tf(e) {
		var t = ml(e.alternate, e, cd);
		e.memoizedProps = e.pendingProps, t === null ? af(e) : W = t;
	}
	function nf(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = Jc(n, t, t.pendingProps, t.type, void 0, G);
				break;
			case 11:
				t = Jc(n, t, t.pendingProps, t.type.render, t.ref, G);
				break;
			case 5:
				ss(t);
				var r = t;
				r === ia && (z ? (da(r), r.tag === 5 && r.stateNode != null && (aa = r.stateNode)) : (da(r), z = !0));
			default: Cl(n, t), t = W = Ii(t, cd), t = ml(n, t, cd);
		}
		e.memoizedProps = e.pendingProps, t === null ? af(e) : W = t;
	}
	function rf(e, t, n, r) {
		va = _a = null, ss(t), oo = null, so = 0;
		var i = t.return;
		try {
			if (Nc(e, i, t, n, G)) {
				ld = 1, Oc(e, Ui(n, e.current)), W = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw W = i, t;
			ld = 1, Oc(e, Ui(n, e.current)), W = null;
			return;
		}
		t.flags & 32768 ? (z || r === 1 ? e = !0 : od || G & 536870912 ? e = !1 : (K = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = Mo.current, r !== null && r.tag === 13 && (r.flags |= 16384))), of(t, e)) : af(t);
	}
	function af(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				of(t, K);
				return;
			}
			e = t.return;
			var n = xl(t.alternate, t, cd);
			if (n !== null) {
				W = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				W = t;
				return;
			}
			W = t = e;
		} while (t !== null);
		ld === 0 && (ld = 5);
	}
	function of(e, t) {
		do {
			var n = Sl(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, W = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				W = e;
				return;
			}
			W = e = n;
		} while (e !== null);
		ld = 6, W = null;
	}
	function sf(e, t, n, r, a, o, s, c, l, u, d, f) {
		e.cancelPendingCommit = null;
		do
			hf();
		while (Cd !== 0);
		if (U & 6) throw Error(i(327));
		if (t !== null) {
			if (t === e.current) throw Error(i(177));
			e === rd && (W = rd = null, G = 0), Td = t, wd = e, Ed = n, Od = a, kd = r, cf(e, t, n, s, c, l, f);
		}
	}
	function cf(e, t, n, r, i, a, o) {
		var s = t.lanes | t.childLanes;
		if (Dd = s, s |= wi, mt(e, n, s, r, i, a), jd = null, (n & 335544064) === n ? (Md = La(e), r = 10262) : (Md = null, r = 10256), (t.subtreeFlags & r) !== 0 || (t.flags & r) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, Cf(Ge, function() {
			return gf(), null;
		})) : (e.callbackNode = null, e.callbackPriority = 0), Hl = !1, r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
			r = I.T, I.T = null, i = L.p, L.p = 2, a = U, U |= 4;
			try {
				_u(e, t, n);
			} finally {
				U = a, L.p = i, I.T = r;
			}
		}
		Cd = 1, Hl ? Ad = Ip(o, e.containerInfo, Md, df, ff, uf, pf, gf, lf, null, null) : (df(), ff(), pf());
	}
	function lf(e) {
		if (Cd !== 0) {
			var t = wd.onRecoverableError;
			t(e, { componentStack: null });
		}
	}
	function uf() {
		Cd === 3 && (Cd = 0, Ru(Td, wd), Cd = 4);
	}
	function df() {
		if (Cd === 1) {
			Cd = 0;
			var e = wd, t = Td, n = Ed, r = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || r) {
				r = I.T, I.T = null;
				var i = L.p;
				L.p = 2;
				var a = U;
				U |= 4;
				try {
					mu = hu = !1, Pu(t, e, n), n = fp;
					var o = Jr(e.containerInfo), s = n.focusedElem, c = n.selectionRange;
					if (o !== s && s && s.ownerDocument && qr(s.ownerDocument.documentElement, s)) {
						if (c !== null && Yr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = Kr(s, h), v = Kr(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					bh = !!dp, fp = dp = null;
				} finally {
					U = a, L.p = i, I.T = r;
				}
			}
			e.current = t, Cd = 2;
		}
	}
	function ff() {
		if (Cd === 2) {
			Cd = 0;
			var e = wd, t = Td, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = I.T, I.T = null;
				var r = L.p;
				L.p = 2;
				var i = U;
				U |= 4;
				try {
					yu(e, t.alternate, t);
				} finally {
					U = i, L.p = r, I.T = n;
				}
			}
			Cd = 3;
		}
	}
	function pf() {
		if (Cd === 4 || Cd === 3) {
			Cd = 0;
			var e = Ad;
			Ad = null, Be();
			var t = wd, n = Td, r = Ed, i = kd, a = (r & 335544064) === r ? 10262 : 10256;
			if ((n.subtreeFlags & a) !== 0 || (n.flags & a) !== 0 ? Cd = 5 : (Cd = 0, Td = wd = null, mf(t, t.pendingLanes)), a = t.pendingLanes, a === 0 && (Sd = null), yt(r), n = n.stateNode, Ze && typeof Ze.onCommitFiberRoot == "function") try {
				Ze.onCommitFiberRoot(Xe, n, void 0, (n.current.flags & 128) == 128);
			} catch {}
			if (i !== null) {
				n = I.T, a = L.p, L.p = 2, I.T = null;
				try {
					for (var o = t.onRecoverableError, s = 0; s < i.length; s++) {
						var c = i[s];
						o(c.value, { componentStack: c.stack });
					}
				} finally {
					I.T = n, L.p = a;
				}
			}
			if (i = jd, o = Md, Md = null, i !== null && (jd = null, o === null && (o = []), e !== null)) for (c = 0; c < i.length; c++) n = (0, i[c])(o), n !== void 0 && e.finished.finally(n);
			Ed & 3 && hf(), Af(t), a = t.pendingLanes, r & 261930 && a & 42 ? t === Pd ? Nd++ : (Nd = 0, Pd = t) : (Nd = 0, Pd = null), jf(0, !1);
		}
	}
	function mf(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, Pa(t)));
	}
	function hf() {
		return Ad !== null && (Ad.skipTransition(), Ad = null), df(), ff(), pf(), gf();
	}
	function gf() {
		if (Cd !== 5) return !1;
		var e = wd, t = Dd;
		Dd = 0;
		var n = yt(Ed), r = I.T, a = L.p;
		try {
			L.p = 32 > n ? 32 : n, I.T = null, n = Od, Od = null;
			var o = wd, s = Ed;
			if (Cd = 0, Td = wd = null, Ed = 0, U & 6) throw Error(i(331));
			var c = U;
			if (U |= 4, Qu(o.current), Gu(o, o.current, s, n), U = c, jf(0, !1), Ze && typeof Ze.onPostCommitFiberRoot == "function") try {
				Ze.onPostCommitFiberRoot(Xe, o);
			} catch {}
			return !0;
		} finally {
			L.p = a, I.T = r, mf(e, t);
		}
	}
	function _f(e, t, n) {
		t = Ui(n, t), t = Ac(e.stateNode, t, 2), e = yo(e, t, 2), e !== null && (pt(e, 2), Af(e));
	}
	function q(e, t, n) {
		if (e.tag === 3) _f(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				_f(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (Sd === null || !Sd.has(r))) {
					e = Ui(n, e), n = jc(2), r = yo(t, n, 2), r !== null && (Mc(n, r, t, e), pt(r, 2), Af(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function vf(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new nd();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (sd = !0, i.add(n), e = yf.bind(null, e, t, n), t.then(e, e));
	}
	function yf(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, rd === e && (G & n) === n && (ld === 4 || ld === 3 && (G & 62914560) === G && 300 > Ve() - vd ? U & 2 ? fd |= n : Gd(e, 0) : fd |= n, md === G && (md = 0)), Af(e);
	}
	function bf(e, t) {
		t === 0 && (t = dt()), e = Oi(e, t), e !== null && (pt(e, t), Af(e));
	}
	function xf(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), bf(e, n);
	}
	function Sf(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, a = e.memoizedState;
				a !== null && (n = a.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(i(314));
		}
		r !== null && r.delete(t), bf(e, n);
	}
	function Cf(e, t) {
		return Le(e, t);
	}
	var wf = null, Tf = null, Ef = !1, Df = !1, Of = !1, kf = 0;
	function Af(e) {
		e !== Tf && e.next === null && (Tf === null ? wf = Tf = e : Tf = Tf.next = e), Df = !0, Ef || (Ef = !0, Lf());
	}
	function jf(e, t) {
		if (!Of && Df) {
			Of = !0;
			do
				for (var n = !1, r = wf; r !== null;) {
					if (!t) {
						if (e !== 0) {
							var i = r.pendingLanes;
							if (i === 0) var a = 0;
							else {
								var o = r.suspendedLanes, s = r.pingedLanes;
								a = (1 << 31 - $e(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, If(r, a));
						} else a = G, a = st(r, r === rd ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || ct(r, a) || (n = !0, If(r, a));
					}
					r = r.next;
				}
			while (n);
			Of = !1;
		}
	}
	function Mf() {
		Nf();
	}
	function Nf() {
		Df = Ef = !1;
		var e = 0;
		kf !== 0 && yp() && (e = kf);
		for (var t = Ve(), n = null, r = wf; r !== null;) {
			var i = r.next, a = Pf(r, t);
			a === 0 ? (r.next = null, n === null ? wf = i : n.next = i, i === null && (Tf = n)) : (n = r, (e !== 0 || a & 3) && (Df = !0)), r = i;
		}
		Cd !== 0 && Cd !== 5 || jf(e, !1), kf !== 0 && (kf = 0);
	}
	function Pf(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - $e(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = ut(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = rd, n = G, n = st(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (id === 2 || id === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && Re(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || ct(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && Re(r), yt(n)) {
				case 2:
				case 8:
					n = We;
					break;
				case 32:
					n = Ge;
					break;
				case 268435456:
					n = qe;
					break;
				default: n = Ge;
			}
			return r = Ff.bind(null, e), n = Le(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && Re(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function Ff(e, t) {
		if (Cd !== 0 && Cd !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (hf() && e.callbackNode !== n) return null;
		var r = G;
		return r = st(e, e === rd ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (zd(e, r, t), Pf(e, Ve()), e.callbackNode != null && e.callbackNode === n ? Ff.bind(null, e) : null);
	}
	function If(e, t) {
		if (hf()) return null;
		zd(e, t, !0);
	}
	function Lf() {
		wp(function() {
			U & 6 ? Le(Ue, Mf) : Nf();
		});
	}
	function Rf() {
		if (kf === 0) {
			var e = Ba;
			e === 0 && (e = rt, rt <<= 1, !(rt & 261888) && (rt = 256)), kf = e;
		}
		return kf;
	}
	function zf(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : vn(e);
	}
	function Bf(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = zf((i[wt] || null).action), o = r.submitter;
			o && (t = (t = o[wt] || null) ? zf(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new Bn("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (kf !== 0) {
								var e = new FormData(i, o);
								V(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = new FormData(i, o), V(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var Vf = 0; Vf < hi.length; Vf++) {
		var Hf = hi[Vf];
		gi(Hf.toLowerCase(), "on" + (Hf[0].toUpperCase() + Hf.slice(1)));
	}
	gi(si, "onAnimationEnd"), gi(ci, "onAnimationIteration"), gi(li, "onAnimationStart"), gi("dblclick", "onDoubleClick"), gi("focusin", "onFocus"), gi("focusout", "onBlur"), gi(ui, "onTransitionRun"), gi(di, "onTransitionStart"), gi(fi, "onTransitionCancel"), gi(pi, "onTransitionEnd"), Ht("onMouseEnter", ["mouseout", "mouseover"]), Ht("onMouseLeave", ["mouseout", "mouseover"]), Ht("onPointerEnter", ["pointerout", "pointerover"]), Ht("onPointerLeave", ["pointerout", "pointerover"]), Vt("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Vt("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Vt("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), Vt("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Vt("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Vt("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var Uf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Wf = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Uf));
	function Gf(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						xi(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						xi(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function J(e, t) {
		var n = t[Et];
		n === void 0 && (n = t[Et] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Yf(t, e, 2, !1), n.add(r));
	}
	function Kf(e, t, n) {
		var r = 0;
		t && (r |= 4), Yf(n, e, r, t);
	}
	var qf = "_reactListening" + Math.random().toString(36).slice(2);
	function Jf(e) {
		if (!e[qf]) {
			e[qf] = !0, zt.forEach(function(t) {
				t !== "selectionchange" && (Wf.has(t) || Kf(t, !1, e), Kf(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[qf] || (t[qf] = !0, Kf("selectionchange", !1, t));
		}
	}
	function Yf(e, t, n, r) {
		switch (Dh(t)) {
			case 2:
				var i = xh;
				break;
			case 8:
				i = Sh;
				break;
			default: i = Ch;
		}
		n = i.bind(null, t, n, e), i = void 0, !kn || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function Xf(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var s = r.tag;
			if (s === 3 || s === 4) {
				var c = r.stateNode.containerInfo;
				if (c === i) break;
				if (s === 4) for (s = r.return; s !== null;) {
					var l = s.tag;
					if ((l === 3 || l === 4) && s.stateNode.containerInfo === i) return;
					s = s.return;
				}
				for (; c !== null;) {
					if (s = Nt(c), s === null) return;
					if (l = s.tag, l === 5 || l === 6 || l === 26 || l === 27) {
						r = a = s;
						continue a;
					}
					c = c.parentNode;
				}
			}
			r = r.return;
		}
		En(function() {
			var r = a, i = xn(n), s = [];
			a: {
				var c = mi.get(e);
				if (c !== void 0) {
					var l = Bn, u = e;
					switch (e) {
						case "keypress": if (Fn(n) === 0) break a;
						case "keydown":
						case "keyup":
							l = ir;
							break;
						case "focusin":
							u = "focus", l = Yn;
							break;
						case "focusout":
							u = "blur", l = Yn;
							break;
						case "beforeblur":
						case "afterblur":
							l = Yn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							l = qn;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							l = Jn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							l = sr;
							break;
						case si:
						case ci:
						case li:
							l = Xn;
							break;
						case pi:
							l = cr;
							break;
						case "scroll":
						case "scrollend":
							l = Hn;
							break;
						case "wheel":
							l = lr;
							break;
						case "copy":
						case "cut":
						case "paste":
							l = Zn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							l = ar;
							break;
						case "submit":
							l = or;
							break;
						case "toggle":
						case "beforetoggle": l = ur;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? c === null ? null : c + "Capture" : c;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = Dn(m, p), g != null && d.push(Zf(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (c = new l(c, u, null, n, i), s.push({
						event: c,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (l = e === "mouseover" || e === "pointerover", c = e === "mouseout" || e === "pointerout", l && n !== bn && (u = n.relatedTarget || n.fromElement) && (Nt(u) || u[Tt])) break a;
					(c || l) && (u = i.window === i ? i : (l = i.ownerDocument) ? l.defaultView || l.parentWindow : window, c ? (l = n.relatedTarget || n.toElement, c = r, l = l ? Nt(l) : null, l !== null && (f = o(l), d = l.tag, l !== f || d !== 5 && d !== 27 && d !== 6) && (l = null)) : (c = null, l = r), c !== l && (d = qn, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = ar, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = c == null ? u : Ft(c), h = l == null ? u : Ft(l), u = new d(g, m + "leave", c, n, i), u.target = f, u.relatedTarget = h, g = null, Nt(i) === r && (d = new d(p, m + "enter", l, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, d = c && l ? E(c, l, $f) : null, c !== null && ep(s, u, c, d, !1), l !== null && f !== null && ep(s, f, l, d, !0)));
				}
				a: {
					if (c = r ? Ft(r) : window, l = c.nodeName && c.nodeName.toLowerCase(), l === "select" || l === "input" && c.type === "file") var _ = Ar;
					else if (wr(c)) {
						if (jr) _ = Br;
						else {
							_ = Rr;
							var v = Lr;
						}
					} else l = c.nodeName, !l || l.toLowerCase() !== "input" || c.type !== "checkbox" && c.type !== "radio" ? r && hn(r.elementType) && (_ = Ar) : _ = zr;
					if (_ &&= _(e, r)) {
						Tr(s, _, n, i);
						break a;
					}
					v && v(e, c, r);
				}
				switch (v = r ? Ft(r) : window, e) {
					case "focusin":
						(wr(v) || v.contentEditable === "true") && (Zr = v, Qr = r, $r = null);
						break;
					case "focusout":
						$r = Qr = Zr = null;
						break;
					case "mousedown":
						ei = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						ei = !1, ti(s, n, i);
						break;
					case "selectionchange": if (Xr) break;
					case "keydown":
					case "keyup": ti(s, n, i);
				}
				var y;
				if (fr) b: {
					switch (e) {
						case "compositionstart":
							var b = "onCompositionStart";
							break b;
						case "compositionend":
							b = "onCompositionEnd";
							break b;
						case "compositionupdate":
							b = "onCompositionUpdate";
							break b;
					}
					b = void 0;
				}
				else br ? vr(e, n) && (b = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (b = "onCompositionStart");
				b && (hr && n.locale !== "ko" && (br || b !== "onCompositionStart" ? b === "onCompositionEnd" && br && (y = Pn()) : (jn = i, Mn = "value" in jn ? jn.value : jn.textContent, br = !0)), v = Qf(r, b), 0 < v.length && (b = new Qn(b, e, null, n, i), s.push({
					event: b,
					listeners: v
				}), y ? b.data = y : (y = yr(n), y !== null && (b.data = y)))), (y = mr ? xr(e, n) : Sr(e, n)) && (b = Qf(r, "onBeforeInput"), 0 < b.length && (v = new Qn("onBeforeInput", "beforeinput", null, n, i), s.push({
					event: v,
					listeners: b
				}), v.data = y)), Bf(s, e, r, n, i);
			}
			Gf(s, t);
		});
	}
	function Zf(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function Qf(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = Dn(e, n), i != null && r.unshift(Zf(e, i, a)), i = Dn(e, t), i != null && r.push(Zf(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function $f(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function ep(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = Dn(n, a), l != null && o.unshift(Zf(n, l, c))) : i || (l = Dn(n, a), l != null && o.push(Zf(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var tp = /\r\n?/g, np = /\u0000|\uFFFD/g;
	function rp(e) {
		return (typeof e == "string" ? e : "" + e).replace(tp, "\n").replace(np, "");
	}
	function ip(e, t) {
		return t = rp(t), rp(e) === t;
	}
	function Y(e, t, n, r, a, o) {
		switch (n) {
			case "children":
				if (typeof r == "string") t === "body" || t === "textarea" && r === "" || dn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") t !== "body" && dn(e, "" + r);
				else return;
				break;
			case "className":
				Yt(e, "class", r);
				break;
			case "tabIndex":
				Yt(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				Yt(e, n, r);
				break;
			case "style":
				mn(e, r, o);
				return;
			case "data": if (t !== "object") {
				Yt(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href")) {
					e.removeAttribute(n);
					break;
				}
				if (r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = vn(r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof o == "function" && (n === "formAction" ? (t !== "input" && Y(e, t, "name", a.name, a, null), Y(e, t, "formEncType", a.formEncType, a, null), Y(e, t, "formMethod", a.formMethod, a, null), Y(e, t, "formTarget", a.formTarget, a, null)) : (Y(e, t, "encType", a.encType, a, null), Y(e, t, "method", a.method, a, null), Y(e, t, "target", a.target, a, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = vn(r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = yn);
				return;
			case "onScroll":
				r != null && J("scroll", e);
				return;
			case "onScrollEnd":
				r != null && J("scrollend", e);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(i(61));
					if (n = r.__html, n != null) {
						if (a.children != null) throw Error(i(60));
						o?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = vn(r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "credentialless":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				J("beforetoggle", e), J("toggle", e), Jt(e, "popover", r);
				break;
			case "xlinkActuate":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				Xt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				Xt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				Xt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				Xt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				Jt(e, "is", r);
				break;
			case "innerText":
			case "textContent": return;
			default: if (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") n = gn.get(n) || n, Jt(e, n, r);
			else return;
		}
		R = !0;
	}
	function ap(e, t, n, r, a, o) {
		switch (n) {
			case "style":
				mn(e, r, o);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(i(61));
					if (n = r.__html, n != null) {
						if (a.children != null) throw Error(i(60));
						o?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "children":
				if (typeof r == "string") dn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") dn(e, "" + r);
				else return;
				break;
			case "onScroll":
				r != null && J("scroll", e);
				return;
			case "onScrollEnd":
				r != null && J("scrollend", e);
				return;
			case "onClick":
				r != null && (e.onclick = yn);
				return;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": return;
			case "innerText":
			case "textContent": return;
			default:
				if (!Bt.hasOwnProperty(n)) a: {
					if (n[0] === "o" && n[1] === "n" && (a = n.endsWith("Capture"), o = n.slice(2, a ? n.length - 7 : void 0), t = e[wt] || null, t = t == null ? null : t[n], typeof t == "function" && e.removeEventListener(o, t, a), typeof r == "function")) {
						typeof t != "function" && t !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(o, r, a);
						break a;
					}
					R = !0, n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : Jt(e, n, r);
				}
				return;
		}
		R = !0;
	}
	function op(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				J("error", e), J("load", e);
				var r = !1, a = !1, o;
				for (o in n) if (n.hasOwnProperty(o)) {
					var s = n[o];
					if (s != null) switch (o) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							a = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(i(137, t));
						default: Y(e, t, o, s, n, null);
					}
				}
				a && Y(e, t, "srcSet", n.srcSet, n, null), r && Y(e, t, "src", n.src, n, null);
				return;
			case "input":
				J("invalid", e);
				var c = o = s = a = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							a = d;
							break;
						case "type":
							s = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							o = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(i(137, t));
							break;
						default: Y(e, t, r, d, n, null);
					}
				}
				on(e, o, c, l, u, s, a, !1);
				return;
			case "select":
				for (a in J("invalid", e), r = s = o = null, n) if (n.hasOwnProperty(a) && (c = n[a], c != null)) switch (a) {
					case "value":
						o = c;
						break;
					case "defaultValue":
						s = c;
						break;
					case "multiple": r = c;
					default: Y(e, t, a, c, n, null);
				}
				t = o, n = s, e.multiple = !!r, t == null ? n != null && cn(e, !!r, n, !0) : cn(e, !!r, t, !1);
				return;
			case "textarea":
				for (s in J("invalid", e), o = a = r = null, n) if (n.hasOwnProperty(s) && (c = n[s], c != null)) switch (s) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						a = c;
						break;
					case "children":
						o = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(i(91));
						break;
					default: Y(e, t, s, c, n, null);
				}
				un(e, r, a, o);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: Y(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				J("beforetoggle", e), J("toggle", e), J("cancel", e), J("close", e);
				break;
			case "iframe":
			case "object":
				J("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < Uf.length; r++) J(Uf[r], e);
				break;
			case "image":
				J("error", e), J("load", e);
				break;
			case "details":
				J("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": J("error", e), J("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(i(137, t));
					default: Y(e, t, u, r, n, null);
				}
				return;
			default: if (hn(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && ap(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && Y(e, t, c, r, n, null));
	}
	var sp = {};
	function cp(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var a = null, o = null, s = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || Y(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							m !== f && (R = !0), o = m;
							break;
						case "name":
							m !== f && (R = !0), a = m;
							break;
						case "checked":
							m !== f && (R = !0), u = m;
							break;
						case "defaultChecked":
							m !== f && (R = !0), d = m;
							break;
						case "value":
							m !== f && (R = !0), s = m;
							break;
						case "defaultValue":
							m !== f && (R = !0), c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(i(137, t));
							break;
						default: m !== f && Y(e, t, p, m, r, f);
					}
				}
				an(e, s, c, l, u, d, o, a);
				return;
			case "select":
				for (o in m = s = c = p = null, n) if (l = n[o], n.hasOwnProperty(o) && l != null) switch (o) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(o) || Y(e, t, o, null, r, l);
				}
				for (a in r) if (o = r[a], l = n[a], r.hasOwnProperty(a) && (o != null || l != null)) switch (a) {
					case "value":
						o !== l && (R = !0), p = o;
						break;
					case "defaultValue":
						o !== l && (R = !0), c = o;
						break;
					case "multiple": o !== l && (R = !0), s = o;
					default: o !== l && Y(e, t, a, o, r, l);
				}
				t = c, n = s, r = m, p == null ? !!r != !!n && (t == null ? cn(e, !!n, n ? [] : "", !1) : cn(e, !!n, t, !0)) : cn(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (a = n[c], n.hasOwnProperty(c) && a != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: Y(e, t, c, null, r, a);
				}
				for (s in r) if (a = r[s], o = n[s], r.hasOwnProperty(s) && (a != null || o != null)) switch (s) {
					case "value":
						a !== o && (R = !0), p = a;
						break;
					case "defaultValue":
						a !== o && (R = !0), m = a;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (a != null) throw Error(i(91));
						break;
					default: a !== o && Y(e, t, s, a, r, o);
				}
				ln(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: Y(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						p !== m && (R = !0), e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: Y(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && Y(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(i(137, t));
						break;
					default: Y(e, t, u, p, r, m);
				}
				return;
			default: if (hn(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && ap(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || ap(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && Y(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || Y(e, t, f, p, r, m);
	}
	function lp(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function up() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && lp(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && lp(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var dp = null, fp = null;
	function pp(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function mp(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function hp(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function gp(e, t, n, r) {
		return n = pp(n).createElement(e), n[Ct] = r, n[wt] = t, op(n, e, t), Lt(n), n;
	}
	function _p(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var vp = null;
	function yp() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== vp && (vp = e, !0) : (vp = null, !1);
	}
	var bp = typeof setTimeout == "function" ? setTimeout : void 0, xp = typeof clearTimeout == "function" ? clearTimeout : void 0, Sp = typeof Promise == "function" ? Promise : void 0, Cp = typeof requestAnimationFrame == "function" ? requestAnimationFrame : bp, wp = typeof queueMicrotask == "function" ? queueMicrotask : Sp === void 0 ? bp : function(e) {
		return Sp.resolve(null).then(e).catch(Tp);
	};
	function Tp(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Ep(e) {
		return e === "head";
	}
	function Dp(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$" || n === "/&") {
					if (r === 0) {
						e.removeChild(i), Kh(t);
						return;
					}
					r--;
				} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
				else if (n === "html") xm(e.ownerDocument.documentElement);
				else if (n === "head") {
					n = e.ownerDocument.head, xm(n);
					for (var a = n.firstChild; a;) {
						var o = a.nextSibling, s = a.nodeName;
						a[At] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
					}
				} else n === "body" && xm(e.ownerDocument.body);
			}
			n = i;
		} while (n);
		Kh(t);
	}
	function Op(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) {
				if (n = r.data, n === "/$") {
					if (e === 0) break;
					e--;
				} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			}
			n = r;
		} while (n);
	}
	function kp(e, t, n) {
		if (t = CSS.escape(t) === t ? t : "r-" + btoa(t).replace(/=/g, ""), e.style.viewTransitionName = t, n != null && (e.style.viewTransitionClass = n), n = getComputedStyle(e), n.display === "inline") {
			if (t = e.getClientRects(), t.length === 1) var r = 1;
			else for (var i = r = 0; i < t.length; i++) {
				var a = t[i];
				0 < a.width && 0 < a.height && r++;
			}
			r === 1 && (e = e.style, e.display = t.length === 1 ? "inline-block" : "block", e.marginTop = "-" + n.paddingTop, e.marginBottom = "-" + n.paddingBottom);
		}
	}
	function Ap(e, t) {
		e = e.style, t = t.style;
		var n = t == null ? null : t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null;
		e.viewTransitionName = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), n = t == null ? null : t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null, e.viewTransitionClass = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), e.display === "inline-block" && (t == null ? e.display = e.margin = "" : (n = t.display, e.display = n == null || typeof n == "boolean" ? "" : n, n = t.margin, n == null ? (n = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], e.marginTop = n == null || typeof n == "boolean" ? "" : n, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], e.marginBottom = t == null || typeof t == "boolean" ? "" : t) : e.margin = n));
	}
	function jp(e, t, n) {
		return n = n.ownerDocument.defaultView, {
			rect: e,
			abs: t.position === "absolute" || t.position === "fixed",
			clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
			view: 0 <= e.bottom && 0 <= e.right && e.top <= n.innerHeight && e.left <= n.innerWidth
		};
	}
	function Mp(e) {
		return jp(e.getBoundingClientRect(), getComputedStyle(e), e);
	}
	function Np(e) {
		var t = e.getBoundingClientRect();
		t = new DOMRect(t.x + 2e4, t.y + 2e4, t.width, t.height);
		var n = getComputedStyle(e);
		return jp(t, n, e);
	}
	function Pp(e) {
		return e.documentElement.clientHeight;
	}
	function Fp(e) {
		this.addEventListener("load", e), this.addEventListener("error", e);
	}
	function Ip(e, t, n, r, i, a, o, s, c) {
		var l = t.nodeType === 9 ? t : t.ownerDocument;
		try {
			var u = l.startViewTransition({
				update: function() {
					var t = l.defaultView, n = t.navigation && t.navigation.transition, o = l.fonts.status;
					r();
					var s = [];
					if (o === "loaded" && (Pp(l), l.fonts.status === "loading" && s.push(l.fonts.ready)), o = s.length, e !== null) for (var c = e.suspenseyImages, u = 0, d = 0; d < c.length; d++) {
						var f = c[d];
						if (!f.complete) {
							var p = f.getBoundingClientRect();
							if (0 < p.bottom && 0 < p.right && p.top < t.innerHeight && p.left < t.innerWidth) {
								if (u += eh(f), u > rh) {
									s.length = o;
									break;
								}
								f = new Promise(Fp.bind(f)), s.push(f);
							}
						}
					}
					if (0 < s.length) return t = Promise.race([Promise.all(s), new Promise(function(e) {
						return setTimeout(e, 500);
					})]).then(i, i), (n ? Promise.allSettled([n.finished, t]) : t).then(a, a);
					if (i(), n) return n.finished.then(a, a);
					a();
				},
				types: n
			});
			l.__reactViewTransition = u;
			var d = [];
			return u.ready.then(function() {
				for (var e = l.documentElement.getAnimations({ subtree: !0 }), t = 0; t < e.length; t++) {
					var n = e[t], r = n.effect, i = r.pseudoElement;
					if (i != null && i.startsWith("::view-transition")) {
						d.push(n), n = r.getKeyframes();
						for (var a = i = void 0, s = !0, c = 0; c < n.length; c++) {
							var u = n[c], f = u.width;
							if (i === void 0) i = f;
							else if (i !== f) {
								s = !1;
								break;
							}
							if (f = u.height, a === void 0) a = f;
							else if (a !== f) {
								s = !1;
								break;
							}
							delete u.width, delete u.height, u.transform === "none" && delete u.transform;
						}
						s && i !== void 0 && a !== void 0 && (r.setKeyframes(n), s = getComputedStyle(r.target, r.pseudoElement), s.width !== i || s.height !== a) && (s = n[0], s.width = i, s.height = a, s = n[n.length - 1], s.width = i, s.height = a, r.setKeyframes(n));
					}
				}
				o();
			}, function(e) {
				l.__reactViewTransition === u && (l.__reactViewTransition = null);
				try {
					if (typeof e == "object" && e) switch (e.name) {
						case "InvalidStateError": (e.message === "View transition was skipped because document visibility state is hidden." || e.message === "Skipping view transition because document visibility state has become hidden." || e.message === "Skipping view transition because viewport size changed." || e.message === "Transition was aborted because of invalid state") && (e = null);
					}
					e !== null && c(e);
				} finally {
					r(), i(), o();
				}
			}), u.finished.finally(function() {
				for (var e = 0; e < d.length; e++) d[e].cancel();
				l.__reactViewTransition === u && (l.__reactViewTransition = null), s();
			}), u;
		} catch {
			return r(), i(), o(), null;
		}
	}
	function Lp(e, t) {
		this._scope = document.documentElement, this._selector = "::view-transition-" + e + "(" + t + ")";
	}
	Lp.prototype.animate = function(e, t) {
		return t = typeof t == "number" ? { duration: t } : D({}, t), t.pseudoElement = this._selector, this._scope.animate(e, t);
	}, Lp.prototype.getAnimations = function() {
		for (var e = this._scope, t = this._selector, n = e.getAnimations({ subtree: !0 }), r = [], i = 0; i < n.length; i++) {
			var a = n[i].effect;
			a !== null && a.target === e && a.pseudoElement === t && r.push(n[i]);
		}
		return r;
	}, Lp.prototype.getComputedStyle = function() {
		return getComputedStyle(this._scope, this._selector);
	};
	function Rp(e) {
		return {
			name: e,
			group: new Lp("group", e),
			imagePair: new Lp("image-pair", e),
			old: new Lp("old", e),
			new: new Lp("new", e)
		};
	}
	function zp(e) {
		this._fragmentFiber = e, this._observers = this._eventListeners = null;
	}
	zp.prototype.addEventListener = function(e, t, n) {
		var r = null, i = null;
		if (!(n != null && typeof n != "boolean" && (r = n.signal || null, r !== null && r.aborted))) {
			this._eventListeners === null && (this._eventListeners = []);
			var a = this._eventListeners;
			if (Wp(a, e, t, n) === -1) {
				var o = this, s = t;
				n != null && typeof n != "boolean" && !0 === n.once && (s = function(r) {
					o.removeEventListener(e, t, n), typeof t == "function" ? t.call(this, r) : t.handleEvent(r);
				}), r !== null && (i = o.removeEventListener.bind(o, e, t, n), r.addEventListener("abort", i, { once: !0 }), i = r.removeEventListener.bind(r, "abort", i)), r = Hp(n), a.push({
					type: e,
					listener: t,
					optionsOrUseCapture: n,
					attachedListener: s,
					cleanup: i
				}), m(this._fragmentFiber.child, !1, Bp, e, s, r);
			}
			this._eventListeners = a;
		}
	};
	function Bp(e, t, n, r) {
		return b(e).addEventListener(t, n, r), !1;
	}
	zp.prototype.removeEventListener = function(e, t, n) {
		var r = this._eventListeners;
		if (r !== null && (t = Wp(r, e, t, n), t !== -1)) {
			var i = r[t];
			n = i.attachedListener;
			var a = i.cleanup;
			i = Hp(i.optionsOrUseCapture), m(this._fragmentFiber.child, !1, Vp, e, n, i), r.splice(t, 1), a !== null && a();
		}
	};
	function Vp(e, t, n, r) {
		return b(e).removeEventListener(t, n, r), !1;
	}
	function Hp(e) {
		return e != null && typeof e != "boolean" && (!0 === e.once || e.signal instanceof AbortSignal) ? {
			capture: e.capture,
			passive: e.passive
		} : e;
	}
	function Up(e) {
		return e == null ? "c=0" : typeof e == "boolean" ? "c=" + (e ? "1" : "0") : "c=" + (e.capture ? "1" : "0");
	}
	function Wp(e, t, n, r) {
		if (e.length === 0) return -1;
		r = Up(r);
		for (var i = 0; i < e.length; i++) {
			var a = e[i];
			if (a.type === t && a.listener === n && Up(a.optionsOrUseCapture) === r) return i;
		}
		return -1;
	}
	zp.prototype.dispatchEvent = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return !0;
		t = b(t);
		var n = this._eventListeners;
		if (n !== null && 0 < n.length || !e.bubbles) {
			var r = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
			if (n) for (var i = 0; i < n.length; i++) {
				var a = n[i];
				r.addEventListener(a.type, a.attachedListener, Hp(a.optionsOrUseCapture));
			}
			if (t.appendChild(r), e = r.dispatchEvent(e), n) for (i = 0; i < n.length; i++) a = n[i], r.removeEventListener(a.type, a.attachedListener, Hp(a.optionsOrUseCapture));
			return t.removeChild(r), e;
		}
		return t.dispatchEvent(e);
	}, zp.prototype.focus = function(e) {
		m(this._fragmentFiber.child, !0, Gp, e, void 0, void 0);
	};
	function Gp(e, t) {
		return e.tag !== 6 && (e = b(e), _m(e, t));
	}
	zp.prototype.focusLast = function(e) {
		var t = [];
		m(this._fragmentFiber.child, !0, Kp, t, void 0, void 0);
		for (var n = t.length - 1; 0 <= n && !Gp(t[n], e); n--);
	};
	function Kp(e, t) {
		return t.push(e), !1;
	}
	zp.prototype.blur = function() {
		var e = g(this._fragmentFiber);
		e !== null && (e = b(e), e = pp(e).activeElement, e !== null && m(this._fragmentFiber.child, !1, qp, e, void 0, void 0));
	};
	function qp(e, t) {
		return e.tag !== 6 && (e = b(e), e === t || e.contains(t) ? (t.blur(), !0) : !1);
	}
	zp.prototype.observeUsing = function(e) {
		this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(e), m(this._fragmentFiber.child, !1, Jp, e, void 0, void 0);
	};
	function Jp(e, t) {
		return e.tag !== 6 && (e = b(e), t.observe(e), !1);
	}
	zp.prototype.unobserveUsing = function(e) {
		var t = this._observers;
		if (t !== null && t.has(e)) {
			t.delete(e), m(this._fragmentFiber.child, !1, Yp, e, void 0, void 0);
			for (var n = t = 0; n < Xp.length; n++) {
				var r = Xp[n];
				r.fragmentInstance === this && r.observer === e ? e.unobserve(r.instance) : Xp[t++] = r;
			}
			Xp.length = t;
		}
	};
	function Yp(e, t) {
		return e.tag !== 6 && (e = b(e), t.unobserve(e), !1);
	}
	var Xp = [], Zp = !1;
	function Qp(e, t, n) {
		Xp.push({
			fragmentInstance: e,
			observer: t,
			instance: n
		}), Zp || (Zp = !0, vm(function() {
			Zp = !1;
			var e = Xp;
			Xp = [];
			for (var t = 0; t < e.length; t++) {
				var n = e[t];
				n.observer.unobserve(n.instance);
			}
		}));
	}
	zp.prototype.getClientRects = function() {
		var e = [];
		return m(this._fragmentFiber.child, !1, $p, e, void 0, void 0), e;
	};
	function $p(e, t) {
		if (e.tag === 6) {
			e = e.stateNode;
			var n = e.ownerDocument.createRange();
			n.selectNodeContents(e), t.push.apply(t, n.getClientRects());
		} else e = b(e), t.push.apply(t, e.getClientRects());
		return !1;
	}
	zp.prototype.getRootNode = function(e) {
		var t = g(this._fragmentFiber);
		return t === null ? this : b(t).getRootNode(e);
	}, zp.prototype.compareDocumentPosition = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		var n = [];
		m(this._fragmentFiber.child, !1, Kp, n, void 0, void 0);
		var r = b(t);
		if (n.length === 0) {
			if (n = r, _(this._fragmentFiber)) {
				a: {
					for (t = this._fragmentFiber.return; t !== null;) {
						if (t.tag === 4) {
							t = t.stateNode.containerInfo;
							break a;
						}
						if (t.tag === 3 || t.tag === 5 || t.tag === 27) break;
						t = t.return;
					}
					t = null;
				}
				t != null && (n = t);
			}
			t = this._fragmentFiber;
			var i = r = n.compareDocumentPosition(e);
			return n === e ? i = Node.DOCUMENT_POSITION_CONTAINS : r & Node.DOCUMENT_POSITION_CONTAINED_BY && (n = v(t)[1], n === null ? i = Node.DOCUMENT_POSITION_PRECEDING : (e = b(n).compareDocumentPosition(e), i = e === 0 || e & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), i |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
		}
		t = b(n[0]), i = b(n[n.length - 1]);
		var a = _(this._fragmentFiber) ? t.parentElement : r;
		if (a == null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		r = a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, a = a.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		var o = t.compareDocumentPosition(e), s = i.compareDocumentPosition(e), c = o & Node.DOCUMENT_POSITION_CONTAINED_BY || s & Node.DOCUMENT_POSITION_CONTAINED_BY;
		return s = r && a && o & Node.DOCUMENT_POSITION_FOLLOWING && s & Node.DOCUMENT_POSITION_PRECEDING, t = r && t === e || a && i === e || c || s ? Node.DOCUMENT_POSITION_CONTAINED_BY : !r && t === e || !a && i === e ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : o, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || em(t, this._fragmentFiber, n[0], n[n.length - 1], e) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
	};
	function em(e, t, n, r, i) {
		var a = Nt(i);
		if (e & Node.DOCUMENT_POSITION_CONTAINED_BY) {
			if (n = !!a) a: {
				for (; a !== null;) {
					if (a.tag === 7 && (a === t || a.alternate === t)) {
						n = !0;
						break a;
					}
					a = a.return;
				}
				n = !1;
			}
			return n;
		}
		if (e & Node.DOCUMENT_POSITION_CONTAINS) {
			if (a === null) return a = i.ownerDocument, i === a || i === a.documentElement || i === a.body;
			a: {
				for (a = t, t = g(t); a !== null;) {
					if (!(a.tag !== 5 && a.tag !== 3 && a.tag !== 27 || a !== t && a.alternate !== t)) {
						a = !0;
						break a;
					}
					a = a.return;
				}
				a = !1;
			}
			return a;
		}
		return e & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!a) && !(t = a === n) && (t = E(n, a, T), t === null ? t = !1 : (m(t, !0, C, a, n), a = x, x = null, t = a !== null)), t) : e & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!a) && !(t = a === r) && (t = E(r, a, T), t === null ? t = !1 : (m(t, !0, w, a, r), a = x, S = x = null, t = a !== null)), t) : !1;
	}
	function tm(e, t) {
		var n = e.ownerDocument.createRange();
		n.selectNodeContents(e), e = n.getBoundingClientRect(), window.scrollTo(window.scrollX + e.left, t ? window.scrollY + e.top : window.scrollY + e.bottom - window.innerHeight);
	}
	zp.prototype.scrollIntoView = function(e) {
		if (typeof e == "object") throw Error(i(566));
		var t = [];
		m(this._fragmentFiber.child, !1, Kp, t, void 0, void 0);
		var n = !1 !== e;
		if (t.length === 0) {
			var r = v(this._fragmentFiber);
			if (r = n ? r[1] || r[0] || g(this._fragmentFiber) : r[0] || r[1], r === null) return;
			if (r.tag === 6) {
				e = b(r), tm(e, n);
				return;
			}
			if (r = b(r), r.nodeType !== 9) {
				if (r.nodeType === 11) {
					n = "host" in r ? r.host : null, n !== null && n.scrollIntoView(e);
					return;
				}
				r.scrollIntoView(e);
			}
		}
		for (r = n ? t.length - 1 : 0; r !== (n ? -1 : t.length);) {
			var a = t[r];
			a.tag === 6 ? (a = b(a), tm(a, n)) : b(a).scrollIntoView(e), r += n ? -1 : 1;
		}
	};
	function nm(e, t) {
		return e = b(e), rm(e, t), !1;
	}
	function rm(e, t) {
		e.reactFragments ??= /* @__PURE__ */ new Set(), e.reactFragments.add(t);
	}
	function im(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.addEventListener(i.type, i.attachedListener, Hp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			for (var r = 0, i = 0; i < Xp.length; i++) {
				var a = Xp[i];
				(a.fragmentInstance !== t || a.observer !== n || a.instance !== e) && (Xp[r++] = a);
			}
			Xp.length = r, n.observe(e);
		}), rm(e, t));
	}
	function am(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.removeEventListener(i.type, i.attachedListener, Hp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			typeof n.rootMargin == "string" ? Qp(t, n, e) : n.unobserve(e);
		}), e.reactFragments != null && e.reactFragments.delete(t));
	}
	function om(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					om(n), Mt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function sm(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) {
				if (t === "input" && e.type === "hidden") {
					var a = i.name == null ? null : "" + i.name;
					if (i.type === "hidden" && e.getAttribute("name") === a) return e;
				} else return e;
			} else if (!e[At]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = pm(e.nextSibling), e === null) break;
		}
		return null;
	}
	function cm(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = pm(e.nextSibling), e === null)) return null;
		return e;
	}
	function lm(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = pm(e.nextSibling), e === null)) return null;
		return e;
	}
	function um(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function dm(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function fm(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function pm(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var mm = null;
	function hm(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return pm(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function gm(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function _m(e, t) {
		function n() {
			r = !0;
		}
		if (e.ownerDocument.activeElement === e) return !0;
		var r = !1;
		try {
			e.ownerDocument.addEventListener("focus", n, !0), (e.focus || HTMLElement.prototype.focus).call(e, t);
		} finally {
			e.ownerDocument.removeEventListener("focus", n, !0);
		}
		return r;
	}
	function vm(e) {
		Cp(function() {
			Cp(function(t) {
				return e(t);
			});
		});
	}
	function ym(e, t, n) {
		switch (t = pp(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(i(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(i(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(i(454));
				return e;
			default: throw Error(i(451));
		}
	}
	function bm(e, t, n) {
		for (var r in n) {
			var i = n[r];
			n.hasOwnProperty(r) && i != null && Y(e, t, r, null, sp, i);
		}
		n.dangerouslySetInnerHTML != null && (e.textContent = ""), e.onclick === yn && (e.onclick = null), Mt(e);
	}
	function xm(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		Mt(e);
	}
	var Sm = /* @__PURE__ */ new Map(), Cm = /* @__PURE__ */ new Set();
	function wm(e) {
		if (typeof e.getRootNode == "function") {
			var t = e.getRootNode();
			if (t.nodeType === 9 || t.nodeType === 11) return t;
		}
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	var Tm = L.d;
	L.d = {
		f: Em,
		r: Dm,
		D: Am,
		C: jm,
		L: Mm,
		m: Nm,
		X: Fm,
		S: Pm,
		M: Im
	};
	function Em() {
		var e = Tm.f(), t = Ud();
		return e || t;
	}
	function Dm(e) {
		var t = Pt(e);
		t !== null && t.tag === 5 && t.type === "form" ? ic(t) : Tm.r(e);
	}
	var Om = typeof document > "u" ? null : document;
	function km(e, t, n) {
		var r = Om;
		if (r && typeof t == "string" && t) {
			var i = rn(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), Cm.has(i) || (Cm.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), op(t, "link", e), Lt(t), r.head.appendChild(t)));
		}
	}
	function Am(e) {
		Tm.D(e), km("dns-prefetch", e, null);
	}
	function jm(e, t) {
		Tm.C(e, t), km("preconnect", e, t);
	}
	function Mm(e, t, n) {
		Tm.L(e, t, n);
		var r = Om;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + rn(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + rn(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + rn(n.imageSizes) + "\"]")) : i += "[href=\"" + rn(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Rm(e);
					break;
				case "script": a = Hm(e);
			}
			if (!(Sm.has(a) || (e = D({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), Sm.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(zm(a)) || t === "script" && r.querySelector(Um(a))))) {
				var o = r.createElement("link");
				op(o, "link", e), t === "style" && (o[jt] = !0, o.onload = o.onerror = function() {
					Rt(o);
				}), Lt(o), r.head.appendChild(o);
			}
		}
	}
	function Nm(e, t) {
		Tm.m(e, t);
		var n = Om;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + rn(r) + "\"][href=\"" + rn(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Hm(e);
			}
			if (!Sm.has(a) && (e = D({
				rel: "modulepreload",
				href: e
			}, t), Sm.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(Um(a))) return;
				}
				r = n.createElement("link"), op(r, "link", e), Lt(r), n.head.appendChild(r);
			}
		}
	}
	function Pm(e, t, n) {
		Tm.S(e, t, n);
		var r = Om;
		if (r && e) {
			var i = It(r).hoistableStyles, a = Rm(e);
			t ||= "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(zm(a))) s.loading = 5;
				else {
					e = D({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = Sm.get(a)) && Km(e, n);
					var c = o = r.createElement("link");
					Lt(c), op(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Gm(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function Fm(e, t) {
		Tm.X(e, t);
		var n = Om;
		if (n && e) {
			var r = It(n).hoistableScripts, i = Hm(e), a = r.get(i);
			a || (a = n.querySelector(Um(i)), a || (e = D({
				src: e,
				async: !0
			}, t), (t = Sm.get(i)) && qm(e, t), a = n.createElement("script"), Lt(a), op(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Im(e, t) {
		Tm.M(e, t);
		var n = Om;
		if (n && e) {
			var r = It(n).hoistableScripts, i = Hm(e), a = r.get(i);
			a || (a = n.querySelector(Um(i)), a || (e = D({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = Sm.get(i)) && qm(e, t), a = n.createElement("script"), Lt(a), op(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Lm(e, t, n, r) {
		var a = (a = Ce.current) ? wm(a) : null;
		if (!a) throw Error(i(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (n = Rm(n.href), t = It(a).hoistableStyles, r = t.get(n), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Rm(n.href);
					var o = It(a).hoistableStyles, s = o.get(e);
					if (s || (a = a.ownerDocument || a, s = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, o.set(e, s), (o = a.querySelector(zm(e))) ? o._p || (s.instance = o, s.state.loading = 5) : (o = Sm.get(e), o || (o = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, Sm.set(e, o)), Vm(a, e, o, s.state))), t && r === null) throw Error(i(528, ""));
					return s;
				}
				if (t && r !== null) throw Error(i(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (n = Hm(n), t = It(a).hoistableScripts, r = t.get(n), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(i(444, e));
		}
	}
	function Rm(e) {
		return "href=\"" + rn(e) + "\"";
	}
	function zm(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Bm(e) {
		return D({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Vm(e, t, n, r) {
		if (t = e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]")) {
			if (!0 !== t[jt]) {
				r.loading = 1;
				return;
			}
		} else t = e.createElement("link"), t[jt] = !0, t.onload = t.onerror = Rt.bind(null, t), op(t, "link", n), Lt(t), e.head.appendChild(t);
		r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		});
	}
	function Hm(e) {
		return "[src=\"" + rn(e) + "\"]";
	}
	function Um(e) {
		return "script[async]" + e;
	}
	function Wm(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + rn(n.href) + "\"]");
				if (r) return t.instance = r, Lt(r), r;
				var a = D({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), Lt(r), op(r, "style", a), Gm(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				a = Rm(n.href);
				var o = e.querySelector(zm(a));
				if (o) return t.state.loading |= 4, t.instance = o, Lt(o), o;
				r = Bm(n), (a = Sm.get(a)) && Km(r, a), o = (e.ownerDocument || e).createElement("link"), Lt(o);
				var s = o;
				return s._p = new Promise(function(e, t) {
					s.onload = e, s.onerror = t;
				}), op(o, "link", r), t.state.loading |= 4, Gm(o, n.precedence, e), t.instance = o;
			case "script": return o = Hm(n.src), (a = e.querySelector(Um(o))) ? (t.instance = a, Lt(a), a) : (r = n, (a = Sm.get(o)) && (r = D({}, n), qm(r, a)), e = e.ownerDocument || e, a = e.createElement("script"), Lt(a), op(a, "link", r), e.head.appendChild(a), t.instance = a);
			case "void": return null;
			default: throw Error(i(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Gm(r, n.precedence, e));
		return t.instance;
	}
	function Gm(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Km(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.title ??= t.title;
	}
	function qm(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.integrity ??= t.integrity;
	}
	var Jm = null;
	function Ym(e, t, n) {
		if (Jm === null) {
			var r = /* @__PURE__ */ new Map(), i = Jm = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Jm, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[At] || a[Ct] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Xm(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function Zm(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Qm(e, t) {
		return e === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
	}
	function $m(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function eh(e) {
		return (e.width || 100) * (e.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * .25;
	}
	function th(e, t) {
		typeof t.decode == "function" && (e.imgCount++, t.complete || (e.imgBytes += eh(t), e.suspenseyImages.push(t)), e = sh.bind(e), t.decode().then(e, e));
	}
	function nh(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Rm(r.href), a = t.querySelector(zm(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = oh.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, Lt(a);
					return;
				}
				a = t.ownerDocument || t, r = Bm(r), (i = Sm.get(i)) && Km(r, i), a = a.createElement("link"), Lt(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), op(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = oh.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var rh = 0;
	function ih(e, t) {
		return e.stylesheets && e.count === 0 && lh(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && lh(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && rh === 0 && (rh = 62500 * up());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && lh(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > rh ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function ah(e) {
		if (e.count === 0 && (e.imgCount === 0 || !e.waitingForImages)) {
			if (e.stylesheets) lh(e, e.stylesheets);
			else if (e.unsuspend) {
				var t = e.unsuspend;
				e.unsuspend = null, t();
			}
		}
	}
	function oh() {
		this.count--, ah(this);
	}
	function sh() {
		this.imgCount--, ah(this);
	}
	var ch = null;
	function lh(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, ch = /* @__PURE__ */ new Map(), t.forEach(uh, e), ch = null, oh.call(e));
	}
	function uh(e, t) {
		if (!(t.state.loading & 4)) {
			var n = ch.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), ch.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = oh.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var dh = {
		$$typeof: P,
		Provider: null,
		Consumer: null,
		_currentValue: he,
		_currentValue2: he,
		_threadCount: 0
	};
	function fh(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ft(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ft(0), this.hiddenUpdates = ft(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function ph(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new fh(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = Ni(3, null, null, t), e.current = a, a.stateNode = e, t = Na(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, go(a), e;
	}
	function mh(e) {
		return e ? (e = ji, e) : ji;
	}
	function hh(e, t, n, r, i, a) {
		i = mh(i), r.context === null ? r.context = i : r.pendingContext = i, r = vo(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = yo(e, r, t), n !== null && (Rd(n, e, t), bo(n, e, t));
	}
	function gh(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function _h(e, t) {
		gh(e, t), (e = e.alternate) && gh(e, t);
	}
	function vh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = Oi(e, 67108864);
			t !== null && Rd(t, e, 67108864), _h(e, 67108864);
		}
	}
	function yh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = Fd();
			t = vt(t);
			var n = Oi(e, t);
			n !== null && Rd(n, e, t), _h(e, t);
		}
	}
	var bh = !0;
	function xh(e, t, n, r) {
		var i = I.T;
		I.T = null;
		var a = L.p;
		try {
			L.p = 2, Ch(e, t, n, r);
		} finally {
			L.p = a, I.T = i;
		}
	}
	function Sh(e, t, n, r) {
		var i = I.T;
		I.T = null;
		var a = L.p;
		try {
			L.p = 8, Ch(e, t, n, r);
		} finally {
			L.p = a, I.T = i;
		}
	}
	function Ch(e, t, n, r) {
		if (bh) {
			var i = wh(r);
			if (i === null) Xf(e, t, r, Th, n), Ih(e, r);
			else if (Rh(i, e, t, n, r)) r.stopPropagation();
			else if (Ih(e, r), t & 4 && -1 < Fh.indexOf(e)) {
				for (; i !== null;) {
					var a = Pt(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = ot(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - $e(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									Af(a), !(U & 6) && (bd = Ve() + 500, jf(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = Oi(a, 2), s !== null && Rd(s, a, 2), Ud(), _h(a, 2);
					}
					if (a = wh(r), a === null && Xf(e, t, r, Th, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else Xf(e, t, r, null, n);
		}
	}
	function wh(e) {
		return e = xn(e), Eh(e);
	}
	var Th = null;
	function Eh(e) {
		if (Th = null, e = Nt(e), e !== null) {
			var t = o(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = s(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = c(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return Th = e, null;
	}
	function Dh(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "fullscreenerror":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "resize":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (He()) {
				case Ue: return 2;
				case We: return 8;
				case Ge:
				case Ke: return 32;
				case qe: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var Oh = !1, kh = null, Ah = null, jh = null, Mh = /* @__PURE__ */ new Map(), Nh = /* @__PURE__ */ new Map(), Ph = [], Fh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Ih(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				kh = null;
				break;
			case "dragenter":
			case "dragleave":
				Ah = null;
				break;
			case "mouseover":
			case "mouseout":
				jh = null;
				break;
			case "pointerover":
			case "pointerout":
				Mh.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": Nh.delete(t.pointerId);
		}
	}
	function Lh(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = Pt(t), t !== null && vh(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Rh(e, t, n, r, i) {
		switch (t) {
			case "focusin": return kh = Lh(kh, e, t, n, r, i), !0;
			case "dragenter": return Ah = Lh(Ah, e, t, n, r, i), !0;
			case "mouseover": return jh = Lh(jh, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return Mh.set(a, Lh(Mh.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, Nh.set(a, Lh(Nh.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function zh(e) {
		var t = Nt(e.target);
		if (t !== null) {
			var n = o(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = s(n), t !== null) {
						e.blockedOn = t, xt(e.priority, function() {
							yh(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = c(n), t !== null) {
						e.blockedOn = t, xt(e.priority, function() {
							yh(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Bh(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = wh(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				bn = r, n.target.dispatchEvent(r), bn = null;
			} else return t = Pt(n), t !== null && vh(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Vh(e, t, n) {
		Bh(e) && n.delete(t);
	}
	function Hh() {
		Oh = !1, kh !== null && Bh(kh) && (kh = null), Ah !== null && Bh(Ah) && (Ah = null), jh !== null && Bh(jh) && (jh = null), Mh.forEach(Vh), Nh.forEach(Vh);
	}
	function Uh(e, n) {
		e.blockedOn === n && (e.blockedOn = null, Oh || (Oh = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, Hh)));
	}
	var Wh = null;
	function Gh(e) {
		Wh !== e && (Wh = e, t.unstable_scheduleCallback(t.unstable_NormalPriority, function() {
			Wh === e && (Wh = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (Eh(r || n) === null) continue;
					break;
				}
				var a = Pt(n);
				a !== null && (e.splice(t, 3), t -= 3, V(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Kh(e) {
		function t(t) {
			return Uh(t, e);
		}
		kh !== null && Uh(kh, e), Ah !== null && Uh(Ah, e), jh !== null && Uh(jh, e), Mh.forEach(t), Nh.forEach(t);
		for (var n = 0; n < Ph.length; n++) {
			var r = Ph[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < Ph.length && (n = Ph[0], n.blockedOn === null);) zh(n), n.blockedOn === null && Ph.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[wt] || null;
			if (typeof a == "function") o || Gh(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[wt] || null) s = o.formAction;
					else if (Eh(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Gh(n);
			}
		}
	}
	function qh() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Jh(e) {
		this._internalRoot = e;
	}
	Yh.prototype.render = Jh.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(i(409));
		var n = t.current;
		hh(n, Fd(), e, t, null, null);
	}, Yh.prototype.unmount = Jh.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			hh(e.current, 2, null, e, null, null), Ud(), t[Tt] = null;
		}
	};
	function Yh(e) {
		this._internalRoot = e;
	}
	Yh.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = bt();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < Ph.length && t !== 0 && t < Ph[n].priority; n++);
			Ph.splice(n, 0, e), n === 0 && zh(e);
		}
	};
	var Xh = n.version;
	if (Xh !== "19.3.0") throw Error(i(527, Xh, "19.3.0"));
	L.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(i(188)) : (e = Object.keys(e).join(","), Error(i(268, e)));
		return e = u(t), e = e === null ? null : f(e), e = e === null ? null : e.stateNode, e;
	};
	var Zh = {
		bundleType: 0,
		version: "19.3.0",
		rendererPackageName: "react-dom",
		currentDispatcherRef: I,
		reconcilerVersion: "19.3.0"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var Qh = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!Qh.isDisabled && Qh.supportsFiber) try {
			Xe = Qh.inject(Zh), Ze = Qh;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!a(e)) throw Error(i(299));
		var n = !1, r = "", o = Tc, s = Ec, c = Dc;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (o = t.onUncaughtError), t.onCaughtError !== void 0 && (s = t.onCaughtError), t.onRecoverableError !== void 0 && (c = t.onRecoverableError)), t = ph(e, 1, !1, null, null, n, r, null, o, s, c, qh), e[Tt] = t.current, Jf(e), new Jh(t);
	};
})), _ = /* @__PURE__ */ o(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = g();
})), v = /* @__PURE__ */ o(((e) => {
	var t = Symbol.for("react.transitional.element");
	function n(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.jsx = n, e.jsxs = n;
})), y = /* @__PURE__ */ o(((e, t) => {
	t.exports = v();
})), b = _(), x = /* @__PURE__ */ l(d(), 1), S = y(), C = Object.defineProperty, w = (e, t) => C(e, "name", {
	value: t,
	configurable: !0
});
// @__NO_SIDE_EFFECTS__
function T(e, t) {
	let n = x.createContext(t);
	n.displayName = e + "Context";
	let r = /* @__PURE__ */ w((e) => {
		let { children: t, ...r } = e, i = x.useMemo(() => r, Object.values(r));
		return /* @__PURE__ */ (0, S.jsx)(n.Provider, {
			value: i,
			children: t
		});
	}, "Provider");
	r.displayName = e + "Provider";
	function i(r, i = {}) {
		let { optional: a = !1 } = i, o = x.useContext(n);
		if (o) return o;
		if (t !== void 0) return t;
		if (!a) throw Error(`\`${r}\` must be used within \`${e}\``);
	}
	return w(i, "useContext"), [r, i];
}
w(T, "createContext");
// @__NO_SIDE_EFFECTS__
function E(e, t = []) {
	let n = [];
	function r(t, r) {
		let i = x.createContext(r);
		i.displayName = t + "Context";
		let a = n.length;
		n = [...n, r];
		let o = /* @__PURE__ */ w((t) => {
			let { scope: n, children: r, ...o } = t, s = n?.[e]?.[a] || i, c = x.useMemo(() => o, Object.values(o));
			return /* @__PURE__ */ (0, S.jsx)(s.Provider, {
				value: c,
				children: r
			});
		}, "Provider");
		o.displayName = t + "Provider";
		function s(n, o, s = {}) {
			let { optional: c = !1 } = s, l = o?.[e]?.[a] || i, u = x.useContext(l);
			if (u) return u;
			if (r !== void 0) return r;
			if (!c) throw Error(`\`${n}\` must be used within \`${t}\``);
		}
		return w(s, "useContext"), [o, s];
	}
	w(r, "createContext");
	let i = /* @__PURE__ */ w(() => {
		let t = n.map((e) => x.createContext(e));
		return /* @__PURE__ */ w(function(n) {
			let r = n?.[e] || t;
			return x.useMemo(() => ({ [`__scope${e}`]: {
				...n,
				[e]: r
			} }), [n, r]);
		}, "useScope");
	}, "createScope");
	return i.scopeName = e, [r, D(i, ...t)];
}
w(E, "createContextScope");
function D(...e) {
	let t = e[0];
	if (e.length === 1) return t;
	let n = /* @__PURE__ */ w(() => {
		let n = e.map((e) => ({
			useScope: e(),
			scopeName: e.scopeName
		}));
		return /* @__PURE__ */ w(function(e) {
			let r = n.reduce((t, { useScope: n, scopeName: r }) => {
				let i = n(e)[`__scope${r}`];
				return {
					...t,
					...i
				};
			}, {});
			return x.useMemo(() => ({ [`__scope${t.scopeName}`]: r }), [r]);
		}, "useComposedScopes");
	}, "createScope");
	return n.scopeName = t.scopeName, n;
}
w(D, "composeContextScopes");
//#endregion
//#region node_modules/@radix-ui/react-compose-refs/dist/index.mjs
var O = Object.defineProperty, k = (e, t) => O(e, "name", {
	value: t,
	configurable: !0
});
function A(e, t) {
	if (typeof e == "function") return e(t);
	e != null && (e.current = t);
}
k(A, "setRef");
function j(...e) {
	return (t) => {
		let n = !1, r = e.map((e) => {
			let r = A(e, t);
			return !n && typeof r == "function" && (n = !0), r;
		});
		if (n) return () => {
			for (let t = 0; t < r.length; t++) {
				let n = r[t];
				typeof n == "function" ? n() : A(e[t], null);
			}
		};
	};
}
k(j, "composeRefs");
function M(...e) {
	return x.useCallback(j(...e), e);
}
k(M, "useComposedRefs");
//#endregion
//#region node_modules/@radix-ui/react-slot/dist/index.mjs
var N = Object.defineProperty, ee = (e, t) => N(e, "name", {
	value: t,
	configurable: !0
});
// @__NO_SIDE_EFFECTS__
function P(e) {
	let t = x.forwardRef((t, n) => {
		let { children: r, ...i } = t, a = null, o = !1, s = [];
		se(r) && typeof de == "function" && (r = de(r._payload)), x.Children.forEach(r, (e) => {
			if (ae(e)) {
				o = !0;
				let t = e, n = "child" in t.props ? t.props.child : t.props.children;
				se(n) && typeof de == "function" && (n = de(n._payload)), a = ne(t, n), s.push(a?.props?.children);
			} else s.push(e);
		}), a ? a = x.cloneElement(a, void 0, s) : !o && x.Children.count(r) === 1 && x.isValidElement(r) && (a = r);
		let c = a ? ie(a) : void 0, l = M(n, c);
		if (!a) {
			if (r || r === 0) throw Error(o ? ue(e) : le(e));
			return r;
		}
		let u = re(i, a.props ?? {});
		return a.type !== x.Fragment && (u.ref = n ? l : c), x.cloneElement(a, u);
	});
	return t.displayName = `${e}.Slot`, t;
}
ee(P, "createSlot");
var F = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function te(e) {
	let t = /* @__PURE__ */ ee((e) => "child" in e ? e.children(e.child) : e.children, "Slottable");
	return t.displayName = `${e}.Slottable`, t.__radixId = F, t;
}
ee(te, "createSlottable");
var ne = /* @__PURE__ */ ee((e, t) => {
	if ("child" in e.props) {
		let t = e.props.child;
		return x.isValidElement(t) ? x.cloneElement(t, void 0, e.props.children(t.props.children)) : null;
	}
	return x.isValidElement(t) ? t : null;
}, "getSlottableElementFromSlottable");
function re(e, t) {
	let n = { ...t };
	for (let r in t) {
		let i = e[r], a = t[r];
		/^on[A-Z]/.test(r) ? i && a ? n[r] = (...e) => {
			let t = a(...e);
			return i(...e), t;
		} : i && (n[r] = i) : r === "style" ? n[r] = {
			...i,
			...a
		} : r === "className" && (n[r] = [i, a].filter(Boolean).join(" "));
	}
	return {
		...e,
		...n
	};
}
ee(re, "mergeProps");
function ie(e) {
	let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
	return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
ee(ie, "getElementRef");
function ae(e) {
	return x.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === F;
}
ee(ae, "isSlottable");
var oe = Symbol.for("react.lazy");
function se(e) {
	return typeof e == "object" && !!e && "$$typeof" in e && e.$$typeof === oe && "_payload" in e && ce(e._payload);
}
ee(se, "isLazyComponent");
function ce(e) {
	return typeof e == "object" && !!e && "then" in e;
}
ee(ce, "isPromiseLike");
var le = /* @__PURE__ */ ee((e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, "createSlotError"), ue = /* @__PURE__ */ ee((e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, "createSlottableError"), de = x.use, fe = Object.defineProperty, pe = (e, t) => fe(e, "name", {
	value: t,
	configurable: !0
});
// @__NO_SIDE_EFFECTS__
function me(e) {
	let t = e + "CollectionProvider", [n, r] = /* @__PURE__ */ E(t), [i, a] = n(t, {
		collectionRef: { current: null },
		itemMap: /* @__PURE__ */ new Map()
	}), o = /* @__PURE__ */ pe((e) => {
		let { scope: t, children: n } = e, r = x.useRef(null), a = x.useRef(/* @__PURE__ */ new Map()).current;
		return /* @__PURE__ */ (0, S.jsx)(i, {
			scope: t,
			itemMap: a,
			collectionRef: r,
			children: n
		});
	}, "CollectionProvider");
	o.displayName = t;
	let s = e + "CollectionSlot", c = /* @__PURE__ */ P(s), l = x.forwardRef((e, t) => {
		let { scope: n, children: r } = e, i = M(t, a(s, n).collectionRef);
		return /* @__PURE__ */ (0, S.jsx)(c, {
			ref: i,
			children: r
		});
	});
	l.displayName = s;
	let u = e + "CollectionItemSlot", d = "data-radix-collection-item", f = /* @__PURE__ */ P(u), p = x.forwardRef((e, t) => {
		let { scope: n, children: r, ...i } = e, o = x.useRef(null), s = M(t, o), c = a(u, n);
		return x.useEffect(() => (c.itemMap.set(o, {
			ref: o,
			...i
		}), () => void c.itemMap.delete(o))), /* @__PURE__ */ (0, S.jsx)(f, {
			[d]: "",
			ref: s,
			children: r
		});
	});
	p.displayName = u;
	function m(t) {
		let n = a(e + "CollectionConsumer", t);
		return x.useCallback(() => {
			let e = n.collectionRef.current;
			if (!e) return [];
			let t = Array.from(e.querySelectorAll(`[${d}]`));
			return Array.from(n.itemMap.values()).sort((e, n) => t.indexOf(e.ref.current) - t.indexOf(n.ref.current));
		}, [n.collectionRef, n.itemMap]);
	}
	return pe(m, "useCollection"), [
		{
			Provider: o,
			Slot: l,
			ItemSlot: p
		},
		m,
		r
	];
}
pe(me, "createCollection");
var I = /* @__PURE__ */ new WeakMap(), L = class e extends Map {
	static {
		pe(this, "OrderedDict");
	}
	#e;
	constructor(e) {
		super(e), this.#e = [...super.keys()], I.set(this, !0);
	}
	set(e, t) {
		return I.get(this) && (this.has(e) ? this.#e[this.#e.indexOf(e)] = e : this.#e.push(e)), super.set(e, t), this;
	}
	insert(e, t, n) {
		let r = this.has(t), i = this.#e.length, a = _e(e), o = a >= 0 ? a : i + a, s = o < 0 || o >= i ? -1 : o;
		if (s === this.size || r && s === this.size - 1 || s === -1) return this.set(t, n), this;
		let c = this.size + +!r;
		a < 0 && o++;
		let l = [...this.#e], u, d = !1;
		for (let e = o; e < c; e++) if (o === e) {
			let i = l[e];
			l[e] === t && (i = l[e + 1]), r && this.delete(t), u = this.get(i), this.set(t, n);
		} else {
			!d && l[e - 1] === t && (d = !0);
			let n = l[d ? e : e - 1], r = u;
			u = this.get(n), this.delete(n), this.set(n, r);
		}
		return this;
	}
	with(t, n, r) {
		let i = new e(this);
		return i.insert(t, n, r), i;
	}
	before(e) {
		let t = this.#e.indexOf(e) - 1;
		if (!(t < 0)) return this.entryAt(t);
	}
	setBefore(e, t, n) {
		let r = this.#e.indexOf(e);
		return r === -1 ? this : this.insert(r, t, n);
	}
	after(e) {
		let t = this.#e.indexOf(e);
		if (t = t === -1 || t === this.size - 1 ? -1 : t + 1, t !== -1) return this.entryAt(t);
	}
	setAfter(e, t, n) {
		let r = this.#e.indexOf(e);
		return r === -1 ? this : this.insert(r + 1, t, n);
	}
	first() {
		return this.entryAt(0);
	}
	last() {
		return this.entryAt(-1);
	}
	clear() {
		return this.#e = [], super.clear();
	}
	delete(e) {
		let t = super.delete(e);
		return t && this.#e.splice(this.#e.indexOf(e), 1), t;
	}
	deleteAt(e) {
		let t = this.keyAt(e);
		return t !== void 0 && this.delete(t);
	}
	at(e) {
		let t = he(this.#e, e);
		if (t !== void 0) return this.get(t);
	}
	entryAt(e) {
		let t = he(this.#e, e);
		if (t !== void 0) return [t, this.get(t)];
	}
	indexOf(e) {
		return this.#e.indexOf(e);
	}
	keyAt(e) {
		return he(this.#e, e);
	}
	from(e, t) {
		let n = this.indexOf(e);
		if (n === -1) return;
		let r = n + t;
		return r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.at(r);
	}
	keyFrom(e, t) {
		let n = this.indexOf(e);
		if (n === -1) return;
		let r = n + t;
		return r < 0 && (r = 0), r >= this.size && (r = this.size - 1), this.keyAt(r);
	}
	find(e, t) {
		let n = 0;
		for (let r of this) {
			if (Reflect.apply(e, t, [
				r,
				n,
				this
			])) return r;
			n++;
		}
	}
	findIndex(e, t) {
		let n = 0;
		for (let r of this) {
			if (Reflect.apply(e, t, [
				r,
				n,
				this
			])) return n;
			n++;
		}
		return -1;
	}
	filter(t, n) {
		let r = [], i = 0;
		for (let e of this) Reflect.apply(t, n, [
			e,
			i,
			this
		]) && r.push(e), i++;
		return new e(r);
	}
	map(t, n) {
		let r = [], i = 0;
		for (let e of this) r.push([e[0], Reflect.apply(t, n, [
			e,
			i,
			this
		])]), i++;
		return new e(r);
	}
	reduce(...e) {
		let [t, n] = e, r = 0, i = n ?? this.at(0);
		for (let n of this) i = r === 0 && e.length === 1 ? n : Reflect.apply(t, this, [
			i,
			n,
			r,
			this
		]), r++;
		return i;
	}
	reduceRight(...e) {
		let [t, n] = e, r = n ?? this.at(-1);
		for (let n = this.size - 1; n >= 0; n--) {
			let i = this.at(n);
			r = n === this.size - 1 && e.length === 1 ? i : Reflect.apply(t, this, [
				r,
				i,
				n,
				this
			]);
		}
		return r;
	}
	toSorted(t) {
		let n = [...this.entries()].sort(t);
		return new e(n);
	}
	toReversed() {
		let t = new e();
		for (let e = this.size - 1; e >= 0; e--) {
			let n = this.keyAt(e), r = this.get(n);
			t.set(n, r);
		}
		return t;
	}
	toSpliced(...t) {
		let n = [...this.entries()];
		return n.splice(...t), new e(n);
	}
	slice(t, n) {
		let r = new e(), i = this.size - 1;
		if (t === void 0) return r;
		t < 0 && (t += this.size), n !== void 0 && n > 0 && (i = n - 1);
		for (let e = t; e <= i; e++) {
			let t = this.keyAt(e), n = this.get(t);
			r.set(t, n);
		}
		return r;
	}
	every(e, t) {
		let n = 0;
		for (let r of this) {
			if (!Reflect.apply(e, t, [
				r,
				n,
				this
			])) return !1;
			n++;
		}
		return !0;
	}
	some(e, t) {
		let n = 0;
		for (let r of this) {
			if (Reflect.apply(e, t, [
				r,
				n,
				this
			])) return !0;
			n++;
		}
		return !1;
	}
};
function he(e, t) {
	if ("at" in Array.prototype) return Array.prototype.at.call(e, t);
	let n = ge(e, t);
	return n === -1 ? void 0 : e[n];
}
pe(he, "at");
function ge(e, t) {
	let n = e.length, r = _e(t), i = r >= 0 ? r : n + r;
	return i < 0 || i >= n ? -1 : i;
}
pe(ge, "toSafeIndex");
function _e(e) {
	return e !== e || e === 0 ? 0 : Math.trunc(e);
}
pe(_e, "toSafeInteger");
// @__NO_SIDE_EFFECTS__
function ve(e) {
	let t = e + "CollectionProvider", [n, r] = /* @__PURE__ */ E(t), [i, a] = n(t, {
		collectionElement: null,
		collectionRef: { current: null },
		collectionRefObject: { current: null },
		itemMap: new L(),
		setItemMap: /* @__PURE__ */ pe(() => void 0, "setItemMap")
	}), o = /* @__PURE__ */ pe(({ state: e, ...t }) => e ? /* @__PURE__ */ (0, S.jsx)(c, {
		...t,
		state: e
	}) : /* @__PURE__ */ (0, S.jsx)(s, { ...t }), "CollectionProvider");
	o.displayName = t;
	let s = /* @__PURE__ */ pe((e) => {
		let t = h();
		return /* @__PURE__ */ (0, S.jsx)(c, {
			...e,
			state: t
		});
	}, "CollectionInit");
	s.displayName = t + "Init";
	let c = /* @__PURE__ */ pe((e) => {
		let { scope: t, children: n, state: r } = e, a = x.useRef(null), [o, s] = x.useState(null), c = M(a, s), [l, u] = r;
		return x.useEffect(() => {
			if (!o) return;
			let e = Se(() => {});
			return e.observe(o, {
				childList: !0,
				subtree: !0
			}), () => {
				e.disconnect();
			};
		}, [o]), /* @__PURE__ */ (0, S.jsx)(i, {
			scope: t,
			itemMap: l,
			setItemMap: u,
			collectionRef: c,
			collectionRefObject: a,
			collectionElement: o,
			children: n
		});
	}, "CollectionProviderImpl");
	c.displayName = t + "Impl";
	let l = e + "CollectionSlot", u = /* @__PURE__ */ P(l), d = x.forwardRef((e, t) => {
		let { scope: n, children: r } = e, i = M(t, a(l, n).collectionRef);
		return /* @__PURE__ */ (0, S.jsx)(u, {
			ref: i,
			children: r
		});
	});
	d.displayName = l;
	let f = e + "CollectionItemSlot", p = /* @__PURE__ */ P(f), m = x.forwardRef((e, t) => {
		let { scope: n, children: r, ...i } = e, o = x.useRef(null), [s, c] = x.useState(null), l = M(t, o, c), { setItemMap: u } = a(f, n), d = x.useRef(i);
		ye(d.current, i) || (d.current = i);
		let m = d.current;
		return x.useEffect(() => {
			let e = m;
			return u((t) => s ? t.has(s) ? t.set(s, {
				...e,
				element: s
			}).toSorted(xe) : (t.set(s, {
				...e,
				element: s
			}), t.toSorted(xe)) : t), () => {
				u((e) => !s || !e.has(s) ? e : (e.delete(s), new L(e)));
			};
		}, [
			s,
			m,
			u
		]), /* @__PURE__ */ (0, S.jsx)(p, {
			"data-radix-collection-item": "",
			ref: l,
			children: r
		});
	});
	m.displayName = f;
	function h() {
		return x.useState(new L());
	}
	pe(h, "useInitCollection");
	function g(t) {
		let { itemMap: n } = a(e + "CollectionConsumer", t);
		return n;
	}
	return pe(g, "useCollection"), [{
		Provider: o,
		Slot: d,
		ItemSlot: m
	}, {
		createCollectionScope: r,
		useCollection: g,
		useInitCollection: h
	}];
}
pe(ve, "createCollection");
function ye(e, t) {
	if (e === t) return !0;
	if (typeof e != "object" || typeof t != "object" || e == null || t == null) return !1;
	let n = Object.keys(e), r = Object.keys(t);
	if (n.length !== r.length) return !1;
	for (let r of n) if (!Object.prototype.hasOwnProperty.call(t, r) || e[r] !== t[r]) return !1;
	return !0;
}
pe(ye, "shallowEqual");
function be(e, t) {
	return !!(t.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_PRECEDING);
}
pe(be, "isElementPreceding");
function xe(e, t) {
	return !e[1].element || !t[1].element ? 0 : be(e[1].element, t[1].element) ? -1 : 1;
}
pe(xe, "sortByDocumentPosition");
function Se(e) {
	return new MutationObserver((t) => {
		for (let n of t) if (n.type === "childList") {
			e();
			return;
		}
	});
}
pe(Se, "getChildListObserver");
//#endregion
//#region node_modules/@radix-ui/primitive/dist/index.mjs
var Ce = Object.defineProperty, we = (e, t) => Ce(e, "name", {
	value: t,
	configurable: !0
}), Te = !!(typeof window < "u" && window.document && window.document.createElement);
function Ee(e, t, { checkForDefaultPrevented: n = !0 } = {}) {
	return /* @__PURE__ */ we(function(r) {
		if (e?.(r), n === !1 || !r || !r.defaultPrevented) return t?.(r);
	}, "handleEvent");
}
we(Ee, "composeEventHandlers");
function De(e) {
	if (!Te) throw Error("Cannot access window outside of the DOM");
	return e?.ownerDocument?.defaultView ?? window;
}
we(De, "getOwnerWindow");
function Oe(e) {
	if (!Te) throw Error("Cannot access document outside of the DOM");
	return e?.ownerDocument ?? document;
}
we(Oe, "getOwnerDocument");
function ke(e, t = !1) {
	let { activeElement: n } = Oe(e);
	if (!n?.nodeName) return null;
	if (Ae(n) && n.contentDocument) return ke(n.contentDocument.body, t);
	if (t) {
		let e = n.getAttribute("aria-activedescendant");
		if (e) {
			let t = Oe(n).getElementById(e);
			if (t) return t;
		}
	}
	return n;
}
we(ke, "getActiveElement");
function Ae(e) {
	return e.tagName === "IFRAME";
}
we(Ae, "isFrame");
//#endregion
//#region node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var je = globalThis?.document ? x.useLayoutEffect : () => {}, Me = Object.defineProperty, Ne = (e, t) => Me(e, "name", {
	value: t,
	configurable: !0
}), Pe = x.useEffectEvent, Fe = x.useInsertionEffect;
function Ie(e) {
	if (typeof Pe == "function") return Pe(e);
	let t = x.useRef(() => {
		throw Error("Cannot call an event handler while rendering.");
	});
	return typeof Fe == "function" ? Fe(() => {
		t.current = e;
	}) : je(() => {
		t.current = e;
	}), x.useMemo(() => ((...e) => t.current?.(...e)), []);
}
Ne(Ie, "useEffectEvent");
//#endregion
//#region node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
var Le = Object.defineProperty, Re = (e, t) => Le(e, "name", {
	value: t,
	configurable: !0
}), ze = x.useInsertionEffect || je;
function Be({ prop: e, defaultProp: t, onChange: n = /* @__PURE__ */ Re(() => {}, "onChange"), caller: r }) {
	let [i, a, o] = Ve({
		defaultProp: t,
		onChange: n
	}), s = e !== void 0;
	return [s ? e : i, x.useCallback((t) => {
		if (s) {
			let n = He(t) ? t(e) : t;
			n !== e && o.current?.(n);
		} else a(t);
	}, [
		s,
		e,
		a,
		o
	])];
}
Re(Be, "useControllableState");
function Ve({ defaultProp: e, onChange: t }) {
	let [n, r] = x.useState(e), i = x.useRef(n), a = x.useRef(t);
	return ze(() => {
		a.current = t;
	}, [t]), x.useEffect(() => {
		i.current !== n && (a.current?.(n), i.current = n);
	}, [n, i]), [
		n,
		r,
		a
	];
}
Re(Ve, "useUncontrolledState");
function He(e) {
	return typeof e == "function";
}
Re(He, "isFunction");
var Ue = Symbol("RADIX:SYNC_STATE");
function We(e, t, n, r) {
	let { prop: i, defaultProp: a, onChange: o, caller: s } = t, c = i !== void 0, l = Ie(o), u = [{
		...n,
		state: a
	}];
	r && u.push(r);
	let [d, f] = x.useReducer((t, n) => {
		if (n.type === Ue) return {
			...t,
			state: n.state
		};
		let r = e(t, n);
		return c && !Object.is(r.state, t.state) && l(r.state), r;
	}, ...u), p = d.state, m = x.useRef(p);
	x.useEffect(() => {
		m.current !== p && (m.current = p, c || l(p));
	}, [
		p,
		m,
		c
	]);
	let h = x.useMemo(() => i === void 0 ? d : {
		...d,
		state: i
	}, [d, i]);
	return x.useEffect(() => {
		c && !Object.is(i, d.state) && f({
			type: Ue,
			state: i
		});
	}, [
		i,
		d.state,
		c
	]), [h, f];
}
Re(We, "useControllableStateReducer");
//#endregion
//#region node_modules/@radix-ui/react-primitive/dist/index.mjs
var Ge = /* @__PURE__ */ l(h(), 1), Ke = Object.defineProperty, qe = (e, t) => Ke(e, "name", {
	value: t,
	configurable: !0
}), Je = [
	"a",
	"button",
	"div",
	"form",
	"h2",
	"h3",
	"img",
	"input",
	"label",
	"li",
	"nav",
	"ol",
	"p",
	"select",
	"span",
	"svg",
	"ul"
].reduce((e, t) => {
	let n = /* @__PURE__ */ P(`Primitive.${t}`), r = x.forwardRef((e, r) => {
		let { asChild: i, ...a } = e, o = i ? n : t;
		return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ (0, S.jsx)(o, {
			...a,
			ref: r
		});
	});
	return r.displayName = `Primitive.${t}`, {
		...e,
		[t]: r
	};
}, {});
function Ye(e, t) {
	e && Ge.flushSync(() => e.dispatchEvent(t));
}
qe(Ye, "dispatchDiscreteCustomEvent");
//#endregion
//#region node_modules/@radix-ui/react-presence/dist/index.mjs
var Xe = Object.defineProperty, Ze = (e, t) => Xe(e, "name", {
	value: t,
	configurable: !0
});
function Qe(e, t) {
	return x.useReducer((e, n) => t[e][n] ?? e, e);
}
Ze(Qe, "useStateMachine");
var $e = /* @__PURE__ */ Ze((e) => {
	let { present: t, children: n } = e, r = et(t), i = typeof n == "function" ? n({ present: r.isPresent }) : x.Children.only(n), a = nt(r.ref, it(i));
	return typeof n == "function" || r.isPresent ? x.cloneElement(i, { ref: a }) : null;
}, "Presence");
function et(e) {
	let [t, n] = x.useState(), r = x.useRef(null), i = x.useRef(e), a = x.useRef("none"), o = x.useRef(void 0), [s, c] = Qe(e ? "mounted" : "unmounted", {
		mounted: {
			UNMOUNT: "unmounted",
			ANIMATION_OUT: "unmountSuspended"
		},
		unmountSuspended: {
			MOUNT: "mounted",
			ANIMATION_END: "unmounted"
		},
		unmounted: { MOUNT: "mounted" }
	});
	return x.useEffect(() => {
		s === "mounted" ? (a.current = o.current ?? rt(r.current), o.current = void 0) : a.current = "none";
	}, [s]), je(() => {
		let t = r.current, n = i.current;
		if (n !== e) {
			let r = a.current, s = rt(t);
			e ? (o.current = s, c("MOUNT")) : s === "none" || t?.display === "none" ? c("UNMOUNT") : c(n && r !== s ? "ANIMATION_OUT" : "UNMOUNT"), i.current = e;
		}
	}, [e, c]), je(() => {
		if (t) {
			let e, n = t.ownerDocument.defaultView ?? window, o = /* @__PURE__ */ Ze((a) => {
				let o = rt(r.current).includes(CSS.escape(a.animationName));
				if (a.target === t && o && (c("ANIMATION_END"), !i.current)) {
					let r = t.style.animationFillMode;
					t.style.animationFillMode = "forwards", e = n.setTimeout(() => {
						t.style.animationFillMode === "forwards" && (t.style.animationFillMode = r);
					});
				}
			}, "handleAnimationEnd"), s = /* @__PURE__ */ Ze((e) => {
				e.target === t && (a.current = rt(r.current));
			}, "handleAnimationStart");
			return t.addEventListener("animationstart", s), t.addEventListener("animationcancel", o), t.addEventListener("animationend", o), () => {
				n.clearTimeout(e), t.removeEventListener("animationstart", s), t.removeEventListener("animationcancel", o), t.removeEventListener("animationend", o);
			};
		}
		c("ANIMATION_END");
	}, [t, c]), {
		isPresent: ["mounted", "unmountSuspended"].includes(s),
		ref: x.useCallback((e) => {
			if (e) {
				let t = getComputedStyle(e);
				r.current = t, o.current = rt(t);
			} else r.current = null;
			n(e);
		}, [])
	};
}
Ze(et, "usePresence");
function tt(e, t) {
	if (typeof e == "function") return e(t);
	e != null && (e.current = t);
}
Ze(tt, "setRef");
function nt(...e) {
	let t = x.useRef(e);
	return t.current = e, x.useCallback((e) => {
		let n = t.current, r = !1, i = n.map((t) => {
			let n = tt(t, e);
			return !r && typeof n == "function" && (r = !0), n;
		});
		if (r) return () => {
			for (let e = 0; e < i.length; e++) {
				let t = i[e];
				typeof t == "function" ? t() : tt(n[e], null);
			}
		};
	}, []);
}
Ze(nt, "useStableComposedRefs");
function rt(e) {
	return e?.animationName || "none";
}
Ze(rt, "getAnimationName");
function it(e) {
	let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning;
	return n ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, n = t && "isReactWarning" in t && t.isReactWarning, n ? e.props.ref : e.props.ref || e.ref);
}
Ze(it, "getElementRef");
//#endregion
//#region node_modules/@radix-ui/react-id/dist/index.mjs
var at = Object.defineProperty, ot = (e, t) => at(e, "name", {
	value: t,
	configurable: !0
}), st = x.useId || (() => void 0), ct = 0;
function lt(e) {
	let [t, n] = x.useState(st());
	return je(() => {
		e || n((e) => e ?? String(ct++));
	}, [e]), e || (t ? `radix-${t}` : "");
}
ot(lt, "useId");
//#endregion
//#region node_modules/@radix-ui/react-collapsible/dist/index.mjs
var ut = Object.defineProperty, dt = (e, t) => ut(e, "name", {
	value: t,
	configurable: !0
}), ft = "Collapsible", [pt, mt] = /* @__PURE__ */ E(ft), [ht, gt] = pt(ft), _t = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ dt(function(e, t) {
	let { __scopeCollapsible: n, open: r, defaultOpen: i, disabled: a, onOpenChange: o, ...s } = e, [c, l] = Be({
		prop: r,
		defaultProp: i ?? !1,
		onChange: o,
		caller: ft
	});
	return /* @__PURE__ */ (0, S.jsx)(ht, {
		scope: n,
		disabled: a,
		contentId: lt(),
		open: c,
		onOpenToggle: x.useCallback(() => l((e) => !e), [l]),
		children: /* @__PURE__ */ (0, S.jsx)(Je.div, {
			"data-state": Ct(c),
			"data-disabled": a ? "" : void 0,
			...s,
			ref: t
		})
	});
}, "Collapsible")), vt = "CollapsibleTrigger", yt = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ dt(function(e, t) {
	let { __scopeCollapsible: n, ...r } = e, i = gt(vt, n);
	return /* @__PURE__ */ (0, S.jsx)(Je.button, {
		type: "button",
		"aria-controls": i.open ? i.contentId : void 0,
		"aria-expanded": i.open || !1,
		"data-state": Ct(i.open),
		"data-disabled": i.disabled ? "" : void 0,
		disabled: i.disabled,
		...r,
		ref: t,
		onClick: Ee(e.onClick, i.onOpenToggle)
	});
}, "CollapsibleTrigger")), bt = "CollapsibleContent", xt = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ dt(function(e, t) {
	let { forceMount: n, ...r } = e, i = gt(bt, e.__scopeCollapsible);
	return /* @__PURE__ */ (0, S.jsx)($e, {
		present: n || i.open,
		children: ({ present: e }) => /* @__PURE__ */ (0, S.jsx)(St, {
			...r,
			ref: t,
			present: e
		})
	});
}, "CollapsibleContent")), St = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ dt(function(e, t) {
	let { __scopeCollapsible: n, present: r, children: i, ...a } = e, o = gt(bt, n), [s, c] = x.useState(r), l = x.useRef(null), u = M(t, l), d = x.useRef(0), f = d.current, p = x.useRef(0), m = p.current, h = o.open || s, g = x.useRef(h), _ = x.useRef(void 0);
	return x.useEffect(() => {
		let e = requestAnimationFrame(() => g.current = !1);
		return () => cancelAnimationFrame(e);
	}, []), je(() => {
		let e = l.current;
		if (e) {
			_.current = _.current || {
				transitionDuration: e.style.transitionDuration,
				animationName: e.style.animationName
			}, e.style.transitionDuration = "0s", e.style.animationName = "none";
			let t = e.getBoundingClientRect();
			d.current = t.height, p.current = t.width, g.current || (e.style.transitionDuration = _.current.transitionDuration, e.style.animationName = _.current.animationName), c(r);
		}
	}, [o.open, r]), /* @__PURE__ */ (0, S.jsx)(Je.div, {
		"data-state": Ct(o.open),
		"data-disabled": o.disabled ? "" : void 0,
		id: o.contentId,
		hidden: !h,
		...a,
		ref: u,
		style: {
			"--radix-collapsible-content-height": f ? `${f}px` : void 0,
			"--radix-collapsible-content-width": m ? `${m}px` : void 0,
			...e.style
		},
		children: h && i
	});
}, "CollapsibleContentImpl"));
function Ct(e) {
	return e ? "open" : "closed";
}
dt(Ct, "getState");
var wt = _t, Tt = yt, Et = xt, Dt = Object.defineProperty, Ot = (e, t) => Dt(e, "name", {
	value: t,
	configurable: !0
}), kt = x.createContext(void 0);
function At(e) {
	let t = x.useContext(kt);
	return e || t || "ltr";
}
Ot(At, "useDirection");
//#endregion
//#region node_modules/@radix-ui/react-accordion/dist/index.mjs
var jt = Object.defineProperty, Mt = (e, t) => jt(e, "name", {
	value: t,
	configurable: !0
}), Nt = "Accordion", Pt = [
	"Home",
	"End",
	"ArrowDown",
	"ArrowUp",
	"ArrowLeft",
	"ArrowRight"
], [Ft, It, Lt] = /* @__PURE__ */ me(Nt), [Rt, zt] = /* @__PURE__ */ E(Nt, [Lt, mt]), Bt = mt(), Vt = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { type: n, ...r } = e, i = r, a = r;
	return /* @__PURE__ */ (0, S.jsx)(Ft.Provider, {
		scope: e.__scopeAccordion,
		children: n === "multiple" ? /* @__PURE__ */ (0, S.jsx)(R, {
			...a,
			ref: t
		}) : /* @__PURE__ */ (0, S.jsx)(Kt, {
			...i,
			ref: t
		})
	});
}, "Accordion")), [Ht, Ut] = Rt(Nt), [Wt, Gt] = Rt(Nt, { collapsible: !1 }), Kt = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { value: n, defaultValue: r, onValueChange: i = /* @__PURE__ */ Mt(() => {}, "onValueChange"), collapsible: a = !1, ...o } = e, [s, c] = Be({
		prop: n,
		defaultProp: r ?? "",
		onChange: i,
		caller: Nt
	});
	return /* @__PURE__ */ (0, S.jsx)(Ht, {
		scope: e.__scopeAccordion,
		value: x.useMemo(() => s ? [s] : [], [s]),
		onItemOpen: c,
		onItemClose: x.useCallback(() => a && c(""), [a, c]),
		children: /* @__PURE__ */ (0, S.jsx)(Wt, {
			scope: e.__scopeAccordion,
			collapsible: a,
			children: /* @__PURE__ */ (0, S.jsx)(Yt, {
				...o,
				ref: t
			})
		})
	});
}, "AccordionImplSingle")), R = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { value: n, defaultValue: r, onValueChange: i = /* @__PURE__ */ Mt(() => {}, "onValueChange"), ...a } = e, [o, s] = Be({
		prop: n,
		defaultProp: r ?? [],
		onChange: i,
		caller: Nt
	}), c = x.useCallback((e) => s((t = []) => [...t, e]), [s]), l = x.useCallback((e) => s((t = []) => t.filter((t) => t !== e)), [s]);
	return /* @__PURE__ */ (0, S.jsx)(Ht, {
		scope: e.__scopeAccordion,
		value: o,
		onItemOpen: c,
		onItemClose: l,
		children: /* @__PURE__ */ (0, S.jsx)(Wt, {
			scope: e.__scopeAccordion,
			collapsible: !0,
			children: /* @__PURE__ */ (0, S.jsx)(Yt, {
				...a,
				ref: t
			})
		})
	});
}, "AccordionImplMultiple")), [qt, Jt] = Rt(Nt), Yt = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { __scopeAccordion: n, disabled: r, dir: i, orientation: a = "vertical", ...o } = e, s = M(x.useRef(null), t), c = It(n), l = At(i) === "ltr", u = Ee(e.onKeyDown, (e) => {
		if (!Pt.includes(e.key)) return;
		let t = e.target, n = c().filter((e) => !e.ref.current?.disabled), r = n.findIndex((e) => e.ref.current === t), i = n.length;
		if (r === -1) return;
		e.preventDefault();
		let o = r, s = i - 1, u = /* @__PURE__ */ Mt(() => {
			o = r + 1, o > s && (o = 0);
		}, "moveNext"), d = /* @__PURE__ */ Mt(() => {
			o = r - 1, o < 0 && (o = s);
		}, "movePrev");
		switch (e.key) {
			case "Home":
				o = 0;
				break;
			case "End":
				o = s;
				break;
			case "ArrowRight":
				a === "horizontal" && (l ? u() : d());
				break;
			case "ArrowDown":
				a === "vertical" && u();
				break;
			case "ArrowLeft":
				a === "horizontal" && (l ? d() : u());
				break;
			case "ArrowUp": a === "vertical" && d();
		}
		n[o % i].ref.current?.focus();
	});
	return /* @__PURE__ */ (0, S.jsx)(qt, {
		scope: n,
		disabled: r,
		direction: i,
		orientation: a,
		children: /* @__PURE__ */ (0, S.jsx)(Ft.Slot, {
			scope: n,
			children: /* @__PURE__ */ (0, S.jsx)(Je.div, {
				...o,
				"data-orientation": a,
				ref: s,
				onKeyDown: r ? void 0 : u
			})
		})
	});
}, "AccordionImpl")), Xt = "AccordionItem", [Zt, Qt] = Rt(Xt), $t = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { __scopeAccordion: n, value: r, ...i } = e, a = Jt(Xt, n), o = Ut(Xt, n), s = Bt(n), c = lt(), l = r && o.value.includes(r) || !1, u = a.disabled || e.disabled;
	return /* @__PURE__ */ (0, S.jsx)(Zt, {
		scope: n,
		open: l,
		disabled: u,
		triggerId: c,
		children: /* @__PURE__ */ (0, S.jsx)(wt, {
			"data-orientation": a.orientation,
			"data-state": sn(l),
			...s,
			...i,
			ref: t,
			disabled: u,
			open: l,
			onOpenChange: (e) => {
				e ? o.onItemOpen(r) : o.onItemClose(r);
			}
		})
	});
}, "AccordionItem")), en = "AccordionHeader", tn = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { __scopeAccordion: n, ...r } = e, i = Jt(Nt, n), a = Qt(en, n);
	return /* @__PURE__ */ (0, S.jsx)(Je.h3, {
		"data-orientation": i.orientation,
		"data-state": sn(a.open),
		"data-disabled": a.disabled ? "" : void 0,
		...r,
		ref: t
	});
}, "AccordionHeader")), nn = "AccordionTrigger", rn = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { __scopeAccordion: n, ...r } = e, i = Jt(Nt, n), a = Qt(nn, n), o = Gt(nn, n), s = Bt(n);
	return /* @__PURE__ */ (0, S.jsx)(Ft.ItemSlot, {
		scope: n,
		children: /* @__PURE__ */ (0, S.jsx)(Tt, {
			"aria-disabled": a.open && !o.collapsible || void 0,
			"data-orientation": i.orientation,
			id: a.triggerId,
			...s,
			...r,
			ref: t
		})
	});
}, "AccordionTrigger")), an = "AccordionContent", on = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Mt(function(e, t) {
	let { __scopeAccordion: n, ...r } = e, i = Jt(Nt, n), a = Qt(an, n), o = Bt(n);
	return /* @__PURE__ */ (0, S.jsx)(Et, {
		role: "region",
		"aria-labelledby": a.triggerId,
		"data-orientation": i.orientation,
		...o,
		...r,
		ref: t,
		style: {
			"--radix-accordion-content-height": "var(--radix-collapsible-content-height)",
			"--radix-accordion-content-width": "var(--radix-collapsible-content-width)",
			...e.style
		}
	});
}, "AccordionContent"));
function sn(e) {
	return e ? "open" : "closed";
}
Mt(sn, "getState");
var cn = Vt, ln = $t, un = tn, dn = rn, fn = on;
//#endregion
//#region react-ui/components/pfa-card-disclosure.jsx
function pn({ name: e, title: t, icon: n, summary: r, hasExplain: i = !1, compact: a = !1, alwaysOpen: o = !1, defaultOpen: s = !1, bare: c = !1, children: l }) {
	let [u, d] = x.useState(o || s), f = u ? "open" : "closed", p = x.useCallback((e) => {
		o && e !== "open" || d(e === "open");
	}, [o]), m = i ? [typeof t == "string" ? t : "", r].filter(Boolean).join(" - ") : void 0, h = /* @__PURE__ */ (0, S.jsx)(cn, {
		type: "single",
		collapsible: !o,
		value: f,
		onValueChange: p,
		className: "pfa-card-disclosure",
		"data-always-open": o ? "true" : void 0,
		children: /* @__PURE__ */ (0, S.jsxs)(ln, {
			value: "open",
			className: "pfa-card-disclosure-item",
			children: [/* @__PURE__ */ (0, S.jsx)(un, {
				className: "pfa-card-disclosure-header",
				children: /* @__PURE__ */ (0, S.jsxs)(dn, {
					className: "pfa-card-disclosure-trigger",
					"aria-label": m,
					onClick: (e) => {
						o && e.preventDefault();
					},
					onKeyDown: (e) => {
						o && (e.key === "Enter" || e.key === " ") && e.preventDefault();
					},
					children: [
						/* @__PURE__ */ (0, S.jsxs)("span", {
							className: "card-title",
							children: [n, t]
						}),
						r ? /* @__PURE__ */ (0, S.jsx)("span", {
							className: "card-disclosure-note muted small",
							children: r
						}) : null,
						/* @__PURE__ */ (0, S.jsx)("span", {
							className: "pfa-card-disclosure-chevron",
							"aria-hidden": "true"
						})
					]
				})
			}), /* @__PURE__ */ (0, S.jsx)(fn, {
				className: "pfa-card-disclosure-content",
				children: /* @__PURE__ */ (0, S.jsx)("div", {
					className: "disclosure-body",
					children: l
				})
			})]
		})
	});
	return c ? h : /* @__PURE__ */ (0, S.jsx)("section", {
		className: "card card-collapsible" + (a ? " card-compact" : ""),
		id: e || void 0,
		tabIndex: e ? -1 : void 0,
		children: h
	});
}
//#endregion
//#region node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
var mn = Object.defineProperty, hn = (e, t) => mn(e, "name", {
	value: t,
	configurable: !0
});
function gn(e) {
	let t = x.useRef(e);
	return x.useEffect(() => {
		t.current = e;
	}), x.useMemo(() => ((...e) => t.current?.(...e)), []);
}
hn(gn, "useCallbackRef");
//#endregion
//#region node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
var _n = Object.defineProperty, vn = (e, t) => _n(e, "name", {
	value: t,
	configurable: !0
}), yn = "dismissableLayer.update", bn = "dismissableLayer.pointerDownOutside", xn = "dismissableLayer.focusOutside", Sn, Cn = x.createContext({
	layers: /* @__PURE__ */ new Set(),
	layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
	branches: /* @__PURE__ */ new Set(),
	dismissableSurfaces: /* @__PURE__ */ new Set()
}), wn = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ vn(function(e, t) {
	let { disableOutsidePointerEvents: n = !1, deferPointerDownOutside: r = !1, onEscapeKeyDown: i, onPointerDownOutside: a, onFocusOutside: o, onInteractOutside: s, onDismiss: c, ...l } = e, u = x.useContext(Cn), [d, f] = x.useState(null), p = d?.ownerDocument ?? globalThis?.document, [, m] = x.useState({}), h = M(t, f), g = Array.from(u.layers), [_] = [...u.layersWithOutsidePointerEventsDisabled].slice(-1), v = _ ? g.indexOf(_) : -1, y = d ? g.indexOf(d) : -1, b = u.layersWithOutsidePointerEventsDisabled.size > 0, C = y >= v, w = x.useRef(!1), T = Dn((e) => {
		a?.(e), s?.(e), e.defaultPrevented || c?.();
	}, {
		ownerDocument: p,
		deferPointerDownOutside: r,
		isDeferredPointerDownOutsideRef: w,
		dismissableSurfaces: u.dismissableSurfaces,
		shouldHandlePointerDownOutside: x.useCallback((e) => {
			if (!(e instanceof Node)) return !1;
			let t = [...u.branches].some((t) => t.contains(e));
			return C && !t;
		}, [u.branches, C])
	}), E = On((e) => {
		if (r && w.current) return;
		let t = e.target;
		[...u.branches].some((e) => e.contains(t)) || (o?.(e), s?.(e), e.defaultPrevented || c?.());
	}, p), D = d ? y === g.length - 1 : !1, O = gn((e) => {
		e.key === "Escape" && (i?.(e), !e.defaultPrevented && c && (e.preventDefault(), c()));
	});
	return x.useEffect(() => {
		if (D) return p.addEventListener("keydown", O, { capture: !0 }), () => p.removeEventListener("keydown", O, { capture: !0 });
	}, [
		p,
		D,
		O
	]), x.useEffect(() => {
		if (d) return n && (u.layersWithOutsidePointerEventsDisabled.size === 0 && (Sn = p.body.style.pointerEvents, p.body.style.pointerEvents = "none"), u.layersWithOutsidePointerEventsDisabled.add(d)), u.layers.add(d), kn(), () => {
			n && (u.layersWithOutsidePointerEventsDisabled.delete(d), u.layersWithOutsidePointerEventsDisabled.size === 0 && (p.body.style.pointerEvents = Sn));
		};
	}, [
		d,
		p,
		n,
		u
	]), x.useEffect(() => () => {
		d && (u.layers.delete(d), u.layersWithOutsidePointerEventsDisabled.delete(d), kn());
	}, [d, u]), x.useEffect(() => {
		let e = /* @__PURE__ */ vn(() => m({}), "handleUpdate");
		return document.addEventListener(yn, e), () => document.removeEventListener(yn, e);
	}, []), /* @__PURE__ */ (0, S.jsx)(Je.div, {
		...l,
		ref: h,
		style: {
			pointerEvents: b ? C ? "auto" : "none" : void 0,
			...e.style
		},
		onFocusCapture: Ee(e.onFocusCapture, E.onFocusCapture),
		onBlurCapture: Ee(e.onBlurCapture, E.onBlurCapture),
		onPointerDownCapture: Ee(e.onPointerDownCapture, T.onPointerDownCapture)
	});
}, "DismissableLayer"));
function Tn() {
	let e = x.useContext(Cn), [t, n] = x.useState(null);
	return x.useEffect(() => {
		if (t) return e.dismissableSurfaces.add(t), () => {
			e.dismissableSurfaces.delete(t);
		};
	}, [t, e.dismissableSurfaces]), n;
}
vn(Tn, "useDismissableLayerSurface");
var En = /* @__PURE__ */ vn(() => !0, "IS_TRUE");
function Dn(e, t) {
	let { ownerDocument: n = globalThis?.document, deferPointerDownOutside: r = !1, isDeferredPointerDownOutsideRef: i, dismissableSurfaces: a, shouldHandlePointerDownOutside: o = En } = t, s = gn(e), c = x.useRef(!1), l = x.useRef(!1), u = x.useRef(/* @__PURE__ */ new Map()), d = x.useRef(() => {});
	return x.useEffect(() => {
		function e() {
			l.current = !1, i.current = !1, u.current.clear();
		}
		vn(e, "resetOutsideInteraction");
		function t() {
			return Array.from(u.current.values()).some(Boolean);
		}
		vn(t, "isOutsideInteractionIntercepted");
		function f(e) {
			if (!l.current) return;
			let t = e.target;
			t instanceof Node && [...a].some((e) => e.contains(t)) || u.current.set(e.type, !0), e.type === "click" && window.setTimeout(() => {
				l.current && d.current();
			}, 0);
		}
		vn(f, "handleInteractionCapture");
		function p(e) {
			l.current && u.current.set(e.type, !1);
		}
		vn(p, "handleInteractionBubble");
		let m = /* @__PURE__ */ vn((a) => {
			if (a.target && !c.current) {
				let f = function() {
					n.removeEventListener("click", d.current);
					let r = t();
					e(), r || An(bn, s, p, { discrete: !0 });
				};
				if (vn(f, "handleAndDispatchPointerDownOutsideEvent"), !o(a.target)) {
					n.removeEventListener("click", d.current), e(), c.current = !1;
					return;
				}
				let p = { originalEvent: a };
				l.current = !0, i.current = r && a.button === 0, u.current.clear(), !r || a.button !== 0 ? f() : (n.removeEventListener("click", d.current), d.current = f, n.addEventListener("click", d.current, { once: !0 }));
			} else n.removeEventListener("click", d.current), e();
			c.current = !1;
		}, "handlePointerDown"), h = [
			"pointerup",
			"mousedown",
			"mouseup",
			"touchstart",
			"touchend",
			"click"
		];
		for (let e of h) n.addEventListener(e, f, !0), n.addEventListener(e, p);
		let g = window.setTimeout(() => {
			n.addEventListener("pointerdown", m);
		}, 0);
		return () => {
			window.clearTimeout(g), n.removeEventListener("pointerdown", m), n.removeEventListener("click", d.current);
			for (let e of h) n.removeEventListener(e, f, !0), n.removeEventListener(e, p);
		};
	}, [
		n,
		s,
		r,
		i,
		a,
		o
	]), { onPointerDownCapture: /* @__PURE__ */ vn(() => c.current = !0, "onPointerDownCapture") };
}
vn(Dn, "usePointerDownOutside");
function On(e, t = globalThis?.document) {
	let n = gn(e), r = x.useRef(!1);
	return x.useEffect(() => {
		let e = /* @__PURE__ */ vn((e) => {
			e.target && !r.current && An(xn, n, { originalEvent: e }, { discrete: !1 });
		}, "handleFocus");
		return t.addEventListener("focusin", e), () => t.removeEventListener("focusin", e);
	}, [t, n]), {
		onFocusCapture: /* @__PURE__ */ vn(() => r.current = !0, "onFocusCapture"),
		onBlurCapture: /* @__PURE__ */ vn(() => r.current = !1, "onBlurCapture")
	};
}
vn(On, "useFocusOutside");
function kn() {
	let e = new CustomEvent(yn);
	document.dispatchEvent(e);
}
vn(kn, "dispatchUpdate");
function An(e, t, n, { discrete: r }) {
	let i = n.originalEvent.target, a = new CustomEvent(e, {
		bubbles: !1,
		cancelable: !0,
		detail: n
	});
	t && i.addEventListener(e, t, { once: !0 }), r ? Ye(i, a) : i.dispatchEvent(a);
}
vn(An, "handleAndDispatchCustomEvent");
//#endregion
//#region node_modules/@radix-ui/react-focus-guards/dist/index.mjs
var jn = Object.defineProperty, Mn = (e, t) => jn(e, "name", {
	value: t,
	configurable: !0
}), Nn = 0, Pn = null;
function Fn(e) {
	return In(), e.children;
}
Mn(Fn, "FocusGuards");
function In() {
	x.useEffect(() => {
		Pn ||= {
			start: Ln(),
			end: Ln()
		};
		let { start: e, end: t } = Pn;
		return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== t && document.body.insertAdjacentElement("beforeend", t), Nn++, () => {
			Nn === 1 && (Pn?.start.remove(), Pn?.end.remove(), Pn = null), Nn = Math.max(0, Nn - 1);
		};
	}, []);
}
Mn(In, "useFocusGuards");
function Ln() {
	let e = document.createElement("span");
	return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
Mn(Ln, "createFocusGuard");
//#endregion
//#region node_modules/@radix-ui/react-focus-scope/dist/index.mjs
var Rn = Object.defineProperty, zn = (e, t) => Rn(e, "name", {
	value: t,
	configurable: !0
}), Bn = "focusScope.autoFocusOnMount", Vn = "focusScope.autoFocusOnUnmount", Hn = {
	bubbles: !1,
	cancelable: !0
}, Un = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ zn(function(e, t) {
	let { loop: n = !1, trapped: r = !1, onMountAutoFocus: i, onUnmountAutoFocus: a, ...o } = e, [s, c] = x.useState(null), l = gn(i), u = gn(a), d = x.useRef(null), f = M(t, c), p = x.useRef({
		paused: !1,
		pause() {
			this.paused = !0;
		},
		resume() {
			this.paused = !1;
		}
	}).current;
	x.useEffect(() => {
		if (r) {
			let e = function(e) {
				if (p.paused || !s) return;
				let t = e.target;
				s.contains(t) ? d.current = t : Xn(d.current, { select: !0 });
			}, t = function(e) {
				if (p.paused || !s) return;
				let t = e.relatedTarget;
				t !== null && (s.contains(t) || Xn(d.current, { select: !0 }));
			}, n = function(e) {
				if (document.activeElement === document.body) for (let t of e) t.removedNodes.length > 0 && Xn(s);
			};
			zn(e, "handleFocusIn"), zn(t, "handleFocusOut"), zn(n, "handleMutations"), document.addEventListener("focusin", e), document.addEventListener("focusout", t);
			let r = new MutationObserver(n);
			return s && r.observe(s, {
				childList: !0,
				subtree: !0
			}), () => {
				document.removeEventListener("focusin", e), document.removeEventListener("focusout", t), r.disconnect();
			};
		}
	}, [
		r,
		s,
		p.paused
	]), x.useEffect(() => {
		if (s) {
			Zn.add(p);
			let e = document.activeElement;
			if (!s.contains(e)) {
				let t = new CustomEvent(Bn, Hn);
				s.addEventListener(Bn, l), s.dispatchEvent(t), t.defaultPrevented || (Wn(er(Kn(s)), { select: !0 }), document.activeElement === e && Xn(s));
			}
			return () => {
				s.removeEventListener(Bn, l), setTimeout(() => {
					let t = new CustomEvent(Vn, Hn);
					s.addEventListener(Vn, u), s.dispatchEvent(t), t.defaultPrevented || Xn(e ?? document.body, { select: !0 }), s.removeEventListener(Vn, u), Zn.remove(p);
				}, 0);
			};
		}
	}, [
		s,
		l,
		u,
		p
	]);
	let m = x.useCallback((e) => {
		if (!n && !r || p.paused) return;
		let t = e.key === "Tab" && !e.altKey && !e.ctrlKey && !e.metaKey, i = document.activeElement;
		if (t && i) {
			let t = e.currentTarget, [r, a] = Gn(t);
			r && a ? !e.shiftKey && i === a ? (e.preventDefault(), n && Xn(r, { select: !0 })) : e.shiftKey && i === r && (e.preventDefault(), n && Xn(a, { select: !0 })) : i === t && e.preventDefault();
		}
	}, [
		n,
		r,
		p.paused
	]);
	return /* @__PURE__ */ (0, S.jsx)(Je.div, {
		tabIndex: -1,
		...o,
		ref: f,
		onKeyDown: m
	});
}, "FocusScope"));
function Wn(e, { select: t = !1 } = {}) {
	let n = document.activeElement;
	for (let r of e) if (Xn(r, { select: t }), document.activeElement !== n) return;
}
zn(Wn, "focusFirst");
function Gn(e) {
	let t = Kn(e);
	return [qn(t, e), qn(t.reverse(), e)];
}
zn(Gn, "getTabbableEdges");
function Kn(e) {
	let t = [], n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, { acceptNode: /* @__PURE__ */ zn((e) => {
		let t = e.tagName === "INPUT" && e.type === "hidden";
		return e.disabled || e.hidden || t ? NodeFilter.FILTER_SKIP : e.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	}, "acceptNode") });
	for (; n.nextNode();) t.push(n.currentNode);
	return t;
}
zn(Kn, "getTabbableCandidates");
function qn(e, t) {
	let n = typeof t.checkVisibility == "function" && t.checkVisibility({ checkVisibilityCSS: !0 });
	for (let r of e) if (!(n ? !r.checkVisibility({ checkVisibilityCSS: !0 }) : Jn(r, { upTo: t }))) return r;
}
zn(qn, "findVisible");
function Jn(e, { upTo: t }) {
	if (getComputedStyle(e).visibility === "hidden") return !0;
	for (; e;) {
		if (t !== void 0 && e === t) return !1;
		if (getComputedStyle(e).display === "none") return !0;
		e = e.parentElement;
	}
	return !1;
}
zn(Jn, "isHidden");
function Yn(e) {
	return e instanceof HTMLInputElement && "select" in e;
}
zn(Yn, "isSelectableInput");
function Xn(e, { select: t = !1 } = {}) {
	if (e && e.focus) {
		let n = document.activeElement;
		e.focus({ preventScroll: !0 }), e !== n && Yn(e) && t && e.select();
	}
}
zn(Xn, "focus");
var Zn = Qn();
function Qn() {
	let e = [];
	return {
		add(t) {
			let n = e[0];
			t !== n && n?.pause(), e = $n(e, t), e.unshift(t);
		},
		remove(t) {
			e = $n(e, t), e[0]?.resume();
		}
	};
}
zn(Qn, "createFocusScopesStack");
function $n(e, t) {
	let n = [...e], r = n.indexOf(t);
	return r !== -1 && n.splice(r, 1), n;
}
zn($n, "arrayRemove");
function er(e) {
	return e.filter((e) => e.tagName !== "A");
}
zn(er, "removeLinks");
//#endregion
//#region node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var tr = [
	"top",
	"right",
	"bottom",
	"left"
], nr = Math.min, rr = Math.max, ir = Math.round, ar = Math.floor, or = (e) => ({
	x: e,
	y: e
}), sr = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function cr(e, t, n) {
	return rr(e, nr(t, n));
}
function lr(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function ur(e) {
	return e.split("-")[0];
}
function dr(e) {
	return e.split("-")[1];
}
function fr(e) {
	return e === "x" ? "y" : "x";
}
function pr(e) {
	return e === "y" ? "height" : "width";
}
function mr(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function hr(e) {
	return fr(mr(e));
}
function gr(e, t, n) {
	n === void 0 && (n = !1);
	let r = dr(e), i = hr(e), a = pr(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = Tr(o)), [o, Tr(o)];
}
function _r(e) {
	let t = Tr(e);
	return [
		vr(e),
		t,
		vr(t)
	];
}
function vr(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var yr = ["left", "right"], br = ["right", "left"], xr = ["top", "bottom"], Sr = ["bottom", "top"];
function Cr(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? br : yr : t ? yr : br;
		case "left":
		case "right": return t ? xr : Sr;
		default: return [];
	}
}
function wr(e, t, n, r) {
	let i = dr(e), a = Cr(ur(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(vr)))), a;
}
function Tr(e) {
	let t = ur(e);
	return sr[t] + e.slice(t.length);
}
function Er(e) {
	return {
		top: e.top ?? 0,
		right: e.right ?? 0,
		bottom: e.bottom ?? 0,
		left: e.left ?? 0
	};
}
function Dr(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : Er(e);
}
function Or(e) {
	let { x: t, y: n, width: r, height: i } = e;
	return {
		width: r,
		height: i,
		top: n,
		left: t,
		right: t + r,
		bottom: n + i,
		x: t,
		y: n
	};
}
//#endregion
//#region node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function kr(e, t, n) {
	let { reference: r, floating: i } = e, a = mr(t), o = hr(t), s = pr(o), c = ur(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
	switch (c) {
		case "top":
			p = {
				x: u,
				y: r.y - i.height
			};
			break;
		case "bottom":
			p = {
				x: u,
				y: r.y + r.height
			};
			break;
		case "right":
			p = {
				x: r.x + r.width,
				y: d
			};
			break;
		case "left":
			p = {
				x: r.x - i.width,
				y: d
			};
			break;
		default: p = {
			x: r.x,
			y: r.y
		};
	}
	let m = dr(t);
	return m && (p[o] += f * (m === "end" ? 1 : -1) * (n && l ? -1 : 1)), p;
}
async function Ar(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = lr(t, e), p = Dr(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = Or(await i.getClippingRect({
		element: await (i.isElement == null ? void 0 : i.isElement(m)) ?? !0 ? m : m.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating)),
		boundary: c,
		rootBoundary: l,
		strategy: s
	})), g = u === "floating" ? {
		x: n,
		y: r,
		width: a.floating.width,
		height: a.floating.height
	} : a.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)), v = await (i.isElement == null ? void 0 : i.isElement(_)) && await (i.getScale == null ? void 0 : i.getScale(_)) || {
		x: 1,
		y: 1
	}, y = Or(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements: o,
		rect: g,
		offsetParent: _,
		strategy: s
	}) : g);
	return {
		top: (h.top - y.top + p.top) / v.y,
		bottom: (y.bottom - h.bottom + p.bottom) / v.y,
		left: (h.left - y.left + p.left) / v.x,
		right: (y.right - h.right + p.right) / v.x
	};
}
var jr = 50, Mr = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: Ar
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = kr(l, r, c), f = r, p = 0, m = {};
	for (let n = 0; n < a.length; n++) {
		let h = a[n];
		if (!h) continue;
		let { name: g, fn: _ } = h, { x: v, y, data: b, reset: x } = await _({
			x: u,
			y: d,
			initialPlacement: r,
			placement: f,
			strategy: i,
			middlewareData: m,
			rects: l,
			platform: s,
			elements: {
				reference: e,
				floating: t
			}
		});
		u = v ?? u, d = y ?? d, m[g] = {
			...m[g],
			...b
		}, x && p < jr && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = kr(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, Nr = (e) => ({
	name: "arrow",
	options: e,
	async fn(t) {
		let { x: n, y: r, placement: i, rects: a, platform: o, elements: s, middlewareData: c } = t, { element: l, padding: u = 0 } = lr(e, t) || {};
		if (l == null) return {};
		let d = Dr(u), f = {
			x: n,
			y: r
		}, p = hr(i), m = pr(p), h = await o.getDimensions(l), g = p === "y", _ = g ? "top" : "left", v = g ? "bottom" : "right", y = g ? "clientHeight" : "clientWidth", b = a.reference[m] + a.reference[p] - f[p] - a.floating[m], x = f[p] - a.reference[p], S = await (o.getOffsetParent == null ? void 0 : o.getOffsetParent(l)), C = S ? S[y] : 0;
		(!C || !await (o.isElement == null ? void 0 : o.isElement(S))) && (C = s.floating[y] || a.floating[m]);
		let w = b / 2 - x / 2, T = C / 2 - h[m] / 2 - 1, E = nr(d[_], T), D = nr(d[v], T), O = C - h[m] - D, k = C / 2 - h[m] / 2 + w, A = cr(E, k, O), j = !c.arrow && dr(i) != null && k !== A && a.reference[m] / 2 - (k < E ? E : D) - h[m] / 2 < 0, M = j ? k < E ? k - E : k - O : 0;
		return {
			[p]: f[p] + M,
			data: {
				[p]: A,
				centerOffset: k - A - M,
				...j && { alignmentOffset: M }
			},
			reset: j
		};
	}
}), Pr = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = lr(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = ur(r), _ = mr(o), v = ur(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [Tr(o)] : _r(o)), x = p !== "none";
			!d && x && b.push(...wr(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = gr(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (u !== "alignment" || _ === mr(t) || T.every((e) => mr(e.placement) !== _ || e.overflows[0] > 0))) return {
					data: {
						index: e,
						overflows: T
					},
					reset: { placement: t }
				};
				let n = T.filter((e) => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]?.placement;
				if (!n) switch (f) {
					case "bestFit": {
						let e = T.filter((e) => {
							if (x) {
								let t = mr(e.placement);
								return t === _ || t === "y";
							}
							return !0;
						}).map((e) => [e.placement, e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]?.[0];
						e && (n = e);
						break;
					}
					case "initialPlacement": n = o;
				}
				if (r !== n) return { reset: { placement: n } };
			}
			return {};
		}
	};
};
function Fr(e, t) {
	return {
		top: e.top - t.height,
		right: e.right - t.width,
		bottom: e.bottom - t.height,
		left: e.left - t.width
	};
}
function Ir(e) {
	return tr.some((t) => e[t] >= 0);
}
var Lr = function(e) {
	return e === void 0 && (e = {}), {
		name: "hide",
		options: e,
		async fn(t) {
			let { rects: n, platform: r } = t, { strategy: i = "referenceHidden", ...a } = lr(e, t);
			switch (i) {
				case "referenceHidden": {
					let e = Fr(await r.detectOverflow(t, {
						...a,
						elementContext: "reference"
					}), n.reference);
					return { data: {
						referenceHiddenOffsets: e,
						referenceHidden: Ir(e)
					} };
				}
				case "escaped": {
					let e = Fr(await r.detectOverflow(t, {
						...a,
						altBoundary: !0
					}), n.floating);
					return { data: {
						escapedOffsets: e,
						escaped: Ir(e)
					} };
				}
				default: return {};
			}
		}
	};
}, Rr = /*#__PURE__*/ new Set(["left", "top"]);
async function zr(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = ur(n), s = dr(n), c = mr(n) === "y", l = Rr.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = lr(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
		mainAxis: d,
		crossAxis: 0,
		alignmentAxis: null
	} : {
		mainAxis: d.mainAxis || 0,
		crossAxis: d.crossAxis || 0,
		alignmentAxis: d.alignmentAxis
	};
	return s && typeof m == "number" && (p = s === "end" ? m * -1 : m), c ? {
		x: p * u,
		y: f * l
	} : {
		x: f * l,
		y: p * u
	};
}
var Br = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await zr(t, e);
			return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset ? {} : {
				x: r + s.x,
				y: i + s.y,
				data: {
					...s,
					placement: a
				}
			};
		}
	};
}, Vr = function(e) {
	return e === void 0 && (e = {}), {
		name: "shift",
		options: e,
		async fn(t) {
			let { x: n, y: r, placement: i, platform: a } = t, { mainAxis: o = !0, crossAxis: s = !1, limiter: c = { fn: (e) => {
				let { x: t, y: n } = e;
				return {
					x: t,
					y: n
				};
			} }, ...l } = lr(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = mr(i), p = fr(f), m = u[p], h = u[f], g = (e, t) => cr(t + d[e === "y" ? "top" : "left"], t, t - d[e === "y" ? "bottom" : "right"]);
			o && (m = g(p, m)), s && (h = g(f, h));
			let _ = c.fn({
				...t,
				[p]: m,
				[f]: h
			});
			return {
				..._,
				data: {
					x: _.x - n,
					y: _.y - r,
					enabled: {
						[p]: o,
						[f]: s
					}
				}
			};
		}
	};
}, Hr = function(e) {
	return e === void 0 && (e = {}), {
		options: e,
		fn(t) {
			let { x: n, y: r, placement: i, rects: a, middlewareData: o } = t, { offset: s = 0, mainAxis: c = !0, crossAxis: l = !0 } = lr(e, t), u = {
				x: n,
				y: r
			}, d = mr(i), f = fr(d), p = u[f], m = u[d], h = lr(s, t), g = typeof h == "number" ? {
				mainAxis: h,
				crossAxis: 0
			} : {
				mainAxis: h.mainAxis ?? 0,
				crossAxis: h.crossAxis ?? 0
			};
			if (c) {
				let e = f === "y" ? "height" : "width", t = a.reference[f] - a.floating[e] + g.mainAxis, n = a.reference[f] + a.reference[e] - g.mainAxis;
				p < t ? p = t : p > n && (p = n);
			}
			if (l) {
				let e = f === "y" ? "width" : "height", t = Rr.has(ur(i)), n = a.reference[d] - a.floating[e] + (t && o.offset?.[d] || 0) + (t ? 0 : g.crossAxis), r = a.reference[d] + a.reference[e] + (t ? 0 : o.offset?.[d] || 0) - (t ? g.crossAxis : 0);
				m < n ? m = n : m > r && (m = r);
			}
			return {
				[f]: p,
				[d]: m
			};
		}
	};
}, Ur = function(e) {
	return e === void 0 && (e = {}), {
		name: "size",
		options: e,
		async fn(t) {
			let { placement: n, rects: r, platform: i, elements: a } = t, { apply: o = () => {}, ...s } = lr(e, t), c = await i.detectOverflow(t, s), l = ur(n), u = dr(n), d = mr(n) === "y", { width: f, height: p } = r.floating, m, h;
			l === "top" || l === "bottom" ? (m = l, h = u === (await (i.isRTL == null ? void 0 : i.isRTL(a.floating)) ? "start" : "end") ? "left" : "right") : (h = l, m = u === "end" ? "top" : "bottom");
			let g = p - c.top - c.bottom, _ = f - c.left - c.right, v = nr(p - c[m], g), y = nr(f - c[h], _), b = t.middlewareData.shift, x = !b, S = v, C = y;
			b != null && b.enabled.x && (C = _), b != null && b.enabled.y && (S = g), x && !u && (d ? C = f - 2 * rr(c.left, c.right) : S = p - 2 * rr(c.top, c.bottom)), await o({
				...t,
				availableWidth: C,
				availableHeight: S
			});
			let w = await i.getDimensions(a.floating);
			return f !== w.width || p !== w.height ? { reset: { rects: !0 } } : {};
		}
	};
};
//#endregion
//#region node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function Wr() {
	return typeof window < "u";
}
function Gr(e) {
	return Jr(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Kr(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function qr(e) {
	return ((Jr(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function Jr(e) {
	return Wr() ? e instanceof Node || e instanceof Kr(e).Node : !1;
}
function Yr(e) {
	return Wr() ? e instanceof Element || e instanceof Kr(e).Element : !1;
}
function Xr(e) {
	return Wr() ? e instanceof HTMLElement || e instanceof Kr(e).HTMLElement : !1;
}
function Zr(e) {
	return !Wr() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Kr(e).ShadowRoot;
}
function Qr(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = li(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function $r(e) {
	return /^(table|td|th)$/.test(Gr(e));
}
function ei(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var ti = /transform|translate|scale|rotate|perspective|filter/, ni = /paint|layout|strict|content/, ri = (e) => !!e && e !== "none", ii;
function ai(e) {
	let t = Yr(e) ? li(e) : e;
	return ri(t.transform) || ri(t.translate) || ri(t.scale) || ri(t.rotate) || ri(t.perspective) || !si() && (ri(t.backdropFilter) || ri(t.filter)) || ti.test(t.willChange || "") || ni.test(t.contain || "");
}
function oi(e) {
	let t = di(e);
	for (; Xr(t) && !ci(t);) {
		if (ai(t)) return t;
		if (ei(t)) return null;
		t = di(t);
	}
	return null;
}
function si() {
	return ii ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), ii;
}
function ci(e) {
	return /^(html|body|#document)$/.test(Gr(e));
}
function li(e) {
	return Kr(e).getComputedStyle(e);
}
function ui(e) {
	return Yr(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function di(e) {
	if (Gr(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || Zr(e) && e.host || qr(e);
	return Zr(t) ? t.host : t;
}
function fi(e) {
	let t = di(e);
	return ci(t) ? (e.ownerDocument || e).body : Xr(t) && Qr(t) ? t : fi(t);
}
function pi(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = fi(e), i = r === e.ownerDocument?.body, a = Kr(r);
	if (i) {
		let e = mi(a);
		return t.concat(a, a.visualViewport || [], Qr(r) ? r : [], e && n ? pi(e) : []);
	}
	return t.concat(r, pi(r, [], n));
}
function mi(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function hi(e) {
	let t = li(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = Xr(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = ir(n) !== a || ir(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function gi(e) {
	return Yr(e) ? e : e.contextElement;
}
function _i(e) {
	let t = gi(e);
	if (!Xr(t)) return or(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = hi(t), o = (a ? ir(n.width) : n.width) / r, s = (a ? ir(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var vi = /*#__PURE__*/ or(0);
function yi(e) {
	let t = Kr(e);
	return !si() || !t.visualViewport ? vi : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function bi(e, t, n) {
	return t === void 0 && (t = !1), !!n && t && n === Kr(e);
}
function xi(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = gi(e), o = or(1);
	t && (r ? Yr(r) && (o = _i(r)) : o = _i(e));
	let s = bi(a, n, r) ? yi(a) : or(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a && r) {
		let e = Kr(a), t = Yr(r) ? Kr(r) : r, n = e, i = mi(n);
		for (; i && t !== n;) {
			let e = _i(i), t = i.getBoundingClientRect(), r = li(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = Kr(i), i = mi(n);
		}
	}
	return Or({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function Si(e, t) {
	let n = ui(e).scrollLeft;
	return t ? t.left + n : xi(qr(e)).left + n;
}
function Ci(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - Si(e, n),
		y: n.top + t.scrollTop
	};
}
function wi(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = qr(r), s = t ? ei(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = or(1), u = or(0), d = Xr(r);
	if ((d || !a) && ((Gr(r) !== "body" || Qr(o)) && (c = ui(r)), d)) {
		let e = xi(r);
		l = _i(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? Ci(o, c) : or(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function Ti(e) {
	return e.getClientRects ? Array.from(e.getClientRects()) : [];
}
function Ei(e) {
	let t = ui(e), n = e.ownerDocument.body, r = rr(e.scrollWidth, e.clientWidth, n.scrollWidth, n.clientWidth), i = rr(e.scrollHeight, e.clientHeight, n.scrollHeight, n.clientHeight), a = -t.scrollLeft + Si(e), o = -t.scrollTop;
	return li(n).direction === "rtl" && (a += rr(e.clientWidth, n.clientWidth) - r), {
		width: r,
		height: i,
		x: a,
		y: o
	};
}
var Di = 25;
function Oi(e, t, n) {
	n === void 0 && (n = "viewport");
	let r = n === "layoutViewport", i = Kr(e), a = qr(e), o = i.visualViewport, s = a.clientWidth, c = a.clientHeight, l = 0, u = 0;
	if (o) {
		let e = !si() || t === "fixed";
		r ? e || (l = -o.offsetLeft, u = -o.offsetTop) : (s = o.width, c = o.height, e && (l = o.offsetLeft, u = o.offsetTop));
	}
	if (Si(a) <= 0) {
		let e = a.ownerDocument, t = e.body, n = getComputedStyle(t), r = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, i = Math.abs(a.clientWidth - t.clientWidth - r), o = getComputedStyle(a).scrollbarGutter === "stable both-edges" ? i / 2 : i;
		o <= Di && (s -= o);
	}
	return {
		width: s,
		height: c,
		x: l,
		y: u
	};
}
function ki(e, t) {
	let n = xi(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = _i(e);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function Ai(e, t, n) {
	let r;
	if (t === "viewport" || t === "layoutViewport") r = Oi(e, n, t);
	else if (t === "document") r = Ei(qr(e));
	else if (Yr(t)) r = ki(t, n);
	else {
		let n = yi(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return Or(r);
}
function ji(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = pi(e, [], !1).filter((e) => Yr(e) && Gr(e) !== "body"), i = null, a = li(e).position === "fixed", o = a ? di(e) : e;
	for (; Yr(o) && !ci(o);) {
		let e = li(o), t = ai(o), n = i ? i.position : a ? "fixed" : "";
		!t && (n === "fixed" || n === "absolute" && e.position === "static") ? r = r.filter((e) => e !== o) : i = e, o = di(o);
	}
	return t.set(e, r), r;
}
function Mi(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? ei(t) ? [] : ji(t, this._c) : [].concat(n), r], o = Ai(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = Ai(t, a[e], i);
		s = rr(n.top, s), c = nr(n.right, c), l = nr(n.bottom, l), u = rr(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function Ni(e) {
	let { width: t, height: n } = hi(e);
	return {
		width: t,
		height: n
	};
}
function Pi(e, t, n) {
	let r = Xr(t), i = qr(t), a = n === "fixed", o = xi(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = or(0);
	if ((r || !a) && ((Gr(t) !== "body" || Qr(i)) && (s = ui(t)), r)) {
		let e = xi(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	}
	!r && i && (c.x = Si(i));
	let l = i && !r && !a ? Ci(i, s) : or(0);
	return {
		x: o.left + s.scrollLeft - c.x - l.x,
		y: o.top + s.scrollTop - c.y - l.y,
		width: o.width,
		height: o.height
	};
}
function Fi(e) {
	return li(e).position === "static";
}
function Ii(e, t) {
	if (!Xr(e) || li(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return qr(e) === n && (n = n.ownerDocument.body), n;
}
function Li(e, t) {
	let n = Kr(e);
	if (ei(e)) return n;
	if (!Xr(e)) {
		let t = di(e);
		for (; t && !ci(t);) {
			if (Yr(t) && !Fi(t)) return t;
			t = di(t);
		}
		return n;
	}
	let r = Ii(e, t);
	for (; r && $r(r) && Fi(r);) r = Ii(r, t);
	return r && ci(r) && Fi(r) && !ai(r) ? n : r || oi(e) || n;
}
var Ri = async function(e) {
	let t = this.getOffsetParent || Li, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: Pi(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function zi(e) {
	return li(e).direction === "rtl";
}
var Bi = {
	convertOffsetParentRelativeRectToViewportRelativeRect: wi,
	getDocumentElement: qr,
	getClippingRect: Mi,
	getOffsetParent: Li,
	getElementRects: Ri,
	getClientRects: Ti,
	getDimensions: Ni,
	getScale: _i,
	isElement: Yr,
	isRTL: zi
};
function Vi(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Hi(e, t, n) {
	let r = null, i, a = qr(e);
	function o() {
		var e;
		clearTimeout(i), (e = r) == null || e.disconnect(), r = null;
	}
	function s(n, c) {
		n === void 0 && (n = !1), c === void 0 && (c = 1), o();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (n || t(), !f || !p) return;
		let m = ar(d), h = ar(a.clientWidth - (u + f)), g = ar(a.clientHeight - (d + p)), _ = ar(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: rr(0, nr(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (!Vi(l, e.getBoundingClientRect())) return s();
			if (n !== c) {
				if (!y) return s();
				n ? s(!1, n) : i = setTimeout(() => {
					s(!1, 1e-7);
				}, 1e3);
			}
			y = !1;
		}
		try {
			r = new IntersectionObserver(b, {
				...v,
				root: a.ownerDocument
			});
		} catch {
			r = new IntersectionObserver(b, v);
		}
		r.observe(e);
	}
	let c = Kr(e), l = () => s(n);
	return c.addEventListener("resize", l), s(!0), () => {
		c.removeEventListener("resize", l), o();
	};
}
function Ui(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = gi(e), u = i || a ? [...l ? pi(l) : [], ...t ? pi(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n), a && e.addEventListener("resize", n);
	});
	let d = l && s ? Hi(l, n, a) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? xi(e) : null;
	c && g();
	function g() {
		let t = xi(e);
		h && !Vi(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var Wi = Br, Gi = Vr, Ki = Pr, qi = Ur, Ji = Lr, Yi = Nr, Xi = Hr, Zi = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = n ?? {}, a = {
		...Bi,
		...i.platform,
		_c: r
	};
	return Mr(e, t, {
		...i,
		platform: a
	});
}, Qi = typeof document < "u" ? x.useLayoutEffect : function() {};
function $i(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (typeof e == "function" && e.toString() === t.toString()) return !0;
	let n, r, i;
	if (e && t && typeof e == "object") {
		if (Array.isArray(e)) {
			if (n = e.length, n !== t.length) return !1;
			for (r = n; r-- !== 0;) if (!$i(e[r], t[r])) return !1;
			return !0;
		}
		if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
		for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
		for (r = n; r-- !== 0;) {
			let n = i[r];
			if (!(n === "_owner" && e.$$typeof) && !$i(e[n], t[n])) return !1;
		}
		return !0;
	}
	return e !== e && t !== t;
}
function ea(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function ta(e, t) {
	let n = ea(e);
	return Math.round(t * n) / n;
}
function na(e) {
	let t = x.useRef(e);
	return Qi(() => {
		t.current = e;
	}), t;
}
function ra(e) {
	e === void 0 && (e = {});
	let { placement: t = "bottom", strategy: n = "absolute", middleware: r = [], platform: i, elements: { reference: a, floating: o } = {}, transform: s = !0, whileElementsMounted: c, open: l } = e, [u, d] = x.useState({
		x: 0,
		y: 0,
		strategy: n,
		placement: t,
		middlewareData: {},
		isPositioned: !1
	}), [f, p] = x.useState(r);
	$i(f, r) || p(r);
	let [m, h] = x.useState(null), [g, _] = x.useState(null), v = x.useCallback((e) => {
		e !== C.current && (C.current = e, h(e));
	}, []), y = x.useCallback((e) => {
		e !== w.current && (w.current = e, _(e));
	}, []), b = a || m, S = o || g, C = x.useRef(null), w = x.useRef(null), T = x.useRef(u), E = c != null, D = na(c), O = na(i), k = na(l), A = x.useCallback(() => {
		if (!C.current || !w.current) return;
		let e = {
			placement: t,
			strategy: n,
			middleware: f
		};
		O.current && (e.platform = O.current), Zi(C.current, w.current, e).then((e) => {
			let t = {
				...e,
				isPositioned: k.current !== !1
			};
			j.current && !$i(T.current, t) && (T.current = t, Ge.flushSync(() => {
				d(t);
			}));
		});
	}, [
		f,
		t,
		n,
		O,
		k
	]);
	Qi(() => {
		l === !1 && T.current.isPositioned && (T.current.isPositioned = !1, d((e) => ({
			...e,
			isPositioned: !1
		})));
	}, [l]);
	let j = x.useRef(!1);
	Qi(() => (j.current = !0, () => {
		j.current = !1;
	}), []), Qi(() => {
		if (b && (C.current = b), S && (w.current = S), b && S) {
			if (D.current) return D.current(b, S, A);
			A();
		}
	}, [
		b,
		S,
		A,
		D,
		E
	]);
	let M = x.useMemo(() => ({
		reference: C,
		floating: w,
		setReference: v,
		setFloating: y
	}), [v, y]), N = x.useMemo(() => ({
		reference: b,
		floating: S
	}), [b, S]), ee = x.useMemo(() => {
		let e = {
			position: n,
			left: 0,
			top: 0
		};
		if (!N.floating) return e;
		let t = ta(N.floating, u.x), r = ta(N.floating, u.y);
		return s ? {
			...e,
			transform: "translate(" + t + "px, " + r + "px)",
			...ea(N.floating) >= 1.5 && { willChange: "transform" }
		} : {
			position: n,
			left: t,
			top: r
		};
	}, [
		n,
		s,
		N.floating,
		u.x,
		u.y
	]);
	return x.useMemo(() => ({
		...u,
		update: A,
		refs: M,
		elements: N,
		floatingStyles: ee
	}), [
		u,
		A,
		M,
		N,
		ee
	]);
}
var ia = (e) => {
	function t(e) {
		return {}.hasOwnProperty.call(e, "current");
	}
	return {
		name: "arrow",
		options: e,
		fn(n) {
			let { element: r, padding: i } = typeof e == "function" ? e(n) : e;
			return r && t(r) ? r.current == null ? {} : Yi({
				element: r.current,
				padding: i
			}).fn(n) : r ? Yi({
				element: r,
				padding: i
			}).fn(n) : {};
		}
	};
}, aa = (e, t) => {
	let n = Wi(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, z = (e, t) => {
	let n = Gi(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, oa = (e, t) => ({
	fn: Xi(e).fn,
	options: [e, t]
}), sa = (e, t) => {
	let n = Ki(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, ca = (e, t) => {
	let n = qi(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, la = (e, t) => {
	let n = Ji(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, ua = (e, t) => {
	let n = ia(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, da = Object.defineProperty, fa = (e, t) => da(e, "name", {
	value: t,
	configurable: !0
});
function pa(e) {
	let [t, n] = x.useState(void 0);
	return je(() => {
		if (e) {
			n({
				width: e.offsetWidth,
				height: e.offsetHeight
			});
			let t = new ResizeObserver((t) => {
				if (!Array.isArray(t) || !t.length) return;
				let r = t[0], i, a;
				if ("borderBoxSize" in r) {
					let e = r.borderBoxSize, t = Array.isArray(e) ? e[0] : e;
					i = t.inlineSize, a = t.blockSize;
				} else i = e.offsetWidth, a = e.offsetHeight;
				n({
					width: i,
					height: a
				});
			});
			return t.observe(e, { box: "border-box" }), () => t.unobserve(e);
		}
		n(void 0);
	}, [e]), t;
}
fa(pa, "useSize");
//#endregion
//#region node_modules/@radix-ui/react-popper/dist/index.mjs
var ma = Object.defineProperty, ha = (e, t) => ma(e, "name", {
	value: t,
	configurable: !0
}), ga = "Popper", [_a, va] = /* @__PURE__ */ E(ga), [ya, ba] = _a(ga), xa = /* @__PURE__ */ ha((e) => {
	let { __scopePopper: t, children: n } = e, [r, i] = x.useState(null), [a, o] = x.useState(void 0);
	return /* @__PURE__ */ (0, S.jsx)(ya, {
		scope: t,
		anchor: r,
		onAnchorChange: i,
		placementState: a,
		setPlacementState: o,
		children: n
	});
}, "Popper"), Sa = "PopperAnchor", Ca = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ ha(function(e, t) {
	let { __scopePopper: n, virtualRef: r, ...i } = e, a = ba(Sa, n), o = x.useRef(null), s = a.onAnchorChange, c = M(t, x.useCallback((e) => {
		o.current = e, e && s(e);
	}, [s])), l = x.useRef(null);
	x.useEffect(() => {
		if (!r) return;
		let e = l.current;
		l.current = r.current, e !== l.current && s(l.current);
	});
	let u = a.placementState && Aa(a.placementState), d = u?.[0], f = u?.[1];
	return r ? null : /* @__PURE__ */ (0, S.jsx)(Je.div, {
		"data-radix-popper-side": d,
		"data-radix-popper-align": f,
		...i,
		ref: c
	});
}, "PopperAnchor")), wa = "PopperContent", [Ta, Ea] = _a(wa), Da = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ ha(function(e, t) {
	let { __scopePopper: n, side: r = "bottom", sideOffset: i = 0, align: a = "center", alignOffset: o = 0, arrowPadding: s = 0, avoidCollisions: c = !0, collisionBoundary: l = [], collisionPadding: u = 0, sticky: d = "partial", hideWhenDetached: f = !1, updatePositionStrategy: p = "optimized", onPlaced: m, ...h } = e, g = ba(wa, n), [_, v] = x.useState(null), y = M(t, v), [b, C] = x.useState(null), w = pa(b), T = w?.width ?? 0, E = w?.height ?? 0, D = r + (a === "center" ? "" : "-" + a), O = typeof u == "number" ? u : {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...u
	}, k = Array.isArray(l) ? l : [l], A = k.length > 0, j = {
		padding: O,
		boundary: k.filter(Oa),
		altBoundary: A
	}, { refs: N, floatingStyles: ee, placement: P, isPositioned: F, middlewareData: te } = ra({
		strategy: "fixed",
		placement: D,
		whileElementsMounted: /* @__PURE__ */ ha((...e) => Ui(...e, { animationFrame: p === "always" }), "whileElementsMounted"),
		elements: { reference: g.anchor },
		middleware: [
			aa({
				mainAxis: i + E,
				alignmentAxis: o
			}),
			c && z({
				mainAxis: !0,
				crossAxis: !1,
				limiter: d === "partial" ? oa() : void 0,
				...j
			}),
			c && sa({ ...j }),
			ca({
				...j,
				apply: /* @__PURE__ */ ha(({ elements: e, rects: t, availableWidth: n, availableHeight: r }) => {
					let { width: i, height: a } = t.reference, o = e.floating.style;
					o.setProperty("--radix-popper-available-width", `${n}px`), o.setProperty("--radix-popper-available-height", `${r}px`), o.setProperty("--radix-popper-anchor-width", `${i}px`), o.setProperty("--radix-popper-anchor-height", `${a}px`);
				}, "apply")
			}),
			b && ua({
				element: b,
				padding: s
			}),
			ka({
				arrowWidth: T,
				arrowHeight: E
			}),
			f && la({
				strategy: "referenceHidden",
				...j,
				boundary: A ? j.boundary : void 0
			})
		]
	}), ne = g.setPlacementState;
	je(() => (ne(P), () => {
		ne(void 0);
	}), [P, ne]);
	let [re, ie] = Aa(P), ae = gn(m);
	je(() => {
		F && ae?.();
	}, [F, ae]);
	let oe = te.arrow?.x, se = te.arrow?.y, ce = te.arrow?.centerOffset !== 0, [le, ue] = x.useState();
	return je(() => {
		_ && ue(window.getComputedStyle(_).zIndex);
	}, [_]), /* @__PURE__ */ (0, S.jsx)("div", {
		ref: N.setFloating,
		"data-radix-popper-content-wrapper": "",
		style: {
			...ee,
			transform: F ? ee.transform : "translate(0, -200%)",
			minWidth: "max-content",
			zIndex: le,
			"--radix-popper-transform-origin": [te.transformOrigin?.x, te.transformOrigin?.y].join(" "),
			...te.hide?.referenceHidden && {
				visibility: "hidden",
				pointerEvents: "none"
			}
		},
		dir: e.dir,
		children: /* @__PURE__ */ (0, S.jsx)(Ta, {
			scope: n,
			placedSide: re,
			placedAlign: ie,
			onArrowChange: C,
			arrowX: oe,
			arrowY: se,
			shouldHideArrow: ce,
			children: /* @__PURE__ */ (0, S.jsx)(Je.div, {
				"data-side": re,
				"data-align": ie,
				...h,
				ref: y,
				style: {
					...h.style,
					animation: F ? h.style?.animation : "none"
				}
			})
		})
	});
}, "PopperContent"));
function Oa(e) {
	return e !== null;
}
ha(Oa, "isNotNull");
var ka = /* @__PURE__ */ ha((e) => ({
	name: "transformOrigin",
	options: e,
	fn(t) {
		let { placement: n, rects: r, middlewareData: i } = t, a = i.arrow?.centerOffset !== 0, o = a ? 0 : e.arrowWidth, s = a ? 0 : e.arrowHeight, [c, l] = Aa(n), u = {
			start: "0%",
			center: "50%",
			end: "100%"
		}[l], d = (i.arrow?.x ?? 0) + o / 2, f = (i.arrow?.y ?? 0) + s / 2, p = "", m = "";
		return c === "bottom" ? (p = a ? u : `${d}px`, m = `${-s}px`) : c === "top" ? (p = a ? u : `${d}px`, m = `${r.floating.height + s}px`) : c === "right" ? (p = `${-s}px`, m = a ? u : `${f}px`) : c === "left" && (p = `${r.floating.width + s}px`, m = a ? u : `${f}px`), { data: {
			x: p,
			y: m
		} };
	}
}), "transformOrigin");
function Aa(e) {
	let [t, n = "center"] = e.split("-");
	return [t, n];
}
ha(Aa, "getSideAndAlignFromPlacement");
var ja = xa, Ma = Ca, Na = Da, Pa = function(e) {
	return typeof document > "u" ? null : (Array.isArray(e) ? e[0] : e).ownerDocument.body;
}, Fa = /* @__PURE__ */ new WeakMap(), Ia = /* @__PURE__ */ new WeakMap(), La = {}, Ra = 0, za = function(e) {
	return e && (e.host || za(e.parentNode));
}, Ba = function(e, t) {
	return t.map(function(t) {
		if (e.contains(t)) return t;
		var n = za(t);
		return n && e.contains(n) ? n : (console.error("aria-hidden", t, "in not contained inside", e, ". Doing nothing"), null);
	}).filter(function(e) {
		return !!e;
	});
}, Va = function(e, t, n, r) {
	var i = Ba(t, Array.isArray(e) ? e : [e]);
	La[n] || (La[n] = /* @__PURE__ */ new WeakMap());
	var a = La[n], o = [], s = /* @__PURE__ */ new Set(), c = new Set(i), l = function(e) {
		e && !s.has(e) && (s.add(e), l(e.parentNode));
	};
	i.forEach(l);
	var u = function(e) {
		e && !c.has(e) && Array.prototype.forEach.call(e.children, function(e) {
			if (s.has(e)) u(e);
			else try {
				var t = e.getAttribute(r), i = t !== null && t !== "false", c = (Fa.get(e) || 0) + 1, l = (a.get(e) || 0) + 1;
				Fa.set(e, c), a.set(e, l), o.push(e), c === 1 && i && Ia.set(e, !0), l === 1 && e.setAttribute(n, "true"), i || e.setAttribute(r, "true");
			} catch (t) {
				console.error("aria-hidden: cannot operate on ", e, t);
			}
		});
	};
	return u(t), s.clear(), Ra++, function() {
		o.forEach(function(e) {
			var t = Fa.get(e) - 1, i = a.get(e) - 1;
			Fa.set(e, t), a.set(e, i), t || (Ia.has(e) || e.removeAttribute(r), Ia.delete(e)), i || e.removeAttribute(n);
		}), Ra--, Ra || (Fa = /* @__PURE__ */ new WeakMap(), Fa = /* @__PURE__ */ new WeakMap(), Ia = /* @__PURE__ */ new WeakMap(), La = {});
	};
}, Ha = function(e, t, n) {
	n === void 0 && (n = "data-aria-hidden");
	var r = Array.from(Array.isArray(e) ? e : [e]), i = t || Pa(e);
	return i ? (r.push.apply(r, Array.from(i.querySelectorAll("[aria-live], script"))), Va(r, i, n, "aria-hidden")) : function() {
		return null;
	};
}, Ua = function() {
	return Ua = Object.assign || function(e) {
		for (var t, n = 1, r = arguments.length; n < r; n++) for (var i in t = arguments[n], t) Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
		return e;
	}, Ua.apply(this, arguments);
};
function Wa(e, t) {
	var n = {};
	for (var r in e) Object.prototype.hasOwnProperty.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
	if (e != null && typeof Object.getOwnPropertySymbols == "function") for (var i = 0, r = Object.getOwnPropertySymbols(e); i < r.length; i++) t.indexOf(r[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, r[i]) && (n[r[i]] = e[r[i]]);
	return n;
}
function Ga(e, t, n) {
	if (n || arguments.length === 2) for (var r = 0, i = t.length, a; r < i; r++) (a || !(r in t)) && (a ||= Array.prototype.slice.call(t, 0, r), a[r] = t[r]);
	return e.concat(a || Array.prototype.slice.call(t));
}
//#endregion
//#region node_modules/react-remove-scroll-bar/dist/es2015/constants.js
var Ka = "right-scroll-bar-position", qa = "width-before-scroll-bar", Ja = "with-scroll-bars-hidden", Ya = "--removed-body-scroll-bar-size";
//#endregion
//#region node_modules/use-callback-ref/dist/es2015/assignRef.js
function Xa(e, t) {
	return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
//#endregion
//#region node_modules/use-callback-ref/dist/es2015/useRef.js
function Za(e, t) {
	var n = (0, x.useState)(function() {
		return {
			value: e,
			callback: t,
			facade: {
				get current() {
					return n.value;
				},
				set current(e) {
					var t = n.value;
					t !== e && (n.value = e, n.callback(e, t));
				}
			}
		};
	})[0];
	return n.callback = t, n.facade;
}
//#endregion
//#region node_modules/use-callback-ref/dist/es2015/useMergeRef.js
var Qa = typeof window < "u" ? x.useLayoutEffect : x.useEffect, $a = /* @__PURE__ */ new WeakMap();
function eo(e, t) {
	var n = Za(t || null, function(t) {
		return e.forEach(function(e) {
			return Xa(e, t);
		});
	});
	return Qa(function() {
		var t = $a.get(n);
		if (t) {
			var r = new Set(t), i = new Set(e), a = n.current;
			r.forEach(function(e) {
				i.has(e) || Xa(e, null);
			}), i.forEach(function(e) {
				r.has(e) || Xa(e, a);
			});
		}
		$a.set(n, e);
	}, [e]), n;
}
//#endregion
//#region node_modules/use-sidecar/dist/es2015/medium.js
function to(e) {
	return e;
}
function no(e, t) {
	t === void 0 && (t = to);
	var n = [], r = !1;
	return {
		read: function() {
			if (r) throw Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
			return n.length ? n[n.length - 1] : e;
		},
		useMedium: function(e) {
			var i = t(e, r);
			return n.push(i), function() {
				n = n.filter(function(e) {
					return e !== i;
				});
			};
		},
		assignSyncMedium: function(e) {
			for (r = !0; n.length;) {
				var t = n;
				n = [], t.forEach(e);
			}
			n = {
				push: function(t) {
					return e(t);
				},
				filter: function() {
					return n;
				}
			};
		},
		assignMedium: function(e) {
			r = !0;
			var t = [];
			if (n.length) {
				var i = n;
				n = [], i.forEach(e), t = n;
			}
			var a = function() {
				var n = t;
				t = [], n.forEach(e);
			}, o = function() {
				return Promise.resolve().then(a);
			};
			o(), n = {
				push: function(e) {
					t.push(e), o();
				},
				filter: function(e) {
					return t = t.filter(e), n;
				}
			};
		}
	};
}
function ro(e) {
	e === void 0 && (e = {});
	var t = no(null);
	return t.options = Ua({
		async: !0,
		ssr: !1
	}, e), t;
}
//#endregion
//#region node_modules/use-sidecar/dist/es2015/exports.js
var io = function(e) {
	var t = e.sideCar, n = Wa(e, ["sideCar"]);
	if (!t) throw Error("Sidecar: please provide `sideCar` property to import the right car");
	var r = t.read();
	if (!r) throw Error("Sidecar medium not found");
	return x.createElement(r, Ua({}, n));
};
io.isSideCarExport = !0;
function ao(e, t) {
	return e.useMedium(t), io;
}
//#endregion
//#region node_modules/react-remove-scroll/dist/es2015/medium.js
var oo = ro(), so = function() {}, co = x.forwardRef(function(e, t) {
	var n = x.useRef(null), r = x.useState({
		onScrollCapture: so,
		onWheelCapture: so,
		onTouchMoveCapture: so
	}), i = r[0], a = r[1], o = e.forwardProps, s = e.children, c = e.className, l = e.removeScrollBar, u = e.enabled, d = e.shards, f = e.sideCar, p = e.noRelative, m = e.noIsolation, h = e.inert, g = e.allowPinchZoom, _ = e.as, v = _ === void 0 ? "div" : _, y = e.gapMode, b = Wa(e, [
		"forwardProps",
		"children",
		"className",
		"removeScrollBar",
		"enabled",
		"shards",
		"sideCar",
		"noRelative",
		"noIsolation",
		"inert",
		"allowPinchZoom",
		"as",
		"gapMode"
	]), S = f, C = eo([n, t]), w = Ua(Ua({}, b), i);
	return x.createElement(x.Fragment, null, u && x.createElement(S, {
		sideCar: oo,
		removeScrollBar: l,
		shards: d,
		noRelative: p,
		noIsolation: m,
		inert: h,
		setCallbacks: a,
		allowPinchZoom: !!g,
		lockRef: n,
		gapMode: y
	}), o ? x.cloneElement(x.Children.only(s), Ua(Ua({}, w), { ref: C })) : x.createElement(v, Ua({}, w, {
		className: c,
		ref: C
	}), s));
});
co.defaultProps = {
	enabled: !0,
	removeScrollBar: !0,
	inert: !1
}, co.classNames = {
	fullWidth: qa,
	zeroRight: Ka
};
//#endregion
//#region node_modules/get-nonce/dist/es2015/index.js
var lo = function() {
	if (typeof __webpack_nonce__ < "u") return __webpack_nonce__;
};
//#endregion
//#region node_modules/react-style-singleton/dist/es2015/singleton.js
function uo() {
	if (!document) return null;
	var e = document.createElement("style");
	e.type = "text/css";
	var t = lo();
	return t && e.setAttribute("nonce", t), e;
}
function fo(e, t) {
	e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function po(e) {
	(document.head || document.getElementsByTagName("head")[0]).appendChild(e);
}
var mo = function() {
	var e = 0, t = null;
	return {
		add: function(n) {
			e == 0 && (t = uo()) && (fo(t, n), po(t)), e++;
		},
		remove: function() {
			e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
		}
	};
}, ho = function() {
	var e = mo();
	return function(t, n) {
		x.useEffect(function() {
			return e.add(t), function() {
				e.remove();
			};
		}, [t && n]);
	};
}, go = function() {
	var e = ho();
	return function(t) {
		var n = t.styles, r = t.dynamic;
		return e(n, r), null;
	};
}, _o = {
	left: 0,
	top: 0,
	right: 0,
	gap: 0
}, vo = function(e) {
	return parseInt(e || "", 10) || 0;
}, yo = function(e) {
	var t = window.getComputedStyle(document.body), n = t[e === "padding" ? "paddingLeft" : "marginLeft"], r = t[e === "padding" ? "paddingTop" : "marginTop"], i = t[e === "padding" ? "paddingRight" : "marginRight"];
	return [
		vo(n),
		vo(r),
		vo(i)
	];
}, bo = function(e) {
	if (e === void 0 && (e = "margin"), typeof window > "u") return _o;
	var t = yo(e), n = document.documentElement.clientWidth, r = window.innerWidth;
	return {
		left: t[0],
		top: t[1],
		right: t[2],
		gap: Math.max(0, r - n + t[2] - t[0])
	};
}, xo = go(), So = "data-scroll-locked", Co = function(e, t, n, r) {
	var i = e.left, a = e.top, o = e.right, s = e.gap;
	return n === void 0 && (n = "margin"), `
  .${Ja} {
   overflow: hidden ${r};
   padding-right: ${s}px ${r};
  }
  body[${So}] {
    overflow: hidden ${r};
    overscroll-behavior: contain;
    ${[
		t && `position: relative ${r};`,
		n === "margin" && `
    padding-left: ${i}px;
    padding-top: ${a}px;
    padding-right: ${o}px;
    margin-left:0;
    margin-top:0;
    margin-right: ${s}px ${r};
    `,
		n === "padding" && `padding-right: ${s}px ${r};`
	].filter(Boolean).join("")}
  }
  
  .${Ka} {
    right: ${s}px ${r};
  }
  
  .${qa} {
    margin-right: ${s}px ${r};
  }
  
  .${Ka} .${Ka} {
    right: 0 ${r};
  }
  
  .${qa} .${qa} {
    margin-right: 0 ${r};
  }
  
  body[${So}] {
    ${Ya}: ${s}px;
  }
`;
}, wo = function() {
	var e = parseInt(document.body.getAttribute("data-scroll-locked") || "0", 10);
	return isFinite(e) ? e : 0;
}, To = function() {
	x.useEffect(function() {
		return document.body.setAttribute(So, (wo() + 1).toString()), function() {
			var e = wo() - 1;
			e <= 0 ? document.body.removeAttribute(So) : document.body.setAttribute(So, e.toString());
		};
	}, []);
}, Eo = function(e) {
	var t = e.noRelative, n = e.noImportant, r = e.gapMode, i = r === void 0 ? "margin" : r;
	To();
	var a = x.useMemo(function() {
		return bo(i);
	}, [i]);
	return x.createElement(xo, { styles: Co(a, !t, i, n ? "" : "!important") });
}, Do = !1;
if (typeof window < "u") try {
	var Oo = Object.defineProperty({}, "passive", { get: function() {
		return Do = !0, !0;
	} });
	window.addEventListener("test", Oo, Oo), window.removeEventListener("test", Oo, Oo);
} catch {
	Do = !1;
}
var ko = Do ? { passive: !1 } : !1, Ao = function(e) {
	return e.tagName === "TEXTAREA";
}, jo = function(e, t) {
	if (!(e instanceof Element)) return !1;
	var n = window.getComputedStyle(e);
	return n[t] !== "hidden" && !(n.overflowY === n.overflowX && !Ao(e) && n[t] === "visible");
}, Mo = function(e) {
	return jo(e, "overflowY");
}, No = function(e) {
	return jo(e, "overflowX");
}, Po = function(e, t) {
	var n = t.ownerDocument, r = t;
	do {
		if (typeof ShadowRoot < "u" && r instanceof ShadowRoot && (r = r.host), Lo(e, r)) {
			var i = Ro(e, r);
			if (i[1] > i[2]) return !0;
		}
		r = r.parentNode;
	} while (r && r !== n.body);
	return !1;
}, Fo = function(e) {
	return [
		e.scrollTop,
		e.scrollHeight,
		e.clientHeight
	];
}, Io = function(e) {
	return [
		e.scrollLeft,
		e.scrollWidth,
		e.clientWidth
	];
}, Lo = function(e, t) {
	return e === "v" ? Mo(t) : No(t);
}, Ro = function(e, t) {
	return e === "v" ? Fo(t) : Io(t);
}, zo = function(e, t) {
	return e === "h" && t === "rtl" ? -1 : 1;
}, Bo = function(e, t, n, r, i) {
	var a = zo(e, window.getComputedStyle(t).direction), o = a * r, s = n.target, c = t.contains(s), l = !1, u = o > 0, d = 0, f = 0;
	do {
		if (!s) break;
		var p = Ro(e, s), m = p[0], h = p[1] - p[2] - a * m;
		(m || h) && Lo(e, s) && (d += h, f += m);
		var g = s.parentNode;
		s = g && g.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? g.host : g;
	} while (!c && s !== document.body || c && (t.contains(s) || t === s));
	return (u && (i && Math.abs(d) < 1 || !i && o > d) || !u && (i && Math.abs(f) < 1 || !i && -o > f)) && (l = !0), l;
}, Vo = function(e) {
	return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Ho = function(e) {
	return [e.deltaX, e.deltaY];
}, Uo = function(e) {
	return e && "current" in e ? e.current : e;
}, B = function(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}, Wo = function(e) {
	return `
  .block-interactivity-${e} {pointer-events: none;}
  .allow-interactivity-${e} {pointer-events: all;}
`;
}, Go = 0, Ko = [];
function qo(e) {
	var t = x.useRef([]), n = x.useRef([0, 0]), r = x.useRef(), i = x.useState(Go++)[0], a = x.useState(go)[0], o = x.useRef(e);
	x.useEffect(function() {
		o.current = e;
	}, [e]), x.useEffect(function() {
		if (e.inert) {
			document.body.classList.add(`block-interactivity-${i}`);
			var t = Ga([e.lockRef.current], (e.shards || []).map(Uo), !0).filter(Boolean);
			return t.forEach(function(e) {
				return e.classList.add(`allow-interactivity-${i}`);
			}), function() {
				document.body.classList.remove(`block-interactivity-${i}`), t.forEach(function(e) {
					return e.classList.remove(`allow-interactivity-${i}`);
				});
			};
		}
	}, [
		e.inert,
		e.lockRef.current,
		e.shards
	]);
	var s = x.useCallback(function(e, t) {
		if ("touches" in e && e.touches.length === 2 || e.type === "wheel" && e.ctrlKey) return !o.current.allowPinchZoom;
		var i = Vo(e), a = n.current, s = "deltaX" in e ? e.deltaX : a[0] - i[0], c = "deltaY" in e ? e.deltaY : a[1] - i[1], l, u = e.target, d = Math.abs(s) > Math.abs(c) ? "h" : "v";
		if ("touches" in e && d === "h" && u.type === "range") return !1;
		var f = window.getSelection(), p = f && f.anchorNode;
		if (p && (p === u || p.contains(u))) return !1;
		var m = Po(d, u);
		if (!m) return !0;
		if (m ? l = d : (l = d === "v" ? "h" : "v", m = Po(d, u)), !m) return !1;
		if (!r.current && "changedTouches" in e && (s || c) && (r.current = l), !l) return !0;
		var h = r.current || l;
		return Bo(h, t, e, h === "h" ? s : c, !0);
	}, []), c = x.useCallback(function(e) {
		var n = e;
		if (Ko.length && Ko[Ko.length - 1] === a) {
			var r = "deltaY" in n ? Ho(n) : Vo(n), i = t.current.filter(function(e) {
				return e.name === n.type && (e.target === n.target || n.target === e.shadowParent) && B(e.delta, r);
			})[0];
			if (i && i.should) {
				n.cancelable && n.preventDefault();
				return;
			}
			if (!i) {
				var c = (o.current.shards || []).map(Uo).filter(Boolean).filter(function(e) {
					return e.contains(n.target);
				});
				(c.length > 0 ? s(n, c[0]) : !o.current.noIsolation) && n.cancelable && n.preventDefault();
			}
		}
	}, []), l = x.useCallback(function(e, n, r, i) {
		var a = {
			name: e,
			delta: n,
			target: r,
			should: i,
			shadowParent: Jo(r)
		};
		t.current.push(a), setTimeout(function() {
			t.current = t.current.filter(function(e) {
				return e !== a;
			});
		}, 1);
	}, []), u = x.useCallback(function(e) {
		n.current = Vo(e), r.current = void 0;
	}, []), d = x.useCallback(function(t) {
		l(t.type, Ho(t), t.target, s(t, e.lockRef.current));
	}, []), f = x.useCallback(function(t) {
		l(t.type, Vo(t), t.target, s(t, e.lockRef.current));
	}, []);
	x.useEffect(function() {
		return Ko.push(a), e.setCallbacks({
			onScrollCapture: d,
			onWheelCapture: d,
			onTouchMoveCapture: f
		}), document.addEventListener("wheel", c, ko), document.addEventListener("touchmove", c, ko), document.addEventListener("touchstart", u, ko), function() {
			Ko = Ko.filter(function(e) {
				return e !== a;
			}), document.removeEventListener("wheel", c, ko), document.removeEventListener("touchmove", c, ko), document.removeEventListener("touchstart", u, ko);
		};
	}, []);
	var p = e.removeScrollBar, m = e.inert;
	return x.createElement(x.Fragment, null, m ? x.createElement(a, { styles: Wo(i) }) : null, p ? x.createElement(Eo, {
		noRelative: e.noRelative,
		gapMode: e.gapMode
	}) : null);
}
function Jo(e) {
	for (var t = null; e !== null;) e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
	return t;
}
//#endregion
//#region node_modules/react-remove-scroll/dist/es2015/sidecar.js
var Yo = ao(oo, qo), Xo = x.forwardRef(function(e, t) {
	return x.createElement(co, Ua({}, e, {
		ref: t,
		sideCar: Yo
	}));
});
Xo.classNames = co.classNames;
//#endregion
//#region node_modules/@radix-ui/react-popover/dist/index.mjs
var Zo = Object.defineProperty, Qo = (e, t) => Zo(e, "name", {
	value: t,
	configurable: !0
}), $o = "Popover", [es, ts] = /* @__PURE__ */ E($o, [va]), ns = va(), [rs, is] = es($o), as = /* @__PURE__ */ Qo((e) => {
	let { __scopePopover: t, children: n, open: r, defaultOpen: i, onOpenChange: a, modal: o = !1 } = e, s = ns(t), c = x.useRef(null), [l, u] = x.useState(!1), [d, f] = Be({
		prop: r,
		defaultProp: i ?? !1,
		onChange: a,
		caller: $o
	});
	return /* @__PURE__ */ (0, S.jsx)(ja, {
		...s,
		children: /* @__PURE__ */ (0, S.jsx)(rs, {
			scope: t,
			contentId: lt(),
			triggerRef: c,
			open: d,
			onOpenChange: f,
			onOpenToggle: x.useCallback(() => f((e) => !e), [f]),
			hasCustomAnchor: l,
			onCustomAnchorAdd: x.useCallback(() => u(!0), []),
			onCustomAnchorRemove: x.useCallback(() => u(!1), []),
			modal: o,
			children: n
		})
	});
}, "Popover"), os = "PopoverTrigger", ss = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Qo(function(e, t) {
	let { __scopePopover: n, ...r } = e, i = is(os, n), a = ns(n), o = M(t, i.triggerRef), s = /* @__PURE__ */ (0, S.jsx)(Je.button, {
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": i.open,
		"aria-controls": i.open ? i.contentId : void 0,
		"data-state": gs(i.open),
		...r,
		ref: o,
		onClick: Ee(e.onClick, i.onOpenToggle)
	});
	return i.hasCustomAnchor ? s : /* @__PURE__ */ (0, S.jsx)(Ma, {
		asChild: !0,
		...a,
		children: s
	});
}, "PopoverTrigger")), [cs, ls] = es("PopoverPortal", { forceMount: void 0 }), us = "PopoverContent", ds = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Qo(function(e, t) {
	let n = ls(us, e.__scopePopover), { forceMount: r = n.forceMount, ...i } = e, a = is(us, e.__scopePopover);
	return /* @__PURE__ */ (0, S.jsx)($e, {
		present: r || a.open,
		children: a.modal ? /* @__PURE__ */ (0, S.jsx)(ps, {
			...i,
			ref: t
		}) : /* @__PURE__ */ (0, S.jsx)(ms, {
			...i,
			ref: t
		})
	});
}, "PopoverContent")), fs = /* @__PURE__ */ P("PopoverContent.RemoveScroll"), ps = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Qo(function(e, t) {
	let n = is(us, e.__scopePopover), r = x.useRef(null), i = M(t, r), a = x.useRef(!1);
	return x.useEffect(() => {
		let e = r.current;
		if (e) return Ha(e);
	}, []), /* @__PURE__ */ (0, S.jsx)(Xo, {
		as: fs,
		allowPinchZoom: !0,
		children: /* @__PURE__ */ (0, S.jsx)(hs, {
			...e,
			ref: i,
			trapFocus: n.open,
			disableOutsidePointerEvents: !0,
			onCloseAutoFocus: Ee(e.onCloseAutoFocus, (e) => {
				e.preventDefault(), a.current || n.triggerRef.current?.focus();
			}),
			onPointerDownOutside: Ee(e.onPointerDownOutside, (e) => {
				let t = e.detail.originalEvent, n = t.button === 0 && t.ctrlKey === !0, r = t.button === 2 || n;
				a.current = r;
			}, { checkForDefaultPrevented: !1 }),
			onFocusOutside: Ee(e.onFocusOutside, (e) => e.preventDefault(), { checkForDefaultPrevented: !1 })
		})
	});
}, "PopoverContentModal")), ms = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Qo(function(e, t) {
	let n = is(us, e.__scopePopover), r = x.useRef(!1), i = x.useRef(!1);
	return /* @__PURE__ */ (0, S.jsx)(hs, {
		...e,
		ref: t,
		trapFocus: !1,
		disableOutsidePointerEvents: !1,
		onCloseAutoFocus: (t) => {
			e.onCloseAutoFocus?.(t), t.defaultPrevented || (r.current || n.triggerRef.current?.focus(), t.preventDefault()), r.current = !1, i.current = !1;
		},
		onInteractOutside: (t) => {
			e.onInteractOutside?.(t), t.defaultPrevented || (r.current = !0, t.detail.originalEvent.type === "pointerdown" && (i.current = !0));
			let a = t.target;
			n.triggerRef.current?.contains(a) && t.preventDefault(), t.detail.originalEvent.type === "focusin" && i.current && t.preventDefault();
		}
	});
}, "PopoverContentNonModal")), hs = /* @__PURE__ */ x.forwardRef(/* @__PURE__ */ Qo(function(e, t) {
	let { __scopePopover: n, trapFocus: r, onOpenAutoFocus: i, onCloseAutoFocus: a, disableOutsidePointerEvents: o, onEscapeKeyDown: s, onPointerDownOutside: c, onFocusOutside: l, onInteractOutside: u, ...d } = e, f = is(us, n), p = ns(n);
	return In(), /* @__PURE__ */ (0, S.jsx)(Un, {
		asChild: !0,
		loop: !0,
		trapped: r,
		onMountAutoFocus: i,
		onUnmountAutoFocus: a,
		children: /* @__PURE__ */ (0, S.jsx)(wn, {
			asChild: !0,
			disableOutsidePointerEvents: o,
			onInteractOutside: u,
			onEscapeKeyDown: s,
			onPointerDownOutside: c,
			onFocusOutside: l,
			onDismiss: () => f.onOpenChange(!1),
			deferPointerDownOutside: !0,
			children: /* @__PURE__ */ (0, S.jsx)(Na, {
				"data-state": gs(f.open),
				role: "dialog",
				id: f.contentId,
				...p,
				...d,
				ref: t,
				style: {
					...d.style,
					"--radix-popover-content-transform-origin": "var(--radix-popper-transform-origin)",
					"--radix-popover-content-available-width": "var(--radix-popper-available-width)",
					"--radix-popover-content-available-height": "var(--radix-popper-available-height)",
					"--radix-popover-trigger-width": "var(--radix-popper-anchor-width)",
					"--radix-popover-trigger-height": "var(--radix-popper-anchor-height)"
				}
			})
		})
	});
}, "PopoverContentImpl"));
function gs(e) {
	return e ? "open" : "closed";
}
Qo(gs, "getState");
var _s = as, vs = ss, ys = ds;
//#endregion
//#region react-ui/components/pfa-info-popover.jsx
function bs({ label: e, content: t, tone: n }) {
	let [r, i] = x.useState(!1), a = x.useRef(!1), o = x.useRef(null), s = x.useCallback(() => {
		a.current || i(!1);
	}, []), c = [n ? "tag tone-" + n : "", e ? "" : "is-icon-only"].filter(Boolean).join(" ");
	return /* @__PURE__ */ (0, S.jsx)(_s, {
		open: r,
		onOpenChange: i,
		children: /* @__PURE__ */ (0, S.jsxs)("span", {
			className: "chart-info",
			onPointerEnter: (e) => {
				e.pointerType !== "touch" && i(!0);
			},
			onPointerLeave: (e) => {
				e.pointerType !== "touch" && s();
			},
			onFocus: () => i(!0),
			onBlur: (e) => {
				e.currentTarget.contains(e.relatedTarget) || s();
			},
			children: [/* @__PURE__ */ (0, S.jsxs)(vs, {
				ref: o,
				className: "pfa-info-trigger" + (c ? " " + c : ""),
				"aria-label": `${e || "More information"}: details`,
				onClick: (e) => {
					e.stopPropagation(), e.preventDefault(), a.current = !a.current, i(a.current);
				},
				onKeyDown: (e) => {
					e.key === "Escape" && (a.current = !1, i(!1), o.current?.focus());
				},
				children: [e ? /* @__PURE__ */ (0, S.jsx)("span", {
					className: "chart-info-label",
					children: e
				}) : null, /* @__PURE__ */ (0, S.jsx)("span", {
					className: "chart-info-icon",
					"aria-hidden": "true",
					dangerouslySetInnerHTML: { __html: "<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\" stroke=\"none\" shape-rendering=\"geometricPrecision\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 2.4A9.6 9.6 0 1 0 12 21.6 9.6 9.6 0 0 0 12 2.4zm0 4.1a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7zm-1.15 4.6a1.15 1.15 0 0 1 2.3 0v5.3a1.15 1.15 0 0 1-2.3 0z\"/></svg>" }
				})]
			}), /* @__PURE__ */ (0, S.jsx)(ys, {
				className: "chart-info-body",
				side: "bottom",
				align: "center",
				collisionPadding: 12,
				onOpenAutoFocus: (e) => e.preventDefault(),
				onCloseAutoFocus: (e) => e.preventDefault(),
				onEscapeKeyDown: () => {
					a.current = !1, o.current?.focus();
				},
				onPointerDownOutside: () => {
					a.current = !1;
				},
				children: t
			})]
		})
	});
}
//#endregion
//#region node_modules/clsx/dist/clsx.mjs
function xs(e) {
	var t, n, r = "";
	if (typeof e == "string" || typeof e == "number") r += e;
	else if (typeof e == "object") {
		if (Array.isArray(e)) {
			var i = e.length;
			for (t = 0; t < i; t++) e[t] && (n = xs(e[t])) && (r && (r += " "), r += n);
		} else for (n in e) e[n] && (r && (r += " "), r += n);
	}
	return r;
}
function Ss() {
	for (var e, t, n = 0, r = "", i = arguments.length; n < i; n++) (e = arguments[n]) && (t = xs(e)) && (r && (r += " "), r += t);
	return r;
}
//#endregion
//#region node_modules/recharts/es6/util/excludeEventProps.js
var Cs = /* @__PURE__ */ "dangerouslySetInnerHTML.onCopy.onCopyCapture.onCut.onCutCapture.onPaste.onPasteCapture.onCompositionEnd.onCompositionEndCapture.onCompositionStart.onCompositionStartCapture.onCompositionUpdate.onCompositionUpdateCapture.onFocus.onFocusCapture.onBlur.onBlurCapture.onChange.onChangeCapture.onBeforeInput.onBeforeInputCapture.onInput.onInputCapture.onReset.onResetCapture.onSubmit.onSubmitCapture.onInvalid.onInvalidCapture.onLoad.onLoadCapture.onError.onErrorCapture.onKeyDown.onKeyDownCapture.onKeyPress.onKeyPressCapture.onKeyUp.onKeyUpCapture.onAbort.onAbortCapture.onCanPlay.onCanPlayCapture.onCanPlayThrough.onCanPlayThroughCapture.onDurationChange.onDurationChangeCapture.onEmptied.onEmptiedCapture.onEncrypted.onEncryptedCapture.onEnded.onEndedCapture.onLoadedData.onLoadedDataCapture.onLoadedMetadata.onLoadedMetadataCapture.onLoadStart.onLoadStartCapture.onPause.onPauseCapture.onPlay.onPlayCapture.onPlaying.onPlayingCapture.onProgress.onProgressCapture.onRateChange.onRateChangeCapture.onSeeked.onSeekedCapture.onSeeking.onSeekingCapture.onStalled.onStalledCapture.onSuspend.onSuspendCapture.onTimeUpdate.onTimeUpdateCapture.onVolumeChange.onVolumeChangeCapture.onWaiting.onWaitingCapture.onAuxClick.onAuxClickCapture.onClick.onClickCapture.onContextMenu.onContextMenuCapture.onDoubleClick.onDoubleClickCapture.onDrag.onDragCapture.onDragEnd.onDragEndCapture.onDragEnter.onDragEnterCapture.onDragExit.onDragExitCapture.onDragLeave.onDragLeaveCapture.onDragOver.onDragOverCapture.onDragStart.onDragStartCapture.onDrop.onDropCapture.onMouseDown.onMouseDownCapture.onMouseEnter.onMouseLeave.onMouseMove.onMouseMoveCapture.onMouseOut.onMouseOutCapture.onMouseOver.onMouseOverCapture.onMouseUp.onMouseUpCapture.onSelect.onSelectCapture.onTouchCancel.onTouchCancelCapture.onTouchEnd.onTouchEndCapture.onTouchMove.onTouchMoveCapture.onTouchStart.onTouchStartCapture.onPointerDown.onPointerDownCapture.onPointerMove.onPointerMoveCapture.onPointerUp.onPointerUpCapture.onPointerCancel.onPointerCancelCapture.onPointerEnter.onPointerEnterCapture.onPointerLeave.onPointerLeaveCapture.onPointerOver.onPointerOverCapture.onPointerOut.onPointerOutCapture.onGotPointerCapture.onGotPointerCaptureCapture.onLostPointerCapture.onLostPointerCaptureCapture.onScroll.onScrollCapture.onWheel.onWheelCapture.onAnimationStart.onAnimationStartCapture.onAnimationEnd.onAnimationEndCapture.onAnimationIteration.onAnimationIterationCapture.onTransitionEnd.onTransitionEndCapture".split(".");
function ws(e) {
	return typeof e == "string" && Cs.includes(e);
}
//#endregion
//#region node_modules/recharts/es6/util/svgPropertiesNoEvents.js
var Ts = /* @__PURE__ */ new Set(/* @__PURE__ */ "aria-activedescendant.aria-atomic.aria-autocomplete.aria-busy.aria-checked.aria-colcount.aria-colindex.aria-colspan.aria-controls.aria-current.aria-describedby.aria-details.aria-disabled.aria-errormessage.aria-expanded.aria-flowto.aria-haspopup.aria-hidden.aria-invalid.aria-keyshortcuts.aria-label.aria-labelledby.aria-level.aria-live.aria-modal.aria-multiline.aria-multiselectable.aria-orientation.aria-owns.aria-placeholder.aria-posinset.aria-pressed.aria-readonly.aria-relevant.aria-required.aria-roledescription.aria-rowcount.aria-rowindex.aria-rowspan.aria-selected.aria-setsize.aria-sort.aria-valuemax.aria-valuemin.aria-valuenow.aria-valuetext.className.color.height.id.lang.max.media.method.min.name.style.target.width.role.tabIndex.accentHeight.accumulate.additive.alignmentBaseline.allowReorder.alphabetic.amplitude.arabicForm.ascent.attributeName.attributeType.autoReverse.azimuth.baseFrequency.baselineShift.baseProfile.bbox.begin.bias.by.calcMode.capHeight.clip.clipPath.clipPathUnits.clipRule.colorInterpolation.colorInterpolationFilters.colorProfile.colorRendering.contentScriptType.contentStyleType.cursor.cx.cy.d.decelerate.descent.diffuseConstant.direction.display.divisor.dominantBaseline.dur.dx.dy.edgeMode.elevation.enableBackground.end.exponent.externalResourcesRequired.fill.fillOpacity.fillRule.filter.filterRes.filterUnits.floodColor.floodOpacity.focusable.fontFamily.fontSize.fontSizeAdjust.fontStretch.fontStyle.fontVariant.fontWeight.format.from.fx.fy.g1.g2.glyphName.glyphOrientationHorizontal.glyphOrientationVertical.glyphRef.gradientTransform.gradientUnits.hanging.horizAdvX.horizOriginX.href.ideographic.imageRendering.in2.in.intercept.k1.k2.k3.k4.k.kernelMatrix.kernelUnitLength.kerning.keyPoints.keySplines.keyTimes.lengthAdjust.letterSpacing.lightingColor.limitingConeAngle.local.markerEnd.markerHeight.markerMid.markerStart.markerUnits.markerWidth.mask.maskContentUnits.maskUnits.mathematical.mode.numOctaves.offset.opacity.operator.order.orient.orientation.origin.overflow.overlinePosition.overlineThickness.paintOrder.panose1.pathLength.patternContentUnits.patternTransform.patternUnits.pointerEvents.pointsAtX.pointsAtY.pointsAtZ.preserveAlpha.preserveAspectRatio.primitiveUnits.r.radius.refX.refY.renderingIntent.repeatCount.repeatDur.requiredExtensions.requiredFeatures.restart.result.rotate.rx.ry.seed.shapeRendering.slope.spacing.specularConstant.specularExponent.speed.spreadMethod.startOffset.stdDeviation.stemh.stemv.stitchTiles.stopColor.stopOpacity.strikethroughPosition.strikethroughThickness.string.stroke.strokeDasharray.strokeDashoffset.strokeLinecap.strokeLinejoin.strokeMiterlimit.strokeOpacity.strokeWidth.surfaceScale.systemLanguage.tableValues.targetX.targetY.textAnchor.textDecoration.textLength.textRendering.to.transform.u1.u2.underlinePosition.underlineThickness.unicode.unicodeBidi.unicodeRange.unitsPerEm.vAlphabetic.values.vectorEffect.version.vertAdvY.vertOriginX.vertOriginY.vHanging.vIdeographic.viewTarget.visibility.vMathematical.widths.wordSpacing.writingMode.x1.x2.x.xChannelSelector.xHeight.xlinkActuate.xlinkArcrole.xlinkHref.xlinkRole.xlinkShow.xlinkTitle.xlinkType.xmlBase.xmlLang.xmlns.xmlnsXlink.xmlSpace.y1.y2.y.yChannelSelector.z.zoomAndPan.ref.key.angle".split("."));
function Es(e) {
	return typeof e == "string" && Ts.has(e);
}
function Ds(e) {
	return typeof e == "string" && e.startsWith("data-");
}
function Os(e) {
	if (typeof e != "object" || !e) return {};
	var t = {};
	for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (Es(n) || Ds(n)) && (t[n] = e[n]);
	return t;
}
function ks(e) {
	if (e == null) return null;
	if (/*#__PURE__*/ (0, x.isValidElement)(e) && typeof e.props == "object" && e.props !== null) {
		var t = e.props;
		return Os(t);
	}
	return typeof e == "object" && !Array.isArray(e) ? Os(e) : null;
}
//#endregion
//#region node_modules/recharts/es6/util/svgPropertiesAndEvents.js
function As(e) {
	var t = {};
	for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (Es(n) || Ds(n) || ws(n)) && (t[n] = e[n]);
	return t;
}
//#endregion
//#region node_modules/recharts/es6/container/Surface.js
var js = [
	"children",
	"width",
	"height",
	"viewBox",
	"className",
	"style",
	"title",
	"desc"
];
function Ms() {
	return Ms = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Ms.apply(null, arguments);
}
function Ns(e, t) {
	if (e == null) return {};
	var n, r, i = Ps(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Ps(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var Fs = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.children, r = e.width, i = e.height, a = e.viewBox, o = e.className, s = e.style, c = e.title, l = e.desc, u = Ns(e, js), d = a || {
		width: r,
		height: i,
		x: 0,
		y: 0
	}, f = Ss("recharts-surface", o);
	return /*#__PURE__*/ x.createElement("svg", Ms({}, As(u), {
		className: f,
		width: r,
		height: i,
		style: s,
		viewBox: `${d.x} ${d.y} ${d.width} ${d.height}`,
		ref: t
	}), /*#__PURE__*/ x.createElement("title", null, c), /*#__PURE__*/ x.createElement("desc", null, l), n);
}), Is = ["children", "className"];
function Ls() {
	return Ls = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Ls.apply(null, arguments);
}
function Rs(e, t) {
	if (e == null) return {};
	var n, r, i = zs(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function zs(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var Bs = /*#__PURE__*/ x.forwardRef((e, t) => {
	var n = e.children, r = e.className, i = Rs(e, Is), a = Ss("recharts-layer", r);
	return /*#__PURE__*/ x.createElement("g", Ls({ className: a }, As(i), { ref: t }), n);
});
//#endregion
//#region node_modules/es-toolkit/dist/_internal/isUnsafeProperty.mjs
function Vs(e) {
	return e === "__proto__";
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/isDeepKey.mjs
var Hs = /\.|(\[(?:[^[\]]*|(["'])(?:(?!\2)[^\\]|\\.)*?\2)\])/;
function Us(e) {
	switch (typeof e) {
		case "number":
		case "symbol": return !1;
		case "string": return e === "" || e.startsWith(".") || e.endsWith(".") ? !1 : Hs.test(e);
		default: return !1;
	}
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/toKey.mjs
function Ws(e) {
	return typeof e == "string" || typeof e == "symbol" ? e : Object.is(e?.valueOf?.(), -0) ? "-0" : String(e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isSymbol.mjs
function Gs(e) {
	return typeof e == "symbol" || e instanceof Symbol;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/toString.mjs
function Ks(e) {
	return e == null ? "" : qs(e);
}
function qs(e) {
	if (typeof e == "string") return e;
	if (Array.isArray(e)) return e.map(qs).join(",");
	if (Gs(e)) return e.toString();
	let t = e + "";
	return t === "0" && Object.is(Number(e), -0) ? "-0" : t;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/toPath.mjs
function Js(e) {
	if (Array.isArray(e)) return e.map(Ws);
	if (typeof e == "symbol") return [e];
	e = Ks(e);
	let t = [], n = e.length;
	if (n === 0) return t;
	let r = 0, i = "", a = "", o = !1, s = !1, c = /^-?\d+(?:\.\d+)?$/;
	for (e.charCodeAt(0) === 46 && t.push(""); r < n;) {
		let l = e[r];
		if (a) l === "\\" && r + 1 < n ? (r++, i += e[r]) : l === a ? a = "" : i += l;
		else if (o) {
			if (l === "\"" || l === "'") a = l, s = !0;
			else if (l === "]") {
				if (o = !1, !s && i.includes(".") && !c.test(i)) {
					let e = i.split(".");
					for (let n = 0; n < e.length; n++) e[n] !== "" && t.push(e[n]);
				} else t.push(i);
				i = "";
			} else i += l;
		} else if (l === "[") o = !0, s = !1, i &&= (t.push(i), "");
		else if (l === ".") {
			i &&= (t.push(i), "");
			let n = e[r + 1];
			(n === void 0 || n === ".") && t.push("");
		} else i += l;
		r++;
	}
	return i && t.push(i), t;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/object/get.mjs
function Ys(e, t, n) {
	if (e == null) return n;
	switch (typeof t) {
		case "string": {
			if (Vs(t)) return n;
			let r = e[t];
			return r === void 0 ? Us(t) && !Object.hasOwn(e, t) ? Ys(e, Js(t), n) : n : r;
		}
		case "number":
		case "symbol": {
			typeof t == "number" && (t = Ws(t));
			let r = e[t];
			return r === void 0 ? n : r;
		}
		default: {
			if (Array.isArray(t)) return Xs(e, t, n);
			if (t = Object.is(t?.valueOf(), -0) ? "-0" : String(t), Vs(t)) return n;
			let r = e[t];
			return r === void 0 ? n : r;
		}
	}
}
function Xs(e, t, n) {
	if (t.length === 0) return n;
	let r = e;
	for (let e = 0; e < t.length; e++) {
		if (r == null || Vs(t[e])) return n;
		r = r[t[e]];
	}
	return r === void 0 ? n : r;
}
//#endregion
//#region node_modules/recharts/es6/util/round.js
var Zs = 4;
function Qs(e) {
	var t = 10 ** (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Zs), n = Math.round(e * t) / t;
	return Object.is(n, -0) ? 0 : n;
}
function $s(e) {
	var t = [...arguments].slice(1);
	return e.reduce((e, n, r) => {
		var i = t[r - 1];
		return typeof i == "string" ? e + i + n : i === void 0 ? e + n : e + Qs(i) + n;
	}, "");
}
//#endregion
//#region node_modules/recharts/es6/util/DataUtils.js
var ec = (e) => e === 0 ? 0 : e > 0 ? 1 : -1, tc = (e) => typeof e == "number" && e != +e, nc = (e) => typeof e == "string" && e.length > 1 && e.indexOf("%") === e.length - 1, V = (e) => (typeof e == "number" || e instanceof Number) && !tc(e), rc = (e) => V(e) || typeof e == "string", ic = 0, ac = (e) => {
	var t = ++ic;
	return `${e || ""}${t}`;
}, oc = function(e, t) {
	var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0, r = arguments.length > 3 && arguments[3] !== void 0 && arguments[3];
	if (!V(e) && typeof e != "string") return n;
	var i;
	if (nc(e)) {
		if (t == null) return n;
		var a = e.indexOf("%");
		i = t * parseFloat(e.slice(0, a)) / 100;
	} else i = +e;
	return tc(i) && (i = n), r && t != null && i > t && (i = t), i;
}, sc = (e) => {
	if (!Array.isArray(e)) return !1;
	for (var t = e.length, n = {}, r = 0; r < t; r++) if (!n[String(e[r])]) n[String(e[r])] = !0;
	else return !0;
	return !1;
};
function cc(e, t, n) {
	return V(e) && V(t) ? Qs(e + n * (t - e)) : t;
}
function lc(e, t, n) {
	if (e && e.length) return e.find((e) => e && (typeof t == "function" ? t(e) : Ys(e, t)) === n);
}
var uc = (e) => e == null, dc = (e) => uc(e) ? e : `${e.charAt(0).toUpperCase()}${e.slice(1)}`;
function fc(e) {
	return e != null;
}
function pc() {}
//#endregion
//#region node_modules/recharts/es6/cartesian/cartesianViewBoxToTrapezoid.js
function mc(e) {
	if (e) return {
		x: e.x,
		y: e.y,
		upperWidth: "upperWidth" in e ? e.upperWidth : e.width,
		lowerWidth: "lowerWidth" in e ? e.lowerWidth : e.width,
		width: e.width,
		height: e.height
	};
}
//#endregion
//#region node_modules/recharts/es6/cartesian/getCartesianPosition.js
function hc(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function gc(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? hc(Object(n), !0).forEach(function(t) {
			_c(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : hc(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function _c(e, t, n) {
	return (t = vc(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function vc(e) {
	var t = yc(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function yc(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var bc = (e) => {
	var t = e.viewBox, n = e.position, r = e.offset, i = r === void 0 ? 0 : r, a = e.parentViewBox, o = e.clamp, s = mc(t), c = s.x, l = s.y, u = s.height, d = s.upperWidth, f = s.lowerWidth, p = c, m = c + (d - f) / 2, h = (p + m) / 2, g = (d + f) / 2, _ = p + d / 2, v = u >= 0 ? 1 : -1, y = v * i, b = v > 0 ? "end" : "start", x = v > 0 ? "start" : "end", S = d >= 0 ? 1 : -1, C = S * i, w = S > 0 ? "end" : "start", T = S > 0 ? "start" : "end", E = a;
	if (n === "top") {
		var D = {
			x: p + d / 2,
			y: l - y,
			horizontalAnchor: "middle",
			verticalAnchor: b
		};
		return o && E && (D.height = Math.max(l - E.y, 0), D.width = d), D;
	}
	if (n === "bottom") {
		var O = {
			x: m + f / 2,
			y: l + u + y,
			horizontalAnchor: "middle",
			verticalAnchor: x
		};
		return o && E && (O.height = Math.max(E.y + E.height - (l + u), 0), O.width = f), O;
	}
	if (n === "left") {
		var k = {
			x: h - C,
			y: l + u / 2,
			horizontalAnchor: w,
			verticalAnchor: "middle"
		};
		return o && E && (k.width = Math.max(k.x - E.x, 0), k.height = u), k;
	}
	if (n === "right") {
		var A = {
			x: h + g + C,
			y: l + u / 2,
			horizontalAnchor: T,
			verticalAnchor: "middle"
		};
		return o && E && (A.width = Math.max(E.x + E.width - A.x, 0), A.height = u), A;
	}
	var j = o && E ? {
		width: g,
		height: u
	} : {};
	return n === "insideLeft" ? gc({
		x: h + C,
		y: l + u / 2,
		horizontalAnchor: T,
		verticalAnchor: "middle"
	}, j) : n === "insideRight" ? gc({
		x: h + g - C,
		y: l + u / 2,
		horizontalAnchor: w,
		verticalAnchor: "middle"
	}, j) : n === "insideTop" ? gc({
		x: p + d / 2,
		y: l + y,
		horizontalAnchor: "middle",
		verticalAnchor: x
	}, j) : n === "insideBottom" ? gc({
		x: m + f / 2,
		y: l + u - y,
		horizontalAnchor: "middle",
		verticalAnchor: b
	}, j) : n === "insideTopLeft" ? gc({
		x: p + C,
		y: l + y,
		horizontalAnchor: T,
		verticalAnchor: x
	}, j) : n === "insideTopRight" ? gc({
		x: p + d - C,
		y: l + y,
		horizontalAnchor: w,
		verticalAnchor: x
	}, j) : n === "insideBottomLeft" ? gc({
		x: m + C,
		y: l + u - y,
		horizontalAnchor: T,
		verticalAnchor: b
	}, j) : n === "insideBottomRight" ? gc({
		x: m + f - C,
		y: l + u - y,
		horizontalAnchor: w,
		verticalAnchor: b
	}, j) : n && typeof n == "object" && (V(n.x) || nc(n.x)) && (V(n.y) || nc(n.y)) ? gc({
		x: c + oc(n.x, g),
		y: l + oc(n.y, u),
		horizontalAnchor: "end",
		verticalAnchor: "end"
	}, j) : gc({
		x: _,
		y: l + u / 2,
		horizontalAnchor: "middle",
		verticalAnchor: "middle"
	}, j);
}, xc = [
	"top",
	"left",
	"right",
	"bottom"
];
function Sc(e) {
	return e == null ? !1 : typeof e == "object" || xc.includes(e);
}
//#endregion
//#region node_modules/recharts/es6/context/legendPortalContext.js
var Cc = /*#__PURE__*/ (0, x.createContext)(null);
//#endregion
//#region node_modules/d3-shape/src/constant.js
function wc(e) {
	return function() {
		return e;
	};
}
//#endregion
//#region node_modules/d3-path/src/path.js
var Tc = Math.PI, Ec = 2 * Tc, Dc = 1e-6, Oc = Ec - Dc;
function kc(e) {
	this._ += e[0];
	for (let t = 1, n = e.length; t < n; ++t) this._ += arguments[t] + e[t];
}
function Ac(e) {
	let t = Math.floor(e);
	if (!(t >= 0)) throw Error(`invalid digits: ${e}`);
	if (t > 15) return kc;
	let n = 10 ** t;
	return function(e) {
		this._ += e[0];
		for (let t = 1, r = e.length; t < r; ++t) this._ += Math.round(arguments[t] * n) / n + e[t];
	};
}
var jc = class {
	constructor(e) {
		this._x0 = this._y0 = this._x1 = this._y1 = null, this._ = "", this._append = e == null ? kc : Ac(e);
	}
	moveTo(e, t) {
		this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +t}`;
	}
	closePath() {
		this._x1 !== null && (this._x1 = this._x0, this._y1 = this._y0, this._append`Z`);
	}
	lineTo(e, t) {
		this._append`L${this._x1 = +e},${this._y1 = +t}`;
	}
	quadraticCurveTo(e, t, n, r) {
		this._append`Q${+e},${+t},${this._x1 = +n},${this._y1 = +r}`;
	}
	bezierCurveTo(e, t, n, r, i, a) {
		this._append`C${+e},${+t},${+n},${+r},${this._x1 = +i},${this._y1 = +a}`;
	}
	arcTo(e, t, n, r, i) {
		if (e = +e, t = +t, n = +n, r = +r, i = +i, i < 0) throw Error(`negative radius: ${i}`);
		let a = this._x1, o = this._y1, s = n - e, c = r - t, l = a - e, u = o - t, d = l * l + u * u;
		if (this._x1 === null) this._append`M${this._x1 = e},${this._y1 = t}`;
		else if (d > Dc) {
			if (!(Math.abs(u * s - c * l) > Dc) || !i) this._append`L${this._x1 = e},${this._y1 = t}`;
			else {
				let f = n - a, p = r - o, m = s * s + c * c, h = f * f + p * p, g = Math.sqrt(m), _ = Math.sqrt(d), v = i * Math.tan((Tc - Math.acos((m + d - h) / (2 * g * _))) / 2), y = v / _, b = v / g;
				Math.abs(y - 1) > Dc && this._append`L${e + y * l},${t + y * u}`, this._append`A${i},${i},0,0,${+(u * f > l * p)},${this._x1 = e + b * s},${this._y1 = t + b * c}`;
			}
		}
	}
	arc(e, t, n, r, i, a) {
		if (e = +e, t = +t, n = +n, a = !!a, n < 0) throw Error(`negative radius: ${n}`);
		let o = n * Math.cos(r), s = n * Math.sin(r), c = e + o, l = t + s, u = 1 ^ a, d = a ? r - i : i - r;
		this._x1 === null ? this._append`M${c},${l}` : (Math.abs(this._x1 - c) > Dc || Math.abs(this._y1 - l) > Dc) && this._append`L${c},${l}`, n && (d < 0 && (d = d % Ec + Ec), d > Oc ? this._append`A${n},${n},0,1,${u},${e - o},${t - s}A${n},${n},0,1,${u},${this._x1 = c},${this._y1 = l}` : d > Dc && this._append`A${n},${n},0,${+(d >= Tc)},${u},${this._x1 = e + n * Math.cos(i)},${this._y1 = t + n * Math.sin(i)}`);
	}
	rect(e, t, n, r) {
		this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +t}h${n = +n}v${+r}h${-n}Z`;
	}
	toString() {
		return this._;
	}
};
jc.prototype;
//#endregion
//#region node_modules/d3-shape/src/path.js
function Mc(e) {
	let t = 3;
	return e.digits = function(n) {
		if (!arguments.length) return t;
		if (n == null) t = null;
		else {
			let e = Math.floor(n);
			if (!(e >= 0)) throw RangeError(`invalid digits: ${n}`);
			t = e;
		}
		return e;
	}, () => new jc(t);
}
Array.prototype.slice;
function Nc(e) {
	return typeof e == "object" && "length" in e ? e : Array.from(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/linear.js
function Pc(e) {
	this._context = e;
}
Pc.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._point = 0;
	},
	lineEnd: function() {
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1: this._point = 2;
			default: this._context.lineTo(e, t);
		}
	}
};
function Fc(e) {
	return new Pc(e);
}
//#endregion
//#region node_modules/d3-shape/src/point.js
function Ic(e) {
	return e[0];
}
function Lc(e) {
	return e[1];
}
//#endregion
//#region node_modules/d3-shape/src/line.js
function Rc(e, t) {
	var n = wc(!0), r = null, i = Fc, a = null, o = Mc(s);
	e = typeof e == "function" ? e : e === void 0 ? Ic : wc(e), t = typeof t == "function" ? t : t === void 0 ? Lc : wc(t);
	function s(s) {
		var c, l = (s = Nc(s)).length, u, d = !1, f;
		for (r ?? (a = i(f = o())), c = 0; c <= l; ++c) !(c < l && n(u = s[c], c, s)) === d && ((d = !d) ? a.lineStart() : a.lineEnd()), d && a.point(+e(u, c, s), +t(u, c, s));
		if (f) return a = null, f + "" || null;
	}
	return s.x = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : wc(+t), s) : e;
	}, s.y = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : wc(+e), s) : t;
	}, s.defined = function(e) {
		return arguments.length ? (n = typeof e == "function" ? e : wc(!!e), s) : n;
	}, s.curve = function(e) {
		return arguments.length ? (i = e, r != null && (a = i(r)), s) : i;
	}, s.context = function(e) {
		return arguments.length ? (e == null ? r = a = null : a = i(r = e), s) : r;
	}, s;
}
//#endregion
//#region node_modules/d3-shape/src/area.js
function zc(e, t, n) {
	var r = null, i = wc(!0), a = null, o = Fc, s = null, c = Mc(l);
	e = typeof e == "function" ? e : e === void 0 ? Ic : wc(+e), t = typeof t == "function" ? t : wc(t === void 0 ? 0 : +t), n = typeof n == "function" ? n : n === void 0 ? Lc : wc(+n);
	function l(l) {
		var u, d, f, p = (l = Nc(l)).length, m, h = !1, g, _ = Array(p), v = Array(p);
		for (a ?? (s = o(g = c())), u = 0; u <= p; ++u) {
			if (!(u < p && i(m = l[u], u, l)) === h) {
				if (h = !h) d = u, s.areaStart(), s.lineStart();
				else {
					for (s.lineEnd(), s.lineStart(), f = u - 1; f >= d; --f) s.point(_[f], v[f]);
					s.lineEnd(), s.areaEnd();
				}
			}
			h && (_[u] = +e(m, u, l), v[u] = +t(m, u, l), s.point(r ? +r(m, u, l) : _[u], n ? +n(m, u, l) : v[u]));
		}
		if (g) return s = null, g + "" || null;
	}
	function u() {
		return Rc().defined(i).curve(o).context(a);
	}
	return l.x = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : wc(+t), r = null, l) : e;
	}, l.x0 = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : wc(+t), l) : e;
	}, l.x1 = function(e) {
		return arguments.length ? (r = e == null ? null : typeof e == "function" ? e : wc(+e), l) : r;
	}, l.y = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : wc(+e), n = null, l) : t;
	}, l.y0 = function(e) {
		return arguments.length ? (t = typeof e == "function" ? e : wc(+e), l) : t;
	}, l.y1 = function(e) {
		return arguments.length ? (n = e == null ? null : typeof e == "function" ? e : wc(+e), l) : n;
	}, l.lineX0 = l.lineY0 = function() {
		return u().x(e).y(t);
	}, l.lineY1 = function() {
		return u().x(e).y(n);
	}, l.lineX1 = function() {
		return u().x(r).y(t);
	}, l.defined = function(e) {
		return arguments.length ? (i = typeof e == "function" ? e : wc(!!e), l) : i;
	}, l.curve = function(e) {
		return arguments.length ? (o = e, a != null && (s = o(a)), l) : o;
	}, l.context = function(e) {
		return arguments.length ? (e == null ? a = s = null : s = o(a = e), l) : a;
	}, l;
}
//#endregion
//#region node_modules/d3-shape/src/curve/bump.js
var Bc = class {
	constructor(e, t) {
		this._context = e, this._x = t;
	}
	areaStart() {
		this._line = 0;
	}
	areaEnd() {
		this._line = NaN;
	}
	lineStart() {
		this._point = 0;
	}
	lineEnd() {
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	}
	point(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1: this._point = 2;
			default: this._x ? this._context.bezierCurveTo(this._x0 = (this._x0 + e) / 2, this._y0, this._x0, t, e, t) : this._context.bezierCurveTo(this._x0, this._y0 = (this._y0 + t) / 2, e, this._y0, e, t);
		}
		this._x0 = e, this._y0 = t;
	}
};
function Vc(e) {
	return new Bc(e, !0);
}
function Hc(e) {
	return new Bc(e, !1);
}
//#endregion
//#region node_modules/d3-shape/src/noop.js
function Uc() {}
//#endregion
//#region node_modules/d3-shape/src/curve/basis.js
function Wc(e, t, n) {
	e._context.bezierCurveTo((2 * e._x0 + e._x1) / 3, (2 * e._y0 + e._y1) / 3, (e._x0 + 2 * e._x1) / 3, (e._y0 + 2 * e._y1) / 3, (e._x0 + 4 * e._x1 + t) / 6, (e._y0 + 4 * e._y1 + n) / 6);
}
function Gc(e) {
	this._context = e;
}
Gc.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._y0 = this._y1 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 3: Wc(this, this._x1, this._y1);
			case 2: this._context.lineTo(this._x1, this._y1);
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1:
				this._point = 2;
				break;
			case 2: this._point = 3, this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6);
			default: Wc(this, e, t);
		}
		this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t;
	}
};
function Kc(e) {
	return new Gc(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/basisClosed.js
function qc(e) {
	this._context = e;
}
qc.prototype = {
	areaStart: Uc,
	areaEnd: Uc,
	lineStart: function() {
		this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 1:
				this._context.moveTo(this._x2, this._y2), this._context.closePath();
				break;
			case 2:
				this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3), this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3), this._context.closePath();
				break;
			case 3: this.point(this._x2, this._y2), this.point(this._x3, this._y3), this.point(this._x4, this._y4);
		}
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._x2 = e, this._y2 = t;
				break;
			case 1:
				this._point = 2, this._x3 = e, this._y3 = t;
				break;
			case 2:
				this._point = 3, this._x4 = e, this._y4 = t, this._context.moveTo((this._x0 + 4 * this._x1 + e) / 6, (this._y0 + 4 * this._y1 + t) / 6);
				break;
			default: Wc(this, e, t);
		}
		this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t;
	}
};
function Jc(e) {
	return new qc(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/basisOpen.js
function Yc(e) {
	this._context = e;
}
Yc.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._y0 = this._y1 = NaN, this._point = 0;
	},
	lineEnd: function() {
		(this._line || this._line !== 0 && this._point === 3) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1;
				break;
			case 1:
				this._point = 2;
				break;
			case 2:
				this._point = 3;
				var n = (this._x0 + 4 * this._x1 + e) / 6, r = (this._y0 + 4 * this._y1 + t) / 6;
				this._line ? this._context.lineTo(n, r) : this._context.moveTo(n, r);
				break;
			case 3: this._point = 4;
			default: Wc(this, e, t);
		}
		this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t;
	}
};
function Xc(e) {
	return new Yc(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/linearClosed.js
function Zc(e) {
	this._context = e;
}
Zc.prototype = {
	areaStart: Uc,
	areaEnd: Uc,
	lineStart: function() {
		this._point = 0;
	},
	lineEnd: function() {
		this._point && this._context.closePath();
	},
	point: function(e, t) {
		e = +e, t = +t, this._point ? this._context.lineTo(e, t) : (this._point = 1, this._context.moveTo(e, t));
	}
};
function Qc(e) {
	return new Zc(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/monotone.js
function $c(e) {
	return e < 0 ? -1 : 1;
}
function el(e, t, n) {
	var r = e._x1 - e._x0, i = t - e._x1, a = (e._y1 - e._y0) / (r || i < 0 && -0), o = (n - e._y1) / (i || r < 0 && -0), s = (a * i + o * r) / (r + i);
	return ($c(a) + $c(o)) * Math.min(Math.abs(a), Math.abs(o), .5 * Math.abs(s)) || 0;
}
function tl(e, t) {
	var n = e._x1 - e._x0;
	return n ? (3 * (e._y1 - e._y0) / n - t) / 2 : t;
}
function nl(e, t, n) {
	var r = e._x0, i = e._y0, a = e._x1, o = e._y1, s = (a - r) / 3;
	e._context.bezierCurveTo(r + s, i + s * t, a - s, o - s * n, a, o);
}
function rl(e) {
	this._context = e;
}
rl.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN, this._point = 0;
	},
	lineEnd: function() {
		switch (this._point) {
			case 2:
				this._context.lineTo(this._x1, this._y1);
				break;
			case 3: nl(this, this._t0, tl(this, this._t0));
		}
		(this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line = 1 - this._line;
	},
	point: function(e, t) {
		var n = NaN;
		if (e = +e, t = +t, e !== this._x1 || t !== this._y1) {
			switch (this._point) {
				case 0:
					this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
					break;
				case 1:
					this._point = 2;
					break;
				case 2:
					this._point = 3, nl(this, tl(this, n = el(this, e, t)), n);
					break;
				default: nl(this, this._t0, n = el(this, e, t));
			}
			this._x0 = this._x1, this._x1 = e, this._y0 = this._y1, this._y1 = t, this._t0 = n;
		}
	}
};
function il(e) {
	this._context = new al(e);
}
(il.prototype = Object.create(rl.prototype)).point = function(e, t) {
	rl.prototype.point.call(this, t, e);
};
function al(e) {
	this._context = e;
}
al.prototype = {
	moveTo: function(e, t) {
		this._context.moveTo(t, e);
	},
	closePath: function() {
		this._context.closePath();
	},
	lineTo: function(e, t) {
		this._context.lineTo(t, e);
	},
	bezierCurveTo: function(e, t, n, r, i, a) {
		this._context.bezierCurveTo(t, e, r, n, a, i);
	}
};
function ol(e) {
	return new rl(e);
}
function sl(e) {
	return new il(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/natural.js
function cl(e) {
	this._context = e;
}
cl.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x = [], this._y = [];
	},
	lineEnd: function() {
		var e = this._x, t = this._y, n = e.length;
		if (n) {
			if (this._line ? this._context.lineTo(e[0], t[0]) : this._context.moveTo(e[0], t[0]), n === 2) this._context.lineTo(e[1], t[1]);
			else for (var r = ll(e), i = ll(t), a = 0, o = 1; o < n; ++a, ++o) this._context.bezierCurveTo(r[0][a], i[0][a], r[1][a], i[1][a], e[o], t[o]);
		}
		(this._line || this._line !== 0 && n === 1) && this._context.closePath(), this._line = 1 - this._line, this._x = this._y = null;
	},
	point: function(e, t) {
		this._x.push(+e), this._y.push(+t);
	}
};
function ll(e) {
	var t, n = e.length - 1, r, i = Array(n), a = Array(n), o = Array(n);
	for (i[0] = 0, a[0] = 2, o[0] = e[0] + 2 * e[1], t = 1; t < n - 1; ++t) i[t] = 1, a[t] = 4, o[t] = 4 * e[t] + 2 * e[t + 1];
	for (i[n - 1] = 2, a[n - 1] = 7, o[n - 1] = 8 * e[n - 1] + e[n], t = 1; t < n; ++t) r = i[t] / a[t - 1], a[t] -= r, o[t] -= r * o[t - 1];
	for (i[n - 1] = o[n - 1] / a[n - 1], t = n - 2; t >= 0; --t) i[t] = (o[t] - i[t + 1]) / a[t];
	for (a[n - 1] = (e[n] + i[n - 1]) / 2, t = 0; t < n - 1; ++t) a[t] = 2 * e[t + 1] - i[t + 1];
	return [i, a];
}
function ul(e) {
	return new cl(e);
}
//#endregion
//#region node_modules/d3-shape/src/curve/step.js
function dl(e, t) {
	this._context = e, this._t = t;
}
dl.prototype = {
	areaStart: function() {
		this._line = 0;
	},
	areaEnd: function() {
		this._line = NaN;
	},
	lineStart: function() {
		this._x = this._y = NaN, this._point = 0;
	},
	lineEnd: function() {
		0 < this._t && this._t < 1 && this._point === 2 && this._context.lineTo(this._x, this._y), (this._line || this._line !== 0 && this._point === 1) && this._context.closePath(), this._line >= 0 && (this._t = 1 - this._t, this._line = 1 - this._line);
	},
	point: function(e, t) {
		switch (e = +e, t = +t, this._point) {
			case 0:
				this._point = 1, this._line ? this._context.lineTo(e, t) : this._context.moveTo(e, t);
				break;
			case 1: this._point = 2;
			default: if (this._t <= 0) this._context.lineTo(this._x, t), this._context.lineTo(e, t);
			else {
				var n = this._x * (1 - this._t) + e * this._t;
				this._context.lineTo(n, this._y), this._context.lineTo(n, t);
			}
		}
		this._x = e, this._y = t;
	}
};
function fl(e) {
	return new dl(e, .5);
}
function pl(e) {
	return new dl(e, 0);
}
function ml(e) {
	return new dl(e, 1);
}
//#endregion
//#region node_modules/d3-shape/src/offset/none.js
function hl(e, t) {
	if ((o = e.length) > 1) for (var n = 1, r, i, a = e[t[0]], o, s = a.length; n < o; ++n) for (i = a, a = e[t[n]], r = 0; r < s; ++r) a[r][1] += a[r][0] = isNaN(i[r][1]) ? i[r][0] : i[r][1];
}
//#endregion
//#region node_modules/d3-shape/src/order/none.js
function gl(e) {
	for (var t = e.length, n = Array(t); --t >= 0;) n[t] = t;
	return n;
}
//#endregion
//#region node_modules/d3-shape/src/stack.js
function _l(e, t) {
	return e[t];
}
function vl(e) {
	let t = [];
	return t.key = e, t;
}
function yl() {
	var e = wc([]), t = gl, n = hl, r = _l;
	function i(i) {
		var a = Array.from(e.apply(this, arguments), vl), o, s = a.length, c = -1, l;
		for (let e of i) for (o = 0, ++c; o < s; ++o) (a[o][c] = [0, +r(e, a[o].key, c, i)]).data = e;
		for (o = 0, l = Nc(t(a)); o < s; ++o) a[l[o]].index = o;
		return n(a, l), a;
	}
	return i.keys = function(t) {
		return arguments.length ? (e = typeof t == "function" ? t : wc(Array.from(t)), i) : e;
	}, i.value = function(e) {
		return arguments.length ? (r = typeof e == "function" ? e : wc(+e), i) : r;
	}, i.order = function(e) {
		return arguments.length ? (t = e == null ? gl : typeof e == "function" ? e : wc(Array.from(e)), i) : t;
	}, i.offset = function(e) {
		return arguments.length ? (n = e ?? hl, i) : n;
	}, i;
}
//#endregion
//#region node_modules/d3-shape/src/offset/expand.js
function bl(e, t) {
	if ((r = e.length) > 0) {
		for (var n, r, i = 0, a = e[0].length, o; i < a; ++i) {
			for (o = n = 0; n < r; ++n) o += e[n][i][1] || 0;
			if (o) for (n = 0; n < r; ++n) e[n][i][1] /= o;
		}
		hl(e, t);
	}
}
//#endregion
//#region node_modules/d3-shape/src/offset/silhouette.js
function xl(e, t) {
	if ((i = e.length) > 0) {
		for (var n = 0, r = e[t[0]], i, a = r.length; n < a; ++n) {
			for (var o = 0, s = 0; o < i; ++o) s += e[o][n][1] || 0;
			r[n][1] += r[n][0] = -s / 2;
		}
		hl(e, t);
	}
}
//#endregion
//#region node_modules/d3-shape/src/offset/wiggle.js
function Sl(e, t) {
	if ((o = e.length) > 0 && (a = (i = e[t[0]]).length) > 0) {
		for (var n = 0, r = 1, i, a, o; r < a; ++r) {
			for (var s = 0, c = 0, l = 0; s < o; ++s) {
				for (var u = e[t[s]], d = u[r][1] || 0, f = (d - (u[r - 1][1] || 0)) / 2, p = 0; p < s; ++p) {
					var m = e[t[p]], h = m[r][1] || 0, g = m[r - 1][1] || 0;
					f += h - g;
				}
				c += d, l += f * d;
			}
			i[r - 1][1] += i[r - 1][0] = n, c && (n -= l / c);
		}
		i[r - 1][1] += i[r - 1][0] = n, hl(e, t);
	}
}
//#endregion
//#region node_modules/recharts/es6/util/types.js
var Cl = (e) => "radius" in e && "startAngle" in e && "endAngle" in e, wl = (e, t) => {
	if (!e || typeof e == "function" || typeof e == "boolean") return null;
	var n = e;
	if (/*#__PURE__*/ (0, x.isValidElement)(e) && (n = e.props), typeof n != "object" && typeof n != "function") return null;
	var r = {};
	return Object.keys(n).forEach((e) => {
		ws(e) && typeof n[e] == "function" && (r[e] = t || ((t) => n[e](n, t)));
	}), r;
}, Tl = (e, t, n) => (r) => (e(t, n, r), null), El = (e, t, n) => {
	if (e === null || typeof e != "object" && typeof e != "function") return null;
	var r = null;
	return Object.keys(e).forEach((i) => {
		var a = e[i];
		ws(i) && typeof a == "function" && (r ||= {}, r[i] = Tl(a, t, n));
	}), r;
};
//#endregion
//#region node_modules/recharts/es6/util/resolveDefaultProps.js
function Dl(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Ol(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Dl(Object(n), !0).forEach(function(t) {
			kl(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Dl(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function kl(e, t, n) {
	return (t = Al(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Al(e) {
	var t = jl(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function jl(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Ml(e, t) {
	var n = Ol({}, e), r = t;
	return Object.keys(t).reduce((e, t) => (e[t] === void 0 && r[t] !== void 0 && (e[t] = r[t]), e), n);
}
//#endregion
//#region node_modules/es-toolkit/dist/array/uniqBy.mjs
function Nl(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r = 0; r < e.length; r++) {
		let i = e[r], a = t(i, r, e);
		n.has(a) || n.set(a, i);
	}
	return Array.from(n.values());
}
//#endregion
//#region node_modules/es-toolkit/dist/function/ary.mjs
function Pl(e, t) {
	return function(...n) {
		return e.apply(this, n.slice(0, t));
	};
}
//#endregion
//#region node_modules/es-toolkit/dist/function/identity.mjs
function Fl(e) {
	return e;
}
//#endregion
//#region node_modules/es-toolkit/dist/predicate/isLength.mjs
function Il(e) {
	return Number.isSafeInteger(e) && e >= 0;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isArrayLike.mjs
function Ll(e) {
	return e != null && typeof e != "function" && Il(e.length);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/object/property.mjs
function Rl(e) {
	return function(t) {
		return Ys(t, e);
	};
}
//#endregion
//#region node_modules/es-toolkit/dist/predicate/isPrimitive.mjs
function zl(e) {
	return e == null || typeof e != "object" && typeof e != "function";
}
//#endregion
//#region node_modules/es-toolkit/dist/predicate/isTypedArray.mjs
function Bl(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function Vl(e) {
	return Object.getOwnPropertySymbols(e).filter((t) => Object.prototype.propertyIsEnumerable.call(e, t));
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function Hl(e) {
	return e == null ? e === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var Ul = "[object RegExp]", Wl = "[object String]", Gl = "[object Number]", Kl = "[object Boolean]", ql = "[object Arguments]", Jl = "[object Symbol]", Yl = "[object Date]", Xl = "[object Map]", Zl = "[object Set]", Ql = "[object Array]", $l = "[object ArrayBuffer]", eu = "[object Object]", tu = "[object DataView]", nu = "[object Uint8Array]", ru = "[object Uint8ClampedArray]", iu = "[object Uint16Array]", au = "[object Uint32Array]", ou = "[object Int8Array]", su = "[object Int16Array]", cu = "[object Int32Array]", lu = "[object Float32Array]", uu = "[object Float64Array]", du = typeof globalThis == "object" && globalThis || typeof window == "object" && window || typeof self == "object" && self || typeof global == "object" && global || (function() {
	return this;
})();
//#endregion
//#region node_modules/es-toolkit/dist/predicate/isBuffer.mjs
function fu(e) {
	return du.Buffer !== void 0 && du.Buffer.isBuffer(e);
}
//#endregion
//#region node_modules/es-toolkit/dist/object/cloneDeepWith.mjs
function pu(e, t) {
	return mu(e, void 0, e, /* @__PURE__ */ new Map(), t);
}
function mu(e, t, n, r = /* @__PURE__ */ new Map(), i = void 0) {
	let a = i?.(e, t, n, r);
	if (a !== void 0) return a;
	if (zl(e)) return e;
	if (r.has(e)) return r.get(e);
	if (Array.isArray(e)) {
		let t = Array(e.length);
		r.set(e, t);
		for (let a = 0; a < e.length; a++) t[a] = mu(e[a], a, n, r, i);
		return Object.hasOwn(e, "index") && (t.index = e.index), Object.hasOwn(e, "input") && (t.input = e.input), t;
	}
	if (e instanceof Date) return new Date(e.getTime());
	if (e instanceof RegExp) {
		let t = new RegExp(e.source, e.flags);
		return t.lastIndex = e.lastIndex, t;
	}
	if (e instanceof Map) {
		let t = /* @__PURE__ */ new Map();
		r.set(e, t);
		for (let [a, o] of e) t.set(a, mu(o, a, n, r, i));
		return t;
	}
	if (e instanceof Set) {
		let t = /* @__PURE__ */ new Set();
		r.set(e, t);
		for (let a of e) t.add(mu(a, void 0, n, r, i));
		return t;
	}
	if (fu(e)) return e.subarray();
	if (Bl(e)) {
		let t = new (Object.getPrototypeOf(e)).constructor(e.length);
		r.set(e, t);
		for (let a = 0; a < e.length; a++) t[a] = mu(e[a], a, n, r, i);
		return t;
	}
	if (e instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && e instanceof SharedArrayBuffer) return e.slice(0);
	if (e instanceof DataView) {
		let t = new DataView(e.buffer.slice(0), e.byteOffset, e.byteLength);
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (typeof File < "u" && e instanceof File) {
		let t = new File([e], e.name, { type: e.type });
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (typeof Blob < "u" && e instanceof Blob) {
		let t = new Blob([e], { type: e.type });
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (e instanceof Error) {
		let t = structuredClone(e);
		return r.set(e, t), t.message = e.message, t.name = e.name, t.stack = e.stack, t.cause = e.cause, t.constructor = e.constructor, hu(t, e, n, r, i), t;
	}
	if (e instanceof Boolean) {
		let t = new Boolean(e.valueOf());
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (e instanceof Number) {
		let t = new Number(e.valueOf());
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (e instanceof String) {
		let t = new String(e.valueOf());
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	if (typeof e == "object" && gu(e)) {
		let t = Object.create(Object.getPrototypeOf(e));
		return r.set(e, t), hu(t, e, n, r, i), t;
	}
	return e;
}
function hu(e, t, n = e, r, i) {
	let a = [...Object.keys(t), ...Vl(t)];
	for (let o = 0; o < a.length; o++) {
		let s = a[o], c = Object.getOwnPropertyDescriptor(e, s);
		(c == null || c.writable) && (e[s] = mu(t[s], s, n, r, i));
	}
}
function gu(e) {
	switch (Hl(e)) {
		case ql:
		case Ql:
		case $l:
		case tu:
		case Kl:
		case Yl:
		case lu:
		case uu:
		case ou:
		case su:
		case cu:
		case Xl:
		case Gl:
		case eu:
		case Ul:
		case Zl:
		case Wl:
		case Jl:
		case nu:
		case ru:
		case iu:
		case au: return !0;
		default: return !1;
	}
}
//#endregion
//#region node_modules/es-toolkit/dist/object/cloneDeep.mjs
function _u(e) {
	return mu(e, void 0, e, /* @__PURE__ */ new Map(), void 0);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/eq.mjs
function vu(e, t) {
	return e === t || Number.isNaN(e) && Number.isNaN(t);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isObject.mjs
function yu(e) {
	return e !== null && (typeof e == "object" || typeof e == "function");
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isMatchWith.mjs
function bu(e, t, n) {
	return typeof n == "function" ? xu(e, t, function e(t, r, i, a, o, s) {
		let c = n(t, r, i, a, o, s);
		return c === void 0 ? xu(t, r, e, s, !1) : !!c;
	}, /* @__PURE__ */ new Map(), !0) : bu(e, t, () => void 0);
}
function xu(e, t, n, r, i = !1) {
	if (t === e) return !0;
	switch (typeof t) {
		case "object": return Su(e, t, n, r, i);
		case "function": return Object.keys(t).length > 0 ? xu(e, { ...t }, n, r, i) : vu(e, t);
		default: return yu(e) && i ? typeof t != "string" || t === "" : vu(e, t);
	}
}
function Su(e, t, n, r, i = !1) {
	if (t == null) return !0;
	if (Array.isArray(t)) return wu(e, t, n, r);
	if (t instanceof Map) return Cu(e, t, n, r);
	if (t instanceof Set) return Tu(e, t, n, r);
	let a = Object.keys(t);
	if (e == null) return i && a.length === 0;
	if (i) zl(e) && (e = Object(e));
	else {
		let t = Hl(e);
		if (t !== "[object Object]" && t !== "[object Arguments]") return !1;
	}
	if (a.length === 0) return !0;
	if (r?.has(t)) return r.get(t) === e;
	r?.set(t, e);
	try {
		for (let i = 0; i < a.length; i++) {
			let o = a[i];
			if (!(o in e) || t[o] === void 0 && e[o] !== void 0 || t[o] === null && e[o] !== null || !n(e[o], t[o], o, e, t, r)) return !1;
		}
		return !0;
	} finally {
		r?.delete(t);
	}
}
function Cu(e, t, n, r) {
	if (t.size === 0) return !0;
	if (!(e instanceof Map)) return !1;
	for (let [i, a] of t.entries()) if (n(e.get(i), a, i, e, t, r) === !1) return !1;
	return !0;
}
function wu(e, t, n, r) {
	if (t.length === 0) return !0;
	if (!Array.isArray(e)) return !1;
	let i = /* @__PURE__ */ new Set();
	for (let a = 0; a < t.length; a++) {
		let o = t[a], s = !1;
		for (let c = 0; c < e.length; c++) {
			if (i.has(c)) continue;
			let l = e[c], u = !1;
			if (n(l, o, a, e, t, r) && (u = !0), u) {
				i.add(c), s = !0;
				break;
			}
		}
		if (!s) return !1;
	}
	return !0;
}
function Tu(e, t, n, r) {
	return t.size === 0 || e instanceof Set && wu([...e], [...t], n, r);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isMatch.mjs
function Eu(e, t) {
	return bu(e, t, () => void 0);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/matches.mjs
function Du(e) {
	return e = _u(e), (t) => Eu(t, e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/object/cloneDeepWith.mjs
function Ou(e, t) {
	return pu(e, (n, r, i, a) => {
		let o = t?.(n, r, i, a);
		if (o !== void 0) return o;
		if (typeof e == "object") {
			if (Hl(e) === "[object Object]" && typeof e.constructor != "function") {
				let t = {};
				return a.set(e, t), hu(t, e, i, a), t;
			}
			switch (Object.prototype.toString.call(e)) {
				case Gl:
				case Wl:
				case Kl: {
					let t = new e.constructor(e?.valueOf());
					return hu(t, e), t;
				}
				case ql: {
					let t = {};
					return hu(t, e), t.length = e.length, t[Symbol.iterator] = e[Symbol.iterator], t;
				}
				default: return;
			}
		}
	});
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/object/cloneDeep.mjs
function ku(e) {
	return Ou(e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/isIndex.mjs
var Au = /^(?:0|[1-9]\d*)$/;
function ju(e, t = 2 ** 53 - 1) {
	switch (typeof e) {
		case "number": return Number.isInteger(e) && e >= 0 && e < t;
		case "symbol": return !1;
		case "string": return Au.test(e);
	}
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/isArguments.mjs
function Mu(e) {
	return typeof e == "object" && !!e && Hl(e) === "[object Arguments]";
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/object/has.mjs
function Nu(e, t) {
	let n;
	if (n = Array.isArray(t) ? t : typeof t == "string" && Us(t) && !(t in Object(e)) ? Js(t) : [t], n.length === 0) return !1;
	let r = e;
	for (let e = 0; e < n.length; e++) {
		let t = Ws(n[e]);
		if ((r == null || !Object.hasOwn(r, t)) && !((Array.isArray(r) || Mu(r)) && ju(t) && Number(t) < r.length)) return !1;
		r = r[t];
	}
	return !0;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/predicate/matchesProperty.mjs
function Pu(e, t) {
	switch (typeof e) {
		case "object":
			Object.is(e?.valueOf(), -0) && (e = "-0");
			break;
		case "number": e = Ws(e);
	}
	return t = ku(t), function(n) {
		let r = Ys(n, e);
		return r === void 0 ? Nu(n, e) : t === void 0 ? r === void 0 : Eu(r, t);
	};
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/iteratee.mjs
function Fu(e) {
	if (e == null) return Fl;
	switch (typeof e) {
		case "function": return e;
		case "object": return Array.isArray(e) && e.length === 2 ? Pu(e[0], e[1]) : Du(e);
		default: return Rl(e);
	}
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/normalizeZero.mjs
function Iu(e) {
	return e === 0 ? 0 : e;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/array/uniqBy.mjs
function Lu(e, t = Fl) {
	return Ll(e) ? Nl(Array.from(e), Pl(Fu(t), 1)).map(Iu) : [];
}
//#endregion
//#region node_modules/recharts/es6/util/payload/getUniqPayload.js
function Ru(e, t, n) {
	return t === !0 ? Lu(e, n) : typeof t == "function" ? Lu(e, t) : e;
}
//#endregion
//#region node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js
var zu = /* @__PURE__ */ o(((e) => {
	var t = d();
	function n(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var r = typeof Object.is == "function" ? Object.is : n, i = t.useState, a = t.useEffect, o = t.useLayoutEffect, s = t.useDebugValue;
	function c(e, t) {
		var n = t(), r = i({ inst: {
			value: n,
			getSnapshot: t
		} }), c = r[0].inst, u = r[1];
		return o(function() {
			c.value = n, c.getSnapshot = t, l(c) && u({ inst: c });
		}, [
			e,
			n,
			t
		]), a(function() {
			return l(c) && u({ inst: c }), e(function() {
				l(c) && u({ inst: c });
			});
		}, [e]), s(n), n;
	}
	function l(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !r(e, n);
		} catch {
			return !0;
		}
	}
	function u(e, t) {
		return t();
	}
	var f = typeof window > "u" || window.document === void 0 || window.document.createElement === void 0 ? u : c;
	e.useSyncExternalStore = t.useSyncExternalStore === void 0 ? f : t.useSyncExternalStore;
})), Bu = /* @__PURE__ */ o(((e, t) => {
	t.exports = zu();
})), Vu = /* @__PURE__ */ o(((e) => {
	var t = d(), n = Bu();
	function r(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var i = typeof Object.is == "function" ? Object.is : r, a = n.useSyncExternalStore, o = t.useRef, s = t.useEffect, c = t.useMemo, l = t.useDebugValue;
	e.useSyncExternalStoreWithSelector = function(e, t, n, r, u) {
		var d = o(null);
		if (d.current === null) {
			var f = {
				hasValue: !1,
				value: null
			};
			d.current = f;
		} else f = d.current;
		d = c(function() {
			function e(e) {
				if (!a) {
					if (a = !0, o = e, e = r(e), u !== void 0 && f.hasValue) {
						var t = f.value;
						if (u(t, e)) return s = t;
					}
					return s = e;
				}
				if (t = s, i(o, e)) return t;
				var n = r(e);
				return u !== void 0 && u(t, n) ? (o = e, t) : (o = e, s = n);
			}
			var a = !1, o, s, c = n === void 0 ? null : n;
			return [function() {
				return e(t());
			}, c === null ? void 0 : function() {
				return e(c());
			}];
		}, [
			t,
			n,
			r,
			u
		]);
		var p = a(e, d[0], d[1]);
		return s(function() {
			f.hasValue = !0, f.value = p;
		}, [p]), l(p), p;
	};
})), Hu = /* @__PURE__ */ o(((e, t) => {
	t.exports = Vu();
})), Uu = /*#__PURE__*/ (0, x.createContext)(null), Wu = Hu(), Gu = (e) => e, Ku = () => {
	var e = (0, x.useContext)(Uu);
	return e ? e.store.dispatch : Gu;
}, qu = () => {}, Ju = () => qu, Yu = (e, t) => e === t;
function H(e) {
	var t = (0, x.useContext)(Uu), n = (0, x.useMemo)(() => t ? (t) => {
		if (t != null) return e(t);
	} : qu, [t, e]);
	return (0, Wu.useSyncExternalStoreWithSelector)(t ? t.subscription.addNestedSub : Ju, t ? t.store.getState : qu, t ? t.store.getState : qu, n, Yu);
}
//#endregion
//#region node_modules/reselect/dist/reselect.mjs
function Xu(e, t = `expected a function, instead received ${typeof e}`) {
	if (typeof e != "function") throw TypeError(t);
}
function Zu(e, t = "expected all items to be functions, instead received the following types: ") {
	if (!e.every((e) => typeof e == "function")) {
		let n = e.map((e) => typeof e == "function" ? `function ${e.name || "unnamed"}()` : typeof e).join(", ");
		throw TypeError(`${t}[${n}]`);
	}
}
var Qu = (e) => Array.isArray(e) ? e : [e];
function $u(e) {
	let t = Array.isArray(e[0]) ? e[0] : e;
	return Zu(t, "createSelector expects all input-selectors to be functions, but received the following types: "), t;
}
function ed(e, t) {
	let n = [], { length: r } = e;
	for (let i = 0; i < r; i++) n.push(e[i].apply(null, t));
	return n;
}
var td = class {
	constructor(e) {
		this.value = e;
	}
	deref() {
		return this.value;
	}
}, nd = typeof WeakRef > "u" ? td : WeakRef, U = 0, rd = 1;
function W() {
	return {
		s: U,
		v: void 0,
		o: null,
		p: null
	};
}
function G(e) {
	return e instanceof nd ? e.deref() : e;
}
function id(e, t = {}) {
	let n = W(), { resultEqualityCheck: r } = t, i, a = 0;
	function o() {
		let t = n, { length: o } = arguments;
		for (let e = 0, n = o; e < n; e++) {
			let n = arguments[e];
			if (typeof n == "function" || typeof n == "object" && n) {
				let e = t.o;
				e === null && (t.o = e = /* @__PURE__ */ new WeakMap());
				let r = e.get(n);
				r === void 0 ? (t = W(), e.set(n, t)) : t = r;
			} else {
				let e = t.p;
				e === null && (t.p = e = /* @__PURE__ */ new Map());
				let r = e.get(n);
				r === void 0 ? (t = W(), e.set(n, t)) : t = r;
			}
		}
		let s = t, c;
		if (t.s === rd) c = t.v;
		else if (c = e.apply(null, arguments), a++, r) {
			let e = G(i);
			e != null && r(e, c) && (c = e, a !== 0 && a--), i = typeof c == "object" && c || typeof c == "function" ? /* @__PURE__ */ new nd(c) : c;
		}
		return s.s = rd, s.v = c, c;
	}
	return o.clearCache = () => {
		n = W(), o.resetResultsCount();
	}, o.resultsCount = () => a, o.resetResultsCount = () => {
		a = 0;
	}, o;
}
function ad(e, ...t) {
	let n = typeof e == "function" ? {
		memoize: e,
		memoizeOptions: t
	} : e, r = (...e) => {
		let t = 0, r = 0, i, a = {}, o = e.pop();
		typeof o == "object" && (a = o, o = e.pop()), Xu(o, `createSelector expects an output function after the inputs, but received: [${typeof o}]`);
		let { memoize: s, memoizeOptions: c = [], argsMemoize: l = id, argsMemoizeOptions: u = [] } = {
			...n,
			...a
		}, d = Qu(c), f = Qu(u), p = $u(e), m = s(function() {
			return t++, o.apply(null, arguments);
		}, ...d), h = l(function() {
			r++;
			let e = ed(p, arguments);
			return i = m.apply(null, e), i;
		}, ...f);
		return Object.assign(h, {
			resultFunc: o,
			memoizedResultFunc: m,
			dependencies: p,
			dependencyRecomputations: () => r,
			resetDependencyRecomputations: () => {
				r = 0;
			},
			lastResult: () => i,
			recomputations: () => t,
			resetRecomputations: () => {
				t = 0;
			},
			memoize: s,
			argsMemoize: l
		});
	};
	return Object.assign(r, { withTypes: () => r }), r;
}
var K = /* @__PURE__ */ ad(id);
//#endregion
//#region node_modules/es-toolkit/dist/array/flatten.mjs
function od(e, t = 1) {
	let n = [], r = Math.floor(t), i = (e, t) => {
		for (let a = 0; a < e.length; a++) {
			let o = e[a];
			Array.isArray(o) && t < r ? i(o, t + 1) : n.push(o);
		}
	};
	return i(e, 0), n;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/isIterateeCall.mjs
function sd(e, t, n) {
	return yu(n) && (typeof t == "number" && Ll(n) && ju(t) && t < n.length || typeof t == "string" && t in n) ? vu(n[t], e) : !1;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/_internal/compareValues.mjs
function cd(e) {
	return typeof e == "symbol" ? 1 : e === null ? 2 : e === void 0 ? 3 : e === e ? 0 : 4;
}
var ld = (e, t, n) => {
	if (e !== t) {
		let r = cd(e), i = cd(t);
		if (r === i && r === 0) {
			if (e < t) return n === "desc" ? 1 : -1;
			if (e > t) return n === "desc" ? -1 : 1;
		}
		return n === "desc" ? i - r : r - i;
	}
	return 0;
}, ud = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, dd = /^\w*$/;
function fd(e, t) {
	return Array.isArray(e) ? !1 : typeof e == "number" || typeof e == "boolean" || e == null || Gs(e) ? !0 : typeof e == "string" && (dd.test(e) || !ud.test(e)) || t != null && Object.hasOwn(t, e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/array/orderBy.mjs
function pd(e, t, n, r) {
	if (e == null) return [];
	n = r ? void 0 : n, Array.isArray(e) || (e = Ll(e) ? Array.from(e) : Object.values(e)), Array.isArray(t) || (t = t == null ? [null] : [t]), t.length === 0 && (t = [null]), Array.isArray(n) || (n = n == null ? [] : [n]), n = n.map((e) => String(e));
	let i = (e, t) => {
		let n = e, r = 0;
		for (; r < t.length && n != null; ++r) n = n[t[r]];
		return r > 0 && r === t.length ? n : void 0;
	}, a = (e, t) => {
		if (e == null) return t;
		if (t != null) return typeof e == "object" && "key" in e ? Object.hasOwn(t, e.key) ? t[e.key] : i(t, e.path) : typeof e == "function" ? e(t) : Array.isArray(e) ? i(t, e) : t[e];
	}, o = t.map((e) => (Array.isArray(e) && e.length === 1 && (e = e[0]), e == null || typeof e == "function" || Array.isArray(e) || fd(e) ? e : {
		key: e,
		path: Js(e)
	}));
	return e.map((e) => ({
		original: e,
		criteria: o.map((t) => a(t, e))
	})).slice().sort((e, t) => {
		for (let r = 0; r < o.length; r++) {
			let i = ld(e.criteria[r], t.criteria[r], n[r]);
			if (i !== 0) return i;
		}
		return 0;
	}).map((e) => e.original);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/array/sortBy.mjs
function md(e, ...t) {
	let n = t.length;
	return n > 1 && sd(e, t[0], t[1]) ? t = [] : n > 2 && sd(t[0], t[1], t[2]) && (t = [t[0]]), pd(e, od(t), ["asc"]);
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/legendSelectors.js
var hd = (e) => e.legend.settings, gd = (e) => e.legend.size;
K([(e) => e.legend.payload, hd], (e, t) => {
	var n = t.itemSorter, r = e.flat(1);
	return n ? md(r, n) : r;
});
//#endregion
//#region node_modules/recharts/es6/util/useElementOffset.js
function _d(e, t) {
	return Sd(e) || xd(e, t) || yd(e, t) || vd();
}
function vd() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function yd(e, t) {
	if (e) {
		if (typeof e == "string") return bd(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? bd(e, t) : void 0;
	}
}
function bd(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function xd(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function Sd(e) {
	if (Array.isArray(e)) return e;
}
var Cd = 1;
function wd(e, t) {
	return Math.abs(e.height - t.height) > Cd || Math.abs(e.left - t.left) > Cd || Math.abs(e.top - t.top) > Cd || Math.abs(e.width - t.width) > Cd;
}
function Td(e) {
	var t = e.getBoundingClientRect();
	return {
		height: t.height,
		left: t.left,
		top: t.top,
		width: t.width
	};
}
function Ed() {
	var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], t = _d((0, x.useState)({
		height: 0,
		left: 0,
		top: 0,
		width: 0
	}), 2), n = t[0], r = t[1], i = (0, x.useRef)(null), a = (0, x.useRef)(n);
	a.current = n;
	var o = (0, x.useCallback)((e) => {
		if (i.current != null && (i.current.disconnect(), i.current = null), e != null) {
			var t = Td(e);
			if (wd(t, a.current) && r(t), typeof ResizeObserver < "u") {
				var n = new ResizeObserver(() => {
					var t = Td(e);
					wd(t, a.current) && r(t);
				});
				n.observe(e), i.current = n;
			}
		}
	}, [...e]);
	return (0, x.useEffect)(() => () => {
		var e;
		(e = i.current) == null || e.disconnect();
	}, []), [n, o];
}
//#endregion
//#region node_modules/redux/dist/redux.mjs
function Dd(e) {
	return `Minified Redux error #${e}; visit https://redux.js.org/Errors?code=${e} for the full message or use the non-minified dev environment for full errors. `;
}
var Od = typeof Symbol == "function" && Symbol.observable || "@@observable", kd = () => Math.random().toString(36).substring(7).split("").join("."), Ad = {
	INIT: `@@redux/INIT${/* @__PURE__ */ kd()}`,
	REPLACE: `@@redux/REPLACE${/* @__PURE__ */ kd()}`,
	PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${kd()}`
};
function jd(e) {
	if (typeof e != "object" || !e) return !1;
	let t = e;
	for (; Object.getPrototypeOf(t) !== null;) t = Object.getPrototypeOf(t);
	return Object.getPrototypeOf(e) === t || Object.getPrototypeOf(e) === null;
}
function Md(e, t, n) {
	if (typeof e != "function") throw Error(Dd(2));
	if (typeof t == "function" && typeof n == "function" || typeof n == "function" && typeof arguments[3] == "function") throw Error(Dd(0));
	if (typeof t == "function" && n === void 0 && (n = t, t = void 0), n !== void 0) {
		if (typeof n != "function") throw Error(Dd(1));
		return n(Md)(e, t);
	}
	let r = e, i = t, a = /* @__PURE__ */ new Map(), o = a, s = 0, c = !1;
	function l() {
		o === a && (o = /* @__PURE__ */ new Map(), a.forEach((e, t) => {
			o.set(t, e);
		}));
	}
	function u() {
		if (c) throw Error(Dd(3));
		return i;
	}
	function d(e) {
		if (typeof e != "function") throw Error(Dd(4));
		if (c) throw Error(Dd(5));
		let t = !0;
		l();
		let n = s++;
		return o.set(n, e), function() {
			if (t) {
				if (c) throw Error(Dd(6));
				t = !1, l(), o.delete(n), a = null;
			}
		};
	}
	function f(e) {
		if (!jd(e)) throw Error(Dd(7));
		if (e.type === void 0) throw Error(Dd(8));
		if (typeof e.type != "string") throw Error(Dd(17));
		if (c) throw Error(Dd(9));
		try {
			c = !0, i = r(i, e);
		} finally {
			c = !1;
		}
		return (a = o).forEach((e) => {
			e();
		}), e;
	}
	function p(e) {
		if (typeof e != "function") throw Error(Dd(10));
		r = e, f({ type: Ad.REPLACE });
	}
	function m() {
		let e = d;
		return {
			subscribe(t) {
				if (typeof t != "object" || !t) throw Error(Dd(11));
				function n() {
					let e = t;
					e.next && e.next(u());
				}
				return n(), { unsubscribe: e(n) };
			},
			[Od]() {
				return this;
			}
		};
	}
	return f({ type: Ad.INIT }), {
		dispatch: f,
		subscribe: d,
		getState: u,
		replaceReducer: p,
		[Od]: m
	};
}
function Nd(e) {
	Object.keys(e).forEach((t) => {
		let n = e[t];
		if (n(void 0, { type: Ad.INIT }) === void 0) throw Error(Dd(12));
		if (n(void 0, { type: Ad.PROBE_UNKNOWN_ACTION() }) === void 0) throw Error(Dd(13));
	});
}
function Pd(e) {
	let t = Object.keys(e), n = {};
	for (let r = 0; r < t.length; r++) {
		let i = t[r];
		typeof e[i] == "function" && (n[i] = e[i]);
	}
	let r = Object.keys(n), i;
	try {
		Nd(n);
	} catch (e) {
		i = e;
	}
	return function(e = {}, t) {
		if (i) throw i;
		let a = !1, o = {};
		for (let i = 0; i < r.length; i++) {
			let s = r[i], c = n[s], l = e[s], u = c(l, t);
			if (u === void 0) throw t && t.type, Error(Dd(14));
			o[s] = u, a ||= u !== l;
		}
		return a ||= r.length !== Object.keys(e).length, a ? o : e;
	};
}
function Fd(...e) {
	return e.length === 0 ? (e) => e : e.length === 1 ? e[0] : e.reduce((e, t) => (...n) => e(t(...n)));
}
function Id(...e) {
	return (t) => (n, r) => {
		let i = t(n, r), a = () => {
			throw Error(Dd(15));
		}, o = {
			getState: i.getState,
			dispatch: (e, ...t) => a(e, ...t)
		};
		return a = Fd(...e.map((e) => e(o)))(i.dispatch), {
			...i,
			dispatch: a
		};
	};
}
function Ld(e) {
	return jd(e) && "type" in e && typeof e.type == "string";
}
//#endregion
//#region node_modules/immer/dist/immer.mjs
var Rd = Symbol.for("immer-nothing"), zd = Symbol.for("immer-draftable"), Bd = Symbol.for("immer-state");
function Vd(e, ...t) {
	throw Error(`[Immer] minified error nr: ${e}. Full error at: https://bit.ly/3cXEKWf`);
}
var Hd = Object, Ud = Hd.getPrototypeOf, Wd = "constructor", Gd = "prototype", Kd = "configurable", qd = "enumerable", Jd = "writable", Yd = "value", Xd = (e) => !!e && !!e[Bd];
function Zd(e) {
	return e ? ef(e) || cf(e) || !!e[zd] || !!e[Wd]?.[zd] || lf(e) || uf(e) : !1;
}
var Qd = Hd[Gd][Wd].toString(), $d = /* @__PURE__ */ new WeakMap();
function ef(e) {
	if (!e || !df(e)) return !1;
	let t = Ud(e);
	if (t === null || t === Hd[Gd]) return !0;
	let n = Hd.hasOwnProperty.call(t, Wd) && t[Wd];
	if (n === Object) return !0;
	if (!ff(n)) return !1;
	let r = $d.get(n);
	return r === void 0 && (r = Function.toString.call(n), $d.set(n, r)), r === Qd;
}
function tf(e, t, n = !0) {
	nf(e) === 0 ? (n ? Reflect.ownKeys(e) : Hd.keys(e)).forEach((n) => {
		t(n, e[n], e);
	}) : e.forEach((n, r) => t(r, n, e));
}
function nf(e) {
	let t = e[Bd];
	return t ? t.type_ : cf(e) ? 1 : lf(e) ? 2 : uf(e) ? 3 : 0;
}
var rf = (e, t, n = nf(e)) => n === 2 ? e.has(t) : Hd[Gd].hasOwnProperty.call(e, t), af = (e, t, n = nf(e)) => n === 2 ? e.get(t) : e[t], of = (e, t, n, r = nf(e)) => {
	r === 2 ? e.set(t, n) : r === 3 ? e.add(n) : e[t] = n;
};
function sf(e, t) {
	return e === t ? e !== 0 || 1 / e == 1 / t : e !== e && t !== t;
}
var cf = Array.isArray, lf = (e) => e instanceof Map, uf = (e) => e instanceof Set, df = (e) => typeof e == "object", ff = (e) => typeof e == "function", pf = (e) => typeof e == "boolean";
function mf(e) {
	let t = +e;
	return Number.isInteger(t) && String(t) === e;
}
var hf = (e) => e.copy_ || e.base_, gf = (e) => e.modified_ ? e.copy_ : e.base_;
function _f(e, t) {
	if (lf(e)) return new Map(e);
	if (uf(e)) return new Set(e);
	if (cf(e)) return Array[Gd].slice.call(e);
	let n = ef(e);
	if (t === !0 || t === "class_only" && !n) {
		let t = Hd.getOwnPropertyDescriptors(e);
		delete t[Bd];
		let n = Reflect.ownKeys(t);
		for (let r = 0; r < n.length; r++) {
			let i = n[r], a = t[i];
			a[Jd] === !1 && (a[Jd] = !0, a[Kd] = !0), (a.get || a.set) && (t[i] = {
				[Kd]: !0,
				[Jd]: !0,
				[qd]: a[qd],
				[Yd]: e[i]
			});
		}
		return Hd.create(Ud(e), t);
	}
	{
		let t = Ud(e);
		if (t !== null && n) return { ...e };
		let r = Hd.create(t);
		return Hd.assign(r, e);
	}
}
function q(e, t = !1) {
	return bf(e) || Xd(e) || !Zd(e) ? e : (nf(e) > 1 && Hd.defineProperties(e, {
		set: yf,
		add: yf,
		clear: yf,
		delete: yf
	}), Hd.freeze(e), t && tf(e, (e, t) => {
		q(t, !0);
	}, !1), e);
}
function vf() {
	Vd(2);
}
var yf = { [Yd]: vf };
function bf(e) {
	return e === null || !df(e) || Hd.isFrozen(e);
}
var xf = "MapSet", Sf = "Patches", Cf = "ArrayMethods", wf = {};
function Tf(e) {
	let t = wf[e];
	return t || Vd(0, e), t;
}
var Ef = (e) => !!wf[e], Df, Of = () => Df, kf = (e, t) => ({
	drafts_: [],
	parent_: e,
	immer_: t,
	canAutoFreeze_: !0,
	unfinalizedDrafts_: 0,
	handledSet_: /* @__PURE__ */ new Set(),
	processedForPatches_: /* @__PURE__ */ new Set(),
	mapSetPlugin_: Ef(xf) ? Tf(xf) : void 0,
	arrayMethodsPlugin_: Ef(Cf) ? Tf(Cf) : void 0
});
function Af(e, t) {
	t && (e.patchPlugin_ = Tf(Sf), e.patches_ = [], e.inversePatches_ = [], e.patchListener_ = t);
}
function jf(e) {
	Mf(e), e.drafts_.forEach(Pf), e.drafts_ = null;
}
function Mf(e) {
	e === Df && (Df = e.parent_);
}
var Nf = (e) => Df = kf(Df, e);
function Pf(e) {
	let t = e[Bd];
	t.type_ === 0 || t.type_ === 1 ? t.revoke_() : t.revoked_ = !0;
}
function Ff(e, t) {
	t.unfinalizedDrafts_ = t.drafts_.length;
	let n = t.drafts_[0];
	if (e !== void 0 && e !== n) {
		n[Bd].modified_ && (jf(t), Vd(4)), Zd(e) && (e = If(t, e));
		let { patchPlugin_: r } = t;
		r && r.generateReplacementPatches_(n[Bd].base_, e, t);
	} else e = If(t, n);
	return Lf(t, e, !0), jf(t), t.patches_ && t.patchListener_(t.patches_, t.inversePatches_), e === Rd ? void 0 : e;
}
function If(e, t) {
	if (bf(t)) return t;
	let n = t[Bd];
	if (!n) return Gf(t, e.handledSet_, e);
	if (!zf(n, e)) return t;
	if (!n.modified_) return n.base_;
	if (!n.finalized_) {
		let { callbacks_: t } = n;
		if (t) for (; t.length > 0;) t.pop()(e);
		Uf(n, e);
	}
	return n.copy_;
}
function Lf(e, t, n = !1) {
	!e.parent_ && e.immer_.autoFreeze_ && e.canAutoFreeze_ && q(t, n);
}
function Rf(e) {
	e.finalized_ = !0, e.scope_.unfinalizedDrafts_--;
}
var zf = (e, t) => e.scope_ === t, Bf = [];
function Vf(e, t, n, r) {
	let i = hf(e), a = e.type_;
	if (r !== void 0 && af(i, r, a) === t) {
		of(i, r, n, a);
		return;
	}
	if (!e.draftLocations_) {
		let t = e.draftLocations_ = /* @__PURE__ */ new Map();
		tf(i, (e, n) => {
			if (Xd(n)) {
				let r = t.get(n) || [];
				r.push(e), t.set(n, r);
			}
		});
	}
	let o = e.draftLocations_.get(t) ?? Bf;
	for (let e of o) of(i, e, n, a);
}
function Hf(e, t, n) {
	e.callbacks_.push(function(r) {
		let i = t;
		if (!i || !zf(i, r)) return;
		r.mapSetPlugin_?.fixSetContents(i);
		let a = gf(i);
		Vf(e, i.draft_ ?? i, a, n), Uf(i, r);
	});
}
function Uf(e, t) {
	if (e.modified_ && !e.finalized_ && (e.type_ === 3 || e.type_ === 1 && e.allIndicesReassigned_ || (e.assigned_?.size ?? 0) > 0)) {
		let { patchPlugin_: n } = t;
		if (n) {
			let r = n.getPath(e);
			r && n.generatePatches_(e, r, t);
		}
		Rf(e);
	}
}
function Wf(e, t, n) {
	let { scope_: r } = e;
	if (Xd(n)) {
		let i = n[Bd];
		zf(i, r) && i.callbacks_.push(function() {
			$f(e), Vf(e, n, gf(i), t);
		});
	} else Zd(n) && e.callbacks_.push(function() {
		let i = hf(e);
		e.type_ === 3 ? i.has(n) && Gf(n, r.handledSet_, r) : af(i, t, e.type_) === n && r.drafts_.length > 1 && (e.assigned_.get(t) ?? !1) === !0 && e.copy_ && Gf(af(e.copy_, t, e.type_), r.handledSet_, r);
	});
}
function Gf(e, t, n) {
	return !n.immer_.autoFreeze_ && n.unfinalizedDrafts_ < 1 || Xd(e) || t.has(e) || !Zd(e) || bf(e) ? e : (t.add(e), tf(e, (r, i) => {
		if (Xd(i)) {
			let t = i[Bd];
			zf(t, n) && (of(e, r, gf(t), e.type_), Rf(t));
		} else Zd(i) && Gf(i, t, n);
	}), e);
}
function J(e, t) {
	let n = cf(e), r = {
		type_: +!!n,
		scope_: t ? t.scope_ : Of(),
		modified_: !1,
		finalized_: !1,
		assigned_: void 0,
		parent_: t,
		base_: e,
		draft_: null,
		copy_: null,
		revoke_: null,
		isManual_: !1,
		callbacks_: void 0
	}, i = r, a = Kf;
	n && (i = [r], a = qf);
	let { revoke: o, proxy: s } = Proxy.revocable(i, a);
	return r.draft_ = s, r.revoke_ = o, [s, r];
}
var Kf = {
	get(e, t) {
		if (t === Bd) return e;
		let n = e.scope_.arrayMethodsPlugin_, r = e.type_ === 1 && typeof t == "string";
		if (r && n?.isArrayOperationMethod(t)) return n.createMethodInterceptor(e, t);
		let i = hf(e);
		if (!rf(i, t, e.type_)) return Xf(e, i, t);
		let a = i[t];
		if (e.finalized_ || !Zd(a) || r && e.operationMethod && n?.isMutatingArrayMethod(e.operationMethod) && mf(t)) return a;
		if (a === Jf(e.base_, t) || Yf(e, t, a)) {
			$f(e);
			let n = e.type_ === 1 ? +t : t, r = tp(e.scope_, a, e, n);
			return e.copy_[n] = r;
		}
		return a;
	},
	has(e, t) {
		return t in hf(e);
	},
	ownKeys(e) {
		return Reflect.ownKeys(hf(e));
	},
	set(e, t, n) {
		let r = Zf(hf(e), t);
		if (r?.set) return r.set.call(e.draft_, n), !0;
		if (!e.modified_) {
			let r = Jf(hf(e), t), i = r?.[Bd];
			if (i && i.base_ === n) return e.copy_[t] = n, e.assigned_.set(t, !1), !0;
			if (sf(n, r) && (n !== void 0 || rf(e.base_, t, e.type_))) return !0;
			$f(e), Qf(e);
		}
		return e.copy_[t] === n && (n !== void 0 || rf(e.copy_, t, e.type_)) || Number.isNaN(n) && Number.isNaN(e.copy_[t]) ? !0 : (e.copy_[t] = n, e.assigned_.set(t, !0), Wf(e, t, n), !0);
	},
	deleteProperty(e, t) {
		return $f(e), Jf(e.base_, t) !== void 0 || t in e.base_ ? (e.assigned_.set(t, !1), Qf(e)) : e.assigned_.delete(t), e.copy_ && delete e.copy_[t], !0;
	},
	getOwnPropertyDescriptor(e, t) {
		let n = hf(e), r = Reflect.getOwnPropertyDescriptor(n, t);
		return r && {
			[Jd]: !0,
			[Kd]: e.type_ !== 1 || t !== "length",
			[qd]: r[qd],
			[Yd]: n[t]
		};
	},
	defineProperty() {
		Vd(11);
	},
	getPrototypeOf(e) {
		return Ud(e.base_);
	},
	setPrototypeOf() {
		Vd(12);
	}
}, qf = {};
for (let e in Kf) {
	let t = Kf[e];
	qf[e] = function() {
		let e = arguments;
		return e[0] = e[0][0], t.apply(this, e);
	};
}
qf.deleteProperty = function(e, t) {
	return qf.set.call(this, e, t, void 0);
}, qf.set = function(e, t, n) {
	return Kf.set.call(this, e[0], t, n, e[0]);
};
function Jf(e, t) {
	let n = e[Bd];
	return (n ? hf(n) : e)[t];
}
function Yf(e, t, n) {
	return e.type_ !== 1 || !e.allIndicesReassigned_ || e.assigned_?.get(t) || !Zd(n) || n[Bd] ? !1 : e.baseRefs_.has(n);
}
function Xf(e, t, n) {
	let r = Zf(t, n);
	return r ? Yd in r ? r[Yd] : r.get?.call(e.draft_) : void 0;
}
function Zf(e, t) {
	if (!(t in e)) return;
	let n = Ud(e);
	for (; n;) {
		let e = Object.getOwnPropertyDescriptor(n, t);
		if (e) return e;
		n = Ud(n);
	}
}
function Qf(e) {
	e.modified_ || (e.modified_ = !0, e.parent_ && Qf(e.parent_));
}
function $f(e) {
	e.copy_ ||= (e.assigned_ = /* @__PURE__ */ new Map(), _f(e.base_, e.scope_.immer_.useStrictShallowCopy_));
}
var ep = class {
	constructor(e) {
		this.autoFreeze_ = !0, this.useStrictShallowCopy_ = !1, this.useStrictIteration_ = !1, this.produce = (e, t, n) => {
			if (ff(e) && !ff(t)) {
				let n = t;
				t = e;
				let r = this;
				return function(e = n, ...i) {
					return r.produce(e, (e) => t.call(this, e, ...i));
				};
			}
			ff(t) || Vd(6), n !== void 0 && !ff(n) && Vd(7);
			let r;
			if (Zd(e)) {
				let i = Nf(this), a = tp(i, e, void 0), o = !0;
				try {
					r = t(a), o = !1;
				} finally {
					o ? jf(i) : Mf(i);
				}
				return Af(i, n), Ff(r, i);
			}
			if (!e || !df(e)) {
				if (r = t(e), r === void 0 && (r = e), r === Rd && (r = void 0), this.autoFreeze_ && q(r, !0), n) {
					let t = [], i = [];
					Tf(Sf).generateReplacementPatches_(e, r, {
						patches_: t,
						inversePatches_: i
					}), n(t, i);
				}
				return r;
			}
			Vd(1, e);
		}, this.produceWithPatches = (e, t) => {
			if (ff(e)) return (t, ...n) => this.produceWithPatches(t, (t) => e(t, ...n));
			let n, r;
			return [
				this.produce(e, t, (e, t) => {
					n = e, r = t;
				}),
				n,
				r
			];
		}, pf(e?.autoFreeze) && this.setAutoFreeze(e.autoFreeze), pf(e?.useStrictShallowCopy) && this.setUseStrictShallowCopy(e.useStrictShallowCopy), pf(e?.useStrictIteration) && this.setUseStrictIteration(e.useStrictIteration);
	}
	createDraft(e) {
		Zd(e) || Vd(8), Xd(e) && (e = np(e));
		let t = Nf(this), n = tp(t, e, void 0);
		return n[Bd].isManual_ = !0, Mf(t), n;
	}
	finishDraft(e, t) {
		let n = e && e[Bd];
		(!n || !n.isManual_) && Vd(9);
		let { scope_: r } = n;
		return Af(r, t), Ff(void 0, r);
	}
	setAutoFreeze(e) {
		this.autoFreeze_ = e;
	}
	setUseStrictShallowCopy(e) {
		this.useStrictShallowCopy_ = e;
	}
	setUseStrictIteration(e) {
		this.useStrictIteration_ = e;
	}
	shouldUseStrictIteration() {
		return this.useStrictIteration_;
	}
	applyPatches(e, t) {
		let n;
		for (n = t.length - 1; n >= 0; n--) {
			let r = t[n];
			if (r.path.length === 0 && r.op === "replace") {
				e = r.value;
				break;
			}
		}
		n > -1 && (t = t.slice(n + 1));
		let r = Tf(Sf).applyPatches_;
		return Xd(e) ? r(e, t) : this.produce(e, (e) => r(e, t));
	}
};
function tp(e, t, n, r) {
	let [i, a] = lf(t) ? Tf(xf).proxyMap_(t, n) : uf(t) ? Tf(xf).proxySet_(t, n) : J(t, n);
	return (n?.scope_ ?? Of()).drafts_.push(i), a.callbacks_ = n?.callbacks_ ?? [], a.key_ = r, n && r !== void 0 ? Hf(n, a, r) : a.callbacks_.push(function(e) {
		e.mapSetPlugin_?.fixSetContents(a);
		let { patchPlugin_: t } = e;
		a.modified_ && t && t.generatePatches_(a, [], e);
	}), i;
}
function np(e) {
	return Xd(e) || Vd(10, e), rp(e);
}
function rp(e) {
	if (!Zd(e) || bf(e)) return e;
	let t = e[Bd], n, r = !0;
	if (t) {
		if (!t.modified_) return t.base_;
		t.finalized_ = !0, n = _f(e, t.scope_.immer_.useStrictShallowCopy_), r = t.scope_.immer_.shouldUseStrictIteration();
	} else n = _f(e, !0);
	return tf(n, (e, t) => {
		of(n, e, rp(t));
	}, r), t && (t.finalized_ = !1), n;
}
globalThis.Iterator?.from;
var ip = new ep().produce, Y = (e) => e;
//#endregion
//#region node_modules/redux-thunk/dist/redux-thunk.mjs
function ap(e) {
	return ({ dispatch: t, getState: n }) => (r) => (i) => typeof i == "function" ? i(t, n, e) : r(i);
}
var op = ap(), sp = ap, cp = typeof window < "u" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function() {
	if (arguments.length !== 0) return typeof arguments[0] == "object" ? Fd : Fd.apply(null, arguments);
};
typeof window < "u" && window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__;
function lp(e, t) {
	function n(...n) {
		if (t) {
			let r = t(...n);
			if (!r) throw Error(vm(0));
			return {
				type: e,
				payload: r.payload,
				..."meta" in r && { meta: r.meta },
				..."error" in r && { error: r.error }
			};
		}
		return {
			type: e,
			payload: n[0]
		};
	}
	return n.toString = () => `${e}`, n.type = e, n.match = (t) => Ld(t) && t.type === e, n;
}
var up = class e extends Array {
	constructor(...t) {
		super(...t), Object.setPrototypeOf(this, e.prototype);
	}
	static get [Symbol.species]() {
		return e;
	}
	concat(...e) {
		return super.concat.apply(this, e);
	}
	prepend(...t) {
		return t.length === 1 && Array.isArray(t[0]) ? new e(...t[0].concat(this)) : new e(...t.concat(this));
	}
};
function dp(e) {
	return Zd(e) ? ip(e, () => {}) : e;
}
function fp(e, t, n) {
	return e.has(t) ? e.get(t) : e.set(t, n(t)).get(t);
}
function pp(e) {
	return typeof e == "boolean";
}
var mp = () => function(e) {
	let { thunk: t = !0, immutableCheck: n = !0, serializableCheck: r = !0, actionCreatorCheck: i = !0 } = e ?? {}, a = new up();
	return t && (pp(t) ? a.push(op) : a.push(sp(t.extraArgument))), a;
}, hp = "RTK_autoBatch", gp = () => (e) => ({
	payload: e,
	meta: { [hp]: !0 }
}), _p = (e) => (t) => {
	setTimeout(t, e);
}, vp = (e, t) => (n) => {
	let r = !1, i = () => {
		r || (r = !0, cancelAnimationFrame(a), clearTimeout(o), n());
	}, a = e(i), o = setTimeout(i, t);
}, yp = (e = { type: "raf" }) => (t) => (...n) => {
	let r = t(...n), i = !0, a = !1, o = !1, s = /* @__PURE__ */ new Set(), c = e.type === "tick" ? queueMicrotask : e.type === "raf" ? typeof window < "u" && window.requestAnimationFrame ? vp(window.requestAnimationFrame, 100) : _p(10) : e.type === "callback" ? e.queueNotification : _p(e.timeout), l = () => {
		o = !1, a && (a = !1, s.forEach((e) => e()));
	};
	return Object.assign({}, r, {
		subscribe(e) {
			let t = r.subscribe(() => i && e());
			return s.add(e), () => {
				t(), s.delete(e);
			};
		},
		dispatch(e) {
			try {
				return i = !e?.meta?.[hp], a = !i, a && (o || (o = !0, c(l))), r.dispatch(e);
			} finally {
				i = !0;
			}
		}
	});
}, bp = (e) => function(t) {
	let { autoBatch: n = !0 } = t ?? {}, r = new up(e);
	return n && r.push(yp(typeof n == "object" ? n : void 0)), r;
};
function xp(e) {
	let t = mp(), { reducer: n = void 0, middleware: r, devTools: i = !0, duplicateMiddlewareCheck: a = !0, preloadedState: o = void 0, enhancers: s = void 0 } = e || {}, c;
	if (typeof n == "function") c = n;
	else if (jd(n)) c = Pd(n);
	else throw Error(vm(1));
	let l;
	l = typeof r == "function" ? r(t) : t();
	let u = Fd;
	i && (u = cp({
		trace: !1,
		...typeof i == "object" && i
	}));
	let d = bp(Id(...l)), f = typeof s == "function" ? s(d) : d(), p = u(...f);
	return Md(c, o, p);
}
function Sp(e) {
	let t = {}, n = [], r, i = {
		addCase(e, n) {
			let r = typeof e == "string" ? e : e.type;
			if (!r) throw Error(vm(28));
			if (r in t) throw Error(vm(29));
			return t[r] = n, i;
		},
		addAsyncThunk(e, r) {
			return r.pending && (t[e.pending.type] = r.pending), r.rejected && (t[e.rejected.type] = r.rejected), r.fulfilled && (t[e.fulfilled.type] = r.fulfilled), r.settled && n.push({
				matcher: e.settled,
				reducer: r.settled
			}), i;
		},
		addMatcher(e, t) {
			return n.push({
				matcher: e,
				reducer: t
			}), i;
		},
		addDefaultCase(e) {
			return r = e, i;
		}
	};
	return e(i), [
		t,
		n,
		r
	];
}
function Cp(e) {
	return typeof e == "function";
}
function wp(e, t) {
	let [n, r, i] = Sp(t), a;
	if (Cp(e)) a = () => dp(e());
	else {
		let t = dp(e);
		a = () => t;
	}
	function o(e = a(), t) {
		let o = [n[t.type], ...r.filter(({ matcher: e }) => e(t)).map(({ reducer: e }) => e)];
		return o.filter((e) => !!e).length === 0 && (o = [i]), o.reduce((e, n) => {
			if (n) {
				if (Xd(e)) {
					let r = n(e, t);
					return r === void 0 ? e : r;
				}
				if (Zd(e)) return ip(e, (e) => n(e, t));
				{
					let r = n(e, t);
					if (r === void 0) {
						if (e === null) return e;
						throw Error("A case reducer on a non-draftable value must not return undefined");
					}
					return r;
				}
			}
			return e;
		}, e);
	}
	return o.getInitialState = a, o;
}
var Tp = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW", Ep = (e = 21) => {
	let t = "", n = e;
	for (; n--;) t += Tp[Math.random() * 64 | 0];
	return t;
}, Dp = /* @__PURE__ */ Symbol.for("rtk-slice-createasyncthunk");
function Op(e, t) {
	return `${e}/${t}`;
}
function kp({ creators: e } = {}) {
	let t = e?.asyncThunk?.[Dp];
	return function(e) {
		let { name: n, reducerPath: r = n } = e;
		if (!n) throw Error(vm(11));
		let i = (typeof e.reducers == "function" ? e.reducers(Mp()) : e.reducers) || {}, a = Object.keys(i), o = {
			sliceCaseReducersByName: {},
			sliceCaseReducersByType: {},
			actionCreators: {},
			sliceMatchers: []
		}, s = {
			addCase(e, t) {
				let n = typeof e == "string" ? e : e.type;
				if (!n) throw Error(vm(12));
				if (n in o.sliceCaseReducersByType) throw Error(vm(13));
				return o.sliceCaseReducersByType[n] = t, s;
			},
			addMatcher(e, t) {
				return o.sliceMatchers.push({
					matcher: e,
					reducer: t
				}), s;
			},
			exposeAction(e, t) {
				return o.actionCreators[e] = t, s;
			},
			exposeCaseReducer(e, t) {
				return o.sliceCaseReducersByName[e] = t, s;
			}
		};
		a.forEach((r) => {
			let a = i[r], o = {
				reducerName: r,
				type: Op(n, r),
				createNotation: typeof e.reducers == "function"
			};
			Pp(a) ? Ip(o, a, s, t) : Np(o, a, s);
		});
		function c() {
			let [t = {}, n = [], r = void 0] = typeof e.extraReducers == "function" ? Sp(e.extraReducers) : [e.extraReducers], i = {
				...t,
				...o.sliceCaseReducersByType
			};
			return wp(e.initialState, (e) => {
				for (let t in i) e.addCase(t, i[t]);
				for (let t of o.sliceMatchers) e.addMatcher(t.matcher, t.reducer);
				for (let t of n) e.addMatcher(t.matcher, t.reducer);
				r && e.addDefaultCase(r);
			});
		}
		let l = (e) => e, u = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new WeakMap(), f;
		function p(e, t) {
			return f ||= c(), f(e, t);
		}
		function m() {
			return f ||= c(), f.getInitialState();
		}
		function h(t, n = !1) {
			function r(e) {
				let i = e[t];
				return i === void 0 && n && (i = fp(d, r, m)), i;
			}
			function i(t = l) {
				return fp(fp(u, n, () => /* @__PURE__ */ new WeakMap()), t, () => {
					let r = {};
					for (let [i, a] of Object.entries(e.selectors ?? {})) r[i] = Ap(a, t, () => fp(d, t, m), n);
					return r;
				});
			}
			return {
				reducerPath: t,
				getSelectors: i,
				get selectors() {
					return i(r);
				},
				selectSlice: r
			};
		}
		let g = {
			name: n,
			reducer: p,
			actions: o.actionCreators,
			caseReducers: o.sliceCaseReducersByName,
			getInitialState: m,
			...h(r),
			injectInto(e, { reducerPath: t, ...n } = {}) {
				let i = t ?? r;
				return e.inject({
					reducerPath: i,
					reducer: p
				}, n), {
					...g,
					...h(i, !0)
				};
			}
		};
		return g;
	};
}
function Ap(e, t, n, r) {
	function i(i, ...a) {
		let o = t(i);
		return o === void 0 && r && (o = n()), e(o, ...a);
	}
	return i.unwrapped = e, i;
}
var jp = /* @__PURE__ */ kp();
function Mp() {
	function e(e, t) {
		return {
			_reducerDefinitionType: "asyncThunk",
			payloadCreator: e,
			...t
		};
	}
	return e.withTypes = () => e, {
		reducer(e) {
			return Object.assign({ [e.name](...t) {
				return e(...t);
			} }[e.name], { _reducerDefinitionType: "reducer" });
		},
		preparedReducer(e, t) {
			return {
				_reducerDefinitionType: "reducerWithPrepare",
				prepare: e,
				reducer: t
			};
		},
		asyncThunk: e
	};
}
function Np({ type: e, reducerName: t, createNotation: n }, r, i) {
	let a, o;
	if ("reducer" in r) {
		if (n && !Fp(r)) throw Error(vm(17));
		a = r.reducer, o = r.prepare;
	} else a = r;
	i.addCase(e, a).exposeCaseReducer(t, a).exposeAction(t, o ? lp(e, o) : lp(e));
}
function Pp(e) {
	return e._reducerDefinitionType === "asyncThunk";
}
function Fp(e) {
	return e._reducerDefinitionType === "reducerWithPrepare";
}
function Ip({ type: e, reducerName: t }, n, r, i) {
	if (!i) throw Error(vm(18));
	let { payloadCreator: a, fulfilled: o, pending: s, rejected: c, settled: l, options: u } = n, d = i(e, a, u);
	r.exposeAction(t, d), o && r.addCase(d.fulfilled, o), s && r.addCase(d.pending, s), c && r.addCase(d.rejected, c), l && r.addMatcher(d.settled, l), r.exposeCaseReducer(t, {
		fulfilled: o || Lp,
		pending: s || Lp,
		rejected: c || Lp,
		settled: l || Lp
	});
}
function Lp() {}
var Rp = "task", zp = "listener", Bp = "completed", Vp = "cancelled", Hp = `task-${Vp}`, Up = `task-${Bp}`, Wp = `${zp}-${Vp}`, Gp = `${zp}-${Bp}`, Kp = class {
	constructor(e) {
		this.code = e, this.message = `${Rp} ${Vp} (reason: ${e})`;
	}
	code;
	name = "TaskAbortError";
	message;
}, qp = (e, t) => {
	if (typeof e != "function") throw TypeError(vm(32));
}, Jp = () => {}, Yp = (e, t = Jp) => (e.catch(t), e), Xp = (e, t) => (e.addEventListener("abort", t, { once: !0 }), () => e.removeEventListener("abort", t)), Zp = (e) => {
	if (e.aborted) throw new Kp(e.reason);
};
function Qp(e, t) {
	let n = Jp;
	return new Promise((r, i) => {
		let a = () => i(new Kp(e.reason));
		if (e.aborted) {
			a();
			return;
		}
		n = Xp(e, a), t.finally(() => n()).then(r, i);
	}).finally(() => {
		n = Jp;
	});
}
var $p = async (e, t) => {
	try {
		return await Promise.resolve(), {
			status: "ok",
			value: await e()
		};
	} catch (e) {
		return {
			status: e instanceof Kp ? "cancelled" : "rejected",
			error: e
		};
	} finally {
		t?.();
	}
}, em = (e) => (t) => Yp(Qp(e, t).then((t) => (Zp(e), t))), tm = (e) => {
	let t = em(e);
	return (e) => t(new Promise((t) => setTimeout(t, e)));
}, { assign: nm } = Object, rm = {}, im = "listenerMiddleware", am = (e, t) => {
	let n = (t) => Xp(e, () => t.abort(e.reason));
	return (r, i) => {
		qp(r, "taskExecutor");
		let a = new AbortController();
		n(a);
		let o = $p(async () => {
			Zp(e), Zp(a.signal);
			let t = await r({
				pause: em(a.signal),
				delay: tm(a.signal),
				signal: a.signal
			});
			return Zp(a.signal), t;
		}, () => a.abort(Up));
		return i?.autoJoin && t.push(o.catch(Jp)), {
			result: em(e)(o),
			cancel() {
				a.abort(Hp);
			}
		};
	};
}, om = (e, t) => {
	let n = async (n, r) => {
		Zp(t);
		let i = () => {}, a = [new Promise((t, r) => {
			let a = e({
				predicate: n,
				effect: (e, n) => {
					n.unsubscribe(), t([
						e,
						n.getState(),
						n.getOriginalState()
					]);
				}
			});
			i = () => {
				a(), r();
			};
		})];
		r != null && a.push(new Promise((e) => setTimeout(e, r, null)));
		try {
			let e = await Qp(t, Promise.race(a));
			return Zp(t), e;
		} finally {
			i();
		}
	};
	return ((e, t) => Yp(n(e, t)));
}, sm = (e) => {
	let { type: t, actionCreator: n, matcher: r, predicate: i, effect: a } = e;
	if (t) i = lp(t).match;
	else if (n) t = n.type, i = n.match;
	else if (r) i = r;
	else if (!i) throw Error(vm(21));
	return qp(a, "options.listener"), {
		predicate: i,
		type: t,
		effect: a
	};
}, cm = /* @__PURE__ */ nm((e) => {
	let { type: t, predicate: n, effect: r } = sm(e);
	return {
		id: Ep(),
		effect: r,
		type: t,
		predicate: n,
		pending: /* @__PURE__ */ new Set(),
		unsubscribe: () => {
			throw Error(vm(22));
		}
	};
}, { withTypes: () => cm }), lm = (e, t) => {
	let { type: n, effect: r, predicate: i } = sm(t);
	return Array.from(e.values()).find((e) => (typeof n == "string" ? e.type === n : e.predicate === i) && e.effect === r);
}, um = (e) => {
	e.pending.forEach((e) => {
		e.abort(Wp);
	});
}, dm = (e, t) => () => {
	for (let e of t.keys()) um(e);
	e.clear();
}, fm = (e, t, n) => {
	try {
		e(t, n);
	} catch (e) {
		setTimeout(() => {
			throw e;
		}, 0);
	}
}, pm = /* @__PURE__ */ nm(/* @__PURE__ */ lp(`${im}/add`), { withTypes: () => pm }), mm = /* @__PURE__ */ lp(`${im}/removeAll`), hm = /* @__PURE__ */ nm(/* @__PURE__ */ lp(`${im}/remove`), { withTypes: () => hm }), gm = (...e) => {
	console.error(`${im}/error`, ...e);
}, _m = (e = {}) => {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = (e) => {
		let t = n.get(e) ?? 0;
		n.set(e, t + 1);
	}, i = (e) => {
		let t = n.get(e) ?? 1;
		t === 1 ? n.delete(e) : n.set(e, t - 1);
	}, { extra: a, onError: o = gm } = e;
	qp(o, "onError");
	let s = (e) => (e.unsubscribe = () => t.delete(e.id), t.set(e.id, e), (t) => {
		e.unsubscribe(), t?.cancelActive && um(e);
	}), c = ((e) => {
		let n = lm(t, e) ?? cm(e);
		return s(n);
	});
	nm(c, { withTypes: () => c });
	let l = (e) => {
		let n = lm(t, e);
		return n && (n.unsubscribe(), e.cancelActive && um(n)), !!n;
	};
	nm(l, { withTypes: () => l });
	let u = async (e, n, s, l) => {
		let u = new AbortController(), d = om(c, u.signal), f = [];
		try {
			e.pending.add(u), r(e), await Promise.resolve(e.effect(n, nm({}, s, {
				getOriginalState: l,
				condition: (e, t) => d(e, t).then(Boolean),
				take: d,
				delay: tm(u.signal),
				pause: em(u.signal),
				extra: a,
				signal: u.signal,
				fork: am(u.signal, f),
				unsubscribe: e.unsubscribe,
				subscribe: () => {
					t.set(e.id, e);
				},
				cancelActiveListeners: () => {
					e.pending.forEach((e, t, n) => {
						e !== u && (e.abort(Wp), n.delete(e));
					});
				},
				cancel: () => {
					u.abort(Wp), e.pending.delete(u);
				},
				throwIfCancelled: () => {
					Zp(u.signal);
				}
			})));
		} catch (e) {
			e instanceof Kp || fm(o, e, { raisedBy: "effect" });
		} finally {
			await Promise.all(f), u.abort(Gp), i(e), e.pending.delete(u);
		}
	}, d = dm(t, n);
	return {
		middleware: (e) => (n) => (r) => {
			if (!Ld(r)) return n(r);
			if (pm.match(r)) return c(r.payload);
			if (mm.match(r)) {
				d();
				return;
			}
			if (hm.match(r)) return l(r.payload);
			let i = e.getState(), a = () => {
				if (i === rm) throw Error(vm(23));
				return i;
			}, s;
			try {
				if (s = n(r), t.size > 0) {
					let n = e.getState(), s = Array.from(t.values());
					for (let t of s) {
						let s = !1;
						try {
							s = t.predicate(r, n, i);
						} catch (e) {
							s = !1, fm(o, e, { raisedBy: "predicate" });
						}
						s && u(t, r, e, a);
					}
				}
			} finally {
				i = rm;
			}
			return s;
		},
		startListening: c,
		stopListening: l,
		clearListeners: d
	};
};
function vm(e) {
	return `Minified Redux Toolkit error #${e}; visit https://redux-toolkit.js.org/Errors?code=${e} for the full message or use the non-minified dev environment for full errors. `;
}
//#endregion
//#region node_modules/recharts/es6/state/layoutSlice.js
var ym = jp({
	name: "chartLayout",
	initialState: {
		layoutType: "horizontal",
		width: 0,
		height: 0,
		margin: {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5
		},
		scale: 1
	},
	reducers: {
		setLayout(e, t) {
			e.layoutType = t.payload;
		},
		setChartSize(e, t) {
			e.width = t.payload.width, e.height = t.payload.height;
		},
		setMargin(e, t) {
			e.margin.top = t.payload.top ?? 0, e.margin.right = t.payload.right ?? 0, e.margin.bottom = t.payload.bottom ?? 0, e.margin.left = t.payload.left ?? 0;
		},
		setScale(e, t) {
			e.scale = t.payload;
		}
	}
}), bm = ym.actions, xm = bm.setMargin, Sm = bm.setLayout, Cm = bm.setChartSize, wm = bm.setScale, Tm = ym.reducer;
//#endregion
//#region node_modules/recharts/es6/util/getSliced.js
function Em(e, t, n) {
	return Array.isArray(e) && e && t + n !== 0 ? e.slice(t, n + 1) : e;
}
//#endregion
//#region node_modules/recharts/es6/util/isWellBehavedNumber.js
function Dm(e) {
	return Number.isFinite(e);
}
function Om(e) {
	return typeof e == "number" && e > 0 && Number.isFinite(e);
}
//#endregion
//#region node_modules/recharts/es6/util/ChartUtils.js
function km(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Am(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? km(Object(n), !0).forEach(function(t) {
			jm(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : km(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function jm(e, t, n) {
	return (t = Mm(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Mm(e) {
	var t = Nm(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Nm(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Pm(e, t, n) {
	return uc(e) || uc(t) ? n : rc(t) ? Ys(e, t, n) : typeof t == "function" ? t(e) : n;
}
var Fm = (e, t, n) => {
	if (t && n) {
		var r = n.width, i = n.height, a = t.align, o = t.verticalAlign, s = t.layout, c = t.position, l = t.offset, u = l === void 0 ? 0 : l;
		if (c != null) {
			if (Sc(c)) {
				if (c === "top" && V(e.top)) return Am(Am({}, e), {}, { top: e.top + (i || 0) + u });
				if (c === "bottom" && V(e.bottom)) return Am(Am({}, e), {}, { bottom: e.bottom + (i || 0) + u });
				if (c === "left" && V(e.left)) return Am(Am({}, e), {}, { left: e.left + (r || 0) + u });
				if (c === "right" && V(e.right)) return Am(Am({}, e), {}, { right: e.right + (r || 0) + u });
			}
			return e;
		}
		if ((s === "vertical" || s === "horizontal" && o === "middle") && a !== "center" && V(e[a])) return Am(Am({}, e), {}, { [a]: e[a] + (r || 0) });
		if ((s === "horizontal" || s === "vertical" && a === "center") && o !== "middle" && V(e[o])) return Am(Am({}, e), {}, { [o]: e[o] + (i || 0) });
	}
	return e;
}, Im = (e, t) => e === "horizontal" && t === "xAxis" || e === "vertical" && t === "yAxis" || e === "centric" && t === "angleAxis" || e === "radial" && t === "radiusAxis", Lm = {
	sign: (e) => {
		var t = e.length;
		if (!(t <= 0)) {
			var n = e[0]?.length;
			if (!(n == null || n <= 0)) for (var r = 0; r < n; ++r) for (var i = 0, a = 0, o = 0; o < t; ++o) {
				var s = e[o]?.[r];
				if (s != null) {
					var c = s[1], l = s[0], u = tc(c) ? l : c;
					u >= 0 ? (s[0] = i, i += u, s[1] = i) : (s[0] = a, a += u, s[1] = a);
				}
			}
		}
	},
	expand: bl,
	none: hl,
	silhouette: xl,
	wiggle: Sl,
	positive: (e) => {
		var t = e.length;
		if (!(t <= 0)) {
			var n = e[0]?.length;
			if (!(n == null || n <= 0)) for (var r = 0; r < n; ++r) for (var i = 0, a = 0; a < t; ++a) {
				var o = e[a]?.[r];
				if (o != null) {
					var s = tc(o[1]) ? o[0] : o[1];
					s >= 0 ? (o[0] = i, i += s, o[1] = i) : (o[0] = 0, o[1] = 0);
				}
			}
		}
	}
}, Rm = (e, t, n) => {
	var r = Lm[n] ?? hl, i = yl().keys(t).value((e, t) => Number(Pm(e, t, 0))).order(gl).offset(r)(e);
	return i.forEach((n, r) => {
		n.forEach((n, i) => {
			var a = Pm(e[i], t[r], 0);
			Array.isArray(a) && a.length === 2 && V(a[0]) && V(a[1]) && (n[0] = a[0], n[1] = a[1]);
		});
	}), i;
}, zm = (e) => {
	var t = e.flat(2).filter(V);
	return [Math.min(...t), Math.max(...t)];
}, Bm = (e) => [e[0] === Infinity ? 0 : e[0], e[1] === -Infinity ? 0 : e[1]], Vm = (e, t, n) => {
	if (e != null && Object.keys(e).length !== 0) return Bm(Object.keys(e).reduce((r, i) => {
		var a = e[i];
		if (!a) return r;
		var o = a.stackedData.reduce((e, r) => {
			var i = zm(Em(r, t, n));
			return !Dm(i[0]) || !Dm(i[1]) ? e : [Math.min(e[0], i[0]), Math.max(e[1], i[1])];
		}, [Infinity, -Infinity]);
		return [Math.min(o[0], r[0]), Math.max(o[1], r[1])];
	}, [Infinity, -Infinity]));
}, Hm = /^dataMin[\s]*-[\s]*([0-9]+([.]{1}[0-9]+){0,1})$/, Um = /^dataMax[\s]*\+[\s]*([0-9]+([.]{1}[0-9]+){0,1})$/, Wm = (e, t, n) => {
	if (e && e.scale && e.scale.bandwidth) {
		var r = e.scale.bandwidth();
		if (!n || r > 0) return r;
	}
	if (e && t && t.length >= 2) {
		for (var i = md(t, (e) => e.coordinate), a = [], o = 0, s = 1, c = i.length; s < c; s++) {
			var l = (i[s]?.coordinate || 0) - (i[s - 1]?.coordinate || 0);
			a.push(l), o = Math.max(l, o);
		}
		var u = o * 1e-4, d = Infinity;
		for (var f of a) f > u && (d = Math.min(f, d));
		return d === Infinity ? 0 : d;
	}
	return n ? void 0 : 0;
};
function Gm(e) {
	var t = e.tooltipEntrySettings, n = e.dataKey, r = e.payload, i = e.value, a = e.name;
	return Am(Am({}, t), {}, {
		dataKey: n,
		payload: r,
		value: i,
		name: a
	});
}
function Km(e, t) {
	if (e != null) return String(e);
	if (typeof t == "string") return t;
}
var qm = (e, t) => {
	if (t === "horizontal") return e.relativeX;
	if (t === "vertical") return e.relativeY;
}, Jm = (e, t) => t === "centric" ? e.angle : e.radius, Ym = (e) => e.layout.width, Xm = (e) => e.layout.height, Zm = (e) => e.layout.scale, Qm = (e) => e.layout.margin, $m = K((e) => e.cartesianAxis.xAxis, (e) => Object.values(e)), eh = K((e) => e.cartesianAxis.yAxis, (e) => Object.values(e)), th = "data-recharts-item-index", nh = "data-recharts-item-id";
//#endregion
//#region node_modules/recharts/es6/state/selectors/selectChartOffsetInternal.js
function rh(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function ih(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? rh(Object(n), !0).forEach(function(t) {
			ah(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : rh(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function ah(e, t, n) {
	return (t = oh(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function oh(e) {
	var t = sh(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function sh(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var ch = (e) => e.brush.height;
function lh(e) {
	return eh(e).reduce((e, t) => t.orientation === "left" && !t.mirror && !t.hide ? e + (typeof t.width == "number" ? t.width : 60) : e, 0);
}
function uh(e) {
	return eh(e).reduce((e, t) => t.orientation === "right" && !t.mirror && !t.hide ? e + (typeof t.width == "number" ? t.width : 60) : e, 0);
}
function dh(e) {
	return $m(e).reduce((e, t) => t.orientation === "top" && !t.mirror && !t.hide ? e + (typeof t.height == "number" ? t.height : 30) : e, 0);
}
function fh(e) {
	return $m(e).reduce((e, t) => t.orientation === "bottom" && !t.mirror && !t.hide ? e + (typeof t.height == "number" ? t.height : 30) : e, 0);
}
var ph = K([
	Ym,
	Xm,
	Qm,
	ch,
	lh,
	uh,
	dh,
	fh,
	hd,
	gd
], (e, t, n, r, i, a, o, s, c, l) => {
	var u = {
		left: (n.left || 0) + i,
		right: (n.right || 0) + a
	}, d = ih(ih({}, {
		top: (n.top || 0) + o,
		bottom: (n.bottom || 0) + s
	}), u), f = d.bottom;
	d.bottom += r, d = Fm(d, c, l);
	var p = e - d.left - d.right, m = t - d.top - d.bottom;
	return ih(ih({ brushBottom: f }, d), {}, {
		width: Math.max(p, 0),
		height: Math.max(m, 0)
	});
}), mh = K(ph, (e) => ({
	x: e.left,
	y: e.top,
	width: e.width,
	height: e.height
}));
K(Ym, Xm, (e, t) => ({
	x: 0,
	y: 0,
	width: e,
	height: t
}));
//#endregion
//#region node_modules/recharts/es6/context/PanoramaContext.js
var hh = /*#__PURE__*/ (0, x.createContext)(null), gh = () => (0, x.useContext)(hh) != null, _h = (e) => e.brush, vh = K([
	_h,
	ph,
	Qm
], (e, t, n) => ({
	height: e.height,
	x: V(e.x) ? e.x : t.left,
	y: V(e.y) ? e.y : t.top + t.height + t.brushBottom - (n?.bottom || 0),
	width: V(e.width) ? e.width : t.width
}));
//#endregion
//#region node_modules/es-toolkit/dist/function/debounce.mjs
function yh(e, t, { signal: n, edges: r } = {}) {
	let i, a = null, o = r != null && r.includes("leading"), s = r == null || r.includes("trailing"), c = () => {
		a !== null && (e.apply(i, a), i = void 0, a = null);
	}, l = () => {
		s && c(), p();
	}, u = null, d = () => {
		u != null && clearTimeout(u), u = setTimeout(() => {
			u = null, l();
		}, t);
	}, f = () => {
		u !== null && (clearTimeout(u), u = null);
	}, p = () => {
		f(), i = void 0, a = null;
	}, m = () => {
		c();
	}, h = function(...e) {
		if (n?.aborted) return;
		i = this, a = e;
		let t = u == null;
		d(), o && t && c();
	};
	return h.schedule = d, h.cancel = p, h.flush = m, n?.addEventListener("abort", p, { once: !0 }), h;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/function/debounce.mjs
function bh(e, t = 0, n = {}) {
	typeof n != "object" && (n = {});
	let { leading: r = !1, trailing: i = !0, maxWait: a } = n, o = [, ,];
	r && (o[0] = "leading"), i && (o[1] = "trailing");
	let s, c = null, l = yh(function(...t) {
		s = e.apply(this, t), c = null;
	}, t, { edges: o }), u = function(...t) {
		return a != null && (c === null && (c = Date.now()), Date.now() - c >= a) ? ((r || i) && (s = e.apply(this, t)), c = Date.now(), l.cancel(), l.schedule(), s) : (l.apply(this, t), s);
	};
	return u.cancel = l.cancel, u.flush = () => (l.flush(), s), u;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/function/throttle.mjs
function xh(e, t = 0, n = {}) {
	let { leading: r = !0, trailing: i = !0 } = n;
	return bh(e, t, {
		leading: r,
		maxWait: t,
		trailing: i
	});
}
//#endregion
//#region node_modules/recharts/es6/util/LogUtils.js
var Sh = function(e, t) {
	var n = [...arguments].slice(2);
	if (typeof console < "u" && console.warn && (t === void 0 && console.warn("LogUtils requires an error message argument"), !e)) {
		if (t === void 0) console.warn("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.");
		else {
			var r = 0;
			console.warn(t.replace(/%s/g, () => n[r++]));
		}
	}
}, Ch = {
	width: "100%",
	height: "100%",
	debounce: 0,
	minWidth: 0,
	initialDimension: {
		width: -1,
		height: -1
	}
}, wh = (e, t, n) => {
	var r = n.width, i = r === void 0 ? Ch.width : r, a = n.height, o = a === void 0 ? Ch.height : a, s = n.aspect, c = n.maxHeight, l = nc(i) ? e : Number(i), u = nc(o) ? t : Number(o);
	return s && s > 0 && (l ? u = l / s : u && (l = u * s), c && u != null && u > c && (u = c)), {
		calculatedWidth: l,
		calculatedHeight: u
	};
}, Th = {
	width: 0,
	height: 0,
	overflow: "visible"
}, Eh = {
	width: 0,
	overflowX: "visible"
}, Dh = {
	height: 0,
	overflowY: "visible"
}, Oh = {}, kh = (e) => {
	var t = e.width, n = e.height, r = nc(t), i = nc(n);
	return r && i ? Th : r ? Eh : i ? Dh : Oh;
};
function Ah(e) {
	var t = e.width, n = e.height, r = e.aspect, i = t, a = n;
	return i === void 0 && a === void 0 ? (i = Ch.width, a = Ch.height) : i === void 0 ? i = r && r > 0 ? void 0 : Ch.width : a === void 0 && (a = r && r > 0 ? void 0 : Ch.height), {
		width: i,
		height: a
	};
}
//#endregion
//#region node_modules/recharts/es6/component/ResponsiveContainer.js
var jh = [
	"aspect",
	"initialDimension",
	"width",
	"height",
	"minWidth",
	"minHeight",
	"maxHeight",
	"children",
	"debounce",
	"id",
	"className",
	"onResize",
	"style"
];
function Mh() {
	return Mh = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Mh.apply(null, arguments);
}
function Nh(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Ph(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Nh(Object(n), !0).forEach(function(t) {
			Fh(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Nh(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Fh(e, t, n) {
	return (t = Ih(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Ih(e) {
	var t = Lh(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Lh(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Rh(e, t) {
	return Uh(e) || Hh(e, t) || Bh(e, t) || zh();
}
function zh() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function Bh(e, t) {
	if (e) {
		if (typeof e == "string") return Vh(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? Vh(e, t) : void 0;
	}
}
function Vh(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function Hh(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function Uh(e) {
	if (Array.isArray(e)) return e;
}
function Wh(e, t) {
	if (e == null) return {};
	var n, r, i = Gh(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function Gh(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var Kh = /*#__PURE__*/ (0, x.createContext)(Ch.initialDimension);
function qh(e) {
	return Om(e.width) && Om(e.height);
}
function Jh(e) {
	var t = e.children, n = e.width, r = e.height, i = (0, x.useMemo)(() => ({
		width: n,
		height: r
	}), [n, r]);
	return qh(i) ? /*#__PURE__*/ x.createElement(Kh.Provider, { value: i }, t) : null;
}
var Yh = () => (0, x.useContext)(Kh), Xh = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.aspect, r = e.initialDimension, i = r === void 0 ? Ch.initialDimension : r, a = e.width, o = e.height, s = e.minWidth, c = s === void 0 ? Ch.minWidth : s, l = e.minHeight, u = e.maxHeight, d = e.children, f = e.debounce, p = f === void 0 ? Ch.debounce : f, m = e.id, h = e.className, g = e.onResize, _ = e.style, v = _ === void 0 ? {} : _, y = Wh(e, jh), b = (0, x.useRef)(null), S = (0, x.useRef)();
	S.current = g, (0, x.useImperativeHandle)(t, () => b.current);
	var C = Rh((0, x.useState)({
		containerWidth: i.width,
		containerHeight: i.height
	}), 2), w = C[0], T = C[1], E = (0, x.useCallback)((e, t) => {
		T((n) => {
			var r = Math.round(e), i = Math.round(t);
			return n.containerWidth === r && n.containerHeight === i ? n : {
				containerWidth: r,
				containerHeight: i
			};
		});
	}, []);
	(0, x.useEffect)(() => {
		if (b.current == null || typeof ResizeObserver > "u") return pc;
		var e = (e) => {
			var t, n = e[0];
			if (n != null) {
				var r = n.contentRect, i = r.width, a = r.height;
				E(i, a), (t = S.current) == null || t.call(S, i, a);
			}
		};
		p > 0 && (e = xh(e, p, {
			trailing: !0,
			leading: !1
		}));
		var t = new ResizeObserver(e), n = b.current.getBoundingClientRect(), r = n.width, i = n.height;
		return E(r, i), t.observe(b.current), () => {
			t.disconnect();
		};
	}, [E, p]);
	var D = w.containerWidth, O = w.containerHeight;
	Sh(!n || n > 0, "The aspect(%s) must be greater than zero.", n);
	var k = wh(D, O, {
		width: a,
		height: o,
		aspect: n,
		maxHeight: u
	}), A = k.calculatedWidth, j = k.calculatedHeight;
	return Sh(D < 0 || O < 0 || A != null && A > 0 || j != null && j > 0, "The width(%s) and height(%s) of chart should be greater than 0,\n       please check the style of container, or the props width(%s) and height(%s),\n       or add a minWidth(%s) or minHeight(%s) or use aspect(%s) to control the\n       height and width.", A, j, a, o, c, l, n), /*#__PURE__*/ x.createElement("div", Mh({
		id: m ? `${m}` : void 0,
		className: Ss("recharts-responsive-container", h),
		style: Ph(Ph({}, v), {}, {
			width: a,
			height: o,
			minWidth: c,
			minHeight: l,
			maxHeight: u
		}),
		ref: b
	}, y), /*#__PURE__*/ x.createElement("div", { style: kh({
		width: a,
		height: o
	}) }, /*#__PURE__*/ x.createElement(Jh, {
		width: A,
		height: j
	}, d)));
}), Zh = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = Yh();
	if (Om(n.width) && Om(n.height)) return e.children;
	var r = Ah({
		width: e.width,
		height: e.height,
		aspect: e.aspect
	}), i = r.width, a = r.height, o = wh(void 0, void 0, {
		width: i,
		height: a,
		aspect: e.aspect,
		maxHeight: e.maxHeight
	}), s = o.calculatedWidth, c = o.calculatedHeight;
	return V(s) && V(c) ? /*#__PURE__*/ x.createElement(Jh, {
		width: s,
		height: c
	}, e.children) : /*#__PURE__*/ x.createElement(Xh, Mh({}, e, {
		width: i,
		height: a,
		ref: t
	}));
}), Qh = () => {
	var e = gh(), t = H(mh), n = H(vh), r = H(_h)?.padding;
	return !e || !n || !r ? t : {
		width: n.width - r.left - r.right,
		height: n.height - r.top - r.bottom,
		x: r.left,
		y: r.top
	};
}, $h = {
	top: 0,
	bottom: 0,
	left: 0,
	right: 0,
	width: 0,
	height: 0,
	brushBottom: 0
}, eg = () => H(ph) ?? $h, tg = () => H(Ym), ng = () => H(Xm), rg = (e) => e.layout.layoutType, ig = () => H(rg), ag = (e) => {
	var t = e.layout.layoutType;
	if (t === "centric" || t === "radial") return t;
}, og = () => H(ag), sg = () => ig() !== void 0, cg = (e) => {
	var t = Ku(), n = gh(), r = e.width, i = e.height, a = Yh(), o = r, s = i;
	return a && (o = a.width > 0 ? a.width : r, s = a.height > 0 ? a.height : i), (0, x.useEffect)(() => {
		!n && Om(o) && Om(s) && t(Cm({
			width: o,
			height: s
		}));
	}, [
		t,
		n,
		o,
		s
	]), null;
}, lg = jp({
	name: "legend",
	initialState: {
		settings: {
			layout: "horizontal",
			align: "center",
			verticalAlign: "bottom",
			itemSorter: "value",
			position: void 0,
			offset: 0
		},
		size: {
			width: 0,
			height: 0
		},
		payload: []
	},
	reducers: {
		setLegendSize(e, t) {
			e.size.width = t.payload.width, e.size.height = t.payload.height;
		},
		setLegendSettings(e, t) {
			e.settings.align = t.payload.align, e.settings.layout = t.payload.layout, e.settings.verticalAlign = t.payload.verticalAlign, e.settings.itemSorter = t.payload.itemSorter, e.settings.position = t.payload.position, e.settings.offset = t.payload.offset;
		},
		addLegendPayload: {
			reducer(e, t) {
				e.payload.push(Y(t.payload));
			},
			prepare: gp()
		},
		replaceLegendPayload: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next, a = np(e).payload.indexOf(Y(r));
				a > -1 && (e.payload[a] = Y(i));
			},
			prepare: gp()
		},
		removeLegendPayload: {
			reducer(e, t) {
				var n = np(e).payload.indexOf(Y(t.payload));
				n > -1 && e.payload.splice(n, 1);
			},
			prepare: gp()
		}
	}
}), ug = lg.actions;
ug.setLegendSize, ug.setLegendSettings;
var dg = ug.addLegendPayload, fg = ug.replaceLegendPayload, pg = ug.removeLegendPayload, mg = lg.reducer, hg = /* @__PURE__ */ o(((e) => {
	var t = d();
	t.useSyncExternalStore, t.useRef, t.useEffect, t.useMemo, t.useDebugValue;
}));
(/* @__PURE__ */ o(((e, t) => {
	t.exports = hg();
})))();
function gg(e) {
	e();
}
function _g() {
	let e = null, t = null;
	return {
		clear() {
			e = null, t = null;
		},
		notify() {
			gg(() => {
				let t = e;
				for (; t;) t.callback(), t = t.next;
			});
		},
		get() {
			let t = [], n = e;
			for (; n;) t.push(n), n = n.next;
			return t;
		},
		subscribe(n) {
			let r = !0, i = t = {
				callback: n,
				next: null,
				prev: t
			};
			return i.prev ? i.prev.next = i : e = i, function() {
				r && e !== null && (r = !1, i.next ? i.next.prev = i.prev : t = i.prev, i.prev ? i.prev.next = i.next : e = i.next);
			};
		}
	};
}
var vg = {
	notify() {},
	get: () => []
};
function yg(e, t) {
	let n, r = vg, i = 0, a = !1;
	function o(e) {
		u();
		let t = r.subscribe(e), n = !1;
		return () => {
			n || (n = !0, t(), d());
		};
	}
	function s() {
		r.notify();
	}
	function c() {
		m.onStateChange && m.onStateChange();
	}
	function l() {
		return a;
	}
	function u() {
		i++, n || (n = t ? t.addNestedSub(c) : e.subscribe(c), r = _g());
	}
	function d() {
		i--, n && i === 0 && (n(), n = void 0, r.clear(), r = vg);
	}
	function f() {
		a || (a = !0, u());
	}
	function p() {
		a && (a = !1, d());
	}
	let m = {
		addNestedSub: o,
		notifyNestedSubs: s,
		handleChangeWrapper: c,
		isSubscribed: l,
		trySubscribe: f,
		tryUnsubscribe: p,
		getListeners: () => r
	};
	return m;
}
var bg = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, xg = typeof navigator < "u" && navigator.product === "ReactNative", Sg = bg || xg ? x.useLayoutEffect : x.useEffect;
function Cg(e, t) {
	return e === t ? e !== 0 || t !== 0 || 1 / e == 1 / t : e !== e && t !== t;
}
function wg(e, t) {
	if (Cg(e, t)) return !0;
	if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
	let n = Object.keys(e), r = Object.keys(t);
	if (n.length !== r.length) return !1;
	for (let r = 0; r < n.length; r++) if (!Object.prototype.hasOwnProperty.call(t, n[r]) || !Cg(e[n[r]], t[n[r]])) return !1;
	return !0;
}
var Tg = /* @__PURE__ */ Symbol.for("react-redux-context"), Eg = typeof globalThis < "u" ? globalThis : {};
function Dg() {
	if (!x.createContext) return {};
	let e = Eg[Tg] ??= /* @__PURE__ */ new Map(), t = e.get(x.createContext);
	return t || (t = x.createContext(null), e.set(x.createContext, t)), t;
}
var Og = /* @__PURE__ */ Dg();
function kg(e) {
	let { children: t, context: n, serverState: r, store: i } = e, a = x.useMemo(() => {
		let e = yg(i);
		return {
			store: i,
			subscription: e,
			getServerState: r ? () => r : void 0
		};
	}, [i, r]), o = x.useMemo(() => i.getState(), [i]);
	Sg(() => {
		let { subscription: e } = a;
		return e.onStateChange = e.notifyNestedSubs, e.trySubscribe(), o !== i.getState() && e.notifyNestedSubs(), () => {
			e.tryUnsubscribe(), e.onStateChange = void 0;
		};
	}, [a, o]);
	let s = n || Og;
	return /* @__PURE__ */ x.createElement(s.Provider, { value: a }, t);
}
var Ag = kg, jg = /* @__PURE__ */ new Set([
	"axisLine",
	"tickLine",
	"activeBar",
	"activeDot",
	"activeLabel",
	"activeShape",
	"allowEscapeViewBox",
	"background",
	"cursor",
	"dot",
	"label",
	"line",
	"margin",
	"padding",
	"position",
	"shape",
	"style",
	"tick",
	"wrapperStyle",
	"radius",
	"throttledEvents"
]);
function Mg(e, t) {
	return e == null && t == null ? !0 : typeof e == "number" && typeof t == "number" ? e === t || e !== e && t !== t : e === t;
}
function Ng(e, t) {
	for (var n of /* @__PURE__ */ new Set([...Object.keys(e), ...Object.keys(t)])) if (jg.has(n)) {
		if (e[n] == null && t[n] == null) continue;
		if (!wg(e[n], t[n])) return !1;
	} else if (!Mg(e[n], t[n])) return !1;
	return !0;
}
//#endregion
//#region node_modules/recharts/es6/component/DefaultTooltipContent.js
function Pg() {
	return Pg = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Pg.apply(null, arguments);
}
function Fg(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Ig(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Fg(Object(n), !0).forEach(function(t) {
			Lg(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Fg(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Lg(e, t, n) {
	return (t = Rg(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Rg(e) {
	var t = zg(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function zg(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Bg(e, t) {
	return Gg(e) || Wg(e, t) || Hg(e, t) || Vg();
}
function Vg() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function Hg(e, t) {
	if (e) {
		if (typeof e == "string") return Ug(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? Ug(e, t) : void 0;
	}
}
function Ug(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function Wg(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function Gg(e) {
	if (Array.isArray(e)) return e;
}
function Kg(e) {
	return Array.isArray(e) && rc(e[0]) && rc(e[1]) ? e.join(" ~ ") : e;
}
var qg = {
	separator: " : ",
	contentStyle: {
		margin: 0,
		padding: 10,
		backgroundColor: "#fff",
		border: "1px solid #ccc",
		whiteSpace: "nowrap"
	},
	itemStyle: {
		display: "block",
		paddingTop: 4,
		paddingBottom: 4,
		color: "#000"
	},
	labelStyle: {},
	accessibilityLayer: !1
};
function Jg(e, t) {
	return t == null ? e : md(e, t);
}
var Yg = (e) => {
	var t = e.separator, n = t === void 0 ? qg.separator : t, r = e.contentStyle, i = e.itemStyle, a = e.labelStyle, o = a === void 0 ? qg.labelStyle : a, s = e.payload, c = e.formatter, l = e.itemSorter, u = e.wrapperClassName, d = e.labelClassName, f = e.label, p = e.labelFormatter, m = e.accessibilityLayer, h = m === void 0 ? qg.accessibilityLayer : m, g = () => {
		if (s && s.length) {
			var e = {
				padding: 0,
				margin: 0
			}, t = Jg(s, l).map((e, t) => {
				if (!e || e.type === "none") return null;
				var r = e.formatter || c || Kg, a = e.value, o = e.name, l = a, u = o;
				if (r) {
					var d = r(a, o, e, t, s);
					if (Array.isArray(d)) {
						var f = Bg(d, 2);
						l = f[0], u = f[1];
					} else if (d != null) l = d;
					else return null;
				}
				var p = Ig(Ig({}, qg.itemStyle), {}, { color: e.color || qg.itemStyle.color }, i);
				return /*#__PURE__*/ x.createElement("li", {
					className: "recharts-tooltip-item",
					key: `tooltip-item-${t}`,
					style: p
				}, rc(u) ? /*#__PURE__*/ x.createElement("span", { className: "recharts-tooltip-item-name" }, u) : null, rc(u) ? /*#__PURE__*/ x.createElement("span", { className: "recharts-tooltip-item-separator" }, n) : null, /*#__PURE__*/ x.createElement("span", { className: "recharts-tooltip-item-value" }, l), /*#__PURE__*/ x.createElement("span", { className: "recharts-tooltip-item-unit" }, e.unit || ""));
			});
			return /*#__PURE__*/ x.createElement("ul", {
				className: "recharts-tooltip-item-list",
				style: e
			}, t);
		}
		return null;
	}, _ = Ig(Ig({}, qg.contentStyle), r), v = Ig({ margin: 0 }, o), y = !uc(f), b = y ? f : "", S = Ss("recharts-default-tooltip", u), C = Ss("recharts-tooltip-label", d);
	y && p && s != null && (b = p(f, s));
	var w = h ? {
		role: "status",
		"aria-live": "assertive"
	} : {};
	return /*#__PURE__*/ x.createElement("div", Pg({
		className: S,
		style: _
	}, w), /*#__PURE__*/ x.createElement("p", {
		className: C,
		style: v
	}, /*#__PURE__*/ x.isValidElement(b) ? b : `${b}`), g());
}, Xg = "recharts-tooltip-wrapper", Zg = { visibility: "hidden" };
function Qg(e) {
	var t = e.coordinate, n = e.translateX, r = e.translateY;
	return Ss(Xg, {
		[`${Xg}-right`]: V(n) && t && V(t.x) && n >= t.x,
		[`${Xg}-left`]: V(n) && t && V(t.x) && n < t.x,
		[`${Xg}-bottom`]: V(r) && t && V(t.y) && r >= t.y,
		[`${Xg}-top`]: V(r) && t && V(t.y) && r < t.y
	});
}
function $g(e) {
	var t = e.allowEscapeViewBox, n = e.coordinate, r = e.key, i = e.offset, a = e.position, o = e.reverseDirection, s = e.tooltipDimension, c = e.viewBox, l = e.viewBoxDimension;
	if (a && V(a[r])) return a[r];
	var u = n[r] - s - (i > 0 ? i : 0), d = n[r] + i;
	if (t[r]) return o[r] ? u : d;
	var f = c[r];
	return f == null ? 0 : o[r] ? Math.max(u < f ? d : u, f) : l == null ? 0 : d + s > f + l ? Math.max(u, f) : Math.max(d, f);
}
function e_(e) {
	var t = e.translateX, n = e.translateY;
	return { transform: e.useTranslate3d ? `translate3d(${t}px, ${n}px, 0)` : `translate(${t}px, ${n}px)` };
}
function t_(e) {
	var t = e.allowEscapeViewBox, n = e.coordinate, r = e.offsetTop, i = e.offsetLeft, a = e.position, o = e.reverseDirection, s = e.tooltipBox, c = e.useTranslate3d, l = e.viewBox, u, d, f;
	return s && s.height > 0 && s.width > 0 && n ? (d = $g({
		allowEscapeViewBox: t,
		coordinate: n,
		key: "x",
		offset: i,
		position: a,
		reverseDirection: o,
		tooltipDimension: s.width,
		viewBox: l,
		viewBoxDimension: l.width
	}), f = $g({
		allowEscapeViewBox: t,
		coordinate: n,
		key: "y",
		offset: r,
		position: a,
		reverseDirection: o,
		tooltipDimension: s.height,
		viewBox: l,
		viewBoxDimension: l.height
	}), u = e_({
		translateX: d,
		translateY: f,
		useTranslate3d: c
	})) : u = Zg, {
		cssProperties: u,
		cssClasses: Qg({
			translateX: d,
			translateY: f,
			coordinate: n
		})
	};
}
var n_ = {
	devToolsEnabled: !0,
	isSsr: !(typeof window < "u" && window.document && window.document.createElement && window.setTimeout)
};
//#endregion
//#region node_modules/recharts/es6/util/usePrefersReducedMotion.js
function r_(e, t) {
	return c_(e) || s_(e, t) || a_(e, t) || i_();
}
function i_() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function a_(e, t) {
	if (e) {
		if (typeof e == "string") return o_(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? o_(e, t) : void 0;
	}
}
function o_(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function s_(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function c_(e) {
	if (Array.isArray(e)) return e;
}
function l_() {
	var e = r_((0, x.useState)(() => n_.isSsr || !window.matchMedia ? !1 : window.matchMedia("(prefers-reduced-motion: reduce)").matches), 2), t = e[0], n = e[1];
	return (0, x.useEffect)(() => {
		if (window.matchMedia) {
			var e = window.matchMedia("(prefers-reduced-motion: reduce)"), t = () => {
				n(e.matches);
			};
			return e.addEventListener("change", t), () => {
				e.removeEventListener("change", t);
			};
		}
	}, []), t;
}
//#endregion
//#region node_modules/recharts/es6/component/TooltipBoundingBox.js
function u_(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function d_(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? u_(Object(n), !0).forEach(function(t) {
			f_(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : u_(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function f_(e, t, n) {
	return (t = p_(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function p_(e) {
	var t = m_(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function m_(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function h_(e, t) {
	return b_(e) || y_(e, t) || __(e, t) || g_();
}
function g_() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function __(e, t) {
	if (e) {
		if (typeof e == "string") return v_(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? v_(e, t) : void 0;
	}
}
function v_(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function y_(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function b_(e) {
	if (Array.isArray(e)) return e;
}
function x_(e) {
	if (!(e.prefersReducedMotion && e.isAnimationActive === "auto") && e.isAnimationActive && e.active) {
		var t = typeof e.animationEasing == "string" ? e.animationEasing : "ease";
		return `transform ${e.animationDuration}ms ${t}`;
	}
}
function S_(e) {
	var t = l_(), n = h_(x.useState(() => ({
		dismissed: !1,
		dismissedAtCoordinate: {
			x: 0,
			y: 0
		}
	})), 2), r = n[0], i = n[1];
	x.useEffect(() => {
		var t = (t) => {
			t.key === "Escape" && i({
				dismissed: !0,
				dismissedAtCoordinate: {
					x: e.coordinate?.x ?? 0,
					y: e.coordinate?.y ?? 0
				}
			});
		};
		return document.addEventListener("keydown", t), () => {
			document.removeEventListener("keydown", t);
		};
	}, [e.coordinate?.x, e.coordinate?.y]), r.dismissed && ((e.coordinate?.x ?? 0) !== r.dismissedAtCoordinate.x || (e.coordinate?.y ?? 0) !== r.dismissedAtCoordinate.y) && i(d_(d_({}, r), {}, { dismissed: !1 }));
	var a = t_({
		allowEscapeViewBox: e.allowEscapeViewBox,
		coordinate: e.coordinate,
		offsetLeft: typeof e.offset == "number" ? e.offset : e.offset.x,
		offsetTop: typeof e.offset == "number" ? e.offset : e.offset.y,
		position: e.position,
		reverseDirection: e.reverseDirection,
		tooltipBox: e.lastBoundingBox,
		useTranslate3d: e.useTranslate3d,
		viewBox: e.viewBox
	}), o = a.cssClasses, s = a.cssProperties, c = d_(d_({}, e.hasPortalFromProps ? {} : d_(d_({ transition: x_({
		prefersReducedMotion: t,
		isAnimationActive: e.isAnimationActive,
		active: e.active,
		animationDuration: e.animationDuration,
		animationEasing: e.animationEasing
	}) }, s), {}, {
		pointerEvents: "none",
		position: "absolute",
		top: 0,
		left: 0
	})), {}, { visibility: !r.dismissed && e.active && e.hasPayload ? "visible" : "hidden" }, e.wrapperStyle);
	return /*#__PURE__*/ x.createElement("div", {
		xmlns: "http://www.w3.org/1999/xhtml",
		tabIndex: -1,
		className: o,
		style: c,
		ref: e.innerRef
	}, e.children);
}
var C_ = /*#__PURE__*/ x.memo(S_), w_ = () => H((e) => e.rootProps.accessibilityLayer) ?? !0;
//#endregion
//#region node_modules/recharts/es6/shape/Curve.js
function T_() {
	return T_ = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, T_.apply(null, arguments);
}
function E_(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function D_(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? E_(Object(n), !0).forEach(function(t) {
			O_(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : E_(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function O_(e, t, n) {
	return (t = k_(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function k_(e) {
	var t = A_(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function A_(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var j_ = {
	curveBasisClosed: Jc,
	curveBasisOpen: Xc,
	curveBasis: Kc,
	curveBumpX: Vc,
	curveBumpY: Hc,
	curveLinearClosed: Qc,
	curveLinear: Fc,
	curveMonotoneX: ol,
	curveMonotoneY: sl,
	curveNatural: ul,
	curveStep: fl,
	curveStepAfter: ml,
	curveStepBefore: pl
}, M_ = (e) => Dm(e.x) && Dm(e.y), N_ = (e) => e.base != null && M_(e.base) && M_(e), P_ = (e) => e.x, F_ = (e) => e.y, I_ = (e, t) => {
	if (typeof e == "function") return e;
	var n = `curve${dc(e)}`;
	if ((n === "curveMonotone" || n === "curveBump") && t) {
		var r = j_[`${n}${t === "vertical" ? "Y" : "X"}`];
		if (r) return r;
	}
	return j_[n] || Fc;
}, L_ = {
	connectNulls: !1,
	type: "linear"
}, R_ = (e) => {
	var t = e.type, n = t === void 0 ? L_.type : t, r = e.points, i = r === void 0 ? [] : r, a = e.baseLine, o = e.layout, s = e.connectNulls, c = s === void 0 ? L_.connectNulls : s, l = I_(n, o), u = c ? i.filter(M_) : i;
	if (Array.isArray(a)) {
		var d, f = i.map((e, t) => D_(D_({}, e), {}, { base: a[t] }));
		return d = o === "vertical" ? zc().y(F_).x1(P_).x0((e) => e.base.x) : zc().x(P_).y1(F_).y0((e) => e.base.y), d.defined(N_).curve(l)(c ? f.filter(N_) : f);
	}
	return (o === "vertical" && V(a) ? zc().y(F_).x1(P_).x0(a) : V(a) ? zc().x(P_).y1(F_).y0(a) : Rc().x(P_).y(F_)).defined(M_).curve(l)(u);
}, z_ = (e) => {
	var t = e.className, n = e.points, r = e.path, i = e.pathRef, a = ig();
	if ((!n || !n.length) && !r) return null;
	var o = {
		type: e.type,
		points: e.points,
		baseLine: e.baseLine,
		layout: e.layout || a,
		connectNulls: e.connectNulls
	}, s = n && n.length ? R_(o) : r;
	return /*#__PURE__*/ x.createElement("path", T_({}, Os(e), wl(e), {
		className: Ss("recharts-curve", t),
		d: s === null ? void 0 : s,
		ref: i
	}));
}, B_ = [
	"x",
	"y",
	"top",
	"left",
	"width",
	"height",
	"className"
];
function V_() {
	return V_ = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, V_.apply(null, arguments);
}
function H_(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function U_(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? H_(Object(n), !0).forEach(function(t) {
			W_(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : H_(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function W_(e, t, n) {
	return (t = G_(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function G_(e) {
	var t = K_(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function K_(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function q_(e, t) {
	if (e == null) return {};
	var n, r, i = J_(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function J_(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var Y_ = (e, t, n, r, i, a) => `M${e},${i}v${r}M${a},${t}h${n}`, X_ = (e) => {
	var t = e.x, n = t === void 0 ? 0 : t, r = e.y, i = r === void 0 ? 0 : r, a = e.top, o = a === void 0 ? 0 : a, s = e.left, c = s === void 0 ? 0 : s, l = e.width, u = l === void 0 ? 0 : l, d = e.height, f = d === void 0 ? 0 : d, p = e.className, m = q_(e, B_), h = U_({
		x: n,
		y: i,
		top: o,
		left: c,
		width: u,
		height: f
	}, m);
	return !V(n) || !V(i) || !V(u) || !V(f) || !V(o) || !V(c) ? null : /*#__PURE__*/ x.createElement("path", V_({}, As(h), {
		className: Ss("recharts-cross", p),
		d: Y_(n, i, u, f, o, c)
	}));
};
//#endregion
//#region node_modules/recharts/es6/util/cursor/getCursorRectangle.js
function Z_(e, t, n, r) {
	var i = r / 2;
	return {
		stroke: "none",
		fill: "#ccc",
		x: e === "horizontal" ? t.x - i : n.left + .5,
		y: e === "horizontal" ? n.top + .5 : t.y - i,
		width: e === "horizontal" ? r : n.width - 1,
		height: e === "horizontal" ? n.height - 1 : r
	};
}
var Q_ = (e, t) => [
	0,
	3 * e,
	3 * t - 6 * e,
	3 * e - 3 * t + 1
], $_ = (e, t) => e.map((e, n) => e * t ** n).reduce((e, t) => e + t), ev = (e, t) => (n) => $_(Q_(e, t), n), tv = (e, t) => (n) => $_([...Q_(e, t).map((e, t) => e * t).slice(1), 0], n), nv = (e) => {
	var t, n = e.split("(");
	if (n.length !== 2 || n[0] !== "cubic-bezier") return null;
	var r = (t = n[1]) == null || (t = t.split(")")[0]) == null ? void 0 : t.split(",");
	if (r == null || r.length !== 4) return null;
	var i = r.map((e) => parseFloat(e));
	return [
		i[0],
		i[1],
		i[2],
		i[3]
	];
}, rv = function() {
	var e = [...arguments];
	if (e.length === 1) switch (e[0]) {
		case "linear": return [
			0,
			0,
			1,
			1
		];
		case "ease": return [
			.25,
			.1,
			.25,
			1
		];
		case "ease-in": return [
			.42,
			0,
			1,
			1
		];
		case "ease-out": return [
			.42,
			0,
			.58,
			1
		];
		case "ease-in-out": return [
			0,
			0,
			.58,
			1
		];
		default:
			var t = nv(e[0]);
			if (t) return t;
	}
	return e.length === 4 ? e : [
		0,
		0,
		1,
		1
	];
}, iv = (e, t, n, r) => {
	var i = ev(e, n), a = ev(t, r), o = tv(e, n), s = (e) => e > 1 ? 1 : e < 0 ? 0 : e, c = (e) => {
		for (var t = e > 1 ? 1 : e, n = t, r = 0; r < 8; ++r) {
			var c = i(n) - t, l = o(n);
			if (Math.abs(c - t) < 1e-4 || l < 1e-4) return a(n);
			n = s(n - c / l);
		}
		return a(n);
	};
	return c.isStepper = !1, c;
}, av = function() {
	return iv(...rv(...arguments));
}, ov = function() {
	for (var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = e.stiff, n = t === void 0 ? 100 : t, r = e.damping, i = r === void 0 ? 8 : r, a = e.dt, o = a === void 0 ? 16.67 : a, s = 1, c = [0], l = 0, u = 0, d = 1e4, f = 0; f < d;) {
		var p = -(l - s) * n, m = u * i;
		if (u += (p - m) * o / 1e3, l += u * o / 1e3, c.push(l), Math.abs(l - s) < 1e-4 && Math.abs(u) < 1e-4) break;
		f++;
	}
	c[c.length - 1] = s;
	var h = c.length - 1;
	return (e) => {
		if (e <= 0) return 0;
		if (e >= 1) return s;
		var t = e * h, n = Math.floor(t), r = t - n;
		return (c[n] ?? 0) + ((c[n + 1] ?? 0) - (c[n] ?? 0)) * r;
	};
}, sv = (e) => {
	if (typeof e == "string") switch (e) {
		case "ease":
		case "ease-in-out":
		case "ease-out":
		case "ease-in":
		case "linear": return av(e);
		case "spring": return ov();
		default: if (e.split("(")[0] === "cubic-bezier") return av(e);
	}
	return typeof e == "function" ? e : null;
}, cv = /*#__PURE__*/ (0, x.createContext)((e, t, n) => {
	var r, i = (a) => {
		var o = t.tick(a);
		if (t.getState() === "active") {
			if (n(t.getInterpolated()), t.getProgress() === 1) {
				t.complete(), r = void 0;
				return;
			}
			r = e.setTimeout(i, o);
			return;
		}
		r = e.setTimeout(i, o);
	};
	return r = e.setTimeout(i, 0), () => r?.();
});
cv.Provider;
function lv(e) {
	var t = (0, x.useContext)(cv);
	return (0, x.useMemo)(() => e ?? t, [e, t]);
}
//#endregion
//#region node_modules/recharts/es6/animation/AnimationHandle.js
function uv(e, t, n) {
	return (t = dv(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function dv(e) {
	var t = fv(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function fv(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var pv = "init", mv = "pending", hv = "active", gv = "completed";
function _v(e) {
	return Math.max(0, e);
}
var vv = class {
	getAnimationStartedTime() {
		return this.animationStartedTime;
	}
	getBeginStartedTime() {
		return this.beginStartedTime;
	}
	constructor(e) {
		var t;
		uv(this, "state", pv), this.animationId = e.animationId, this.onAnimationEnd = e.onAnimationEnd, this.animationDuration = _v(e.animationDuration), this.animationBegin = _v(e.animationBegin), this.progress = 0, this.from = e.from, this.to = e.to, this.easing = e.easing, (t = e.onAnimationStart) == null || t.call(e);
	}
	getState() {
		return this.state;
	}
	getEasing() {
		return this.easing;
	}
	getAnimationDuration() {
		return this.animationDuration;
	}
	tick(e) {
		if (this.getState() === pv) return this.state = mv, this.beginStartedTime = e, this.animationBegin;
		if (this.getState() === mv) {
			if (this.beginStartedTime == null) throw Error();
			var t = e - this.beginStartedTime;
			return t >= this.animationBegin ? (this.state = hv, this.animationStartedTime = e, this.nextAnimationUpdate(0)) : _v(this.animationBegin - t);
		}
		if (this.getState() === hv) {
			if (this.animationStartedTime == null) throw Error();
			var n = e - this.animationStartedTime;
			return this.setProgress(n / this.animationDuration), this.nextAnimationUpdate(n);
		}
		return 0;
	}
	setProgress(e) {
		this.progress = Math.min(1, Math.max(0, e));
	}
	getProgress() {
		return this.progress;
	}
	complete() {
		if (this.progress = 1, this.state === "active") {
			var e;
			(e = this.onAnimationEnd) == null || e.call(this);
		}
		this.state = gv;
	}
	getFrom() {
		return this.from;
	}
	getTo() {
		return this.to;
	}
	getAnimationId() {
		return this.animationId;
	}
	getAnimationBegin() {
		return this.animationBegin;
	}
}, yv = class extends vv {
	nextAnimationUpdate() {
		return 0;
	}
	getInterpolated() {
		return this.easing(cc(this.getFrom(), this.getTo(), this.getProgress()));
	}
}, bv = class {
	setTimeout(e) {
		var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = performance.now(), r = null, i = (a) => {
			a - n >= t ? e(a) : r = requestAnimationFrame(i);
		};
		return r = requestAnimationFrame(i), () => {
			r != null && cancelAnimationFrame(r);
		};
	}
};
//#endregion
//#region node_modules/recharts/es6/animation/JavascriptAnimate.js
function xv(e, t) {
	return Ev(e) || Tv(e, t) || Cv(e, t) || Sv();
}
function Sv() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function Cv(e, t) {
	if (e) {
		if (typeof e == "string") return wv(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? wv(e, t) : void 0;
	}
}
function wv(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function Tv(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function Ev(e) {
	if (Array.isArray(e)) return e;
}
var Dv = {
	begin: 0,
	duration: 1e3,
	easing: "ease",
	isActive: !0,
	canBegin: !0,
	onAnimationEnd: () => {},
	onAnimationStart: () => {}
}, Ov = 0, kv = 1;
function Av(e) {
	var t = Ml(e, Dv), n = t.animationId, r = t.isActive, i = t.canBegin, a = t.duration, o = t.easing, s = t.begin, c = t.onAnimationEnd, l = t.onAnimationStart, u = t.children, d = l_(), f = r === "auto" ? !n_.isSsr && !d : r, p = lv(t.animationController), m = xv((0, x.useState)(f ? Ov : kv), 2), h = m[0], g = m[1];
	return (0, x.useEffect)(() => {
		f || g(kv);
	}, [f]), (0, x.useEffect)(() => {
		var e = sv(o);
		return !f || !i || e == null ? pc : p(new bv(), new yv({
			animationId: n,
			easing: e,
			animationDuration: a,
			animationBegin: s,
			onAnimationStart: l,
			onAnimationEnd: c,
			from: Ov,
			to: kv
		}), g);
	}, [
		p,
		n,
		f,
		i,
		a,
		o,
		s,
		l,
		c
	]), u(Number(h));
}
//#endregion
//#region node_modules/recharts/es6/util/useAnimationId.js
function jv(e) {
	var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "animation-", n = (0, x.useRef)(ac(t)), r = (0, x.useRef)(e);
	return r.current !== e && (n.current = ac(t), r.current = e), n.current;
}
//#endregion
//#region node_modules/recharts/es6/animation/util.js
var Mv = (e) => e.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`), Nv = (e, t, n) => e.map((e) => `${Mv(e)} ${t}ms ${n}`).join(","), Pv = ["radius"], Fv = ["radius"], Iv, Lv, Rv, zv, Bv, Vv, Hv, Uv, Wv, Gv;
function Kv(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function qv(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Kv(Object(n), !0).forEach(function(t) {
			Jv(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Kv(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Jv(e, t, n) {
	return (t = Yv(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Yv(e) {
	var t = Xv(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Xv(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Zv() {
	return Zv = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Zv.apply(null, arguments);
}
function Qv(e, t) {
	if (e == null) return {};
	var n, r, i = $v(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function $v(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function ey(e, t) {
	return ay(e) || iy(e, t) || ny(e, t) || ty();
}
function ty() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function ny(e, t) {
	if (e) {
		if (typeof e == "string") return ry(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? ry(e, t) : void 0;
	}
}
function ry(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function iy(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function ay(e) {
	if (Array.isArray(e)) return e;
}
function oy(e, t) {
	return t ||= e.slice(0), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
}
var sy = (e, t, n, r, i) => {
	var a = Qs(n), o = Qs(r), s = Math.min(Math.abs(a) / 2, Math.abs(o) / 2), c = o >= 0 ? 1 : -1, l = a >= 0 ? 1 : -1, u = +(o >= 0 && a >= 0 || o < 0 && a < 0), d;
	if (s > 0 && Array.isArray(i)) {
		for (var f = [
			0,
			0,
			0,
			0
		], p = 0, m = 4; p < m; p++) {
			var h = i[p] ?? 0;
			f[p] = h > s ? s : h;
		}
		d = $s(Iv ||= oy([
			"M",
			",",
			""
		]), e, t + c * f[0]), f[0] > 0 && (d += $s(Lv ||= oy([
			"A ",
			",",
			",0,0,",
			",",
			",",
			""
		]), f[0], f[0], u, e + l * f[0], t)), d += $s(Rv ||= oy([
			"L ",
			",",
			""
		]), e + n - l * f[1], t), f[1] > 0 && (d += $s(zv ||= oy([
			"A ",
			",",
			",0,0,",
			",\n        ",
			",",
			""
		]), f[1], f[1], u, e + n, t + c * f[1])), d += $s(Bv ||= oy([
			"L ",
			",",
			""
		]), e + n, t + r - c * f[2]), f[2] > 0 && (d += $s(Vv ||= oy([
			"A ",
			",",
			",0,0,",
			",\n        ",
			",",
			""
		]), f[2], f[2], u, e + n - l * f[2], t + r)), d += $s(Hv ||= oy([
			"L ",
			",",
			""
		]), e + l * f[3], t + r), f[3] > 0 && (d += $s(Uv ||= oy([
			"A ",
			",",
			",0,0,",
			",\n        ",
			",",
			""
		]), f[3], f[3], u, e, t + r - c * f[3])), d += "Z";
	} else if (s > 0 && i === +i && i > 0) {
		var g = Math.min(s, i);
		d = $s(Wv ||= oy(/* @__PURE__ */ "M .,.\n            A .,.,0,0,.,.,.\n            L .,.\n            A .,.,0,0,.,.,.\n            L .,.\n            A .,.,0,0,.,.,.\n            L .,.\n            A .,.,0,0,.,.,. Z".split(".")), e, t + c * g, g, g, u, e + l * g, t, e + n - l * g, t, g, g, u, e + n, t + c * g, e + n, t + r - c * g, g, g, u, e + n - l * g, t + r, e + l * g, t + r, g, g, u, e, t + r - c * g);
	} else d = $s(Gv ||= oy([
		"M ",
		",",
		" h ",
		" v ",
		" h ",
		" Z"
	]), e, t, n, r, -n);
	return d;
}, cy = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	radius: 0,
	isAnimationActive: !1,
	isUpdateAnimationActive: !1,
	animationBegin: 0,
	animationDuration: 1500,
	animationEasing: "ease"
}, ly = (e) => {
	var t = Ml(e, cy), n = (0, x.useRef)(null), r = ey((0, x.useState)(-1), 2), i = r[0], a = r[1];
	(0, x.useEffect)(() => {
		if (n.current && n.current.getTotalLength) try {
			var e = n.current.getTotalLength();
			e && a(e);
		} catch {}
	}, []);
	var o = t.x, s = t.y, c = t.width, l = t.height, u = t.radius, d = t.className, f = t.animationEasing, p = t.animationDuration, m = t.animationBegin, h = t.isAnimationActive, g = t.isUpdateAnimationActive, _ = (0, x.useRef)(c), v = (0, x.useRef)(l), y = (0, x.useRef)(o), b = (0, x.useRef)(s), S = jv((0, x.useMemo)(() => ({
		x: o,
		y: s,
		width: c,
		height: l,
		radius: u
	}), [
		o,
		s,
		c,
		l,
		u
	]), "rectangle-");
	if (o !== +o || s !== +s || c !== +c || l !== +l || c === 0 || l === 0) return null;
	var C = Ss("recharts-rectangle", d);
	if (!g) {
		var w = As(t);
		w.radius;
		var T = Qv(w, Pv);
		return /*#__PURE__*/ x.createElement("path", Zv({}, T, {
			x: Qs(o),
			y: Qs(s),
			width: Qs(c),
			height: Qs(l),
			radius: typeof u == "number" ? u : void 0,
			className: C,
			d: sy(o, s, c, l, u)
		}));
	}
	var E = _.current, D = v.current, O = y.current, k = b.current, A = `0px ${i === -1 ? 1 : i}px`, j = `${i}px ${i}px`, M = Nv(["strokeDasharray"], p, typeof f == "string" ? f : cy.animationEasing);
	return /*#__PURE__*/ x.createElement(Av, {
		animationId: S,
		key: S,
		canBegin: i > 0,
		duration: p,
		easing: f,
		isActive: g,
		begin: m
	}, (e) => {
		var r = cc(E, c, e), i = cc(D, l, e), a = cc(O, o, e), d = cc(k, s, e);
		n.current && (_.current = r, v.current = i, y.current = a, b.current = d);
		var f = h ? e > 0 ? {
			transition: M,
			strokeDasharray: j
		} : { strokeDasharray: A } : { strokeDasharray: j }, p = As(t);
		p.radius;
		var m = Qv(p, Fv);
		return /*#__PURE__*/ x.createElement("path", Zv({}, m, {
			radius: typeof u == "number" ? u : void 0,
			className: C,
			d: sy(a, d, r, i, u),
			ref: n,
			style: qv(qv({}, f), t.style)
		}));
	});
};
//#endregion
//#region node_modules/recharts/es6/util/PolarUtils.js
function uy(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function dy(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? uy(Object(n), !0).forEach(function(t) {
			fy(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : uy(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function fy(e, t, n) {
	return (t = py(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function py(e) {
	var t = my(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function my(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var hy = Math.PI / 180, gy = (e) => e * 180 / Math.PI, _y = (e, t, n, r) => ({
	x: e + Math.cos(-hy * r) * n,
	y: t + Math.sin(-hy * r) * n
}), vy = function(e, t) {
	var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		width: 0,
		height: 0,
		brushBottom: 0
	};
	return Math.min(Math.abs(e - (n.left || 0) - (n.right || 0)), Math.abs(t - (n.top || 0) - (n.bottom || 0))) / 2;
}, yy = (e, t) => {
	var n = e.x, r = e.y, i = t.x, a = t.y;
	return Math.sqrt((n - i) ** 2 + (r - a) ** 2);
}, by = (e, t) => {
	var n = e.x, r = e.y, i = t.cx, a = t.cy, o = yy({
		x: n,
		y: r
	}, {
		x: i,
		y: a
	});
	if (o <= 0) return {
		radius: o,
		angle: 0
	};
	var s = (n - i) / o, c = Math.acos(s);
	return r > a && (c = 2 * Math.PI - c), {
		radius: o,
		angle: gy(c),
		angleInRadian: c
	};
}, xy = (e) => {
	var t = e.startAngle, n = e.endAngle, r = Math.floor(t / 360), i = Math.floor(n / 360), a = Math.min(r, i);
	return {
		startAngle: t - a * 360,
		endAngle: n - a * 360
	};
}, Sy = (e, t) => {
	var n = t.startAngle, r = t.endAngle, i = Math.floor(n / 360), a = Math.floor(r / 360);
	return e + Math.min(i, a) * 360;
}, Cy = (e, t) => {
	var n = e.relativeX, r = e.relativeY, i = by({
		x: n,
		y: r
	}, t), a = i.radius, o = i.angle, s = t.innerRadius, c = t.outerRadius;
	if (a < s || a > c || a === 0) return null;
	var l = xy(t), u = l.startAngle, d = l.endAngle, f = o, p;
	if (u <= d) {
		for (; f > d;) f -= 360;
		for (; f < u;) f += 360;
		p = f >= u && f <= d;
	} else {
		for (; f > u;) f -= 360;
		for (; f < d;) f += 360;
		p = f >= d && f <= u;
	}
	return p ? dy(dy({}, t), {}, {
		radius: a,
		angle: Sy(f, t)
	}) : null;
};
//#endregion
//#region node_modules/recharts/es6/util/cursor/getRadialCursorPoints.js
function wy(e) {
	var t = e.cx, n = e.cy, r = e.radius, i = e.startAngle, a = e.endAngle;
	return {
		points: [_y(t, n, r, i), _y(t, n, r, a)],
		cx: t,
		cy: n,
		radius: r,
		startAngle: i,
		endAngle: a
	};
}
//#endregion
//#region node_modules/recharts/es6/shape/Sector.js
var Ty, Ey, Dy, Oy, ky, Ay, jy;
function My() {
	return My = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, My.apply(null, arguments);
}
function Ny(e, t) {
	return t ||= e.slice(0), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
}
var Py = (e, t) => ec(t - e) * Math.min(Math.abs(t - e), 359.999), Fy = (e) => {
	var t = e.cx, n = e.cy, r = e.radius, i = e.angle, a = e.sign, o = e.isExternal, s = e.cornerRadius, c = e.cornerIsExternal, l = s * (o ? 1 : -1) + r, u = Math.asin(s / l) / hy, d = c ? i : i + a * u, f = _y(t, n, l, d), p = _y(t, n, r, d), m = c ? i - a * u : i;
	return {
		center: f,
		circleTangency: p,
		lineTangency: _y(t, n, l * Math.cos(u * hy), m),
		theta: u
	};
}, Iy = (e) => {
	var t = e.cx, n = e.cy, r = e.innerRadius, i = e.outerRadius, a = e.startAngle, o = e.endAngle, s = Py(a, o), c = a + s, l = _y(t, n, i, a), u = _y(t, n, i, c), d = $s(Ty ||= Ny([
		"M ",
		",",
		"\n    A ",
		",",
		",0,\n    ",
		",",
		",\n    ",
		",",
		"\n  "
	]), l.x, l.y, i, i, +(Math.abs(s) > 180), +(a > c), u.x, u.y);
	if (r > 0) {
		var f = _y(t, n, r, a), p = _y(t, n, r, c);
		d += $s(Ey ||= Ny([
			"L ",
			",",
			"\n            A ",
			",",
			",0,\n            ",
			",",
			",\n            ",
			",",
			" Z"
		]), p.x, p.y, r, r, +(Math.abs(s) > 180), +(a <= c), f.x, f.y);
	} else d += $s(Dy ||= Ny([
		"L ",
		",",
		" Z"
	]), t, n);
	return d;
}, Ly = (e) => {
	var t = e.cx, n = e.cy, r = e.innerRadius, i = e.outerRadius, a = e.cornerRadius, o = e.forceCornerRadius, s = e.cornerIsExternal, c = e.startAngle, l = e.endAngle, u = ec(l - c), d = Fy({
		cx: t,
		cy: n,
		radius: i,
		angle: c,
		sign: u,
		cornerRadius: a,
		cornerIsExternal: s
	}), f = d.circleTangency, p = d.lineTangency, m = d.theta, h = Fy({
		cx: t,
		cy: n,
		radius: i,
		angle: l,
		sign: -u,
		cornerRadius: a,
		cornerIsExternal: s
	}), g = h.circleTangency, _ = h.lineTangency, v = h.theta, y = s ? Math.abs(c - l) : Math.abs(c - l) - m - v;
	if (y < 0) return o ? $s(Oy ||= Ny([
		"M ",
		",",
		"\n        a",
		",",
		",0,0,1,",
		",0\n        a",
		",",
		",0,0,1,",
		",0\n      "
	]), p.x, p.y, a, a, a * 2, a, a, -a * 2) : Iy({
		cx: t,
		cy: n,
		innerRadius: r,
		outerRadius: i,
		startAngle: c,
		endAngle: l
	});
	var b = $s(ky ||= Ny([
		"M ",
		",",
		"\n    A",
		",",
		",0,0,",
		",",
		",",
		"\n    A",
		",",
		",0,",
		",",
		",",
		",",
		"\n    A",
		",",
		",0,0,",
		",",
		",",
		"\n  "
	]), p.x, p.y, a, a, +(u < 0), f.x, f.y, i, i, +(y > 180), +(u < 0), g.x, g.y, a, a, +(u < 0), _.x, _.y);
	if (r > 0) {
		var x = Fy({
			cx: t,
			cy: n,
			radius: r,
			angle: c,
			sign: u,
			isExternal: !0,
			cornerRadius: a,
			cornerIsExternal: s
		}), S = x.circleTangency, C = x.lineTangency, w = x.theta, T = Fy({
			cx: t,
			cy: n,
			radius: r,
			angle: l,
			sign: -u,
			isExternal: !0,
			cornerRadius: a,
			cornerIsExternal: s
		}), E = T.circleTangency, D = T.lineTangency, O = T.theta, k = s ? Math.abs(c - l) : Math.abs(c - l) - w - O;
		if (k < 0 && a === 0) return `${b}L${t},${n}Z`;
		b += $s(Ay ||= Ny([
			"L",
			",",
			"\n      A",
			",",
			",0,0,",
			",",
			",",
			"\n      A",
			",",
			",0,",
			",",
			",",
			",",
			"\n      A",
			",",
			",0,0,",
			",",
			",",
			"Z"
		]), D.x, D.y, a, a, +(u < 0), E.x, E.y, r, r, +(k > 180), +(u > 0), S.x, S.y, a, a, +(u < 0), C.x, C.y);
	} else b += $s(jy ||= Ny([
		"L",
		",",
		"Z"
	]), t, n);
	return b;
}, Ry = {
	cx: 0,
	cy: 0,
	innerRadius: 0,
	outerRadius: 0,
	startAngle: 0,
	endAngle: 0,
	cornerRadius: 0,
	forceCornerRadius: !1,
	cornerIsExternal: !1
}, zy = (e) => {
	var t = Ml(e, Ry), n = t.cx, r = t.cy, i = t.innerRadius, a = t.outerRadius, o = t.cornerRadius, s = t.forceCornerRadius, c = t.cornerIsExternal, l = t.startAngle, u = t.endAngle, d = t.className;
	if (a < i || l === u) return null;
	var f = Ss("recharts-sector", d), p = a - i, m = oc(o, p, 0, !0), h = m > 0 && Math.abs(l - u) < 360 ? Ly({
		cx: n,
		cy: r,
		innerRadius: i,
		outerRadius: a,
		cornerRadius: Math.min(m, p / 2),
		forceCornerRadius: s,
		cornerIsExternal: c,
		startAngle: l,
		endAngle: u
	}) : Iy({
		cx: n,
		cy: r,
		innerRadius: i,
		outerRadius: a,
		startAngle: l,
		endAngle: u
	});
	return /*#__PURE__*/ x.createElement("path", My({}, As(t), {
		className: f,
		d: h
	}));
};
//#endregion
//#region node_modules/recharts/es6/util/cursor/getCursorPoints.js
function By(e, t, n) {
	if (e === "horizontal") return [{
		x: t.x,
		y: n.top
	}, {
		x: t.x,
		y: n.top + n.height
	}];
	if (e === "vertical") return [{
		x: n.left,
		y: t.y
	}, {
		x: n.left + n.width,
		y: t.y
	}];
	if (Cl(t)) {
		if (e === "centric") {
			var r = t.cx, i = t.cy, a = t.innerRadius, o = t.outerRadius, s = t.angle, c = _y(r, i, a, s), l = _y(r, i, o, s);
			return [{
				x: c.x,
				y: c.y
			}, {
				x: l.x,
				y: l.y
			}];
		}
		return wy(t);
	}
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/toNumber.mjs
function Vy(e) {
	return Gs(e) ? NaN : Number(e);
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/util/toFinite.mjs
function Hy(e) {
	return e ? (e = Vy(e), e === Infinity || e === -Infinity ? (e < 0 ? -1 : 1) * Number.MAX_VALUE : e === e ? e : 0) : e === 0 ? e : 0;
}
//#endregion
//#region node_modules/es-toolkit/dist/compat/math/range.mjs
function Uy(e, t, n) {
	n && typeof n != "number" && sd(e, t, n) && (t = n = void 0), e = Hy(e), t === void 0 ? (t = e, e = 0) : t = Hy(t), n = n === void 0 ? e < t ? 1 : -1 : Hy(n);
	let r = Math.max(Math.ceil((t - e) / (n || 1)), 0), i = Array(r);
	for (let t = 0; t < r; t++) i[t] = e, e += n;
	return i;
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/dataSelectors.js
var Wy = (e) => e.chartData, Gy = K([Wy], (e) => {
	var t = e.chartData == null ? 0 : e.chartData.length - 1;
	return {
		chartData: e.chartData,
		computedData: e.computedData,
		dataEndIndex: t,
		dataStartIndex: 0
	};
}), Ky = (e, t, n, r) => r ? Gy(e) : Wy(e), qy = K([Ky], (e) => {
	var t = e.chartData, n = e.dataStartIndex, r = e.dataEndIndex;
	return t == null ? [] : t.slice(n, r + 1);
}), Jy = K([Gy], (e) => {
	var t = e.chartData, n = e.dataStartIndex, r = e.dataEndIndex;
	return t == null ? [] : t.slice(n, r + 1);
}), Yy = K([Wy], (e) => {
	var t = e.chartData, n = e.dataStartIndex, r = e.dataEndIndex;
	return t == null ? [] : t.slice(n, r + 1);
});
//#endregion
//#region node_modules/recharts/es6/util/isDomainSpecifiedByUser.js
function Xy(e, t) {
	return tb(e) || eb(e, t) || Qy(e, t) || Zy();
}
function Zy() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function Qy(e, t) {
	if (e) {
		if (typeof e == "string") return $y(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? $y(e, t) : void 0;
	}
}
function $y(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function eb(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function tb(e) {
	if (Array.isArray(e)) return e;
}
function nb(e) {
	if (Array.isArray(e) && e.length === 2) {
		var t = Xy(e, 2), n = t[0], r = t[1];
		if (Dm(n) && Dm(r)) return !0;
	}
	return !1;
}
function rb(e, t, n) {
	return n ? e : [Math.min(e[0], t[0]), Math.max(e[1], t[1])];
}
function ib(e, t) {
	if (t && typeof e != "function" && Array.isArray(e) && e.length === 2) {
		var n = Xy(e, 2), r = n[0], i = n[1], a, o;
		if (Dm(r)) a = r;
		else if (typeof r == "function") return;
		if (Dm(i)) o = i;
		else if (typeof i == "function") return;
		var s = [a, o];
		if (nb(s)) return s;
	}
}
function ab(e, t, n) {
	if (n || t != null) {
		if (typeof e == "function" && t != null) try {
			var r = e(t, n);
			if (nb(r)) return rb(r, t, n);
		} catch {}
		if (Array.isArray(e) && e.length === 2) {
			var i = Xy(e, 2), a = i[0], o = i[1], s, c;
			if (a === "auto") t != null && (s = Math.min(...t));
			else if (V(a)) s = a;
			else if (typeof a == "function") try {
				t != null && (s = a(t?.[0]));
			} catch {}
			else if (typeof a == "string" && Hm.test(a)) {
				var l = Hm.exec(a);
				if (l == null || l[1] == null || t == null) s = void 0;
				else {
					var u = +l[1];
					s = t[0] - u;
				}
			} else s = t?.[0];
			if (o === "auto") t != null && (c = Math.max(...t));
			else if (V(o)) c = o;
			else if (typeof o == "function") try {
				t != null && (c = o(t?.[1]));
			} catch {}
			else if (typeof o == "string" && Um.test(o)) {
				var d = Um.exec(o);
				if (d == null || d[1] == null || t == null) c = void 0;
				else {
					var f = +d[1];
					c = t[1] + f;
				}
			} else c = t?.[1];
			var p = [s, c];
			if (nb(p)) return t == null ? p : rb(p, t, n);
		}
	}
}
//#endregion
//#region node_modules/recharts/es6/util/scale/util/arithmetic.js
var X = /* @__PURE__ */ l((/* @__PURE__ */ o(((e, t) => {
	(function(e) {
		var n = 1e9, r = {
			precision: 20,
			rounding: 4,
			toExpNeg: -7,
			toExpPos: 21,
			LN10: "2.302585092994045684017991454684364207601101488628772976033327900967572609677352480235997205089598298341967784042286"
		}, i = !0, a = "[DecimalError] ", o = a + "Invalid argument: ", s = a + "Exponent out of range: ", c = Math.floor, l = Math.pow, u = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, d, f = 1e7, p = 7, m = 9007199254740991, h = c(m / p), g = {};
		g.absoluteValue = g.abs = function() {
			var e = new this.constructor(this);
			return e.s &&= 1, e;
		}, g.comparedTo = g.cmp = function(e) {
			var t, n, r, i, a = this;
			if (e = new a.constructor(e), a.s !== e.s) return a.s || -e.s;
			if (a.e !== e.e) return a.e > e.e ^ a.s < 0 ? 1 : -1;
			for (r = a.d.length, i = e.d.length, t = 0, n = r < i ? r : i; t < n; ++t) if (a.d[t] !== e.d[t]) return a.d[t] > e.d[t] ^ a.s < 0 ? 1 : -1;
			return r === i ? 0 : r > i ^ a.s < 0 ? 1 : -1;
		}, g.decimalPlaces = g.dp = function() {
			var e = this, t = e.d.length - 1, n = (t - e.e) * p;
			if (t = e.d[t], t) for (; t % 10 == 0; t /= 10) n--;
			return n < 0 ? 0 : n;
		}, g.dividedBy = g.div = function(e) {
			return b(this, new this.constructor(e));
		}, g.dividedToIntegerBy = g.idiv = function(e) {
			var t = this, n = t.constructor;
			return D(b(t, new n(e), 0, 1), n.precision);
		}, g.equals = g.eq = function(e) {
			return !this.cmp(e);
		}, g.exponent = function() {
			return S(this);
		}, g.greaterThan = g.gt = function(e) {
			return this.cmp(e) > 0;
		}, g.greaterThanOrEqualTo = g.gte = function(e) {
			return this.cmp(e) >= 0;
		}, g.isInteger = g.isint = function() {
			return this.e > this.d.length - 2;
		}, g.isNegative = g.isneg = function() {
			return this.s < 0;
		}, g.isPositive = g.ispos = function() {
			return this.s > 0;
		}, g.isZero = function() {
			return this.s === 0;
		}, g.lessThan = g.lt = function(e) {
			return this.cmp(e) < 0;
		}, g.lessThanOrEqualTo = g.lte = function(e) {
			return this.cmp(e) < 1;
		}, g.logarithm = g.log = function(e) {
			var t, n = this, r = n.constructor, o = r.precision, s = o + 5;
			if (e === void 0) e = new r(10);
			else if (e = new r(e), e.s < 1 || e.eq(d)) throw Error(a + "NaN");
			if (n.s < 1) throw Error(a + (n.s ? "NaN" : "-Infinity"));
			return n.eq(d) ? new r(0) : (i = !1, t = b(T(n, s), T(e, s), s), i = !0, D(t, o));
		}, g.minus = g.sub = function(e) {
			var t = this;
			return e = new t.constructor(e), t.s == e.s ? O(t, e) : _(t, (e.s = -e.s, e));
		}, g.modulo = g.mod = function(e) {
			var t, n = this, r = n.constructor, o = r.precision;
			if (e = new r(e), !e.s) throw Error(a + "NaN");
			return n.s ? (i = !1, t = b(n, e, 0, 1).times(e), i = !0, n.minus(t)) : D(new r(n), o);
		}, g.naturalExponential = g.exp = function() {
			return x(this);
		}, g.naturalLogarithm = g.ln = function() {
			return T(this);
		}, g.negated = g.neg = function() {
			var e = new this.constructor(this);
			return e.s = -e.s || 0, e;
		}, g.plus = g.add = function(e) {
			var t = this;
			return e = new t.constructor(e), t.s == e.s ? _(t, e) : O(t, (e.s = -e.s, e));
		}, g.precision = g.sd = function(e) {
			var t, n, r, i = this;
			if (e !== void 0 && e !== !!e && e !== 1 && e !== 0) throw Error(o + e);
			if (t = S(i) + 1, r = i.d.length - 1, n = r * p + 1, r = i.d[r], r) {
				for (; r % 10 == 0; r /= 10) n--;
				for (r = i.d[0]; r >= 10; r /= 10) n++;
			}
			return e && t > n ? t : n;
		}, g.squareRoot = g.sqrt = function() {
			var e, t, n, r, o, s, l, u = this, d = u.constructor;
			if (u.s < 1) {
				if (!u.s) return new d(0);
				throw Error(a + "NaN");
			}
			for (e = S(u), i = !1, o = Math.sqrt(+u), o == 0 || o == 1 / 0 ? (t = y(u.d), (t.length + e) % 2 == 0 && (t += "0"), o = Math.sqrt(t), e = c((e + 1) / 2) - (e < 0 || e % 2), o == 1 / 0 ? t = "5e" + e : (t = o.toExponential(), t = t.slice(0, t.indexOf("e") + 1) + e), r = new d(t)) : r = new d(o.toString()), n = d.precision, o = l = n + 3;;) if (s = r, r = s.plus(b(u, s, l + 2)).times(.5), y(s.d).slice(0, l) === (t = y(r.d)).slice(0, l)) {
				if (t = t.slice(l - 3, l + 1), o == l && t == "4999") {
					if (D(s, n + 1, 0), s.times(s).eq(u)) {
						r = s;
						break;
					}
				} else if (t != "9999") break;
				l += 4;
			}
			return i = !0, D(r, n);
		}, g.times = g.mul = function(e) {
			var t, n, r, a, o, s, c, l, u, d = this, p = d.constructor, m = d.d, h = (e = new p(e)).d;
			if (!d.s || !e.s) return new p(0);
			for (e.s *= d.s, n = d.e + e.e, l = m.length, u = h.length, l < u && (o = m, m = h, h = o, s = l, l = u, u = s), o = [], s = l + u, r = s; r--;) o.push(0);
			for (r = u; --r >= 0;) {
				for (t = 0, a = l + r; a > r;) c = o[a] + h[r] * m[a - r - 1] + t, o[a--] = c % f | 0, t = c / f | 0;
				o[a] = (o[a] + t) % f | 0;
			}
			for (; !o[--s];) o.pop();
			return t ? ++n : o.shift(), e.d = o, e.e = n, i ? D(e, p.precision) : e;
		}, g.toDecimalPlaces = g.todp = function(e, t) {
			var r = this, i = r.constructor;
			return r = new i(r), e === void 0 ? r : (v(e, 0, n), t === void 0 ? t = i.rounding : v(t, 0, 8), D(r, e + S(r) + 1, t));
		}, g.toExponential = function(e, t) {
			var r, i = this, a = i.constructor;
			return e === void 0 ? r = k(i, !0) : (v(e, 0, n), t === void 0 ? t = a.rounding : v(t, 0, 8), i = D(new a(i), e + 1, t), r = k(i, !0, e + 1)), r;
		}, g.toFixed = function(e, t) {
			var r, i, a = this, o = a.constructor;
			return e === void 0 ? k(a) : (v(e, 0, n), t === void 0 ? t = o.rounding : v(t, 0, 8), i = D(new o(a), e + S(a) + 1, t), r = k(i.abs(), !1, e + S(i) + 1), a.isneg() && !a.isZero() ? "-" + r : r);
		}, g.toInteger = g.toint = function() {
			var e = this, t = e.constructor;
			return D(new t(e), S(e) + 1, t.rounding);
		}, g.toNumber = function() {
			return +this;
		}, g.toPower = g.pow = function(e) {
			var t, n, r, o, s, l, u = this, f = u.constructor, h = 12, g = +(e = new f(e));
			if (!e.s) return new f(d);
			if (u = new f(u), !u.s) {
				if (e.s < 1) throw Error(a + "Infinity");
				return u;
			}
			if (u.eq(d)) return u;
			if (r = f.precision, e.eq(d)) return D(u, r);
			if (t = e.e, n = e.d.length - 1, l = t >= n, s = u.s, !l) {
				if (s < 0) throw Error(a + "NaN");
			} else if ((n = g < 0 ? -g : g) <= m) {
				for (o = new f(d), t = Math.ceil(r / p + 4), i = !1; n % 2 && (o = o.times(u), A(o.d, t)), n = c(n / 2), n !== 0;) u = u.times(u), A(u.d, t);
				return i = !0, e.s < 0 ? new f(d).div(o) : D(o, r);
			}
			return s = s < 0 && e.d[Math.max(t, n)] & 1 ? -1 : 1, u.s = 1, i = !1, o = e.times(T(u, r + h)), i = !0, o = x(o), o.s = s, o;
		}, g.toPrecision = function(e, t) {
			var r, i, a = this, o = a.constructor;
			return e === void 0 ? (r = S(a), i = k(a, r <= o.toExpNeg || r >= o.toExpPos)) : (v(e, 1, n), t === void 0 ? t = o.rounding : v(t, 0, 8), a = D(new o(a), e, t), r = S(a), i = k(a, e <= r || r <= o.toExpNeg, e)), i;
		}, g.toSignificantDigits = g.tosd = function(e, t) {
			var r = this, i = r.constructor;
			return e === void 0 ? (e = i.precision, t = i.rounding) : (v(e, 1, n), t === void 0 ? t = i.rounding : v(t, 0, 8)), D(new i(r), e, t);
		}, g.toString = g.valueOf = g.val = g.toJSON = function() {
			var e = this, t = S(e), n = e.constructor;
			return k(e, t <= n.toExpNeg || t >= n.toExpPos);
		};
		function _(e, t) {
			var n, r, a, o, s, c, l, u, d = e.constructor, m = d.precision;
			if (!e.s || !t.s) return t.s || (t = new d(e)), i ? D(t, m) : t;
			if (l = e.d, u = t.d, s = e.e, a = t.e, l = l.slice(), o = s - a, o) {
				for (o < 0 ? (r = l, o = -o, c = u.length) : (r = u, a = s, c = l.length), s = Math.ceil(m / p), c = s > c ? s + 1 : c + 1, o > c && (o = c, r.length = 1), r.reverse(); o--;) r.push(0);
				r.reverse();
			}
			for (c = l.length, o = u.length, c - o < 0 && (o = c, r = u, u = l, l = r), n = 0; o;) n = (l[--o] = l[o] + u[o] + n) / f | 0, l[o] %= f;
			for (n && (l.unshift(n), ++a), c = l.length; l[--c] == 0;) l.pop();
			return t.d = l, t.e = a, i ? D(t, m) : t;
		}
		function v(e, t, n) {
			if (e !== ~~e || e < t || e > n) throw Error(o + e);
		}
		function y(e) {
			var t, n, r, i = e.length - 1, a = "", o = e[0];
			if (i > 0) {
				for (a += o, t = 1; t < i; t++) r = e[t] + "", n = p - r.length, n && (a += w(n)), a += r;
				o = e[t], r = o + "", n = p - r.length, n && (a += w(n));
			} else if (o === 0) return "0";
			for (; o % 10 == 0;) o /= 10;
			return a + o;
		}
		var b = (function() {
			function e(e, t) {
				var n, r = 0, i = e.length;
				for (e = e.slice(); i--;) n = e[i] * t + r, e[i] = n % f | 0, r = n / f | 0;
				return r && e.unshift(r), e;
			}
			function t(e, t, n, r) {
				var i, a;
				if (n != r) a = n > r ? 1 : -1;
				else for (i = a = 0; i < n; i++) if (e[i] != t[i]) {
					a = e[i] > t[i] ? 1 : -1;
					break;
				}
				return a;
			}
			function n(e, t, n) {
				for (var r = 0; n--;) e[n] -= r, r = +(e[n] < t[n]), e[n] = r * f + e[n] - t[n];
				for (; !e[0] && e.length > 1;) e.shift();
			}
			return function(r, i, o, s) {
				var c, l, u, d, m, h, g, _, v, y, b, x, C, w, T, E, O, k, A = r.constructor, j = r.s == i.s ? 1 : -1, M = r.d, N = i.d;
				if (!r.s) return new A(r);
				if (!i.s) throw Error(a + "Division by zero");
				for (l = r.e - i.e, O = N.length, T = M.length, g = new A(j), _ = g.d = [], u = 0; N[u] == (M[u] || 0);) ++u;
				if (N[u] > (M[u] || 0) && --l, x = o == null ? o = A.precision : s ? o + (S(r) - S(i)) + 1 : o, x < 0) return new A(0);
				if (x = x / p + 2 | 0, u = 0, O == 1) for (d = 0, N = N[0], x++; (u < T || d) && x--; u++) C = d * f + (M[u] || 0), _[u] = C / N | 0, d = C % N | 0;
				else {
					for (d = f / (N[0] + 1) | 0, d > 1 && (N = e(N, d), M = e(M, d), O = N.length, T = M.length), w = O, v = M.slice(0, O), y = v.length; y < O;) v[y++] = 0;
					k = N.slice(), k.unshift(0), E = N[0], N[1] >= f / 2 && ++E;
					do
						d = 0, c = t(N, v, O, y), c < 0 ? (b = v[0], O != y && (b = b * f + (v[1] || 0)), d = b / E | 0, d > 1 ? (d >= f && (d = f - 1), m = e(N, d), h = m.length, y = v.length, c = t(m, v, h, y), c == 1 && (d--, n(m, O < h ? k : N, h))) : (d == 0 && (c = d = 1), m = N.slice()), h = m.length, h < y && m.unshift(0), n(v, m, y), c == -1 && (y = v.length, c = t(N, v, O, y), c < 1 && (d++, n(v, O < y ? k : N, y))), y = v.length) : c === 0 && (d++, v = [0]), _[u++] = d, c && v[0] ? v[y++] = M[w] || 0 : (v = [M[w]], y = 1);
					while ((w++ < T || v[0] !== void 0) && x--);
				}
				return _[0] || _.shift(), g.e = l, D(g, s ? o + S(g) + 1 : o);
			};
		})();
		function x(e, t) {
			var n, r, a, o, c, u, f = 0, p = 0, m = e.constructor, h = m.precision;
			if (S(e) > 16) throw Error(s + S(e));
			if (!e.s) return new m(d);
			for (t == null ? (i = !1, u = h) : u = t, c = new m(.03125); e.abs().gte(.1);) e = e.times(c), p += 5;
			for (r = Math.log(l(2, p)) / Math.LN10 * 2 + 5 | 0, u += r, n = a = o = new m(d), m.precision = u;;) {
				if (a = D(a.times(e), u), n = n.times(++f), c = o.plus(b(a, n, u)), y(c.d).slice(0, u) === y(o.d).slice(0, u)) {
					for (; p--;) o = D(o.times(o), u);
					return m.precision = h, t == null ? (i = !0, D(o, h)) : o;
				}
				o = c;
			}
		}
		function S(e) {
			for (var t = e.e * p, n = e.d[0]; n >= 10; n /= 10) t++;
			return t;
		}
		function C(e, t, n) {
			if (t > e.LN10.sd()) throw i = !0, n && (e.precision = n), Error(a + "LN10 precision limit exceeded");
			return D(new e(e.LN10), t);
		}
		function w(e) {
			for (var t = ""; e--;) t += "0";
			return t;
		}
		function T(e, t) {
			var n, r, o, s, c, l, u, f, p, m = 1, h = 10, g = e, _ = g.d, v = g.constructor, x = v.precision;
			if (g.s < 1) throw Error(a + (g.s ? "NaN" : "-Infinity"));
			if (g.eq(d)) return new v(0);
			if (t == null ? (i = !1, f = x) : f = t, g.eq(10)) return t ?? (i = !0), C(v, f);
			if (f += h, v.precision = f, n = y(_), r = n.charAt(0), s = S(g), Math.abs(s) < 0x5543df729c000) {
				for (; r < 7 && r != 1 || r == 1 && n.charAt(1) > 3;) g = g.times(e), n = y(g.d), r = n.charAt(0), m++;
				s = S(g), r > 1 ? (g = new v("0." + n), s++) : g = new v(r + "." + n.slice(1));
			} else return u = C(v, f + 2, x).times(s + ""), g = T(new v(r + "." + n.slice(1)), f - h).plus(u), v.precision = x, t == null ? (i = !0, D(g, x)) : g;
			for (l = c = g = b(g.minus(d), g.plus(d), f), p = D(g.times(g), f), o = 3;;) {
				if (c = D(c.times(p), f), u = l.plus(b(c, new v(o), f)), y(u.d).slice(0, f) === y(l.d).slice(0, f)) return l = l.times(2), s !== 0 && (l = l.plus(C(v, f + 2, x).times(s + ""))), l = b(l, new v(m), f), v.precision = x, t == null ? (i = !0, D(l, x)) : l;
				l = u, o += 2;
			}
		}
		function E(e, t) {
			var n, r, a;
			for ((n = t.indexOf(".")) > -1 && (t = t.replace(".", "")), (r = t.search(/e/i)) > 0 ? (n < 0 && (n = r), n += +t.slice(r + 1), t = t.substring(0, r)) : n < 0 && (n = t.length), r = 0; t.charCodeAt(r) === 48;) ++r;
			for (a = t.length; t.charCodeAt(a - 1) === 48;) --a;
			if (t = t.slice(r, a), t) {
				if (a -= r, n = n - r - 1, e.e = c(n / p), e.d = [], r = (n + 1) % p, n < 0 && (r += p), r < a) {
					for (r && e.d.push(+t.slice(0, r)), a -= p; r < a;) e.d.push(+t.slice(r, r += p));
					t = t.slice(r), r = p - t.length;
				} else r -= a;
				for (; r--;) t += "0";
				if (e.d.push(+t), i && (e.e > h || e.e < -h)) throw Error(s + n);
			} else e.s = 0, e.e = 0, e.d = [0];
			return e;
		}
		function D(e, t, n) {
			var r, a, o, u, d, m, g, _, v = e.d;
			for (u = 1, o = v[0]; o >= 10; o /= 10) u++;
			if (r = t - u, r < 0) r += p, a = t, g = v[_ = 0];
			else {
				if (_ = Math.ceil((r + 1) / p), o = v.length, _ >= o) return e;
				for (g = o = v[_], u = 1; o >= 10; o /= 10) u++;
				r %= p, a = r - p + u;
			}
			if (n !== void 0 && (o = l(10, u - a - 1), d = g / o % 10 | 0, m = t < 0 || v[_ + 1] !== void 0 || g % o, m = n < 4 ? (d || m) && (n == 0 || n == (e.s < 0 ? 3 : 2)) : d > 5 || d == 5 && (n == 4 || m || n == 6 && (r > 0 ? a > 0 ? g / l(10, u - a) : 0 : v[_ - 1]) % 10 & 1 || n == (e.s < 0 ? 8 : 7))), t < 1 || !v[0]) return m ? (o = S(e), v.length = 1, t = t - o - 1, v[0] = l(10, (p - t % p) % p), e.e = c(-t / p) || 0) : (v.length = 1, v[0] = e.e = e.s = 0), e;
			if (r == 0 ? (v.length = _, o = 1, _--) : (v.length = _ + 1, o = l(10, p - r), v[_] = a > 0 ? (g / l(10, u - a) % l(10, a) | 0) * o : 0), m) for (;;) if (_ == 0) {
				(v[0] += o) == f && (v[0] = 1, ++e.e);
				break;
			} else {
				if (v[_] += o, v[_] != f) break;
				v[_--] = 0, o = 1;
			}
			for (r = v.length; v[--r] === 0;) v.pop();
			if (i && (e.e > h || e.e < -h)) throw Error(s + S(e));
			return e;
		}
		function O(e, t) {
			var n, r, a, o, s, c, l, u, d, m, h = e.constructor, g = h.precision;
			if (!e.s || !t.s) return t.s ? t.s = -t.s : t = new h(e), i ? D(t, g) : t;
			if (l = e.d, m = t.d, r = t.e, u = e.e, l = l.slice(), s = u - r, s) {
				for (d = s < 0, d ? (n = l, s = -s, c = m.length) : (n = m, r = u, c = l.length), a = Math.max(Math.ceil(g / p), c) + 2, s > a && (s = a, n.length = 1), n.reverse(), a = s; a--;) n.push(0);
				n.reverse();
			} else {
				for (a = l.length, c = m.length, d = a < c, d && (c = a), a = 0; a < c; a++) if (l[a] != m[a]) {
					d = l[a] < m[a];
					break;
				}
				s = 0;
			}
			for (d && (n = l, l = m, m = n, t.s = -t.s), c = l.length, a = m.length - c; a > 0; --a) l[c++] = 0;
			for (a = m.length; a > s;) {
				if (l[--a] < m[a]) {
					for (o = a; o && l[--o] === 0;) l[o] = f - 1;
					--l[o], l[a] += f;
				}
				l[a] -= m[a];
			}
			for (; l[--c] === 0;) l.pop();
			for (; l[0] === 0; l.shift()) --r;
			return l[0] ? (t.d = l, t.e = r, i ? D(t, g) : t) : new h(0);
		}
		function k(e, t, n) {
			var r, i = S(e), a = y(e.d), o = a.length;
			return t ? (n && (r = n - o) > 0 ? a = a.charAt(0) + "." + a.slice(1) + w(r) : o > 1 && (a = a.charAt(0) + "." + a.slice(1)), a = a + (i < 0 ? "e" : "e+") + i) : i < 0 ? (a = "0." + w(-i - 1) + a, n && (r = n - o) > 0 && (a += w(r))) : i >= o ? (a += w(i + 1 - o), n && (r = n - i - 1) > 0 && (a = a + "." + w(r))) : ((r = i + 1) < o && (a = a.slice(0, r) + "." + a.slice(r)), n && (r = n - o) > 0 && (i + 1 === o && (a += "."), a += w(r))), e.s < 0 ? "-" + a : a;
		}
		function A(e, t) {
			if (e.length > t) return e.length = t, !0;
		}
		function j(e) {
			var t, n, r;
			function i(e) {
				var t = this;
				if (!(t instanceof i)) return new i(e);
				if (t.constructor = i, e instanceof i) {
					t.s = e.s, t.e = e.e, t.d = (e = e.d) ? e.slice() : e;
					return;
				}
				if (typeof e == "number") {
					if (e * 0 != 0) throw Error(o + e);
					if (e > 0) t.s = 1;
					else if (e < 0) e = -e, t.s = -1;
					else {
						t.s = 0, t.e = 0, t.d = [0];
						return;
					}
					if (e === ~~e && e < 1e7) {
						t.e = 0, t.d = [e];
						return;
					}
					return E(t, e.toString());
				}
				if (typeof e != "string") throw Error(o + e);
				if (e.charCodeAt(0) === 45 ? (e = e.slice(1), t.s = -1) : t.s = 1, u.test(e)) E(t, e);
				else throw Error(o + e);
			}
			if (i.prototype = g, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.clone = j, i.config = i.set = M, e === void 0 && (e = {}), e) for (r = [
				"precision",
				"rounding",
				"toExpNeg",
				"toExpPos",
				"LN10"
			], t = 0; t < r.length;) e.hasOwnProperty(n = r[t++]) || (e[n] = this[n]);
			return i.config(e), i;
		}
		function M(e) {
			if (!e || typeof e != "object") throw Error(a + "Object expected");
			var t, r, i, s = [
				"precision",
				1,
				n,
				"rounding",
				0,
				8,
				"toExpNeg",
				-1 / 0,
				0,
				"toExpPos",
				0,
				1 / 0
			];
			for (t = 0; t < s.length; t += 3) if ((i = e[r = s[t]]) !== void 0) {
				if (c(i) === i && i >= s[t + 1] && i <= s[t + 2]) this[r] = i;
				else throw Error(o + r + ": " + i);
			}
			if ((i = e[r = "LN10"]) !== void 0) {
				if (i == Math.LN10) this[r] = new this(i);
				else throw Error(o + r + ": " + i);
			}
			return this;
		}
		r = j(r), r.default = r.Decimal = r, d = new r(1), typeof define == "function" && define.amd ? define(function() {
			return r;
		}) : t !== void 0 && t.exports ? t.exports = r : (e ||= typeof self < "u" && self && self.self == self ? self : Function("return this")(), e.Decimal = r);
	})(e);
})))());
function ob(e) {
	return e === 0 ? 1 : Math.floor(new X.default(e).abs().log(10).toNumber()) + 1;
}
function sb(e, t, n) {
	for (var r = new X.default(e), i = 0, a = []; r.lt(t) && i < 1e5;) a.push(r.toNumber()), r = r.add(n), i++;
	return a;
}
//#endregion
//#region node_modules/recharts/es6/util/scale/getNiceTickValues.js
function cb(e, t) {
	return pb(e) || fb(e, t) || ub(e, t) || lb();
}
function lb() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function ub(e, t) {
	if (e) {
		if (typeof e == "string") return db(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? db(e, t) : void 0;
	}
}
function db(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function fb(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function pb(e) {
	if (Array.isArray(e)) return e;
}
var mb = (e) => {
	var t = cb(e, 2), n = t[0], r = t[1], i = n, a = r;
	return n > r && (i = r, a = n), [i, a];
}, hb = (e, t, n) => {
	if (e.lte(0)) return new X.default(0);
	var r = ob(e.toNumber()), i = new X.default(10).pow(r), a = e.div(i), o = r === 1 ? .1 : .05, s = new X.default(Math.ceil(a.div(o).toNumber())).add(n).mul(o).mul(i);
	return t ? new X.default(s.toNumber()) : new X.default(Math.ceil(s.toNumber()));
}, gb = (e, t, n) => {
	if (e.lte(0)) return new X.default(0);
	var r = [
		1,
		2,
		2.5,
		5
	], i = e.toNumber(), a = Math.floor(new X.default(i).abs().log(10).toNumber()), o = new X.default(10).pow(a), s = e.div(o).toNumber(), c = r.findIndex((e) => e >= s - 1e-10);
	if (c === -1 && (o = o.mul(10), c = 0), c += n, c >= r.length) {
		var l = Math.floor(c / r.length);
		c %= r.length, o = o.mul(new X.default(10).pow(l));
	}
	var u = r[c] ?? 1, d = new X.default(u).mul(o);
	return t ? d : new X.default(Math.ceil(d.toNumber()));
}, _b = (e, t, n) => {
	var r = new X.default(1), i = new X.default(e);
	if (!i.isint() && n) {
		var a = Math.abs(e);
		a < 1 ? (r = new X.default(10).pow(ob(e) - 1), i = new X.default(Math.floor(i.div(r).toNumber())).mul(r)) : a > 1 && (i = new X.default(Math.floor(e)));
	} else e === 0 ? i = new X.default(Math.floor((t - 1) / 2)) : n || (i = new X.default(Math.floor(e)));
	for (var o = Math.floor((t - 1) / 2), s = [], c = 0; c < t; c++) s.push(i.add(new X.default(c - o).mul(r)).toNumber());
	return s;
}, vb = function(e, t, n, r) {
	var i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 0, a = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : hb;
	if (!Number.isFinite((t - e) / (n - 1))) return {
		step: new X.default(0),
		tickMin: new X.default(0),
		tickMax: new X.default(0)
	};
	var o = a(new X.default(t).sub(e).div(n - 1), r, i), s;
	e <= 0 && t >= 0 ? s = new X.default(0) : (s = new X.default(e).add(t).div(2), s = s.sub(new X.default(s).mod(o)));
	var c = Math.ceil(s.sub(e).div(o).toNumber()), l = Math.ceil(new X.default(t).sub(s).div(o).toNumber()), u = c + l + 1;
	return u > n ? vb(e, t, n, r, i + 1, a) : (u < n && (l = t > 0 ? l + (n - u) : l, c = t > 0 ? c : c + (n - u)), {
		step: o,
		tickMin: s.sub(new X.default(c).mul(o)),
		tickMax: s.add(new X.default(l).mul(o))
	});
}, yb = function(e) {
	var t = cb(e, 2), n = t[0], r = t[1], i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 6, a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0, o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "auto", s = Math.max(i, 2), c = cb(mb([n, r]), 2), l = c[0], u = c[1];
	if (l === -Infinity || u === Infinity) {
		var d = u === Infinity ? [l, ...Array(i - 1).fill(Infinity)] : [...Array(i - 1).fill(-Infinity), u];
		return n > r ? d.reverse() : d;
	}
	if (l === u) return _b(l, i, a);
	var f = vb(l, u, s, a, 0, o === "snap125" ? gb : hb), p = f.step, m = f.tickMin, h = f.tickMax, g = sb(m, h.add(new X.default(.1).mul(p)), p);
	return n > r ? g.reverse() : g;
}, bb = function(e, t) {
	var n = cb(e, 2), r = n[0], i = n[1], a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0, o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : "auto", s = cb(mb([r, i]), 2), c = s[0], l = s[1];
	if (c === -Infinity || l === Infinity) return [r, i];
	if (c === l) return [c];
	var u = o === "snap125" ? gb : hb, d = Math.max(t, 2), f = u(new X.default(l).sub(c).div(d - 1), a, 0), p = [...sb(new X.default(c), new X.default(l), f), l];
	if (a === !1) {
		p = p.map((e) => Math.round(e));
		var m = p.length - 1;
		m > 0 && p[m] === p[m - 1] && (p = p.slice(0, m));
	}
	return r > i ? p.reverse() : p;
}, xb = (e) => e.rootProps.barCategoryGap, Sb = (e) => e.rootProps.stackOffset, Cb = (e) => e.rootProps.reverseStackOrder, wb = (e) => e.options.chartName, Tb = (e) => e.rootProps.syncId, Eb = (e) => e.rootProps.syncMethod, Db = (e) => e.options.eventEmitter, Ob = {
	grid: -100,
	barBackground: -50,
	area: 100,
	cursorRectangle: 200,
	bar: 300,
	line: 400,
	axis: 500,
	scatter: 600,
	activeBar: 1e3,
	cursorLine: 1100,
	activeDot: 1200,
	label: 2e3
}, kb = {
	allowDecimals: !1,
	allowDuplicatedCategory: !0,
	allowDataOverflow: !1,
	angle: 0,
	angleAxisId: 0,
	axisLine: !0,
	axisLineType: "polygon",
	cx: 0,
	cy: 0,
	hide: !1,
	includeHidden: !1,
	label: !1,
	niceTicks: "auto",
	orientation: "outer",
	reversed: !1,
	scale: "auto",
	tick: !0,
	tickLine: !0,
	tickSize: 8,
	type: "auto",
	zIndex: Ob.axis
}, Ab = {
	allowDataOverflow: !1,
	allowDecimals: !1,
	allowDuplicatedCategory: !0,
	angle: 0,
	axisLine: !0,
	includeHidden: !1,
	hide: !1,
	niceTicks: "auto",
	label: !1,
	orientation: "right",
	radiusAxisId: 0,
	reversed: !1,
	scale: "auto",
	stroke: "#ccc",
	tick: !0,
	tickCount: 5,
	tickLine: !0,
	type: "auto",
	zIndex: Ob.axis
}, jb = (e, t) => {
	if (e && t) return e != null && e.reversed ? [t[1], t[0]] : t;
};
//#endregion
//#region node_modules/recharts/es6/util/getAxisTypeBasedOnLayout.js
function Mb(e, t, n) {
	if (n !== "auto") return n;
	if (e != null) return Im(e, t) ? "category" : "number";
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/polarAxisSelectors.js
function Nb(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Pb(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Nb(Object(n), !0).forEach(function(t) {
			Fb(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Nb(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Fb(e, t, n) {
	return (t = Ib(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Ib(e) {
	var t = Lb(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Lb(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var Rb = {
	allowDataOverflow: kb.allowDataOverflow,
	allowDecimals: kb.allowDecimals,
	allowDuplicatedCategory: !1,
	dataKey: void 0,
	domain: void 0,
	id: kb.angleAxisId,
	includeHidden: !1,
	name: void 0,
	reversed: kb.reversed,
	scale: kb.scale,
	tick: kb.tick,
	tickCount: void 0,
	ticks: void 0,
	type: kb.type,
	unit: void 0,
	niceTicks: "auto"
}, zb = {
	allowDataOverflow: Ab.allowDataOverflow,
	allowDecimals: Ab.allowDecimals,
	allowDuplicatedCategory: Ab.allowDuplicatedCategory,
	dataKey: void 0,
	domain: void 0,
	id: Ab.radiusAxisId,
	includeHidden: Ab.includeHidden,
	name: void 0,
	reversed: Ab.reversed,
	scale: Ab.scale,
	tick: Ab.tick,
	tickCount: Ab.tickCount,
	ticks: void 0,
	type: Ab.type,
	unit: void 0,
	niceTicks: "auto"
}, Bb = K([(e, t) => {
	if (t != null) return e.polarAxis.angleAxis[t];
}, ag], (e, t) => {
	if (e != null) return e;
	var n = Mb(t, "angleAxis", Rb.type) ?? "category";
	return Pb(Pb({}, Rb), {}, { type: n });
}), Vb = K([(e, t) => e.polarAxis.radiusAxis[t], ag], (e, t) => {
	if (e != null) return e;
	var n = Mb(t, "radiusAxis", zb.type) ?? "category";
	return Pb(Pb({}, zb), {}, { type: n });
}), Hb = (e) => e.polarOptions, Ub = K([
	Ym,
	Xm,
	ph
], vy), Wb = K([Hb, Ub], (e, t) => {
	if (e != null) return oc(e.innerRadius, t, 0);
}), Gb = K([Hb, Ub], (e, t) => {
	if (e != null) return oc(e.outerRadius, t, t * .8);
}), Kb = K([Hb], (e) => e == null ? [0, 0] : [e.startAngle, e.endAngle]);
K([Bb, Kb], jb);
var qb = K([
	Ub,
	Wb,
	Gb
], (e, t, n) => {
	if (e != null && t != null && n != null) return [t, n];
});
K([Vb, qb], jb);
var Jb = K([
	rg,
	Hb,
	Wb,
	Gb,
	Ym,
	Xm
], (e, t, n, r, i, a) => {
	if (!(e !== "centric" && e !== "radial" || t == null || n == null || r == null)) {
		var o = t.cx, s = t.cy, c = t.startAngle, l = t.endAngle;
		return {
			cx: oc(o, i, i / 2),
			cy: oc(s, a, a / 2),
			innerRadius: n,
			outerRadius: r,
			startAngle: c,
			endAngle: l,
			clockWise: !1
		};
	}
}), Yb = (e, t) => t, Xb = (e, t, n) => n;
//#endregion
//#region node_modules/recharts/es6/util/stacks/getStackSeriesIdentifier.js
function Zb(e) {
	return e?.id;
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineDisplayedStackedData.js
function Qb(e, t, n) {
	var r = t.chartData, i = r === void 0 ? [] : r, a = n.allowDuplicatedCategory, o = n.dataKey, s = /* @__PURE__ */ new Map();
	return e.forEach((e) => {
		var t = e.data ?? i;
		if (t != null && t.length !== 0) {
			var n = Zb(e);
			t.forEach((t, r) => {
				var i = o == null || a ? r : String(Pm(t, o, null)), c = Pm(t, e.dataKey, 0), l = s.has(i) ? s.get(i) : {};
				Object.assign(l, { [n]: c }), s.set(i, l);
			});
		}
	}), Array.from(s.values());
}
//#endregion
//#region node_modules/recharts/es6/state/types/StackedGraphicalItem.js
function $b(e) {
	return "stackId" in e && e.stackId != null && e.dataKey != null;
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/numberDomainEqualityCheck.js
var ex = (e, t) => e === t ? !0 : e == null || t == null ? !1 : e[0] === t[0] && e[1] === t[1];
//#endregion
//#region node_modules/recharts/es6/state/selectors/arrayEqualityCheck.js
function tx(e, t) {
	return Array.isArray(e) && Array.isArray(t) && e.length === 0 && t.length === 0 ? !0 : e === t;
}
function nx(e, t) {
	if (e.length === t.length) {
		for (var n = 0; n < e.length; n++) if (e[n] !== t[n]) return !1;
		return !0;
	}
	return !1;
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/selectTooltipAxisType.js
var rx = (e) => {
	var t = rg(e);
	return t === "horizontal" ? "xAxis" : t === "vertical" ? "yAxis" : t === "centric" ? "angleAxis" : "radiusAxis";
}, ix = (e) => e.tooltip.settings.axisId;
//#endregion
//#region node_modules/recharts/es6/util/scale/RechartsScale.js
function ax(e) {
	if (e != null) {
		var t = e.ticks, n = e.bandwidth, r = e.range(), i = [Math.min(...r), Math.max(...r)];
		return {
			domain: () => e.domain(),
			range: function(e) {
				function t() {
					return e.apply(this, arguments);
				}
				return t.toString = function() {
					return e.toString();
				}, t;
			}(() => i),
			rangeMin: () => i[0],
			rangeMax: () => i[1],
			isInRange(e) {
				var t = i[0], n = i[1];
				return t <= n ? e >= t && e <= n : e >= n && e <= t;
			},
			bandwidth: n ? () => n.call(e) : void 0,
			ticks: t ? (n) => t.call(e, n) : void 0,
			map: (t, n) => {
				var r = e(t);
				if (r != null) {
					if (e.bandwidth && n != null && n.position) {
						var i = e.bandwidth();
						switch (n.position) {
							case "middle":
								r += i / 2;
								break;
							case "end": r += i;
						}
					}
					return r;
				}
			}
		};
	}
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineCheckedDomain.js
var ox = (e, t) => {
	if (t != null) switch (e) {
		case "linear":
			if (!nb(t)) {
				for (var n, r, i = 0; i < t.length; i++) {
					var a = t[i];
					Dm(a) && ((n === void 0 || a < n) && (n = a), (r === void 0 || a > r) && (r = a));
				}
				return n !== void 0 && r !== void 0 ? [n, r] : void 0;
			}
			return t;
		default: return t;
	}
};
//#endregion
//#region node_modules/d3-array/src/ascending.js
function sx(e, t) {
	return e == null || t == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
//#endregion
//#region node_modules/d3-array/src/descending.js
function cx(e, t) {
	return e == null || t == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
//#endregion
//#region node_modules/d3-array/src/bisector.js
function lx(e) {
	let t, n, r;
	e.length === 2 ? (t = e === sx || e === cx ? e : ux, n = e, r = e) : (t = sx, n = (t, n) => sx(e(t), n), r = (t, n) => e(t) - n);
	function i(e, r, i = 0, a = e.length) {
		if (i < a) {
			if (t(r, r) !== 0) return a;
			do {
				let t = i + a >>> 1;
				n(e[t], r) < 0 ? i = t + 1 : a = t;
			} while (i < a);
		}
		return i;
	}
	function a(e, r, i = 0, a = e.length) {
		if (i < a) {
			if (t(r, r) !== 0) return a;
			do {
				let t = i + a >>> 1;
				n(e[t], r) <= 0 ? i = t + 1 : a = t;
			} while (i < a);
		}
		return i;
	}
	function o(e, t, n = 0, a = e.length) {
		let o = i(e, t, n, a - 1);
		return o > n && r(e[o - 1], t) > -r(e[o], t) ? o - 1 : o;
	}
	return {
		left: i,
		center: o,
		right: a
	};
}
function ux() {
	return 0;
}
//#endregion
//#region node_modules/d3-array/src/number.js
function dx(e) {
	return e === null ? NaN : +e;
}
function* fx(e, t) {
	if (t === void 0) for (let t of e) t != null && (t = +t) >= t && (yield t);
	else {
		let n = -1;
		for (let r of e) (r = t(r, ++n, e)) != null && (r = +r) >= r && (yield r);
	}
}
//#endregion
//#region node_modules/d3-array/src/bisect.js
var px = lx(sx), mx = px.right;
px.left, lx(dx).center;
//#endregion
//#region node_modules/internmap/src/index.js
var hx = class extends Map {
	constructor(e, t = yx) {
		if (super(), Object.defineProperties(this, {
			_intern: { value: /* @__PURE__ */ new Map() },
			_key: { value: t }
		}), e != null) for (let [t, n] of e) this.set(t, n);
	}
	get(e) {
		return super.get(gx(this, e));
	}
	has(e) {
		return super.has(gx(this, e));
	}
	set(e, t) {
		return super.set(_x(this, e), t);
	}
	delete(e) {
		return super.delete(vx(this, e));
	}
};
function gx({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : n;
}
function _x({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) ? e.get(r) : (e.set(r, n), n);
}
function vx({ _intern: e, _key: t }, n) {
	let r = t(n);
	return e.has(r) && (n = e.get(r), e.delete(r)), n;
}
function yx(e) {
	return typeof e == "object" && e ? e.valueOf() : e;
}
//#endregion
//#region node_modules/d3-array/src/sort.js
function bx(e = sx) {
	if (e === sx) return xx;
	if (typeof e != "function") throw TypeError("compare is not a function");
	return (t, n) => {
		let r = e(t, n);
		return r || r === 0 ? r : (e(n, n) === 0) - (e(t, t) === 0);
	};
}
function xx(e, t) {
	return (e == null || !(e >= e)) - (t == null || !(t >= t)) || (e < t ? -1 : +(e > t));
}
//#endregion
//#region node_modules/d3-array/src/ticks.js
var Sx = Math.sqrt(50), Cx = Math.sqrt(10), wx = Math.sqrt(2);
function Tx(e, t, n) {
	let r = (t - e) / Math.max(0, n), i = Math.floor(Math.log10(r)), a = r / 10 ** i, o = a >= Sx ? 10 : a >= Cx ? 5 : a >= wx ? 2 : 1, s, c, l;
	return i < 0 ? (l = 10 ** -i / o, s = Math.round(e * l), c = Math.round(t * l), s / l < e && ++s, c / l > t && --c, l = -l) : (l = 10 ** i * o, s = Math.round(e / l), c = Math.round(t / l), s * l < e && ++s, c * l > t && --c), c < s && .5 <= n && n < 2 ? Tx(e, t, n * 2) : [
		s,
		c,
		l
	];
}
function Ex(e, t, n) {
	if (t = +t, e = +e, n = +n, !(n > 0)) return [];
	if (e === t) return [e];
	let r = t < e, [i, a, o] = r ? Tx(t, e, n) : Tx(e, t, n);
	if (!(a >= i)) return [];
	let s = a - i + 1, c = Array(s);
	if (r) {
		if (o < 0) for (let e = 0; e < s; ++e) c[e] = (a - e) / -o;
		else for (let e = 0; e < s; ++e) c[e] = (a - e) * o;
	} else if (o < 0) for (let e = 0; e < s; ++e) c[e] = (i + e) / -o;
	else for (let e = 0; e < s; ++e) c[e] = (i + e) * o;
	return c;
}
function Dx(e, t, n) {
	return t = +t, e = +e, n = +n, Tx(e, t, n)[2];
}
function Ox(e, t, n) {
	t = +t, e = +e, n = +n;
	let r = t < e, i = r ? Dx(t, e, n) : Dx(e, t, n);
	return (r ? -1 : 1) * (i < 0 ? 1 / -i : i);
}
//#endregion
//#region node_modules/d3-array/src/max.js
function kx(e, t) {
	let n;
	if (t === void 0) for (let t of e) t != null && (n < t || n === void 0 && t >= t) && (n = t);
	else {
		let r = -1;
		for (let i of e) (i = t(i, ++r, e)) != null && (n < i || n === void 0 && i >= i) && (n = i);
	}
	return n;
}
//#endregion
//#region node_modules/d3-array/src/min.js
function Ax(e, t) {
	let n;
	if (t === void 0) for (let t of e) t != null && (n > t || n === void 0 && t >= t) && (n = t);
	else {
		let r = -1;
		for (let i of e) (i = t(i, ++r, e)) != null && (n > i || n === void 0 && i >= i) && (n = i);
	}
	return n;
}
//#endregion
//#region node_modules/d3-array/src/quickselect.js
function jx(e, t, n = 0, r = Infinity, i) {
	if (t = Math.floor(t), n = Math.floor(Math.max(0, n)), r = Math.floor(Math.min(e.length - 1, r)), !(n <= t && t <= r)) return e;
	for (i = i === void 0 ? xx : bx(i); r > n;) {
		if (r - n > 600) {
			let a = r - n + 1, o = t - n + 1, s = Math.log(a), c = .5 * Math.exp(2 * s / 3), l = .5 * Math.sqrt(s * c * (a - c) / a) * (o - a / 2 < 0 ? -1 : 1), u = Math.max(n, Math.floor(t - o * c / a + l)), d = Math.min(r, Math.floor(t + (a - o) * c / a + l));
			jx(e, t, u, d, i);
		}
		let a = e[t], o = n, s = r;
		for (Mx(e, n, t), i(e[r], a) > 0 && Mx(e, n, r); o < s;) {
			for (Mx(e, o, s), ++o, --s; i(e[o], a) < 0;) ++o;
			for (; i(e[s], a) > 0;) --s;
		}
		i(e[n], a) === 0 ? Mx(e, n, s) : (++s, Mx(e, s, r)), s <= t && (n = s + 1), t <= s && (r = s - 1);
	}
	return e;
}
function Mx(e, t, n) {
	let r = e[t];
	e[t] = e[n], e[n] = r;
}
//#endregion
//#region node_modules/d3-array/src/quantile.js
function Nx(e, t, n) {
	if (e = Float64Array.from(fx(e, n)), (r = e.length) && !isNaN(t = +t)) {
		if (t <= 0 || r < 2) return Ax(e);
		if (t >= 1) return kx(e);
		var r, i = (r - 1) * t, a = Math.floor(i), o = kx(jx(e, a).subarray(0, a + 1));
		return o + (Ax(e.subarray(a + 1)) - o) * (i - a);
	}
}
function Px(e, t, n = dx) {
	if ((r = e.length) && !isNaN(t = +t)) {
		if (t <= 0 || r < 2) return +n(e[0], 0, e);
		if (t >= 1) return +n(e[r - 1], r - 1, e);
		var r, i = (r - 1) * t, a = Math.floor(i), o = +n(e[a], a, e);
		return o + (+n(e[a + 1], a + 1, e) - o) * (i - a);
	}
}
//#endregion
//#region node_modules/d3-array/src/range.js
function Fx(e, t, n) {
	e = +e, t = +t, n = (i = arguments.length) < 2 ? (t = e, e = 0, 1) : i < 3 ? 1 : +n;
	for (var r = -1, i = Math.max(0, Math.ceil((t - e) / n)) | 0, a = Array(i); ++r < i;) a[r] = e + r * n;
	return a;
}
//#endregion
//#region node_modules/d3-scale/src/init.js
function Ix(e, t) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			this.range(e);
			break;
		default: this.range(t).domain(e);
	}
	return this;
}
function Lx(e, t) {
	switch (arguments.length) {
		case 0: break;
		case 1:
			typeof e == "function" ? this.interpolator(e) : this.range(e);
			break;
		default: this.domain(e), typeof t == "function" ? this.interpolator(t) : this.range(t);
	}
	return this;
}
//#endregion
//#region node_modules/d3-scale/src/ordinal.js
var Rx = Symbol("implicit");
function zx() {
	var e = new hx(), t = [], n = [], r = Rx;
	function i(i) {
		let a = e.get(i);
		if (a === void 0) {
			if (r !== Rx) return r;
			e.set(i, a = t.push(i) - 1);
		}
		return n[a % n.length];
	}
	return i.domain = function(n) {
		if (!arguments.length) return t.slice();
		t = [], e = new hx();
		for (let r of n) e.has(r) || e.set(r, t.push(r) - 1);
		return i;
	}, i.range = function(e) {
		return arguments.length ? (n = Array.from(e), i) : n.slice();
	}, i.unknown = function(e) {
		return arguments.length ? (r = e, i) : r;
	}, i.copy = function() {
		return zx(t, n).unknown(r);
	}, Ix.apply(i, arguments), i;
}
//#endregion
//#region node_modules/d3-scale/src/band.js
function Bx() {
	var e = zx().unknown(void 0), t = e.domain, n = e.range, r = 0, i = 1, a, o, s = !1, c = 0, l = 0, u = .5;
	delete e.unknown;
	function d() {
		var e = t().length, d = i < r, f = d ? i : r, p = d ? r : i;
		a = (p - f) / Math.max(1, e - c + l * 2), s && (a = Math.floor(a)), f += (p - f - a * (e - c)) * u, o = a * (1 - c), s && (f = Math.round(f), o = Math.round(o));
		var m = Fx(e).map(function(e) {
			return f + a * e;
		});
		return n(d ? m.reverse() : m);
	}
	return e.domain = function(e) {
		return arguments.length ? (t(e), d()) : t();
	}, e.range = function(e) {
		return arguments.length ? ([r, i] = e, r = +r, i = +i, d()) : [r, i];
	}, e.rangeRound = function(e) {
		return [r, i] = e, r = +r, i = +i, s = !0, d();
	}, e.bandwidth = function() {
		return o;
	}, e.step = function() {
		return a;
	}, e.round = function(e) {
		return arguments.length ? (s = !!e, d()) : s;
	}, e.padding = function(e) {
		return arguments.length ? (c = Math.min(1, l = +e), d()) : c;
	}, e.paddingInner = function(e) {
		return arguments.length ? (c = Math.min(1, e), d()) : c;
	}, e.paddingOuter = function(e) {
		return arguments.length ? (l = +e, d()) : l;
	}, e.align = function(e) {
		return arguments.length ? (u = Math.max(0, Math.min(1, e)), d()) : u;
	}, e.copy = function() {
		return Bx(t(), [r, i]).round(s).paddingInner(c).paddingOuter(l).align(u);
	}, Ix.apply(d(), arguments);
}
function Vx(e) {
	var t = e.copy;
	return e.padding = e.paddingOuter, delete e.paddingInner, delete e.paddingOuter, e.copy = function() {
		return Vx(t());
	}, e;
}
function Hx() {
	return Vx(Bx.apply(null, arguments).paddingInner(1));
}
//#endregion
//#region node_modules/d3-color/src/define.js
function Ux(e, t, n) {
	e.prototype = t.prototype = n, n.constructor = e;
}
function Wx(e, t) {
	var n = Object.create(e.prototype);
	for (var r in t) n[r] = t[r];
	return n;
}
//#endregion
//#region node_modules/d3-color/src/color.js
function Gx() {}
var Kx = .7, qx = 1 / Kx, Jx = "\\s*([+-]?\\d+)\\s*", Yx = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", Xx = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", Zx = /^#([0-9a-f]{3,8})$/, Qx = RegExp(`^rgb\\(${Jx},${Jx},${Jx}\\)$`), $x = RegExp(`^rgb\\(${Xx},${Xx},${Xx}\\)$`), eS = RegExp(`^rgba\\(${Jx},${Jx},${Jx},${Yx}\\)$`), tS = RegExp(`^rgba\\(${Xx},${Xx},${Xx},${Yx}\\)$`), nS = RegExp(`^hsl\\(${Yx},${Xx},${Xx}\\)$`), rS = RegExp(`^hsla\\(${Yx},${Xx},${Xx},${Yx}\\)$`), iS = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
};
Ux(Gx, lS, {
	copy(e) {
		return Object.assign(new this.constructor(), this, e);
	},
	displayable() {
		return this.rgb().displayable();
	},
	hex: aS,
	formatHex: aS,
	formatHex8: oS,
	formatHsl: sS,
	formatRgb: cS,
	toString: cS
});
function aS() {
	return this.rgb().formatHex();
}
function oS() {
	return this.rgb().formatHex8();
}
function sS() {
	return SS(this).formatHsl();
}
function cS() {
	return this.rgb().formatRgb();
}
function lS(e) {
	var t, n;
	return e = (e + "").trim().toLowerCase(), (t = Zx.exec(e)) ? (n = t[1].length, t = parseInt(t[1], 16), n === 6 ? uS(t) : n === 3 ? new mS(t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, (t & 15) << 4 | t & 15, 1) : n === 8 ? dS(t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, (t & 255) / 255) : n === 4 ? dS(t >> 12 & 15 | t >> 8 & 240, t >> 8 & 15 | t >> 4 & 240, t >> 4 & 15 | t & 240, ((t & 15) << 4 | t & 15) / 255) : null) : (t = Qx.exec(e)) ? new mS(t[1], t[2], t[3], 1) : (t = $x.exec(e)) ? new mS(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, 1) : (t = eS.exec(e)) ? dS(t[1], t[2], t[3], t[4]) : (t = tS.exec(e)) ? dS(t[1] * 255 / 100, t[2] * 255 / 100, t[3] * 255 / 100, t[4]) : (t = nS.exec(e)) ? xS(t[1], t[2] / 100, t[3] / 100, 1) : (t = rS.exec(e)) ? xS(t[1], t[2] / 100, t[3] / 100, t[4]) : iS.hasOwnProperty(e) ? uS(iS[e]) : e === "transparent" ? new mS(NaN, NaN, NaN, 0) : null;
}
function uS(e) {
	return new mS(e >> 16 & 255, e >> 8 & 255, e & 255, 1);
}
function dS(e, t, n, r) {
	return r <= 0 && (e = t = n = NaN), new mS(e, t, n, r);
}
function fS(e) {
	return e instanceof Gx || (e = lS(e)), e ? (e = e.rgb(), new mS(e.r, e.g, e.b, e.opacity)) : new mS();
}
function pS(e, t, n, r) {
	return arguments.length === 1 ? fS(e) : new mS(e, t, n, r ?? 1);
}
function mS(e, t, n, r) {
	this.r = +e, this.g = +t, this.b = +n, this.opacity = +r;
}
Ux(mS, pS, Wx(Gx, {
	brighter(e) {
		return e = e == null ? qx : qx ** +e, new mS(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? Kx : Kx ** +e, new mS(this.r * e, this.g * e, this.b * e, this.opacity);
	},
	rgb() {
		return this;
	},
	clamp() {
		return new mS(yS(this.r), yS(this.g), yS(this.b), vS(this.opacity));
	},
	displayable() {
		return -.5 <= this.r && this.r < 255.5 && -.5 <= this.g && this.g < 255.5 && -.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
	},
	hex: hS,
	formatHex: hS,
	formatHex8: gS,
	formatRgb: _S,
	toString: _S
}));
function hS() {
	return `#${bS(this.r)}${bS(this.g)}${bS(this.b)}`;
}
function gS() {
	return `#${bS(this.r)}${bS(this.g)}${bS(this.b)}${bS((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function _S() {
	let e = vS(this.opacity);
	return `${e === 1 ? "rgb(" : "rgba("}${yS(this.r)}, ${yS(this.g)}, ${yS(this.b)}${e === 1 ? ")" : `, ${e})`}`;
}
function vS(e) {
	return isNaN(e) ? 1 : Math.max(0, Math.min(1, e));
}
function yS(e) {
	return Math.max(0, Math.min(255, Math.round(e) || 0));
}
function bS(e) {
	return e = yS(e), (e < 16 ? "0" : "") + e.toString(16);
}
function xS(e, t, n, r) {
	return r <= 0 ? e = t = n = NaN : n <= 0 || n >= 1 ? e = t = NaN : t <= 0 && (e = NaN), new wS(e, t, n, r);
}
function SS(e) {
	if (e instanceof wS) return new wS(e.h, e.s, e.l, e.opacity);
	if (e instanceof Gx || (e = lS(e)), !e) return new wS();
	if (e instanceof wS) return e;
	e = e.rgb();
	var t = e.r / 255, n = e.g / 255, r = e.b / 255, i = Math.min(t, n, r), a = Math.max(t, n, r), o = NaN, s = a - i, c = (a + i) / 2;
	return s ? (o = t === a ? (n - r) / s + (n < r) * 6 : n === a ? (r - t) / s + 2 : (t - n) / s + 4, s /= c < .5 ? a + i : 2 - a - i, o *= 60) : s = c > 0 && c < 1 ? 0 : o, new wS(o, s, c, e.opacity);
}
function CS(e, t, n, r) {
	return arguments.length === 1 ? SS(e) : new wS(e, t, n, r ?? 1);
}
function wS(e, t, n, r) {
	this.h = +e, this.s = +t, this.l = +n, this.opacity = +r;
}
Ux(wS, CS, Wx(Gx, {
	brighter(e) {
		return e = e == null ? qx : qx ** +e, new wS(this.h, this.s, this.l * e, this.opacity);
	},
	darker(e) {
		return e = e == null ? Kx : Kx ** +e, new wS(this.h, this.s, this.l * e, this.opacity);
	},
	rgb() {
		var e = this.h % 360 + (this.h < 0) * 360, t = isNaN(e) || isNaN(this.s) ? 0 : this.s, n = this.l, r = n + (n < .5 ? n : 1 - n) * t, i = 2 * n - r;
		return new mS(DS(e >= 240 ? e - 240 : e + 120, i, r), DS(e, i, r), DS(e < 120 ? e + 240 : e - 120, i, r), this.opacity);
	},
	clamp() {
		return new wS(TS(this.h), ES(this.s), ES(this.l), vS(this.opacity));
	},
	displayable() {
		return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
	},
	formatHsl() {
		let e = vS(this.opacity);
		return `${e === 1 ? "hsl(" : "hsla("}${TS(this.h)}, ${ES(this.s) * 100}%, ${ES(this.l) * 100}%${e === 1 ? ")" : `, ${e})`}`;
	}
}));
function TS(e) {
	return e = (e || 0) % 360, e < 0 ? e + 360 : e;
}
function ES(e) {
	return Math.max(0, Math.min(1, e || 0));
}
function DS(e, t, n) {
	return (e < 60 ? t + (n - t) * e / 60 : e < 180 ? n : e < 240 ? t + (n - t) * (240 - e) / 60 : t) * 255;
}
//#endregion
//#region node_modules/d3-interpolate/src/constant.js
var OS = (e) => () => e;
//#endregion
//#region node_modules/d3-interpolate/src/color.js
function kS(e, t) {
	return function(n) {
		return e + n * t;
	};
}
function AS(e, t, n) {
	return e **= +n, t = t ** +n - e, n = 1 / n, function(r) {
		return (e + r * t) ** +n;
	};
}
function jS(e) {
	return (e = +e) == 1 ? MS : function(t, n) {
		return n - t ? AS(t, n, e) : OS(isNaN(t) ? n : t);
	};
}
function MS(e, t) {
	var n = t - e;
	return n ? kS(e, n) : OS(isNaN(e) ? t : e);
}
//#endregion
//#region node_modules/d3-interpolate/src/rgb.js
var NS = (function e(t) {
	var n = jS(t);
	function r(e, t) {
		var r = n((e = pS(e)).r, (t = pS(t)).r), i = n(e.g, t.g), a = n(e.b, t.b), o = MS(e.opacity, t.opacity);
		return function(t) {
			return e.r = r(t), e.g = i(t), e.b = a(t), e.opacity = o(t), e + "";
		};
	}
	return r.gamma = e, r;
})(1);
//#endregion
//#region node_modules/d3-interpolate/src/numberArray.js
function PS(e, t) {
	t ||= [];
	var n = e ? Math.min(t.length, e.length) : 0, r = t.slice(), i;
	return function(a) {
		for (i = 0; i < n; ++i) r[i] = e[i] * (1 - a) + t[i] * a;
		return r;
	};
}
function FS(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
//#endregion
//#region node_modules/d3-interpolate/src/array.js
function IS(e, t) {
	for (var n = t ? t.length : 0, r = e ? Math.min(n, e.length) : 0, i = Array(r), a = Array(n), o = 0; o < r; ++o) i[o] = GS(e[o], t[o]);
	for (; o < n; ++o) a[o] = t[o];
	return function(e) {
		for (o = 0; o < r; ++o) a[o] = i[o](e);
		return a;
	};
}
//#endregion
//#region node_modules/d3-interpolate/src/date.js
function LS(e, t) {
	var n = /* @__PURE__ */ new Date();
	return e = +e, t = +t, function(r) {
		return n.setTime(e * (1 - r) + t * r), n;
	};
}
//#endregion
//#region node_modules/d3-interpolate/src/number.js
function RS(e, t) {
	return e = +e, t = +t, function(n) {
		return e * (1 - n) + t * n;
	};
}
//#endregion
//#region node_modules/d3-interpolate/src/object.js
function zS(e, t) {
	var n = {}, r = {}, i;
	for (i in (typeof e != "object" || !e) && (e = {}), (typeof t != "object" || !t) && (t = {}), t) i in e ? n[i] = GS(e[i], t[i]) : r[i] = t[i];
	return function(e) {
		for (i in n) r[i] = n[i](e);
		return r;
	};
}
//#endregion
//#region node_modules/d3-interpolate/src/string.js
var BS = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, VS = new RegExp(BS.source, "g");
function HS(e) {
	return function() {
		return e;
	};
}
function US(e) {
	return function(t) {
		return e(t) + "";
	};
}
function WS(e, t) {
	var n = BS.lastIndex = VS.lastIndex = 0, r, i, a, o = -1, s = [], c = [];
	for (e += "", t += ""; (r = BS.exec(e)) && (i = VS.exec(t));) (a = i.index) > n && (a = t.slice(n, a), s[o] ? s[o] += a : s[++o] = a), (r = r[0]) === (i = i[0]) ? s[o] ? s[o] += i : s[++o] = i : (s[++o] = null, c.push({
		i: o,
		x: RS(r, i)
	})), n = VS.lastIndex;
	return n < t.length && (a = t.slice(n), s[o] ? s[o] += a : s[++o] = a), s.length < 2 ? c[0] ? US(c[0].x) : HS(t) : (t = c.length, function(e) {
		for (var n = 0, r; n < t; ++n) s[(r = c[n]).i] = r.x(e);
		return s.join("");
	});
}
//#endregion
//#region node_modules/d3-interpolate/src/value.js
function GS(e, t) {
	var n = typeof t, r;
	return t == null || n === "boolean" ? OS(t) : (n === "number" ? RS : n === "string" ? (r = lS(t)) ? (t = r, NS) : WS : t instanceof lS ? NS : t instanceof Date ? LS : FS(t) ? PS : Array.isArray(t) ? IS : typeof t.valueOf != "function" && typeof t.toString != "function" || isNaN(t) ? zS : RS)(e, t);
}
//#endregion
//#region node_modules/d3-interpolate/src/round.js
function KS(e, t) {
	return e = +e, t = +t, function(n) {
		return Math.round(e * (1 - n) + t * n);
	};
}
//#endregion
//#region node_modules/d3-interpolate/src/piecewise.js
function qS(e, t) {
	t === void 0 && (t = e, e = GS);
	for (var n = 0, r = t.length - 1, i = t[0], a = Array(r < 0 ? 0 : r); n < r;) a[n] = e(i, i = t[++n]);
	return function(e) {
		var t = Math.max(0, Math.min(r - 1, Math.floor(e *= r)));
		return a[t](e - t);
	};
}
//#endregion
//#region node_modules/d3-scale/src/constant.js
function JS(e) {
	return function() {
		return e;
	};
}
//#endregion
//#region node_modules/d3-scale/src/number.js
function YS(e) {
	return +e;
}
//#endregion
//#region node_modules/d3-scale/src/continuous.js
var XS = [0, 1];
function ZS(e) {
	return e;
}
function QS(e, t) {
	return (t -= e = +e) ? function(n) {
		return (n - e) / t;
	} : JS(isNaN(t) ? NaN : .5);
}
function $S(e, t) {
	var n;
	return e > t && (n = e, e = t, t = n), function(n) {
		return Math.max(e, Math.min(t, n));
	};
}
function eC(e, t, n) {
	var r = e[0], i = e[1], a = t[0], o = t[1];
	return i < r ? (r = QS(i, r), a = n(o, a)) : (r = QS(r, i), a = n(a, o)), function(e) {
		return a(r(e));
	};
}
function tC(e, t, n) {
	var r = Math.min(e.length, t.length) - 1, i = Array(r), a = Array(r), o = -1;
	for (e[r] < e[0] && (e = e.slice().reverse(), t = t.slice().reverse()); ++o < r;) i[o] = QS(e[o], e[o + 1]), a[o] = n(t[o], t[o + 1]);
	return function(t) {
		var n = mx(e, t, 1, r) - 1;
		return a[n](i[n](t));
	};
}
function nC(e, t) {
	return t.domain(e.domain()).range(e.range()).interpolate(e.interpolate()).clamp(e.clamp()).unknown(e.unknown());
}
function rC() {
	var e = XS, t = XS, n = GS, r, i, a, o = ZS, s, c, l;
	function u() {
		var n = Math.min(e.length, t.length);
		return o !== ZS && (o = $S(e[0], e[n - 1])), s = n > 2 ? tC : eC, c = l = null, d;
	}
	function d(i) {
		return i == null || isNaN(i = +i) ? a : (c ||= s(e.map(r), t, n))(r(o(i)));
	}
	return d.invert = function(n) {
		return o(i((l ||= s(t, e.map(r), RS))(n)));
	}, d.domain = function(t) {
		return arguments.length ? (e = Array.from(t, YS), u()) : e.slice();
	}, d.range = function(e) {
		return arguments.length ? (t = Array.from(e), u()) : t.slice();
	}, d.rangeRound = function(e) {
		return t = Array.from(e), n = KS, u();
	}, d.clamp = function(e) {
		return arguments.length ? (o = e ? !0 : ZS, u()) : o !== ZS;
	}, d.interpolate = function(e) {
		return arguments.length ? (n = e, u()) : n;
	}, d.unknown = function(e) {
		return arguments.length ? (a = e, d) : a;
	}, function(e, t) {
		return r = e, i = t, u();
	};
}
function iC() {
	return rC()(ZS, ZS);
}
//#endregion
//#region node_modules/d3-format/src/formatDecimal.js
function aC(e) {
	return Math.abs(e = Math.round(e)) >= 1e21 ? e.toLocaleString("en").replace(/,/g, "") : e.toString(10);
}
function oC(e, t) {
	if (!isFinite(e) || e === 0) return null;
	var n = (e = t ? e.toExponential(t - 1) : e.toExponential()).indexOf("e"), r = e.slice(0, n);
	return [r.length > 1 ? r[0] + r.slice(2) : r, +e.slice(n + 1)];
}
//#endregion
//#region node_modules/d3-format/src/exponent.js
function sC(e) {
	return e = oC(Math.abs(e)), e ? e[1] : NaN;
}
//#endregion
//#region node_modules/d3-format/src/formatGroup.js
function cC(e, t) {
	return function(n, r) {
		for (var i = n.length, a = [], o = 0, s = e[0], c = 0; i > 0 && s > 0 && (c + s + 1 > r && (s = Math.max(1, r - c)), a.push(n.substring(i -= s, i + s)), !((c += s + 1) > r));) s = e[o = (o + 1) % e.length];
		return a.reverse().join(t);
	};
}
//#endregion
//#region node_modules/d3-format/src/formatNumerals.js
function lC(e) {
	return function(t) {
		return t.replace(/[0-9]/g, function(t) {
			return e[+t];
		});
	};
}
//#endregion
//#region node_modules/d3-format/src/formatSpecifier.js
var uC = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function dC(e) {
	if (!(t = uC.exec(e))) throw Error("invalid format: " + e);
	var t;
	return new fC({
		fill: t[1],
		align: t[2],
		sign: t[3],
		symbol: t[4],
		zero: t[5],
		width: t[6],
		comma: t[7],
		precision: t[8] && t[8].slice(1),
		trim: t[9],
		type: t[10]
	});
}
dC.prototype = fC.prototype;
function fC(e) {
	this.fill = e.fill === void 0 ? " " : e.fill + "", this.align = e.align === void 0 ? ">" : e.align + "", this.sign = e.sign === void 0 ? "-" : e.sign + "", this.symbol = e.symbol === void 0 ? "" : e.symbol + "", this.zero = !!e.zero, this.width = e.width === void 0 ? void 0 : +e.width, this.comma = !!e.comma, this.precision = e.precision === void 0 ? void 0 : +e.precision, this.trim = !!e.trim, this.type = e.type === void 0 ? "" : e.type + "";
}
fC.prototype.toString = function() {
	return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
//#endregion
//#region node_modules/d3-format/src/formatTrim.js
function pC(e) {
	out: for (var t = e.length, n = 1, r = -1, i; n < t; ++n) switch (e[n]) {
		case ".":
			r = i = n;
			break;
		case "0":
			r === 0 && (r = n), i = n;
			break;
		default:
			if (!+e[n]) break out;
			r > 0 && (r = 0);
	}
	return r > 0 ? e.slice(0, r) + e.slice(i + 1) : e;
}
//#endregion
//#region node_modules/d3-format/src/formatPrefixAuto.js
var mC;
function hC(e, t) {
	var n = oC(e, t);
	if (!n) return mC = void 0, e.toPrecision(t);
	var r = n[0], i = n[1], a = i - (mC = Math.max(-8, Math.min(8, Math.floor(i / 3))) * 3) + 1, o = r.length;
	return a === o ? r : a > o ? r + Array(a - o + 1).join("0") : a > 0 ? r.slice(0, a) + "." + r.slice(a) : "0." + Array(1 - a).join("0") + oC(e, Math.max(0, t + a - 1))[0];
}
//#endregion
//#region node_modules/d3-format/src/formatRounded.js
function gC(e, t) {
	var n = oC(e, t);
	if (!n) return e + "";
	var r = n[0], i = n[1];
	return i < 0 ? "0." + Array(-i).join("0") + r : r.length > i + 1 ? r.slice(0, i + 1) + "." + r.slice(i + 1) : r + Array(i - r.length + 2).join("0");
}
//#endregion
//#region node_modules/d3-format/src/formatTypes.js
var _C = {
	"%": (e, t) => (e * 100).toFixed(t),
	b: (e) => Math.round(e).toString(2),
	c: (e) => e + "",
	d: aC,
	e: (e, t) => e.toExponential(t),
	f: (e, t) => e.toFixed(t),
	g: (e, t) => e.toPrecision(t),
	o: (e) => Math.round(e).toString(8),
	p: (e, t) => gC(e * 100, t),
	r: gC,
	s: hC,
	X: (e) => Math.round(e).toString(16).toUpperCase(),
	x: (e) => Math.round(e).toString(16)
};
//#endregion
//#region node_modules/d3-format/src/identity.js
function vC(e) {
	return e;
}
//#endregion
//#region node_modules/d3-format/src/locale.js
var yC = Array.prototype.map, bC = [
	"y",
	"z",
	"a",
	"f",
	"p",
	"n",
	"µ",
	"m",
	"",
	"k",
	"M",
	"G",
	"T",
	"P",
	"E",
	"Z",
	"Y"
];
function xC(e) {
	var t = e.grouping === void 0 || e.thousands === void 0 ? vC : cC(yC.call(e.grouping, Number), e.thousands + ""), n = e.currency === void 0 ? "" : e.currency[0] + "", r = e.currency === void 0 ? "" : e.currency[1] + "", i = e.decimal === void 0 ? "." : e.decimal + "", a = e.numerals === void 0 ? vC : lC(yC.call(e.numerals, String)), o = e.percent === void 0 ? "%" : e.percent + "", s = e.minus === void 0 ? "−" : e.minus + "", c = e.nan === void 0 ? "NaN" : e.nan + "";
	function l(e, l) {
		e = dC(e);
		var u = e.fill, d = e.align, f = e.sign, p = e.symbol, m = e.zero, h = e.width, g = e.comma, _ = e.precision, v = e.trim, y = e.type;
		y === "n" ? (g = !0, y = "g") : _C[y] || (_ === void 0 && (_ = 12), v = !0, y = "g"), (m || u === "0" && d === "=") && (m = !0, u = "0", d = "=");
		var b = (l && l.prefix !== void 0 ? l.prefix : "") + (p === "$" ? n : p === "#" && /[boxX]/.test(y) ? "0" + y.toLowerCase() : ""), x = (p === "$" ? r : /[%p]/.test(y) ? o : "") + (l && l.suffix !== void 0 ? l.suffix : ""), S = _C[y], C = /[defgprs%]/.test(y);
		_ = _ === void 0 ? 6 : /[gprs]/.test(y) ? Math.max(1, Math.min(21, _)) : Math.max(0, Math.min(20, _));
		function w(e) {
			var n = b, r = x, o, l, p;
			if (y === "c") r = S(e) + r, e = "";
			else {
				e = +e;
				var w = e < 0 || 1 / e < 0;
				if (e = isNaN(e) ? c : S(Math.abs(e), _), v && (e = pC(e)), w && +e == 0 && f !== "+" && (w = !1), n = (w ? f === "(" ? f : s : f === "-" || f === "(" ? "" : f) + n, r = (y === "s" && !isNaN(e) && mC !== void 0 ? bC[8 + mC / 3] : "") + r + (w && f === "(" ? ")" : ""), C) {
					for (o = -1, l = e.length; ++o < l;) if (p = e.charCodeAt(o), 48 > p || p > 57) {
						r = (p === 46 ? i + e.slice(o + 1) : e.slice(o)) + r, e = e.slice(0, o);
						break;
					}
				}
			}
			g && !m && (e = t(e, Infinity));
			var T = n.length + e.length + r.length, E = T < h ? Array(h - T + 1).join(u) : "";
			switch (g && m && (e = t(E + e, E.length ? h - r.length : Infinity), E = ""), d) {
				case "<":
					e = n + e + r + E;
					break;
				case "=":
					e = n + E + e + r;
					break;
				case "^":
					e = E.slice(0, T = E.length >> 1) + n + e + r + E.slice(T);
					break;
				default: e = E + n + e + r;
			}
			return a(e);
		}
		return w.toString = function() {
			return e + "";
		}, w;
	}
	function u(e, t) {
		var n = Math.max(-8, Math.min(8, Math.floor(sC(t) / 3))) * 3, r = 10 ** -n, i = l((e = dC(e), e.type = "f", e), { suffix: bC[8 + n / 3] });
		return function(e) {
			return i(r * e);
		};
	}
	return {
		format: l,
		formatPrefix: u
	};
}
//#endregion
//#region node_modules/d3-format/src/defaultLocale.js
var SC, CC, wC;
TC({
	thousands: ",",
	grouping: [3],
	currency: ["$", ""]
});
function TC(e) {
	return SC = xC(e), CC = SC.format, wC = SC.formatPrefix, SC;
}
//#endregion
//#region node_modules/d3-format/src/precisionFixed.js
function EC(e) {
	return Math.max(0, -sC(Math.abs(e)));
}
//#endregion
//#region node_modules/d3-format/src/precisionPrefix.js
function DC(e, t) {
	return Math.max(0, Math.max(-8, Math.min(8, Math.floor(sC(t) / 3))) * 3 - sC(Math.abs(e)));
}
//#endregion
//#region node_modules/d3-format/src/precisionRound.js
function OC(e, t) {
	return e = Math.abs(e), t = Math.abs(t) - e, Math.max(0, sC(t) - sC(e)) + 1;
}
//#endregion
//#region node_modules/d3-scale/src/tickFormat.js
function kC(e, t, n, r) {
	var i = Ox(e, t, n), a;
	switch (r = dC(r ?? ",f"), r.type) {
		case "s":
			var o = Math.max(Math.abs(e), Math.abs(t));
			return r.precision == null && !isNaN(a = DC(i, o)) && (r.precision = a), wC(r, o);
		case "":
		case "e":
		case "g":
		case "p":
		case "r":
			r.precision == null && !isNaN(a = OC(i, Math.max(Math.abs(e), Math.abs(t)))) && (r.precision = a - (r.type === "e"));
			break;
		case "f":
		case "%": r.precision == null && !isNaN(a = EC(i)) && (r.precision = a - (r.type === "%") * 2);
	}
	return CC(r);
}
//#endregion
//#region node_modules/d3-scale/src/linear.js
function AC(e) {
	var t = e.domain;
	return e.ticks = function(e) {
		var n = t();
		return Ex(n[0], n[n.length - 1], e ?? 10);
	}, e.tickFormat = function(e, n) {
		var r = t();
		return kC(r[0], r[r.length - 1], e ?? 10, n);
	}, e.nice = function(n) {
		n ??= 10;
		var r = t(), i = 0, a = r.length - 1, o = r[i], s = r[a], c, l, u = 10;
		for (s < o && (l = o, o = s, s = l, l = i, i = a, a = l); u-- > 0;) {
			if (l = Dx(o, s, n), l === c) return r[i] = o, r[a] = s, t(r);
			if (l > 0) o = Math.floor(o / l) * l, s = Math.ceil(s / l) * l;
			else if (l < 0) o = Math.ceil(o * l) / l, s = Math.floor(s * l) / l;
			else break;
			c = l;
		}
		return e;
	}, e;
}
function jC() {
	var e = iC();
	return e.copy = function() {
		return nC(e, jC());
	}, Ix.apply(e, arguments), AC(e);
}
//#endregion
//#region node_modules/d3-scale/src/identity.js
function MC(e) {
	var t;
	function n(e) {
		return e == null || isNaN(e = +e) ? t : e;
	}
	return n.invert = n, n.domain = n.range = function(t) {
		return arguments.length ? (e = Array.from(t, YS), n) : e.slice();
	}, n.unknown = function(e) {
		return arguments.length ? (t = e, n) : t;
	}, n.copy = function() {
		return MC(e).unknown(t);
	}, e = arguments.length ? Array.from(e, YS) : [0, 1], AC(n);
}
//#endregion
//#region node_modules/d3-scale/src/nice.js
function NC(e, t) {
	e = e.slice();
	var n = 0, r = e.length - 1, i = e[n], a = e[r], o;
	return a < i && (o = n, n = r, r = o, o = i, i = a, a = o), e[n] = t.floor(i), e[r] = t.ceil(a), e;
}
//#endregion
//#region node_modules/d3-scale/src/log.js
function PC(e) {
	return Math.log(e);
}
function FC(e) {
	return Math.exp(e);
}
function IC(e) {
	return -Math.log(-e);
}
function LC(e) {
	return -Math.exp(-e);
}
function RC(e) {
	return isFinite(e) ? +("1e" + e) : e < 0 ? 0 : e;
}
function zC(e) {
	return e === 10 ? RC : e === Math.E ? Math.exp : (t) => e ** +t;
}
function BC(e) {
	return e === Math.E ? Math.log : e === 10 && Math.log10 || e === 2 && Math.log2 || (e = Math.log(e), (t) => Math.log(t) / e);
}
function VC(e) {
	return (t, n) => -e(-t, n);
}
function HC(e) {
	let t = e(PC, FC), n = t.domain, r = 10, i, a;
	function o() {
		return i = BC(r), a = zC(r), n()[0] < 0 ? (i = VC(i), a = VC(a), e(IC, LC)) : e(PC, FC), t;
	}
	return t.base = function(e) {
		return arguments.length ? (r = +e, o()) : r;
	}, t.domain = function(e) {
		return arguments.length ? (n(e), o()) : n();
	}, t.ticks = (e) => {
		let t = n(), o = t[0], s = t[t.length - 1], c = s < o;
		c && ([o, s] = [s, o]);
		let l = i(o), u = i(s), d, f, p = e == null ? 10 : +e, m = [];
		if (!(r % 1) && u - l < p) {
			if (l = Math.floor(l), u = Math.ceil(u), o > 0) {
				for (; l <= u; ++l) for (d = 1; d < r; ++d) if (f = l < 0 ? d / a(-l) : d * a(l), !(f < o)) {
					if (f > s) break;
					m.push(f);
				}
			} else for (; l <= u; ++l) for (d = r - 1; d >= 1; --d) if (f = l > 0 ? d / a(-l) : d * a(l), !(f < o)) {
				if (f > s) break;
				m.push(f);
			}
			m.length * 2 < p && (m = Ex(o, s, p));
		} else m = Ex(l, u, Math.min(u - l, p)).map(a);
		return c ? m.reverse() : m;
	}, t.tickFormat = (e, n) => {
		if (e ??= 10, n ??= r === 10 ? "s" : ",", typeof n != "function" && (!(r % 1) && (n = dC(n)).precision == null && (n.trim = !0), n = CC(n)), e === Infinity) return n;
		let o = Math.max(1, r * e / t.ticks().length);
		return (e) => {
			let t = e / a(Math.round(i(e)));
			return t * r < r - .5 && (t *= r), t <= o ? n(e) : "";
		};
	}, t.nice = () => n(NC(n(), {
		floor: (e) => a(Math.floor(i(e))),
		ceil: (e) => a(Math.ceil(i(e)))
	})), t;
}
function UC() {
	let e = HC(rC()).domain([1, 10]);
	return e.copy = () => nC(e, UC()).base(e.base()), Ix.apply(e, arguments), e;
}
//#endregion
//#region node_modules/d3-scale/src/symlog.js
function WC(e) {
	return function(t) {
		return Math.sign(t) * Math.log1p(Math.abs(t / e));
	};
}
function GC(e) {
	return function(t) {
		return Math.sign(t) * Math.expm1(Math.abs(t)) * e;
	};
}
function KC(e) {
	var t = 1, n = e(WC(t), GC(t));
	return n.constant = function(n) {
		return arguments.length ? e(WC(t = +n), GC(t)) : t;
	}, AC(n);
}
function qC() {
	var e = KC(rC());
	return e.copy = function() {
		return nC(e, qC()).constant(e.constant());
	}, Ix.apply(e, arguments);
}
//#endregion
//#region node_modules/d3-scale/src/pow.js
function JC(e) {
	return function(t) {
		return t < 0 ? -((-t) ** +e) : t ** +e;
	};
}
function YC(e) {
	return e < 0 ? -Math.sqrt(-e) : Math.sqrt(e);
}
function XC(e) {
	return e < 0 ? -e * e : e * e;
}
function ZC(e) {
	var t = e(ZS, ZS), n = 1;
	function r() {
		return n === 1 ? e(ZS, ZS) : n === .5 ? e(YC, XC) : e(JC(n), JC(1 / n));
	}
	return t.exponent = function(e) {
		return arguments.length ? (n = +e, r()) : n;
	}, AC(t);
}
function QC() {
	var e = ZC(rC());
	return e.copy = function() {
		return nC(e, QC()).exponent(e.exponent());
	}, Ix.apply(e, arguments), e;
}
function $C() {
	return QC.apply(null, arguments).exponent(.5);
}
//#endregion
//#region node_modules/d3-scale/src/radial.js
function ew(e) {
	return Math.sign(e) * e * e;
}
function tw(e) {
	return Math.sign(e) * Math.sqrt(Math.abs(e));
}
function nw() {
	var e = iC(), t = [0, 1], n = !1, r;
	function i(t) {
		var i = tw(e(t));
		return isNaN(i) ? r : n ? Math.round(i) : i;
	}
	return i.invert = function(t) {
		return e.invert(ew(t));
	}, i.domain = function(t) {
		return arguments.length ? (e.domain(t), i) : e.domain();
	}, i.range = function(n) {
		return arguments.length ? (e.range((t = Array.from(n, YS)).map(ew)), i) : t.slice();
	}, i.rangeRound = function(e) {
		return i.range(e).round(!0);
	}, i.round = function(e) {
		return arguments.length ? (n = !!e, i) : n;
	}, i.clamp = function(t) {
		return arguments.length ? (e.clamp(t), i) : e.clamp();
	}, i.unknown = function(e) {
		return arguments.length ? (r = e, i) : r;
	}, i.copy = function() {
		return nw(e.domain(), t).round(n).clamp(e.clamp()).unknown(r);
	}, Ix.apply(i, arguments), AC(i);
}
//#endregion
//#region node_modules/d3-scale/src/quantile.js
function rw() {
	var e = [], t = [], n = [], r;
	function i() {
		var r = 0, i = Math.max(1, t.length);
		for (n = Array(i - 1); ++r < i;) n[r - 1] = Px(e, r / i);
		return a;
	}
	function a(e) {
		return e == null || isNaN(e = +e) ? r : t[mx(n, e)];
	}
	return a.invertExtent = function(r) {
		var i = t.indexOf(r);
		return i < 0 ? [NaN, NaN] : [i > 0 ? n[i - 1] : e[0], i < n.length ? n[i] : e[e.length - 1]];
	}, a.domain = function(t) {
		if (!arguments.length) return e.slice();
		e = [];
		for (let n of t) n != null && !isNaN(n = +n) && e.push(n);
		return e.sort(sx), i();
	}, a.range = function(e) {
		return arguments.length ? (t = Array.from(e), i()) : t.slice();
	}, a.unknown = function(e) {
		return arguments.length ? (r = e, a) : r;
	}, a.quantiles = function() {
		return n.slice();
	}, a.copy = function() {
		return rw().domain(e).range(t).unknown(r);
	}, Ix.apply(a, arguments);
}
//#endregion
//#region node_modules/d3-scale/src/quantize.js
function iw() {
	var e = 0, t = 1, n = 1, r = [.5], i = [0, 1], a;
	function o(e) {
		return e != null && e <= e ? i[mx(r, e, 0, n)] : a;
	}
	function s() {
		var i = -1;
		for (r = Array(n); ++i < n;) r[i] = ((i + 1) * t - (i - n) * e) / (n + 1);
		return o;
	}
	return o.domain = function(n) {
		return arguments.length ? ([e, t] = n, e = +e, t = +t, s()) : [e, t];
	}, o.range = function(e) {
		return arguments.length ? (n = (i = Array.from(e)).length - 1, s()) : i.slice();
	}, o.invertExtent = function(a) {
		var o = i.indexOf(a);
		return o < 0 ? [NaN, NaN] : o < 1 ? [e, r[0]] : o >= n ? [r[n - 1], t] : [r[o - 1], r[o]];
	}, o.unknown = function(e) {
		return arguments.length && (a = e), o;
	}, o.thresholds = function() {
		return r.slice();
	}, o.copy = function() {
		return iw().domain([e, t]).range(i).unknown(a);
	}, Ix.apply(AC(o), arguments);
}
//#endregion
//#region node_modules/d3-scale/src/threshold.js
function aw() {
	var e = [.5], t = [0, 1], n, r = 1;
	function i(i) {
		return i != null && i <= i ? t[mx(e, i, 0, r)] : n;
	}
	return i.domain = function(n) {
		return arguments.length ? (e = Array.from(n), r = Math.min(e.length, t.length - 1), i) : e.slice();
	}, i.range = function(n) {
		return arguments.length ? (t = Array.from(n), r = Math.min(e.length, t.length - 1), i) : t.slice();
	}, i.invertExtent = function(n) {
		var r = t.indexOf(n);
		return [e[r - 1], e[r]];
	}, i.unknown = function(e) {
		return arguments.length ? (n = e, i) : n;
	}, i.copy = function() {
		return aw().domain(e).range(t).unknown(n);
	}, Ix.apply(i, arguments);
}
//#endregion
//#region node_modules/d3-time/src/interval.js
var ow = /* @__PURE__ */ new Date(), sw = /* @__PURE__ */ new Date();
function cw(e, t, n, r) {
	function i(t) {
		return e(t = arguments.length === 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(+t)), t;
	}
	return i.floor = (t) => (e(t = /* @__PURE__ */ new Date(+t)), t), i.ceil = (n) => (e(n = /* @__PURE__ */ new Date(n - 1)), t(n, 1), e(n), n), i.round = (e) => {
		let t = i(e), n = i.ceil(e);
		return e - t < n - e ? t : n;
	}, i.offset = (e, n) => (t(e = /* @__PURE__ */ new Date(+e), n == null ? 1 : Math.floor(n)), e), i.range = (n, r, a) => {
		let o = [];
		if (n = i.ceil(n), a = a == null ? 1 : Math.floor(a), !(n < r) || !(a > 0)) return o;
		let s;
		do
			o.push(s = /* @__PURE__ */ new Date(+n)), t(n, a), e(n);
		while (s < n && n < r);
		return o;
	}, i.filter = (n) => cw((t) => {
		if (t >= t) for (; e(t), !n(t);) t.setTime(t - 1);
	}, (e, r) => {
		if (e >= e) {
			if (r < 0) for (; ++r <= 0;) for (; t(e, -1), !n(e););
			else for (; --r >= 0;) for (; t(e, 1), !n(e););
		}
	}), n && (i.count = (t, r) => (ow.setTime(+t), sw.setTime(+r), e(ow), e(sw), Math.floor(n(ow, sw))), i.every = (e) => (e = Math.floor(e), !isFinite(e) || !(e > 0) ? null : e > 1 ? i.filter(r ? (t) => r(t) % e === 0 : (t) => i.count(0, t) % e === 0) : i)), i;
}
//#endregion
//#region node_modules/d3-time/src/millisecond.js
var lw = cw(() => {}, (e, t) => {
	e.setTime(+e + t);
}, (e, t) => t - e);
lw.every = (e) => (e = Math.floor(e), !isFinite(e) || !(e > 0) ? null : e > 1 ? cw((t) => {
	t.setTime(Math.floor(t / e) * e);
}, (t, n) => {
	t.setTime(+t + n * e);
}, (t, n) => (n - t) / e) : lw), lw.range;
//#endregion
//#region node_modules/d3-time/src/duration.js
var uw = 1e3, dw = uw * 60, fw = dw * 60, pw = fw * 24, mw = pw * 7, hw = pw * 30, gw = pw * 365, _w = cw((e) => {
	e.setTime(e - e.getMilliseconds());
}, (e, t) => {
	e.setTime(+e + t * uw);
}, (e, t) => (t - e) / uw, (e) => e.getUTCSeconds());
_w.range;
//#endregion
//#region node_modules/d3-time/src/minute.js
var vw = cw((e) => {
	e.setTime(e - e.getMilliseconds() - e.getSeconds() * uw);
}, (e, t) => {
	e.setTime(+e + t * dw);
}, (e, t) => (t - e) / dw, (e) => e.getMinutes());
vw.range;
var yw = cw((e) => {
	e.setUTCSeconds(0, 0);
}, (e, t) => {
	e.setTime(+e + t * dw);
}, (e, t) => (t - e) / dw, (e) => e.getUTCMinutes());
yw.range;
//#endregion
//#region node_modules/d3-time/src/hour.js
var bw = cw((e) => {
	e.setTime(e - e.getMilliseconds() - e.getSeconds() * uw - e.getMinutes() * dw);
}, (e, t) => {
	e.setTime(+e + t * fw);
}, (e, t) => (t - e) / fw, (e) => e.getHours());
bw.range;
var xw = cw((e) => {
	e.setUTCMinutes(0, 0, 0);
}, (e, t) => {
	e.setTime(+e + t * fw);
}, (e, t) => (t - e) / fw, (e) => e.getUTCHours());
xw.range;
//#endregion
//#region node_modules/d3-time/src/day.js
var Sw = cw((e) => e.setHours(0, 0, 0, 0), (e, t) => e.setDate(e.getDate() + t), (e, t) => (t - e - (t.getTimezoneOffset() - e.getTimezoneOffset()) * dw) / pw, (e) => e.getDate() - 1);
Sw.range;
var Cw = cw((e) => {
	e.setUTCHours(0, 0, 0, 0);
}, (e, t) => {
	e.setUTCDate(e.getUTCDate() + t);
}, (e, t) => (t - e) / pw, (e) => e.getUTCDate() - 1);
Cw.range;
var ww = cw((e) => {
	e.setUTCHours(0, 0, 0, 0);
}, (e, t) => {
	e.setUTCDate(e.getUTCDate() + t);
}, (e, t) => (t - e) / pw, (e) => Math.floor(e / pw));
ww.range;
//#endregion
//#region node_modules/d3-time/src/week.js
function Tw(e) {
	return cw((t) => {
		t.setDate(t.getDate() - (t.getDay() + 7 - e) % 7), t.setHours(0, 0, 0, 0);
	}, (e, t) => {
		e.setDate(e.getDate() + t * 7);
	}, (e, t) => (t - e - (t.getTimezoneOffset() - e.getTimezoneOffset()) * dw) / mw);
}
var Ew = Tw(0), Dw = Tw(1), Ow = Tw(2), kw = Tw(3), Aw = Tw(4), jw = Tw(5), Mw = Tw(6);
Ew.range, Dw.range, Ow.range, kw.range, Aw.range, jw.range, Mw.range;
function Nw(e) {
	return cw((t) => {
		t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 7 - e) % 7), t.setUTCHours(0, 0, 0, 0);
	}, (e, t) => {
		e.setUTCDate(e.getUTCDate() + t * 7);
	}, (e, t) => (t - e) / mw);
}
var Pw = Nw(0), Fw = Nw(1), Iw = Nw(2), Lw = Nw(3), Rw = Nw(4), zw = Nw(5), Bw = Nw(6);
Pw.range, Fw.range, Iw.range, Lw.range, Rw.range, zw.range, Bw.range;
//#endregion
//#region node_modules/d3-time/src/month.js
var Vw = cw((e) => {
	e.setDate(1), e.setHours(0, 0, 0, 0);
}, (e, t) => {
	e.setMonth(e.getMonth() + t);
}, (e, t) => t.getMonth() - e.getMonth() + (t.getFullYear() - e.getFullYear()) * 12, (e) => e.getMonth());
Vw.range;
var Hw = cw((e) => {
	e.setUTCDate(1), e.setUTCHours(0, 0, 0, 0);
}, (e, t) => {
	e.setUTCMonth(e.getUTCMonth() + t);
}, (e, t) => t.getUTCMonth() - e.getUTCMonth() + (t.getUTCFullYear() - e.getUTCFullYear()) * 12, (e) => e.getUTCMonth());
Hw.range;
//#endregion
//#region node_modules/d3-time/src/year.js
var Uw = cw((e) => {
	e.setMonth(0, 1), e.setHours(0, 0, 0, 0);
}, (e, t) => {
	e.setFullYear(e.getFullYear() + t);
}, (e, t) => t.getFullYear() - e.getFullYear(), (e) => e.getFullYear());
Uw.every = (e) => !isFinite(e = Math.floor(e)) || !(e > 0) ? null : cw((t) => {
	t.setFullYear(Math.floor(t.getFullYear() / e) * e), t.setMonth(0, 1), t.setHours(0, 0, 0, 0);
}, (t, n) => {
	t.setFullYear(t.getFullYear() + n * e);
}), Uw.range;
var Ww = cw((e) => {
	e.setUTCMonth(0, 1), e.setUTCHours(0, 0, 0, 0);
}, (e, t) => {
	e.setUTCFullYear(e.getUTCFullYear() + t);
}, (e, t) => t.getUTCFullYear() - e.getUTCFullYear(), (e) => e.getUTCFullYear());
Ww.every = (e) => !isFinite(e = Math.floor(e)) || !(e > 0) ? null : cw((t) => {
	t.setUTCFullYear(Math.floor(t.getUTCFullYear() / e) * e), t.setUTCMonth(0, 1), t.setUTCHours(0, 0, 0, 0);
}, (t, n) => {
	t.setUTCFullYear(t.getUTCFullYear() + n * e);
}), Ww.range;
//#endregion
//#region node_modules/d3-time/src/ticks.js
function Gw(e, t, n, r, i, a) {
	let o = [
		[
			_w,
			1,
			uw
		],
		[
			_w,
			5,
			5 * uw
		],
		[
			_w,
			15,
			15 * uw
		],
		[
			_w,
			30,
			30 * uw
		],
		[
			a,
			1,
			dw
		],
		[
			a,
			5,
			5 * dw
		],
		[
			a,
			15,
			15 * dw
		],
		[
			a,
			30,
			30 * dw
		],
		[
			i,
			1,
			fw
		],
		[
			i,
			3,
			3 * fw
		],
		[
			i,
			6,
			6 * fw
		],
		[
			i,
			12,
			12 * fw
		],
		[
			r,
			1,
			pw
		],
		[
			r,
			2,
			2 * pw
		],
		[
			n,
			1,
			mw
		],
		[
			t,
			1,
			hw
		],
		[
			t,
			3,
			3 * hw
		],
		[
			e,
			1,
			gw
		]
	];
	function s(e, t, n) {
		let r = t < e;
		r && ([e, t] = [t, e]);
		let i = n && typeof n.range == "function" ? n : c(e, t, n), a = i ? i.range(e, +t + 1) : [];
		return r ? a.reverse() : a;
	}
	function c(t, n, r) {
		let i = Math.abs(n - t) / r, a = lx(([, , e]) => e).right(o, i);
		if (a === o.length) return e.every(Ox(t / gw, n / gw, r));
		if (a === 0) return lw.every(Math.max(Ox(t, n, r), 1));
		let [s, c] = o[i / o[a - 1][2] < o[a][2] / i ? a - 1 : a];
		return s.every(c);
	}
	return [s, c];
}
var [Kw, qw] = Gw(Ww, Hw, Pw, ww, xw, yw), [Jw, Yw] = Gw(Uw, Vw, Ew, Sw, bw, vw);
//#endregion
//#region node_modules/d3-time-format/src/locale.js
function Xw(e) {
	if (0 <= e.y && e.y < 100) {
		var t = new Date(-1, e.m, e.d, e.H, e.M, e.S, e.L);
		return t.setFullYear(e.y), t;
	}
	return new Date(e.y, e.m, e.d, e.H, e.M, e.S, e.L);
}
function Zw(e) {
	if (0 <= e.y && e.y < 100) {
		var t = new Date(Date.UTC(-1, e.m, e.d, e.H, e.M, e.S, e.L));
		return t.setUTCFullYear(e.y), t;
	}
	return new Date(Date.UTC(e.y, e.m, e.d, e.H, e.M, e.S, e.L));
}
function Qw(e, t, n) {
	return {
		y: e,
		m: t,
		d: n,
		H: 0,
		M: 0,
		S: 0,
		L: 0
	};
}
function $w(e) {
	var t = e.dateTime, n = e.date, r = e.time, i = e.periods, a = e.days, o = e.shortDays, s = e.months, c = e.shortMonths, l = oT(i), u = sT(i), d = oT(a), f = sT(a), p = oT(o), m = sT(o), h = oT(s), g = sT(s), _ = oT(c), v = sT(c), y = {
		a: N,
		A: ee,
		b: P,
		B: F,
		c: null,
		d: OT,
		e: OT,
		f: NT,
		g: WT,
		G: KT,
		H: kT,
		I: AT,
		j: jT,
		L: MT,
		m: PT,
		M: FT,
		p: te,
		q: ne,
		Q: hE,
		s: gE,
		S: IT,
		u: LT,
		U: RT,
		V: BT,
		w: VT,
		W: HT,
		x: null,
		X: null,
		y: UT,
		Y: GT,
		Z: qT,
		"%": mE
	}, b = {
		a: re,
		A: ie,
		b: ae,
		B: oe,
		c: null,
		d: JT,
		e: JT,
		f: $T,
		g: uE,
		G: fE,
		H: YT,
		I: XT,
		j: ZT,
		L: QT,
		m: eE,
		M: tE,
		p: se,
		q: ce,
		Q: hE,
		s: gE,
		S: nE,
		u: rE,
		U: iE,
		V: oE,
		w: sE,
		W: cE,
		x: null,
		X: null,
		y: lE,
		Y: dE,
		Z: pE,
		"%": mE
	}, x = {
		a: E,
		A: D,
		b: O,
		B: k,
		c: A,
		d: vT,
		e: vT,
		f: wT,
		g: mT,
		G: pT,
		H: bT,
		I: bT,
		j: yT,
		L: CT,
		m: _T,
		M: xT,
		p: T,
		q: gT,
		Q: ET,
		s: DT,
		S: ST,
		u: lT,
		U: uT,
		V: dT,
		w: cT,
		W: fT,
		x: j,
		X: M,
		y: mT,
		Y: pT,
		Z: hT,
		"%": TT
	};
	y.x = S(n, y), y.X = S(r, y), y.c = S(t, y), b.x = S(n, b), b.X = S(r, b), b.c = S(t, b);
	function S(e, t) {
		return function(n) {
			var r = [], i = -1, a = 0, o = e.length, s, c, l;
			for (n instanceof Date || (n = /* @__PURE__ */ new Date(+n)); ++i < o;) e.charCodeAt(i) === 37 && (r.push(e.slice(a, i)), (c = eT[s = e.charAt(++i)]) == null ? c = s === "e" ? " " : "0" : s = e.charAt(++i), (l = t[s]) && (s = l(n, c)), r.push(s), a = i + 1);
			return r.push(e.slice(a, i)), r.join("");
		};
	}
	function C(e, t) {
		return function(n) {
			var r = Qw(1900, void 0, 1), i = w(r, e, n += "", 0), a, o;
			if (i != n.length) return null;
			if ("Q" in r) return new Date(r.Q);
			if ("s" in r) return new Date(r.s * 1e3 + ("L" in r ? r.L : 0));
			if (t && !("Z" in r) && (r.Z = 0), "p" in r && (r.H = r.H % 12 + r.p * 12), r.m === void 0 && (r.m = "q" in r ? r.q : 0), "V" in r) {
				if (r.V < 1 || r.V > 53) return null;
				"w" in r || (r.w = 1), "Z" in r ? (a = Zw(Qw(r.y, 0, 1)), o = a.getUTCDay(), a = o > 4 || o === 0 ? Fw.ceil(a) : Fw(a), a = Cw.offset(a, (r.V - 1) * 7), r.y = a.getUTCFullYear(), r.m = a.getUTCMonth(), r.d = a.getUTCDate() + (r.w + 6) % 7) : (a = Xw(Qw(r.y, 0, 1)), o = a.getDay(), a = o > 4 || o === 0 ? Dw.ceil(a) : Dw(a), a = Sw.offset(a, (r.V - 1) * 7), r.y = a.getFullYear(), r.m = a.getMonth(), r.d = a.getDate() + (r.w + 6) % 7);
			} else ("W" in r || "U" in r) && ("w" in r || (r.w = "u" in r ? r.u % 7 : +("W" in r)), o = "Z" in r ? Zw(Qw(r.y, 0, 1)).getUTCDay() : Xw(Qw(r.y, 0, 1)).getDay(), r.m = 0, r.d = "W" in r ? (r.w + 6) % 7 + r.W * 7 - (o + 5) % 7 : r.w + r.U * 7 - (o + 6) % 7);
			return "Z" in r ? (r.H += r.Z / 100 | 0, r.M += r.Z % 100, Zw(r)) : Xw(r);
		};
	}
	function w(e, t, n, r) {
		for (var i = 0, a = t.length, o = n.length, s, c; i < a;) {
			if (r >= o) return -1;
			if (s = t.charCodeAt(i++), s === 37) {
				if (s = t.charAt(i++), c = x[s in eT ? t.charAt(i++) : s], !c || (r = c(e, n, r)) < 0) return -1;
			} else if (s != n.charCodeAt(r++)) return -1;
		}
		return r;
	}
	function T(e, t, n) {
		var r = l.exec(t.slice(n));
		return r ? (e.p = u.get(r[0].toLowerCase()), n + r[0].length) : -1;
	}
	function E(e, t, n) {
		var r = p.exec(t.slice(n));
		return r ? (e.w = m.get(r[0].toLowerCase()), n + r[0].length) : -1;
	}
	function D(e, t, n) {
		var r = d.exec(t.slice(n));
		return r ? (e.w = f.get(r[0].toLowerCase()), n + r[0].length) : -1;
	}
	function O(e, t, n) {
		var r = _.exec(t.slice(n));
		return r ? (e.m = v.get(r[0].toLowerCase()), n + r[0].length) : -1;
	}
	function k(e, t, n) {
		var r = h.exec(t.slice(n));
		return r ? (e.m = g.get(r[0].toLowerCase()), n + r[0].length) : -1;
	}
	function A(e, n, r) {
		return w(e, t, n, r);
	}
	function j(e, t, r) {
		return w(e, n, t, r);
	}
	function M(e, t, n) {
		return w(e, r, t, n);
	}
	function N(e) {
		return o[e.getDay()];
	}
	function ee(e) {
		return a[e.getDay()];
	}
	function P(e) {
		return c[e.getMonth()];
	}
	function F(e) {
		return s[e.getMonth()];
	}
	function te(e) {
		return i[+(e.getHours() >= 12)];
	}
	function ne(e) {
		return 1 + ~~(e.getMonth() / 3);
	}
	function re(e) {
		return o[e.getUTCDay()];
	}
	function ie(e) {
		return a[e.getUTCDay()];
	}
	function ae(e) {
		return c[e.getUTCMonth()];
	}
	function oe(e) {
		return s[e.getUTCMonth()];
	}
	function se(e) {
		return i[+(e.getUTCHours() >= 12)];
	}
	function ce(e) {
		return 1 + ~~(e.getUTCMonth() / 3);
	}
	return {
		format: function(e) {
			var t = S(e += "", y);
			return t.toString = function() {
				return e;
			}, t;
		},
		parse: function(e) {
			var t = C(e += "", !1);
			return t.toString = function() {
				return e;
			}, t;
		},
		utcFormat: function(e) {
			var t = S(e += "", b);
			return t.toString = function() {
				return e;
			}, t;
		},
		utcParse: function(e) {
			var t = C(e += "", !0);
			return t.toString = function() {
				return e;
			}, t;
		}
	};
}
var eT = {
	"-": "",
	_: " ",
	0: "0"
}, tT = /^\s*\d+/, nT = /^%/, rT = /[\\^$*+?|[\]().{}]/g;
function iT(e, t, n) {
	var r = e < 0 ? "-" : "", i = (r ? -e : e) + "", a = i.length;
	return r + (a < n ? Array(n - a + 1).join(t) + i : i);
}
function aT(e) {
	return e.replace(rT, "\\$&");
}
function oT(e) {
	return RegExp("^(?:" + e.map(aT).join("|") + ")", "i");
}
function sT(e) {
	return new Map(e.map((e, t) => [e.toLowerCase(), t]));
}
function cT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 1));
	return r ? (e.w = +r[0], n + r[0].length) : -1;
}
function lT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 1));
	return r ? (e.u = +r[0], n + r[0].length) : -1;
}
function uT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.U = +r[0], n + r[0].length) : -1;
}
function dT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.V = +r[0], n + r[0].length) : -1;
}
function fT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.W = +r[0], n + r[0].length) : -1;
}
function pT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 4));
	return r ? (e.y = +r[0], n + r[0].length) : -1;
}
function mT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.y = +r[0] + (+r[0] > 68 ? 1900 : 2e3), n + r[0].length) : -1;
}
function hT(e, t, n) {
	var r = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(t.slice(n, n + 6));
	return r ? (e.Z = r[1] ? 0 : -(r[2] + (r[3] || "00")), n + r[0].length) : -1;
}
function gT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 1));
	return r ? (e.q = r[0] * 3 - 3, n + r[0].length) : -1;
}
function _T(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.m = r[0] - 1, n + r[0].length) : -1;
}
function vT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.d = +r[0], n + r[0].length) : -1;
}
function yT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 3));
	return r ? (e.m = 0, e.d = +r[0], n + r[0].length) : -1;
}
function bT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.H = +r[0], n + r[0].length) : -1;
}
function xT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.M = +r[0], n + r[0].length) : -1;
}
function ST(e, t, n) {
	var r = tT.exec(t.slice(n, n + 2));
	return r ? (e.S = +r[0], n + r[0].length) : -1;
}
function CT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 3));
	return r ? (e.L = +r[0], n + r[0].length) : -1;
}
function wT(e, t, n) {
	var r = tT.exec(t.slice(n, n + 6));
	return r ? (e.L = Math.floor(r[0] / 1e3), n + r[0].length) : -1;
}
function TT(e, t, n) {
	var r = nT.exec(t.slice(n, n + 1));
	return r ? n + r[0].length : -1;
}
function ET(e, t, n) {
	var r = tT.exec(t.slice(n));
	return r ? (e.Q = +r[0], n + r[0].length) : -1;
}
function DT(e, t, n) {
	var r = tT.exec(t.slice(n));
	return r ? (e.s = +r[0], n + r[0].length) : -1;
}
function OT(e, t) {
	return iT(e.getDate(), t, 2);
}
function kT(e, t) {
	return iT(e.getHours(), t, 2);
}
function AT(e, t) {
	return iT(e.getHours() % 12 || 12, t, 2);
}
function jT(e, t) {
	return iT(1 + Sw.count(Uw(e), e), t, 3);
}
function MT(e, t) {
	return iT(e.getMilliseconds(), t, 3);
}
function NT(e, t) {
	return MT(e, t) + "000";
}
function PT(e, t) {
	return iT(e.getMonth() + 1, t, 2);
}
function FT(e, t) {
	return iT(e.getMinutes(), t, 2);
}
function IT(e, t) {
	return iT(e.getSeconds(), t, 2);
}
function LT(e) {
	var t = e.getDay();
	return t === 0 ? 7 : t;
}
function RT(e, t) {
	return iT(Ew.count(Uw(e) - 1, e), t, 2);
}
function zT(e) {
	var t = e.getDay();
	return t >= 4 || t === 0 ? Aw(e) : Aw.ceil(e);
}
function BT(e, t) {
	return e = zT(e), iT(Aw.count(Uw(e), e) + (Uw(e).getDay() === 4), t, 2);
}
function VT(e) {
	return e.getDay();
}
function HT(e, t) {
	return iT(Dw.count(Uw(e) - 1, e), t, 2);
}
function UT(e, t) {
	return iT(e.getFullYear() % 100, t, 2);
}
function WT(e, t) {
	return e = zT(e), iT(e.getFullYear() % 100, t, 2);
}
function GT(e, t) {
	return iT(e.getFullYear() % 1e4, t, 4);
}
function KT(e, t) {
	var n = e.getDay();
	return e = n >= 4 || n === 0 ? Aw(e) : Aw.ceil(e), iT(e.getFullYear() % 1e4, t, 4);
}
function qT(e) {
	var t = e.getTimezoneOffset();
	return (t > 0 ? "-" : (t *= -1, "+")) + iT(t / 60 | 0, "0", 2) + iT(t % 60, "0", 2);
}
function JT(e, t) {
	return iT(e.getUTCDate(), t, 2);
}
function YT(e, t) {
	return iT(e.getUTCHours(), t, 2);
}
function XT(e, t) {
	return iT(e.getUTCHours() % 12 || 12, t, 2);
}
function ZT(e, t) {
	return iT(1 + Cw.count(Ww(e), e), t, 3);
}
function QT(e, t) {
	return iT(e.getUTCMilliseconds(), t, 3);
}
function $T(e, t) {
	return QT(e, t) + "000";
}
function eE(e, t) {
	return iT(e.getUTCMonth() + 1, t, 2);
}
function tE(e, t) {
	return iT(e.getUTCMinutes(), t, 2);
}
function nE(e, t) {
	return iT(e.getUTCSeconds(), t, 2);
}
function rE(e) {
	var t = e.getUTCDay();
	return t === 0 ? 7 : t;
}
function iE(e, t) {
	return iT(Pw.count(Ww(e) - 1, e), t, 2);
}
function aE(e) {
	var t = e.getUTCDay();
	return t >= 4 || t === 0 ? Rw(e) : Rw.ceil(e);
}
function oE(e, t) {
	return e = aE(e), iT(Rw.count(Ww(e), e) + (Ww(e).getUTCDay() === 4), t, 2);
}
function sE(e) {
	return e.getUTCDay();
}
function cE(e, t) {
	return iT(Fw.count(Ww(e) - 1, e), t, 2);
}
function lE(e, t) {
	return iT(e.getUTCFullYear() % 100, t, 2);
}
function uE(e, t) {
	return e = aE(e), iT(e.getUTCFullYear() % 100, t, 2);
}
function dE(e, t) {
	return iT(e.getUTCFullYear() % 1e4, t, 4);
}
function fE(e, t) {
	var n = e.getUTCDay();
	return e = n >= 4 || n === 0 ? Rw(e) : Rw.ceil(e), iT(e.getUTCFullYear() % 1e4, t, 4);
}
function pE() {
	return "+0000";
}
function mE() {
	return "%";
}
function hE(e) {
	return +e;
}
function gE(e) {
	return Math.floor(e / 1e3);
}
//#endregion
//#region node_modules/d3-time-format/src/defaultLocale.js
var _E, vE, yE;
bE({
	dateTime: "%x, %X",
	date: "%-m/%-d/%Y",
	time: "%-I:%M:%S %p",
	periods: ["AM", "PM"],
	days: [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	],
	shortDays: [
		"Sun",
		"Mon",
		"Tue",
		"Wed",
		"Thu",
		"Fri",
		"Sat"
	],
	months: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	],
	shortMonths: [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	]
});
function bE(e) {
	return _E = $w(e), vE = _E.format, _E.parse, yE = _E.utcFormat, _E.utcParse, _E;
}
//#endregion
//#region node_modules/d3-scale/src/time.js
function xE(e) {
	return new Date(e);
}
function SE(e) {
	return e instanceof Date ? +e : +/* @__PURE__ */ new Date(+e);
}
function CE(e, t, n, r, i, a, o, s, c, l) {
	var u = iC(), d = u.invert, f = u.domain, p = l(".%L"), m = l(":%S"), h = l("%I:%M"), g = l("%I %p"), _ = l("%a %d"), v = l("%b %d"), y = l("%B"), b = l("%Y");
	function x(e) {
		return (c(e) < e ? p : s(e) < e ? m : o(e) < e ? h : a(e) < e ? g : r(e) < e ? i(e) < e ? _ : v : n(e) < e ? y : b)(e);
	}
	return u.invert = function(e) {
		return new Date(d(e));
	}, u.domain = function(e) {
		return arguments.length ? f(Array.from(e, SE)) : f().map(xE);
	}, u.ticks = function(t) {
		var n = f();
		return e(n[0], n[n.length - 1], t ?? 10);
	}, u.tickFormat = function(e, t) {
		return t == null ? x : l(t);
	}, u.nice = function(e) {
		var n = f();
		return (!e || typeof e.range != "function") && (e = t(n[0], n[n.length - 1], e ?? 10)), e ? f(NC(n, e)) : u;
	}, u.copy = function() {
		return nC(u, CE(e, t, n, r, i, a, o, s, c, l));
	}, u;
}
function wE() {
	return Ix.apply(CE(Jw, Yw, Uw, Vw, Ew, Sw, bw, vw, _w, vE).domain([new Date(2e3, 0, 1), new Date(2e3, 0, 2)]), arguments);
}
//#endregion
//#region node_modules/d3-scale/src/utcTime.js
function TE() {
	return Ix.apply(CE(Kw, qw, Ww, Hw, Pw, Cw, xw, yw, _w, yE).domain([Date.UTC(2e3, 0, 1), Date.UTC(2e3, 0, 2)]), arguments);
}
//#endregion
//#region node_modules/d3-scale/src/sequential.js
function EE() {
	var e = 0, t = 1, n, r, i, a, o = ZS, s = !1, c;
	function l(e) {
		return e == null || isNaN(e = +e) ? c : o(i === 0 ? .5 : (e = (a(e) - n) * i, s ? Math.max(0, Math.min(1, e)) : e));
	}
	l.domain = function(o) {
		return arguments.length ? ([e, t] = o, n = a(e = +e), r = a(t = +t), i = n === r ? 0 : 1 / (r - n), l) : [e, t];
	}, l.clamp = function(e) {
		return arguments.length ? (s = !!e, l) : s;
	}, l.interpolator = function(e) {
		return arguments.length ? (o = e, l) : o;
	};
	function u(e) {
		return function(t) {
			var n, r;
			return arguments.length ? ([n, r] = t, o = e(n, r), l) : [o(0), o(1)];
		};
	}
	return l.range = u(GS), l.rangeRound = u(KS), l.unknown = function(e) {
		return arguments.length ? (c = e, l) : c;
	}, function(o) {
		return a = o, n = o(e), r = o(t), i = n === r ? 0 : 1 / (r - n), l;
	};
}
function DE(e, t) {
	return t.domain(e.domain()).interpolator(e.interpolator()).clamp(e.clamp()).unknown(e.unknown());
}
function OE() {
	var e = AC(EE()(ZS));
	return e.copy = function() {
		return DE(e, OE());
	}, Lx.apply(e, arguments);
}
function kE() {
	var e = HC(EE()).domain([1, 10]);
	return e.copy = function() {
		return DE(e, kE()).base(e.base());
	}, Lx.apply(e, arguments);
}
function AE() {
	var e = KC(EE());
	return e.copy = function() {
		return DE(e, AE()).constant(e.constant());
	}, Lx.apply(e, arguments);
}
function jE() {
	var e = ZC(EE());
	return e.copy = function() {
		return DE(e, jE()).exponent(e.exponent());
	}, Lx.apply(e, arguments);
}
function ME() {
	return jE.apply(null, arguments).exponent(.5);
}
//#endregion
//#region node_modules/d3-scale/src/sequentialQuantile.js
function NE() {
	var e = [], t = ZS;
	function n(n) {
		if (n != null && !isNaN(n = +n)) return t((mx(e, n, 1) - 1) / (e.length - 1));
	}
	return n.domain = function(t) {
		if (!arguments.length) return e.slice();
		e = [];
		for (let n of t) n != null && !isNaN(n = +n) && e.push(n);
		return e.sort(sx), n;
	}, n.interpolator = function(e) {
		return arguments.length ? (t = e, n) : t;
	}, n.range = function() {
		return e.map((n, r) => t(r / (e.length - 1)));
	}, n.quantiles = function(t) {
		return Array.from({ length: t + 1 }, (n, r) => Nx(e, r / t));
	}, n.copy = function() {
		return NE(t).domain(e);
	}, Lx.apply(n, arguments);
}
//#endregion
//#region node_modules/d3-scale/src/diverging.js
function PE() {
	var e = 0, t = .5, n = 1, r = 1, i, a, o, s, c, l = ZS, u, d = !1, f;
	function p(e) {
		return isNaN(e = +e) ? f : (e = .5 + ((e = +u(e)) - a) * (r * e < r * a ? s : c), l(d ? Math.max(0, Math.min(1, e)) : e));
	}
	p.domain = function(l) {
		return arguments.length ? ([e, t, n] = l, i = u(e = +e), a = u(t = +t), o = u(n = +n), s = i === a ? 0 : .5 / (a - i), c = a === o ? 0 : .5 / (o - a), r = a < i ? -1 : 1, p) : [
			e,
			t,
			n
		];
	}, p.clamp = function(e) {
		return arguments.length ? (d = !!e, p) : d;
	}, p.interpolator = function(e) {
		return arguments.length ? (l = e, p) : l;
	};
	function m(e) {
		return function(t) {
			var n, r, i;
			return arguments.length ? ([n, r, i] = t, l = qS(e, [
				n,
				r,
				i
			]), p) : [
				l(0),
				l(.5),
				l(1)
			];
		};
	}
	return p.range = m(GS), p.rangeRound = m(KS), p.unknown = function(e) {
		return arguments.length ? (f = e, p) : f;
	}, function(l) {
		return u = l, i = l(e), a = l(t), o = l(n), s = i === a ? 0 : .5 / (a - i), c = a === o ? 0 : .5 / (o - a), r = a < i ? -1 : 1, p;
	};
}
function FE() {
	var e = AC(PE()(ZS));
	return e.copy = function() {
		return DE(e, FE());
	}, Lx.apply(e, arguments);
}
function IE() {
	var e = HC(PE()).domain([
		.1,
		1,
		10
	]);
	return e.copy = function() {
		return DE(e, IE()).base(e.base());
	}, Lx.apply(e, arguments);
}
function LE() {
	var e = KC(PE());
	return e.copy = function() {
		return DE(e, LE()).constant(e.constant());
	}, Lx.apply(e, arguments);
}
function RE() {
	var e = ZC(PE());
	return e.copy = function() {
		return DE(e, RE()).exponent(e.exponent());
	}, Lx.apply(e, arguments);
}
function zE() {
	return RE.apply(null, arguments).exponent(.5);
}
//#endregion
//#region node_modules/victory-vendor/es/d3-scale.js
var BE = /* @__PURE__ */ s({
	scaleBand: () => Bx,
	scaleDiverging: () => FE,
	scaleDivergingLog: () => IE,
	scaleDivergingPow: () => RE,
	scaleDivergingSqrt: () => zE,
	scaleDivergingSymlog: () => LE,
	scaleIdentity: () => MC,
	scaleImplicit: () => Rx,
	scaleLinear: () => jC,
	scaleLog: () => UC,
	scaleOrdinal: () => zx,
	scalePoint: () => Hx,
	scalePow: () => QC,
	scaleQuantile: () => rw,
	scaleQuantize: () => iw,
	scaleRadial: () => nw,
	scaleSequential: () => OE,
	scaleSequentialLog: () => kE,
	scaleSequentialPow: () => jE,
	scaleSequentialQuantile: () => NE,
	scaleSequentialSqrt: () => ME,
	scaleSequentialSymlog: () => AE,
	scaleSqrt: () => $C,
	scaleSymlog: () => qC,
	scaleThreshold: () => aw,
	scaleTime: () => wE,
	scaleUtc: () => TE,
	tickFormat: () => kC
});
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineConfiguredScale.js
function VE(e) {
	var t = BE;
	if (e in t && typeof t[e] == "function") return t[e]();
	var n = `scale${dc(e)}`;
	if (n in t && typeof t[n] == "function") return t[n]();
}
function HE(e, t, n) {
	if (typeof e == "function") return e.copy().domain(t).range(n);
	if (e != null) {
		var r = VE(e);
		if (r != null) return r.domain(t).range(n), r;
	}
}
function UE(e, t, n, r) {
	if (n != null && r != null) return typeof e.scale == "function" ? HE(e.scale, n, r) : HE(t, n, r);
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineRealScaleType.js
function WE(e) {
	return `scale${dc(e)}`;
}
function GE(e) {
	return WE(e) in BE;
}
var KE = (e, t, n) => {
	if (e != null) {
		var r = e.scale, i = e.type;
		if (r === "auto") return i === "category" && n && (n.indexOf("LineChart") >= 0 || n.indexOf("AreaChart") >= 0 || n.indexOf("ComposedChart") >= 0 && !t) ? "point" : i === "category" ? "band" : "linear";
		if (typeof r == "string") return GE(r) ? r : "point";
	}
};
//#endregion
//#region node_modules/recharts/es6/util/scale/createCategoricalInverse.js
function qE(e, t) {
	for (var n = 0, r = e.length, i = e[0] < e[e.length - 1]; n < r;) {
		var a = Math.floor((n + r) / 2);
		(i ? e[a] < t : e[a] > t) ? n = a + 1 : r = a;
	}
	return n;
}
function JE(e, t) {
	if (e) {
		var n = t ?? e.domain(), r = n.map((t) => e(t) ?? 0), i = e.range();
		if (!(n.length === 0 || i.length < 2)) return (e) => {
			var t = qE(r, e);
			if (t <= 0) return n[0];
			if (t >= n.length) return n[n.length - 1];
			var i = r[t - 1] ?? 0, a = r[t] ?? 0;
			return Math.abs(e - i) <= Math.abs(e - a) ? n[t - 1] : n[t];
		};
	}
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineInverseScaleFunction.js
function YE(e) {
	if (e != null) return "invert" in e && typeof e.invert == "function" ? e.invert.bind(e) : JE(e, void 0);
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/axisSelectors.js
function XE(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function ZE(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? XE(Object(n), !0).forEach(function(t) {
			QE(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : XE(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function QE(e, t, n) {
	return (t = $E(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function $E(e) {
	var t = eD(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function eD(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function tD(e, t) {
	return oD(e) || aD(e, t) || rD(e, t) || nD();
}
function nD() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function rD(e, t) {
	if (e) {
		if (typeof e == "string") return iD(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? iD(e, t) : void 0;
	}
}
function iD(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function aD(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function oD(e) {
	if (Array.isArray(e)) return e;
}
var sD = [0, "auto"], cD = {
	allowDataOverflow: !1,
	allowDecimals: !0,
	allowDuplicatedCategory: !0,
	angle: 0,
	dataKey: void 0,
	domain: void 0,
	height: 30,
	hide: !0,
	id: 0,
	includeHidden: !1,
	interval: "preserveEnd",
	minTickGap: 5,
	mirror: !1,
	name: void 0,
	orientation: "bottom",
	padding: {
		left: 0,
		right: 0
	},
	reversed: !1,
	scale: "auto",
	tick: !0,
	tickCount: 5,
	tickFormatter: void 0,
	ticks: void 0,
	type: "category",
	unit: void 0,
	niceTicks: "auto"
}, lD = (e, t) => e.cartesianAxis.xAxis[t], uD = (e, t) => lD(e, t) ?? cD, dD = {
	allowDataOverflow: !1,
	allowDecimals: !0,
	allowDuplicatedCategory: !0,
	angle: 0,
	dataKey: void 0,
	domain: sD,
	hide: !0,
	id: 0,
	includeHidden: !1,
	interval: "preserveEnd",
	minTickGap: 5,
	mirror: !1,
	name: void 0,
	orientation: "left",
	padding: {
		top: 0,
		bottom: 0
	},
	reversed: !1,
	scale: "auto",
	tick: !0,
	tickCount: 5,
	tickFormatter: void 0,
	ticks: void 0,
	type: "number",
	unit: void 0,
	niceTicks: "auto",
	width: 60
}, fD = (e, t) => e.cartesianAxis.yAxis[t], pD = (e, t) => fD(e, t) ?? dD, mD = {
	domain: [0, "auto"],
	includeHidden: !1,
	reversed: !1,
	allowDataOverflow: !1,
	allowDuplicatedCategory: !1,
	dataKey: void 0,
	id: 0,
	name: "",
	range: [64, 64],
	scale: "auto",
	type: "number",
	unit: ""
}, hD = (e, t) => e.cartesianAxis.zAxis[t] ?? mD, gD = (e, t, n) => {
	switch (t) {
		case "xAxis": return uD(e, n);
		case "yAxis": return pD(e, n);
		case "zAxis": return hD(e, n);
		case "angleAxis": return Bb(e, n);
		case "radiusAxis": return Vb(e, n);
		default: throw Error(`Unexpected axis type: ${t}`);
	}
}, _D = (e, t, n) => {
	switch (t) {
		case "xAxis": return uD(e, n);
		case "yAxis": return pD(e, n);
		default: throw Error(`Unexpected axis type: ${t}`);
	}
}, vD = (e, t, n) => {
	switch (t) {
		case "xAxis": return uD(e, n);
		case "yAxis": return pD(e, n);
		case "angleAxis": return Bb(e, n);
		case "radiusAxis": return Vb(e, n);
		default: throw Error(`Unexpected axis type: ${t}`);
	}
}, yD = (e) => e.graphicalItems.cartesianItems.some((e) => e.type === "bar") || e.graphicalItems.polarItems.some((e) => e.type === "radialBar");
function bD(e, t) {
	return (n) => {
		switch (e) {
			case "xAxis": return "xAxisId" in n && n.xAxisId === t;
			case "yAxis": return "yAxisId" in n && n.yAxisId === t;
			case "zAxis": return "zAxisId" in n && n.zAxisId === t;
			case "angleAxis": return "angleAxisId" in n && n.angleAxisId === t;
			case "radiusAxis": return "radiusAxisId" in n && n.radiusAxisId === t;
			default: return !1;
		}
	};
}
var xD = (e) => e.graphicalItems.cartesianItems, SD = K([Yb, Xb], bD), CD = (e, t, n) => e.filter(n).filter((e) => t?.includeHidden === !0 || !e.hide), wD = K([
	xD,
	gD,
	SD
], CD, { memoizeOptions: { resultEqualityCheck: tx } }), TD = K([wD], (e) => e.filter((e) => e.type === "area" || e.type === "bar").filter($b)), ED = (e) => e.filter((e) => !("stackId" in e) || e.stackId === void 0), DD = K([wD], ED), OD = (e) => e.map((e) => e.data).filter(Boolean).flat(1), kD = K([wD], (e) => e.some((e) => !e.data)), AD = K([wD], OD, { memoizeOptions: { resultEqualityCheck: tx } }), jD = (e, t) => {
	var n = t.chartData, r = n === void 0 ? [] : n, i = t.dataStartIndex, a = t.dataEndIndex;
	return e.length > 0 ? e : r.slice(i, a + 1);
}, MD = K([AD, Ky], jD), ND = (e, t, n) => t?.dataKey == null ? n.length > 0 ? n.map((e) => e.dataKey).flatMap((t) => e.map((e) => ({ value: Pm(e, t) }))) : e.map((e) => ({ value: e })) : e.map((e) => ({ value: Pm(e, t.dataKey) })), PD = (e, t, n, r, i, a) => {
	var o = r.chartData, s = o === void 0 ? [] : o, c = r.dataStartIndex, l = r.dataEndIndex, u = ND(e, t, n);
	return i && t?.dataKey != null && a.length > 0 ? [...s.slice(c, l + 1).map((e) => ({ value: Pm(e, t.dataKey) })).filter((e) => e.value != null), ...u] : u;
}, FD = K([
	MD,
	gD,
	wD,
	Ky,
	kD,
	AD
], PD);
function ID(e) {
	if (rc(e) || e instanceof Date) {
		var t = Number(e);
		if (Dm(t)) return t;
	}
}
function LD(e) {
	if (Array.isArray(e)) {
		var t = [ID(e[0]), ID(e[1])];
		return nb(t) ? t : void 0;
	}
	var n = ID(e);
	if (n != null) return [n, n];
}
function RD(e) {
	return e.map(ID).filter(fc);
}
function zD(e, t) {
	var n = ID(e), r = ID(t);
	return n == null && r == null ? 0 : n == null ? -1 : r == null ? 1 : n - r;
}
var BD = K([FD], (e) => e?.map((e) => e.value).sort(zD));
function VD(e, t) {
	switch (e) {
		case "xAxis": return t.direction === "x";
		case "yAxis": return t.direction === "y";
		default: return !1;
	}
}
function HD(e, t, n) {
	if (!n || !n.length) return [];
	var r;
	if (typeof t == "number" && !tc(t)) r = t;
	else if (Array.isArray(t)) {
		var i = RD(t);
		i.length > 0 && (r = Math.max(...i));
	}
	return r == null ? [] : RD(n.flatMap((t) => {
		var n = Pm(e, t.dataKey), i, a;
		if (Array.isArray(n)) {
			var o = tD(n, 2);
			i = o[0], a = o[1];
		} else i = a = n;
		if (Dm(i) && Dm(a)) return [r - i, r + a];
	}));
}
var UD = (e) => vD(e, rx(e), ix(e)), WD = K([UD], (e) => e?.dataKey), GD = K([
	TD,
	Ky,
	UD
], Qb), KD = (e, t, n, r) => {
	var i = t.reduce((e, t) => {
		if (t.stackId == null) return e;
		var n = e[t.stackId];
		return n ??= [], n.push(t), e[t.stackId] = n, e;
	}, {});
	return Object.fromEntries(Object.entries(i).map((t) => {
		var i = tD(t, 2), a = i[0], o = i[1], s = r ? [...o].reverse() : o;
		return [a, {
			stackedData: Rm(e, s.map(Zb), n),
			graphicalItems: s
		}];
	}));
}, qD = K([
	GD,
	TD,
	Sb,
	Cb
], KD), JD = (e, t, n, r) => {
	var i = t.dataStartIndex, a = t.dataEndIndex;
	if (r == null && n !== "zAxis") return Vm(e, i, a);
}, YD = K([gD], (e) => e.allowDataOverflow), XD = (e) => {
	if (e == null || !("domain" in e)) return sD;
	if (e.domain != null) return e.domain;
	if ("ticks" in e && e.ticks != null) {
		if (e.type === "number") {
			var t = RD(e.ticks);
			return [Math.min(...t), Math.max(...t)];
		}
		if (e.type === "category") return e.ticks.map(String);
	}
	return e?.domain ?? sD;
}, ZD = K([gD], XD), QD = K([ZD, YD], ib), $D = K([
	qD,
	Wy,
	Yb,
	QD
], JD, { memoizeOptions: { resultEqualityCheck: ex } }), eO = (e) => e.errorBars, tO = (e, t, n) => e.flatMap((e) => t[e.id]).filter(Boolean).filter((e) => VD(n, e)), nO = function() {
	var e = [...arguments].filter(Boolean);
	if (e.length !== 0) {
		var t = e.flat();
		return [Math.min(...t), Math.max(...t)];
	}
}, rO = function(e, t, n, r, i) {
	var a = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : [], o, s;
	if (n.length > 0 && n.forEach((e) => {
		var n = e.data == null ? a : [...e.data], c = r[e.id]?.filter((e) => VD(i, e));
		n.forEach((n) => {
			var r = Pm(n, t.dataKey ?? e.dataKey), i = HD(n, r, c);
			if (i.length >= 2) {
				var a = Math.min(...i), l = Math.max(...i);
				(o == null || a < o) && (o = a), (s == null || l > s) && (s = l);
			}
			var u = LD(r);
			u != null && (o = o == null ? u[0] : Math.min(o, u[0]), s = s == null ? u[1] : Math.max(s, u[1]));
		});
	}), t?.dataKey != null && n.length === 0 && e.forEach((e) => {
		var n = LD(Pm(e, t.dataKey));
		n != null && (o = o == null ? n[0] : Math.min(o, n[0]), s = s == null ? n[1] : Math.max(s, n[1]));
	}), Dm(o) && Dm(s)) return [o, s];
}, iO = K([
	MD,
	gD,
	DD,
	eO,
	Yb,
	qy
], rO, { memoizeOptions: { resultEqualityCheck: ex } });
function aO(e) {
	var t = e.value;
	if (rc(t) || t instanceof Date) return t;
}
var oO = (e, t, n) => {
	var r = e.map(aO).filter((e) => e != null);
	return n && (t.dataKey == null || t.allowDuplicatedCategory && sc(r)) ? Uy(0, e.length) : t.allowDuplicatedCategory ? r : Array.from(new Set(r));
}, sO = (e) => e.referenceElements.dots, cO = (e, t, n) => e.filter((e) => e.ifOverflow === "extendDomain").filter((e) => t === "xAxis" ? e.xAxisId === n : e.yAxisId === n), lO = K([
	sO,
	Yb,
	Xb
], cO), uO = (e) => e.referenceElements.areas, dO = K([
	uO,
	Yb,
	Xb
], cO), fO = (e) => e.referenceElements.lines, pO = K([
	fO,
	Yb,
	Xb
], cO), mO = (e, t) => {
	if (e != null) {
		var n = RD(e.map((e) => t === "xAxis" ? e.x : e.y));
		if (n.length !== 0) return [Math.min(...n), Math.max(...n)];
	}
}, hO = K(lO, Yb, mO), gO = (e, t) => {
	if (e != null) {
		var n = RD(e.flatMap((e) => [t === "xAxis" ? e.x1 : e.y1, t === "xAxis" ? e.x2 : e.y2]));
		if (n.length !== 0) return [Math.min(...n), Math.max(...n)];
	}
}, _O = K([dO, Yb], gO);
function vO(e) {
	if (e.x != null) return RD([e.x]);
	var t = e.segment?.map((e) => e.x);
	return t == null || t.length === 0 ? [] : RD(t);
}
function yO(e) {
	if (e.y != null) return RD([e.y]);
	var t = e.segment?.map((e) => e.y);
	return t == null || t.length === 0 ? [] : RD(t);
}
var bO = (e, t) => {
	if (e != null) {
		var n = e.flatMap((e) => t === "xAxis" ? vO(e) : yO(e));
		if (n.length !== 0) return [Math.min(...n), Math.max(...n)];
	}
}, xO = K(hO, K([pO, Yb], bO), _O, (e, t, n) => nO(e, n, t)), SO = (e, t, n, r, i, a, o, s, c) => {
	if (n != null) return n;
	var l = o === "vertical" && s === "xAxis" || o === "horizontal" && s === "yAxis" ? nO(r, a, i) : nO(a, i), u = ab(t, l, e.allowDataOverflow);
	return u == null && e.allowDataOverflow && l == null && c != null ? c : u;
}, CO = K([
	gD,
	ZD,
	QD,
	$D,
	iO,
	xO,
	rg,
	Yb,
	K([gD], (e) => {
		if (e != null && e.type === "number" && "ticks" in e && e.ticks != null) {
			var t = RD(e.ticks);
			if (t.length !== 0) return [Math.min(...t), Math.max(...t)];
		}
	}, { memoizeOptions: { resultEqualityCheck: ex } })
], SO, { memoizeOptions: { resultEqualityCheck: ex } }), wO = [0, 1], TO = (e, t, n, r, i, a, o) => {
	if (e != null && n != null && n.length !== 0 || o !== void 0) {
		var s = e.dataKey, c = e.type, l = Im(t, a);
		return l && s == null ? Uy(0, n?.length ?? 0) : c === "category" ? oO(r, e, l) : i === "expand" && !l ? wO : o;
	}
}, EO = K([
	gD,
	rg,
	MD,
	FD,
	Sb,
	Yb,
	CO
], TO), DO = K([
	gD,
	yD,
	wb
], KE), OO = (e, t, n) => {
	var r = t.niceTicks;
	if (r !== "none") {
		var i = XD(t), a = Array.isArray(i) && (i[0] === "auto" || i[1] === "auto");
		if ((r === "snap125" || r === "adaptive") && t != null && t.tickCount && nb(e)) {
			if (a) return yb(e, t.tickCount, t.allowDecimals, r);
			if (t.type === "number") return bb(e, t.tickCount, t.allowDecimals, r);
		}
		if (r === "auto" && n === "linear" && t != null && t.tickCount) {
			if (a && nb(e)) return yb(e, t.tickCount, t.allowDecimals, "adaptive");
			if (t.type === "number" && nb(e)) return bb(e, t.tickCount, t.allowDecimals, "adaptive");
		}
	}
}, kO = K([
	EO,
	vD,
	DO
], OO), AO = (e, t, n, r) => {
	if (r !== "angleAxis" && e?.type === "number" && nb(t) && Array.isArray(n) && n.length > 0) {
		var i = t[0], a = n[0] ?? 0, o = t[1], s = n[n.length - 1] ?? 0;
		return [Math.min(i, a), Math.max(o, s)];
	}
	return t;
}, jO = K([
	gD,
	EO,
	kO,
	Yb
], AO), MO = K(K(FD, gD, (e, t) => {
	if (t && t.type === "number") {
		var n = Infinity, r = Array.from(RD(e.map((e) => e.value))).sort((e, t) => e - t), i = r[0], a = r[r.length - 1];
		if (i == null || a == null) return Infinity;
		var o = a - i;
		if (o === 0) return Infinity;
		for (var s = 0; s < r.length - 1; s++) {
			var c = r[s], l = r[s + 1];
			if (c != null && l != null) {
				var u = l - c;
				n = Math.min(n, u);
			}
		}
		return n / o;
	}
}), rg, xb, ph, (e, t, n, r, i) => i, (e, t, n, r, i) => {
	if (!Dm(e)) return 0;
	var a = t === "vertical" ? r.height : r.width;
	if (i === "gap") return e * a / 2;
	if (i === "no-gap") {
		var o = oc(n, e * a), s = e * a / 2;
		return s - o - (s - o) / a * o;
	}
	return 0;
}), NO = (e, t, n) => {
	var r = uD(e, t);
	return r == null || typeof r.padding != "string" ? 0 : MO(e, "xAxis", t, n, r.padding);
}, PO = (e, t, n) => {
	var r = pD(e, t);
	return r == null || typeof r.padding != "string" ? 0 : MO(e, "yAxis", t, n, r.padding);
}, FO = K(uD, NO, (e, t) => {
	if (e == null) return {
		left: 0,
		right: 0
	};
	var n = e.padding;
	return typeof n == "string" ? {
		left: t,
		right: t
	} : {
		left: (n.left ?? 0) + t,
		right: (n.right ?? 0) + t
	};
}), IO = K(pD, PO, (e, t) => {
	if (e == null) return {
		top: 0,
		bottom: 0
	};
	var n = e.padding;
	return typeof n == "string" ? {
		top: t,
		bottom: t
	} : {
		top: (n.top ?? 0) + t,
		bottom: (n.bottom ?? 0) + t
	};
}), LO = K([
	ph,
	FO,
	vh,
	_h,
	(e, t, n) => n
], (e, t, n, r, i) => {
	var a = r.padding;
	return i ? [a.left, n.width - a.right] : [e.left + t.left, e.left + e.width - t.right];
}), RO = K([
	ph,
	rg,
	IO,
	vh,
	_h,
	(e, t, n) => n
], (e, t, n, r, i, a) => {
	var o = i.padding;
	return a ? [r.height - o.bottom, o.top] : t === "horizontal" ? [e.top + e.height - n.bottom, e.top + n.top] : [e.top + n.top, e.top + e.height - n.bottom];
}), zO = (e, t, n, r) => {
	switch (t) {
		case "xAxis": return LO(e, n, r);
		case "yAxis": return RO(e, n, r);
		case "zAxis": return hD(e, n)?.range;
		case "angleAxis": return Kb(e);
		case "radiusAxis": return qb(e, n);
		default: return;
	}
}, BO = K([gD, zO], jb), VO = K([
	gD,
	DO,
	K([DO, jO], ox),
	BO
], UE), HO = (e, t, n, r) => {
	if (n != null && n.dataKey != null) {
		var i = n.type, a = n.scale;
		if (Im(e, r) && (i === "number" || a !== "auto")) return t.map((e) => e.value);
	}
}, UO = K([
	rg,
	FD,
	vD,
	Yb
], HO), WO = K([VO], ax);
K([VO], YE), K([VO, BD], JE), K([
	wD,
	eO,
	Yb
], tO);
function GO(e, t) {
	return e.id < t.id ? -1 : +(e.id > t.id);
}
var KO = (e, t) => t, qO = (e, t, n) => n, JO = K($m, KO, qO, (e, t, n) => e.filter((e) => e.orientation === t).filter((e) => e.mirror === n).sort(GO)), YO = K(eh, KO, qO, (e, t, n) => e.filter((e) => e.orientation === t).filter((e) => e.mirror === n).sort(GO)), XO = (e, t) => {
	var n = typeof t.height == "number" ? t.height : 30;
	return {
		width: e.width,
		height: n
	};
}, ZO = (e, t) => ({
	width: typeof t.width == "number" ? t.width : 60,
	height: e.height
});
K(ph, uD, XO);
var QO = (e, t, n) => {
	switch (t) {
		case "top": return e.top;
		case "bottom": return n - e.bottom;
		default: return 0;
	}
}, $O = (e, t, n) => {
	switch (t) {
		case "left": return e.left;
		case "right": return n - e.right;
		default: return 0;
	}
}, ek = K(Xm, ph, JO, KO, qO, (e, t, n, r, i) => {
	var a = {}, o;
	return n.forEach((n) => {
		var s = XO(t, n);
		o ??= QO(t, r, e);
		var c = r === "top" && !i || r === "bottom" && i;
		a[n.id] = o - Number(c) * s.height, o += (c ? -1 : 1) * s.height;
	}), a;
}), tk = K(Ym, ph, YO, KO, qO, (e, t, n, r, i) => {
	var a = {}, o;
	return n.forEach((n) => {
		var s = ZO(t, n);
		o ??= $O(t, r, e);
		var c = r === "left" && !i || r === "right" && i;
		a[n.id] = o - Number(c) * s.width, o += (c ? -1 : 1) * s.width;
	}), a;
});
K([
	ph,
	uD,
	(e, t) => {
		var n = uD(e, t);
		if (n != null) return ek(e, n.orientation, n.mirror);
	},
	(e, t) => t
], (e, t, n, r) => {
	if (t != null) {
		var i = n?.[r];
		return i == null ? {
			x: e.left,
			y: 0
		} : {
			x: e.left,
			y: i
		};
	}
}), K([
	ph,
	pD,
	(e, t) => {
		var n = pD(e, t);
		if (n != null) return tk(e, n.orientation, n.mirror);
	},
	(e, t) => t
], (e, t, n, r) => {
	if (t != null) {
		var i = n?.[r];
		return i == null ? {
			x: 0,
			y: e.top
		} : {
			x: i,
			y: e.top
		};
	}
}), K(ph, pD, (e, t) => ({
	width: typeof t.width == "number" ? t.width : 60,
	height: e.height
}));
var nk = (e, t, n, r) => {
	if (n != null) {
		var i = n.allowDuplicatedCategory, a = n.type, o = n.dataKey, s = Im(e, r), c = t.map((e) => e.value), l = c.filter((e) => e != null);
		if (o && s && a === "category" && i && sc(l)) return c;
	}
}, rk = K([
	rg,
	FD,
	gD,
	Yb
], nk);
K([
	rg,
	_D,
	DO,
	WO,
	rk,
	UO,
	zO,
	kO,
	Yb
], (e, t, n, r, i, a, o, s, c) => {
	if (t != null) {
		var l = Im(e, c);
		return {
			angle: t.angle,
			interval: t.interval,
			minTickGap: t.minTickGap,
			orientation: t.orientation,
			tick: t.tick,
			tickCount: t.tickCount,
			tickFormatter: t.tickFormatter,
			ticks: t.ticks,
			type: t.type,
			unit: t.unit,
			axisType: c,
			categoricalDomain: a,
			duplicateDomain: i,
			isCategorical: l,
			niceTicks: s,
			range: o,
			realScaleType: n,
			scale: r
		};
	}
}), K([
	rg,
	vD,
	DO,
	WO,
	kO,
	zO,
	rk,
	UO,
	Yb
], (e, t, n, r, i, a, o, s, c) => {
	if (t != null && r != null) {
		var l = Im(e, c), u = t.type, d = t.ticks, f = t.tickCount, p = n === "scaleBand" && typeof r.bandwidth == "function" ? r.bandwidth() / 2 : 2, m = u === "category" && r.bandwidth ? r.bandwidth() / p : 0;
		m = c === "angleAxis" && a != null && a.length >= 2 ? ec(a[0] - a[1]) * 2 * m : m;
		var h = d || i;
		return h ? h.map((e, t) => {
			var n = o ? o.indexOf(e) : e, i = r.map(n);
			return Dm(i) ? {
				index: t,
				coordinate: i + m,
				value: e,
				offset: m
			} : null;
		}).filter(fc) : l && s ? s.map((e, t) => {
			var n = r.map(e);
			return Dm(n) ? {
				coordinate: n + m,
				value: e,
				index: t,
				offset: m
			} : null;
		}).filter(fc) : r.ticks ? r.ticks(f).map((e, t) => {
			var n = r.map(e);
			return Dm(n) ? {
				coordinate: n + m,
				value: e,
				index: t,
				offset: m
			} : null;
		}).filter(fc) : r.domain().map((e, t) => {
			var n = r.map(e);
			return Dm(n) ? {
				coordinate: n + m,
				value: o ? o[e] : e,
				index: t,
				offset: m
			} : null;
		}).filter(fc);
	}
}), K([
	rg,
	vD,
	WO,
	zO,
	rk,
	UO,
	Yb
], (e, t, n, r, i, a, o) => {
	if (t != null && n != null && r != null && r[0] !== r[1]) {
		var s = Im(e, o), c = t.tickCount, l = 0;
		return l = o === "angleAxis" && r?.length >= 2 ? ec(r[0] - r[1]) * 2 * l : l, s && a ? a.map((e, t) => {
			var r = n.map(e);
			return Dm(r) ? {
				coordinate: r + l,
				value: e,
				index: t,
				offset: l
			} : null;
		}).filter(fc) : n.ticks ? n.ticks(c).map((e, t) => {
			var r = n.map(e);
			return Dm(r) ? {
				coordinate: r + l,
				value: e,
				index: t,
				offset: l
			} : null;
		}).filter(fc) : n.domain().map((e, t) => {
			var r = n.map(e);
			return Dm(r) ? {
				coordinate: r + l,
				value: i ? i[e] : e,
				index: t,
				offset: l
			} : null;
		}).filter(fc);
	}
}), K(gD, WO, (e, t) => {
	if (e != null && t != null) return ZE(ZE({}, e), {}, { scale: t });
}), K((e, t, n) => hD(e, n), K([K([
	gD,
	DO,
	EO,
	BO
], UE)], ax), (e, t) => {
	if (e != null && t != null) return ZE(ZE({}, e), {}, { scale: t });
});
var ik = K([
	rg,
	$m,
	eh
], (e, t, n) => {
	switch (e) {
		case "horizontal": return t.some((e) => e.reversed) ? "right-to-left" : "left-to-right";
		case "vertical": return n.some((e) => e.reversed) ? "bottom-to-top" : "top-to-bottom";
		case "centric":
		case "radial": return "left-to-right";
		default: return;
	}
});
K([(e, t, n) => e.renderedTicks[t]?.[n]], (e) => {
	if (e && e.length !== 0) return (t) => {
		var n = Infinity, r = e[0];
		for (var i of e) {
			var a = Math.abs(i.coordinate - t);
			a < n && (n = a, r = i);
		}
		return r?.value;
	};
});
//#endregion
//#region node_modules/recharts/es6/state/selectors/selectTooltipEventType.js
var ak = (e) => e.options.defaultTooltipEventType, ok = (e) => e.options.validateTooltipEventTypes;
function sk(e, t, n) {
	if (e == null) return t;
	var r = e ? "axis" : "item";
	return n == null ? t : n.includes(r) ? r : t;
}
function ck(e, t) {
	return sk(t, ak(e), ok(e));
}
function lk(e) {
	return H((t) => ck(t, e));
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineActiveLabel.js
var uk = (e, t) => {
	var n, r = Number(t);
	if (!(tc(r) || t == null)) return r >= 0 ? e == null || (n = e[r]) == null ? void 0 : n.value : void 0;
}, dk = (e) => e.tooltip.settings, fk = {
	active: !1,
	index: null,
	dataKey: void 0,
	graphicalItemId: void 0,
	coordinate: void 0
}, pk = jp({
	name: "tooltip",
	initialState: {
		itemInteraction: {
			click: fk,
			hover: fk
		},
		axisInteraction: {
			click: fk,
			hover: fk
		},
		keyboardInteraction: fk,
		syncInteraction: {
			active: !1,
			index: null,
			dataKey: void 0,
			label: void 0,
			coordinate: void 0,
			sourceViewBox: void 0,
			graphicalItemId: void 0
		},
		tooltipItemPayloads: [],
		settings: {
			shared: void 0,
			trigger: "hover",
			axisId: 0,
			active: !1,
			defaultIndex: void 0
		}
	},
	reducers: {
		addTooltipEntrySettings: {
			reducer(e, t) {
				e.tooltipItemPayloads.push(Y(t.payload));
			},
			prepare: gp()
		},
		replaceTooltipEntrySettings: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next, a = np(e).tooltipItemPayloads.indexOf(Y(r));
				a > -1 && (e.tooltipItemPayloads[a] = Y(i));
			},
			prepare: gp()
		},
		removeTooltipEntrySettings: {
			reducer(e, t) {
				var n = np(e).tooltipItemPayloads.indexOf(Y(t.payload));
				n > -1 && e.tooltipItemPayloads.splice(n, 1);
			},
			prepare: gp()
		},
		setTooltipSettingsState(e, t) {
			e.settings = t.payload;
		},
		setActiveMouseOverItemIndex(e, t) {
			e.syncInteraction.active = !1, e.syncInteraction.sourceViewBox = void 0, e.keyboardInteraction.active = !1, e.itemInteraction.hover.active = !0, e.itemInteraction.hover.index = t.payload.activeIndex, e.itemInteraction.hover.dataKey = t.payload.activeDataKey, e.itemInteraction.hover.graphicalItemId = t.payload.activeGraphicalItemId, e.itemInteraction.hover.coordinate = t.payload.activeCoordinate;
		},
		mouseLeaveChart(e) {
			e.itemInteraction.hover.active = !1, e.axisInteraction.hover.active = !1;
		},
		mouseLeaveItem(e) {
			e.itemInteraction.hover.active = !1;
		},
		setActiveClickItemIndex(e, t) {
			e.syncInteraction.active = !1, e.syncInteraction.sourceViewBox = void 0, e.itemInteraction.click.active = !0, e.keyboardInteraction.active = !1, e.itemInteraction.click.index = t.payload.activeIndex, e.itemInteraction.click.dataKey = t.payload.activeDataKey, e.itemInteraction.click.graphicalItemId = t.payload.activeGraphicalItemId, e.itemInteraction.click.coordinate = t.payload.activeCoordinate;
		},
		setMouseOverAxisIndex(e, t) {
			e.syncInteraction.active = !1, e.syncInteraction.sourceViewBox = void 0, e.axisInteraction.hover.active = !0, e.keyboardInteraction.active = !1, e.axisInteraction.hover.index = t.payload.activeIndex, e.axisInteraction.hover.dataKey = t.payload.activeDataKey, e.axisInteraction.hover.coordinate = t.payload.activeCoordinate;
		},
		setMouseClickAxisIndex(e, t) {
			e.syncInteraction.active = !1, e.syncInteraction.sourceViewBox = void 0, e.keyboardInteraction.active = !1, e.axisInteraction.click.active = !0, e.axisInteraction.click.index = t.payload.activeIndex, e.axisInteraction.click.dataKey = t.payload.activeDataKey, e.axisInteraction.click.coordinate = t.payload.activeCoordinate;
		},
		setSyncInteraction(e, t) {
			e.syncInteraction = t.payload;
		},
		setKeyboardInteraction(e, t) {
			e.keyboardInteraction.active = t.payload.active, e.keyboardInteraction.index = t.payload.activeIndex, e.keyboardInteraction.coordinate = t.payload.activeCoordinate;
		}
	}
}), mk = pk.actions, hk = mk.addTooltipEntrySettings, gk = mk.replaceTooltipEntrySettings, _k = mk.removeTooltipEntrySettings, vk = mk.setTooltipSettingsState, yk = mk.setActiveMouseOverItemIndex, bk = mk.mouseLeaveItem, xk = mk.mouseLeaveChart, Sk = mk.setActiveClickItemIndex, Ck = mk.setMouseOverAxisIndex, wk = mk.setMouseClickAxisIndex, Tk = mk.setSyncInteraction, Ek = mk.setKeyboardInteraction, Dk = pk.reducer;
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineTooltipInteractionState.js
function Ok(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function kk(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Ok(Object(n), !0).forEach(function(t) {
			Ak(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Ok(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Ak(e, t, n) {
	return (t = jk(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function jk(e) {
	var t = Mk(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Mk(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Nk(e, t, n) {
	return t === "axis" ? n === "click" ? e.axisInteraction.click : e.axisInteraction.hover : n === "click" ? e.itemInteraction.click : e.itemInteraction.hover;
}
function Pk(e) {
	return e.index != null;
}
var Fk = (e, t, n, r) => {
	if (t == null) return fk;
	var i = Nk(e, t, n);
	if (i == null) return fk;
	if (i.active) return i;
	if (e.keyboardInteraction.active) return e.keyboardInteraction;
	if (e.syncInteraction.active && e.syncInteraction.index != null) return e.syncInteraction;
	var a = e.settings.active === !0;
	if (Pk(i)) {
		if (a) return kk(kk({}, i), {}, { active: !0 });
	} else if (r != null) return {
		active: !0,
		coordinate: void 0,
		dataKey: void 0,
		index: r,
		graphicalItemId: void 0
	};
	return kk(kk({}, fk), {}, { coordinate: i.coordinate });
};
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineActiveTooltipIndex.js
function Ik(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : void 0;
	if (e instanceof Date) {
		var t = e.valueOf();
		return Number.isFinite(t) ? t : void 0;
	}
	var n = Number(e);
	return Number.isFinite(n) ? n : void 0;
}
function Lk(e, t) {
	var n = Ik(e), r = t[0], i = t[1];
	return n !== void 0 && n >= Math.min(r, i) && n <= Math.max(r, i);
}
function Rk(e, t, n) {
	if (n == null || t == null) return !0;
	var r = Pm(e, t);
	return r == null || !nb(n) || Lk(r, n);
}
var zk = (e, t, n, r) => {
	var i = e?.index;
	if (i == null) return null;
	var a = Number(i);
	if (!Dm(a)) return i;
	var o = 0, s = Infinity;
	t.length > 0 && (s = t.length - 1);
	var c = Math.max(o, Math.min(a, s)), l = t[c];
	return l == null || Rk(l, n, r) ? String(c) : null;
}, Bk = (e, t, n, r, i, a, o) => {
	if (a != null) {
		var s = o[0]?.getPosition(a);
		if (s != null) return s;
		var c = i?.[Number(a)];
		if (c) switch (n) {
			case "horizontal": return {
				x: c.coordinate,
				y: (r.top + t) / 2
			};
			default: return {
				x: (r.left + e) / 2,
				y: c.coordinate
			};
		}
	}
}, Vk = (e, t, n, r) => {
	if (t === "axis") return e.tooltipItemPayloads;
	if (e.tooltipItemPayloads.length === 0) return [];
	var i = n === "hover" ? e.itemInteraction.hover.graphicalItemId : e.itemInteraction.click.graphicalItemId;
	if (e.syncInteraction.active && i == null) return e.tooltipItemPayloads;
	if (i == null && (r != null || e.keyboardInteraction.active)) {
		var a = e.tooltipItemPayloads[0];
		return a == null ? [] : [a];
	}
	return e.tooltipItemPayloads.filter((e) => e.settings?.graphicalItemId === i);
}, Hk = (e) => e.options.tooltipPayloadSearcher, Uk = (e) => e.tooltip;
//#endregion
//#region node_modules/recharts/es6/state/selectors/combiners/combineTooltipPayload.js
function Wk(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Gk(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Wk(Object(n), !0).forEach(function(t) {
			Kk(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Wk(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Kk(e, t, n) {
	return (t = qk(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function qk(e) {
	var t = Jk(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Jk(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Yk(e) {
	if (typeof e == "string" || typeof e == "number") return e;
}
function Xk(e) {
	if (typeof e == "string" || typeof e == "number" || typeof e == "boolean") return e;
}
function Zk(e) {
	if (typeof e == "string" || typeof e == "number") return e;
	if (typeof e == "function") return (t) => e(t);
}
function Qk(e) {
	if (typeof e == "string") return e;
}
function $k(e) {
	if (typeof e == "object" && e) return {
		name: "name" in e ? Yk(e.name) : void 0,
		unit: "unit" in e ? Xk(e.unit) : void 0,
		dataKey: "dataKey" in e ? Zk(e.dataKey) : void 0,
		payload: "payload" in e ? e.payload : void 0,
		color: "color" in e ? Qk(e.color) : void 0,
		fill: "fill" in e ? Qk(e.fill) : void 0
	};
}
function eA(e, t) {
	return e ?? t;
}
var tA = (e, t, n, r, i, a, o) => {
	if (t != null && a != null) {
		var s = n.chartData, c = n.computedData, l = n.dataStartIndex, u = n.dataEndIndex;
		return e.reduce((e, n) => {
			var d = n.dataDefinedOnItem, f = n.settings, p = eA(d, s), m = Array.isArray(p) ? Em(p, l, u) : p, h = f?.dataKey ?? r, g = f?.nameKey, _;
			return r && Array.isArray(m) && !Array.isArray(m[0]) && o === "axis" ? (_ = lc(m, r, i), _ ??= a(m, t, c, g)) : _ = a(m, t, c, g), Array.isArray(_) ? _.forEach((t) => {
				var n = $k(t), r = n?.name, i = n?.dataKey, a = n?.payload, o = Gk(Gk({}, f), {}, {
					name: r,
					unit: n?.unit,
					color: n?.color ?? f?.color,
					fill: n?.fill ?? f?.fill
				});
				e.push(Gm({
					tooltipEntrySettings: o,
					dataKey: i,
					payload: a,
					value: Pm(a, i),
					name: r == null ? void 0 : String(r)
				}));
			}) : e.push(Gm({
				tooltipEntrySettings: f,
				dataKey: h,
				payload: _,
				value: Pm(_, h),
				name: Pm(_, g) ?? f?.name
			})), e;
		}, []);
	}
}, nA = K([
	UD,
	yD,
	wb
], KE), rA = K([
	K([(e) => e.graphicalItems.cartesianItems, (e) => e.graphicalItems.polarItems], (e, t) => [...e, ...t]),
	UD,
	K([rx, ix], bD)
], CD, { memoizeOptions: { resultEqualityCheck: tx } }), iA = K([rA], (e) => e.filter($b)), aA = K([rA], OD, { memoizeOptions: { resultEqualityCheck: tx } }), oA = K([rA], (e) => e.some((e) => !e.data)), sA = K([aA, Wy], jD), cA = K([
	iA,
	Wy,
	UD
], Qb), lA = K([
	sA,
	UD,
	rA,
	Wy,
	oA,
	aA
], PD), uA = K([UD], XD), dA = K([uA, K([UD], (e) => e.allowDataOverflow)], ib), fA = K([
	K([
		cA,
		K([rA], (e) => e.filter($b)),
		Sb,
		Cb
	], KD),
	Wy,
	rx,
	dA
], JD), pA = K([
	sA,
	UD,
	K([rA], ED),
	eO,
	rx,
	Yy
], rO, { memoizeOptions: { resultEqualityCheck: ex } }), mA = K([K([
	sO,
	rx,
	ix
], cO), rx], mO), hA = K([K([
	uO,
	rx,
	ix
], cO), rx], gO), gA = K([
	UD,
	rg,
	sA,
	lA,
	Sb,
	rx,
	K([
		UD,
		uA,
		dA,
		fA,
		pA,
		K([
			mA,
			K([K([
				fO,
				rx,
				ix
			], cO), rx], bO),
			hA
		], nO),
		rg,
		rx
	], SO)
], TO), _A = K([
	UD,
	gA,
	K([
		gA,
		UD,
		nA
	], OO),
	rx
], AO), vA = (e) => zO(e, rx(e), ix(e), !1), yA = K([UD, vA], jb), bA = K([K([
	UD,
	nA,
	_A,
	yA
], UE)], ax), xA = K([
	rg,
	UD,
	nA,
	bA,
	vA,
	K([
		rg,
		lA,
		UD,
		rx
	], nk),
	K([
		rg,
		lA,
		UD,
		rx
	], HO),
	rx
], (e, t, n, r, i, a, o, s) => {
	if (t) {
		var c = t.type, l = Im(e, s);
		if (r) {
			var u = n === "scaleBand" && r.bandwidth ? r.bandwidth() / 2 : 2, d = c === "category" && r.bandwidth ? r.bandwidth() / u : 0;
			return d = s === "angleAxis" && i != null && i?.length >= 2 ? ec(i[0] - i[1]) * 2 * d : d, l && o ? o.map((e, t) => {
				var n = r.map(e);
				return Dm(n) ? {
					coordinate: n + d,
					value: e,
					index: t,
					offset: d
				} : null;
			}).filter(fc) : r.domain().map((e, t) => {
				var n = r.map(e);
				return Dm(n) ? {
					coordinate: n + d,
					value: a ? a[e] : e,
					index: t,
					offset: d
				} : null;
			}).filter(fc);
		}
	}
}), SA = K([
	ak,
	ok,
	dk
], (e, t, n) => sk(n.shared, e, t)), CA = (e) => e.tooltip.settings.trigger, wA = (e) => e.tooltip.settings.defaultIndex, TA = K([
	Uk,
	SA,
	CA,
	wA
], Fk), EA = K([
	TA,
	sA,
	WD,
	gA
], zk), DA = K([xA, EA], uk), OA = K([TA], (e) => {
	if (e) return e.dataKey;
}), kA = K([TA], (e) => {
	if (e) return e.graphicalItemId;
}), AA = K([
	Uk,
	SA,
	CA,
	wA
], Vk), jA = K([TA, K([
	Ym,
	Xm,
	rg,
	ph,
	xA,
	wA,
	AA
], Bk)], (e, t) => e != null && e.coordinate ? e.coordinate : t), MA = K([TA], (e) => e?.active ?? !1);
K([K([
	AA,
	EA,
	Wy,
	WD,
	DA,
	Hk,
	SA
], tA)], (e) => {
	if (e != null) {
		var t = e.map((e) => e.payload).filter((e) => e != null);
		return Array.from(new Set(t));
	}
});
//#endregion
//#region node_modules/recharts/es6/context/useTooltipAxis.js
function NA(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function PA(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? NA(Object(n), !0).forEach(function(t) {
			FA(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : NA(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function FA(e, t, n) {
	return (t = IA(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function IA(e) {
	var t = LA(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function LA(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var RA = () => H(UD), zA = () => {
	var e = RA(), t = H(xA), n = H(bA);
	return Wm(!e || !n ? void 0 : PA(PA({}, e), {}, { scale: n }), t);
};
//#endregion
//#region node_modules/recharts/es6/util/getActiveCoordinate.js
function BA(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function VA(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? BA(Object(n), !0).forEach(function(t) {
			HA(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : BA(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function HA(e, t, n) {
	return (t = UA(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function UA(e) {
	var t = WA(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function WA(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var GA = (e, t, n, r) => {
	var i = t.find((e) => e && e.index === n);
	if (i) {
		if (e === "horizontal") return {
			x: i.coordinate,
			y: r.relativeY
		};
		if (e === "vertical") return {
			x: r.relativeX,
			y: i.coordinate
		};
	}
	return {
		x: 0,
		y: 0
	};
}, KA = (e, t, n, r) => {
	var i = t.find((e) => e && e.index === n);
	if (i) {
		if (e === "centric") {
			var a = i.coordinate, o = r.radius;
			return VA(VA(VA({}, r), _y(r.cx, r.cy, o, a)), {}, {
				angle: a,
				radius: o
			});
		}
		var s = i.coordinate, c = r.angle;
		return VA(VA(VA({}, r), _y(r.cx, r.cy, s, c)), {}, {
			angle: c,
			radius: s
		});
	}
	return {
		angle: 0,
		clockWise: !1,
		cx: 0,
		cy: 0,
		endAngle: 0,
		innerRadius: 0,
		outerRadius: 0,
		radius: 0,
		startAngle: 0,
		x: 0,
		y: 0
	};
};
function qA(e, t) {
	var n = e.relativeX, r = e.relativeY;
	return n >= t.left && n <= t.left + t.width && r >= t.top && r <= t.top + t.height;
}
var JA = (e, t, n, r, i) => {
	var a = t?.length ?? 0;
	if (a <= 1 || e == null) return 0;
	if (r === "angleAxis" && i != null && Math.abs(Math.abs(i[1] - i[0]) - 360) <= 1e-6) for (var o = i[1] - i[0], s = (t, n, r) => [
		e,
		e + o,
		e - o
	].some((e) => (r ? e >= t : e > t) && e <= n), c = 0; c < a; c++) {
		var l = c > 0 ? n[c - 1]?.coordinate : n[a - 1]?.coordinate, u = n[c]?.coordinate, d = c >= a - 1 ? n[0]?.coordinate : n[c + 1]?.coordinate, f = void 0;
		if (l != null && u != null && d != null) {
			if (ec(u - l) !== ec(d - u)) {
				var p = [];
				if (ec(d - u) === ec(i[1] - i[0])) {
					f = d;
					var m = u + i[1] - i[0];
					p[0] = Math.min(m, (m + l) / 2), p[1] = Math.max(m, (m + l) / 2);
				} else {
					f = l;
					var h = d + i[1] - i[0];
					p[0] = Math.min(u, (h + u) / 2), p[1] = Math.max(u, (h + u) / 2);
				}
				var g = [Math.min(u, (f + u) / 2), Math.max(u, (f + u) / 2)];
				if (s(g[0], g[1], !1) || s(p[0], p[1], !0)) return n[c]?.index;
			} else {
				var _ = Math.min(l, d), v = Math.max(l, d);
				if (s((_ + u) / 2, (v + u) / 2, !1)) return n[c]?.index;
			}
		}
	}
	else if (t) for (var y = 0; y < a; y++) {
		var b = t[y];
		if (b != null) {
			var x = t[y + 1], S = t[y - 1];
			if (y === 0 && x != null && e <= (b.coordinate + x.coordinate) / 2 || y === a - 1 && S != null && e > (b.coordinate + S.coordinate) / 2 || y > 0 && y < a - 1 && S != null && x != null && e > (b.coordinate + S.coordinate) / 2 && e <= (b.coordinate + x.coordinate) / 2) return b.index;
		}
	}
	return -1;
}, YA = () => H(wb), XA = (e, t) => t, ZA = (e, t, n) => n, QA = (e, t, n, r) => r, $A = K(xA, (e) => md(e, (e) => e.coordinate)), ej = K([
	Uk,
	XA,
	ZA,
	QA
], Fk), tj = K([
	ej,
	sA,
	WD,
	gA
], zk), nj = (e, t, n) => {
	if (t != null) {
		var r = Uk(e);
		return t === "axis" ? n === "hover" ? r.axisInteraction.hover.dataKey : r.axisInteraction.click.dataKey : n === "hover" ? r.itemInteraction.hover.dataKey : r.itemInteraction.click.dataKey;
	}
}, rj = K([
	Uk,
	XA,
	ZA,
	QA
], Vk), ij = K([
	Ym,
	Xm,
	rg,
	ph,
	xA,
	QA,
	rj
], Bk), aj = K([ej, ij], (e, t) => e.coordinate ?? t), oj = K([xA, tj], uk), sj = K([
	rj,
	tj,
	Wy,
	WD,
	oj,
	Hk,
	XA
], tA), cj = K([ej, tj], (e, t) => ({
	isActive: e.active && t != null,
	activeIndex: t
})), lj = (e, t, n, r, i, a, o) => {
	if (e && n && r && i && qA(e, o)) {
		var s = JA(qm(e, t), a, i, n, r), c = GA(t, i, s, e);
		return {
			activeIndex: String(s),
			activeCoordinate: c
		};
	}
}, uj = (e, t, n, r, i, a, o) => {
	if (e && r && i && a && n) {
		var s = Cy(e, n);
		if (s) {
			var c = JA(Jm(s, t), o, a, r, i), l = KA(t, a, c, s);
			return {
				activeIndex: String(c),
				activeCoordinate: l
			};
		}
	}
}, dj = (e, t, n, r, i, a, o, s) => {
	if (e && t && r && i && a) return t === "horizontal" || t === "vertical" ? lj(e, t, r, i, a, o, s) : uj(e, t, n, r, i, a, o);
}, fj = K((e) => e.zIndex.zIndexMap, (e, t) => t, (e, t, n) => n, (e, t, n) => {
	if (t != null) {
		var r = e[t];
		if (r != null) return n ? r.panoramaElement : r.element;
	}
}), pj = K((e) => e.zIndex.zIndexMap, (e) => {
	var t = Object.keys(e).map((e) => parseInt(e, 10)).concat(Object.values(Ob));
	return Array.from(new Set(t)).sort((e, t) => e - t);
}, { memoizeOptions: { resultEqualityCheck: nx } });
//#endregion
//#region node_modules/recharts/es6/state/zIndexSlice.js
function mj(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function hj(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? mj(Object(n), !0).forEach(function(t) {
			gj(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : mj(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function gj(e, t, n) {
	return (t = _j(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function _j(e) {
	var t = vj(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function vj(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var yj = { zIndexMap: Object.values(Ob).reduce((e, t) => hj(hj({}, e), {}, { [t]: {
	element: void 0,
	panoramaElement: void 0,
	consumers: 0
} }), {}) }, bj = new Set(Object.values(Ob));
function xj(e) {
	return bj.has(e);
}
var Sj = jp({
	name: "zIndex",
	initialState: yj,
	reducers: {
		registerZIndexPortal: {
			reducer: (e, t) => {
				var n = t.payload.zIndex;
				e.zIndexMap[n] ? e.zIndexMap[n].consumers += 1 : e.zIndexMap[n] = {
					consumers: 1,
					element: void 0,
					panoramaElement: void 0
				};
			},
			prepare: gp()
		},
		unregisterZIndexPortal: {
			reducer: (e, t) => {
				var n = t.payload.zIndex;
				e.zIndexMap[n] && (--e.zIndexMap[n].consumers, e.zIndexMap[n].consumers <= 0 && !xj(n) && delete e.zIndexMap[n]);
			},
			prepare: gp()
		},
		registerZIndexPortalElement: {
			reducer: (e, t) => {
				var n = t.payload, r = n.zIndex, i = n.element, a = n.isPanorama;
				e.zIndexMap[r] ? a ? e.zIndexMap[r].panoramaElement = Y(i) : e.zIndexMap[r].element = Y(i) : e.zIndexMap[r] = {
					consumers: 0,
					element: a ? void 0 : Y(i),
					panoramaElement: a ? Y(i) : void 0
				};
			},
			prepare: gp()
		},
		unregisterZIndexPortalElement: {
			reducer: (e, t) => {
				var n = t.payload.zIndex;
				e.zIndexMap[n] && (t.payload.isPanorama ? e.zIndexMap[n].panoramaElement = void 0 : e.zIndexMap[n].element = void 0);
			},
			prepare: gp()
		}
	}
}), Cj = Sj.actions, wj = Cj.registerZIndexPortal, Tj = Cj.unregisterZIndexPortal, Ej = Cj.registerZIndexPortalElement, Dj = Cj.unregisterZIndexPortalElement, Oj = Sj.reducer;
//#endregion
//#region node_modules/recharts/es6/zIndex/ZIndexLayer.js
function kj(e) {
	var t = e.zIndex, n = e.children, r = sg() && t !== void 0 && t !== 0, i = gh(), a = (0, x.useRef)(void 0), o = (0, x.useRef)(/* @__PURE__ */ new Set()), s = Ku(), c = H((e) => fj(e, t, i));
	if ((0, x.useLayoutEffect)(() => {
		if (!r) {
			var e = o.current;
			e.forEach((e) => {
				s(Tj({ zIndex: e }));
			}), e.clear(), a.current = void 0;
			return;
		}
		if (o.current.has(t) || (s(wj({ zIndex: t })), o.current.add(t)), c) {
			a.current = c;
			var n = o.current;
			n.forEach((e) => {
				e !== t && (s(Tj({ zIndex: e })), n.delete(e));
			});
		}
	}, [
		s,
		t,
		r,
		c
	]), (0, x.useLayoutEffect)(() => {
		var e = o.current;
		return () => {
			e.forEach((e) => {
				s(Tj({ zIndex: e }));
			}), e.clear();
		};
	}, [s]), !r) return n;
	var l = c ?? a.current;
	return l ? /*#__PURE__*/ (0, Ge.createPortal)(n, l) : null;
}
//#endregion
//#region node_modules/recharts/es6/component/Cursor.js
function Aj() {
	return Aj = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, Aj.apply(null, arguments);
}
function jj(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function Mj(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? jj(Object(n), !0).forEach(function(t) {
			Nj(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : jj(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function Nj(e, t, n) {
	return (t = Pj(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function Pj(e) {
	var t = Fj(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function Fj(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function Ij(e) {
	var t = e.cursor, n = e.cursorComp, r = e.cursorProps;
	return /*#__PURE__*/ (0, x.isValidElement)(t) ? /*#__PURE__*/ (0, x.cloneElement)(t, r) : /*#__PURE__*/ (0, x.createElement)(n, r);
}
function Lj(e) {
	var t = e.coordinate, n = e.payload, r = e.index, i = e.offset, a = e.tooltipAxisBandSize, o = e.layout, s = e.cursor, c = e.tooltipEventType, l = e.chartName, u = t, d = n, f = r;
	if (!s || !u || l !== "ScatterChart" && c !== "axis") return null;
	var p, m, h;
	if (l === "ScatterChart") p = u, m = X_, h = Ob.cursorLine;
	else if (l === "BarChart") p = Z_(o, u, i, a), m = ly, h = Ob.cursorRectangle;
	else if (o === "radial" && Cl(u)) {
		var g = wy(u), _ = g.cx, v = g.cy, y = g.radius;
		p = {
			cx: _,
			cy: v,
			startAngle: g.startAngle,
			endAngle: g.endAngle,
			innerRadius: y,
			outerRadius: y
		}, m = zy, h = Ob.cursorLine;
	} else p = { points: By(o, u, i) }, m = z_, h = Ob.cursorLine;
	var b = typeof s == "object" && "className" in s ? s.className : void 0, S = Mj(Mj(Mj(Mj({
		stroke: "#ccc",
		pointerEvents: "none"
	}, i), p), ks(s)), {}, {
		payload: d,
		payloadIndex: f,
		className: Ss("recharts-tooltip-cursor", b)
	});
	return /*#__PURE__*/ x.createElement(kj, { zIndex: e.zIndex ?? h }, /*#__PURE__*/ x.createElement(Ij, {
		cursor: s,
		cursorComp: m,
		cursorProps: S
	}));
}
function Rj(e) {
	var t = zA(), n = eg(), r = ig(), i = YA();
	return t == null || n == null || r == null || i == null ? null : /*#__PURE__*/ x.createElement(Lj, Aj({}, e, {
		offset: n,
		layout: r,
		tooltipAxisBandSize: t,
		chartName: i
	}));
}
//#endregion
//#region node_modules/recharts/es6/context/tooltipPortalContext.js
var zj = /*#__PURE__*/ (0, x.createContext)(null), Bj = () => (0, x.useContext)(zj), Vj = (/* @__PURE__ */ l((/* @__PURE__ */ o(((e, t) => {
	var n = Object.prototype.hasOwnProperty, r = "~";
	function i() {}
	Object.create && (i.prototype = Object.create(null), new i().__proto__ || (r = !1));
	function a(e, t, n) {
		this.fn = e, this.context = t, this.once = n || !1;
	}
	function o(e, t, n, i, o) {
		if (typeof n != "function") throw TypeError("The listener must be a function");
		var s = new a(n, i || e, o), c = r ? r + t : t;
		return e._events[c] ? e._events[c].fn ? e._events[c] = [e._events[c], s] : e._events[c].push(s) : (e._events[c] = s, e._eventsCount++), e;
	}
	function s(e, t) {
		--e._eventsCount === 0 ? e._events = new i() : delete e._events[t];
	}
	function c() {
		this._events = new i(), this._eventsCount = 0;
	}
	c.prototype.eventNames = function() {
		var e = [], t, i;
		if (this._eventsCount === 0) return e;
		for (i in t = this._events) n.call(t, i) && e.push(r ? i.slice(1) : i);
		return Object.getOwnPropertySymbols ? e.concat(Object.getOwnPropertySymbols(t)) : e;
	}, c.prototype.listeners = function(e) {
		var t = r ? r + e : e, n = this._events[t];
		if (!n) return [];
		if (n.fn) return [n.fn];
		for (var i = 0, a = n.length, o = Array(a); i < a; i++) o[i] = n[i].fn;
		return o;
	}, c.prototype.listenerCount = function(e) {
		var t = r ? r + e : e, n = this._events[t];
		return n ? n.fn ? 1 : n.length : 0;
	}, c.prototype.emit = function(e, t, n, i, a, o) {
		var s = r ? r + e : e;
		if (!this._events[s]) return !1;
		var c = this._events[s], l = arguments.length, u, d;
		if (c.fn) {
			switch (c.once && this.removeListener(e, c.fn, void 0, !0), l) {
				case 1: return c.fn.call(c.context), !0;
				case 2: return c.fn.call(c.context, t), !0;
				case 3: return c.fn.call(c.context, t, n), !0;
				case 4: return c.fn.call(c.context, t, n, i), !0;
				case 5: return c.fn.call(c.context, t, n, i, a), !0;
				case 6: return c.fn.call(c.context, t, n, i, a, o), !0;
			}
			for (d = 1, u = Array(l - 1); d < l; d++) u[d - 1] = arguments[d];
			c.fn.apply(c.context, u);
		} else {
			var f = c.length, p;
			for (d = 0; d < f; d++) switch (c[d].once && this.removeListener(e, c[d].fn, void 0, !0), l) {
				case 1:
					c[d].fn.call(c[d].context);
					break;
				case 2:
					c[d].fn.call(c[d].context, t);
					break;
				case 3:
					c[d].fn.call(c[d].context, t, n);
					break;
				case 4:
					c[d].fn.call(c[d].context, t, n, i);
					break;
				default:
					if (!u) for (p = 1, u = Array(l - 1); p < l; p++) u[p - 1] = arguments[p];
					c[d].fn.apply(c[d].context, u);
			}
		}
		return !0;
	}, c.prototype.on = function(e, t, n) {
		return o(this, e, t, n, !1);
	}, c.prototype.once = function(e, t, n) {
		return o(this, e, t, n, !0);
	}, c.prototype.removeListener = function(e, t, n, i) {
		var a = r ? r + e : e;
		if (!this._events[a]) return this;
		if (!t) return s(this, a), this;
		var o = this._events[a];
		if (o.fn) o.fn === t && (!i || o.once) && (!n || o.context === n) && s(this, a);
		else {
			for (var c = 0, l = [], u = o.length; c < u; c++) (o[c].fn !== t || i && !o[c].once || n && o[c].context !== n) && l.push(o[c]);
			l.length ? this._events[a] = l.length === 1 ? l[0] : l : s(this, a);
		}
		return this;
	}, c.prototype.removeAllListeners = function(e) {
		var t;
		return e ? (t = r ? r + e : e, this._events[t] && s(this, t)) : (this._events = new i(), this._eventsCount = 0), this;
	}, c.prototype.off = c.prototype.removeListener, c.prototype.addListener = c.prototype.on, c.prefixed = r, c.EventEmitter = c, t !== void 0 && (t.exports = c);
})))(), 1)).default, Hj = new Vj(), Uj = "recharts.syncEvent.tooltip", Wj = "recharts.syncEvent.brush", Gj = (e, t) => {
	if (t && Array.isArray(e)) {
		var n = Number.parseInt(t, 10);
		if (!tc(n)) return e[n];
	}
}, Kj = jp({
	name: "options",
	initialState: {
		chartName: "",
		tooltipPayloadSearcher: () => void 0,
		eventEmitter: void 0,
		defaultTooltipEventType: "axis"
	},
	reducers: { createEventEmitter: (e) => {
		e.eventEmitter ??= Symbol("rechartsEventEmitter");
	} }
}), qj = Kj.reducer, Jj = Kj.actions.createEventEmitter;
//#endregion
//#region node_modules/recharts/es6/synchronisation/syncSelectors.js
function Yj(e) {
	return e.tooltip.syncInteraction;
}
var Xj = jp({
	name: "chartData",
	initialState: {
		chartData: void 0,
		computedData: void 0,
		dataStartIndex: 0,
		dataEndIndex: 0
	},
	reducers: {
		setChartData(e, t) {
			if (e.chartData = Y(t.payload), t.payload == null) {
				e.dataStartIndex = 0, e.dataEndIndex = 0;
				return;
			}
			t.payload.length > 0 && e.dataEndIndex !== t.payload.length - 1 && (e.dataEndIndex = t.payload.length - 1);
		},
		setComputedData(e, t) {
			e.computedData = t.payload;
		},
		setDataStartEndIndexes(e, t) {
			var n = t.payload, r = n.startIndex, i = n.endIndex;
			r != null && (e.dataStartIndex = r), i != null && (e.dataEndIndex = i);
		}
	}
}), Zj = Xj.actions, Qj = Zj.setChartData, $j = Zj.setDataStartEndIndexes;
Zj.setComputedData;
var eM = Xj.reducer, tM = ["x", "y"];
function nM(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function rM(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? nM(Object(n), !0).forEach(function(t) {
			iM(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : nM(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function iM(e, t, n) {
	return (t = aM(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function aM(e) {
	var t = oM(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function oM(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function sM(e, t) {
	if (e == null) return {};
	var n, r, i = cM(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function cM(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function lM() {
	var e = H(Tb), t = H(Db), n = Ku(), r = H(Eb), i = H(xA), a = ig(), o = Qh(), s = H((e) => e.rootProps.className);
	(0, x.useEffect)(() => {
		if (e == null) return pc;
		var s = (s, c, l) => {
			if (t !== l && e === s) {
				if (c.payload.active === !1) {
					n(Tk({
						active: !1,
						coordinate: void 0,
						dataKey: void 0,
						index: null,
						label: void 0,
						sourceViewBox: void 0,
						graphicalItemId: void 0
					}));
					return;
				}
				if (r === "index") {
					var u;
					if (o && c != null && (u = c.payload) != null && u.coordinate && c.payload.sourceViewBox) {
						var d = c.payload.coordinate, f = d.x, p = d.y, m = sM(d, tM), h = c.payload.sourceViewBox, g = h.x, _ = h.y, v = h.width, y = h.height, b = rM(rM({}, m), {}, {
							x: o.x + (v ? (f - g) / v : 0) * o.width,
							y: o.y + (y ? (p - _) / y : 0) * o.height
						});
						n(rM(rM({}, c), {}, { payload: rM(rM({}, c.payload), {}, { coordinate: b }) }));
					} else n(c);
					return;
				}
				if (i != null) {
					var x;
					typeof r == "function" ? x = i[r(i, {
						activeTooltipIndex: c.payload.index == null ? void 0 : Number(c.payload.index),
						isTooltipActive: c.payload.active,
						activeIndex: c.payload.index == null ? void 0 : Number(c.payload.index),
						activeLabel: c.payload.label,
						activeDataKey: c.payload.dataKey,
						activeCoordinate: c.payload.coordinate
					})] : r === "value" && (x = i.find((e) => String(e.value) === c.payload.label));
					var S = c.payload.coordinate;
					if (S == null || o == null) {
						n(Tk({
							active: !1,
							coordinate: void 0,
							dataKey: void 0,
							index: null,
							label: void 0,
							sourceViewBox: void 0,
							graphicalItemId: void 0
						}));
						return;
					}
					if (x == null) {
						n(Tk({
							active: !1,
							coordinate: void 0,
							dataKey: void 0,
							index: null,
							label: void 0,
							sourceViewBox: c.payload.sourceViewBox,
							graphicalItemId: void 0
						}));
						return;
					}
					var C = S.x, w = S.y, T = Math.min(C, o.x + o.width), E = Math.min(w, o.y + o.height), D = {
						x: a === "horizontal" ? x.coordinate : T,
						y: a === "horizontal" ? E : x.coordinate
					};
					n(Tk({
						active: c.payload.active,
						coordinate: D,
						dataKey: c.payload.dataKey,
						index: String(x.index),
						label: c.payload.label,
						sourceViewBox: c.payload.sourceViewBox,
						graphicalItemId: c.payload.graphicalItemId
					}));
				}
			}
		};
		return Hj.on(Uj, s), () => {
			Hj.off(Uj, s);
		};
	}, [
		s,
		n,
		t,
		e,
		r,
		i,
		a,
		o
	]);
}
function uM() {
	var e = H(Tb), t = H(Db), n = Ku();
	(0, x.useEffect)(() => {
		if (e == null) return pc;
		var r = (r, i, a) => {
			t !== a && e === r && n($j(i));
		};
		return Hj.on(Wj, r), () => {
			Hj.off(Wj, r);
		};
	}, [
		n,
		t,
		e
	]);
}
function dM() {
	var e = Ku();
	(0, x.useEffect)(() => {
		e(Jj());
	}, [e]), lM(), uM();
}
function fM(e, t, n, r, i, a) {
	var o = H((n) => nj(n, e, t)), s = H(kA), c = H(Db), l = H(Tb), u = H(Eb), d = H(Yj)?.sourceViewBox != null, f = Qh();
	(0, x.useEffect)(() => {
		if (!d && l != null && c != null) {
			var e = Tk({
				active: a,
				coordinate: n,
				dataKey: o,
				index: i,
				label: typeof r == "number" ? String(r) : r,
				sourceViewBox: f,
				graphicalItemId: s
			});
			Hj.emit(Uj, l, e, c);
		}
	}, [
		d,
		n,
		o,
		s,
		i,
		r,
		c,
		l,
		u,
		a,
		f
	]);
}
//#endregion
//#region node_modules/recharts/es6/component/Tooltip.js
function pM(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function mM(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? pM(Object(n), !0).forEach(function(t) {
			hM(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : pM(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function hM(e, t, n) {
	return (t = gM(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function gM(e) {
	var t = _M(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function _M(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function vM(e, t) {
	return CM(e) || SM(e, t) || bM(e, t) || yM();
}
function yM() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function bM(e, t) {
	if (e) {
		if (typeof e == "string") return xM(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? xM(e, t) : void 0;
	}
}
function xM(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function SM(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function CM(e) {
	if (Array.isArray(e)) return e;
}
function wM(e) {
	return e.dataKey;
}
function TM(e, t) {
	return /*#__PURE__*/ x.isValidElement(e) ? /*#__PURE__*/ x.cloneElement(e, t) : typeof e == "function" ? /*#__PURE__*/ x.createElement(e, t) : /*#__PURE__*/ x.createElement(Yg, t);
}
var EM = [], DM = {
	allowEscapeViewBox: {
		x: !1,
		y: !1
	},
	animationDuration: 400,
	animationEasing: "ease",
	axisId: 0,
	contentStyle: {},
	cursor: !0,
	filterNull: !0,
	includeHidden: !1,
	isAnimationActive: "auto",
	itemSorter: "name",
	itemStyle: {},
	labelStyle: {},
	offset: 10,
	reverseDirection: {
		x: !1,
		y: !1
	},
	separator: " : ",
	trigger: "hover",
	useTranslate3d: !1,
	wrapperStyle: {}
};
function OM(e) {
	var t = Ml(e, DM), n = t.active, r = t.allowEscapeViewBox, i = t.animationDuration, a = t.animationEasing, o = t.content, s = t.filterNull, c = t.isAnimationActive, l = t.offset, u = t.payloadUniqBy, d = t.position, f = t.reverseDirection, p = t.useTranslate3d, m = t.wrapperStyle, h = t.cursor, g = t.shared, _ = t.trigger, v = t.defaultIndex, y = t.portal, b = t.axisId, S = Ku(), C = typeof v == "number" ? String(v) : v;
	(0, x.useEffect)(() => {
		S(vk({
			shared: g,
			trigger: _,
			axisId: b,
			active: n,
			defaultIndex: C
		}));
	}, [
		S,
		g,
		_,
		b,
		n,
		C
	]);
	var w = Qh(), T = w_(), E = lk(g), D = H((e) => cj(e, E, _, C)) ?? {}, O = D.activeIndex, k = D.isActive, A = H((e) => sj(e, E, _, C)), j = H((e) => oj(e, E, _, C)), M = H((e) => aj(e, E, _, C)), N = A, ee = Bj(), P = n ?? k ?? !1, F = vM(Ed([N, P]), 2), te = F[0], ne = F[1], re = E === "axis" ? j : void 0;
	fM(E, _, M, re, O, P);
	var ie = y ?? ee;
	if (ie == null || w == null || E == null) return null;
	var ae = N ?? EM;
	P || (ae = EM), s && ae.length && (ae = Ru(ae.filter((e) => e.value != null && (e.hide !== !0 || t.includeHidden)), u, wM));
	var oe = ae.length > 0, se = mM(mM({}, t), {}, {
		payload: ae,
		label: re,
		active: P,
		activeIndex: O,
		coordinate: M,
		accessibilityLayer: T
	}), ce = /*#__PURE__*/ x.createElement(C_, {
		allowEscapeViewBox: r,
		animationDuration: i,
		animationEasing: a,
		isAnimationActive: c,
		active: P,
		coordinate: M,
		hasPayload: oe,
		offset: l,
		position: d,
		reverseDirection: f,
		useTranslate3d: p,
		viewBox: w,
		wrapperStyle: m,
		lastBoundingBox: te,
		innerRef: ne,
		hasPortalFromProps: !!y
	}, TM(o, se));
	return /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ (0, Ge.createPortal)(ce, ie), P && /*#__PURE__*/ x.createElement(Rj, {
		cursor: h,
		tooltipEventType: E,
		coordinate: M,
		payload: ae,
		index: O
	}));
}
//#endregion
//#region node_modules/recharts/es6/component/Cell.js
var kM = (e) => null;
kM.displayName = "Cell";
//#endregion
//#region node_modules/recharts/es6/util/LRUCache.js
function AM(e, t, n) {
	return (t = jM(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function jM(e) {
	var t = MM(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function MM(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var NM = class {
	constructor(e) {
		AM(this, "cache", /* @__PURE__ */ new Map()), this.maxSize = e;
	}
	get(e) {
		var t = this.cache.get(e);
		return t !== void 0 && (this.cache.delete(e), this.cache.set(e, t)), t;
	}
	set(e, t) {
		if (this.cache.has(e)) this.cache.delete(e);
		else if (this.cache.size >= this.maxSize) {
			var n = this.cache.keys().next().value;
			n != null && this.cache.delete(n);
		}
		this.cache.set(e, t);
	}
	clear() {
		this.cache.clear();
	}
	size() {
		return this.cache.size;
	}
};
//#endregion
//#region node_modules/recharts/es6/util/DOMUtils.js
function PM(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function FM(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? PM(Object(n), !0).forEach(function(t) {
			IM(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : PM(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function IM(e, t, n) {
	return (t = LM(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function LM(e) {
	var t = RM(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function RM(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var zM = FM({}, {
	cacheSize: 2e3,
	enableCache: !0
}), BM = new NM(zM.cacheSize), VM = {
	position: "absolute",
	top: "-20000px",
	left: 0,
	padding: 0,
	margin: 0,
	border: "none",
	whiteSpace: "pre"
}, HM = "recharts_measurement_span";
function UM(e, t) {
	return `${e}|${t.fontSize || ""}|${t.fontFamily || ""}|${t.fontWeight || ""}|${t.fontStyle || ""}|${t.letterSpacing || ""}|${t.textTransform || ""}`;
}
var WM = (e, t) => {
	try {
		var n = document.getElementById(HM);
		n || (n = document.createElement("span"), n.setAttribute("id", HM), n.setAttribute("aria-hidden", "true"), document.body.appendChild(n)), Object.assign(n.style, VM, t), n.textContent = `${e}`;
		var r = n.getBoundingClientRect();
		return {
			width: r.width,
			height: r.height
		};
	} catch {
		return {
			width: 0,
			height: 0
		};
	}
}, GM = function(e) {
	var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
	if (e == null || n_.isSsr) return {
		width: 0,
		height: 0
	};
	if (!zM.enableCache) return WM(e, t);
	var n = UM(e, t), r = BM.get(n);
	if (r) return r;
	var i = WM(e, t);
	return BM.set(n, i), i;
}, KM;
function qM(e, t) {
	return QM(e) || ZM(e, t) || YM(e, t) || JM();
}
function JM() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function YM(e, t) {
	if (e) {
		if (typeof e == "string") return XM(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? XM(e, t) : void 0;
	}
}
function XM(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function ZM(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function QM(e) {
	if (Array.isArray(e)) return e;
}
function $M(e, t, n) {
	return (t = eN(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function eN(e) {
	var t = tN(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function tN(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var nN = /(-?\d+(?:\.\d+)?[a-zA-Z%]*)([*/])(-?\d+(?:\.\d+)?[a-zA-Z%]*)/, rN = /(-?\d+(?:\.\d+)?[a-zA-Z%]*)([+-])(-?\d+(?:\.\d+)?[a-zA-Z%]*)/, iN = /^(px|cm|vh|vw|em|rem|%|mm|in|pt|pc|ex|ch|vmin|vmax|Q)$/, aN = /(-?\d+(?:\.\d+)?)([a-zA-Z%]+)?/, oN = {
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	pt: 96 / 72,
	pc: 16,
	in: 96,
	Q: 96 / 101.6,
	px: 1
}, sN = [
	"cm",
	"mm",
	"pt",
	"pc",
	"in",
	"Q",
	"px"
];
function cN(e) {
	return sN.includes(e);
}
var lN = "NaN";
function uN(e, t) {
	return e * oN[t];
}
var dN = class e {
	static parse(t) {
		var n = qM(aN.exec(t) ?? [], 3), r = n[1], i = n[2];
		return r == null ? e.NaN : new e(parseFloat(r), i ?? "");
	}
	constructor(e, t) {
		this.num = e, this.unit = t, this.num = e, this.unit = t, tc(e) && (this.unit = ""), t !== "" && !iN.test(t) && (this.num = NaN, this.unit = ""), cN(t) && (this.num = uN(e, t), this.unit = "px");
	}
	add(t) {
		return this.unit === t.unit ? new e(this.num + t.num, this.unit) : new e(NaN, "");
	}
	subtract(t) {
		return this.unit === t.unit ? new e(this.num - t.num, this.unit) : new e(NaN, "");
	}
	multiply(t) {
		return this.unit !== "" && t.unit !== "" && this.unit !== t.unit ? new e(NaN, "") : new e(this.num * t.num, this.unit || t.unit);
	}
	divide(t) {
		return this.unit !== "" && t.unit !== "" && this.unit !== t.unit ? new e(NaN, "") : new e(this.num / t.num, this.unit || t.unit);
	}
	toString() {
		return `${this.num}${this.unit}`;
	}
	isNaN() {
		return tc(this.num);
	}
};
KM = dN, $M(dN, "NaN", new KM(NaN, ""));
function fN(e) {
	if (e == null || e.includes(lN)) return lN;
	for (var t = e; t.includes("*") || t.includes("/");) {
		var n = qM(nN.exec(t) ?? [], 4), r = n[1], i = n[2], a = n[3], o = dN.parse(r ?? ""), s = dN.parse(a ?? ""), c = i === "*" ? o.multiply(s) : o.divide(s);
		if (c.isNaN()) return lN;
		t = t.replace(nN, c.toString());
	}
	for (; t.includes("+") || /.-\d+(?:\.\d+)?/.test(t);) {
		var l = qM(rN.exec(t) ?? [], 4), u = l[1], d = l[2], f = l[3], p = dN.parse(u ?? ""), m = dN.parse(f ?? ""), h = d === "+" ? p.add(m) : p.subtract(m);
		if (h.isNaN()) return lN;
		t = t.replace(rN, h.toString());
	}
	return t;
}
var pN = /\(([^()]*)\)/;
function mN(e) {
	for (var t = e, n; (n = pN.exec(t)) != null;) {
		var r = qM(n, 2)[1];
		t = t.replace(pN, fN(r));
	}
	return t;
}
function hN(e) {
	var t = e.replace(/\s+/g, "");
	return t = mN(t), t = fN(t), t;
}
function gN(e) {
	try {
		return hN(e);
	} catch {
		return lN;
	}
}
function _N(e) {
	var t = gN(e.slice(5, -1));
	return t === lN ? "" : t;
}
//#endregion
//#region node_modules/recharts/es6/component/Text.js
var vN = [
	"x",
	"y",
	"lineHeight",
	"capHeight",
	"fill",
	"scaleToFit",
	"textAnchor",
	"verticalAnchor"
], yN = [
	"dx",
	"dy",
	"angle",
	"className",
	"breakAll"
];
function bN() {
	return bN = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, bN.apply(null, arguments);
}
function xN(e, t) {
	if (e == null) return {};
	var n, r, i = SN(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function SN(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function CN(e, t) {
	return ON(e) || DN(e, t) || TN(e, t) || wN();
}
function wN() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function TN(e, t) {
	if (e) {
		if (typeof e == "string") return EN(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? EN(e, t) : void 0;
	}
}
function EN(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function DN(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function ON(e) {
	if (Array.isArray(e)) return e;
}
var kN = /[ \f\n\r\t\v\u2028\u2029]+/, AN = (e) => {
	var t = e.children, n = e.breakAll, r = e.style;
	try {
		var i = [];
		return uc(t) || (i = n ? t.toString().split("") : t.toString().split(kN)), {
			wordsWithComputedWidth: i.map((e) => ({
				word: e,
				width: GM(e, r).width
			})),
			spaceWidth: n ? 0 : GM("\xA0", r).width
		};
	} catch {
		return null;
	}
};
function jN(e) {
	return e === "start" || e === "middle" || e === "end" || e === "inherit";
}
function MN(e) {
	return uc(e) || typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
var NN = (e, t, n, r) => e.reduce((e, i) => {
	var a = i.word, o = i.width, s = e[e.length - 1];
	if (s && o != null && (t == null || r || s.width + o + n < Number(t))) s.words.push(a), s.width += o + n;
	else {
		var c = {
			words: [a],
			width: o
		};
		e.push(c);
	}
	return e;
}, []), PN = (e) => e.reduce((e, t) => e.width > t.width ? e : t), FN = "…", IN = (e, t, n, r, i, a, o, s) => {
	var c = AN({
		breakAll: n,
		style: r,
		children: e.slice(0, t) + FN
	});
	if (!c) return [!1, []];
	var l = NN(c.wordsWithComputedWidth, a, o, s);
	return [l.length > i || PN(l).width > Number(a), l];
}, LN = (e, t, n, r, i) => {
	var a = e.maxLines, o = e.children, s = e.style, c = e.breakAll, l = V(a), u = String(o), d = NN(t, r, n, i);
	if (!l || i || !(d.length > a || PN(d).width > Number(r))) return d;
	for (var f = 0, p = u.length - 1, m = 0, h; f <= p && m <= u.length - 1;) {
		var g = Math.floor((f + p) / 2), _ = CN(IN(u, g - 1, c, s, a, r, n, i), 2), v = _[0], y = _[1], b = CN(IN(u, g, c, s, a, r, n, i), 1)[0];
		if (!v && !b && (f = g + 1), v && b && (p = g - 1), !v && b) {
			h = y;
			break;
		}
		m++;
	}
	return h || d;
}, RN = (e) => [{
	words: uc(e) ? [] : e.toString().split(kN),
	width: void 0
}], zN = (e) => {
	var t = e.width, n = e.scaleToFit, r = e.children, i = e.style, a = e.breakAll, o = e.maxLines;
	if ((t || n) && !n_.isSsr) {
		var s, c, l = AN({
			breakAll: a,
			children: r,
			style: i
		});
		if (l) {
			var u = l.wordsWithComputedWidth, d = l.spaceWidth;
			s = u, c = d;
		} else return RN(r);
		return LN({
			breakAll: a,
			children: r,
			maxLines: o,
			style: i
		}, s, c, t, !!n);
	}
	return RN(r);
}, BN = "#808080", VN = {
	angle: 0,
	breakAll: !1,
	capHeight: "0.71em",
	fill: BN,
	lineHeight: "1em",
	scaleToFit: !1,
	textAnchor: "start",
	verticalAnchor: "end",
	x: 0,
	y: 0
}, HN = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = Ml(e, VN), r = n.x, i = n.y, a = n.lineHeight, o = n.capHeight, s = n.fill, c = n.scaleToFit, l = n.textAnchor, u = n.verticalAnchor, d = xN(n, vN), f = (0, x.useMemo)(() => zN({
		breakAll: d.breakAll,
		children: d.children,
		maxLines: d.maxLines,
		scaleToFit: c,
		style: d.style,
		width: d.width
	}), [
		d.breakAll,
		d.children,
		d.maxLines,
		c,
		d.style,
		d.width
	]), p = d.dx, m = d.dy, h = d.angle, g = d.className, _ = d.breakAll, v = xN(d, yN);
	if (!rc(r) || !rc(i) || f.length === 0) return null;
	var y = Number(r) + (V(p) ? p : 0), b = Number(i) + (V(m) ? m : 0);
	if (!Dm(y) || !Dm(b)) return null;
	var S;
	switch (u) {
		case "start":
			S = _N(`calc(${o})`);
			break;
		case "middle":
			S = _N(`calc(${(f.length - 1) / 2} * -${a} + (${o} / 2))`);
			break;
		default: S = _N(`calc(${f.length - 1} * -${a})`);
	}
	var C = [], w = f[0];
	if (c && w != null) {
		var T = w.width, E = d.width;
		C.push(`scale(${V(E) && V(T) ? E / T : 1})`);
	}
	return h && C.push(`rotate(${h}, ${y}, ${b})`), C.length && (v.transform = C.join(" ")), /*#__PURE__*/ x.createElement("text", bN({}, As(v), {
		ref: t,
		x: y,
		y: b,
		className: Ss("recharts-text", g),
		textAnchor: l,
		fill: s.includes("url") ? BN : s
	}), f.map((e, t) => {
		var n = e.words.join(_ ? "" : " ");
		return /*#__PURE__*/ x.createElement("tspan", {
			x: y,
			dy: t === 0 ? S : a,
			key: `${n}-${t}`
		}, n);
	}));
});
HN.displayName = "Text";
//#endregion
//#region node_modules/recharts/es6/component/Label.js
var UN = ["labelRef"], WN = ["content"];
function GN(e, t) {
	if (e == null) return {};
	var n, r, i = KN(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function KN(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function qN(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function JN(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? qN(Object(n), !0).forEach(function(t) {
			YN(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : qN(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function YN(e, t, n) {
	return (t = XN(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function XN(e) {
	var t = ZN(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function ZN(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function QN() {
	return QN = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, QN.apply(null, arguments);
}
var $N = /*#__PURE__*/ (0, x.createContext)(null), eP = () => {
	var e = (0, x.useContext)($N), t = Qh();
	return e || (t ? mc(t) : void 0);
}, tP = /*#__PURE__*/ (0, x.createContext)(null), nP = (e) => {
	var t = e.cx, n = e.cy, r = e.innerRadius, i = e.outerRadius, a = e.startAngle, o = e.endAngle, s = e.clockWise, c = e.children, l = (0, x.useMemo)(() => ({
		cx: t,
		cy: n,
		innerRadius: r,
		outerRadius: i,
		startAngle: a,
		endAngle: o,
		clockWise: s
	}), [
		t,
		n,
		r,
		i,
		a,
		o,
		s
	]);
	return /*#__PURE__*/ x.createElement(tP.Provider, { value: l }, c);
}, rP = () => {
	var e = (0, x.useContext)(tP), t = H(Jb);
	return e || t;
}, iP = (e) => {
	var t = e.value, n = e.formatter, r = uc(e.children) ? t : e.children;
	return typeof n == "function" ? n(r) : r;
}, aP = (e) => e != null && typeof e == "function", oP = (e, t) => ec(t - e) * Math.min(Math.abs(t - e), 360), sP = (e, t, n, r, i) => {
	var a = e.offset, o = e.className, s = i.cx, c = i.cy, l = i.innerRadius, u = i.outerRadius, d = i.startAngle, f = i.endAngle, p = i.clockWise, m = (l + u) / 2, h = oP(d, f), g = h >= 0 ? 1 : -1, _, v;
	switch (t) {
		case "insideStart":
			_ = d + g * a, v = p;
			break;
		case "insideEnd":
			_ = f - g * a, v = !p;
			break;
		case "end":
			_ = f + g * a, v = p;
			break;
		default: throw Error(`Unsupported position ${t}`);
	}
	v = h <= 0 ? v : !v;
	var y = _y(s, c, m, _), b = _y(s, c, m, _ + (v ? 1 : -1) * 359), S = `M${y.x},${y.y}
    A${m},${m},0,1,${+!v},
    ${b.x},${b.y}`, C = uc(e.id) ? ac("recharts-radial-line-") : e.id;
	return /*#__PURE__*/ x.createElement("text", QN({}, r, {
		dominantBaseline: "central",
		className: Ss("recharts-radial-bar-label", o)
	}), /*#__PURE__*/ x.createElement("defs", null, /*#__PURE__*/ x.createElement("path", {
		id: C,
		d: S
	})), /*#__PURE__*/ x.createElement("textPath", { xlinkHref: `#${C}` }, n));
}, cP = (e, t, n) => {
	var r = e.cx, i = e.cy, a = e.innerRadius, o = e.outerRadius, s = (e.startAngle + e.endAngle) / 2;
	if (n === "outside") {
		var c = _y(r, i, o + t, s), l = c.x;
		return {
			x: l,
			y: c.y,
			textAnchor: l >= r ? "start" : "end",
			verticalAnchor: "middle"
		};
	}
	if (n === "center") return {
		x: r,
		y: i,
		textAnchor: "middle",
		verticalAnchor: "middle"
	};
	if (n === "centerTop") return {
		x: r,
		y: i,
		textAnchor: "middle",
		verticalAnchor: "start"
	};
	if (n === "centerBottom") return {
		x: r,
		y: i,
		textAnchor: "middle",
		verticalAnchor: "end"
	};
	var u = _y(r, i, (a + o) / 2, s);
	return {
		x: u.x,
		y: u.y,
		textAnchor: "middle",
		verticalAnchor: "middle"
	};
}, lP = (e) => e != null && "cx" in e && V(e.cx), uP = {
	angle: 0,
	offset: 5,
	zIndex: Ob.label,
	position: "middle",
	textBreakAll: !1
};
function dP(e) {
	if (!lP(e)) return e;
	var t = e.cx, n = e.cy, r = e.outerRadius, i = r * 2;
	return {
		x: t - r,
		y: n - r,
		width: i,
		upperWidth: i,
		lowerWidth: i,
		height: i
	};
}
function fP(e) {
	var t = Ml(e, uP), n = t.viewBox, r = t.parentViewBox, i = t.position, a = t.value, o = t.children, s = t.content, c = t.className, l = c === void 0 ? "" : c, u = t.textBreakAll, d = t.labelRef, f = rP(), p = eP(), m = n == null ? i === "center" ? p : f ?? p : lP(n) ? n : mc(n), h, g, _ = dP(m);
	if (!m || uc(a) && uc(o) && !/*#__PURE__*/ (0, x.isValidElement)(s) && typeof s != "function") return null;
	var v = lP(m) && (i === "insideStart" || i === "insideEnd" || i === "end");
	if (lP(m)) v || (g = cP(m, t.offset, t.position));
	else if (_) {
		var y = bc({
			viewBox: _,
			position: i,
			offset: t.offset,
			parentViewBox: lP(r) ? void 0 : r,
			clamp: !0
		});
		g = JN(JN({
			x: y.x,
			y: y.y,
			textAnchor: y.horizontalAnchor,
			verticalAnchor: y.verticalAnchor
		}, y.width === void 0 ? {} : { width: y.width }), y.height === void 0 ? {} : { height: y.height });
	}
	var b = JN(JN(JN(JN({}, g?.x === void 0 ? {} : { x: g.x }), g?.y === void 0 ? {} : { y: g.y }), t), {}, { viewBox: m });
	if (/*#__PURE__*/ (0, x.isValidElement)(s)) {
		b.labelRef;
		var S = GN(b, UN);
		return /*#__PURE__*/ (0, x.cloneElement)(s, S);
	}
	if (typeof s == "function") {
		b.content;
		var C = GN(b, WN);
		if (h = /*#__PURE__*/ (0, x.createElement)(s, C), /*#__PURE__*/ (0, x.isValidElement)(h)) return h;
	} else h = iP(t);
	var w = As(t);
	return v && lP(m) ? sP(t, i, h, w, m) : g == null ? null : /*#__PURE__*/ x.createElement(kj, { zIndex: t.zIndex }, /*#__PURE__*/ x.createElement(HN, QN({
		ref: d,
		className: Ss("recharts-label", l)
	}, w, g, {
		textAnchor: jN(w.textAnchor) ? w.textAnchor : g.textAnchor,
		breakAll: u
	}), h));
}
fP.displayName = "Label";
//#endregion
//#region node_modules/recharts/es6/component/LabelList.js
var pP = ["valueAccessor"], mP = [
	"dataKey",
	"clockWise",
	"id",
	"textBreakAll",
	"zIndex"
];
function hP() {
	return hP = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, hP.apply(null, arguments);
}
function gP(e, t) {
	if (e == null) return {};
	var n, r, i = _P(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function _P(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var vP = (e) => {
	var t = Array.isArray(e.value) ? e.value[e.value.length - 1] : e.value;
	if (MN(t)) return t;
}, yP = /*#__PURE__*/ (0, x.createContext)(void 0);
yP.Provider;
var bP = /*#__PURE__*/ (0, x.createContext)(void 0), xP = bP.Provider;
function SP() {
	return (0, x.useContext)(yP);
}
function CP() {
	return (0, x.useContext)(bP);
}
function wP(e) {
	var t = e.valueAccessor, n = t === void 0 ? vP : t, r = gP(e, pP), i = r.dataKey;
	r.clockWise;
	var a = r.id, o = r.textBreakAll, s = r.zIndex, c = gP(r, mP), l = SP(), u = CP(), d = l || u;
	return !d || !d.length ? null : /*#__PURE__*/ x.createElement(kj, { zIndex: s ?? Ob.label }, /*#__PURE__*/ x.createElement(Bs, { className: "recharts-label-list" }, d.map((e, t) => {
		var s = uc(i) ? n(e, t) : Pm(e.payload, i), l = uc(a) ? {} : { id: `${a}-${t}` };
		return /*#__PURE__*/ x.createElement(fP, hP({ key: `label-${t}` }, As(e), c, l, {
			fill: r.fill ?? e.fill,
			parentViewBox: e.parentViewBox,
			value: s,
			textBreakAll: o,
			viewBox: e.viewBox,
			index: t,
			zIndex: 0
		}));
	})));
}
wP.displayName = "LabelList";
function TP(e) {
	var t = e.label;
	return t ? t === !0 ? /*#__PURE__*/ x.createElement(wP, { key: "labelList-implicit" }) : /*#__PURE__*/ x.isValidElement(t) || aP(t) ? /*#__PURE__*/ x.createElement(wP, {
		key: "labelList-implicit",
		content: t
	}) : typeof t == "object" ? /*#__PURE__*/ x.createElement(wP, hP({ key: "labelList-implicit" }, t, { type: String(t.type) })) : null : null;
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/polarSelectors.js
var EP = (e) => e.graphicalItems.polarItems, DP = K([
	EP,
	gD,
	K([Yb, Xb], bD)
], CD), OP = K([K([DP], OD), Gy], jD), kP = K([
	OP,
	gD,
	DP
], ND);
K([
	OP,
	gD,
	DP
], (e, t, n) => n.length > 0 ? e.flatMap((e) => n.flatMap((n) => ({
	value: Pm(e, t.dataKey ?? n.dataKey),
	errorDomain: []
}))).filter(Boolean) : t?.dataKey == null ? e.map((e) => ({
	value: e,
	errorDomain: []
})) : e.map((e) => ({
	value: Pm(e, t.dataKey),
	errorDomain: []
})));
var AP = () => void 0, jP = K([
	gD,
	rg,
	OP,
	kP,
	Sb,
	Yb,
	K([
		gD,
		ZD,
		QD,
		AP,
		K([
			OP,
			gD,
			DP,
			eO,
			Yb,
			Jy
		], rO),
		AP,
		rg,
		Yb
	], SO)
], TO);
K([DO, K([
	gD,
	jP,
	K([
		jP,
		vD,
		DO
	], OO),
	Yb
], AO)], ox);
//#endregion
//#region node_modules/recharts/es6/state/polarAxisSlice.js
var MP = jp({
	name: "polarAxis",
	initialState: {
		radiusAxis: {},
		angleAxis: {}
	},
	reducers: {
		addRadiusAxis(e, t) {
			e.radiusAxis[t.payload.id] = Y(t.payload);
		},
		removeRadiusAxis(e, t) {
			delete e.radiusAxis[t.payload.id];
		},
		addAngleAxis(e, t) {
			e.angleAxis[t.payload.id] = Y(t.payload);
		},
		removeAngleAxis(e, t) {
			delete e.angleAxis[t.payload.id];
		}
	}
}), NP = MP.actions;
NP.addRadiusAxis, NP.removeRadiusAxis, NP.addAngleAxis, NP.removeAngleAxis;
var PP = MP.reducer;
//#endregion
//#region node_modules/recharts/es6/util/getClassNameFromUnknown.js
function FP(e) {
	return e && typeof e == "object" && "className" in e && typeof e.className == "string" ? e.className : "";
}
//#endregion
//#region node_modules/recharts/es6/state/selectors/pieSelectors.js
function IP(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function LP(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? IP(Object(n), !0).forEach(function(t) {
			RP(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : IP(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function RP(e, t, n) {
	return (t = zP(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function zP(e) {
	var t = BP(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function BP(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var VP = K([EP, (e, t) => t], (e, t) => e.filter((e) => e.type === "pie").find((e) => e.id === t)), HP = [], UP = (e, t, n) => n?.length === 0 ? HP : n, WP = K([
	Gy,
	VP,
	UP
], (e, t, n) => {
	var r = e.chartData;
	if (t != null) {
		var i = t?.data != null && t.data.length > 0 ? t.data : r;
		if ((!i || !i.length) && n != null && (i = n.map((e) => LP(LP({}, t.presentationProps), e.props))), i != null) return i;
	}
}), GP = K([
	WP,
	VP,
	UP
], (e, t, n) => {
	if (e != null && t != null) return e.map((e, r) => {
		var i, a = Pm(e, t.nameKey, t.name), o = n != null && (i = n[r]) != null && (i = i.props) != null && i.fill ? n[r].props.fill : typeof e == "object" && e && "fill" in e ? e.fill : t.fill;
		return {
			value: Km(a, t.dataKey),
			dataKey: t.dataKey,
			color: o,
			payload: e,
			type: t.legendType
		};
	});
}), KP = K([
	WP,
	VP,
	UP,
	ph
], (e, t, n, r) => {
	if (t != null && e != null) return DI({
		offset: r,
		pieSettings: t,
		displayedData: e,
		cells: n
	});
}), qP = /* @__PURE__ */ o(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.suspense_list"), d = Symbol.for("react.memo"), f = Symbol.for("react.lazy"), p = Symbol.for("react.view_transition");
	function m(e) {
		if (typeof e == "object" && e) {
			var m = e.$$typeof;
			switch (m) {
				case t: switch (e = e.type, e) {
					case r:
					case a:
					case i:
					case l:
					case u:
					case p: return e;
					default: switch (e &&= e.$$typeof, e) {
						case s:
						case c:
						case f:
						case d: return e;
						case o: return e;
						default: return m;
					}
				}
				case n: return m;
			}
		}
	}
	e.isFragment = function(e) {
		return m(e) === r;
	};
})), JP = (/* @__PURE__ */ o(((e, t) => {
	t.exports = qP();
})))(), YP = (e) => typeof e == "string" ? e : e ? e.displayName || e.name || "Component" : "", XP = null, ZP = null, QP = (e) => {
	if (e === XP && Array.isArray(ZP)) return ZP;
	var t = [];
	return x.Children.forEach(e, (e) => {
		uc(e) || ((0, JP.isFragment)(e) ? t = t.concat(QP(e.props.children)) : t.push(e));
	}), ZP = t, XP = e, t;
};
function $P(e, t) {
	var n = [], r = [];
	return r = Array.isArray(t) ? t.map((e) => YP(e)) : [YP(t)], QP(e).forEach((e) => {
		var t = Ys(e, "type.displayName") || Ys(e, "type.name");
		t && r.indexOf(t) !== -1 && n.push(e);
	}), n;
}
//#endregion
//#region node_modules/recharts/es6/util/ActiveShapeUtils.js
function eF(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function tF(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? eF(Object(n), !0).forEach(function(t) {
			nF(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : eF(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function nF(e, t, n) {
	return (t = rF(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function rF(e) {
	var t = iF(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function iF(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function aF(e, t) {
	return tF(tF({}, t), e);
}
function oF(e) {
	return /*#__PURE__*/ (0, x.isValidElement)(e) ? e.props : e;
}
function sF(e, t) {
	return /*#__PURE__*/ (0, x.cloneElement)(e, aF(oF(e), t));
}
function cF(e) {
	if ("index" in e) {
		var t = e.index;
		return typeof t == "number" || typeof t == "string" ? t : void 0;
	}
}
function lF(e) {
	return "isActive" in e && e.isActive === !0;
}
function uF(e) {
	var t = e.option, n = e.DefaultShape, r = e.shapeProps, i = e.activeClassName, a = i === void 0 ? "recharts-active-shape" : i, o = e.inActiveClassName, s = o === void 0 ? "recharts-shape" : o, c = cF(r), l = /*#__PURE__*/ (0, x.isValidElement)(t) ? sF(t, r) : t === n ? /*#__PURE__*/ x.createElement(n, r) : typeof t == "function" ? t(r, c) : typeof t == "object" ? /*#__PURE__*/ x.createElement(n, aF(t, r)) : /*#__PURE__*/ x.createElement(n, r);
	return lF(r) ? /*#__PURE__*/ x.createElement(Bs, { className: a }, l) : /*#__PURE__*/ x.createElement(Bs, { className: s }, l);
}
//#endregion
//#region node_modules/recharts/es6/context/tooltipContext.js
var dF = (e, t, n) => {
	var r = Ku();
	return (i, a) => (o) => {
		e?.(i, a, o), r(yk({
			activeIndex: String(a),
			activeDataKey: t,
			activeCoordinate: i.tooltipPosition,
			activeGraphicalItemId: n
		}));
	};
}, fF = (e) => {
	var t = Ku();
	return (n, r) => (i) => {
		e?.(n, r, i), t(bk());
	};
}, pF = (e, t, n) => {
	var r = Ku();
	return (i, a) => (o) => {
		e?.(i, a, o), r(Sk({
			activeIndex: String(a),
			activeDataKey: t,
			activeCoordinate: i.tooltipPosition,
			activeGraphicalItemId: n
		}));
	};
};
//#endregion
//#region node_modules/recharts/es6/state/SetTooltipEntrySettings.js
function mF(e) {
	var t = e.tooltipEntrySettings, n = Ku(), r = gh(), i = (0, x.useRef)(null);
	return (0, x.useLayoutEffect)(() => {
		r || (i.current === null ? n(hk(t)) : i.current !== t && n(gk({
			prev: i.current,
			next: t
		})), i.current = t);
	}, [
		t,
		n,
		r
	]), (0, x.useLayoutEffect)(() => () => {
		i.current &&= (n(_k(i.current)), null);
	}, [n]), null;
}
//#endregion
//#region node_modules/recharts/es6/state/SetLegendPayload.js
function hF(e) {
	var t = e.legendPayload, n = Ku(), r = H(rg), i = (0, x.useRef)(null);
	return (0, x.useLayoutEffect)(() => {
		(r === "centric" || r === "radial") && (i.current === null ? n(dg(t)) : i.current !== t && n(fg({
			prev: i.current,
			next: t
		})), i.current = t);
	}, [
		n,
		r,
		t
	]), (0, x.useLayoutEffect)(() => () => {
		i.current &&= (n(pg(i.current)), null);
	}, [n]), null;
}
//#endregion
//#region node_modules/recharts/es6/animation/matchBy.js
function gF(e, t) {
	return xF(e) || bF(e, t) || vF(e, t) || _F();
}
function _F() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function vF(e, t) {
	if (e) {
		if (typeof e == "string") return yF(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? yF(e, t) : void 0;
	}
}
function yF(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function bF(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function xF(e) {
	if (Array.isArray(e)) return e;
}
var SF = "index", CF = "append";
function wF(e, t) {
	var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : [], r = [];
	for (var i of n) r.push({
		status: "removed",
		prev: i
	});
	for (var a = 0; a < t.length; a++) {
		var o = e[a], s = t[a];
		o == null ? r.push({
			status: "added",
			next: s
		}) : r.push({
			status: "matched",
			prev: o,
			next: s
		});
	}
	return r;
}
function TF(e, t) {
	var n = e.length / t.length;
	return wF(t.map((t, r) => e[Math.floor(r * n)]), t);
}
function EF(e, t) {
	return wF(t.map((t, n) => e[n]), t);
}
function DF(e, t) {
	for (var n = /* @__PURE__ */ new Map(), r = 0; r < e.length; r++) {
		var i = e[r];
		if (i != null) {
			var a = t(i, r);
			a != null && !n.has(a) && n.set(a, i);
		}
	}
	return n;
}
function OF(e, t, n) {
	var r = DF(e, n), i = /* @__PURE__ */ new Set(), a = t.map((e, t) => {
		var a = n(e, t);
		if (a != null) {
			var o = r.get(a);
			if (o !== void 0) return i.add(a), o;
		}
	}), o = [];
	for (var s of r) {
		var c = gF(s, 2), l = c[0], u = c[1];
		i.has(l) || o.push(u);
	}
	return wF(a, t, o);
}
function kF(e, t, n) {
	return t == null ? null : e == null ? t.map((e) => ({
		status: "added",
		next: e
	})) : n === "index" ? TF(e, t) : n === "append" ? EF(e, t) : OF(e, t, n);
}
//#endregion
//#region node_modules/recharts/es6/animation/useAnimationStartSnapshot.js
function AF(e, t) {
	var n = (0, x.useRef)(e), r = (0, x.useRef)(t.current), i = (0, x.useRef)(!0);
	n.current !== e && (n.current = e, r.current = t.current, i.current = !1);
	var a = (0, x.useCallback)(function(e, n) {
		var a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
		if (n === 0) {
			i.current = !0;
			return;
		}
		n === 1 && (r.current = e), n > 0 && i.current && a && (t.current = e);
	}, [t]);
	return {
		startValue: r.current,
		syncStepValue: a
	};
}
//#endregion
//#region node_modules/recharts/es6/animation/AnimatedItems.js
function jF(e, t) {
	return IF(e) || FF(e, t) || NF(e, t) || MF();
}
function MF() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function NF(e, t) {
	if (e) {
		if (typeof e == "string") return PF(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? PF(e, t) : void 0;
	}
}
function PF(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function FF(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function IF(e) {
	if (Array.isArray(e)) return e;
}
function LF(e, t) {
	var n = jF((0, x.useState)(!1), 2), r = n[0], i = n[1];
	return {
		isAnimating: r,
		handleAnimationStart: (0, x.useCallback)(() => {
			typeof e == "function" && e(), i(!0);
		}, [e]),
		handleAnimationEnd: (0, x.useCallback)(() => {
			typeof t == "function" && t(), i(!1);
		}, [t])
	};
}
function RF(e) {
	var t = e.animationInput, n = e.animationIdPrefix, r = e.items, i = e.previousItemsRef, a = e.isAnimationActive, o = e.animationBegin, s = e.animationDuration, c = e.animationEasing, l = e.onAnimationStart, u = e.onAnimationEnd, d = e.animationInterpolateFn, f = e.animationMatchBy, p = e.shouldUpdatePreviousRef, m = e.children, h = e.layout, g = jv(t, n), _ = AF(g, i), v = _.startValue ?? null, y = kF(v, r, f ?? SF);
	return /*#__PURE__*/ x.createElement(Av, {
		animationId: g,
		begin: o,
		duration: s,
		isActive: a,
		easing: c,
		onAnimationEnd: u,
		onAnimationStart: l,
		key: g
	}, (e) => {
		var t = v == null, n = r == null ? r : d(y, e, h), i = p ? p(e) : e > 0;
		return _.syncStepValue(n, e, i), n == null ? null : m(n, e, t);
	});
}
function zF(e, t) {
	return WF(e) || UF(e, t) || VF(e, t) || BF();
}
function BF() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function VF(e, t) {
	if (e) {
		if (typeof e == "string") return HF(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? HF(e, t) : void 0;
	}
}
function HF(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function UF(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function WF(e) {
	if (Array.isArray(e)) return e;
}
var GF = x.useId ?? (() => zF(x.useState(() => ac("uid-")), 1)[0]);
//#endregion
//#region node_modules/recharts/es6/util/useUniqueId.js
function KF(e, t) {
	var n = GF();
	return t || (e ? `${e}-${n}` : n);
}
//#endregion
//#region node_modules/recharts/es6/context/RegisterGraphicalItemId.js
var qF = /*#__PURE__*/ (0, x.createContext)(void 0), JF = (e) => {
	var t = e.id, n = e.type, r = e.children, i = KF(`recharts-${n}`, t);
	return /*#__PURE__*/ x.createElement(qF.Provider, { value: i }, r(i));
}, YF = jp({
	name: "graphicalItems",
	initialState: {
		cartesianItems: [],
		polarItems: []
	},
	reducers: {
		addCartesianGraphicalItem: {
			reducer(e, t) {
				e.cartesianItems.push(Y(t.payload));
			},
			prepare: gp()
		},
		replaceCartesianGraphicalItem: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next, a = np(e).cartesianItems.indexOf(Y(r));
				a > -1 && (e.cartesianItems[a] = Y(i));
			},
			prepare: gp()
		},
		removeCartesianGraphicalItem: {
			reducer(e, t) {
				var n = np(e).cartesianItems.indexOf(Y(t.payload));
				n > -1 && e.cartesianItems.splice(n, 1);
			},
			prepare: gp()
		},
		addPolarGraphicalItem: {
			reducer(e, t) {
				e.polarItems.push(Y(t.payload));
			},
			prepare: gp()
		},
		removePolarGraphicalItem: {
			reducer(e, t) {
				var n = np(e).polarItems.indexOf(Y(t.payload));
				n > -1 && e.polarItems.splice(n, 1);
			},
			prepare: gp()
		},
		replacePolarGraphicalItem: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next, a = np(e).polarItems.indexOf(Y(r));
				a > -1 && (e.polarItems[a] = Y(i));
			},
			prepare: gp()
		}
	}
}), XF = YF.actions;
XF.addCartesianGraphicalItem, XF.replaceCartesianGraphicalItem, XF.removeCartesianGraphicalItem;
var ZF = XF.addPolarGraphicalItem, QF = XF.removePolarGraphicalItem, $F = XF.replacePolarGraphicalItem, eI = YF.reducer, tI = /*#__PURE__*/ (0, x.memo)((e) => {
	var t = Ku(), n = (0, x.useRef)(null);
	return (0, x.useLayoutEffect)(() => {
		n.current === null ? t(ZF(e)) : n.current !== e && t($F({
			prev: n.current,
			next: e
		})), n.current = e;
	}, [t, e]), (0, x.useLayoutEffect)(() => () => {
		n.current &&= (t(QF(n.current)), null);
	}, [t]), null;
}), nI = ["key"], rI = [
	"onMouseEnter",
	"onClick",
	"onMouseLeave"
], iI = ["id"], aI = ["id"];
function oI() {
	return oI = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, oI.apply(null, arguments);
}
function sI(e, t) {
	if (e == null) return {};
	var n, r, i = cI(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function cI(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function lI(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function uI(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? lI(Object(n), !0).forEach(function(t) {
			dI(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : lI(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function dI(e, t, n) {
	return (t = fI(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function fI(e) {
	var t = pI(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function pI(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var mI = zy;
function hI(e) {
	var t = (0, x.useMemo)(() => $P(e.children, kM), [e.children]), n = H((n) => GP(n, e.id, t));
	return n == null ? null : /*#__PURE__*/ x.createElement(hF, { legendPayload: n });
}
function gI(e) {
	if (e != null && typeof e != "boolean" && typeof e != "function") {
		if (/*#__PURE__*/ x.isValidElement(e)) {
			var t = e.props?.fill;
			return typeof t == "string" ? t : void 0;
		}
		var n = e.fill;
		return typeof n == "string" ? n : void 0;
	}
}
var _I = /*#__PURE__*/ x.memo((e) => {
	var t = e.dataKey, n = e.nameKey, r = e.sectors, i = e.stroke, a = e.strokeWidth, o = e.fill, s = e.name, c = e.hide, l = e.tooltipType, u = e.formatter, d = e.id, f = e.activeShape, p = gI(f), m = {
		dataDefinedOnItem: r.map((e) => {
			var t = e.tooltipPayload;
			return p == null || t == null ? t : t.map((e) => uI(uI({}, e), {}, {
				color: p,
				fill: p
			}));
		}),
		getPosition: (e) => r[Number(e)]?.tooltipPosition,
		settings: {
			stroke: i,
			strokeWidth: a,
			fill: o,
			dataKey: t,
			nameKey: n,
			name: Km(s, t),
			hide: c,
			type: l,
			color: o,
			unit: "",
			formatter: u,
			graphicalItemId: d
		}
	};
	return /*#__PURE__*/ x.createElement(mF, { tooltipEntrySettings: m });
}), vI = (e, t) => e > t ? "start" : e < t ? "end" : "middle", yI = (e, t, n) => oc(typeof t == "function" ? t(e) : t, n, n * .8), bI = (e, t, n) => {
	var r = t.top, i = t.left, a = t.width, o = t.height, s = vy(a, o);
	return {
		cx: i + oc(e.cx, a, a / 2),
		cy: r + oc(e.cy, o, o / 2),
		innerRadius: oc(e.innerRadius, s, 0),
		outerRadius: yI(n, e.outerRadius, s),
		maxRadius: e.maxRadius || Math.sqrt(a * a + o * o) / 2
	};
}, xI = (e, t) => ec(t - e) * Math.min(Math.abs(t - e), 360), SI = (e, t) => {
	if (/*#__PURE__*/ x.isValidElement(e)) return /*#__PURE__*/ x.cloneElement(e, t);
	if (typeof e == "function") return e(t);
	var n = Ss("recharts-pie-label-line", typeof e == "boolean" ? "" : e.className);
	t.key;
	var r = sI(t, nI);
	return /*#__PURE__*/ x.createElement(z_, oI({}, r, {
		type: "linear",
		className: n
	}));
}, CI = (e, t, n) => {
	if (/*#__PURE__*/ x.isValidElement(e)) return /*#__PURE__*/ x.cloneElement(e, t);
	var r = n;
	if (typeof e == "function" && (r = e(t), /*#__PURE__*/ x.isValidElement(r))) return r;
	var i = Ss("recharts-pie-label-text", FP(e));
	return /*#__PURE__*/ x.createElement(HN, oI({}, t, {
		alignmentBaseline: "middle",
		className: i
	}), r);
};
function wI(e) {
	var t = e.sectors, n = e.props, r = e.showLabels, i = n.label, a = n.labelLine, o = n.dataKey;
	if (!r || !i || !t) return null;
	var s = Os(n), c = ks(i), l = ks(a), u = typeof i == "object" && "offsetRadius" in i && typeof i.offsetRadius == "number" && i.offsetRadius || 20, d = t.map((e, t) => {
		var n = (e.startAngle + e.endAngle) / 2, r = _y(e.cx, e.cy, e.outerRadius + u, n), d = uI(uI(uI(uI({}, s), e), {}, { stroke: "none" }, c), {}, {
			index: t,
			textAnchor: vI(r.x, e.cx)
		}, r), f = uI(uI(uI(uI({}, s), e), {}, {
			fill: "none",
			stroke: e.fill
		}, l), {}, {
			index: t,
			points: [_y(e.cx, e.cy, e.outerRadius, n), r],
			key: "line"
		});
		return /*#__PURE__*/ x.createElement(kj, {
			zIndex: Ob.label,
			key: `label-${e.startAngle}-${e.endAngle}-${e.midAngle}-${t}`
		}, /*#__PURE__*/ x.createElement(Bs, null, a && SI(a, f), CI(i, d, Pm(e, o))));
	});
	return /*#__PURE__*/ x.createElement(Bs, { className: "recharts-pie-labels" }, d);
}
function TI(e) {
	var t = e.sectors, n = e.props, r = e.showLabels, i = n.label;
	return typeof i == "object" && i && "position" in i ? /*#__PURE__*/ x.createElement(TP, { label: i }) : /*#__PURE__*/ x.createElement(wI, {
		sectors: t,
		props: n,
		showLabels: r
	});
}
function EI(e) {
	var t = e.sectors, n = e.activeShape, r = e.inactiveShape, i = e.allOtherPieProps, a = e.shape, o = e.id, s = e.animationElapsedTime, c = e.isAnimating, l = e.isEntrance, u = H(EA), d = H(OA), f = H(kA), p = i.onMouseEnter, m = i.onClick, h = i.onMouseLeave, g = sI(i, rI), _ = dF(p, i.dataKey, o), v = fF(h), y = pF(m, i.dataKey, o);
	return t == null || t.length === 0 ? null : /*#__PURE__*/ x.createElement(x.Fragment, null, t.map((e, p) => {
		if (e?.startAngle === 0 && e?.endAngle === 0 && t.length !== 1) return null;
		var m = f == null || f === o, h = String(p) === u && (d == null || i.dataKey === d) && m, b = n && h ? n : u ? r : null, S = uI(uI({}, e), {}, {
			stroke: e.stroke,
			tabIndex: -1,
			index: p,
			isActive: h,
			animationElapsedTime: s,
			isAnimating: c,
			isEntrance: l,
			[th]: p,
			[nh]: o
		});
		return /*#__PURE__*/ x.createElement(Bs, oI({
			key: `sector-${e?.startAngle}-${e?.endAngle}-${e.midAngle}-${p}`,
			tabIndex: -1,
			className: "recharts-pie-sector"
		}, El(g, e, p), {
			onMouseEnter: _(e, p),
			onMouseLeave: v(e, p),
			onClick: y(e, p)
		}), /*#__PURE__*/ x.createElement(uF, {
			option: b ?? a,
			DefaultShape: mI,
			shapeProps: S
		}));
	}));
}
function DI(e) {
	var t = e.pieSettings, n = e.displayedData, r = e.cells, i = e.offset, a = t.cornerRadius, o = t.startAngle, s = t.endAngle, c = t.dataKey, l = t.nameKey, u = t.tooltipType, d = Math.abs(t.minAngle), f = xI(o, s), p = Math.abs(f), m = n.length <= 1 ? 0 : t.paddingAngle ?? 0, h = n.filter((e) => Pm(e, c, 0) !== 0).length, g = (p >= 360 ? h : h - 1) * m, _ = n.reduce((e, t) => {
		var n = Pm(t, c, 0);
		return e + (V(n) ? n : 0);
	}, 0), v = d > 0 && _ > 0 && n.some((e) => {
		var t = Pm(e, c, 0), n = (V(t) ? t : 0) / _;
		return t !== 0 && n * p < d;
	}) ? d : 0, y = p - h * v - g, b;
	if (_ > 0) {
		var x;
		b = n.map((e, n) => {
			var s = Pm(e, c, 0), d = Pm(e, l, n), p = bI(t, i, e), h = (V(s) ? s : 0) / _, g, b = uI(uI({}, e), r && r[n] && r[n].props), S = b != null && "fill" in b && typeof b.fill == "string" ? b.fill : t.fill;
			g = n ? x.endAngle + ec(f) * m * (s === 0 ? 0 : 1) : o;
			var C = g + ec(f) * ((s === 0 ? 0 : v) + h * y), w = (g + C) / 2, T = (p.innerRadius + p.outerRadius) / 2, E = [{
				name: d,
				value: s,
				payload: b,
				dataKey: c,
				type: u,
				color: S,
				fill: S,
				graphicalItemId: t.id
			}], D = _y(p.cx, p.cy, T, w);
			return x = uI(uI(uI(uI({}, t.presentationProps), {}, {
				percent: h,
				cornerRadius: typeof a == "string" ? parseFloat(a) : a,
				name: d,
				tooltipPayload: E,
				midAngle: w,
				middleRadius: T,
				tooltipPosition: D
			}, b), p), {}, {
				value: s,
				dataKey: c,
				startAngle: g,
				endAngle: C,
				payload: b,
				paddingAngle: s === 0 ? 0 : ec(f) * m
			}), x;
		});
	}
	return b;
}
function OI(e) {
	var t = e.showLabels, n = e.sectors, r = e.children, i = (0, x.useMemo)(() => !t || !n ? [] : n.map((e) => ({
		value: e.value,
		payload: e.payload,
		clockWise: !1,
		parentViewBox: void 0,
		viewBox: {
			cx: e.cx,
			cy: e.cy,
			innerRadius: e.innerRadius,
			outerRadius: e.outerRadius,
			startAngle: e.startAngle,
			endAngle: e.endAngle,
			clockWise: !1
		},
		fill: e.fill
	})), [n, t]);
	return /*#__PURE__*/ x.createElement(xP, { value: t ? i : void 0 }, r);
}
var kI = (e, t) => {
	if (e == null) return [];
	var n = [], r = e.find((e) => e.status !== "removed"), i = r ? r.next.startAngle : 0;
	return e.forEach((e, r) => {
		if (e.status !== "removed") {
			var a = r > 0 ? Ys(e.next, "paddingAngle", 0) : 0;
			if (e.status === "matched") {
				var o = cc(e.prev.endAngle - e.prev.startAngle, e.next.endAngle - e.next.startAngle, t), s = uI(uI({}, e.next), {}, {
					startAngle: i + a,
					endAngle: i + o + a
				});
				n.push(s), i = s.endAngle;
			} else {
				var c = cc(0, e.next.endAngle - e.next.startAngle, t), l = uI(uI({}, e.next), {}, {
					startAngle: i + a,
					endAngle: i + c + a
				});
				n.push(l), i = l.endAngle;
			}
		}
	}), n;
};
function AI(e) {
	var t = e.props, n = e.previousSectorsRef, r = e.id, i = t.sectors, a = t.activeShape, o = t.inactiveShape, s = t.animationInterpolateFn, c = LF(t.onAnimationStart, t.onAnimationEnd), l = c.isAnimating, u = c.handleAnimationStart, d = c.handleAnimationEnd, f = og();
	if (f == null) return null;
	var p = i[0];
	return /*#__PURE__*/ x.createElement(OI, {
		showLabels: !l,
		sectors: i
	}, /*#__PURE__*/ x.createElement(RF, {
		animationInput: t,
		animationIdPrefix: "recharts-pie-",
		items: i,
		previousItemsRef: n,
		isAnimationActive: t.isAnimationActive,
		animationBegin: t.animationBegin,
		animationDuration: t.animationDuration,
		animationEasing: t.animationEasing,
		onAnimationStart: u,
		onAnimationEnd: d,
		animationInterpolateFn: s,
		animationMatchBy: t.animationMatchBy,
		layout: f
	}, (e, n, i) => /*#__PURE__*/ x.createElement(Bs, null, /*#__PURE__*/ x.createElement(EI, {
		sectors: e,
		activeShape: a,
		inactiveShape: o,
		allOtherPieProps: t,
		shape: t.shape,
		id: r,
		animationElapsedTime: n,
		isAnimating: l || n < 1,
		isEntrance: i
	}))), /*#__PURE__*/ x.createElement(TI, {
		showLabels: !l,
		sectors: i,
		props: t
	}), /*#__PURE__*/ x.createElement(nP, {
		cx: p?.cx ?? 0,
		cy: p?.cy ?? 0,
		innerRadius: p?.innerRadius ?? 0,
		outerRadius: p?.outerRadius ?? 0,
		startAngle: t.startAngle,
		endAngle: t.endAngle,
		clockWise: !1
	}, t.children));
}
var jI = {
	animationBegin: 400,
	animationDuration: 1500,
	animationEasing: "ease",
	animationInterpolateFn: kI,
	animationMatchBy: CF,
	cx: "50%",
	cy: "50%",
	dataKey: "value",
	endAngle: 360,
	fill: "#808080",
	hide: !1,
	innerRadius: 0,
	isAnimationActive: "auto",
	label: !1,
	labelLine: !0,
	legendType: "rect",
	minAngle: 0,
	nameKey: "name",
	outerRadius: "80%",
	paddingAngle: 0,
	rootTabIndex: 0,
	shape: mI,
	startAngle: 0,
	stroke: "#fff",
	zIndex: Ob.area
};
function MI(e) {
	var t = e.id, n = sI(e, iI), r = e.hide, i = e.className, a = e.rootTabIndex, o = (0, x.useMemo)(() => $P(e.children, kM), [e.children]), s = H((e) => KP(e, t, o)), c = (0, x.useRef)(null), l = Ss("recharts-pie", i);
	return r || s == null ? (c.current = null, /*#__PURE__*/ x.createElement(Bs, {
		tabIndex: a,
		className: l
	})) : /*#__PURE__*/ x.createElement(kj, { zIndex: e.zIndex }, /*#__PURE__*/ x.createElement(_I, {
		dataKey: e.dataKey,
		nameKey: e.nameKey,
		sectors: s,
		stroke: e.stroke,
		strokeWidth: e.strokeWidth,
		fill: e.fill,
		name: e.name,
		hide: e.hide,
		tooltipType: e.tooltipType,
		formatter: e.formatter,
		id: t,
		activeShape: e.activeShape
	}), /*#__PURE__*/ x.createElement(Bs, {
		tabIndex: a,
		className: l
	}, /*#__PURE__*/ x.createElement(AI, {
		props: uI(uI({}, n), {}, { sectors: s }),
		previousSectorsRef: c,
		id: t
	})));
}
function NI(e) {
	var t = Ml(e, jI), n = t.id, r = sI(t, aI), i = Os(r);
	return /*#__PURE__*/ x.createElement(JF, {
		id: n,
		type: "pie"
	}, (e) => /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(tI, {
		type: "pie",
		id: e,
		data: r.data,
		dataKey: r.dataKey,
		hide: r.hide,
		angleAxisId: 0,
		radiusAxisId: 0,
		name: r.name,
		nameKey: r.nameKey,
		tooltipType: r.tooltipType,
		legendType: r.legendType,
		fill: r.fill,
		cx: r.cx,
		cy: r.cy,
		startAngle: r.startAngle,
		endAngle: r.endAngle,
		paddingAngle: r.paddingAngle,
		minAngle: r.minAngle,
		innerRadius: r.innerRadius,
		outerRadius: r.outerRadius,
		cornerRadius: r.cornerRadius,
		presentationProps: i,
		maxRadius: t.maxRadius
	}), /*#__PURE__*/ x.createElement(hI, oI({}, r, { id: e })), /*#__PURE__*/ x.createElement(MI, oI({}, r, { id: e }))));
}
var PI = NI;
PI.displayName = "Pie";
//#endregion
//#region node_modules/recharts/es6/state/cartesianAxisSlice.js
function FI(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function II(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? FI(Object(n), !0).forEach(function(t) {
			LI(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : FI(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function LI(e, t, n) {
	return (t = RI(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function RI(e) {
	var t = zI(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function zI(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var BI = jp({
	name: "cartesianAxis",
	initialState: {
		xAxis: {},
		yAxis: {},
		zAxis: {}
	},
	reducers: {
		addXAxis: {
			reducer(e, t) {
				e.xAxis[t.payload.id] = Y(t.payload);
			},
			prepare: gp()
		},
		replaceXAxis: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next;
				e.xAxis[r.id] !== void 0 && (r.id !== i.id && delete e.xAxis[r.id], e.xAxis[i.id] = Y(i));
			},
			prepare: gp()
		},
		removeXAxis: {
			reducer(e, t) {
				delete e.xAxis[t.payload.id];
			},
			prepare: gp()
		},
		addYAxis: {
			reducer(e, t) {
				e.yAxis[t.payload.id] = Y(t.payload);
			},
			prepare: gp()
		},
		replaceYAxis: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next;
				e.yAxis[r.id] !== void 0 && (r.id !== i.id && delete e.yAxis[r.id], e.yAxis[i.id] = Y(i));
			},
			prepare: gp()
		},
		removeYAxis: {
			reducer(e, t) {
				delete e.yAxis[t.payload.id];
			},
			prepare: gp()
		},
		addZAxis: {
			reducer(e, t) {
				e.zAxis[t.payload.id] = Y(t.payload);
			},
			prepare: gp()
		},
		replaceZAxis: {
			reducer(e, t) {
				var n = t.payload, r = n.prev, i = n.next;
				e.zAxis[r.id] !== void 0 && (r.id !== i.id && delete e.zAxis[r.id], e.zAxis[i.id] = Y(i));
			},
			prepare: gp()
		},
		removeZAxis: {
			reducer(e, t) {
				delete e.zAxis[t.payload.id];
			},
			prepare: gp()
		},
		updateYAxisWidth(e, t) {
			var n = t.payload, r = n.id, i = n.width, a = e.yAxis[r];
			if (a) {
				var o = a.widthHistory || [];
				if (o.length === 3 && o[0] === o[2] && i === o[1] && i !== a.width && Math.abs(i - (o[0] ?? 0)) <= 1) return;
				var s = [...o, i].slice(-3);
				e.yAxis[r] = II(II({}, a), {}, {
					width: i,
					widthHistory: s
				});
			}
		},
		updateXAxisHeight(e, t) {
			var n = t.payload, r = n.id, i = n.height, a = e.xAxis[r];
			if (a) {
				var o = a.heightHistory || [];
				if (o.length === 3 && o[0] === o[2] && i === o[1] && i !== a.height && Math.abs(i - (o[0] ?? 0)) <= 1) return;
				var s = [...o, i].slice(-3);
				e.xAxis[r] = II(II({}, a), {}, {
					height: i,
					heightHistory: s
				});
			}
		}
	}
}), VI = BI.actions;
VI.addXAxis, VI.replaceXAxis, VI.removeXAxis, VI.addYAxis, VI.replaceYAxis, VI.removeYAxis, VI.addZAxis, VI.replaceZAxis, VI.removeZAxis, VI.updateYAxisWidth, VI.updateXAxisHeight;
var HI = BI.reducer, UI = K([
	K([ph], (e) => ({
		top: e.top,
		bottom: e.bottom,
		left: e.left,
		right: e.right
	})),
	Ym,
	Xm
], (e, t, n) => {
	if (e && t != null && n != null) return {
		x: e.left,
		y: e.top,
		width: Math.max(0, t - e.left - e.right),
		height: Math.max(0, n - e.top - e.bottom)
	};
}), WI = () => H(UI), GI = (e) => {
	var t = e.chartData, n = Ku(), r = gh();
	return (0, x.useEffect)(() => r ? () => {} : (n(Qj(t)), () => {
		n(Qj(void 0));
	}), [
		t,
		n,
		r
	]), null;
}, KI = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	padding: {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	}
}, qI = jp({
	name: "brush",
	initialState: KI,
	reducers: { setBrushSettings(e, t) {
		return t.payload == null ? KI : t.payload;
	} }
});
qI.actions.setBrushSettings;
var JI = qI.reducer, YI = jp({
	name: "referenceElements",
	initialState: {
		dots: [],
		areas: [],
		lines: []
	},
	reducers: {
		addDot: (e, t) => {
			e.dots.push(t.payload);
		},
		removeDot: (e, t) => {
			var n = np(e).dots.findIndex((e) => e === t.payload);
			n !== -1 && e.dots.splice(n, 1);
		},
		addArea: (e, t) => {
			e.areas.push(t.payload);
		},
		removeArea: (e, t) => {
			var n = np(e).areas.findIndex((e) => e === t.payload);
			n !== -1 && e.areas.splice(n, 1);
		},
		addLine: (e, t) => {
			e.lines.push(Y(t.payload));
		},
		removeLine: (e, t) => {
			var n = np(e).lines.findIndex((e) => e === t.payload);
			n !== -1 && e.lines.splice(n, 1);
		}
	}
}), XI = YI.actions;
XI.addDot, XI.removeDot, XI.addArea, XI.removeArea, XI.addLine, XI.removeLine;
var ZI = YI.reducer;
//#endregion
//#region node_modules/recharts/es6/container/ClipPathProvider.js
function QI(e, t) {
	return rL(e) || nL(e, t) || eL(e, t) || $I();
}
function $I() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function eL(e, t) {
	if (e) {
		if (typeof e == "string") return tL(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? tL(e, t) : void 0;
	}
}
function tL(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function nL(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function rL(e) {
	if (Array.isArray(e)) return e;
}
var iL = /*#__PURE__*/ (0, x.createContext)(void 0), aL = (e) => {
	var t = e.children, n = QI((0, x.useState)(`${ac("recharts")}-clip`), 1)[0], r = WI();
	if (r == null) return null;
	var i = r.x, a = r.y, o = r.width, s = r.height;
	return /*#__PURE__*/ x.createElement(iL.Provider, { value: n }, /*#__PURE__*/ x.createElement("defs", null, /*#__PURE__*/ x.createElement("clipPath", { id: n }, /*#__PURE__*/ x.createElement("rect", {
		x: i,
		y: a,
		height: s,
		width: o
	}))), t);
}, oL = jp({
	name: "renderedTicks",
	initialState: {
		xAxis: {},
		yAxis: {}
	},
	reducers: {
		setRenderedTicks: (e, t) => {
			var n = t.payload, r = n.axisType, i = n.axisId, a = n.ticks;
			e[r][i] = Y(a);
		},
		removeRenderedTicks: (e, t) => {
			var n = t.payload, r = n.axisType, i = n.axisId;
			delete e[r][i];
		}
	}
}), sL = oL.actions;
sL.setRenderedTicks, sL.removeRenderedTicks;
var cL = oL.reducer, lL = jp({
	name: "errorBars",
	initialState: {},
	reducers: {
		addErrorBar: (e, t) => {
			var n = t.payload, r = n.itemId, i = n.errorBar;
			e[r] || (e[r] = []), e[r].push(i);
		},
		replaceErrorBar: (e, t) => {
			var n = t.payload, r = n.itemId, i = n.prev, a = n.next;
			e[r] && (e[r] = e[r].map((e) => e.dataKey === i.dataKey && e.direction === i.direction ? a : e));
		},
		removeErrorBar: (e, t) => {
			var n = t.payload, r = n.itemId, i = n.errorBar;
			e[r] && (e[r] = e[r].filter((e) => e.dataKey !== i.dataKey || e.direction !== i.direction));
		}
	}
}), uL = lL.actions;
uL.addErrorBar, uL.replaceErrorBar, uL.removeErrorBar;
var dL = lL.reducer, fL = K([
	(e, t) => t,
	rg,
	Jb,
	rx,
	yA,
	xA,
	$A,
	ph
], dj);
//#endregion
//#region node_modules/recharts/es6/util/getRelativeCoordinate.js
function pL(e) {
	return "getBBox" in e.currentTarget && typeof e.currentTarget.getBBox == "function";
}
function mL(e) {
	var t = e.currentTarget.getBoundingClientRect(), n, r;
	if (pL(e)) {
		var i = e.currentTarget.getBBox();
		n = i.width > 0 ? t.width / i.width : 1, r = i.height > 0 ? t.height / i.height : 1;
	} else {
		var a = e.currentTarget;
		n = a.offsetWidth > 0 ? t.width / a.offsetWidth : 1, r = a.offsetHeight > 0 ? t.height / a.offsetHeight : 1;
	}
	var o = (e, i) => ({
		relativeX: Math.round((e - t.left) / n),
		relativeY: Math.round((i - t.top) / r)
	});
	return "touches" in e ? Array.from(e.touches).map((e) => o(e.clientX, e.clientY)) : o(e.clientX, e.clientY);
}
//#endregion
//#region node_modules/recharts/es6/state/mouseEventsMiddleware.js
var hL = lp("mouseClick"), gL = _m();
gL.startListening({
	actionCreator: hL,
	effect: (e, t) => {
		var n = e.payload, r = fL(t.getState(), mL(n));
		r?.activeIndex != null && t.dispatch(wk({
			activeIndex: r.activeIndex,
			activeDataKey: void 0,
			activeCoordinate: r.activeCoordinate
		}));
	}
});
var _L = lp("mouseMove"), vL = _m(), yL = null, bL = null, xL = null;
vL.startListening({
	actionCreator: _L,
	effect: (e, t) => {
		var n = e.payload, r = t.getState().eventSettings, i = r.throttleDelay, a = r.throttledEvents, o = a === "all" || a?.includes("mousemove");
		yL !== null && (cancelAnimationFrame(yL), yL = null), bL !== null && (typeof i != "number" || !o) && (clearTimeout(bL), bL = null), xL = mL(n);
		var s = () => {
			var e = t.getState(), n = ck(e, e.tooltip.settings.shared);
			if (!xL) {
				yL = null, bL = null;
				return;
			}
			if (n === "axis") {
				var r = fL(e, xL);
				r?.activeIndex == null ? t.dispatch(xk()) : t.dispatch(Ck({
					activeIndex: r.activeIndex,
					activeDataKey: void 0,
					activeCoordinate: r.activeCoordinate
				}));
			}
			yL = null, bL = null;
		};
		if (!o) {
			s();
			return;
		}
		i === "raf" ? yL = requestAnimationFrame(s) : typeof i == "number" && bL === null && (bL = setTimeout(s, i));
	}
});
//#endregion
//#region node_modules/recharts/es6/state/reduxDevtoolsJsonStringifyReplacer.js
function SL(e, t) {
	return t instanceof HTMLElement ? `HTMLElement <${t.tagName} class="${t.className}">` : t === window ? "global.window" : e === "children" && typeof t == "object" && t ? "<<CHILDREN>>" : t;
}
//#endregion
//#region node_modules/recharts/es6/state/rootPropsSlice.js
var CL = {
	accessibilityLayer: !0,
	barCategoryGap: "10%",
	barGap: 4,
	barSize: void 0,
	className: void 0,
	maxBarSize: void 0,
	stackOffset: "none",
	syncId: void 0,
	syncMethod: "index",
	baseValue: void 0,
	reverseStackOrder: !1
}, wL = jp({
	name: "rootProps",
	initialState: CL,
	reducers: { updateOptions: (e, t) => {
		e.accessibilityLayer = t.payload.accessibilityLayer, e.barCategoryGap = t.payload.barCategoryGap, e.barGap = t.payload.barGap ?? CL.barGap, e.barSize = t.payload.barSize, e.maxBarSize = t.payload.maxBarSize, e.stackOffset = t.payload.stackOffset, e.syncId = t.payload.syncId, e.syncMethod = t.payload.syncMethod, e.className = t.payload.className, e.baseValue = t.payload.baseValue, e.reverseStackOrder = t.payload.reverseStackOrder;
	} }
}), TL = wL.reducer, EL = wL.actions.updateOptions, DL = jp({
	name: "polarOptions",
	initialState: null,
	reducers: { updatePolarOptions: (e, t) => e === null ? t.payload : (e.startAngle = t.payload.startAngle, e.endAngle = t.payload.endAngle, e.cx = t.payload.cx, e.cy = t.payload.cy, e.innerRadius = t.payload.innerRadius, e.outerRadius = t.payload.outerRadius, e) }
}), OL = DL.actions.updatePolarOptions, kL = DL.reducer, AL = lp("keyDown"), jL = lp("focus"), ML = lp("blur"), NL = _m(), PL = null, FL = null, IL = null;
NL.startListening({
	actionCreator: AL,
	effect: (e, t) => {
		IL = e.payload, PL !== null && (cancelAnimationFrame(PL), PL = null);
		var n = t.getState().eventSettings, r = n.throttleDelay, i = n.throttledEvents, a = i === "all" || i.includes("keydown");
		FL !== null && (typeof r != "number" || !a) && (clearTimeout(FL), FL = null);
		var o = () => {
			try {
				var e = t.getState();
				if (e.rootProps.accessibilityLayer === !1) return;
				var n = e.tooltip.keyboardInteraction, r = IL;
				if (r !== "ArrowRight" && r !== "ArrowLeft" && r !== "Enter") return;
				var i = zk(n, sA(e), WD(e), gA(e)), a = i == null ? -1 : Number(i), o = !Number.isFinite(a) || a < 0, s = xA(e), c = sA(e), l = ck(e, e.tooltip.settings.shared);
				if (r === "Enter") {
					if (o) return;
					var u = ij(e, l, "hover", String(n.index));
					t.dispatch(Ek({
						active: !n.active,
						activeIndex: n.index,
						activeCoordinate: u
					}));
					return;
				}
				var d = ik(e) === "left-to-right" ? 1 : -1, f = r === "ArrowRight" ? 1 : -1, p;
				if (o) {
					var m = WD(e), h = gA(e), g = f * d, _ = (e) => ({
						active: !1,
						index: String(e),
						dataKey: void 0,
						graphicalItemId: void 0,
						coordinate: void 0
					});
					if (p = -1, g > 0) {
						for (var v = 0; v < c.length; v++) if (zk(_(v), c, m, h) != null) {
							p = v;
							break;
						}
					} else for (var y = c.length - 1; y >= 0; y--) if (zk(_(y), c, m, h) != null) {
						p = y;
						break;
					}
					if (p < 0) return;
				} else {
					p = a + f * d;
					var b = s?.length || c.length;
					if (b === 0 || p >= b || p < 0) return;
				}
				var x = ij(e, l, "hover", String(p));
				t.dispatch(Ek({
					active: !0,
					activeIndex: p.toString(),
					activeCoordinate: x
				}));
			} finally {
				PL = null, FL = null;
			}
		};
		if (!a) {
			o();
			return;
		}
		r === "raf" ? PL = requestAnimationFrame(o) : typeof r == "number" && FL === null && (o(), IL = null, FL = setTimeout(() => {
			IL ? o() : (FL = null, PL = null);
		}, r));
	}
}), NL.startListening({
	actionCreator: jL,
	effect: (e, t) => {
		var n = t.getState();
		if (n.rootProps.accessibilityLayer !== !1) {
			var r = n.tooltip.keyboardInteraction;
			if (!r.active && r.index == null) {
				var i = "0", a = ij(n, ck(n, n.tooltip.settings.shared), "hover", String(i));
				t.dispatch(Ek({
					active: !0,
					activeIndex: i,
					activeCoordinate: a
				}));
			}
		}
	}
}), NL.startListening({
	actionCreator: ML,
	effect: (e, t) => {
		var n = t.getState();
		if (n.rootProps.accessibilityLayer !== !1) {
			var r = n.tooltip.keyboardInteraction;
			r.active && t.dispatch(Ek({
				active: !1,
				activeIndex: r.index,
				activeCoordinate: r.coordinate
			}));
		}
	}
});
//#endregion
//#region node_modules/recharts/es6/util/createEventProxy.js
function LL(e) {
	e.persist();
	var t = e.currentTarget;
	return new Proxy(e, { get: (e, n) => {
		if (n === "currentTarget") return t;
		var r = Reflect.get(e, n);
		return typeof r == "function" ? r.bind(e) : r;
	} });
}
//#endregion
//#region node_modules/recharts/es6/state/externalEventsMiddleware.js
var RL = lp("externalEvent"), zL = _m(), BL = /* @__PURE__ */ new Map(), VL = /* @__PURE__ */ new Map(), HL = /* @__PURE__ */ new Map();
zL.startListening({
	actionCreator: RL,
	effect: (e, t) => {
		var n = e.payload, r = n.handler, i = n.reactEvent;
		if (r != null) {
			var a = i.type, o = LL(i);
			HL.set(a, {
				handler: r,
				reactEvent: o
			});
			var s = BL.get(a);
			s !== void 0 && (cancelAnimationFrame(s), BL.delete(a));
			var c = t.getState().eventSettings, l = c.throttleDelay, u = c.throttledEvents, d = u === "all" || u?.includes(a), f = VL.get(a);
			f !== void 0 && (typeof l != "number" || !d) && (clearTimeout(f), VL.delete(a));
			var p = () => {
				var e = HL.get(a);
				try {
					if (!e) return;
					var n = e.handler, r = e.reactEvent, i = t.getState(), o = {
						activeCoordinate: jA(i),
						activeDataKey: OA(i),
						activeIndex: EA(i),
						activeLabel: DA(i),
						activeTooltipIndex: EA(i),
						isTooltipActive: MA(i)
					};
					n && n(o, r);
				} finally {
					BL.delete(a), VL.delete(a), HL.delete(a);
				}
			};
			if (!d) {
				p();
				return;
			}
			if (l === "raf") {
				var m = requestAnimationFrame(p);
				BL.set(a, m);
			} else if (typeof l == "number") {
				if (!VL.has(a)) {
					p();
					var h = setTimeout(p, l);
					VL.set(a, h);
				}
			} else p();
		}
	}
});
var UL = K([
	K([Uk], (e) => e.tooltipItemPayloads),
	(e, t) => t,
	(e, t, n) => n
], (e, t, n) => {
	if (t != null) {
		var r = e.find((e) => e.settings.graphicalItemId === n);
		if (r != null) {
			var i = r.getPosition;
			if (i != null) return i(t);
		}
	}
}), WL = lp("touchMove"), GL = _m(), KL = null, qL = null, JL = null, YL = null;
GL.startListening({
	actionCreator: WL,
	effect: (e, t) => {
		var n = e.payload;
		if (n.touches != null && n.touches.length !== 0) {
			YL = LL(n);
			var r = t.getState().eventSettings, i = r.throttleDelay, a = r.throttledEvents, o = a === "all" || a.includes("touchmove");
			KL !== null && (cancelAnimationFrame(KL), KL = null), qL !== null && (typeof i != "number" || !o) && (clearTimeout(qL), qL = null), JL = Array.from(n.touches).map((e) => mL({
				clientX: e.clientX,
				clientY: e.clientY,
				currentTarget: n.currentTarget
			}));
			var s = () => {
				if (YL != null) {
					var e = t.getState(), n = ck(e, e.tooltip.settings.shared);
					if (n === "axis") {
						var r = JL?.[0];
						if (r == null) {
							KL = null, qL = null;
							return;
						}
						var i = fL(e, r);
						i?.activeIndex != null && t.dispatch(Ck({
							activeIndex: i.activeIndex,
							activeDataKey: void 0,
							activeCoordinate: i.activeCoordinate
						}));
					} else if (n === "item") {
						var a = YL.touches[0];
						if (document.elementFromPoint == null || a == null) return;
						var o = document.elementFromPoint(a.clientX, a.clientY);
						if (!o || !o.getAttribute) return;
						var s = o.getAttribute(th), c = o.getAttribute("data-recharts-item-id") ?? void 0, l = rA(e).find((e) => e.id === c);
						if (s == null || l == null || c == null) return;
						var u = l.dataKey, d = UL(e, s, c);
						t.dispatch(yk({
							activeDataKey: u,
							activeIndex: s,
							activeCoordinate: d,
							activeGraphicalItemId: c
						}));
					}
					KL = null, qL = null;
				}
			};
			if (!o) {
				s();
				return;
			}
			i === "raf" ? KL = requestAnimationFrame(s) : typeof i == "number" && qL === null && (s(), YL = null, qL = setTimeout(() => {
				YL ? s() : (qL = null, KL = null);
			}, i));
		}
	}
});
//#endregion
//#region node_modules/recharts/es6/state/eventSettingsSlice.js
var XL = {
	throttleDelay: "raf",
	throttledEvents: [
		"mousemove",
		"touchmove",
		"pointermove",
		"scroll",
		"wheel"
	]
}, ZL = jp({
	name: "eventSettings",
	initialState: XL,
	reducers: { setEventSettings: (e, t) => {
		t.payload.throttleDelay != null && (e.throttleDelay = t.payload.throttleDelay), t.payload.throttledEvents != null && (e.throttledEvents = Y(t.payload.throttledEvents));
	} }
}), QL = ZL.actions.setEventSettings, $L = ZL.reducer, eR = Pd({
	brush: JI,
	cartesianAxis: HI,
	chartData: eM,
	errorBars: dL,
	eventSettings: $L,
	graphicalItems: eI,
	layout: Tm,
	legend: mg,
	options: qj,
	polarAxis: PP,
	polarOptions: kL,
	referenceElements: ZI,
	renderedTicks: cL,
	rootProps: TL,
	tooltip: Dk,
	zIndex: Oj
}), tR = function(e) {
	var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "Chart";
	return xp({
		reducer: eR,
		preloadedState: e,
		middleware: (e) => e({
			serializableCheck: !1,
			immutableCheck: ![
				"commonjs",
				"es6",
				"production"
			].includes("es6")
		}).concat([
			gL.middleware,
			vL.middleware,
			NL.middleware,
			zL.middleware,
			GL.middleware
		]),
		enhancers: (e) => {
			var t = e;
			return typeof e == "function" && (t = e()), t.concat(yp({ type: "raf" }));
		},
		devTools: n_.devToolsEnabled && {
			serialize: { replacer: SL },
			name: `recharts-${t}`
		}
	});
};
//#endregion
//#region node_modules/recharts/es6/state/RechartsStoreProvider.js
function nR(e) {
	var t = e.preloadedState, n = e.children, r = e.reduxStoreName, i = gh(), a = (0, x.useRef)(null);
	if (i) return n;
	a.current ??= tR(t, r);
	var o = Uu;
	return /*#__PURE__*/ x.createElement(Ag, {
		context: o,
		store: a.current
	}, n);
}
//#endregion
//#region node_modules/recharts/es6/state/ReportMainChartProps.js
function rR(e) {
	var t = e.layout, n = e.margin, r = Ku(), i = gh();
	return (0, x.useEffect)(() => {
		i || (r(Sm(t)), r(xm(n)));
	}, [
		r,
		i,
		t,
		n
	]), null;
}
var iR = /*#__PURE__*/ (0, x.memo)(rR, Ng);
//#endregion
//#region node_modules/recharts/es6/state/ReportChartProps.js
function aR(e) {
	var t = Ku();
	return (0, x.useEffect)(() => {
		t(EL(e));
	}, [t, e]), null;
}
var oR = /*#__PURE__*/ (0, x.memo)((e) => {
	var t = Ku();
	return (0, x.useEffect)(() => {
		t(QL(e));
	}, [t, e]), null;
}, Ng);
//#endregion
//#region node_modules/recharts/es6/zIndex/ZIndexPortal.js
function sR(e) {
	var t = e.zIndex, n = e.isPanorama, r = (0, x.useRef)(null), i = Ku();
	return (0, x.useLayoutEffect)(() => (r.current && i(Ej({
		zIndex: t,
		element: r.current,
		isPanorama: n
	})), () => {
		i(Dj({
			zIndex: t,
			isPanorama: n
		}));
	}), [
		i,
		t,
		n
	]), /*#__PURE__*/ x.createElement("g", {
		tabIndex: -1,
		ref: r,
		className: `recharts-zIndex-layer_${t}`
	});
}
function cR(e) {
	var t = e.children, n = e.isPanorama, r = H(pj);
	if (!r || r.length === 0) return t;
	var i = r.filter((e) => e < 0), a = r.filter((e) => e > 0);
	return /*#__PURE__*/ x.createElement(x.Fragment, null, i.map((e) => /*#__PURE__*/ x.createElement(sR, {
		key: e,
		zIndex: e,
		isPanorama: n
	})), t, a.map((e) => /*#__PURE__*/ x.createElement(sR, {
		key: e,
		zIndex: e,
		isPanorama: n
	})));
}
//#endregion
//#region node_modules/recharts/es6/container/RootSurface.js
var lR = ["children"];
function uR(e, t) {
	if (e == null) return {};
	var n, r, i = dR(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function dR(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function fR() {
	return fR = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, fR.apply(null, arguments);
}
var pR = {
	width: "100%",
	height: "100%",
	display: "block"
}, mR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = tg(), r = ng(), i = w_();
	if (!Om(n) || !Om(r)) return null;
	var a = e.children, o = e.otherAttributes, s = e.title, c = e.desc, l, u;
	return o != null && (l = typeof o.tabIndex == "number" ? o.tabIndex : i ? 0 : void 0, u = typeof o.role == "string" ? o.role : i ? "application" : void 0), /*#__PURE__*/ x.createElement(Fs, fR({}, o, {
		title: s,
		desc: c,
		role: u,
		tabIndex: l,
		width: n,
		height: r,
		style: pR,
		ref: t
	}), a);
}), hR = (e) => {
	var t = e.children, n = H(vh);
	if (!n) return null;
	var r = n.width, i = n.height, a = n.y, o = n.x;
	return /*#__PURE__*/ x.createElement(Fs, {
		width: r,
		height: i,
		x: o,
		y: a
	}, t);
}, gR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.children, r = uR(e, lR);
	return gh() ? /*#__PURE__*/ x.createElement(hR, null, /*#__PURE__*/ x.createElement(cR, { isPanorama: !0 }, n)) : /*#__PURE__*/ x.createElement(mR, fR({ ref: t }, r), /*#__PURE__*/ x.createElement(cR, { isPanorama: !1 }, n));
});
//#endregion
//#region node_modules/recharts/es6/util/useReportScale.js
function _R(e, t) {
	return SR(e) || xR(e, t) || yR(e, t) || vR();
}
function vR() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function yR(e, t) {
	if (e) {
		if (typeof e == "string") return bR(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? bR(e, t) : void 0;
	}
}
function bR(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function xR(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function SR(e) {
	if (Array.isArray(e)) return e;
}
function CR() {
	var e = Ku(), t = _R((0, x.useState)(null), 2), n = t[0], r = t[1], i = H(Zm);
	return (0, x.useEffect)(() => {
		if (n != null) {
			var t = n.getBoundingClientRect().width / n.offsetWidth;
			Dm(t) && t !== i && e(wm(t));
		}
	}, [
		n,
		e,
		i
	]), r;
}
//#endregion
//#region node_modules/recharts/es6/chart/RechartsWrapper.js
function wR(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function TR(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? wR(Object(n), !0).forEach(function(t) {
			ER(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : wR(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function ER(e, t, n) {
	return (t = DR(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function DR(e) {
	var t = OR(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function OR(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
function kR() {
	return kR = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, kR.apply(null, arguments);
}
function AR(e, t) {
	return FR(e) || PR(e, t) || MR(e, t) || jR();
}
function jR() {
	throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function MR(e, t) {
	if (e) {
		if (typeof e == "string") return NR(e, t);
		var n = {}.toString.call(e).slice(8, -1);
		return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? NR(e, t) : void 0;
	}
}
function NR(e, t) {
	(t == null || t > e.length) && (t = e.length);
	for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
	return r;
}
function PR(e, t) {
	var n = e == null ? null : typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
	if (n != null) {
		var r, i, a, o, s = [], c = !0, l = !1;
		try {
			if (a = (n = n.call(e)).next, t === 0) {
				if (Object(n) !== n) return;
				c = !1;
			} else for (; !(c = (r = a.call(n)).done) && (s.push(r.value), s.length !== t); c = !0);
		} catch (e) {
			l = !0, i = e;
		} finally {
			try {
				if (!c && n.return != null && (o = n.return(), Object(o) !== o)) return;
			} finally {
				if (l) throw i;
			}
		}
		return s;
	}
}
function FR(e) {
	if (Array.isArray(e)) return e;
}
var IR = () => (dM(), null);
function LR(e) {
	if (typeof e == "number") return e;
	if (typeof e == "string") {
		var t = parseFloat(e);
		if (!Number.isNaN(t)) return t;
	}
	return 0;
}
var RR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = (0, x.useRef)(null), r = AR((0, x.useState)({
		containerWidth: LR(e.style?.width),
		containerHeight: LR(e.style?.height)
	}), 2), i = r[0], a = r[1], o = (0, x.useCallback)((e, t) => {
		a((n) => {
			var r = Math.round(e), i = Math.round(t);
			return n.containerWidth === r && n.containerHeight === i ? n : {
				containerWidth: r,
				containerHeight: i
			};
		});
	}, []), s = (0, x.useCallback)((e) => {
		if (typeof t == "function" && t(e), n.current != null && (n.current.disconnect(), n.current = null), e != null && typeof ResizeObserver < "u") {
			var r = e.getBoundingClientRect(), i = r.width, a = r.height;
			o(i, a);
			var s = new ResizeObserver((e) => {
				var t = e[0];
				if (t != null) {
					var n = t.contentRect, r = n.width, i = n.height;
					o(r, i);
				}
			});
			s.observe(e), n.current = s;
		}
	}, [t, o]);
	return (0, x.useEffect)(() => () => {
		n.current?.disconnect();
	}, [o]), /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(cg, {
		width: i.containerWidth,
		height: i.containerHeight
	}), /*#__PURE__*/ x.createElement("div", kR({ ref: s }, e)));
}), zR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.width, r = e.height, i = AR((0, x.useState)({
		containerWidth: LR(n),
		containerHeight: LR(r)
	}), 2), a = i[0], o = i[1], s = (0, x.useCallback)((e, t) => {
		o((n) => {
			var r = Math.round(e), i = Math.round(t);
			return n.containerWidth === r && n.containerHeight === i ? n : {
				containerWidth: r,
				containerHeight: i
			};
		});
	}, []), c = (0, x.useCallback)((e) => {
		if (typeof t == "function" && t(e), e != null) {
			var n = e.getBoundingClientRect(), r = n.width, i = n.height;
			s(r, i);
		}
	}, [t, s]);
	return /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(cg, {
		width: a.containerWidth,
		height: a.containerHeight
	}), /*#__PURE__*/ x.createElement("div", kR({ ref: c }, e)));
}), BR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.width, r = e.height;
	return /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(cg, {
		width: n,
		height: r
	}), /*#__PURE__*/ x.createElement("div", kR({ ref: t }, e)));
}), VR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.width, r = e.height;
	return typeof n == "string" || typeof r == "string" ? /*#__PURE__*/ x.createElement(zR, kR({}, e, { ref: t })) : typeof n == "number" && typeof r == "number" ? /*#__PURE__*/ x.createElement(BR, kR({}, e, {
		width: n,
		height: r,
		ref: t
	})) : /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(cg, {
		width: n,
		height: r
	}), /*#__PURE__*/ x.createElement("div", kR({ ref: t }, e)));
});
function HR(e) {
	return e ? RR : VR;
}
var UR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.children, r = e.className, i = e.height, a = e.onClick, o = e.onContextMenu, s = e.onDoubleClick, c = e.onMouseDown, l = e.onMouseEnter, u = e.onMouseLeave, d = e.onMouseMove, f = e.onMouseUp, p = e.onTouchEnd, m = e.onTouchMove, h = e.onTouchStart, g = e.style, _ = e.width, v = e.responsive, y = e.dispatchTouchEvents, b = y === void 0 || y, S = (0, x.useRef)(null), C = Ku(), w = AR((0, x.useState)(null), 2), T = w[0], E = w[1], D = AR((0, x.useState)(null), 2), O = D[0], k = D[1], A = CR(), j = Yh(), M = j?.width > 0 ? j.width : _, N = j?.height > 0 ? j.height : i, ee = (0, x.useCallback)((e) => {
		A(e), typeof t == "function" && t(e), E(e), k(e), e != null && (S.current = e);
	}, [
		A,
		t,
		E,
		k
	]), P = (0, x.useCallback)((e) => {
		C(hL(e)), C(RL({
			handler: a,
			reactEvent: e
		}));
	}, [C, a]), F = (0, x.useCallback)((e) => {
		C(_L(e)), C(RL({
			handler: l,
			reactEvent: e
		}));
	}, [C, l]), te = (0, x.useCallback)((e) => {
		C(xk()), C(RL({
			handler: u,
			reactEvent: e
		}));
	}, [C, u]), ne = (0, x.useCallback)((e) => {
		C(_L(e)), C(RL({
			handler: d,
			reactEvent: e
		}));
	}, [C, d]), re = (0, x.useCallback)(() => {
		C(jL());
	}, [C]), ie = (0, x.useCallback)(() => {
		C(ML());
	}, [C]), ae = (0, x.useCallback)((e) => {
		C(AL(e.key));
	}, [C]), oe = (0, x.useCallback)((e) => {
		C(RL({
			handler: o,
			reactEvent: e
		}));
	}, [C, o]), se = (0, x.useCallback)((e) => {
		C(RL({
			handler: s,
			reactEvent: e
		}));
	}, [C, s]), ce = (0, x.useCallback)((e) => {
		C(RL({
			handler: c,
			reactEvent: e
		}));
	}, [C, c]), le = (0, x.useCallback)((e) => {
		C(RL({
			handler: f,
			reactEvent: e
		}));
	}, [C, f]), ue = (0, x.useCallback)((e) => {
		C(RL({
			handler: h,
			reactEvent: e
		}));
	}, [C, h]), de = (0, x.useCallback)((e) => {
		b && C(WL(e)), C(RL({
			handler: m,
			reactEvent: e
		}));
	}, [
		C,
		b,
		m
	]), fe = (0, x.useCallback)((e) => {
		C(RL({
			handler: p,
			reactEvent: e
		}));
	}, [C, p]), pe = HR(v);
	return /*#__PURE__*/ x.createElement(zj.Provider, { value: T }, /*#__PURE__*/ x.createElement(Cc.Provider, { value: O }, /*#__PURE__*/ x.createElement(pe, {
		width: M ?? g?.width,
		height: N ?? g?.height,
		className: Ss("recharts-wrapper", r),
		style: TR({
			position: "relative",
			cursor: "default",
			width: M,
			height: N
		}, g),
		onClick: P,
		onContextMenu: oe,
		onDoubleClick: se,
		onFocus: re,
		onBlur: ie,
		onKeyDown: ae,
		onMouseDown: ce,
		onMouseEnter: F,
		onMouseLeave: te,
		onMouseMove: ne,
		onMouseUp: le,
		onTouchEnd: fe,
		onTouchMove: de,
		onTouchStart: ue,
		ref: ee
	}, /*#__PURE__*/ x.createElement(IR, null), n)));
}), WR = [
	"width",
	"height",
	"responsive",
	"children",
	"className",
	"style",
	"compact",
	"title",
	"desc"
];
function GR(e, t) {
	if (e == null) return {};
	var n, r, i = KR(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function KR(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
var qR = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = e.width, r = e.height, i = e.responsive, a = e.children, o = e.className, s = e.style, c = e.compact, l = e.title, u = e.desc, d = Os(GR(e, WR));
	return c ? /*#__PURE__*/ x.createElement(x.Fragment, null, /*#__PURE__*/ x.createElement(cg, {
		width: n,
		height: r
	}), /*#__PURE__*/ x.createElement(gR, {
		otherAttributes: d,
		title: l,
		desc: u
	}, a)) : /*#__PURE__*/ x.createElement(UR, {
		className: o,
		style: s,
		width: n,
		height: r,
		responsive: i ?? !1,
		onClick: e.onClick,
		onMouseLeave: e.onMouseLeave,
		onMouseEnter: e.onMouseEnter,
		onMouseMove: e.onMouseMove,
		onMouseDown: e.onMouseDown,
		onMouseUp: e.onMouseUp,
		onContextMenu: e.onContextMenu,
		onDoubleClick: e.onDoubleClick,
		onTouchStart: e.onTouchStart,
		onTouchMove: e.onTouchMove,
		onTouchEnd: e.onTouchEnd
	}, /*#__PURE__*/ x.createElement(gR, {
		otherAttributes: d,
		title: l,
		desc: u,
		ref: t
	}, /*#__PURE__*/ x.createElement(aL, null, a)));
});
//#endregion
//#region node_modules/recharts/es6/state/ReportPolarOptions.js
function JR(e) {
	var t = Ku();
	return (0, x.useEffect)(() => {
		t(OL(e));
	}, [t, e]), null;
}
//#endregion
//#region node_modules/recharts/es6/chart/PolarChart.js
var YR = ["layout"];
function XR() {
	return XR = Object.assign ? Object.assign.bind() : function(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
		}
		return e;
	}, XR.apply(null, arguments);
}
function ZR(e, t) {
	if (e == null) return {};
	var n, r, i = QR(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.indexOf(n) === -1 && {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
function QR(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.indexOf(r) !== -1) continue;
		n[r] = e[r];
	}
	return n;
}
function $R(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function ez(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? $R(Object(n), !0).forEach(function(t) {
			tz(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : $R(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function tz(e, t, n) {
	return (t = nz(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function nz(e) {
	var t = rz(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function rz(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var iz = ez({
	accessibilityLayer: !0,
	stackOffset: "none",
	barCategoryGap: "10%",
	barGap: 4,
	margin: {
		top: 5,
		right: 5,
		bottom: 5,
		left: 5
	},
	reverseStackOrder: !1,
	syncMethod: "index",
	layout: "radial",
	responsive: !1,
	cx: "50%",
	cy: "50%",
	innerRadius: 0,
	outerRadius: "80%"
}, XL), az = /*#__PURE__*/ (0, x.forwardRef)(function(e, t) {
	var n = Ml(e.categoricalChartProps, iz), r = n.layout, i = ZR(n, YR), a = e.chartName, o = {
		chartName: a,
		defaultTooltipEventType: e.defaultTooltipEventType,
		validateTooltipEventTypes: e.validateTooltipEventTypes,
		tooltipPayloadSearcher: e.tooltipPayloadSearcher,
		eventEmitter: void 0
	};
	return /*#__PURE__*/ x.createElement(nR, {
		preloadedState: { options: o },
		reduxStoreName: n.id ?? a
	}, /*#__PURE__*/ x.createElement(GI, { chartData: n.data }), /*#__PURE__*/ x.createElement(iR, {
		layout: r,
		margin: n.margin
	}), /*#__PURE__*/ x.createElement(oR, {
		throttleDelay: n.throttleDelay,
		throttledEvents: n.throttledEvents
	}), /*#__PURE__*/ x.createElement(aR, {
		baseValue: void 0,
		accessibilityLayer: n.accessibilityLayer,
		barCategoryGap: n.barCategoryGap,
		maxBarSize: n.maxBarSize,
		stackOffset: n.stackOffset,
		barGap: n.barGap,
		barSize: n.barSize,
		syncId: n.syncId,
		syncMethod: n.syncMethod,
		className: n.className,
		reverseStackOrder: n.reverseStackOrder
	}), /*#__PURE__*/ x.createElement(JR, {
		cx: n.cx,
		cy: n.cy,
		startAngle: n.startAngle,
		endAngle: n.endAngle,
		innerRadius: n.innerRadius,
		outerRadius: n.outerRadius
	}), /*#__PURE__*/ x.createElement(qR, XR({}, i, { ref: t })));
});
//#endregion
//#region node_modules/recharts/es6/chart/PieChart.js
function oz(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function sz(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? oz(Object(n), !0).forEach(function(t) {
			cz(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : oz(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
function cz(e, t, n) {
	return (t = lz(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function lz(e) {
	var t = uz(e, "string");
	return typeof t == "symbol" ? t : t + "";
}
function uz(e, t) {
	if (typeof e != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (typeof r != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
var dz = ["item"], fz = sz(sz({}, iz), {}, {
	layout: "centric",
	startAngle: 0,
	endAngle: 360
}), pz = /*#__PURE__*/ (0, x.forwardRef)((e, t) => {
	var n = Ml(e, fz);
	return /*#__PURE__*/ x.createElement(az, {
		chartName: "PieChart",
		defaultTooltipEventType: "item",
		validateTooltipEventTypes: dz,
		tooltipPayloadSearcher: Gj,
		categoricalChartProps: n,
		ref: t
	});
}), mz = (e, t) => {
	let n = Array(e.length + t.length);
	for (let t = 0; t < e.length; t++) n[t] = e[t];
	for (let r = 0; r < t.length; r++) n[e.length + r] = t[r];
	return n;
}, hz = (e, t) => ({
	classGroupId: e,
	validator: t
}), gz = (e = /* @__PURE__ */ new Map(), t = null, n) => ({
	nextPart: e,
	validators: t,
	classGroupId: n
}), _z = "-", vz = [], yz = "arbitrary..", bz = (e) => {
	let t = Cz(e), { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e;
	return {
		getClassGroupId: (e) => {
			if (e.startsWith("[") && e.endsWith("]")) return Sz(e);
			let n = e.split(_z);
			return xz(n, +(n[0] === "" && n.length > 1), t);
		},
		getConflictingClassGroupIds: (e, t) => {
			if (t) {
				let t = r[e], i = n[e];
				return t ? i ? mz(i, t) : t : i || vz;
			}
			return n[e] || vz;
		}
	};
}, xz = (e, t, n) => {
	if (e.length - t === 0) return n.classGroupId;
	let r = e[t], i = n.nextPart.get(r);
	if (i) {
		let n = xz(e, t + 1, i);
		if (n) return n;
	}
	let a = n.validators;
	if (a === null) return;
	let o = t === 0 ? e.join(_z) : e.slice(t).join(_z), s = a.length;
	for (let e = 0; e < s; e++) {
		let t = a[e];
		if (t.validator(o)) return t.classGroupId;
	}
}, Sz = (e) => e.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
	let t = e.slice(1, -1), n = t.indexOf(":"), r = t.slice(0, n);
	return r ? yz + r : void 0;
})(), Cz = (e) => {
	let { theme: t, classGroups: n } = e;
	return wz(n, t);
}, wz = (e, t) => {
	let n = gz();
	for (let r in e) {
		let i = e[r];
		Tz(i, n, r, t);
	}
	return n;
}, Tz = (e, t, n, r) => {
	let i = e.length;
	for (let a = 0; a < i; a++) {
		let i = e[a];
		Ez(i, t, n, r);
	}
}, Ez = (e, t, n, r) => {
	if (typeof e == "string") {
		Dz(e, t, n);
		return;
	}
	if (typeof e == "function") {
		Oz(e, t, n, r);
		return;
	}
	kz(e, t, n, r);
}, Dz = (e, t, n) => {
	let r = e === "" ? t : Az(t, e);
	r.classGroupId = n;
}, Oz = (e, t, n, r) => {
	if (jz(e)) {
		Tz(e(r), t, n, r);
		return;
	}
	t.validators === null && (t.validators = []), t.validators.push(hz(n, e));
}, kz = (e, t, n, r) => {
	let i = Object.entries(e), a = i.length;
	for (let e = 0; e < a; e++) {
		let [a, o] = i[e];
		Tz(o, Az(t, a), n, r);
	}
}, Az = (e, t) => {
	let n = e, r = t.split(_z), i = r.length;
	for (let e = 0; e < i; e++) {
		let t = r[e], i = n.nextPart.get(t);
		i || (i = gz(), n.nextPart.set(t, i)), n = i;
	}
	return n;
}, jz = (e) => "isThemeGetter" in e && e.isThemeGetter === !0, Mz = (e) => {
	if (e < 1) return {
		get: () => void 0,
		set: () => {}
	};
	let t = 0, n = Object.create(null), r = Object.create(null), i = (i, a) => {
		n[i] = a, t++, t > e && (t = 0, r = n, n = Object.create(null));
	};
	return {
		get(e) {
			let t = n[e];
			if (t !== void 0) return t;
			if ((t = r[e]) !== void 0) return i(e, t), t;
		},
		set(e, t) {
			e in n ? n[e] = t : i(e, t);
		}
	};
}, Nz = "!", Pz = ":", Fz = [], Iz = (e, t, n, r, i) => ({
	modifiers: e,
	hasImportantModifier: t,
	baseClassName: n,
	maybePostfixModifierPosition: r,
	isExternal: i
}), Lz = (e) => {
	let { prefix: t, experimentalParseClassName: n } = e, r = (e) => {
		let t = [], n = 0, r = 0, i = 0, a, o = e.length;
		for (let s = 0; s < o; s++) {
			let o = e[s];
			if (n === 0 && r === 0) {
				if (o === Pz) {
					t.push(e.slice(i, s)), i = s + 1;
					continue;
				}
				if (o === "/") {
					a = s;
					continue;
				}
			}
			o === "[" ? n++ : o === "]" ? n-- : o === "(" ? r++ : o === ")" && r--;
		}
		let s = t.length === 0 ? e : e.slice(i), c = s, l = !1;
		s.endsWith(Nz) ? (c = s.slice(0, -1), l = !0) : s.startsWith(Nz) && (c = s.slice(1), l = !0);
		let u = a && a > i ? a - i : void 0;
		return Iz(t, l, c, u);
	};
	if (t) {
		let e = t + Pz, n = r;
		r = (t) => t.startsWith(e) ? n(t.slice(e.length)) : Iz(Fz, !1, t, void 0, !0);
	}
	if (n) {
		let e = r;
		r = (t) => n({
			className: t,
			parseClassName: e
		});
	}
	return r;
}, Rz = (e) => {
	let t = /* @__PURE__ */ new Map();
	return e.orderSensitiveModifiers.forEach((e, n) => {
		t.set(e, 1e6 + n);
	}), (e) => {
		let n = [], r = [];
		for (let i = 0; i < e.length; i++) {
			let a = e[i], o = a[0] === "[", s = t.has(a);
			o || s ? (r.length > 0 && (r.sort(), n.push(...r), r = []), n.push(a)) : r.push(a);
		}
		return r.length > 0 && (r.sort(), n.push(...r)), n;
	};
}, zz = (e) => ({
	cache: Mz(e.cacheSize),
	parseClassName: Lz(e),
	sortModifiers: Rz(e),
	postfixLookupClassGroupIds: Bz(e),
	...bz(e)
}), Bz = (e) => {
	let t = Object.create(null), n = e.postfixLookupClassGroups;
	if (n) for (let e = 0; e < n.length; e++) t[n[e]] = !0;
	return t;
}, Vz = /\s+/, Hz = (e, t) => {
	let { parseClassName: n, getClassGroupId: r, getConflictingClassGroupIds: i, sortModifiers: a, postfixLookupClassGroupIds: o } = t, s = [], c = e.trim().split(Vz), l = "";
	for (let e = c.length - 1; e >= 0; --e) {
		let t = c[e], { isExternal: u, modifiers: d, hasImportantModifier: f, baseClassName: p, maybePostfixModifierPosition: m } = n(t);
		if (u) {
			l = t + (l.length > 0 ? " " + l : l);
			continue;
		}
		let h = !!m, g;
		if (h) {
			g = r(p.substring(0, m));
			let e = g && o[g] ? r(p) : void 0;
			e && e !== g && (g = e, h = !1);
		} else g = r(p);
		if (!g) {
			if (!h) {
				l = t + (l.length > 0 ? " " + l : l);
				continue;
			}
			if (g = r(p), !g) {
				l = t + (l.length > 0 ? " " + l : l);
				continue;
			}
			h = !1;
		}
		let _ = d.length === 0 ? "" : d.length === 1 ? d[0] : a(d).join(":"), v = f ? _ + Nz : _, y = v + g;
		if (s.indexOf(y) > -1) continue;
		s.push(y);
		let b = i(g, h);
		for (let e = 0; e < b.length; ++e) {
			let t = b[e];
			s.push(v + t);
		}
		l = t + (l.length > 0 ? " " + l : l);
	}
	return l;
}, Uz = (...e) => {
	let t = 0, n, r, i = "";
	for (; t < e.length;) (n = e[t++]) && (r = Wz(n)) && (i && (i += " "), i += r);
	return i;
}, Wz = (e) => {
	if (typeof e == "string") return e;
	let t, n = "";
	for (let r = 0; r < e.length; r++) e[r] && (t = Wz(e[r])) && (n && (n += " "), n += t);
	return n;
}, Gz = (e, ...t) => {
	let n, r, i, a, o = (o) => (n = zz(t.reduce((e, t) => t(e), e())), r = n.cache.get, i = n.cache.set, a = s, s(o)), s = (e) => {
		let t = r(e);
		if (t) return t;
		let a = Hz(e, n);
		return i(e, a), a;
	};
	return a = o, (...e) => a(Uz(...e));
}, Kz = [], qz = (e) => {
	let t = (t) => t[e] || Kz;
	return t.isThemeGetter = !0, t.themeKey = e, t;
}, Jz = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, Yz = /^\((?:(\w[\w-]*):)?(.+)\)$/i, Xz = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/, Zz = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, Qz = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, $z = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix|color|light-dark)\(.+\)$/, eB = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, tB = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, nB = (e) => Xz.test(e), Z = (e) => !!e && !Number.isNaN(Number(e)), rB = (e) => !!e && Number.isInteger(Number(e)), iB = (e) => e.endsWith("%") && Z(e.slice(0, -1)), aB = (e) => Zz.test(e), oB = () => !0, sB = (e) => Qz.test(e) && !$z.test(e), cB = () => !1, lB = (e) => eB.test(e), uB = (e) => tB.test(e), dB = (e) => !Q(e) && !$(e), fB = (e) => e.startsWith("@container") && (e[10] === "/" && e[11] !== void 0 || e[11] === "s" && e[16] !== void 0 && e.startsWith("-size/", 10) || e[11] === "n" && e[18] !== void 0 && e.startsWith("-normal/", 10)), pB = (e) => OB(e, MB, cB), Q = (e) => Jz.test(e), mB = (e) => OB(e, NB, sB), hB = (e) => OB(e, PB, Z), gB = (e) => OB(e, IB, oB), _B = (e) => OB(e, FB, cB), vB = (e) => OB(e, AB, cB), yB = (e) => OB(e, jB, uB), bB = (e) => OB(e, LB, lB), $ = (e) => Yz.test(e), xB = (e) => kB(e, NB), SB = (e) => kB(e, FB), CB = (e) => kB(e, AB), wB = (e) => kB(e, MB), TB = (e) => kB(e, jB), EB = (e) => kB(e, LB, !0), DB = (e) => kB(e, IB, !0), OB = (e, t, n) => {
	let r = Jz.exec(e);
	return r ? r[1] ? t(r[1]) : n(r[2]) : !1;
}, kB = (e, t, n = !1) => {
	let r = Yz.exec(e);
	return r ? r[1] ? t(r[1]) : n : !1;
}, AB = (e) => e === "position" || e === "percentage", jB = (e) => e === "image" || e === "url", MB = (e) => e === "length" || e === "size" || e === "bg-size", NB = (e) => e === "length", PB = (e) => e === "number", FB = (e) => e === "family-name", IB = (e) => e === "number" || e === "weight", LB = (e) => e === "shadow", RB = /*#__PURE__*/ Gz(() => {
	let e = qz("color"), t = qz("font"), n = qz("text"), r = qz("font-weight"), i = qz("tracking"), a = qz("leading"), o = qz("breakpoint"), s = qz("container"), c = qz("spacing"), l = qz("radius"), u = qz("shadow"), d = qz("inset-shadow"), f = qz("text-shadow"), p = qz("drop-shadow"), m = qz("blur"), h = qz("perspective"), g = qz("aspect"), _ = qz("ease"), v = qz("animate"), y = () => [
		"auto",
		"avoid",
		"all",
		"avoid-page",
		"page",
		"left",
		"right",
		"column"
	], b = () => [
		"center",
		"top",
		"bottom",
		"left",
		"right",
		"top-left",
		"left-top",
		"top-right",
		"right-top",
		"bottom-right",
		"right-bottom",
		"bottom-left",
		"left-bottom"
	], x = () => [
		...b(),
		$,
		Q
	], S = () => [
		"auto",
		"hidden",
		"clip",
		"visible",
		"scroll"
	], C = () => [
		"auto",
		"contain",
		"none"
	], w = () => [
		$,
		Q,
		c
	], T = () => [
		nB,
		"full",
		"auto",
		...w()
	], E = () => [
		rB,
		"none",
		"subgrid",
		$,
		Q
	], D = () => [
		"auto",
		{ span: [
			"full",
			rB,
			$,
			Q
		] },
		rB,
		$,
		Q
	], O = () => [
		rB,
		"auto",
		$,
		Q
	], k = () => [
		"auto",
		"min",
		"max",
		"fr",
		$,
		Q
	], A = () => [
		"start",
		"end",
		"center",
		"between",
		"around",
		"evenly",
		"stretch",
		"baseline",
		"center-safe",
		"end-safe"
	], j = () => [
		"start",
		"end",
		"center",
		"stretch",
		"center-safe",
		"end-safe"
	], M = () => ["auto", ...w()], N = () => [
		nB,
		"auto",
		"full",
		"dvw",
		"dvh",
		"lvw",
		"lvh",
		"svw",
		"svh",
		"min",
		"max",
		"fit",
		...w()
	], ee = () => [
		s,
		nB,
		"screen",
		"full",
		"dvw",
		"lvw",
		"svw",
		"min",
		"max",
		"fit",
		...w()
	], P = () => [
		nB,
		"screen",
		"full",
		"lh",
		"dvh",
		"lvh",
		"svh",
		"min",
		"max",
		"fit",
		...w()
	], F = () => [
		e,
		$,
		Q
	], te = () => [
		...b(),
		CB,
		vB,
		{ position: [$, Q] }
	], ne = () => ["no-repeat", { repeat: [
		"",
		"x",
		"y",
		"space",
		"round"
	] }], re = () => [
		"auto",
		"cover",
		"contain",
		wB,
		pB,
		{ size: [$, Q] }
	], ie = () => [
		iB,
		xB,
		mB
	], ae = () => [
		"",
		"none",
		"full",
		l,
		$,
		Q
	], oe = () => [
		"",
		Z,
		xB,
		mB
	], se = () => [
		"solid",
		"dashed",
		"dotted",
		"double"
	], ce = () => [
		"normal",
		"multiply",
		"screen",
		"overlay",
		"darken",
		"lighten",
		"color-dodge",
		"color-burn",
		"hard-light",
		"soft-light",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity"
	], le = () => [
		Z,
		iB,
		CB,
		vB
	], ue = () => [
		"",
		"none",
		m,
		$,
		Q
	], de = () => [
		"none",
		Z,
		$,
		Q
	], fe = () => [
		"none",
		Z,
		$,
		Q
	], pe = () => [
		Z,
		$,
		Q
	], me = () => [
		nB,
		"full",
		...w()
	];
	return {
		cacheSize: 500,
		theme: {
			animate: [
				"spin",
				"ping",
				"pulse",
				"bounce"
			],
			aspect: ["video"],
			blur: [aB],
			breakpoint: [aB],
			color: [oB],
			container: [aB],
			"drop-shadow": [aB],
			ease: [
				"in",
				"out",
				"in-out"
			],
			font: [dB],
			"font-weight": [
				"thin",
				"extralight",
				"light",
				"normal",
				"medium",
				"semibold",
				"bold",
				"extrabold",
				"black"
			],
			"inset-shadow": [aB],
			leading: [
				"none",
				"tight",
				"snug",
				"normal",
				"relaxed",
				"loose"
			],
			perspective: [
				"dramatic",
				"near",
				"normal",
				"midrange",
				"distant",
				"none"
			],
			radius: [aB],
			shadow: [aB],
			spacing: ["px", Z],
			text: [aB],
			"text-shadow": [aB],
			tracking: [
				"tighter",
				"tight",
				"normal",
				"wide",
				"wider",
				"widest"
			]
		},
		classGroups: {
			aspect: [{ aspect: [
				"auto",
				"square",
				nB,
				Q,
				$,
				g
			] }],
			container: ["container"],
			"container-type": [{ "@container": [
				"",
				"normal",
				"size",
				$,
				Q
			] }],
			"container-named": [fB],
			columns: [{ columns: [
				Z,
				"auto",
				Q,
				$,
				s
			] }],
			"break-after": [{ "break-after": y() }],
			"break-before": [{ "break-before": y() }],
			"break-inside": [{ "break-inside": [
				"auto",
				"avoid",
				"avoid-page",
				"avoid-column"
			] }],
			"box-decoration": [{ "box-decoration": ["slice", "clone"] }],
			box: [{ box: ["border", "content"] }],
			display: [
				"block",
				"inline-block",
				"inline",
				"flex",
				"inline-flex",
				"table",
				"inline-table",
				"table-caption",
				"table-cell",
				"table-column",
				"table-column-group",
				"table-footer-group",
				"table-header-group",
				"table-row-group",
				"table-row",
				"flow-root",
				"grid",
				"inline-grid",
				"contents",
				"list-item",
				"hidden"
			],
			sr: ["sr-only", "not-sr-only"],
			float: [{ float: [
				"right",
				"left",
				"none",
				"start",
				"end"
			] }],
			clear: [{ clear: [
				"left",
				"right",
				"both",
				"none",
				"start",
				"end"
			] }],
			isolation: ["isolate", "isolation-auto"],
			"object-fit": [{ object: [
				"contain",
				"cover",
				"fill",
				"none",
				"scale-down"
			] }],
			"object-position": [{ object: x() }],
			overflow: [{ overflow: S() }],
			"overflow-x": [{ "overflow-x": S() }],
			"overflow-y": [{ "overflow-y": S() }],
			overscroll: [{ overscroll: C() }],
			"overscroll-x": [{ "overscroll-x": C() }],
			"overscroll-y": [{ "overscroll-y": C() }],
			position: [
				"static",
				"fixed",
				"absolute",
				"relative",
				"sticky"
			],
			inset: [{ inset: T() }],
			"inset-x": [{ "inset-x": T() }],
			"inset-y": [{ "inset-y": T() }],
			start: [{
				"inset-s": T(),
				start: T()
			}],
			end: [{
				"inset-e": T(),
				end: T()
			}],
			"inset-bs": [{ "inset-bs": T() }],
			"inset-be": [{ "inset-be": T() }],
			top: [{ top: T() }],
			right: [{ right: T() }],
			bottom: [{ bottom: T() }],
			left: [{ left: T() }],
			visibility: [
				"visible",
				"invisible",
				"collapse"
			],
			z: [{ z: [
				rB,
				"auto",
				$,
				Q
			] }],
			basis: [{ basis: [
				nB,
				"full",
				"auto",
				s,
				...w()
			] }],
			"flex-direction": [{ flex: [
				"row",
				"row-reverse",
				"col",
				"col-reverse"
			] }],
			"flex-wrap": [{ flex: [
				"nowrap",
				"wrap",
				"wrap-reverse"
			] }],
			flex: [{ flex: [
				Z,
				nB,
				"auto",
				"initial",
				"none",
				Q
			] }],
			grow: [{ grow: [
				"",
				Z,
				$,
				Q
			] }],
			shrink: [{ shrink: [
				"",
				Z,
				$,
				Q
			] }],
			order: [{ order: [
				rB,
				"first",
				"last",
				"none",
				$,
				Q
			] }],
			"grid-cols": [{ "grid-cols": E() }],
			"col-start-end": [{ col: D() }],
			"col-start": [{ "col-start": O() }],
			"col-end": [{ "col-end": O() }],
			"grid-rows": [{ "grid-rows": E() }],
			"row-start-end": [{ row: D() }],
			"row-start": [{ "row-start": O() }],
			"row-end": [{ "row-end": O() }],
			"grid-flow": [{ "grid-flow": [
				"row",
				"col",
				"dense",
				"row-dense",
				"col-dense"
			] }],
			"auto-cols": [{ "auto-cols": k() }],
			"auto-rows": [{ "auto-rows": k() }],
			gap: [{ gap: w() }],
			"gap-x": [{ "gap-x": w() }],
			"gap-y": [{ "gap-y": w() }],
			"justify-content": [{ justify: [...A(), "normal"] }],
			"justify-items": [{ "justify-items": [...j(), "normal"] }],
			"justify-self": [{ "justify-self": ["auto", ...j()] }],
			"align-content": [{ content: ["normal", ...A()] }],
			"align-items": [{ items: [...j(), { baseline: ["", "last"] }] }],
			"align-self": [{ self: [
				"auto",
				...j(),
				{ baseline: ["", "last"] }
			] }],
			"place-content": [{ "place-content": A() }],
			"place-items": [{ "place-items": [...j(), "baseline"] }],
			"place-self": [{ "place-self": ["auto", ...j()] }],
			p: [{ p: w() }],
			px: [{ px: w() }],
			py: [{ py: w() }],
			ps: [{ ps: w() }],
			pe: [{ pe: w() }],
			pbs: [{ pbs: w() }],
			pbe: [{ pbe: w() }],
			pt: [{ pt: w() }],
			pr: [{ pr: w() }],
			pb: [{ pb: w() }],
			pl: [{ pl: w() }],
			m: [{ m: M() }],
			mx: [{ mx: M() }],
			my: [{ my: M() }],
			ms: [{ ms: M() }],
			me: [{ me: M() }],
			mbs: [{ mbs: M() }],
			mbe: [{ mbe: M() }],
			mt: [{ mt: M() }],
			mr: [{ mr: M() }],
			mb: [{ mb: M() }],
			ml: [{ ml: M() }],
			"space-x": [{ "space-x": w() }],
			"space-x-reverse": ["space-x-reverse"],
			"space-y": [{ "space-y": w() }],
			"space-y-reverse": ["space-y-reverse"],
			size: [{ size: N() }],
			"inline-size": [{ inline: ["auto", ...ee()] }],
			"min-inline-size": [{ "min-inline": ["auto", ...ee()] }],
			"max-inline-size": [{ "max-inline": ["none", ...ee()] }],
			"block-size": [{ block: ["auto", ...P()] }],
			"min-block-size": [{ "min-block": ["auto", ...P()] }],
			"max-block-size": [{ "max-block": ["none", ...P()] }],
			w: [{ w: [
				s,
				"screen",
				...N()
			] }],
			"min-w": [{ "min-w": [
				s,
				"screen",
				"none",
				...N()
			] }],
			"max-w": [{ "max-w": [
				s,
				"screen",
				"none",
				"prose",
				{ screen: [o] },
				...N()
			] }],
			h: [{ h: [
				"screen",
				"lh",
				...N()
			] }],
			"min-h": [{ "min-h": [
				"screen",
				"lh",
				"none",
				...N()
			] }],
			"max-h": [{ "max-h": [
				"screen",
				"lh",
				"none",
				...N()
			] }],
			"font-size": [{ text: [
				"base",
				n,
				xB,
				mB
			] }],
			"font-smoothing": ["antialiased", "subpixel-antialiased"],
			"font-style": ["italic", "not-italic"],
			"font-weight": [{ font: [
				r,
				DB,
				gB
			] }],
			"font-stretch": [{ "font-stretch": [
				"ultra-condensed",
				"extra-condensed",
				"condensed",
				"semi-condensed",
				"normal",
				"semi-expanded",
				"expanded",
				"extra-expanded",
				"ultra-expanded",
				iB,
				Q
			] }],
			"font-family": [{ font: [
				SB,
				_B,
				t
			] }],
			"font-features": [{ "font-features": [Q] }],
			"fvn-normal": ["normal-nums"],
			"fvn-ordinal": ["ordinal"],
			"fvn-slashed-zero": ["slashed-zero"],
			"fvn-figure": ["lining-nums", "oldstyle-nums"],
			"fvn-spacing": ["proportional-nums", "tabular-nums"],
			"fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
			tracking: [{ tracking: [
				i,
				$,
				Q
			] }],
			"line-clamp": [{ "line-clamp": [
				Z,
				"none",
				$,
				hB
			] }],
			leading: [{ leading: [
				"none",
				a,
				...w()
			] }],
			"list-image": [{ "list-image": [
				"none",
				$,
				Q
			] }],
			"list-style-position": [{ list: ["inside", "outside"] }],
			"list-style-type": [{ list: [
				"disc",
				"decimal",
				"none",
				$,
				Q
			] }],
			"text-alignment": [{ text: [
				"left",
				"center",
				"right",
				"justify",
				"start",
				"end"
			] }],
			"placeholder-color": [{ placeholder: F() }],
			"text-color": [{ text: F() }],
			"text-decoration": [
				"underline",
				"overline",
				"line-through",
				"no-underline"
			],
			"text-decoration-style": [{ decoration: [...se(), "wavy"] }],
			"text-decoration-thickness": [{ decoration: [
				Z,
				"from-font",
				"auto",
				$,
				mB
			] }],
			"text-decoration-color": [{ decoration: F() }],
			"underline-offset": [{ "underline-offset": [
				Z,
				"auto",
				$,
				Q
			] }],
			"text-transform": [
				"uppercase",
				"lowercase",
				"capitalize",
				"normal-case"
			],
			"text-overflow": [
				"truncate",
				"text-ellipsis",
				"text-clip"
			],
			"text-wrap": [{ text: [
				"wrap",
				"nowrap",
				"balance",
				"pretty"
			] }],
			indent: [{ indent: w() }],
			"tab-size": [{ tab: [
				rB,
				$,
				Q
			] }],
			"vertical-align": [{ align: [
				"baseline",
				"top",
				"middle",
				"bottom",
				"text-top",
				"text-bottom",
				"sub",
				"super",
				$,
				Q
			] }],
			whitespace: [{ whitespace: [
				"normal",
				"nowrap",
				"pre",
				"pre-line",
				"pre-wrap",
				"break-spaces"
			] }],
			break: [{ break: [
				"normal",
				"words",
				"all",
				"keep"
			] }],
			wrap: [{ wrap: [
				"break-word",
				"anywhere",
				"normal"
			] }],
			hyphens: [{ hyphens: [
				"none",
				"manual",
				"auto"
			] }],
			content: [{ content: [
				"none",
				$,
				Q
			] }],
			"bg-attachment": [{ bg: [
				"fixed",
				"local",
				"scroll"
			] }],
			"bg-clip": [{ "bg-clip": [
				"border",
				"padding",
				"content",
				"text"
			] }],
			"bg-origin": [{ "bg-origin": [
				"border",
				"padding",
				"content"
			] }],
			"bg-position": [{ bg: te() }],
			"bg-repeat": [{ bg: ne() }],
			"bg-size": [{ bg: re() }],
			"bg-image": [{ bg: [
				"none",
				{
					linear: [
						{ to: [
							"t",
							"tr",
							"r",
							"br",
							"b",
							"bl",
							"l",
							"tl"
						] },
						rB,
						$,
						Q
					],
					radial: [
						"",
						$,
						Q
					],
					conic: [
						"",
						rB,
						$,
						Q
					]
				},
				TB,
				yB
			] }],
			"bg-color": [{ bg: F() }],
			"gradient-from-pos": [{ from: ie() }],
			"gradient-via-pos": [{ via: ie() }],
			"gradient-to-pos": [{ to: ie() }],
			"gradient-from": [{ from: F() }],
			"gradient-via": [{ via: F() }],
			"gradient-to": [{ to: F() }],
			rounded: [{ rounded: ae() }],
			"rounded-s": [{ "rounded-s": ae() }],
			"rounded-e": [{ "rounded-e": ae() }],
			"rounded-t": [{ "rounded-t": ae() }],
			"rounded-r": [{ "rounded-r": ae() }],
			"rounded-b": [{ "rounded-b": ae() }],
			"rounded-l": [{ "rounded-l": ae() }],
			"rounded-ss": [{ "rounded-ss": ae() }],
			"rounded-se": [{ "rounded-se": ae() }],
			"rounded-ee": [{ "rounded-ee": ae() }],
			"rounded-es": [{ "rounded-es": ae() }],
			"rounded-tl": [{ "rounded-tl": ae() }],
			"rounded-tr": [{ "rounded-tr": ae() }],
			"rounded-br": [{ "rounded-br": ae() }],
			"rounded-bl": [{ "rounded-bl": ae() }],
			"border-w": [{ border: oe() }],
			"border-w-x": [{ "border-x": oe() }],
			"border-w-y": [{ "border-y": oe() }],
			"border-w-s": [{ "border-s": oe() }],
			"border-w-e": [{ "border-e": oe() }],
			"border-w-bs": [{ "border-bs": oe() }],
			"border-w-be": [{ "border-be": oe() }],
			"border-w-t": [{ "border-t": oe() }],
			"border-w-r": [{ "border-r": oe() }],
			"border-w-b": [{ "border-b": oe() }],
			"border-w-l": [{ "border-l": oe() }],
			"divide-x": [{ "divide-x": oe() }],
			"divide-x-reverse": ["divide-x-reverse"],
			"divide-y": [{ "divide-y": oe() }],
			"divide-y-reverse": ["divide-y-reverse"],
			"border-style": [{ border: [
				...se(),
				"hidden",
				"none"
			] }],
			"divide-style": [{ divide: [
				...se(),
				"hidden",
				"none"
			] }],
			"border-color": [{ border: F() }],
			"border-color-x": [{ "border-x": F() }],
			"border-color-y": [{ "border-y": F() }],
			"border-color-s": [{ "border-s": F() }],
			"border-color-e": [{ "border-e": F() }],
			"border-color-bs": [{ "border-bs": F() }],
			"border-color-be": [{ "border-be": F() }],
			"border-color-t": [{ "border-t": F() }],
			"border-color-r": [{ "border-r": F() }],
			"border-color-b": [{ "border-b": F() }],
			"border-color-l": [{ "border-l": F() }],
			"divide-color": [{ divide: F() }],
			"outline-style": [{ outline: [
				...se(),
				"none",
				"hidden"
			] }],
			"outline-offset": [{ "outline-offset": [
				Z,
				$,
				Q
			] }],
			"outline-w": [{ outline: [
				"",
				Z,
				xB,
				mB
			] }],
			"outline-color": [{ outline: F() }],
			shadow: [{ shadow: [
				"",
				"inner",
				"none",
				u,
				EB,
				bB
			] }],
			"shadow-color": [{ shadow: F() }],
			"inset-shadow": [{ "inset-shadow": [
				"none",
				d,
				EB,
				bB
			] }],
			"inset-shadow-color": [{ "inset-shadow": F() }],
			"ring-w": [{ ring: oe() }],
			"ring-w-inset": ["ring-inset"],
			"ring-color": [{ ring: F() }],
			"ring-offset-w": [{ "ring-offset": [Z, mB] }],
			"ring-offset-color": [{ "ring-offset": F() }],
			"inset-ring-w": [{ "inset-ring": oe() }],
			"inset-ring-color": [{ "inset-ring": F() }],
			"text-shadow": [{ "text-shadow": [
				"none",
				f,
				EB,
				bB
			] }],
			"text-shadow-color": [{ "text-shadow": F() }],
			opacity: [{ opacity: [
				Z,
				$,
				Q
			] }],
			"mix-blend": [{ "mix-blend": [
				...ce(),
				"plus-darker",
				"plus-lighter"
			] }],
			"bg-blend": [{ "bg-blend": ce() }],
			"mask-clip": [{ "mask-clip": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }, "mask-no-clip"],
			"mask-composite": [{ mask: [
				"add",
				"subtract",
				"intersect",
				"exclude"
			] }],
			"mask-image-linear-pos": [{ "mask-linear": [Z] }],
			"mask-image-linear-from-pos": [{ "mask-linear-from": le() }],
			"mask-image-linear-to-pos": [{ "mask-linear-to": le() }],
			"mask-image-linear-from-color": [{ "mask-linear-from": F() }],
			"mask-image-linear-to-color": [{ "mask-linear-to": F() }],
			"mask-image-t-from-pos": [{ "mask-t-from": le() }],
			"mask-image-t-to-pos": [{ "mask-t-to": le() }],
			"mask-image-t-from-color": [{ "mask-t-from": F() }],
			"mask-image-t-to-color": [{ "mask-t-to": F() }],
			"mask-image-r-from-pos": [{ "mask-r-from": le() }],
			"mask-image-r-to-pos": [{ "mask-r-to": le() }],
			"mask-image-r-from-color": [{ "mask-r-from": F() }],
			"mask-image-r-to-color": [{ "mask-r-to": F() }],
			"mask-image-b-from-pos": [{ "mask-b-from": le() }],
			"mask-image-b-to-pos": [{ "mask-b-to": le() }],
			"mask-image-b-from-color": [{ "mask-b-from": F() }],
			"mask-image-b-to-color": [{ "mask-b-to": F() }],
			"mask-image-l-from-pos": [{ "mask-l-from": le() }],
			"mask-image-l-to-pos": [{ "mask-l-to": le() }],
			"mask-image-l-from-color": [{ "mask-l-from": F() }],
			"mask-image-l-to-color": [{ "mask-l-to": F() }],
			"mask-image-x-from-pos": [{ "mask-x-from": le() }],
			"mask-image-x-to-pos": [{ "mask-x-to": le() }],
			"mask-image-x-from-color": [{ "mask-x-from": F() }],
			"mask-image-x-to-color": [{ "mask-x-to": F() }],
			"mask-image-y-from-pos": [{ "mask-y-from": le() }],
			"mask-image-y-to-pos": [{ "mask-y-to": le() }],
			"mask-image-y-from-color": [{ "mask-y-from": F() }],
			"mask-image-y-to-color": [{ "mask-y-to": F() }],
			"mask-image-radial": [{ "mask-radial": [$, Q] }],
			"mask-image-radial-from-pos": [{ "mask-radial-from": le() }],
			"mask-image-radial-to-pos": [{ "mask-radial-to": le() }],
			"mask-image-radial-from-color": [{ "mask-radial-from": F() }],
			"mask-image-radial-to-color": [{ "mask-radial-to": F() }],
			"mask-image-radial-shape": [{ "mask-radial": ["circle", "ellipse"] }],
			"mask-image-radial-size": [{ "mask-radial": [{
				closest: ["side", "corner"],
				farthest: ["side", "corner"]
			}] }],
			"mask-image-radial-pos": [{ "mask-radial-at": b() }],
			"mask-image-conic-pos": [{ "mask-conic": [Z] }],
			"mask-image-conic-from-pos": [{ "mask-conic-from": le() }],
			"mask-image-conic-to-pos": [{ "mask-conic-to": le() }],
			"mask-image-conic-from-color": [{ "mask-conic-from": F() }],
			"mask-image-conic-to-color": [{ "mask-conic-to": F() }],
			"mask-mode": [{ mask: [
				"alpha",
				"luminance",
				"match"
			] }],
			"mask-origin": [{ "mask-origin": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }],
			"mask-position": [{ mask: te() }],
			"mask-repeat": [{ mask: ne() }],
			"mask-size": [{ mask: re() }],
			"mask-type": [{ "mask-type": ["alpha", "luminance"] }],
			"mask-image": [{ mask: [
				"none",
				$,
				Q
			] }],
			filter: [{ filter: [
				"",
				"none",
				$,
				Q
			] }],
			blur: [{ blur: ue() }],
			brightness: [{ brightness: [
				Z,
				$,
				Q
			] }],
			contrast: [{ contrast: [
				Z,
				$,
				Q
			] }],
			"drop-shadow": [{ "drop-shadow": [
				"",
				"none",
				p,
				EB,
				bB
			] }],
			"drop-shadow-color": [{ "drop-shadow": F() }],
			grayscale: [{ grayscale: [
				"",
				Z,
				$,
				Q
			] }],
			"hue-rotate": [{ "hue-rotate": [
				Z,
				$,
				Q
			] }],
			invert: [{ invert: [
				"",
				Z,
				$,
				Q
			] }],
			saturate: [{ saturate: [
				Z,
				$,
				Q
			] }],
			sepia: [{ sepia: [
				"",
				Z,
				$,
				Q
			] }],
			"backdrop-filter": [{ "backdrop-filter": [
				"",
				"none",
				$,
				Q
			] }],
			"backdrop-blur": [{ "backdrop-blur": ue() }],
			"backdrop-brightness": [{ "backdrop-brightness": [
				Z,
				$,
				Q
			] }],
			"backdrop-contrast": [{ "backdrop-contrast": [
				Z,
				$,
				Q
			] }],
			"backdrop-grayscale": [{ "backdrop-grayscale": [
				"",
				Z,
				$,
				Q
			] }],
			"backdrop-hue-rotate": [{ "backdrop-hue-rotate": [
				Z,
				$,
				Q
			] }],
			"backdrop-invert": [{ "backdrop-invert": [
				"",
				Z,
				$,
				Q
			] }],
			"backdrop-opacity": [{ "backdrop-opacity": [
				Z,
				$,
				Q
			] }],
			"backdrop-saturate": [{ "backdrop-saturate": [
				Z,
				$,
				Q
			] }],
			"backdrop-sepia": [{ "backdrop-sepia": [
				"",
				Z,
				$,
				Q
			] }],
			"border-collapse": [{ border: ["collapse", "separate"] }],
			"border-spacing": [{ "border-spacing": w() }],
			"border-spacing-x": [{ "border-spacing-x": w() }],
			"border-spacing-y": [{ "border-spacing-y": w() }],
			"table-layout": [{ table: ["auto", "fixed"] }],
			caption: [{ caption: ["top", "bottom"] }],
			transition: [{ transition: [
				"",
				"all",
				"colors",
				"opacity",
				"shadow",
				"transform",
				"none",
				$,
				Q
			] }],
			"transition-behavior": [{ transition: ["normal", "discrete"] }],
			duration: [{ duration: [
				Z,
				"initial",
				$,
				Q
			] }],
			ease: [{ ease: [
				"linear",
				"initial",
				_,
				$,
				Q
			] }],
			delay: [{ delay: [
				Z,
				$,
				Q
			] }],
			animate: [{ animate: [
				"none",
				v,
				$,
				Q
			] }],
			backface: [{ backface: ["hidden", "visible"] }],
			perspective: [{ perspective: [
				h,
				$,
				Q
			] }],
			"perspective-origin": [{ "perspective-origin": x() }],
			rotate: [{ rotate: de() }],
			"rotate-x": [{ "rotate-x": de() }],
			"rotate-y": [{ "rotate-y": de() }],
			"rotate-z": [{ "rotate-z": de() }],
			scale: [{ scale: fe() }],
			"scale-x": [{ "scale-x": fe() }],
			"scale-y": [{ "scale-y": fe() }],
			"scale-z": [{ "scale-z": fe() }],
			"scale-3d": ["scale-3d"],
			skew: [{ skew: pe() }],
			"skew-x": [{ "skew-x": pe() }],
			"skew-y": [{ "skew-y": pe() }],
			transform: [{ transform: [
				$,
				Q,
				"",
				"none",
				"gpu",
				"cpu"
			] }],
			"transform-origin": [{ origin: x() }],
			"transform-style": [{ transform: ["3d", "flat"] }],
			translate: [{ translate: me() }],
			"translate-x": [{ "translate-x": me() }],
			"translate-y": [{ "translate-y": me() }],
			"translate-z": [{ "translate-z": me() }],
			"translate-none": ["translate-none"],
			zoom: [{ zoom: [
				rB,
				$,
				Q
			] }],
			accent: [{ accent: F() }],
			appearance: [{ appearance: ["none", "auto"] }],
			"caret-color": [{ caret: F() }],
			"color-scheme": [{ scheme: [
				"normal",
				"dark",
				"light",
				"light-dark",
				"only-dark",
				"only-light"
			] }],
			cursor: [{ cursor: [
				"auto",
				"default",
				"pointer",
				"wait",
				"text",
				"move",
				"help",
				"not-allowed",
				"none",
				"context-menu",
				"progress",
				"cell",
				"crosshair",
				"vertical-text",
				"alias",
				"copy",
				"no-drop",
				"grab",
				"grabbing",
				"all-scroll",
				"col-resize",
				"row-resize",
				"n-resize",
				"e-resize",
				"s-resize",
				"w-resize",
				"ne-resize",
				"nw-resize",
				"se-resize",
				"sw-resize",
				"ew-resize",
				"ns-resize",
				"nesw-resize",
				"nwse-resize",
				"zoom-in",
				"zoom-out",
				$,
				Q
			] }],
			"field-sizing": [{ "field-sizing": ["fixed", "content"] }],
			"pointer-events": [{ "pointer-events": ["auto", "none"] }],
			resize: [{ resize: [
				"none",
				"",
				"y",
				"x"
			] }],
			"scroll-behavior": [{ scroll: ["auto", "smooth"] }],
			"scrollbar-thumb-color": [{ "scrollbar-thumb": F() }],
			"scrollbar-track-color": [{ "scrollbar-track": F() }],
			"scrollbar-gutter": [{ "scrollbar-gutter": [
				"auto",
				"stable",
				"both"
			] }],
			"scrollbar-w": [{ scrollbar: [
				"auto",
				"thin",
				"none"
			] }],
			"scroll-m": [{ "scroll-m": w() }],
			"scroll-mx": [{ "scroll-mx": w() }],
			"scroll-my": [{ "scroll-my": w() }],
			"scroll-ms": [{ "scroll-ms": w() }],
			"scroll-me": [{ "scroll-me": w() }],
			"scroll-mbs": [{ "scroll-mbs": w() }],
			"scroll-mbe": [{ "scroll-mbe": w() }],
			"scroll-mt": [{ "scroll-mt": w() }],
			"scroll-mr": [{ "scroll-mr": w() }],
			"scroll-mb": [{ "scroll-mb": w() }],
			"scroll-ml": [{ "scroll-ml": w() }],
			"scroll-p": [{ "scroll-p": w() }],
			"scroll-px": [{ "scroll-px": w() }],
			"scroll-py": [{ "scroll-py": w() }],
			"scroll-ps": [{ "scroll-ps": w() }],
			"scroll-pe": [{ "scroll-pe": w() }],
			"scroll-pbs": [{ "scroll-pbs": w() }],
			"scroll-pbe": [{ "scroll-pbe": w() }],
			"scroll-pt": [{ "scroll-pt": w() }],
			"scroll-pr": [{ "scroll-pr": w() }],
			"scroll-pb": [{ "scroll-pb": w() }],
			"scroll-pl": [{ "scroll-pl": w() }],
			"snap-align": [{ snap: [
				"start",
				"end",
				"center",
				"align-none"
			] }],
			"snap-stop": [{ snap: ["normal", "always"] }],
			"snap-type": [{ snap: [
				"none",
				"x",
				"y",
				"both"
			] }],
			"snap-strictness": [{ snap: ["mandatory", "proximity"] }],
			touch: [{ touch: [
				"auto",
				"none",
				"manipulation"
			] }],
			"touch-x": [{ "touch-pan": [
				"x",
				"left",
				"right"
			] }],
			"touch-y": [{ "touch-pan": [
				"y",
				"up",
				"down"
			] }],
			"touch-pz": ["touch-pinch-zoom"],
			select: [{ select: [
				"none",
				"text",
				"all",
				"auto"
			] }],
			"will-change": [{ "will-change": [
				"auto",
				"scroll",
				"contents",
				"transform",
				$,
				Q
			] }],
			fill: [{ fill: ["none", ...F()] }],
			"stroke-w": [{ stroke: [
				Z,
				xB,
				mB,
				hB
			] }],
			stroke: [{ stroke: ["none", ...F()] }],
			"forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }]
		},
		conflictingClassGroups: {
			"container-named": ["container-type"],
			overflow: ["overflow-x", "overflow-y"],
			overscroll: ["overscroll-x", "overscroll-y"],
			inset: [
				"inset-x",
				"inset-y",
				"inset-bs",
				"inset-be",
				"start",
				"end",
				"top",
				"right",
				"bottom",
				"left"
			],
			"inset-x": [
				"start",
				"end",
				"right",
				"left"
			],
			"inset-y": [
				"inset-bs",
				"inset-be",
				"top",
				"bottom"
			],
			flex: [
				"basis",
				"grow",
				"shrink"
			],
			gap: ["gap-x", "gap-y"],
			p: [
				"px",
				"py",
				"ps",
				"pe",
				"pbs",
				"pbe",
				"pt",
				"pr",
				"pb",
				"pl"
			],
			px: [
				"ps",
				"pe",
				"pr",
				"pl"
			],
			py: [
				"pbs",
				"pbe",
				"pt",
				"pb"
			],
			m: [
				"mx",
				"my",
				"ms",
				"me",
				"mbs",
				"mbe",
				"mt",
				"mr",
				"mb",
				"ml"
			],
			mx: [
				"ms",
				"me",
				"mr",
				"ml"
			],
			my: [
				"mbs",
				"mbe",
				"mt",
				"mb"
			],
			size: ["w", "h"],
			"font-size": ["leading"],
			"fvn-normal": [
				"fvn-ordinal",
				"fvn-slashed-zero",
				"fvn-figure",
				"fvn-spacing",
				"fvn-fraction"
			],
			"fvn-ordinal": ["fvn-normal"],
			"fvn-slashed-zero": ["fvn-normal"],
			"fvn-figure": ["fvn-normal"],
			"fvn-spacing": ["fvn-normal"],
			"fvn-fraction": ["fvn-normal"],
			"line-clamp": ["display", "overflow"],
			rounded: [
				"rounded-s",
				"rounded-e",
				"rounded-t",
				"rounded-r",
				"rounded-b",
				"rounded-l",
				"rounded-ss",
				"rounded-se",
				"rounded-ee",
				"rounded-es",
				"rounded-tl",
				"rounded-tr",
				"rounded-br",
				"rounded-bl"
			],
			"rounded-s": ["rounded-ss", "rounded-es"],
			"rounded-e": ["rounded-se", "rounded-ee"],
			"rounded-t": ["rounded-tl", "rounded-tr"],
			"rounded-r": ["rounded-tr", "rounded-br"],
			"rounded-b": ["rounded-br", "rounded-bl"],
			"rounded-l": ["rounded-tl", "rounded-bl"],
			"border-spacing": ["border-spacing-x", "border-spacing-y"],
			"border-w": [
				"border-w-x",
				"border-w-y",
				"border-w-s",
				"border-w-e",
				"border-w-bs",
				"border-w-be",
				"border-w-t",
				"border-w-r",
				"border-w-b",
				"border-w-l"
			],
			"border-w-x": [
				"border-w-s",
				"border-w-e",
				"border-w-r",
				"border-w-l"
			],
			"border-w-y": [
				"border-w-bs",
				"border-w-be",
				"border-w-t",
				"border-w-b"
			],
			"border-color": [
				"border-color-x",
				"border-color-y",
				"border-color-s",
				"border-color-e",
				"border-color-bs",
				"border-color-be",
				"border-color-t",
				"border-color-r",
				"border-color-b",
				"border-color-l"
			],
			"border-color-x": [
				"border-color-s",
				"border-color-e",
				"border-color-r",
				"border-color-l"
			],
			"border-color-y": [
				"border-color-bs",
				"border-color-be",
				"border-color-t",
				"border-color-b"
			],
			translate: [
				"translate-x",
				"translate-y",
				"translate-none"
			],
			"translate-none": [
				"translate",
				"translate-x",
				"translate-y",
				"translate-z"
			],
			"scroll-m": [
				"scroll-mx",
				"scroll-my",
				"scroll-ms",
				"scroll-me",
				"scroll-mbs",
				"scroll-mbe",
				"scroll-mt",
				"scroll-mr",
				"scroll-mb",
				"scroll-ml"
			],
			"scroll-mx": [
				"scroll-ms",
				"scroll-me",
				"scroll-mr",
				"scroll-ml"
			],
			"scroll-my": [
				"scroll-mbs",
				"scroll-mbe",
				"scroll-mt",
				"scroll-mb"
			],
			"scroll-p": [
				"scroll-px",
				"scroll-py",
				"scroll-ps",
				"scroll-pe",
				"scroll-pbs",
				"scroll-pbe",
				"scroll-pt",
				"scroll-pr",
				"scroll-pb",
				"scroll-pl"
			],
			"scroll-px": [
				"scroll-ps",
				"scroll-pe",
				"scroll-pr",
				"scroll-pl"
			],
			"scroll-py": [
				"scroll-pbs",
				"scroll-pbe",
				"scroll-pt",
				"scroll-pb"
			],
			touch: [
				"touch-x",
				"touch-y",
				"touch-pz"
			],
			"touch-x": ["touch"],
			"touch-y": ["touch"],
			"touch-pz": ["touch"]
		},
		conflictingClassGroupModifiers: { "font-size": ["leading"] },
		postfixLookupClassGroups: ["container-type"],
		orderSensitiveModifiers: [
			"*",
			"**",
			"after",
			"backdrop",
			"before",
			"details-content",
			"file",
			"first-letter",
			"first-line",
			"marker",
			"placeholder",
			"selection"
		]
	};
});
//#endregion
//#region react-ui/lib/utils.js
function zB(...e) {
	return RB(Ss(e));
}
//#endregion
//#region react-ui/components/ui/chart.jsx
var BB = {
	light: "",
	dark: ".dark"
}, VB = x.createContext(null);
function HB({ id: e, className: t, children: n, config: r, ...i }) {
	let a = x.useId(), o = `chart-${e || a.replace(/:/g, "")}`;
	return /* @__PURE__ */ (0, S.jsx)(VB.Provider, {
		value: { config: r },
		children: /* @__PURE__ */ (0, S.jsxs)("div", {
			"data-slot": "chart",
			"data-chart": o,
			className: zB("[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden", t),
			...i,
			children: [/* @__PURE__ */ (0, S.jsx)(UB, {
				id: o,
				config: r
			}), /* @__PURE__ */ (0, S.jsx)(Zh, { children: n })]
		})
	});
}
function UB({ id: e, config: t }) {
	let n = Object.entries(t).filter(([, e]) => e.theme || e.color);
	return n.length ? /* @__PURE__ */ (0, S.jsx)("style", { dangerouslySetInnerHTML: { __html: Object.entries(BB).map(([t, r]) => `
${r} [data-chart=${e}] {
${n.map(([e, n]) => {
		let r = n.theme?.[t] || n.color;
		return r ? `  --color-${e}: ${r};` : null;
	}).filter(Boolean).join("\n")}
}
`).join("\n") } }) : null;
}
//#endregion
//#region react-ui/components/pfa-donut-chart.jsx
function WB({ label: e, segments: t, total: n, centre: r, money: i }) {
	let a = (t || []).filter((e) => Number(e.amount) > 0), o = Number(n) || a.reduce((e, t) => e + Number(t.amount), 0);
	if (!a.length || o <= 0) return null;
	let s = a.map((e) => ({
		...e,
		value: Number(e.amount)
	})), c = Object.fromEntries(a.map((e) => [e.key, { label: e.label }]));
	return /* @__PURE__ */ (0, S.jsxs)("div", {
		className: "donut",
		role: "group",
		"aria-label": e,
		children: [/* @__PURE__ */ (0, S.jsxs)("div", {
			className: "donut-figure",
			children: [/* @__PURE__ */ (0, S.jsx)(HB, {
				config: c,
				className: "donut-svg !aspect-square",
				children: /* @__PURE__ */ (0, S.jsxs)(pz, { children: [/* @__PURE__ */ (0, S.jsx)(PI, {
					data: s,
					dataKey: "value",
					nameKey: "label",
					innerRadius: "72%",
					outerRadius: "100%",
					startAngle: 90,
					endAngle: -270,
					stroke: "none",
					isAnimationActive: !0,
					animationDuration: 520,
					children: s.map((e) => /* @__PURE__ */ (0, S.jsx)(kM, {
						className: `pfa-donut-arc is-${e.tone || "neutral"}`,
						style: e.colour ? { fill: e.colour } : void 0
					}, e.key))
				}), /* @__PURE__ */ (0, S.jsx)(OM, { content: ({ active: e, payload: t }) => {
					if (!e || !t?.length) return null;
					let n = t[0].payload, r = Math.round(n.value / o * 100);
					return /* @__PURE__ */ (0, S.jsxs)("div", {
						className: "chart-tooltip",
						style: {
							position: "static",
							width: "max-content"
						},
						children: [
							/* @__PURE__ */ (0, S.jsx)("div", { children: n.label }),
							/* @__PURE__ */ (0, S.jsx)("div", { children: i(n.value) }),
							/* @__PURE__ */ (0, S.jsxs)("div", { children: [
								r,
								"% of ",
								i(o)
							] })
						]
					});
				} })] })
			}), r ? /* @__PURE__ */ (0, S.jsxs)("div", {
				className: "donut-centre",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, S.jsx)("span", {
					className: "donut-centre-value money",
					children: r.value
				}), /* @__PURE__ */ (0, S.jsx)("span", {
					className: "donut-centre-label",
					children: r.label
				})]
			}) : null]
		}), /* @__PURE__ */ (0, S.jsx)("div", {
			className: "donut-legend",
			children: a.map((e) => {
				let t = Math.round(Number(e.amount) / o * 100), n = `${e.label}. ${i(e.amount)}. ${t}% of ${i(o)}`;
				return /* @__PURE__ */ (0, S.jsxs)("div", {
					className: "donut-legend-row",
					tabIndex: 0,
					role: "img",
					"aria-label": n,
					children: [
						/* @__PURE__ */ (0, S.jsx)("i", {
							className: `donut-key is-${e.tone || "neutral"}`,
							"aria-hidden": "true",
							style: e.colour ? { background: e.colour } : void 0
						}),
						/* @__PURE__ */ (0, S.jsx)("span", {
							className: "donut-legend-label",
							children: e.label
						}),
						/* @__PURE__ */ (0, S.jsx)("span", {
							className: "donut-legend-amt num",
							children: i(e.amount)
						})
					]
				}, e.key);
			})
		})]
	});
}
//#endregion
//#region react-ui/vanilla-body.jsx
function GB({ node: e }) {
	let t = (0, x.useRef)(null);
	return (0, x.useEffect)(() => {
		let n = t.current;
		if (n && e) return n.appendChild(e), () => {
			e.parentNode === n && n.removeChild(e);
		};
	}, [e]), /* @__PURE__ */ (0, S.jsx)("div", {
		ref: t,
		style: { display: "contents" }
	});
}
//#endregion
//#region react-ui/mount.jsx
var KB = /* @__PURE__ */ new WeakMap();
function qB(e, { title: t, summary: n, icon: r, hasExplain: i, alwaysOpen: a, compact: o, name: s, bodyNode: c }) {
	if (!e) return;
	let l = KB.get(e);
	l || (l = (0, b.createRoot)(e), KB.set(e, l)), l.render(/* @__PURE__ */ (0, S.jsx)(pn, {
		title: t,
		summary: n,
		icon: r ? /* @__PURE__ */ (0, S.jsx)(GB, { node: r }) : null,
		hasExplain: i,
		alwaysOpen: a,
		compact: o,
		name: s,
		bare: !0,
		children: /* @__PURE__ */ (0, S.jsx)(GB, { node: c })
	}));
}
function JB(e) {
	let t = KB.get(e);
	t && (t.unmount(), KB.delete(e));
}
function YB(e, { label: t, content: n, tone: r }) {
	if (!e) return;
	let i = KB.get(e);
	i || (i = (0, b.createRoot)(e), KB.set(e, i));
	let a = Array.isArray(n) ? n : [n];
	i.render(/* @__PURE__ */ (0, S.jsx)(bs, {
		label: t,
		tone: r,
		content: a.map((e, t) => e instanceof Node ? /* @__PURE__ */ (0, S.jsx)(GB, { node: e }, t) : /* @__PURE__ */ (0, S.jsx)(x.Fragment, { children: e }, t))
	}));
}
function XB(e) {
	let t = KB.get(e);
	t && (t.unmount(), KB.delete(e));
}
function ZB(e, { label: t, segments: n, total: r, centre: i, money: a }) {
	if (!e) return;
	let o = KB.get(e);
	o || (o = (0, b.createRoot)(e), KB.set(e, o)), o.render(/* @__PURE__ */ (0, S.jsx)(WB, {
		label: t,
		segments: n,
		total: r,
		centre: i,
		money: a
	}));
}
function QB(e) {
	let t = KB.get(e);
	t && (t.unmount(), KB.delete(e));
}
//#endregion
export { qB as mountCollapsibleCard, ZB as mountDonutChart, YB as mountInfoPopover, JB as unmountCollapsibleCard, QB as unmountDonutChart, XB as unmountInfoPopover };

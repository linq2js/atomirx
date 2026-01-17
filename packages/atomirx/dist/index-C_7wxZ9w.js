var rr = Object.defineProperty;
var tr = (e, r, t) => r in e ? rr(e, r, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[r] = t;
var b = (e, r, t) => tr(e, typeof r != "symbol" ? r + "" : r, t);
function j(e) {
  return e !== null && typeof e == "object" && "then" in e && typeof e.then == "function";
}
function ar(e) {
  const r = Object.assign(
    (t) => () => {
      const a = r.current;
      return r.current = t, () => {
        r.current = a;
      };
    },
    {
      current: e,
      // Override method for direct mutation
      override: (t) => {
        r.current = t;
      },
      reset: () => {
        r.current = e;
      }
    }
  );
  return r;
}
function nr(e, r) {
  const t = [];
  for (const a of e)
    t.push(a());
  try {
    return r();
  } finally {
    for (const a of t.reverse())
      a();
  }
}
const q = Object.assign(ar, { use: nr }), m = q(), sr = () => {
};
class ir {
  constructor(r) {
    /** Set of registered listeners */
    b(this, "_listeners");
    /** Settled payload (if settled) */
    b(this, "_settledPayload");
    /** Whether the emitter has been settled */
    b(this, "_isSettled", !1);
    b(this, "size", () => this._listeners.size);
    b(this, "settled", () => this._isSettled);
    b(this, "forEach", (r) => {
      this._listeners.forEach(r);
    });
    b(this, "on", (r, t) => {
      let a;
      if (t === void 0)
        a = Array.isArray(r) ? r : [r];
      else {
        const n = r, i = Array.isArray(t) ? t : [t];
        a = [
          (o) => {
            const c = n(o);
            if (c)
              for (let l = 0; l < i.length; l++)
                i[l](c.value);
          }
        ];
      }
      if (this._isSettled) {
        const n = this._settledPayload;
        for (let i = 0; i < a.length; i++)
          a[i](n);
        return sr;
      }
      const s = this._listeners;
      for (let n = 0; n < a.length; n++)
        s.add(a[n]);
      return () => {
        for (let n = 0; n < a.length; n++)
          s.delete(a[n]);
      };
    });
    b(this, "emit", (r) => {
      this._isSettled || this._doEmit(r, !1, !1);
    });
    b(this, "emitLifo", (r) => {
      this._isSettled || this._doEmit(r, !1, !0);
    });
    b(this, "clear", () => {
      this._listeners.clear();
    });
    b(this, "emitAndClear", (r) => {
      this._isSettled || this._doEmit(r, !0, !1);
    });
    b(this, "emitAndClearLifo", (r) => {
      this._isSettled || this._doEmit(r, !0, !0);
    });
    b(this, "settle", (r) => {
      this._isSettled || (this._settledPayload = r, this._isSettled = !0, this._doEmit(r, !0, !1));
    });
    /**
     * Internal emit implementation.
     * Creates snapshot to handle modifications during iteration.
     */
    b(this, "_doEmit", (r, t, a) => {
      const s = this._listeners, n = s.size;
      if (n === 0) return;
      const i = Array.from(s);
      if (t && s.clear(), a)
        for (let o = n - 1; o >= 0; o--)
          i[o](r);
      else
        for (let o = 0; o < n; o++)
          i[o](r);
    });
    this._listeners = new Set(r);
  }
}
function or(e) {
  return new ir(e);
}
var x = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function ur(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
function lr() {
  this.__data__ = [], this.size = 0;
}
var cr = lr;
function fr(e, r) {
  return e === r || e !== e && r !== r;
}
var Re = fr, vr = Re;
function dr(e, r) {
  for (var t = e.length; t--; )
    if (vr(e[t][0], r))
      return t;
  return -1;
}
var U = dr, hr = U, gr = Array.prototype, yr = gr.splice;
function pr(e) {
  var r = this.__data__, t = hr(r, e);
  if (t < 0)
    return !1;
  var a = r.length - 1;
  return t == a ? r.pop() : yr.call(r, t, 1), --this.size, !0;
}
var _r = pr, br = U;
function $r(e) {
  var r = this.__data__, t = br(r, e);
  return t < 0 ? void 0 : r[t][1];
}
var mr = $r, Ar = U;
function Tr(e) {
  return Ar(this.__data__, e) > -1;
}
var jr = Tr, Sr = U;
function wr(e, r) {
  var t = this.__data__, a = Sr(t, e);
  return a < 0 ? (++this.size, t.push([e, r])) : t[a][1] = r, this;
}
var Or = wr, Pr = cr, Er = _r, Cr = mr, Ir = jr, Lr = Or;
function S(e) {
  var r = -1, t = e == null ? 0 : e.length;
  for (this.clear(); ++r < t; ) {
    var a = e[r];
    this.set(a[0], a[1]);
  }
}
S.prototype.clear = Pr;
S.prototype.delete = Er;
S.prototype.get = Cr;
S.prototype.has = Ir;
S.prototype.set = Lr;
var B = S, Dr = B;
function Mr() {
  this.__data__ = new Dr(), this.size = 0;
}
var Gr = Mr;
function xr(e) {
  var r = this.__data__, t = r.delete(e);
  return this.size = r.size, t;
}
var Fr = xr;
function Rr(e) {
  return this.__data__.get(e);
}
var qr = Rr;
function kr(e) {
  return this.__data__.has(e);
}
var zr = kr, Nr = typeof x == "object" && x && x.Object === Object && x, qe = Nr, Hr = qe, Ur = typeof self == "object" && self && self.Object === Object && self, Br = Hr || Ur || Function("return this")(), A = Br, Vr = A, Kr = Vr.Symbol, ie = Kr, ce = ie, ke = Object.prototype, Wr = ke.hasOwnProperty, Jr = ke.toString, D = ce ? ce.toStringTag : void 0;
function Xr(e) {
  var r = Wr.call(e, D), t = e[D];
  try {
    e[D] = void 0;
    var a = !0;
  } catch {
  }
  var s = Jr.call(e);
  return a && (r ? e[D] = t : delete e[D]), s;
}
var Yr = Xr, Zr = Object.prototype, Qr = Zr.toString;
function et(e) {
  return Qr.call(e);
}
var rt = et, fe = ie, tt = Yr, at = rt, nt = "[object Null]", st = "[object Undefined]", ve = fe ? fe.toStringTag : void 0;
function it(e) {
  return e == null ? e === void 0 ? st : nt : ve && ve in Object(e) ? tt(e) : at(e);
}
var V = it;
function ot(e) {
  var r = typeof e;
  return e != null && (r == "object" || r == "function");
}
var ze = ot, ut = V, lt = ze, ct = "[object AsyncFunction]", ft = "[object Function]", vt = "[object GeneratorFunction]", dt = "[object Proxy]";
function ht(e) {
  if (!lt(e))
    return !1;
  var r = ut(e);
  return r == ft || r == vt || r == ct || r == dt;
}
var Ne = ht, gt = A, yt = gt["__core-js_shared__"], pt = yt, X = pt, de = function() {
  var e = /[^.]+$/.exec(X && X.keys && X.keys.IE_PROTO || "");
  return e ? "Symbol(src)_1." + e : "";
}();
function _t(e) {
  return !!de && de in e;
}
var bt = _t, $t = Function.prototype, mt = $t.toString;
function At(e) {
  if (e != null) {
    try {
      return mt.call(e);
    } catch {
    }
    try {
      return e + "";
    } catch {
    }
  }
  return "";
}
var He = At, Tt = Ne, jt = bt, St = ze, wt = He, Ot = /[\\^$.*+?()[\]{}|]/g, Pt = /^\[object .+?Constructor\]$/, Et = Function.prototype, Ct = Object.prototype, It = Et.toString, Lt = Ct.hasOwnProperty, Dt = RegExp(
  "^" + It.call(Lt).replace(Ot, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function Mt(e) {
  if (!St(e) || jt(e))
    return !1;
  var r = Tt(e) ? Dt : Pt;
  return r.test(wt(e));
}
var Gt = Mt;
function xt(e, r) {
  return e == null ? void 0 : e[r];
}
var Ft = xt, Rt = Gt, qt = Ft;
function kt(e, r) {
  var t = qt(e, r);
  return Rt(t) ? t : void 0;
}
var w = kt, zt = w, Nt = A, Ht = zt(Nt, "Map"), oe = Ht, Ut = w, Bt = Ut(Object, "create"), K = Bt, he = K;
function Vt() {
  this.__data__ = he ? he(null) : {}, this.size = 0;
}
var Kt = Vt;
function Wt(e) {
  var r = this.has(e) && delete this.__data__[e];
  return this.size -= r ? 1 : 0, r;
}
var Jt = Wt, Xt = K, Yt = "__lodash_hash_undefined__", Zt = Object.prototype, Qt = Zt.hasOwnProperty;
function ea(e) {
  var r = this.__data__;
  if (Xt) {
    var t = r[e];
    return t === Yt ? void 0 : t;
  }
  return Qt.call(r, e) ? r[e] : void 0;
}
var ra = ea, ta = K, aa = Object.prototype, na = aa.hasOwnProperty;
function sa(e) {
  var r = this.__data__;
  return ta ? r[e] !== void 0 : na.call(r, e);
}
var ia = sa, oa = K, ua = "__lodash_hash_undefined__";
function la(e, r) {
  var t = this.__data__;
  return this.size += this.has(e) ? 0 : 1, t[e] = oa && r === void 0 ? ua : r, this;
}
var ca = la, fa = Kt, va = Jt, da = ra, ha = ia, ga = ca;
function O(e) {
  var r = -1, t = e == null ? 0 : e.length;
  for (this.clear(); ++r < t; ) {
    var a = e[r];
    this.set(a[0], a[1]);
  }
}
O.prototype.clear = fa;
O.prototype.delete = va;
O.prototype.get = da;
O.prototype.has = ha;
O.prototype.set = ga;
var ya = O, ge = ya, pa = B, _a = oe;
function ba() {
  this.size = 0, this.__data__ = {
    hash: new ge(),
    map: new (_a || pa)(),
    string: new ge()
  };
}
var $a = ba;
function ma(e) {
  var r = typeof e;
  return r == "string" || r == "number" || r == "symbol" || r == "boolean" ? e !== "__proto__" : e === null;
}
var Aa = ma, Ta = Aa;
function ja(e, r) {
  var t = e.__data__;
  return Ta(r) ? t[typeof r == "string" ? "string" : "hash"] : t.map;
}
var W = ja, Sa = W;
function wa(e) {
  var r = Sa(this, e).delete(e);
  return this.size -= r ? 1 : 0, r;
}
var Oa = wa, Pa = W;
function Ea(e) {
  return Pa(this, e).get(e);
}
var Ca = Ea, Ia = W;
function La(e) {
  return Ia(this, e).has(e);
}
var Da = La, Ma = W;
function Ga(e, r) {
  var t = Ma(this, e), a = t.size;
  return t.set(e, r), this.size += t.size == a ? 0 : 1, this;
}
var xa = Ga, Fa = $a, Ra = Oa, qa = Ca, ka = Da, za = xa;
function P(e) {
  var r = -1, t = e == null ? 0 : e.length;
  for (this.clear(); ++r < t; ) {
    var a = e[r];
    this.set(a[0], a[1]);
  }
}
P.prototype.clear = Fa;
P.prototype.delete = Ra;
P.prototype.get = qa;
P.prototype.has = ka;
P.prototype.set = za;
var Ue = P, Na = B, Ha = oe, Ua = Ue, Ba = 200;
function Va(e, r) {
  var t = this.__data__;
  if (t instanceof Na) {
    var a = t.__data__;
    if (!Ha || a.length < Ba - 1)
      return a.push([e, r]), this.size = ++t.size, this;
    t = this.__data__ = new Ua(a);
  }
  return t.set(e, r), this.size = t.size, this;
}
var Ka = Va, Wa = B, Ja = Gr, Xa = Fr, Ya = qr, Za = zr, Qa = Ka;
function E(e) {
  var r = this.__data__ = new Wa(e);
  this.size = r.size;
}
E.prototype.clear = Ja;
E.prototype.delete = Xa;
E.prototype.get = Ya;
E.prototype.has = Za;
E.prototype.set = Qa;
var en = E, rn = "__lodash_hash_undefined__";
function tn(e) {
  return this.__data__.set(e, rn), this;
}
var an = tn;
function nn(e) {
  return this.__data__.has(e);
}
var sn = nn, on = Ue, un = an, ln = sn;
function k(e) {
  var r = -1, t = e == null ? 0 : e.length;
  for (this.__data__ = new on(); ++r < t; )
    this.add(e[r]);
}
k.prototype.add = k.prototype.push = un;
k.prototype.has = ln;
var cn = k;
function fn(e, r) {
  for (var t = -1, a = e == null ? 0 : e.length; ++t < a; )
    if (r(e[t], t, e))
      return !0;
  return !1;
}
var vn = fn;
function dn(e, r) {
  return e.has(r);
}
var hn = dn, gn = cn, yn = vn, pn = hn, _n = 1, bn = 2;
function $n(e, r, t, a, s, n) {
  var i = t & _n, o = e.length, c = r.length;
  if (o != c && !(i && c > o))
    return !1;
  var l = n.get(e), y = n.get(r);
  if (l && y)
    return l == r && y == e;
  var g = -1, u = !0, v = t & bn ? new gn() : void 0;
  for (n.set(e, r), n.set(r, e); ++g < o; ) {
    var f = e[g], d = r[g];
    if (a)
      var _ = i ? a(d, f, g, r, e, n) : a(f, d, g, e, r, n);
    if (_ !== void 0) {
      if (_)
        continue;
      u = !1;
      break;
    }
    if (v) {
      if (!yn(r, function(p, $) {
        if (!pn(v, $) && (f === p || s(f, p, t, a, n)))
          return v.push($);
      })) {
        u = !1;
        break;
      }
    } else if (!(f === d || s(f, d, t, a, n))) {
      u = !1;
      break;
    }
  }
  return n.delete(e), n.delete(r), u;
}
var Be = $n, mn = A, An = mn.Uint8Array, Tn = An;
function jn(e) {
  var r = -1, t = Array(e.size);
  return e.forEach(function(a, s) {
    t[++r] = [s, a];
  }), t;
}
var Sn = jn;
function wn(e) {
  var r = -1, t = Array(e.size);
  return e.forEach(function(a) {
    t[++r] = a;
  }), t;
}
var On = wn, ye = ie, pe = Tn, Pn = Re, En = Be, Cn = Sn, In = On, Ln = 1, Dn = 2, Mn = "[object Boolean]", Gn = "[object Date]", xn = "[object Error]", Fn = "[object Map]", Rn = "[object Number]", qn = "[object RegExp]", kn = "[object Set]", zn = "[object String]", Nn = "[object Symbol]", Hn = "[object ArrayBuffer]", Un = "[object DataView]", _e = ye ? ye.prototype : void 0, Y = _e ? _e.valueOf : void 0;
function Bn(e, r, t, a, s, n, i) {
  switch (t) {
    case Un:
      if (e.byteLength != r.byteLength || e.byteOffset != r.byteOffset)
        return !1;
      e = e.buffer, r = r.buffer;
    case Hn:
      return !(e.byteLength != r.byteLength || !n(new pe(e), new pe(r)));
    case Mn:
    case Gn:
    case Rn:
      return Pn(+e, +r);
    case xn:
      return e.name == r.name && e.message == r.message;
    case qn:
    case zn:
      return e == r + "";
    case Fn:
      var o = Cn;
    case kn:
      var c = a & Ln;
      if (o || (o = In), e.size != r.size && !c)
        return !1;
      var l = i.get(e);
      if (l)
        return l == r;
      a |= Dn, i.set(e, r);
      var y = En(o(e), o(r), a, s, n, i);
      return i.delete(e), y;
    case Nn:
      if (Y)
        return Y.call(e) == Y.call(r);
  }
  return !1;
}
var Vn = Bn;
function Kn(e, r) {
  for (var t = -1, a = r.length, s = e.length; ++t < a; )
    e[s + t] = r[t];
  return e;
}
var Wn = Kn, Jn = Array.isArray, ue = Jn, Xn = Wn, Yn = ue;
function Zn(e, r, t) {
  var a = r(e);
  return Yn(e) ? a : Xn(a, t(e));
}
var Qn = Zn;
function es(e, r) {
  for (var t = -1, a = e == null ? 0 : e.length, s = 0, n = []; ++t < a; ) {
    var i = e[t];
    r(i, t, e) && (n[s++] = i);
  }
  return n;
}
var rs = es;
function ts() {
  return [];
}
var as = ts, ns = rs, ss = as, is = Object.prototype, os = is.propertyIsEnumerable, be = Object.getOwnPropertySymbols, us = be ? function(e) {
  return e == null ? [] : (e = Object(e), ns(be(e), function(r) {
    return os.call(e, r);
  }));
} : ss, ls = us;
function cs(e, r) {
  for (var t = -1, a = Array(e); ++t < e; )
    a[t] = r(t);
  return a;
}
var fs = cs;
function vs(e) {
  return e != null && typeof e == "object";
}
var J = vs, ds = V, hs = J, gs = "[object Arguments]";
function ys(e) {
  return hs(e) && ds(e) == gs;
}
var ps = ys, $e = ps, _s = J, Ve = Object.prototype, bs = Ve.hasOwnProperty, $s = Ve.propertyIsEnumerable, ms = $e(/* @__PURE__ */ function() {
  return arguments;
}()) ? $e : function(e) {
  return _s(e) && bs.call(e, "callee") && !$s.call(e, "callee");
}, As = ms, z = { exports: {} };
function Ts() {
  return !1;
}
var js = Ts;
z.exports;
(function(e, r) {
  var t = A, a = js, s = r && !r.nodeType && r, n = s && !0 && e && !e.nodeType && e, i = n && n.exports === s, o = i ? t.Buffer : void 0, c = o ? o.isBuffer : void 0, l = c || a;
  e.exports = l;
})(z, z.exports);
var Ke = z.exports, Ss = 9007199254740991, ws = /^(?:0|[1-9]\d*)$/;
function Os(e, r) {
  var t = typeof e;
  return r = r ?? Ss, !!r && (t == "number" || t != "symbol" && ws.test(e)) && e > -1 && e % 1 == 0 && e < r;
}
var Ps = Os, Es = 9007199254740991;
function Cs(e) {
  return typeof e == "number" && e > -1 && e % 1 == 0 && e <= Es;
}
var We = Cs, Is = V, Ls = We, Ds = J, Ms = "[object Arguments]", Gs = "[object Array]", xs = "[object Boolean]", Fs = "[object Date]", Rs = "[object Error]", qs = "[object Function]", ks = "[object Map]", zs = "[object Number]", Ns = "[object Object]", Hs = "[object RegExp]", Us = "[object Set]", Bs = "[object String]", Vs = "[object WeakMap]", Ks = "[object ArrayBuffer]", Ws = "[object DataView]", Js = "[object Float32Array]", Xs = "[object Float64Array]", Ys = "[object Int8Array]", Zs = "[object Int16Array]", Qs = "[object Int32Array]", ei = "[object Uint8Array]", ri = "[object Uint8ClampedArray]", ti = "[object Uint16Array]", ai = "[object Uint32Array]", h = {};
h[Js] = h[Xs] = h[Ys] = h[Zs] = h[Qs] = h[ei] = h[ri] = h[ti] = h[ai] = !0;
h[Ms] = h[Gs] = h[Ks] = h[xs] = h[Ws] = h[Fs] = h[Rs] = h[qs] = h[ks] = h[zs] = h[Ns] = h[Hs] = h[Us] = h[Bs] = h[Vs] = !1;
function ni(e) {
  return Ds(e) && Ls(e.length) && !!h[Is(e)];
}
var si = ni;
function ii(e) {
  return function(r) {
    return e(r);
  };
}
var oi = ii, N = { exports: {} };
N.exports;
(function(e, r) {
  var t = qe, a = r && !r.nodeType && r, s = a && !0 && e && !e.nodeType && e, n = s && s.exports === a, i = n && t.process, o = function() {
    try {
      var c = s && s.require && s.require("util").types;
      return c || i && i.binding && i.binding("util");
    } catch {
    }
  }();
  e.exports = o;
})(N, N.exports);
var ui = N.exports, li = si, ci = oi, me = ui, Ae = me && me.isTypedArray, fi = Ae ? ci(Ae) : li, Je = fi, vi = fs, di = As, hi = ue, gi = Ke, yi = Ps, pi = Je, _i = Object.prototype, bi = _i.hasOwnProperty;
function $i(e, r) {
  var t = hi(e), a = !t && di(e), s = !t && !a && gi(e), n = !t && !a && !s && pi(e), i = t || a || s || n, o = i ? vi(e.length, String) : [], c = o.length;
  for (var l in e)
    (r || bi.call(e, l)) && !(i && // Safari 9 has enumerable `arguments.length` in strict mode.
    (l == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    s && (l == "offset" || l == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    n && (l == "buffer" || l == "byteLength" || l == "byteOffset") || // Skip index properties.
    yi(l, c))) && o.push(l);
  return o;
}
var mi = $i, Ai = Object.prototype;
function Ti(e) {
  var r = e && e.constructor, t = typeof r == "function" && r.prototype || Ai;
  return e === t;
}
var ji = Ti;
function Si(e, r) {
  return function(t) {
    return e(r(t));
  };
}
var wi = Si, Oi = wi, Pi = Oi(Object.keys, Object), Ei = Pi, Ci = ji, Ii = Ei, Li = Object.prototype, Di = Li.hasOwnProperty;
function Mi(e) {
  if (!Ci(e))
    return Ii(e);
  var r = [];
  for (var t in Object(e))
    Di.call(e, t) && t != "constructor" && r.push(t);
  return r;
}
var Gi = Mi, xi = Ne, Fi = We;
function Ri(e) {
  return e != null && Fi(e.length) && !xi(e);
}
var qi = Ri, ki = mi, zi = Gi, Ni = qi;
function Hi(e) {
  return Ni(e) ? ki(e) : zi(e);
}
var Ui = Hi, Bi = Qn, Vi = ls, Ki = Ui;
function Wi(e) {
  return Bi(e, Ki, Vi);
}
var Ji = Wi, Te = Ji, Xi = 1, Yi = Object.prototype, Zi = Yi.hasOwnProperty;
function Qi(e, r, t, a, s, n) {
  var i = t & Xi, o = Te(e), c = o.length, l = Te(r), y = l.length;
  if (c != y && !i)
    return !1;
  for (var g = c; g--; ) {
    var u = o[g];
    if (!(i ? u in r : Zi.call(r, u)))
      return !1;
  }
  var v = n.get(e), f = n.get(r);
  if (v && f)
    return v == r && f == e;
  var d = !0;
  n.set(e, r), n.set(r, e);
  for (var _ = i; ++g < c; ) {
    u = o[g];
    var p = e[u], $ = r[u];
    if (a)
      var L = i ? a($, p, u, r, e, n) : a(p, $, u, e, r, n);
    if (!(L === void 0 ? p === $ || s(p, $, t, a, n) : L)) {
      d = !1;
      break;
    }
    _ || (_ = u == "constructor");
  }
  if (d && !_) {
    var M = e.constructor, G = r.constructor;
    M != G && "constructor" in e && "constructor" in r && !(typeof M == "function" && M instanceof M && typeof G == "function" && G instanceof G) && (d = !1);
  }
  return n.delete(e), n.delete(r), d;
}
var eo = Qi, ro = w, to = A, ao = ro(to, "DataView"), no = ao, so = w, io = A, oo = so(io, "Promise"), uo = oo, lo = w, co = A, fo = lo(co, "Set"), vo = fo, ho = w, go = A, yo = ho(go, "WeakMap"), po = yo, ee = no, re = oe, te = uo, ae = vo, ne = po, Xe = V, C = He, je = "[object Map]", _o = "[object Object]", Se = "[object Promise]", we = "[object Set]", Oe = "[object WeakMap]", Pe = "[object DataView]", bo = C(ee), $o = C(re), mo = C(te), Ao = C(ae), To = C(ne), T = Xe;
(ee && T(new ee(new ArrayBuffer(1))) != Pe || re && T(new re()) != je || te && T(te.resolve()) != Se || ae && T(new ae()) != we || ne && T(new ne()) != Oe) && (T = function(e) {
  var r = Xe(e), t = r == _o ? e.constructor : void 0, a = t ? C(t) : "";
  if (a)
    switch (a) {
      case bo:
        return Pe;
      case $o:
        return je;
      case mo:
        return Se;
      case Ao:
        return we;
      case To:
        return Oe;
    }
  return r;
});
var jo = T, Z = en, So = Be, wo = Vn, Oo = eo, Ee = jo, Ce = ue, Ie = Ke, Po = Je, Eo = 1, Le = "[object Arguments]", De = "[object Array]", F = "[object Object]", Co = Object.prototype, Me = Co.hasOwnProperty;
function Io(e, r, t, a, s, n) {
  var i = Ce(e), o = Ce(r), c = i ? De : Ee(e), l = o ? De : Ee(r);
  c = c == Le ? F : c, l = l == Le ? F : l;
  var y = c == F, g = l == F, u = c == l;
  if (u && Ie(e)) {
    if (!Ie(r))
      return !1;
    i = !0, y = !1;
  }
  if (u && !y)
    return n || (n = new Z()), i || Po(e) ? So(e, r, t, a, s, n) : wo(e, r, c, t, a, s, n);
  if (!(t & Eo)) {
    var v = y && Me.call(e, "__wrapped__"), f = g && Me.call(r, "__wrapped__");
    if (v || f) {
      var d = v ? e.value() : e, _ = f ? r.value() : r;
      return n || (n = new Z()), s(d, _, t, a, n);
    }
  }
  return u ? (n || (n = new Z()), Oo(e, r, t, a, s, n)) : !1;
}
var Lo = Io, Do = Lo, Ge = J;
function Ye(e, r, t, a, s) {
  return e === r ? !0 : e == null || r == null || !Ge(e) && !Ge(r) ? e !== e && r !== r : Do(e, r, t, a, Ye, s);
}
var Mo = Ye, Go = Mo;
function xo(e, r) {
  return Go(e, r);
}
var Fo = xo;
const Ro = /* @__PURE__ */ ur(Fo);
function qo(e, r) {
  return Object.is(e, r);
}
function H(e, r, t = Object.is) {
  if (Object.is(e, r)) return !0;
  if (typeof e != "object" || e === null || typeof r != "object" || r === null) return !1;
  const a = Object.keys(e), s = Object.keys(r);
  if (a.length !== s.length) return !1;
  for (const n of a)
    if (!Object.prototype.hasOwnProperty.call(r, n) || !t(e[n], r[n])) return !1;
  return !0;
}
function Ze(e, r) {
  return H(e, r, H);
}
function ko(e, r) {
  return H(e, r, Ze);
}
const zo = Ro;
function No(e) {
  return !e || e === "strict" ? qo : e === "shallow" ? H : e === "shallow2" ? Ze : e === "shallow3" ? ko : e === "deep" ? zo : e;
}
function xe(e) {
  const r = e;
  let t = e;
  return Object.assign(
    (...a) => t(...a),
    {
      getOriginal: () => r,
      getCurrent: () => t,
      setCurrent(a) {
        t = a;
      }
    }
  );
}
function Ho(e) {
  return typeof e == "function" && "getOriginal" in e && "getCurrent" in e && "setCurrent" in e;
}
function Yo(e, r, t) {
  return e ? typeof r == "function" ? Ho(e.value) ? (e.value.setCurrent(r), [e.value, !0]) : [xe(r), !1] : r && r instanceof Date ? e.value && e.value instanceof Date && r.getTime() === e.value.getTime() ? [e.value, !0] : [r, !1] : t(e.value, r) ? [e.value, !0] : [r, !1] : typeof r == "function" ? [xe(r), !1] : [r, !1];
}
const se = q((e) => e());
function Qe(e = {}) {
  const r = or(), t = No(e.equals), a = e.hasFallback ?? !1, s = e.fallback;
  let n, i = !1, o, c = Promise.resolve(void 0), l = 0, y, g = !1;
  const u = () => {
    r.forEach((d) => {
      se.current(d);
    });
  }, v = () => n === void 0 && !i && o === void 0;
  return {
    getValue: () => a && (i || o !== void 0) ? y ?? s : n,
    getLoading: () => i,
    getError: () => o,
    getPromise: () => c,
    getVersion: () => l,
    isVersionStale: (d) => d !== l,
    stale: () => a && (i || o !== void 0),
    isDirty: () => g,
    markDirty: () => {
      g = !0;
    },
    clearDirty: () => {
      g = !1;
    },
    setValue: (d, _ = !1) => {
      n !== void 0 && t(d, n) && !i && o === void 0 || (n = d, i = !1, o = void 0, c = Promise.resolve(d), l++, y = d, _ || u());
    },
    setLoading: (d, _ = !1) => {
      n = void 0, i = !0, o = void 0, c = d, l++, _ || u();
    },
    setError: (d, _ = !1) => {
      Object.is(o, d) && !i && n === void 0 || (n = void 0, i = !1, o = d, l++, _ || u());
    },
    reset: () => {
      v() && y === void 0 && !g || (n = void 0, i = !1, o = void 0, c = Promise.resolve(void 0), l++, y = void 0, g = !1, u());
    },
    on: r.on
  };
}
const le = Symbol.for("atomirx.atom");
function er(e) {
  return Object.assign(e, {
    use(r) {
      const t = r(e);
      return t ? typeof t == "object" || typeof t == "function" ? "use" in t ? t : er(t) : t : e;
    }
  });
}
function Zo(e, r = {}) {
  var g;
  const t = "fallback" in r, a = r.fallback, s = Qe({
    equals: r.equals,
    fallback: a,
    hasFallback: t
  });
  let n = !1;
  const i = (u) => {
    const v = s.getVersion();
    u.then(
      (f) => {
        s.isVersionStale(v) || s.setValue(f);
      },
      (f) => {
        s.isVersionStale(v) || s.setError(f);
      }
    );
  }, o = (u) => typeof u == "function" && !j(u), c = () => {
    if (!n) {
      if (n = !0, o(e))
        try {
          const u = e();
          if (j(u)) {
            s.setLoading(u, !0), i(u);
            return;
          }
          s.setValue(u, !0);
          return;
        } catch (u) {
          s.setError(u, !0);
          return;
        }
      if (j(e)) {
        s.setLoading(e, !0), i(e);
        return;
      }
      s.setValue(e, !0);
    }
  }, l = (u) => {
    c();
    const v = s.getValue(), f = s.getLoading(), d = s.getError(), _ = s.getPromise();
    if (typeof u == "function")
      try {
        const p = u;
        if (f) {
          const L = _.then(p);
          s.setLoading(L), i(L);
          return;
        }
        if (d)
          return;
        const $ = p(v);
        s.setValue($), s.markDirty();
        return;
      } catch (p) {
        s.setError(p);
        return;
      }
    if (j(u)) {
      s.setLoading(u), i(u);
      return;
    }
    s.setValue(u), s.markDirty();
  }, y = er({
    [le]: !0,
    key: r.key,
    meta: r.meta,
    /**
     * Current value.
     * - Without fallback: undefined while loading or on error
     * - With fallback: returns fallback/previous value during loading/error
     */
    get value() {
      return c(), s.getValue();
    },
    /** Whether the atom is waiting for a Promise to resolve */
    get loading() {
      return c(), s.getLoading();
    },
    /** Error from rejected Promise (undefined if no error) */
    get error() {
      return c(), s.getError();
    },
    /**
     * Returns true if fallback mode is enabled AND atom is in loading or error state.
     * When stale() returns true, `value` returns the fallback or previous resolved value.
     */
    stale() {
      return c(), s.stale();
    },
    /**
     * Returns true if the value has been changed by set() since creation or last reset().
     * Useful for tracking if the atom has been modified from its initial state.
     */
    dirty() {
      return s.isDirty();
    },
    /**
     * Makes the atom thenable (awaitable).
     * Allows: `const value = await atom;`
     */
    then(u, v) {
      return c(), s.getPromise().then(u, v);
    },
    set: l,
    /**
     * Resets the atom to its initial state.
     * Re-evaluates the initial value on next access.
     */
    reset() {
      n && (n = !1, s.reset());
    },
    /** Subscribe to value changes */
    on: s.on
  });
  return (g = m.current) == null || g.call(m, {
    type: "mutable",
    key: r.key,
    meta: r.meta,
    atom: y
  }), y;
}
function I(e) {
  try {
    return {
      status: "resolved",
      value: e(),
      error: void 0,
      promise: void 0
    };
  } catch (r) {
    return j(r) ? {
      status: "loading",
      value: void 0,
      error: void 0,
      promise: r
    } : {
      status: "rejected",
      value: void 0,
      error: r,
      promise: void 0
    };
  }
}
class Q extends Error {
  constructor(t, a = "All getters rejected") {
    super(a);
    b(this, "errors");
    this.name = "AllGettersRejectedError", this.errors = t;
  }
}
function Uo(e, r) {
  return new Promise((t, a) => {
    if (e.length === 0) {
      a(r([]));
      return;
    }
    const s = new Array(e.length);
    let n = 0;
    e.forEach((i, o) => {
      Promise.resolve(i).then(t, (c) => {
        s[o] = c, n++, n === e.length && a(r(s));
      });
    });
  });
}
function Qo(e) {
  const r = Object.keys(e);
  if (r.length === 0)
    return;
  const t = [];
  for (const a of r) {
    const s = I(e[a]);
    if (s.status === "resolved")
      return [a, s.value];
    if (s.status === "rejected")
      throw s.error;
    t.push(s.promise);
  }
  throw Promise.race(t);
}
function eu(e) {
  return Array.isArray(e) ? Bo(e) : Vo(e);
}
function Bo(e) {
  if (e.length === 0)
    return [];
  const r = [], t = [];
  let a, s = !1;
  for (const n of e) {
    const i = I(n);
    i.status === "resolved" ? r.push(i.value) : i.status === "rejected" ? s || (a = i.error, s = !0) : t.push(i.promise);
  }
  if (s)
    throw a;
  if (t.length > 0)
    throw Promise.all(t);
  return r;
}
function Vo(e) {
  const r = Object.keys(e);
  if (r.length === 0)
    return {};
  const t = {}, a = [];
  let s, n = !1;
  for (const i of r) {
    const o = I(e[i]);
    o.status === "resolved" ? t[i] = o.value : o.status === "rejected" ? n || (s = o.error, n = !0) : a.push(o.promise);
  }
  if (n)
    throw s;
  if (a.length > 0)
    throw Promise.all(a);
  return t;
}
function ru(e) {
  const r = Object.keys(e);
  if (r.length === 0)
    throw new Q({});
  const t = {}, a = [];
  for (const s of r) {
    const n = I(e[s]);
    if (n.status === "resolved")
      return [s, n.value];
    n.status === "rejected" ? t[s] = n.error : a.push(n.promise);
  }
  throw a.length > 0 ? Uo(a, (s) => {
    const n = {};
    return s.forEach((i, o) => {
      n[r[o] || String(o)] = i;
    }), new Q(n);
  }) : new Q(t);
}
function tu(e) {
  return Array.isArray(e) ? Ko(e) : Wo(e);
}
function Ko(e) {
  if (e.length === 0)
    return [];
  const r = [], t = [];
  for (const a of e) {
    const s = I(a);
    s.status === "resolved" ? r.push({ status: "resolved", value: s.value }) : s.status === "rejected" ? r.push({ status: "rejected", error: s.error }) : t.push(s.promise);
  }
  if (t.length > 0)
    throw Promise.all(t);
  return r;
}
function Wo(e) {
  const r = Object.keys(e);
  if (r.length === 0)
    return {};
  const t = {}, a = [];
  for (const s of r) {
    const n = I(e[s]);
    n.status === "resolved" ? t[s] = { status: "resolved", value: n.value } : n.status === "rejected" ? t[s] = { status: "rejected", error: n.error } : a.push(n.promise);
  }
  if (a.length > 0)
    throw Promise.all(a);
  return t;
}
let R = 0;
function au(e) {
  if (R++, R === 1) {
    let r = /* @__PURE__ */ new Set();
    const t = (a) => {
      r.add(a);
    };
    try {
      return q.use([se(t)], e);
    } finally {
      R--, q.use([se(t)], () => {
        for (; r.size > 0; ) {
          const a = r;
          r = /* @__PURE__ */ new Set();
          for (const s of a)
            s();
        }
      });
    }
  }
  try {
    return e();
  } finally {
    R--;
  }
}
function nu(e, r) {
  let t, a;
  const s = (o) => {
    o && typeof o == "object" && "dispose" in o && typeof o.dispose == "function" && o.dispose();
  }, n = () => {
    s(t), t = void 0;
  };
  return Object.assign(() => {
    var o;
    return t || (a ? t = a(e) : t = e(), (o = m.current) == null || o.call(m, {
      type: "module",
      key: r == null ? void 0 : r.key,
      meta: r == null ? void 0 : r.meta,
      module: t
    })), t;
  }, {
    key: r == null ? void 0 : r.key,
    override: (o) => {
      if (t !== void 0)
        throw new Error(
          "Cannot override after initialization. Call override() before accessing the service."
        );
      a = o;
    },
    reset: () => {
      a = void 0, n();
    },
    invalidate: () => {
      a = void 0, n();
    },
    isOverridden: () => a !== void 0,
    isInitialized: () => t !== void 0
  });
}
function Fe(e) {
  return e && typeof e == "object" && e[le] === !0;
}
function Jo(e, r) {
  const t = /* @__PURE__ */ new Set(), a = (n) => () => {
    if (t.add(n), n.stale())
      return n.value;
    if (n.loading)
      throw n;
    if (n.error !== void 0)
      throw n.error;
    return n.value;
  };
  let s;
  Fe(e) ? s = a(e) : s = e.map((i) => a(i));
  try {
    let n;
    return Fe(e) ? n = r(s) : n = r(...s), {
      value: n,
      error: void 0,
      promise: void 0,
      dependencies: t
    };
  } catch (n) {
    return j(n) ? {
      value: void 0,
      error: void 0,
      promise: n,
      dependencies: t
    } : {
      value: void 0,
      error: n,
      promise: void 0,
      dependencies: t
    };
  }
}
function su(e, r, t) {
  var g;
  const a = Qe();
  let s = null, n = !1;
  const i = /* @__PURE__ */ new Map(), o = (u) => {
    for (const [v, f] of i)
      u.has(v) || (f(), i.delete(v));
    for (const v of u)
      if (!i.has(v)) {
        const f = v.on(() => {
          c();
        });
        i.set(v, f);
      }
  }, c = (u = !1) => {
    const v = a.getVersion(), f = Jo(e, r);
    o(f.dependencies), f.promise !== void 0 ? (s = f.promise, f.promise.then(
      () => {
        a.isVersionStale(v) || c();
      },
      (d) => {
        a.isVersionStale(v) || (s = null, a.setError(d));
      }
    ), u || a.setLoading(f.promise, u)) : f.error !== void 0 ? (s = null, a.setError(f.error, u)) : (s = null, a.setValue(f.value, u));
  }, l = () => {
    n || (n = !0, c(!0));
  }, y = {
    [le]: !0,
    key: void 0,
    meta: t == null ? void 0 : t.meta,
    get value() {
      return l(), a.getValue();
    },
    get loading() {
      return l(), s !== null;
    },
    get error() {
      return l(), a.getError();
    },
    /**
     * Derived atoms don't have fallback mode, so stale() always returns false.
     * This method exists for API consistency with mutable atoms.
     */
    stale() {
      return !1;
    },
    then(u, v) {
      if (l(), s !== null) {
        const _ = a.getVersion();
        return s.then(
          () => {
            a.isVersionStale(_) && c();
            const p = a.getError();
            if (p !== void 0)
              return v ? v(p) : Promise.reject(p);
            const $ = a.getValue();
            return u ? u($) : $;
          },
          (p) => v ? v(p) : Promise.reject(p)
        );
      }
      const f = a.getError();
      if (f !== void 0)
        return v ? Promise.resolve(v(f)) : Promise.reject(f);
      const d = a.getValue();
      return u ? Promise.resolve(u(d)) : Promise.resolve(d);
    },
    on(u) {
      return l(), a.on(u);
    }
  };
  return (g = m.current) == null || g.call(m, {
    type: "derived",
    key: void 0,
    meta: t == null ? void 0 : t.meta,
    atom: y
  }), y;
}
export {
  Q as A,
  j as a,
  H as b,
  Zo as c,
  eu as d,
  ru as e,
  Qo as f,
  I as g,
  tu as h,
  Fe as i,
  au as j,
  nu as k,
  su as l,
  or as m,
  No as r,
  Jo as s,
  Yo as t
};

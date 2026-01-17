import $e, { useRef as k, useCallback as q, useSyncExternalStore as gr, useReducer as hr, useEffect as ke, memo as mr } from "react";
import { r as ne, s as Ae, t as De, i as _r, a as Sr, b as Tr } from "../index-C_7wxZ9w.js";
import { A as Wr, d as Yr, e as Lr, c as Ur, j as Vr, k as Mr, l as qr, m as Nr, g as zr, f as Br, h as Jr } from "../index-C_7wxZ9w.js";
function We(u, c, _) {
  const y = ne(_ ?? "shallow"), O = c ?? ((l) => l()), p = k(u), v = k(O), i = k(y);
  p.current = u, v.current = O, i.current = y;
  const C = k(/* @__PURE__ */ new Map()), f = k(/* @__PURE__ */ new Set()), g = k({
    value: void 0,
    initialized: !1
  }), S = q(() => {
    const l = Ae(p.current, v.current);
    if (f.current = l.dependencies, l.promise !== void 0)
      throw l.promise;
    if (l.error !== void 0)
      throw l.error;
    const h = l.value;
    return (!g.current.initialized || !i.current(h, g.current.value)) && (g.current = { value: h, initialized: !0 }), g.current.value;
  }, []), A = q((l) => {
    const h = C.current, x = () => {
      const m = f.current;
      for (const [b, Y] of h)
        m.has(b) || (Y(), h.delete(b));
      for (const b of m)
        if (!h.has(b)) {
          const Y = b.on(() => {
            const G = Ae(p.current, v.current);
            f.current = G.dependencies, x(), l();
          });
          h.set(b, Y);
        }
    };
    return x(), () => {
      for (const m of h.values())
        m();
      h.clear();
    };
  }, []);
  return gr(A, S, S);
}
function Or(u) {
  return u == null ? "strict" : Array.isArray(u) ? "shallow" : u instanceof Date ? "deep" : typeof u == "object" ? "shallow" : "strict";
}
function Ar(u, c) {
  const _ = k({}), y = k(null);
  y.current === null && (y.current = {});
  const j = _.current, O = y.current;
  for (const p of Object.keys(u)) {
    const v = u[p], i = j[p];
    if (typeof v == "function") {
      const [S] = De(
        i,
        v,
        () => !1
        // Equality doesn't matter for functions
      );
      j[p] = { value: S }, O[p] = S;
      continue;
    }
    const C = c == null ? void 0 : c[p], f = C ? ne(C) : ne(Or(v)), [g] = De(
      i,
      v,
      f
    );
    j[p] = { value: g }, O[p] = g;
  }
  for (const p of Object.keys(j))
    p in u || (delete j[p], delete O[p]);
  return O;
}
const Ye = {
  status: "idle",
  result: void 0,
  error: void 0
}, Le = {
  status: "loading",
  result: void 0,
  error: void 0
};
function Cr(u, c) {
  switch (c.type) {
    case "START":
      return Le;
    case "SUCCESS":
      return {
        status: "success",
        result: c.result,
        error: void 0
      };
    case "ERROR":
      return {
        status: "error",
        result: void 0,
        error: c.error
      };
    case "RESET":
      return Ye;
    default:
      return u;
  }
}
function Dr(u, c = {}) {
  const { lazy: _ = !0, exclusive: y = !0, deps: j = [] } = c, O = _ ? Ye : Le, [p, v] = hr(Cr, O), i = k(null), C = k(u);
  C.current = u;
  const f = q(() => {
    const l = i.current;
    return l ? (l.abort(), i.current = null, !0) : !1;
  }, []), g = We(
    (_ ? [] : c.deps ?? []).filter(_r),
    (...l) => l.map((h) => h())
  ), S = q(() => {
    y && f();
    const l = new AbortController();
    i.current = l, v({ type: "START" });
    let h;
    try {
      h = C.current({ signal: l.signal });
    } catch (x) {
      return v({ type: "ERROR", error: x }), Object.assign(Promise.reject(x), {
        abort: () => l.abort()
      });
    }
    if (Sr(h)) {
      const x = h;
      return x.then(
        (m) => {
          i.current === l && v({ type: "SUCCESS", result: m });
        },
        (m) => {
          if (m instanceof DOMException && m.name === "AbortError") {
            (i.current === null || i.current === l) && v({ type: "ERROR", error: m });
            return;
          }
          i.current === l && v({ type: "ERROR", error: m });
        }
      ), Object.assign(x, {
        abort: () => {
          l.abort(), i.current === l && (i.current = null);
        }
      });
    }
    return v({ type: "SUCCESS", result: h }), Object.assign(Promise.resolve(h), {
      abort: () => l.abort()
    });
  }, [y, f]);
  ke(() => {
    _ || S();
  }, [_, g, ...j]), ke(() => () => {
    y && f();
  }, [y, f]);
  const A = q(() => {
    y && f(), v({ type: "RESET" });
  }, [y, f]);
  return Object.assign(S, {
    ...p,
    abort: f,
    reset: A
  });
}
var ae = { exports: {} }, V = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Fe;
function wr() {
  if (Fe) return V;
  Fe = 1;
  var u = $e, c = Symbol.for("react.element"), _ = Symbol.for("react.fragment"), y = Object.prototype.hasOwnProperty, j = u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, O = { key: !0, ref: !0, __self: !0, __source: !0 };
  function p(v, i, C) {
    var f, g = {}, S = null, A = null;
    C !== void 0 && (S = "" + C), i.key !== void 0 && (S = "" + i.key), i.ref !== void 0 && (A = i.ref);
    for (f in i) y.call(i, f) && !O.hasOwnProperty(f) && (g[f] = i[f]);
    if (v && v.defaultProps) for (f in i = v.defaultProps, i) g[f] === void 0 && (g[f] = i[f]);
    return { $$typeof: c, type: v, key: S, ref: A, props: g, _owner: j.current };
  }
  return V.Fragment = _, V.jsx = p, V.jsxs = p, V;
}
var M = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ie;
function jr() {
  return Ie || (Ie = 1, process.env.NODE_ENV !== "production" && function() {
    var u = $e, c = Symbol.for("react.element"), _ = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), j = Symbol.for("react.strict_mode"), O = Symbol.for("react.profiler"), p = Symbol.for("react.provider"), v = Symbol.for("react.context"), i = Symbol.for("react.forward_ref"), C = Symbol.for("react.suspense"), f = Symbol.for("react.suspense_list"), g = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), A = Symbol.for("react.offscreen"), l = Symbol.iterator, h = "@@iterator";
    function x(e) {
      if (e === null || typeof e != "object")
        return null;
      var r = l && e[l] || e[h];
      return typeof r == "function" ? r : null;
    }
    var m = u.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function b(e) {
      {
        for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
          t[n - 1] = arguments[n];
        Y("error", e, t);
      }
    }
    function Y(e, r, t) {
      {
        var n = m.ReactDebugCurrentFrame, s = n.getStackAddendum();
        s !== "" && (r += "%s", t = t.concat([s]));
        var d = t.map(function(o) {
          return String(o);
        });
        d.unshift("Warning: " + r), Function.prototype.apply.call(console[e], console, d);
      }
    }
    var G = !1, Ue = !1, Ve = !1, Me = !1, qe = !1, ie;
    ie = Symbol.for("react.module.reference");
    function Ne(e) {
      return !!(typeof e == "string" || typeof e == "function" || e === y || e === O || qe || e === j || e === C || e === f || Me || e === A || G || Ue || Ve || typeof e == "object" && e !== null && (e.$$typeof === S || e.$$typeof === g || e.$$typeof === p || e.$$typeof === v || e.$$typeof === i || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      e.$$typeof === ie || e.getModuleId !== void 0));
    }
    function ze(e, r, t) {
      var n = e.displayName;
      if (n)
        return n;
      var s = r.displayName || r.name || "";
      return s !== "" ? t + "(" + s + ")" : t;
    }
    function se(e) {
      return e.displayName || "Context";
    }
    function D(e) {
      if (e == null)
        return null;
      if (typeof e.tag == "number" && b("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof e == "function")
        return e.displayName || e.name || null;
      if (typeof e == "string")
        return e;
      switch (e) {
        case y:
          return "Fragment";
        case _:
          return "Portal";
        case O:
          return "Profiler";
        case j:
          return "StrictMode";
        case C:
          return "Suspense";
        case f:
          return "SuspenseList";
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case v:
            var r = e;
            return se(r) + ".Consumer";
          case p:
            var t = e;
            return se(t._context) + ".Provider";
          case i:
            return ze(e, e.render, "ForwardRef");
          case g:
            var n = e.displayName || null;
            return n !== null ? n : D(e.type) || "Memo";
          case S: {
            var s = e, d = s._payload, o = s._init;
            try {
              return D(o(d));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var F = Object.assign, L = 0, ue, ce, le, fe, de, ve, pe;
    function be() {
    }
    be.__reactDisabledLog = !0;
    function Be() {
      {
        if (L === 0) {
          ue = console.log, ce = console.info, le = console.warn, fe = console.error, de = console.group, ve = console.groupCollapsed, pe = console.groupEnd;
          var e = {
            configurable: !0,
            enumerable: !0,
            value: be,
            writable: !0
          };
          Object.defineProperties(console, {
            info: e,
            log: e,
            warn: e,
            error: e,
            group: e,
            groupCollapsed: e,
            groupEnd: e
          });
        }
        L++;
      }
    }
    function Je() {
      {
        if (L--, L === 0) {
          var e = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: F({}, e, {
              value: ue
            }),
            info: F({}, e, {
              value: ce
            }),
            warn: F({}, e, {
              value: le
            }),
            error: F({}, e, {
              value: fe
            }),
            group: F({}, e, {
              value: de
            }),
            groupCollapsed: F({}, e, {
              value: ve
            }),
            groupEnd: F({}, e, {
              value: pe
            })
          });
        }
        L < 0 && b("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var K = m.ReactCurrentDispatcher, X;
    function N(e, r, t) {
      {
        if (X === void 0)
          try {
            throw Error();
          } catch (s) {
            var n = s.stack.trim().match(/\n( *(at )?)/);
            X = n && n[1] || "";
          }
        return `
` + X + e;
      }
    }
    var H = !1, z;
    {
      var Ge = typeof WeakMap == "function" ? WeakMap : Map;
      z = new Ge();
    }
    function Re(e, r) {
      if (!e || H)
        return "";
      {
        var t = z.get(e);
        if (t !== void 0)
          return t;
      }
      var n;
      H = !0;
      var s = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var d;
      d = K.current, K.current = null, Be();
      try {
        if (r) {
          var o = function() {
            throw Error();
          };
          if (Object.defineProperty(o.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(o, []);
            } catch (w) {
              n = w;
            }
            Reflect.construct(e, [], o);
          } else {
            try {
              o.call();
            } catch (w) {
              n = w;
            }
            e.call(o.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (w) {
            n = w;
          }
          e();
        }
      } catch (w) {
        if (w && n && typeof w.stack == "string") {
          for (var a = w.stack.split(`
`), T = n.stack.split(`
`), R = a.length - 1, E = T.length - 1; R >= 1 && E >= 0 && a[R] !== T[E]; )
            E--;
          for (; R >= 1 && E >= 0; R--, E--)
            if (a[R] !== T[E]) {
              if (R !== 1 || E !== 1)
                do
                  if (R--, E--, E < 0 || a[R] !== T[E]) {
                    var P = `
` + a[R].replace(" at new ", " at ");
                    return e.displayName && P.includes("<anonymous>") && (P = P.replace("<anonymous>", e.displayName)), typeof e == "function" && z.set(e, P), P;
                  }
                while (R >= 1 && E >= 0);
              break;
            }
        }
      } finally {
        H = !1, K.current = d, Je(), Error.prepareStackTrace = s;
      }
      var W = e ? e.displayName || e.name : "", I = W ? N(W) : "";
      return typeof e == "function" && z.set(e, I), I;
    }
    function Ke(e, r, t) {
      return Re(e, !1);
    }
    function Xe(e) {
      var r = e.prototype;
      return !!(r && r.isReactComponent);
    }
    function B(e, r, t) {
      if (e == null)
        return "";
      if (typeof e == "function")
        return Re(e, Xe(e));
      if (typeof e == "string")
        return N(e);
      switch (e) {
        case C:
          return N("Suspense");
        case f:
          return N("SuspenseList");
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case i:
            return Ke(e.render);
          case g:
            return B(e.type, r, t);
          case S: {
            var n = e, s = n._payload, d = n._init;
            try {
              return B(d(s), r, t);
            } catch {
            }
          }
        }
      return "";
    }
    var U = Object.prototype.hasOwnProperty, ye = {}, Ee = m.ReactDebugCurrentFrame;
    function J(e) {
      if (e) {
        var r = e._owner, t = B(e.type, e._source, r ? r.type : null);
        Ee.setExtraStackFrame(t);
      } else
        Ee.setExtraStackFrame(null);
    }
    function He(e, r, t, n, s) {
      {
        var d = Function.call.bind(U);
        for (var o in e)
          if (d(e, o)) {
            var a = void 0;
            try {
              if (typeof e[o] != "function") {
                var T = Error((n || "React class") + ": " + t + " type `" + o + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof e[o] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw T.name = "Invariant Violation", T;
              }
              a = e[o](r, o, n, t, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (R) {
              a = R;
            }
            a && !(a instanceof Error) && (J(s), b("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", n || "React class", t, o, typeof a), J(null)), a instanceof Error && !(a.message in ye) && (ye[a.message] = !0, J(s), b("Failed %s type: %s", t, a.message), J(null));
          }
      }
    }
    var Ze = Array.isArray;
    function Z(e) {
      return Ze(e);
    }
    function Qe(e) {
      {
        var r = typeof Symbol == "function" && Symbol.toStringTag, t = r && e[Symbol.toStringTag] || e.constructor.name || "Object";
        return t;
      }
    }
    function er(e) {
      try {
        return ge(e), !1;
      } catch {
        return !0;
      }
    }
    function ge(e) {
      return "" + e;
    }
    function he(e) {
      if (er(e))
        return b("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", Qe(e)), ge(e);
    }
    var me = m.ReactCurrentOwner, rr = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, _e, Se;
    function tr(e) {
      if (U.call(e, "ref")) {
        var r = Object.getOwnPropertyDescriptor(e, "ref").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.ref !== void 0;
    }
    function nr(e) {
      if (U.call(e, "key")) {
        var r = Object.getOwnPropertyDescriptor(e, "key").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.key !== void 0;
    }
    function ar(e, r) {
      typeof e.ref == "string" && me.current;
    }
    function or(e, r) {
      {
        var t = function() {
          _e || (_e = !0, b("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "key", {
          get: t,
          configurable: !0
        });
      }
    }
    function ir(e, r) {
      {
        var t = function() {
          Se || (Se = !0, b("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "ref", {
          get: t,
          configurable: !0
        });
      }
    }
    var sr = function(e, r, t, n, s, d, o) {
      var a = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: c,
        // Built-in properties that belong on the element
        type: e,
        key: r,
        ref: t,
        props: o,
        // Record the component responsible for creating this element.
        _owner: d
      };
      return a._store = {}, Object.defineProperty(a._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(a, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: n
      }), Object.defineProperty(a, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: s
      }), Object.freeze && (Object.freeze(a.props), Object.freeze(a)), a;
    };
    function ur(e, r, t, n, s) {
      {
        var d, o = {}, a = null, T = null;
        t !== void 0 && (he(t), a = "" + t), nr(r) && (he(r.key), a = "" + r.key), tr(r) && (T = r.ref, ar(r, s));
        for (d in r)
          U.call(r, d) && !rr.hasOwnProperty(d) && (o[d] = r[d]);
        if (e && e.defaultProps) {
          var R = e.defaultProps;
          for (d in R)
            o[d] === void 0 && (o[d] = R[d]);
        }
        if (a || T) {
          var E = typeof e == "function" ? e.displayName || e.name || "Unknown" : e;
          a && or(o, E), T && ir(o, E);
        }
        return sr(e, a, T, s, n, me.current, o);
      }
    }
    var Q = m.ReactCurrentOwner, Te = m.ReactDebugCurrentFrame;
    function $(e) {
      if (e) {
        var r = e._owner, t = B(e.type, e._source, r ? r.type : null);
        Te.setExtraStackFrame(t);
      } else
        Te.setExtraStackFrame(null);
    }
    var ee;
    ee = !1;
    function re(e) {
      return typeof e == "object" && e !== null && e.$$typeof === c;
    }
    function Oe() {
      {
        if (Q.current) {
          var e = D(Q.current.type);
          if (e)
            return `

Check the render method of \`` + e + "`.";
        }
        return "";
      }
    }
    function cr(e) {
      return "";
    }
    var Ce = {};
    function lr(e) {
      {
        var r = Oe();
        if (!r) {
          var t = typeof e == "string" ? e : e.displayName || e.name;
          t && (r = `

Check the top-level render call using <` + t + ">.");
        }
        return r;
      }
    }
    function we(e, r) {
      {
        if (!e._store || e._store.validated || e.key != null)
          return;
        e._store.validated = !0;
        var t = lr(r);
        if (Ce[t])
          return;
        Ce[t] = !0;
        var n = "";
        e && e._owner && e._owner !== Q.current && (n = " It was passed a child from " + D(e._owner.type) + "."), $(e), b('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', t, n), $(null);
      }
    }
    function je(e, r) {
      {
        if (typeof e != "object")
          return;
        if (Z(e))
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            re(n) && we(n, r);
          }
        else if (re(e))
          e._store && (e._store.validated = !0);
        else if (e) {
          var s = x(e);
          if (typeof s == "function" && s !== e.entries)
            for (var d = s.call(e), o; !(o = d.next()).done; )
              re(o.value) && we(o.value, r);
        }
      }
    }
    function fr(e) {
      {
        var r = e.type;
        if (r == null || typeof r == "string")
          return;
        var t;
        if (typeof r == "function")
          t = r.propTypes;
        else if (typeof r == "object" && (r.$$typeof === i || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        r.$$typeof === g))
          t = r.propTypes;
        else
          return;
        if (t) {
          var n = D(r);
          He(t, e.props, "prop", n, e);
        } else if (r.PropTypes !== void 0 && !ee) {
          ee = !0;
          var s = D(r);
          b("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", s || "Unknown");
        }
        typeof r.getDefaultProps == "function" && !r.getDefaultProps.isReactClassApproved && b("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function dr(e) {
      {
        for (var r = Object.keys(e.props), t = 0; t < r.length; t++) {
          var n = r[t];
          if (n !== "children" && n !== "key") {
            $(e), b("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", n), $(null);
            break;
          }
        }
        e.ref !== null && ($(e), b("Invalid attribute `ref` supplied to `React.Fragment`."), $(null));
      }
    }
    var Pe = {};
    function xe(e, r, t, n, s, d) {
      {
        var o = Ne(e);
        if (!o) {
          var a = "";
          (e === void 0 || typeof e == "object" && e !== null && Object.keys(e).length === 0) && (a += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var T = cr();
          T ? a += T : a += Oe();
          var R;
          e === null ? R = "null" : Z(e) ? R = "array" : e !== void 0 && e.$$typeof === c ? (R = "<" + (D(e.type) || "Unknown") + " />", a = " Did you accidentally export a JSX literal instead of a component?") : R = typeof e, b("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", R, a);
        }
        var E = ur(e, r, t, s, d);
        if (E == null)
          return E;
        if (o) {
          var P = r.children;
          if (P !== void 0)
            if (n)
              if (Z(P)) {
                for (var W = 0; W < P.length; W++)
                  je(P[W], e);
                Object.freeze && Object.freeze(P);
              } else
                b("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              je(P, e);
        }
        if (U.call(r, "key")) {
          var I = D(e), w = Object.keys(r).filter(function(Er) {
            return Er !== "key";
          }), te = w.length > 0 ? "{key: someKey, " + w.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Pe[I + te]) {
            var yr = w.length > 0 ? "{" + w.join(": ..., ") + ": ...}" : "{}";
            b(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, te, I, yr, I), Pe[I + te] = !0;
          }
        }
        return e === y ? dr(E) : fr(E), E;
      }
    }
    function vr(e, r, t) {
      return xe(e, r, t, !0);
    }
    function pr(e, r, t) {
      return xe(e, r, t, !1);
    }
    var br = pr, Rr = vr;
    M.Fragment = y, M.jsx = br, M.jsxs = Rr;
  }()), M;
}
process.env.NODE_ENV === "production" ? ae.exports = wr() : ae.exports = jr();
var oe = ae.exports;
function Fr(u, c, _) {
  return /* @__PURE__ */ oe.jsx(Pr, { source: u, selector: c, equals: _ });
}
const Pr = mr(
  function(c) {
    const _ = We(c.source, c.selector, c.equals);
    return /* @__PURE__ */ oe.jsx(oe.Fragment, { children: _ ?? null });
  },
  (u, c) => Tr(u.source, c.source) && u.selector === c.selector && u.equals === c.equals
);
export {
  Wr as AllGettersRejectedError,
  Yr as all,
  Lr as any,
  Ur as atom,
  Vr as batch,
  Mr as define,
  qr as derived,
  Nr as emitter,
  zr as getterStatus,
  _r as isAtom,
  Br as race,
  Fr as rx,
  Ae as select,
  Jr as settled,
  Dr as useAction,
  We as useSelector,
  Ar as useStable
};

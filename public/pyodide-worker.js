importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js");

const ready = loadPyodide().then((py) => {
  postMessage({ type: "ready" });
  return py;
});

const HARNESS = `
import sys, io, traceback, builtins, json

def __pyquest_exec(user_code, inputs):
    out = io.StringIO()
    old = sys.stdout
    sys.stdout = out
    feed = list(inputs)
    builtins.input = lambda prompt="": (print(prompt, end=""), feed.pop(0) if feed else "")[1]
    ns = {"__name__": "__main__"}
    error = None
    try:
        exec(compile(user_code, "<seu código>", "exec"), ns)
    except BaseException:
        error = traceback.format_exc(limit=-1)
    finally:
        sys.stdout = old
    return ns, out.getvalue(), error

def __pyquest_probe(user_code, inputs, probe_json):
    probe = json.loads(probe_json)
    ns, _, error = __pyquest_exec(user_code, inputs)
    if error:
        return None
    old = sys.stdout
    sys.stdout = io.StringIO()
    results = []
    try:
        if probe.get("setup"):
            try:
                exec(probe["setup"], ns)
            except BaseException as e:
                return [{"value": None, "error": type(e).__name__, "ok": False} for _ in probe["events"]]
        for ev in probe["events"]:
            value, err, ok = None, None, False
            try:
                if ev.get("do"):
                    exec(ev["do"], ns)
                v = eval(ev["expr"], ns)
                value = repr(v)
            except BaseException as e:
                err = type(e).__name__
            exp = ev["expect"]
            if exp.startswith("!"):
                ok = err == exp[1:]
            elif err is None:
                try:
                    ok = bool(v == eval(exp, ns)) and type(v) is type(eval(exp, ns))
                except BaseException:
                    ok = False
            results.append({"value": value, "error": err, "ok": ok})
    finally:
        sys.stdout = old
    return results

def __pyquest_run(user_code, check_code, inputs, probe_json):
    ns, stdout, error = __pyquest_exec(user_code, inputs)
    result = {"ok": error is None, "error": error, "failure": None, "stdout": stdout, "probes": None}
    if result["ok"] and check_code:
        ns["__out"] = stdout
        try:
            exec(check_code, ns)
        except AssertionError as e:
            result["ok"] = False
            result["failure"] = str(e) or "Ainda não está certo."
        except BaseException as e:
            result["ok"] = False
            result["failure"] = f"{type(e).__name__}: {e}"
    if probe_json:
        result["probes"] = json.dumps(__pyquest_probe(user_code, inputs, probe_json))
    return result
`;

self.onmessage = async (e) => {
  const { id, code, check, inputs, probe } = e.data;
  const py = await ready;
  try {
    py.runPython(HARNESS);
    const fn = py.globals.get("__pyquest_run");
    const res = fn(code, check || "", py.toPy(inputs || []), probe ? JSON.stringify(probe) : "");
    const obj = res.toJs({ dict_converter: Object.fromEntries });
    res.destroy();
    fn.destroy();
    obj.probes = obj.probes ? JSON.parse(obj.probes) : null;
    postMessage({ type: "result", id, ...obj });
  } catch (err) {
    postMessage({ type: "result", id, ok: false, stdout: "", error: String(err), failure: null, probes: null });
  }
};

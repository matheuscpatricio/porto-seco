importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js");

const ready = loadPyodide().then((py) => {
  postMessage({ type: "ready" });
  return py;
});

const HARNESS = `
import sys, io, traceback, builtins
def __pyquest_run(user_code, check_code, inputs):
    out = io.StringIO()
    old = sys.stdout
    sys.stdout = out
    feed = list(inputs)
    builtins.input = lambda prompt="": (print(prompt, end=""), feed.pop(0) if feed else "")[1]
    ns = {"__name__": "__main__"}
    result = {"ok": True, "error": None, "failure": None}
    try:
        exec(compile(user_code, "<seu código>", "exec"), ns)
    except BaseException:
        result["ok"] = False
        result["error"] = traceback.format_exc(limit=-1)
    finally:
        sys.stdout = old
    result["stdout"] = out.getvalue()
    if result["ok"] and check_code:
        ns["__out"] = result["stdout"]
        try:
            exec(check_code, ns)
        except AssertionError as e:
            result["ok"] = False
            result["failure"] = str(e) or "Ainda não está certo."
        except BaseException as e:
            result["ok"] = False
            result["failure"] = f"{type(e).__name__}: {e}"
    return result
`;

self.onmessage = async (e) => {
  const { id, code, check, inputs } = e.data;
  const py = await ready;
  try {
    py.runPython(HARNESS);
    const fn = py.globals.get("__pyquest_run");
    const res = fn(code, check || "", py.toPy(inputs || []));
    const obj = res.toJs({ dict_converter: Object.fromEntries });
    res.destroy();
    fn.destroy();
    postMessage({ type: "result", id, ...obj });
  } catch (err) {
    postMessage({ type: "result", id, ok: false, stdout: "", error: String(err), failure: null });
  }
};

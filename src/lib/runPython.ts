export type RunResult = {
  ok: boolean;
  stdout: string;
  error: string | null;
  failure: string | null;
  timedOut?: boolean;
  probes?: ProbeResult[] | null;
};

export type ProbeEvent = { do?: string; expr: string; expect: string };
export type Probe = { setup?: string; events: ProbeEvent[] };
export type ProbeResult = { value: string | null; error: string | null; ok: boolean };

type Listener = (ready: boolean) => void;

let worker: Worker | null = null;
let isReady = false;
const listeners = new Set<Listener>();
let nextId = 0;

function setReady(v: boolean) {
  isReady = v;
  listeners.forEach((l) => l(v));
}

function getWorker() {
  if (!worker) {
    worker = new Worker("/pyodide-worker.js");
    worker.addEventListener("message", (e) => {
      if (e.data.type === "ready") setReady(true);
    });
  }
  return worker;
}

export function warmUp() {
  getWorker();
}

export function onReadyChange(l: Listener) {
  listeners.add(l);
  l(isReady);
  return () => {
    listeners.delete(l);
  };
}

export function runPython(
  code: string,
  check = "",
  inputs: string[] = [],
  probe?: Probe,
  timeoutMs = 8000,
): Promise<RunResult> {
  const w = getWorker();
  const id = ++nextId;
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMsg = (e: MessageEvent) => {
      if (e.data.type !== "result" || e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      resolve(e.data);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ id, code, check, inputs, probe });
    const armTimeout = () => {
      timer = setTimeout(() => {
        w.removeEventListener("message", onMsg);
        w.terminate();
        worker = null;
        setReady(false);
        getWorker();
        resolve({
          ok: false,
          stdout: "",
          error: null,
          failure: "Tempo esgotado! Será que existe um loop infinito no seu código?",
          timedOut: true,
        });
      }, timeoutMs);
    };
    // Loading Pyodide itself can take a while, so the timeout only starts once it is ready.
    if (isReady) armTimeout();
    else {
      const unsub = onReadyChange((r) => {
        if (r) {
          unsub();
          armTimeout();
        }
      });
    }
  });
}

const ERRORS: [RegExp, string][] = [
  [/SyntaxError/, "Erro de sintaxe: o Python não entendeu a escrita. Confira parênteses, aspas e os dois-pontos (:) no fim de if, for, def e class."],
  [/IndentationError/, "Erro de indentação: os blocos dentro de if, for, def e class precisam de espaços no começo da linha (use 4)."],
  [/NameError/, "Nome desconhecido: você usou uma variável ou função que não existe. Confira a grafia e se ela foi criada antes."],
  [/TypeError/, "Erro de tipo: você misturou tipos incompatíveis, como somar texto com número. Tente str() ou int()."],
  [/ZeroDivisionError/, "Divisão por zero! Nem os magos conseguem isso."],
  [/IndexError/, "Índice fora da lista: você tentou acessar uma posição que não existe. Lembre que começa em 0."],
  [/KeyError/, "Chave não encontrada no dicionário."],
  [/AttributeError/, "Esse objeto não tem o atributo ou método que você chamou."],
  [/ValueError/, "Valor inválido: o tipo está certo, mas o conteúdo não, como int('abc')."],
];

export function friendlyError(err: string) {
  const hit = ERRORS.find(([re]) => re.test(err));
  return hit ? hit[1] : null;
}

// Nagrywarka filmu „Pompa w HA · montaż” (12.11.2026). Wzór: silnik rolek rodziny (AKADEMIA-PRODUKCJA/promocja-akademia/feed/rolki/nagraj.mjs).
// Chrome bez okna + DevTools Protocol, bez bibliotek. Każda klatka: window.klatka(t) → zrzut JPEG → ffmpeg (H.264, yuv420p, faststart).
// Użycie:
//   node nagraj.mjs                       pełny film: montaz.mp4 + montaz-poster.jpg + montaz.vtt
//   node nagraj.mjs --klatki=3,12.5,40    tylko PNG kontrolne do kontrola/ (bez filmu)
//   node nagraj.mjs --sceny               PNG kontrolne: 3 chwile z każdej sceny
// Opcje: --crf=24 (jakość obrazu; większa liczba = mniejszy plik)  --lufs=-20 (głośność końcowa muzyki)  --bez-muzyki
// Chrome zawsze zamykany (finally + pkill po własnym profilu). Cudzy Chrome nie jest ruszany.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TU = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FF = process.env.FFMPEG || (existsSync("/usr/local/bin/ffmpeg") ? "/usr/local/bin/ffmpeg" : "ffmpeg");
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const jest = (n) => process.argv.includes(`--${n}`);
const W = 1920, H = 1080, FPS = 30;
const CRF = arg("crf", "24"), LUFS = arg("lufs", "-20");
// Muzyka: spokojny utwór z biblioteki rodziny (Pixabay, „soundsurfer – crypto”, 90 BPM, wybrany przez Rafała do spokojnego zwiastuna KNL).
const MUZYKA = arg("muzyka", path.join(TU, "../../../AKADEMIA-PRODUKCJA/zwiastun/muzyka/soundsurfer-crypto-255273.mp3"));
const KONTROLA = path.join(TU, "kontrola"); mkdirSync(KONTROLA, { recursive: true });
const OUT = path.join(TU, "montaz.mp4");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = process.env.TMPDIR_FILM || (process.platform === "darwin" ? "/private/tmp/claude-501" : "/tmp");
const prof = path.join(tmp, `pompa-film-chrome-${Date.now()}`), port = 9300 + Math.floor(Math.random() * 400);
const CISZA = path.join(tmp, `pompa-film-obraz-${Date.now()}.mp4`);   // obraz bez dźwięku: plik pośredni poza repo, kasowany na końcu

const czasVtt = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`; };

let ch, sock;
try {
  mkdirSync(prof, { recursive: true });
  ch = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--hide-scrollbars", "--no-first-run",
    "--allow-file-access-from-files", "--force-color-profile=srgb", `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
  let ws; for (let i = 0; i < 100 && !ws; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); ws = t.find((x) => x.type === "page")?.webSocketDebuggerUrl; } catch {} await sleep(200); }
  if (!ws) throw new Error("Chrome nie wystartował");
  sock = new WebSocket(ws); await new Promise((r) => (sock.onopen = r));
  let id = 0; const czeka = new Map(), bledy = [];
  sock.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.id && czeka.has(m.id)) { czeka.get(m.id)(m); czeka.delete(m.id); }
    else if (m.method === "Runtime.exceptionThrown") bledy.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") bledy.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") bledy.push(m.params.entry.text + " " + (m.params.entry.url || "")); };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; czeka.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
  const js = async (e) => (await cdp("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await cdp("Runtime.enable"); await cdp("Page.enable"); await cdp("Log.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: pathToFileURL(path.join(TU, "scena.html")).href });
  for (let i = 0; i < 150 && !(await js("window.gotowe === true")); i++) await sleep(100);
  await sleep(300);
  if (bledy.length || !(await js("window.gotowe === true"))) throw new Error("Strona: " + (bledy.join(" | ") || "nie wystartowała"));
  const DL = await js("window.DL"), SCENY = await js("window.SCENY"), NAPISY = await js("window.NAPISY"), POSTER = await js("window.POSTER");
  const zrzut = async (t, typ = "jpeg") => { await js(`klatka(${t})`); return Buffer.from((await cdp("Page.captureScreenshot", { format: typ, quality: typ === "jpeg" ? 94 : undefined, optimizeForSpeed: typ === "jpeg" })).result.data, "base64"); };

  let chwile = arg("klatki", "") ? arg("klatki", "").split(",").map(Number) : [];
  if (jest("sceny")) chwile = SCENY.flatMap((s) => [s.od + .9, (s.od + s.do) / 2, s.do - .45]);
  if (chwile.length) {
    for (const t of chwile) { const p = path.join(KONTROLA, `t${t.toFixed(2).padStart(6, "0")}.png`); writeFileSync(p, await zrzut(t, "png")); console.log("🖼", p); }
    if (bledy.length) console.log("⚠️ błędy:", bledy.join(" | "));
  } else {
    const N = Math.round(DL * FPS);
    {
      const ff = spawn(FF, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
        "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",   // JPEG z Chrome (pełny zakres) → zwykłe wideo (zakres TV, BT.709)
        "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", CRF, "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-g", "60", "-movflags", "+faststart", CISZA], { stdio: ["pipe", "inherit", "inherit"] });
      const t0 = Date.now();
      for (let f = 0; f < N; f++) {
        const b = await zrzut(f / FPS);
        if (!ff.stdin.write(b)) await new Promise((r) => ff.stdin.once("drain", r));
        if (f % 90 === 0) process.stdout.write(`\r🎞  klatka ${f}/${N} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      ff.stdin.end(); await new Promise((r) => ff.on("close", r)); process.stdout.write(`\r🎞  klatka ${N}/${N}\n`);
    }
    writeFileSync(path.join(TU, "montaz-poster.jpg"), await zrzut(POSTER, "jpeg"));
    if (bledy.length) console.log("⚠️ błędy strony w trakcie:", bledy.slice(0, 3).join(" | "));
    // napisy WebVTT z tych samych tekstów co na ekranie
    writeFileSync(path.join(TU, "montaz.vtt"), "WEBVTT\n\n" + NAPISY.map((n, i) => `${i + 1}\n${czasVtt(n.od)} --> ${czasVtt(Math.min(n.do, DL))}\n${n.tekst}\n`).join("\n"));
    writeFileSync(path.join(TU, "montaz-sceny.json"), JSON.stringify({ dl: DL, sceny: SCENY }, null, 1));
    // dźwięk: spokojna muzyka, wejście 1,5 s, wyciszenie 3 s; głośność dwuprzebiegowo (loudnorm liniowy) do LUFS, szczyt −1,5 dBTP
    if (jest("bez-muzyki")) { spawnSync(FF, ["-y", "-loglevel", "error", "-i", CISZA, "-c", "copy", "-movflags", "+faststart", OUT]); }
    else {
      const mix = path.join(tmp, `pompa-film-mix-${Date.now()}.wav`);
      let r = spawnSync(FF, ["-y", "-loglevel", "error", "-i", MUZYKA, "-af", `atrim=0:${DL},asetpts=N/SR/TB,afade=t=in:d=1.5,afade=t=out:st=${(DL - 3).toFixed(2)}:d=3,apad=whole_dur=${DL}`, "-ar", "48000", "-ac", "2", mix]);
      if (r.status) throw new Error("muzyka: " + r.stderr);
      r = spawnSync(FF, ["-hide_banner", "-i", mix, "-af", `loudnorm=I=${LUFS}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
      const m = JSON.parse(r.stderr.match(/\{[^{}]*"target_offset"[^{}]*\}/)[0]);
      const ln = `loudnorm=I=${LUFS}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
      r = spawnSync(FF, ["-y", "-loglevel", "error", "-i", CISZA, "-i", mix, "-af", ln, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-shortest", "-movflags", "+faststart", OUT]);
      if (r.status) throw new Error("złożenie: " + r.stderr);
      rmSync(mix);
    }
    rmSync(CISZA, { force: true });
    console.log(`✅ ${OUT} · ${DL.toFixed(2)} s · ${(statSync(OUT).size / 1048576).toFixed(1)} MB`);
  }
} finally {
  try { rmSync(CISZA, { force: true }); } catch {}
  try { sock?.close(); } catch {}
  try { ch?.kill("SIGKILL"); } catch {}
  spawnSync("pkill", ["-f", prof]); await sleep(400); try { rmSync(prof, { recursive: true, force: true, maxRetries: 5 }); } catch {}
}

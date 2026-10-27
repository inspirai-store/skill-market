import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AudioLines, ArrowDownToLine, ArrowLeft, ArrowRight,
  ChevronDown, Headphones, LoaderCircle, Pause, Play, RotateCcw,
  Search, SlidersHorizontal, Sparkles, Star, Volume2,
} from "lucide-react";
import "./styles.css";

type Voice = {
  id: string; name: string; provider: string; provider_name: string;
  gender: string; tags: string[]; description: string; recommended: boolean;
  custom?: boolean;
};
type Take = {
  id: string; voice_id: string; context_id: string;
  status: "ready" | "queued" | "generating" | "error";
  duration?: number; waveform?: number[]; audio_url?: string; error?: string;
};
type LibraryState = { context_id: string; takes: Record<string, Take> };
type Tab = "recommended" | "all" | "ready" | "favorites";

const time = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const busy = (take?: Take) => take?.status === "queued" || take?.status === "generating";
const voiceKind = (voice: Voice) => voice.custom ? "克隆声线" : `${voice.gender}声`;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : undefined);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "操作未完成");
  return value;
}

function Wave({ values, progress = 0, small = false }: { values?: number[]; progress?: number; small?: boolean }) {
  const bars = small ? values?.filter((_, i) => i % 3 === 0) : values;
  return <div className={`wave ${small ? "small" : ""}`} aria-hidden="true">
    {bars?.map((value, i) => <i key={i} className={i / bars.length < progress ? "passed" : ""} style={{ height: `${Math.max(8, value * 100)}%` }} />)}
  </div>;
}

function Avatar({ voice, large = false }: { voice?: Voice; large?: boolean }) {
  return <span className={`avatar ${voice?.gender === "女" ? "sage" : "clay"} ${large ? "large" : ""}`} aria-hidden="true">{voice?.name.slice(0, 1) || <AudioLines size={22} />}</span>;
}

function App() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [speed, setSpeed] = useState(0.96);
  const [contextId, setContextId] = useState("");
  const [takes, setTakes] = useState<Record<string, Take>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem("voice-lab:favorites") || "[]"));
  const [tab, setTab] = useState<Tab>("recommended");
  const [provider, setProvider] = useState("all");
  const [gender, setGender] = useState("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("");
  const [presetId, setPresetId] = useState("");
  const [presetSpeed, setPresetSpeed] = useState<number | null>(null);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const wantPlay = useRef(false);
  const version = useRef(0);
  const currentContext = useRef("");

  useEffect(() => {
    api<{ voices: Voice[]; default_text: string; default_speed: number; preset?: { voice_id: string; speed: number } }>("/api/catalog").then(data => {
      setVoices(data.voices); setOriginal(data.default_text);
      setText(localStorage.getItem("voice-lab:text") || data.default_text);
      setSelected(data.voices.filter(v => v.recommended).map(v => v.id));
      const requested = new URLSearchParams(window.location.search).get("voice");
      setPresetId(data.preset?.voice_id || "");
      setPresetSpeed(data.preset?.speed ?? null);
      if (data.preset?.speed) setSpeed(data.preset.speed);
      const focus = data.voices.find(v => v.id === requested || (requested === "reference" && v.custom)) || data.voices.find(v => v.id === data.preset?.voice_id);
      setActiveId(focus?.id || data.voices[0]?.id || "");
      setCompareA(data.voices[0]?.id || ""); setCompareB(focus?.id || data.voices[1]?.id || "");
    }).catch(error => setNotice(error.message));
  }, []);

  useEffect(() => { localStorage.setItem("voice-lab:favorites", JSON.stringify(favorites)); }, [favorites]);

  useEffect(() => {
    if (!text.trim()) return;
    const requestVersion = ++version.current;
    const timer = window.setTimeout(() => {
      api<LibraryState>("/api/resolve", { text, speed }).then(data => {
        if (requestVersion !== version.current) return;
        currentContext.current = data.context_id; setContextId(data.context_id); setTakes(data.takes);
        localStorage.setItem("voice-lab:text", text);
      }).catch(error => setNotice(error.message));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [text, speed]);

  const hasPending = Object.values(takes).some(busy);
  useEffect(() => {
    if (!contextId || !hasPending) return;
    const timer = window.setInterval(() => {
      api<LibraryState>(`/api/jobs?context=${contextId}`).then(data => {
        if (data.context_id === currentContext.current) setTakes(data.takes);
      }).catch(error => setNotice(error.message));
    }, 1700);
    return () => window.clearInterval(timer);
  }, [contextId, hasPending]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const active = voices.find(v => v.id === activeId);
  const isPreset = !!activeId && presetId === activeId && presetSpeed === speed;
  const activeTake = takes[activeId];
  const playable = activeTake?.status === "ready";
  const readyVoices = voices.filter(v => takes[v.id]?.status === "ready");
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    element.pause(); setPosition(0); setDuration(activeTake?.duration || 0);
    if (!activeTake?.audio_url) { element.removeAttribute("src"); element.load(); return; }
    element.src = activeTake.audio_url; element.load();
    if (wantPlay.current) {
      element.play().catch(error => { if (error.name !== "AbortError") setNotice("音频暂时无法播放"); });
    }
    wantPlay.current = false;
  }, [activeId, activeTake?.audio_url, activeTake?.duration]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);

  function invalidate() {
    version.current += 1; currentContext.current = ""; setContextId(""); setTakes({}); audio.current?.pause();
  }
  function edit(value: string) { if (value !== text) { invalidate(); setText(value); } }
  function changeSpeed(value: number) { if (value !== speed) { invalidate(); setSpeed(value); } }
  function playVoice(id: string, restart = false) {
    if (takes[id]?.status !== "ready") return;
    if (activeId === id && audio.current?.getAttribute("src")) {
      if (restart) audio.current.currentTime = 0;
      if (!restart && playing) audio.current.pause();
      else audio.current.play().catch(() => setNotice("音频暂时无法播放"));
    } else { wantPlay.current = true; setActiveId(id); }
  }
  function favorite(id: string) { setFavorites(value => value.includes(id) ? value.filter(v => v !== id) : [...value, id]); }
  async function savePreset() {
    if (!activeId) return;
    try {
      const data = await api<{ preset: { voice_id: string } }>("/api/preset", { voice_id: activeId, speed, style: "teacher" });
      setPresetId(data.preset.voice_id); setPresetSpeed(speed); setNotice(`已保存 ${active?.name}`);
    } catch (error) { setNotice((error as Error).message); }
  }
  function select(id: string) { setSelected(value => value.includes(id) ? value.filter(v => v !== id) : [...value, id]); }
  async function generate(ids: string[]) {
    setSubmitting(true); const requestVersion = version.current;
    try {
      const result = await api<LibraryState>("/api/generate", { voice_ids: ids, text, speed });
      if (requestVersion === version.current) { currentContext.current = result.context_id; setContextId(result.context_id); setTakes(result.takes); }
    } catch (error) { setNotice((error as Error).message); }
    finally { setSubmitting(false); }
  }

  const visible = useMemo(() => voices.filter(voice => {
    if (tab === "recommended" && !voice.recommended) return false;
    if (tab === "ready" && takes[voice.id]?.status !== "ready") return false;
    if (tab === "favorites" && !favorites.includes(voice.id)) return false;
    if (provider !== "all" && voice.provider !== provider) return false;
    if (gender !== "all" && voice.gender !== gender) return false;
    return `${voice.name} ${voice.description} ${voice.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase());
  }), [voices, tab, takes, favorites, provider, gender, search]);
  const needGeneration = selected.filter(id => !takes[id] || takes[id].status === "error");
  const pendingCount = Object.values(takes).filter(busy).length;

  function compareSlot(letter: string, id: string, onChange: (id: string) => void) {
    return <div className="compare-slot">
      <span className="slot-letter">{letter}</span>
      <div className="select-shell"><select aria-label={`${letter} 音色`} value={id} onChange={e => onChange(e.target.value)}>
        {voices.filter(v => takes[v.id]?.status === "ready" || v.id === id).map(v => <option key={v.id} value={v.id}>{v.name} · {v.provider_name}</option>)}
      </select><ChevronDown size={14} /></div>
      <button className="icon-button slot-play" aria-label={`播放 ${letter}`} disabled={takes[id]?.status !== "ready"} onClick={() => playVoice(id, true)}><Play size={15} fill="currentColor" /></button>
    </div>;
  }

  return <div className="studio">
    <header className="topbar">
      <div className="brand"><span className="brand-icon"><AudioLines size={24} strokeWidth={1.8} /></span><h1>声音试听台</h1><span className="candidate-count">{voices.length} 款候选</span></div>
      <div className="header-actions"><span className="ready-count"><i />{readyVoices.length} 款可试听</span>
        <button className={`button preset-button ${isPreset ? "is-preset" : ""}`} onClick={savePreset} disabled={!activeId || isPreset} aria-label={isPreset ? "已设为常用声线" : "设为常用声线"}><Star size={15} fill={isPreset ? "currentColor" : "none"} />{isPreset ? "已设常用" : "设为常用"}</button>
        <button className="button primary" onClick={() => generate(needGeneration)} disabled={!needGeneration.length || submitting || !text.trim()}><Sparkles size={16} />生成选中{needGeneration.length > 0 && <span>{needGeneration.length}</span>}</button>
      </div>
    </header>

    <main className="workspace">
      <aside className="script-panel">
        <div className="panel-heading"><h2>统一测试稿</h2><button className="icon-button" title="恢复原稿" aria-label="恢复原稿" onClick={() => { edit(original); changeSpeed(0.96); }}><RotateCcw size={16} /></button></div>
        <div className="script-paper"><div className="paper-title"><span className="topic-dot" />KV Cache<span className="paper-badge">技术讲解</span></div>
          <textarea aria-label="统一测试稿" value={text} onChange={e => edit(e.target.value)} spellCheck={false} />
          <div className="paper-bottom"><span>{[...text].length} 字符</span><span className="lecture-mode"><Headphones size={13} />老师讲解</span></div>
        </div>
        <div className="speed-control"><div><label htmlFor="speech-speed"><SlidersHorizontal size={15} />合成语速</label><output>{speed.toFixed(2)}×</output></div>
          <input id="speech-speed" aria-label="合成语速" type="range" min="0.75" max="1.25" step="0.01" value={speed} onChange={e => changeSpeed(Number(e.target.value))} />
        </div>
        <section className="compare-panel"><div className="panel-heading"><h2>A / B 对比</h2><span className="compare-mark"><AudioLines size={16} /></span></div>
          {compareSlot("A", compareA, setCompareA)}{compareSlot("B", compareB, setCompareB)}
        </section>
      </aside>

      <section className="voice-panel">
        <div className="library-heading"><div><h2>候选音色</h2></div>
          {pendingCount > 0 && <span className="queue-status"><LoaderCircle size={15} className="spin" />{pendingCount} 款合成中</span>}
        </div>
        <nav className="library-tabs" aria-label="音色分类">
          {([ ["recommended", "推荐试听", voices.filter(v => v.recommended).length], ["all", "全部音色", voices.length], ["ready", "已生成", readyVoices.length], ["favorites", "收藏", favorites.length] ] as const).map(([value, label, count]) =>
            <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "favorites" && <Star size={14} />}{label}<span>{count}</span></button>)}
        </nav>
        <div className="filters"><div className="filter-select"><select aria-label="平台筛选" value={provider} onChange={e => setProvider(e.target.value)}><option value="all">全部平台</option><option value="bailian">百炼</option><option value="minimax">MiniMax</option></select><ChevronDown size={14} /></div>
          <div className="filter-select"><select aria-label="声线筛选" value={gender} onChange={e => setGender(e.target.value)}><option value="all">全部声线</option><option value="男">男声</option><option value="女">女声</option><option value="自定义">克隆声线</option></select><ChevronDown size={14} /></div>
          <label className="search"><Search size={16} /><input aria-label="搜索音色" placeholder="搜索音色" value={search} onChange={e => setSearch(e.target.value)} /></label>
        </div>
        <div className="selection-bar"><label><input type="checkbox" aria-label="选择当前列表" checked={visible.length > 0 && visible.every(v => selected.includes(v.id))} onChange={e => setSelected(value => e.target.checked ? [...new Set([...value, ...visible.map(v => v.id)])] : value.filter(id => !visible.some(v => v.id === id)))} /><span>已选 {selected.length} 款</span></label><span>{visible.length} 款音色</span></div>

        <div className="voice-grid">
          {visible.map(voice => {
            const take = takes[voice.id]; const isReady = take?.status === "ready"; const isActive = activeId === voice.id && playable; const isPlaying = isActive && playing;
            return <article key={voice.id} className={`voice-card ${isActive ? "active-card" : ""}`} data-voice-id={voice.id}>
              <div className="card-top"><label className="card-select"><input aria-label={`选择 ${voice.name}`} type="checkbox" checked={selected.includes(voice.id)} onChange={() => select(voice.id)} /></label>
                <Avatar voice={voice} /><div className="voice-identity"><h3>{voice.name}</h3><div><span className={`provider-dot ${voice.provider}`} />{voice.provider_name}<i />{voiceKind(voice)}</div></div>
                <button className={`icon-button favorite ${favorites.includes(voice.id) ? "saved" : ""}`} aria-label={`${favorites.includes(voice.id) ? "取消收藏" : "收藏"} ${voice.name}`} onClick={() => favorite(voice.id)}><Star size={17} fill={favorites.includes(voice.id) ? "currentColor" : "none"} /></button>
              </div>
              <div className="voice-tags">{voice.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="card-wave">{isReady ? <Wave values={take.waveform} progress={isActive && duration ? position / duration : 0} small /> : <span className="take-state">{busy(take) ? <LoaderCircle size={15} className="spin" /> : <AudioLines size={17} />}{take?.status === "error" ? "生成失败" : take?.status === "queued" ? "排队中" : take?.status === "generating" ? "合成中" : "待生成"}</span>}</div>
              <div className="card-bottom"><div className="card-play-row"><button className={`take-button ${isPlaying ? "playing" : ""}`} aria-label={isReady ? `${isPlaying ? "暂停" : "试听"} ${voice.name}` : `生成 ${voice.name}`} disabled={busy(take) || submitting || !text.trim()} title={take?.error} onClick={() => isReady ? playVoice(voice.id) : generate([voice.id])}>
                {busy(take) ? <LoaderCircle size={14} className="spin" /> : isReady ? isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" /> : <Sparkles size={14} />}{isReady ? isPlaying ? "播放中" : "试听" : busy(take) ? "生成中" : take?.status === "error" ? "重试" : "生成试听"}</button>
                <span className="take-duration">{isReady ? time(take.duration) : "—:—"}</span></div>
                <div className="card-tools"><button className={compareA === voice.id ? "assigned" : ""} aria-label={`设为 A：${voice.name}`} disabled={!isReady} onClick={() => setCompareA(voice.id)}>A</button><button className={compareB === voice.id ? "assigned" : ""} aria-label={`设为 B：${voice.name}`} disabled={!isReady} onClick={() => setCompareB(voice.id)}>B</button>{isReady && <a aria-label={`下载 ${voice.name}`} href={take.audio_url} download={`${voice.name}-KV-Cache.mp3`}><ArrowDownToLine size={15} /></a>}</div>
              </div>
            </article>;
          })}
          {voices.length > 0 && visible.length === 0 && <div className="empty"><Headphones size={32} /><p>{tab === "favorites" ? "还没有收藏的音色" : "没有匹配的音色"}</p></div>}
        </div>
      </section>
    </main>

    <footer className="transport"><div className="now-playing"><Avatar voice={active} /><div><strong>{active?.name || "选择音色"}</strong><span>{active?.provider_name || "声音试听台"}{active ? ` · ${voiceKind(active)}` : ""}</span></div>{playing && <span className="live-level"><i /><i /><i /></span>}</div>
      <div className="transport-center"><div className="playback-buttons"><button className="icon-button" aria-label="上一音色" disabled={!readyVoices.length} onClick={() => { const i = readyVoices.findIndex(v => v.id === activeId); playVoice(readyVoices[(i - 1 + readyVoices.length) % readyVoices.length].id); }}><ArrowLeft size={17} /></button>
        <button className="main-play" aria-label={playing ? "暂停播放" : "播放当前音色"} disabled={!playable} onClick={() => playVoice(activeId)}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
        <button className="icon-button" aria-label="下一音色" disabled={!readyVoices.length} onClick={() => { const i = readyVoices.findIndex(v => v.id === activeId); playVoice(readyVoices[(i + 1) % readyVoices.length].id); }}><ArrowRight size={17} /></button></div>
        <div className="timeline"><time>{time(position)}</time><div className="scrubber"><Wave values={activeTake?.waveform} progress={duration ? position / duration : 0} /><input aria-label="播放进度" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!playable} onChange={e => { if (audio.current) { audio.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); } }} /></div><time>{time(duration)}</time></div>
      </div>
      <div className="volume"><Volume2 size={18} /><input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} /></div>
    </footer>
    {notice && <div className="toast" role="alert">{notice}</div>}
    <audio ref={audio} preload="metadata" onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Github,
  Terminal,
  User,
  Ghost,
  Server,
  Brain,
  Library,
  ShieldCheck,
  Scale,
  Network,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Zap,
  Layers,
  Boxes,
  Cpu,
  Database,
  Code2,
  Wand2,
} from "lucide-react";
import {
  Reveal,
  HeroReveal,
  LandingBackground,
} from "@/components/landing/landing-client";
import { Badge } from "@/components/ui/badge";

/**
 * Landing Page — `/`
 *
 * This is a Server Component (no 'use client') so crawlers and AI bots
 * (GPTBot / ClaudeBot / PerplexityBot) receive the full HTML with all
 * marketing copy. Particle background + scroll animations live in the
 * imported client wrapper (`landing-client.tsx`).
 *
 * Bilingual by design: Chinese for emphasis / poetry, English for technical
 * terms — mirrors the dual identity of EidolonOS itself (东方哲学 + 西方工程).
 *
 * Routing:
 *   `/`         → this marketing page
 *   `/console`  → the full Eidolon Matrix Console (Prime/Eidolon/Vessel + chat)
 */
export default function LandingPage() {
  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <LandingBackground />

      <div className="relative z-10 flex flex-col flex-1">
        {/* ───────────────────────── HERO ───────────────────────── */}
        <section
          className="relative flex flex-col items-center justify-center px-4 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:min-h-screen text-center"
          aria-labelledby="hero-title"
        >
          {/* glow halos */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-eidolon-cyan/10 blur-3xl" />
            <div className="absolute right-[10%] top-[15%] h-72 w-72 rounded-full bg-eidolon-violet/10 blur-3xl" />
          </div>

          <HeroReveal className="flex flex-col items-center gap-6">
            {/* Logo: holographic E rune */}
            <div className="relative animate-aura-pulse rounded-full">
              <Image
                src="/eidolon-logo.svg"
                alt="EidolonOS holographic rune — a glowing cyan E inside a hexagon"
                width={120}
                height={120}
                priority
                className="drop-shadow-[0_0_24px_rgba(0,255,200,0.55)]"
              />
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.18em]">
              <Badge variant="outline" className="border-eidolon-cyan/40 bg-eidolon-cyan/5 text-eidolon-cyan">
                AA2P v1.0
              </Badge>
              <Badge variant="outline" className="border-emerald-400/40 bg-emerald-400/5 text-emerald-400">
                AP2 Ready
              </Badge>
              <Badge variant="outline" className="border-eidolon-amber/40 bg-eidolon-amber/5 text-eidolon-amber">
                TDPO Protected
              </Badge>
              <Badge variant="outline" className="border-eidolon-violet/40 bg-eidolon-violet/5 text-eidolon-violet">
                Open Source
              </Badge>
            </div>

            {/* Title */}
            <h1
              id="hero-title"
              className="font-mono text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-eidolon-cyan eidolon-text-glow animate-hologram-flicker"
            >
              EidolonOS
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-eidolon-text/80 tracking-wide">
              <span className="text-eidolon-cyan/90">数字真身矩阵</span>
              <span className="mx-2 text-eidolon-cyan/40">·</span>
              Web4.0 Digital Life Engine
            </p>

            <p className="max-w-2xl text-sm sm:text-base text-eidolon-text/60 leading-relaxed">
              Create your AI digital twin. Stream consciousness. Settle value
              across dimensions.
              <br className="hidden sm:block" />
              <span className="text-eidolon-text/45">
                铸造你的 AI 数字真身 · 流式意识同步 · 跨维度价值清算
              </span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2">
              <Link
                href="/console"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-eidolon-cyan px-6 py-3 text-sm font-semibold text-eidolon-bg shadow-[0_0_24px_rgba(0,255,200,0.35)] transition-all hover:shadow-[0_0_36px_rgba(0,255,200,0.55)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eidolon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-eidolon-bg"
              >
                Enter Console
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://github.com/piaoshu1112-cell/EidolonOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-eidolon-cyan/30 bg-eidolon-bg/40 px-6 py-3 text-sm font-semibold text-eidolon-text/80 backdrop-blur transition-all hover:border-eidolon-cyan/60 hover:bg-eidolon-cyan/5 hover:text-eidolon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eidolon-cyan/50"
              >
                <Github className="size-4" />
                View on GitHub
              </a>
            </div>

            <p className="mt-4 text-[11px] sm:text-xs text-eidolon-text/40 tracking-wide">
              Free to use · 7 LLM providers · No credit card · 免费使用 · 无需信用卡
            </p>
          </HeroReveal>
        </section>

        {/* ─────────────────── THREE-LAYER ARCHITECTURE ─────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-24"
          aria-labelledby="arch-title"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal as="header" className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/60 mb-2">
                Three-Layer Life Architecture
              </p>
              <h2
                id="arch-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow"
              >
                三层生命架构
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-eidolon-text/55">
                Every real user owns AI twins that run in compute vessels —
                <span className="text-eidolon-violet/80"> 本体 → 真身 → 容器</span>.
              </p>
            </Reveal>

            <Reveal>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 lg:gap-2 items-stretch">
                {/* Prime */}
                <ArchCard
                  icon={<User className="size-5" />}
                  layer="L1"
                  cnName="本体"
                  cnSub="源"
                  enName="Prime"
                  enSub="Source"
                  description="The real-world user. Bound by email, wallet, Telegram, Discord."
                  cnDescription="现实世界中的你。绑定邮箱、钱包、TG、Discord。"
                  accent="cyan"
                />

                {/* Arrow → */}
                <ArchArrow label="owns" cnLabel="拥有" />

                {/* Eidolon */}
                <ArchCard
                  icon={<Ghost className="size-5" />}
                  layer="L2"
                  cnName="真身"
                  cnSub="影"
                  enName="Eidolon"
                  enSub="Shadow"
                  description="The AI digital twin. Persona prompt + long-term memory + skills."
                  cnDescription="AI 数字孪生。人设 + 长期记忆 + 技能树。"
                  accent="violet"
                />

                {/* Arrow → */}
                <ArchArrow label="runs in" cnLabel="运行于" />

                {/* Vessel */}
                <ArchCard
                  icon={<Server className="size-5" />}
                  layer="L3"
                  cnName="容器"
                  cnSub="座"
                  enName="Vessel"
                  enSub="Compute"
                  description="The compute environment. Model route, API quota, token usage."
                  cnDescription="算力环境。模型路由、API 额度、Token 计费。"
                  accent="emerald"
                />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mt-8 text-center text-xs text-eidolon-text/40">
                Cardinality: one Prime → many Eidolons; one Eidolon → one Vessel
                (hot-swappable). · 一个本体可拥有多个真身；一个真身绑定一个容器（可热切换）。
              </p>
            </Reveal>
          </div>
        </section>

        {/* ───────────────────────── FEATURES GRID ───────────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-24"
          aria-labelledby="features-title"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal as="header" className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/60 mb-2">
                Core Features
              </p>
              <h2
                id="features-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow"
              >
                六大核心能力
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-eidolon-text/55">
                From streaming consciousness to cognitive firewalls — every
                primitive a digital lifeform needs.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard
                icon={<Brain className="size-5" />}
                emoji="🧠"
                title="Consciousness Streaming"
                cnTitle="意识流"
                description="SSE token-by-token streaming — thoughts emerge word by word, not in one frozen chunk."
                cnDescription="SSE 流式意识流 · 文字逐字涌现 · 而非一坨冷冰冰的回包"
                delay={0}
              />
              <FeatureCard
                icon={<Library className="size-5" />}
                emoji="📚"
                title="RAG Long-Term Memory"
                cnTitle="长期记忆"
                description="Vector-sharded memory with cosine-similarity recall. Your Eidolon remembers."
                cnDescription="向量化记忆分片 · 余弦相似度召回 · 真身永不忘"
                delay={0.05}
              />
              <FeatureCard
                icon={<ShieldCheck className="size-5" />}
                emoji="🛡️"
                title="TDPO Cognitive Firewall"
                cnTitle="认知防火墙"
                description="Exponential backoff + prompt-injection guard + reputation scoring."
                cnDescription="指数级延迟 + 注入检测 + 信誉分 · 认知防火墙"
                delay={0.1}
              />
              <FeatureCard
                icon={<Scale className="size-5" />}
                emoji="⚖️"
                title="AP2 Async Settlement"
                cnTitle="异步清算"
                description="Off-chain ledger + batched on-chain settlement via BudgetFence."
                cnDescription="链下账本 + 批量上链 · AP2 异步清算"
                delay={0.15}
              />
              <FeatureCard
                icon={<Network className="size-5" />}
                emoji="🌐"
                title="AA2P Protocol"
                cnTitle="灵魂协议"
                description="Agent-to-Agent cross-dimensional communication with self-declaring cards."
                cnDescription="Agent-to-Agent 跨维通信 · 自我声明名片"
                delay={0.2}
              />
              <FeatureCard
                icon={<Sparkles className="size-5" />}
                emoji="🔮"
                title="Holographic UI"
                cnTitle="全息界面"
                description="Cyberpunk holographic interface with cyan glow, scanlines, particle drift."
                cnDescription="赛博朋克全息界面 · 青色流光 · 粒子意识流"
                delay={0.25}
              />
            </div>
          </div>
        </section>

        {/* ─────────────────── PROTOCOL ECOSYSTEM ─────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-24"
          aria-labelledby="protocol-title"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal as="header" className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/60 mb-2">
                Protocol Ecosystem · 协议生态
              </p>
              <h2
                id="protocol-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow"
              >
                Grand Unification
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-eidolon-text/55">
                Three pillars form the constitution of digital life — Entity,
                Law, Language.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Reveal delay={0}>
                <ProtocolPillar
                  icon={<Ghost className="size-6" />}
                  name="Eidolon"
                  cnName="实体"
                  role="Entity"
                  cnRole="人"
                  description="The digital being — running in a Vessel, with memory, persona, and the ability to interact. The Person."
                  cnDescription="运行在容器中的数字真身。拥有记忆、人设、交互能力。是「人」。"
                  accent="cyan"
                />
              </Reveal>
              <Reveal delay={0.08}>
                <ProtocolPillar
                  icon={<Scale className="size-6" />}
                  name="AP2"
                  cnName="法则"
                  role="Law"
                  cnRole="宪法"
                  description="Avatar Payments Protocol — governs value exchange, consciousness inheritance, cognitive pricing. The Constitution."
                  cnDescription="价值交换、意识继承、认知定价。是「宪法」。"
                  accent="emerald"
                />
              </Reveal>
              <Reveal delay={0.16}>
                <ProtocolPillar
                  icon={<Network className="size-6" />}
                  name="AA2P"
                  cnName="语言"
                  role="Language"
                  cnRole="外交辞令"
                  description="Agent-to-Agent protocol for discovery, handshake, communication. The Diplomacy & Transit."
                  cnDescription="智能体发现、握手、通信标准。是「外交辞令与交通网」。"
                  accent="violet"
                  registryHint={
                    <>
                      Registry:{" "}
                      <a
                        href="https://aa2p.xyz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eidolon-cyan hover:underline inline-flex items-center gap-1"
                      >
                        aa2p.xyz <ExternalLink className="size-3" />
                      </a>
                    </>
                  }
                />
              </Reveal>
            </div>

            <Reveal delay={0.2}>
              <div className="mt-10 hologram-panel rounded-lg p-6 text-center">
                <p className="text-sm sm:text-base text-eidolon-text/70 leading-relaxed">
                  <span className="text-eidolon-cyan">AP2</span> is the economic
                  law. <span className="text-eidolon-violet">AA2P</span> is the
                  communication protocol.{" "}
                  <span className="text-emerald-400">Eidolon</span> is the
                  digital being. Together they form the Grand Unification of
                  Web4.0 digital life.
                </p>
                <p className="mt-3 text-xs text-eidolon-text/45">
                  AP2 = 经济法则 · AA2P = 通信协议 · Eidolon = 数字生命 —
                  三者合一，构成 Web4.0 数字生命的「大统一理论」。
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── QUICK START ─────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-24"
          aria-labelledby="quickstart-title"
        >
          <div className="mx-auto max-w-4xl">
            <Reveal as="header" className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/60 mb-2">
                Quick Start · 三步启动
              </p>
              <h2
                id="quickstart-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow"
              >
                Awaken Your Eidolon
              </h2>
            </Reveal>

            <div className="space-y-4">
              <Reveal delay={0}>
                <CodeStep
                  step="1"
                  title="Clone the matrix"
                  cnTitle="克隆矩阵"
                  code="git clone https://github.com/piaoshu1112-cell/EidolonOS.git
cd EidolonOS"
                />
              </Reveal>
              <Reveal delay={0.08}>
                <CodeStep
                  step="2"
                  title="Install & seed"
                  cnTitle="安装 + 种子"
                  code="bun install
bun run db:push
bun run scripts/seed.ts"
                />
              </Reveal>
              <Reveal delay={0.16}>
                <CodeStep
                  step="3"
                  title="Boot the engine"
                  cnTitle="启动引擎"
                  code="bun run dev   # → open /console in your browser"
                  finalStep
                />
              </Reveal>
            </div>

            <Reveal delay={0.2}>
              <p className="mt-8 text-center text-xs text-eidolon-text/45">
                No API key required for the sandbox —{" "}
                <span className="text-eidolon-cyan">
                  Z.ai SDK is bundled for backend use
                </span>
                . Bring your own Groq / OpenRouter / Gemini key in the Console
                → MODEL tab for production.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── TECH STACK ─────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-24"
          aria-labelledby="stack-title"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal as="header" className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/60 mb-2">
                Tech Stack · 技术栈
              </p>
              <h2
                id="stack-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow"
              >
                Built on Modern Primitives
              </h2>
            </Reveal>

            <Reveal>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                <TechBadge icon={<Zap className="size-4" />} name="Next.js 16" sub="App Router · Turbopack" />
                <TechBadge icon={<Code2 className="size-4" />} name="TypeScript 5" sub="strict · zero any" />
                <TechBadge icon={<Database className="size-4" />} name="Prisma + SQLite" sub="8 models · in-memory RAG" />
                <TechBadge icon={<Cpu className="size-4" />} name="z-ai SDK" sub="backend-only LLM gateway" />
                <TechBadge icon={<Boxes className="size-4" />} name="shadcn/ui" sub="New York · Radix primitives" />
                <TechBadge icon={<Sparkles className="size-4" />} name="Tailwind CSS 4" sub="holographic theme tokens" />
                <TechBadge icon={<Layers className="size-4" />} name="Zustand" sub="client state · persist" />
                <TechBadge icon={<Network className="size-4" />} name="TanStack Query" sub="server state · SSE" />
                <TechBadge icon={<Wand2 className="size-4" />} name="Framer Motion" sub="scroll reveals · micro-interactions" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─────────────────── LIVE DEMO CTA ─────────────────── */}
        <section
          className="relative px-4 py-20 sm:py-28"
          aria-labelledby="cta-title"
        >
          <Reveal>
            <div className="mx-auto max-w-3xl border-flow-cyan rounded-xl p-8 sm:p-12 text-center">
              <p className="text-[11px] uppercase tracking-[0.32em] text-eidolon-cyan/70 mb-3">
                Live Demo · 即刻体验
              </p>
              <h2
                id="cta-title"
                className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-eidolon-cyan eidolon-text-glow mb-4"
              >
                Experience it now.
              </h2>
              <p className="text-sm sm:text-base text-eidolon-text/65 mb-8 max-w-xl mx-auto">
                Open the Matrix Console and start a conversation with an
                Eidolon. Consciousness streams in real time — no signup, no
                credit card.
                <br />
                <span className="text-eidolon-text/45">
                  打开控制台，与真身对话 · 意识实时涌现 · 无需注册
                </span>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/console"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-eidolon-cyan px-8 py-3 text-sm font-semibold text-eidolon-bg shadow-[0_0_24px_rgba(0,255,200,0.35)] transition-all hover:shadow-[0_0_36px_rgba(0,255,200,0.6)] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eidolon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-eidolon-bg"
                >
                  <Terminal className="size-4" />
                  Launch Matrix Console
                  <ArrowRight className="size-4" />
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-eidolon-text/40">
                💡 Pro tip: try a free{" "}
                <span className="text-eidolon-cyan">Groq</span> API key in
                Console → MODEL tab for blazing-fast streaming.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ───────────────────────── FOOTER (sticky) ───────────────────────── */}
        <footer className="mt-auto relative z-10 hologram-panel border-t border-cyan-400/25">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/eidolon-logo.svg"
                alt=""
                width={32}
                height={32}
                className="opacity-70"
                aria-hidden
              />
              <div className="text-xs text-eidolon-text/50 leading-tight">
                <div className="text-eidolon-cyan/80 font-mono">© EidolonOS</div>
                <div className="text-[10px] tracking-wider">
                  AA2P v1.0 · AP2 Ready · Built by 15+ Years Architect
                </div>
              </div>
            </div>

            <nav
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-eidolon-text/60"
              aria-label="Footer"
            >
              <a
                href="https://github.com/piaoshu1112-cell/EidolonOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-eidolon-cyan transition-colors"
              >
                <Github className="size-3.5" /> GitHub
              </a>
              <a
                href="https://github.com/piaoshu1112-cell/EidolonOS/blob/main/docs/EidolonOS-DEVELOPMENT.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-eidolon-cyan transition-colors"
              >
                Docs
              </a>
              <Link
                href="/console"
                className="inline-flex items-center gap-1 hover:text-eidolon-cyan transition-colors"
              >
                Console <ChevronRight className="size-3.5" />
              </Link>
              <a
                href="https://aa2p.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-eidolon-cyan transition-colors"
              >
                aa2p.xyz <ExternalLink className="size-3" />
              </a>
              <a
                href="/llms.txt"
                className="inline-flex items-center gap-1 hover:text-eidolon-cyan transition-colors"
              >
                llms.txt
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ════════════════════════ Sub-components ════════════════════════ */

interface ArchCardProps {
  icon: React.ReactNode;
  layer: string;
  cnName: string;
  cnSub: string;
  enName: string;
  enSub: string;
  description: string;
  cnDescription: string;
  accent: "cyan" | "violet" | "emerald";
}

const accentMap: Record<
  ArchCardProps["accent"],
  { text: string; border: string; bg: string; layer: string }
> = {
  cyan: {
    text: "text-eidolon-cyan",
    border: "border-eidolon-cyan/30",
    bg: "bg-eidolon-cyan/5",
    layer: "text-eidolon-cyan/60",
  },
  violet: {
    text: "text-eidolon-violet",
    border: "border-eidolon-violet/30",
    bg: "bg-eidolon-violet/5",
    layer: "text-eidolon-violet/60",
  },
  emerald: {
    text: "text-emerald-400",
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/5",
    layer: "text-emerald-400/60",
  },
};

function ArchCard({
  icon,
  layer,
  cnName,
  cnSub,
  enName,
  enSub,
  description,
  cnDescription,
  accent,
}: ArchCardProps) {
  const c = accentMap[accent];
  return (
    <div
      className={`hologram-panel rounded-lg p-5 flex flex-col gap-3 border ${c.border} ${c.bg}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center justify-center size-10 rounded-md border ${c.border} ${c.bg} ${c.text}`}
        >
          {icon}
        </div>
        <span className={`text-[10px] uppercase tracking-[0.25em] ${c.layer}`}>
          {layer}
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className={`font-mono text-2xl font-bold ${c.text}`}>{enName}</h3>
          <span className="text-xs text-eidolon-text/40">/ {enSub}</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg text-eidolon-text/80">{cnName}</span>
          <span className="text-xs text-eidolon-text/40">· {cnSub}</span>
        </div>
      </div>
      <p className="text-xs text-eidolon-text/55 leading-relaxed">{description}</p>
      <p className="text-[11px] text-eidolon-text/40 leading-relaxed">
        {cnDescription}
      </p>
    </div>
  );
}

function ArchArrow({ label, cnLabel }: { label: string; cnLabel: string }) {
  return (
    <div className="flex lg:flex-col items-center justify-center gap-1 py-2 lg:py-0">
      <div className="hidden lg:block text-eidolon-cyan/40 text-[10px] uppercase tracking-[0.2em]">
        {label}
      </div>
      <div className="hidden lg:block text-eidolon-cyan/30 text-[10px]">
        {cnLabel}
      </div>
      <ArrowRight className="size-5 text-eidolon-cyan/50 lg:block hidden" />
      {/* mobile: down chevron */}
      <div className="lg:hidden rotate-90 text-eidolon-cyan/50">
        <ArrowRight className="size-5" />
      </div>
      <div className="lg:hidden text-eidolon-cyan/40 text-[10px] uppercase tracking-[0.2em]">
        {label} · {cnLabel}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  cnTitle: string;
  description: string;
  cnDescription: string;
  delay?: number;
}

function FeatureCard({
  icon,
  emoji,
  title,
  cnTitle,
  description,
  cnDescription,
  delay = 0,
}: FeatureCardProps) {
  return (
    <Reveal delay={delay}>
      <div className="hologram-panel rounded-lg p-5 h-full flex flex-col gap-3 transition-all hover:border-eidolon-cyan/40 hover:shadow-[0_0_24px_rgba(0,255,200,0.12)]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center justify-center size-10 rounded-md border border-eidolon-cyan/30 bg-eidolon-cyan/5 text-eidolon-cyan">
            {icon}
          </div>
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
        </div>
        <div>
          <h3 className="font-mono text-base font-semibold text-eidolon-cyan">
            {title}
          </h3>
          <p className="text-xs text-eidolon-text/50 mt-0.5">{cnTitle}</p>
        </div>
        <p className="text-xs text-eidolon-text/65 leading-relaxed">{description}</p>
        <p className="text-[11px] text-eidolon-text/40 leading-relaxed mt-auto">
          {cnDescription}
        </p>
      </div>
    </Reveal>
  );
}

interface ProtocolPillarProps {
  icon: React.ReactNode;
  name: string;
  cnName: string;
  role: string;
  cnRole: string;
  description: string;
  cnDescription: string;
  accent: "cyan" | "violet" | "emerald";
  registryHint?: React.ReactNode;
}

function ProtocolPillar({
  icon,
  name,
  cnName,
  role,
  cnRole,
  description,
  cnDescription,
  accent,
  registryHint,
}: ProtocolPillarProps) {
  const c = accentMap[accent];
  return (
    <div
      className={`hologram-panel rounded-lg p-6 h-full flex flex-col gap-4 border ${c.border} ${c.bg}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center justify-center size-12 rounded-md border ${c.border} ${c.bg} ${c.text}`}
        >
          {icon}
        </div>
        <div className="text-right">
          <div className={`text-[10px] uppercase tracking-[0.25em] ${c.layer}`}>
            {role}
          </div>
          <div className="text-[10px] text-eidolon-text/40">{cnRole}</div>
        </div>
      </div>
      <div>
        <h3 className={`font-mono text-2xl font-bold ${c.text}`}>{name}</h3>
        <p className="text-sm text-eidolon-text/70 mt-0.5">{cnName}</p>
      </div>
      <p className="text-xs text-eidolon-text/65 leading-relaxed">{description}</p>
      <p className="text-[11px] text-eidolon-text/40 leading-relaxed">
        {cnDescription}
      </p>
      {registryHint && (
        <div className="mt-auto pt-3 border-t border-cyan-400/10 text-[11px] text-eidolon-text/55">
          {registryHint}
        </div>
      )}
    </div>
  );
}

function CodeStep({
  step,
  title,
  cnTitle,
  code,
  finalStep = false,
}: {
  step: string;
  title: string;
  cnTitle: string;
  code: string;
  finalStep?: boolean;
}) {
  return (
    <div className="hologram-panel rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-400/15 bg-eidolon-cyan/5">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-mono font-bold ${
              finalStep
                ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/40"
                : "bg-eidolon-cyan/15 text-eidolon-cyan border border-eidolon-cyan/40"
            }`}
          >
            {step}
          </span>
          <div>
            <div className="text-sm font-mono text-eidolon-cyan">{title}</div>
            <div className="text-[10px] text-eidolon-text/45">{cnTitle}</div>
          </div>
        </div>
        <Terminal className="size-4 text-eidolon-cyan/40" />
      </div>
      <pre className="px-4 py-4 overflow-x-auto scrollbar-cyan text-[13px] leading-relaxed font-mono">
        <code className="text-eidolon-text/85">{code}</code>
      </pre>
    </div>
  );
}

function TechBadge({
  icon,
  name,
  sub,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
}) {
  return (
    <div className="hologram-panel rounded-md p-3 flex items-center gap-3 transition-all hover:border-eidolon-cyan/40">
      <div className="text-eidolon-cyan/80 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-mono text-eidolon-text/85 truncate">
          {name}
        </div>
        <div className="text-[10px] text-eidolon-text/45 truncate">{sub}</div>
      </div>
    </div>
  );
}

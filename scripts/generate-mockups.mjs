import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "docs", "mockups-0.7.0");
mkdirSync(outDir, { recursive: true });

// Common SVG & Brand Assets
const BRAND_SVG_ICON = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M23.89 16.17L24.11 15.83C34.56 22.65 46.23 30.38 50 43C53.77 30.38 65.44 22.65 75.89 15.83L76.11 16.17C73.43 17.98 70.97 19.99 68.85 22.46C62.18 30.23 61.05 39.66 61 49.48C60.95 59.62 61.95 69.50 68.85 77.54C70.97 80.01 73.43 82.02 76.11 83.83L75.89 84.17C65.44 77.35 53.77 69.62 50 57C46.23 69.62 34.56 77.35 24.11 84.17L23.89 83.83C26.57 82.02 29.03 80.01 31.15 77.54C38.05 69.50 39.05 59.62 39 49.48C38.95 39.66 37.82 30.23 31.15 22.46C29.03 19.99 26.57 17.98 23.89 16.17Z"/>
</svg>`;

const COMMON_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1600px;
    height: 900px;
    background: #090b10;
    color: #f3f4f6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", sans-serif;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 72px;
  }

  /* Background Glows */
  .bg-glow-1 {
    position: absolute;
    top: -150px;
    left: -150px;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(6, 182, 212, 0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  .bg-glow-2 {
    position: absolute;
    top: 100px;
    right: -100px;
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.22) 0%, rgba(139, 92, 246, 0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  .bg-glow-3 {
    position: absolute;
    bottom: -150px;
    left: 400px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }

  /* Brand Header */
  .brand-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
  }
  .brand-logo-wrap {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .brand-icon-tile {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
  }
  .brand-icon-tile svg {
    width: 26px;
    height: 26px;
    color: #ffffff;
  }
  .brand-name {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .version-pill {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.5);
    color: #c4b5fd;
    padding: 4px 12px;
    border-radius: 100px;
  }
  .badge-tag {
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 16px;
    border-radius: 100px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .badge-tag span.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 10px #10b981;
  }

  /* Content Container */
  .main-content {
    display: flex;
    position: relative;
    z-index: 10;
    flex: 1;
    margin: 24px 0;
    align-items: center;
    gap: 52px;
  }

  /* Typography */
  .title-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .eyebrow {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #38bdf8;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .headline {
    font-size: 46px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: #ffffff;
  }
  .headline-gradient {
    background: linear-gradient(135deg, #38bdf8 0%, #a78bfa 50%, #f472b6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subheadline {
    font-size: 19px;
    line-height: 1.5;
    color: #94a3b8;
    max-width: 580px;
  }

  .feature-pills {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }
  .feature-pill-item {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 16px;
    color: #e2e8f0;
  }
  .feature-pill-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b5fd;
    font-size: 13px;
    font-weight: bold;
    flex-shrink: 0;
  }

  /* Mockup Frame */
  .mockup-window {
    background: #0f141c;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .window-header {
    height: 36px;
    background: #161b24;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 8px;
  }
  .window-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .window-dot.red { background: #ef4444; }
  .window-dot.yellow { background: #f59e0b; }
  .window-dot.green { background: #10b981; }
  .window-title {
    margin-left: 12px;
    font-size: 12px;
    color: #64748b;
    font-family: monospace;
  }

  /* X Native Badges */
  .xh-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    line-height: 1.4;
  }
  .xh-chip-heat-hot {
    background: rgba(239, 68, 68, 0.18);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.35);
  }
  .xh-chip-rel-mutual {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
  .xh-chip-touch {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.35);
  }

  /* Footer Bar */
  .footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
    font-size: 14px;
    color: #64748b;
  }
  .footer-links {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .footer-link-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-weight: 500;
  }
  .footer-kbd {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 12px;
    font-family: monospace;
    color: #cbd5e1;
  }
`;

// ==========================================
// Card 1: 效果复盘（Alt+R）全景
// ==========================================
const card1HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${COMMON_CSS}

.mockup-window {
  width: 760px;
  height: 650px;
}
.mockup-body {
  display: flex;
  height: calc(100% - 36px);
  background: #000000;
}
.x-feed-mock {
  flex: 1;
  border-right: 1px solid #2f3336;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feed-tweet {
  background: #0f1419;
  border: 1px solid #2f3336;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tweet-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tweet-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #334155;
}
.tweet-user {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
.tweet-handle {
  font-size: 12px;
  color: #71767b;
}
.tweet-text {
  font-size: 13px;
  color: #e7e9ea;
  line-height: 1.4;
}
.tweet-badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.x-panel-mock {
  width: 420px;
  background: #0f1419;
  border-left: 1px solid #2f3336;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-head {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #2f3336;
}
.panel-title {
  font-size: 17px;
  font-weight: 700;
  color: #e7e9ea;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-badge {
  font-size: 11px;
  background: #1d9bf0;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
}
.panel-close {
  color: #71767b;
  font-size: 16px;
}

.panel-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.rev-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.rev-stat-box {
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 10px;
  padding: 12px 14px;
}
.rev-stat-val {
  font-size: 26px;
  font-weight: 800;
  color: #f7f9f9;
  letter-spacing: -0.02em;
}
.rev-stat-lbl {
  font-size: 12px;
  color: #71767b;
  margin-top: 4px;
}

.rev-growth-card {
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rev-growth-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.growth-tag {
  font-size: 12px;
  font-weight: 700;
  color: #00ba7c;
  background: rgba(0, 186, 124, 0.12);
  padding: 3px 8px;
  border-radius: 6px;
}
.growth-tag-sub {
  font-size: 12px;
  color: #71767b;
}

.chart-container {
  height: 55px;
  width: 100%;
}

.rev-dim-section {
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dim-header {
  font-size: 13px;
  font-weight: 700;
  color: #e7e9ea;
  margin-bottom: 2px;
}
.dim-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  color: #71767b;
}
.dim-row.is-best {
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #e7e9ea;
}
.dim-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.best-chip {
  font-size: 10px;
  font-weight: 800;
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}
.dim-val {
  font-weight: 700;
  color: #e7e9ea;
  font-family: monospace;
}
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-glow-3"></div>
  <div class="bg-grid"></div>

  <!-- Header -->
  <div class="brand-bar">
    <div class="brand-logo-wrap">
      <div class="brand-icon-tile">${BRAND_SVG_ICON}</div>
      <div class="brand-name">Xhandy <span class="version-pill">v0.7.0</span></div>
    </div>
    <div class="badge-tag">
      <span class="dot"></span>
      全新重磅功能上线
    </div>
  </div>

  <!-- Content -->
  <div class="main-content">
    <div class="title-area">
      <div class="eyebrow">✨ NEW FEATURE · ALT+R</div>
      <h1 class="headline">
        效果复盘：<br>
        <span class="headline-gradient">哪类回复看的人多？</span>
      </h1>
      <p class="subheadline">
        不再凭感觉瞎猜。系统自动梳理你最近的所有回复表现、拆解黄金时机与体量匹配规律，每日粉丝增长走势一目了然。
      </p>

      <div class="feature-pills">
        <div class="feature-pill-item">
          <div class="feature-pill-icon">✓</div>
          <div><strong>三大归因维度</strong>：回复时机、对方粉丝量、原帖热度全息交叉</div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">✓</div>
          <div><strong>最佳区间标出</strong>：一眼找出中位数浏览量最高的回复区间</div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">✓</div>
          <div><strong>30 天走势图</strong>：每日回复频次与真实粉丝增长折线同步对照</div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">✓</div>
          <div><strong>100% 本地分析</strong>：仅读 X 页面返回数据，0 外部请求，安全私密</div>
        </div>
      </div>
    </div>

    <!-- Mockup Window -->
    <div class="mockup-window">
      <div class="window-header">
        <div class="window-dot red"></div>
        <div class="window-dot yellow"></div>
        <div class="window-dot green"></div>
        <div class="window-title">x.com / Xhandy Review (Alt+R)</div>
      </div>
      <div class="mockup-body">
        <div class="x-feed-mock">
          <div class="feed-tweet">
            <div class="tweet-header">
              <div class="tweet-avatar" style="background: #2563eb;"></div>
              <div>
                <div class="tweet-user">Elon Musk</div>
                <div class="tweet-handle">@elonmusk</div>
              </div>
            </div>
            <div class="tweet-text">
              Starship Flight 7 is tracking for next month with dramatic tower catch improvements...
            </div>
            <div class="tweet-badges-row">
              <span class="xh-chip xh-chip-heat-hot">🔥 1.8万/时</span>
              <span class="xh-chip xh-chip-touch">我3 · 他0</span>
              <span class="xh-chip" style="background:#2f3336;color:#94a3b8;">💬 1.4k · 2400×</span>
            </div>
          </div>

          <div class="feed-tweet">
            <div class="tweet-header">
              <div class="tweet-avatar" style="background: #8b5cf6;"></div>
              <div>
                <div class="tweet-user">AI Builder</div>
                <div class="tweet-handle">@builder_x</div>
              </div>
            </div>
            <div class="tweet-text">
              Shipped our open-source extension today! Over 5,000 installs in week 1.
            </div>
            <div class="tweet-badges-row">
              <span class="xh-chip xh-chip-rel-mutual">⇄ 互关</span>
              <span class="xh-chip xh-chip-touch">我4 · 他2</span>
              <span class="xh-chip xh-chip-heat-hot">⚡ 2.4k/时</span>
            </div>
          </div>
        </div>

        <div class="x-panel-mock">
          <div class="panel-head">
            <div class="panel-title">
              效果复盘
              <span class="panel-badge">Alt+R</span>
            </div>
            <div class="panel-close">✕</div>
          </div>
          <div class="panel-content">
            <div class="rev-summary-grid">
              <div class="rev-stat-box">
                <div class="rev-stat-val">186</div>
                <div class="rev-stat-lbl">近 7 天回复数</div>
              </div>
              <div class="rev-stat-box">
                <div class="rev-stat-val">2.4k</div>
                <div class="rev-stat-lbl">近 7 天中位数浏览</div>
              </div>
            </div>

            <div class="rev-growth-card">
              <div class="rev-growth-top">
                <div class="growth-tag">7 天内 +142</div>
                <div class="growth-tag-sub">30 天内 +680 粉丝</div>
              </div>
              <svg class="chart-container" viewBox="0 0 300 55">
                <rect x="10" y="38" width="5" height="15" fill="#2f3336" rx="1"/>
                <rect x="25" y="30" width="5" height="23" fill="#2f3336" rx="1"/>
                <rect x="40" y="22" width="5" height="31" fill="#2f3336" rx="1"/>
                <rect x="55" y="32" width="5" height="21" fill="#2f3336" rx="1"/>
                <rect x="70" y="18" width="5" height="35" fill="#1d9bf0" rx="1"/>
                <rect x="85" y="14" width="5" height="39" fill="#1d9bf0" rx="1"/>
                <rect x="100" y="26" width="5" height="27" fill="#1d9bf0" rx="1"/>
                <rect x="115" y="16" width="5" height="37" fill="#1d9bf0" rx="1"/>
                <rect x="130" y="10" width="5" height="43" fill="#1d9bf0" rx="1"/>
                <rect x="145" y="20" width="5" height="33" fill="#1d9bf0" rx="1"/>
                <rect x="160" y="12" width="5" height="41" fill="#1d9bf0" rx="1"/>
                <rect x="175" y="24" width="5" height="29" fill="#1d9bf0" rx="1"/>
                <rect x="190" y="8" width="5" height="45" fill="#1d9bf0" rx="1"/>
                <rect x="205" y="10" width="5" height="43" fill="#1d9bf0" rx="1"/>
                <rect x="220" y="16" width="5" height="37" fill="#1d9bf0" rx="1"/>
                <rect x="235" y="5" width="5" height="48" fill="#1d9bf0" rx="1"/>
                <rect x="250" y="12" width="5" height="41" fill="#1d9bf0" rx="1"/>
                <rect x="265" y="7" width="5" height="46" fill="#1d9bf0" rx="1"/>
                <rect x="280" y="4" width="5" height="49" fill="#00ba7c" rx="1"/>
                <path d="M 12 46 Q 80 38, 140 28 T 282 10" fill="none" stroke="#00ba7c" stroke-width="2.5"/>
                <circle cx="282" cy="10" r="3.5" fill="#00ba7c"/>
              </svg>
            </div>

            <div class="rev-dim-section">
              <div class="dim-header">回复时机 (Delay)</div>
              <div class="dim-row is-best">
                <div class="dim-label">
                  <span>1 小时内</span>
                  <span class="best-chip">最佳</span>
                </div>
                <div class="dim-val">3.2k 浏览</div>
              </div>
              <div class="dim-row">
                <div class="dim-label">1–6 小时</div>
                <div class="dim-val">1.4k 浏览</div>
              </div>
              <div class="dim-row">
                <div class="dim-label">24 小时以上</div>
                <div class="dim-val">410 浏览</div>
              </div>
            </div>

            <div class="rev-dim-section">
              <div class="dim-header">对方粉丝量 (Author Size)</div>
              <div class="dim-row is-best">
                <div class="dim-label">
                  <span>自身 2–10 倍</span>
                  <span class="best-chip">最佳</span>
                </div>
                <div class="dim-val">3.8k 浏览</div>
              </div>
              <div class="dim-row">
                <div class="dim-label">自身 10 倍以上</div>
                <div class="dim-val">1.9k 浏览</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer-bar">
    <div>Xhandy 专注辅助手动互动 · 开源免费 · 从不替你操作</div>
    <div class="footer-links">
      <div class="footer-link-item"><span class="footer-kbd">Alt+R</span> 效果复盘</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+U</span> 没回关我</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+K</span> 沉默重点账号</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// Card 2: 归因分析 & 黄金时机对比 (Fixed Wrapping)
// ==========================================
const card2HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${COMMON_CSS}

.main-content {
  flex-direction: column;
  gap: 24px;
  align-items: stretch;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.analysis-card {
  background: rgba(15, 20, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
}
.analysis-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #06b6d4, #8b5cf6);
}
.card-tag {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #38bdf8;
}
.card-title {
  font-size: 23px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}
.card-desc {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}
.bar-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}
.bar-lbl-left { color: #cbd5e1; display: flex; align-items: center; gap: 6px; }
.bar-lbl-right { color: #38bdf8; font-family: monospace; font-weight: 700; }
.bar-track {
  height: 8px;
  background: #1e293b;
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: #475569;
}
.bar-fill.highlight {
  background: linear-gradient(90deg, #06b6d4, #8b5cf6);
}

.card-summary-pill {
  margin-top: auto;
  padding: 12px 14px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.pill-icon {
  font-size: 15px;
  line-height: 1.4;
  flex-shrink: 0;
}
.pill-text {
  flex: 1;
  font-size: 13px;
  color: #c4b5fd;
  line-height: 1.5;
}
.pill-text strong {
  color: #ffffff;
}
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-grid"></div>

  <div class="brand-bar">
    <div class="brand-logo-wrap">
      <div class="brand-icon-tile">${BRAND_SVG_ICON}</div>
      <div class="brand-name">Xhandy <span class="version-pill">v0.7.0</span></div>
    </div>
    <div class="badge-tag">
      <span class="dot"></span>
      智能归因矩阵
    </div>
  </div>

  <div class="main-content">
    <div class="header-row">
      <div class="title-area">
        <div class="eyebrow">📊 DEEP ATTRIBUTION</div>
        <h1 class="headline" style="font-size: 40px;">
          打破玄学：<span class="headline-gradient">找到你的「黄金回复区间」</span>
        </h1>
      </div>
      <p class="subheadline" style="text-align: right; max-width: 480px; font-size: 16px;">
        为什么有的回复能拿上万浏览，有的却沉底？Xhandy 按三大关键维度聚类，揭示真实分发规律。
      </p>
    </div>

    <div class="cards-grid">
      <!-- Card A -->
      <div class="analysis-card">
        <div class="card-tag">DIMENSION 01</div>
        <div class="card-title">回复时机 (Delay)</div>
        <div class="card-desc">原帖发出后你在什么时间介入？黄金 1 小时窗口决定了回复能否被算法置顶。</div>

        <div class="bar-group">
          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">⚡ 1 小时内 <span style="color:#06b6d4;font-size:11px;">[最佳]</span></span>
              <span class="bar-lbl-right">3,200 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill highlight" style="width: 100%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">⏱ 1–6 小时</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">1,420 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 45%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🌙 24 小时以上</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">410 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 14%;"></div></div>
          </div>
        </div>

        <div class="card-summary-pill">
          <span class="pill-icon">💡</span>
          <div class="pill-text"><strong>结论</strong>：前 60 分钟内回复，中位数浏览量高达后期的 <strong>7.8 倍</strong>。</div>
        </div>
      </div>

      <!-- Card B -->
      <div class="analysis-card">
        <div class="card-tag">DIMENSION 02</div>
        <div class="card-title">对方体量 (Author Size)</div>
        <div class="card-desc">盲目回巨号往往被海量评论淹没。自身 2–10 倍的同赛道博主通常互动价值最高。</div>

        <div class="bar-group">
          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🎯 自身 2–10 倍 <span style="color:#06b6d4;font-size:11px;">[最佳]</span></span>
              <span class="bar-lbl-right">3,850 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill highlight" style="width: 100%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🚀 自身 10 倍以上 (大号)</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">1,920 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 50%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🤝 不到自身 2 倍</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">880 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 23%;"></div></div>
          </div>
        </div>

        <div class="card-summary-pill">
          <span class="pill-icon">💡</span>
          <div class="pill-text"><strong>结论</strong>：中腰部同频博主有真实回评习惯，互动转化效率最强。</div>
        </div>
      </div>

      <!-- Card C -->
      <div class="analysis-card">
        <div class="card-tag">DIMENSION 03</div>
        <div class="card-title">原帖热度 (Post Heat)</div>
        <div class="card-desc">配合 Xhandy 独家每小时测速标签，在帖子起势爆发前精准入场。</div>

        <div class="bar-group">
          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🔥 高热度 (>1万/时) <span style="color:#06b6d4;font-size:11px;">[最佳]</span></span>
              <span class="bar-lbl-right">4,600 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill highlight" style="width: 100%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">⚡ 有热度 (1千-1万/时)</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">2,100 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 46%;"></div></div>
          </div>

          <div class="bar-row">
            <div class="bar-labels">
              <span class="bar-lbl-left">🌱 较平淡</span>
              <span class="bar-lbl-right" style="color:#94a3b8;">520 浏览</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: 12%;"></div></div>
          </div>
        </div>

        <div class="card-summary-pill">
          <span class="pill-icon">💡</span>
          <div class="pill-text"><strong>协同</strong>：红标「1.5万/时 🔥」提示热帖起飞，搭乘算法公域快车。</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div>所有统计仅基于你自己浏览过的公开数据，本地离线计算 · 绝不外传</div>
    <div class="footer-links">
      <div class="footer-link-item"><span class="footer-kbd">Alt+R</span> 随时调出复盘面板</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// Card 3: 侧边栏常驻 & 没回关列表透视
// ==========================================
const card3HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${COMMON_CSS}

.mockup-window {
  width: 780px;
  height: 630px;
}
.mockup-body {
  display: flex;
  height: calc(100% - 36px);
  background: #000000;
}
.x-feed-mock {
  flex: 1;
  border-right: 1px solid #2f3336;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.user-card-mock {
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 12px;
  padding: 16px;
}
.user-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar-mock {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #334155;
}
.follow-btn-mock {
  background: #eff3f4;
  color: #0f1419;
  font-weight: 700;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 100px;
}

.x-panel-mock {
  width: 440px;
  background: #0f1419;
  border-left: 1px solid #2f3336;
  display: flex;
  flex-direction: column;
}
.panel-head {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #2f3336;
}
.panel-title {
  font-size: 17px;
  font-weight: 700;
  color: #e7e9ea;
}
.panel-meta {
  font-size: 13px;
  color: #71767b;
}

.panel-list {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.panel-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #16181c;
  border: 1px solid #2f3336;
  border-radius: 10px;
}
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #334155, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #94a3b8;
}
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.user-name-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-name {
  font-size: 14px;
  font-weight: 700;
  color: #e7e9ea;
}
.user-handle {
  font-size: 13px;
  color: #71767b;
}
.user-counts-pill {
  font-size: 12px;
  font-weight: 600;
  color: #38bdf8;
  background: rgba(6, 182, 212, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 2px;
  font-family: monospace;
}
.user-rel-hint {
  font-size: 11px;
  color: #f43f5e;
}

.state-kept-banner {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 14px;
}
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-grid"></div>

  <div class="brand-bar">
    <div class="brand-logo-wrap">
      <div class="brand-icon-tile">${BRAND_SVG_ICON}</div>
      <div class="brand-name">Xhandy <span class="version-pill">v0.7.0</span></div>
    </div>
    <div class="badge-tag">
      <span class="dot"></span>
      体验与细节革新
    </div>
  </div>

  <div class="main-content">
    <div class="title-area">
      <div class="eyebrow">🚀 WORKFLOW & PERSISTENCE</div>
      <h1 class="headline">
        侧边栏常驻 · <br>
        <span class="headline-gradient">粉丝数透视一览</span>
      </h1>
      <p class="subheadline">
        清理「未回关」账号再也不用反复点开主页。点进主页、后退、刷新页面，侧边栏保持打开且保留原滚动位置。
      </p>

      <div class="feature-pills">
        <div class="feature-pill-item">
          <div class="feature-pill-icon">⇄</div>
          <div><strong>刷新/跳转不丢失</strong>：侧边栏状态与滚动进度全自动记忆跨页面留存</div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">👥</div>
          <div><strong>粉丝/关注数一览</strong>：列表直接显示 <code>28.4k 关注者 · 420 关注中</code></div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">🎯</div>
          <div><strong>精准清理断连</strong>：一眼区分「行业巨号未回关」还是「低粉沉睡死号」</div>
        </div>
        <div class="feature-pill-item">
          <div class="feature-pill-icon">⚡</div>
          <div><strong>极速快捷操作</strong>：按键 <kbd class="footer-kbd">Alt+U</kbd> 瞬间唤起，按 <kbd class="footer-kbd">Shift+F</kbd> 聚焦关注按钮</div>
        </div>
      </div>
    </div>

    <!-- Mockup Window -->
    <div class="mockup-window">
      <div class="window-header">
        <div class="window-dot red"></div>
        <div class="window-dot yellow"></div>
        <div class="window-dot green"></div>
        <div class="window-title">x.com / Not Following You Back (Alt+U)</div>
      </div>
      <div class="mockup-body">
        <div class="x-feed-mock">
          <div style="font-size: 13px; color: #71767b; margin-bottom: 2px;">个人主页已打开，侧边栏依然就绪：</div>
          <div class="user-card-mock">
            <div class="user-card-header">
              <div class="user-card-left">
                <div class="avatar-mock" style="background:#06b6d4;"></div>
                <div>
                  <div style="font-size: 15px; font-weight: bold; color: #fff;">Alex Chen</div>
                  <div style="font-size: 12px; color: #71767b;">@alex_builder</div>
                </div>
              </div>
              <div class="follow-btn-mock">正在关注</div>
            </div>
            <div style="margin-top: 12px; font-size: 13px; color: #94a3b8; line-height: 1.4;">
              Building micro-SaaS tools. Writing about automation and indie hacking.
            </div>
            <div style="margin-top: 12px; display: flex; gap: 14px; font-size: 13px; color: #71767b;">
              <div><strong style="color:#fff;">420</strong> 正在关注</div>
              <div><strong style="color:#fff;">28.4k</strong> 关注者</div>
            </div>
          </div>
        </div>

        <div class="x-panel-mock">
          <div class="panel-head">
            <div class="panel-title">没回关我 (42 人)</div>
            <div class="panel-meta">Alt+U</div>
          </div>

          <div class="state-kept-banner">
            <span>✓</span> 跨页面/刷新已常驻，原位保留
          </div>

          <div class="panel-list">
            <div class="panel-user-row">
              <div class="user-avatar" style="background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff;">AC</div>
              <div class="user-info">
                <div class="user-name-line">
                  <span class="user-name">Alex Chen</span>
                  <span class="user-rel-hint">曾是互关 · 3天前取消</span>
                </div>
                <div class="user-handle">@alex_builder</div>
                <div><span class="user-counts-pill">28.4k 关注者 · 420 关注中</span></div>
              </div>
            </div>

            <div class="panel-user-row">
              <div class="user-avatar" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff;">ST</div>
              <div class="user-info">
                <div class="user-name-line">
                  <span class="user-name">Sarah Tech</span>
                  <span style="font-size: 11px; color: #71767b;">已关注 14 天</span>
                </div>
                <div class="user-handle">@sarahtech_ai</div>
                <div><span class="user-counts-pill">5.1k 关注者 · 1.8k 关注中</span></div>
              </div>
            </div>

            <div class="panel-user-row">
              <div class="user-avatar" style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff;">DN</div>
              <div class="user-info">
                <div class="user-name-line">
                  <span class="user-name">DevNotes</span>
                  <span style="font-size: 11px; color: #71767b;">已关注 30 天</span>
                </div>
                <div class="user-handle">@devnotes_daily</div>
                <div><span class="user-counts-pill">890 关注者 · 920 关注中</span></div>
              </div>
            </div>

            <div class="panel-user-row">
              <div class="user-avatar" style="background: linear-gradient(135deg, #10b981, #06b6d4); color: #fff;">CW</div>
              <div class="user-info">
                <div class="user-name-line">
                  <span class="user-name">CryptoWhale</span>
                  <span style="font-size: 11px; color: #38bdf8;">行业头部大号</span>
                </div>
                <div class="user-handle">@cryptowhale_x</div>
                <div><span class="user-counts-pill">120k 关注者 · 85 关注中</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div>关注助手仅负责聚焦关注按钮，按回车确认的是你本人 · 绝不自动点击</div>
    <div class="footer-links">
      <div class="footer-link-item"><span class="footer-kbd">Shift+F</span> 聚焦关注按钮</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+U</span> 开关未回关列表</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// Card 4: 全功能全景与极客哲学
// ==========================================
const card4HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${COMMON_CSS}

.main-content {
  flex-direction: column;
  gap: 28px;
  align-items: stretch;
}

.top-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.features-matrix {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.matrix-card {
  background: rgba(15, 20, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.matrix-icon-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.matrix-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.icon-1 { background: rgba(244, 63, 94, 0.15); color: #fb7185; }
.icon-2 { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.icon-3 { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.icon-4 { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.matrix-title {
  font-size: 19px;
  font-weight: 700;
  color: #fff;
}
.matrix-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
}

.principles-banner {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 20px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.principle-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.principle-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
}
.principle-circle.green {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
.principle-text h4 {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
}
.principle-text p {
  font-size: 12px;
  color: #94a3b8;
}

.install-methods {
  display: flex;
  align-items: center;
  gap: 16px;
}
.install-btn {
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.install-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-glow-3"></div>
  <div class="bg-grid"></div>

  <div class="brand-bar">
    <div class="brand-logo-wrap">
      <div class="brand-icon-tile">${BRAND_SVG_ICON}</div>
      <div class="brand-name">Xhandy <span class="version-pill">v0.7.0</span></div>
    </div>
    <div class="badge-tag">
      <span class="dot"></span>
      专为手动起号创作者设计
    </div>
  </div>

  <div class="main-content">
    <div class="top-hero">
      <div class="title-area">
        <div class="eyebrow">🛡️ PHILOSOPHY & CAPABILITIES</div>
        <h1 class="headline" style="font-size: 42px;">
          顺手提示 · <span class="headline-gradient">绝不越界代操作</span>
        </h1>
        <p class="subheadline" style="font-size: 18px;">
          告别黑产挂机机器人。Xhandy 将热度、关系与数据复盘自然融合在原生页面中，让你的每一条手工互动都更有杀伤力。
        </p>
      </div>

      <div class="install-methods">
        <div class="install-btn">
          <span>🛍️</span> Chrome 应用商店官方已上架
        </div>
        <div class="install-btn secondary">
          <span>🐙</span> GitHub 开源仓库 (MIT)
        </div>
      </div>
    </div>

    <!-- Matrix -->
    <div class="features-matrix">
      <div class="matrix-card">
        <div class="matrix-icon-row">
          <div class="matrix-icon icon-1">🔥</div>
          <span class="xh-chip xh-chip-heat-hot">1.5万/时</span>
        </div>
        <div class="matrix-title">实时热度测速</div>
        <div class="matrix-desc">每小时浏览量动态计算，&gt;1000 变橙，&gt;1万 标红带 🔥，超过 48 小时自动置灰防挖坟。</div>
      </div>

      <div class="matrix-card">
        <div class="matrix-icon-row">
          <div class="matrix-icon icon-2">⇄</div>
          <span class="xh-chip xh-chip-rel-mutual">⇄ 互关</span>
        </div>
        <div class="matrix-title">关系与互动深度</div>
        <div class="matrix-desc">帖子旁直显互关/单向关注、互动频次（我3·他5）；特别关注星标、沉默账号预警。</div>
      </div>

      <div class="matrix-card">
        <div class="matrix-icon-row">
          <div class="matrix-icon icon-3">📊</div>
          <span class="xh-chip" style="background:#2563eb;color:#fff;">Alt+R</span>
        </div>
        <div class="matrix-title">效果复盘 (Alt+R)</div>
        <div class="matrix-desc">回复浏览与点赞归因分析、黄金时机/体量推荐、每日粉丝增长走势曲线图。</div>
      </div>

      <div class="matrix-card">
        <div class="matrix-icon-row">
          <div class="matrix-icon icon-4">🛡️</div>
          <span class="xh-chip" style="background:rgba(16,185,129,0.2);color:#34d399;">软上限保护</span>
        </div>
        <div class="matrix-title">防风控与软上限</div>
        <div class="matrix-desc">智能防重复回复相似度提醒；每日关注、取关设定安全软上限提醒，杜绝像机器人。</div>
      </div>
    </div>

    <!-- Three Rules -->
    <div class="principles-banner">
      <div class="principle-item">
        <div class="principle-circle">✕</div>
        <div class="principle-text">
          <h4>绝不替你操作</h4>
          <p>不点击、不输入、不自动关注、不自动发帖</p>
        </div>
      </div>

      <div class="principle-item">
        <div class="principle-circle">✕</div>
        <div class="principle-text">
          <h4>默认不联网外发</h4>
          <p>0 第三方统计、0 远程代码，只克隆 X 本地响应</p>
        </div>
      </div>

      <div class="principle-item">
        <div class="principle-circle green">✓</div>
        <div class="principle-text">
          <h4>数据 100% 存在本地</h4>
          <p>存储于浏览器 local storage，支持随时导入导出</p>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-bar">
    <div>开源地址：github.com/jackxlabs/xhandy · 反馈私信 @JackHuang47</div>
    <div class="footer-links">
      <div class="footer-link-item"><span class="footer-kbd">Alt+R</span> 效果复盘</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+U</span> 没回关我</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+K</span> 沉默重点</div>
      <div class="footer-link-item"><span class="footer-kbd">Alt+B</span> 爆款搜索</div>
      <div class="footer-link-item"><span class="footer-kbd">Shift+F</span> 聚焦关注</div>
    </div>
  </div>
</body>
</html>`;

async function main() {
  console.log("Generating refined HTML templates...");
  const cards = [
    { name: "01-review-view", html: card1HTML },
    { name: "02-attribution-insights", html: card2HTML },
    { name: "03-panel-and-counts", html: card3HTML },
    { name: "04-overview-and-safety", html: card4HTML }
  ];

  for (const c of cards) {
    writeFileSync(join(outDir, `${c.name}.html`), c.html);
  }

  console.log("Launching Chromium via Playwright...");
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2
  });

  for (const c of cards) {
    console.log(`Rendering ${c.name}.png (3200x1800)...`);
    const fileUrl = "file://" + join(outDir, `${c.name}.html`);
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    await page.screenshot({
      path: join(outDir, `${c.name}.png`),
      type: "png"
    });
  }

  await browser.close();
  console.log("All mockups generated successfully in docs/mockups-0.7.0/");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

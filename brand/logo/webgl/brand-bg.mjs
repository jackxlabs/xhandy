// brand-bg.mjs: palette-driven animated WebGL backgrounds for websites. No dependencies, WebGL 1.
//
//   import { mountBrandBackground } from './brand-bg.mjs'
//   const bg = mountBrandBackground(document.querySelector('canvas'), {
//     style: 'fluid', colors: ['#06b6d4', '#8b5cf6', '#ec4899'], background: '#0b0a12',
//   })
//   bg.setStyle('ripple'); bg.destroy()
//
// Styles: fluid, aurora, led, silk, ripple (dark backgrounds) and mesh (light background).
// Built in: prefers-reduced-motion renders one still frame, rendering pauses off-screen and in hidden tabs,
// device pixel ratio is capped (maxDpr), pointer movement eases in, and no WebGL falls back to a CSS gradient.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

const COMMON = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
uniform vec3 u_bg; uniform vec3 u_c0; uniform vec3 u_c1; uniform vec3 u_c2; uniform float u_intensity;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}
vec3 pal(float t){t=clamp(t,0.,1.);return t<.5?mix(u_c0,u_c1,t*2.):mix(u_c1,u_c2,t*2.-1.);}
float grain(vec2 fc){return (hash(fc+fract(u_time*.37))-.5)*.035;}
`

const FRAG = {
  // domain-warped noise: soft currents of the palette over a dark base
  fluid: `void main(){vec2 uv=gl_FragCoord.xy/u_res;vec2 p=uv*vec2(u_res.x/u_res.y,1.)*1.6;float t=u_time*.05;
    vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));
    vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*1.5+u_mouse*.6),fbm(p+3.*q+vec2(8.3,2.8)-t));
    float f=fbm(p+3.*r);
    vec3 col=mix(u_bg,pal(clamp(uv.x*.9+.05+(r.x-.5)*.7,0.,1.))*1.15,clamp(smoothstep(.3,.85,f)*u_intensity,0.,1.));
    gl_FragColor=vec4(col+grain(gl_FragCoord.xy),1.);}`,
  // a slow light edge entering from the top-right corner, palette along the arc
  aurora: `void main(){vec2 uv=gl_FragCoord.xy/u_res;float a=u_res.x/u_res.y;vec2 p=vec2(uv.x*a,uv.y);
    vec2 c=vec2(a+.15,1.2)-u_mouse*.06;vec2 d=p-c;float r=length(d);float ang=atan(d.y,d.x);
    float t=clamp((ang+3.1416)/1.5708,0.,1.);
    float n=fbm(vec2(ang*2.5,u_time*.07));
    float band=exp(-pow((r-.85-n*.3)*3.,2.))+.35*exp(-pow((r-.6-n*.2)*6.,2.));
    vec3 col=u_bg+pal(t)*band*u_intensity;
    gl_FragColor=vec4(col+grain(gl_FragCoord.xy),1.);}`,
  // glowing dot matrix with a wave rolling out from the pointer
  led: `void main(){vec2 fc=gl_FragCoord.xy;float cell=max(10.,u_res.y/56.);vec2 g=floor(fc/cell);vec2 f=fract(fc/cell)-.5;
    vec2 uv=(g*cell)/u_res;float a=u_res.x/u_res.y;
    float w=sin(length((uv-u_mouse)*vec2(a,1.))*11.-u_time*1.4)*.5+.5;
    float n=noise(g*.13+u_time*.15);
    float b=pow(clamp(w*.65+n*.55,0.,1.),2.2)*u_intensity;
    float dotm=smoothstep(.36,.24,length(f));
    gl_FragColor=vec4(u_bg+pal(uv.x*.8+n*.2)*dotm*b,1.);}`,
  // silk ribbons: thin glowing sine lines, one per palette step
  silk: `void main(){vec2 uv=gl_FragCoord.xy/u_res;float a=u_res.x/u_res.y;float x=uv.x*a;vec3 col=u_bg;float t=u_time*.22;
    for(int i=0;i<5;i++){float fi=float(i);
      float y=.5+.16*sin(x*(1.1+fi*.28)+t*(1.+fi*.15)+fi*1.3+u_mouse.x*1.5)+.05*sin(x*3.1-t*1.7+fi)+(fi-2.)*.045;
      float d=abs(uv.y-y);
      col+=pal(fi/4.)*(exp(-d*d*2600.)*.9+.0018/(d+.006))*u_intensity*.55;}
    gl_FragColor=vec4(col+grain(gl_FragCoord.xy),1.);}`,
  // two sources rippling toward each other; the pointer moves the second one
  ripple: `void main(){vec2 uv=gl_FragCoord.xy/u_res;float a=u_res.x/u_res.y;vec2 p=vec2(uv.x*a,uv.y);
    vec2 s1=vec2(.22*a,.32);vec2 s2=vec2(u_mouse.x*a,u_mouse.y);
    float d1=length(p-s1),d2=length(p-s2);
    float w=sin(d1*38.-u_time*1.8)*exp(-d1*2.)+sin(d2*38.-u_time*1.8)*exp(-d2*2.);
    float l=smoothstep(.05,1.1,w+.15);
    vec3 col=u_bg+pal(d1/(d1+d2))*l*.6*u_intensity+pal(.5)*.08*exp(-min(d1,d2)*3.);
    gl_FragColor=vec4(col+grain(gl_FragCoord.xy),1.);}`,
  // light mode: three soft palette blobs drifting over a pale base
  mesh: `void main(){vec2 uv=gl_FragCoord.xy/u_res;float a=u_res.x/u_res.y;vec2 p=uv*vec2(a,1.);float t=u_time*.06;
    vec2 b0=vec2(.18+.08*sin(t*1.3),.28+.1*cos(t))*vec2(a,1.);
    vec2 b1=vec2(.78+.08*cos(t*.9),.3+.12*sin(t*1.1))*vec2(a,1.);
    vec2 b2=vec2(.55+.1*sin(t*.7)+(u_mouse.x-.5)*.08,.82+.06*cos(t*1.4))*vec2(a,1.);
    vec3 col=u_bg;
    col=mix(col,u_c0,exp(-pow(length(p-b0),2.)*4.5)*.5*u_intensity);
    col=mix(col,u_c1,exp(-pow(length(p-b1),2.)*4.5)*.45*u_intensity);
    col=mix(col,u_c2,exp(-pow(length(p-b2),2.)*4.5)*.45*u_intensity);
    gl_FragColor=vec4(col+grain(gl_FragCoord.xy)*.5,1.);}`,
}

export const STYLES = Object.keys(FRAG)
const DEFAULT_MOUSE = { ripple: [0.78, 0.68] }
const LIGHT = new Set(['mesh'])

function rgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function mountBrandBackground(canvas, options = {}) {
  const o = {
    style: 'fluid', colors: ['#06b6d4', '#8b5cf6', '#ec4899'], background: null,
    intensity: 1, speed: 1, interactive: true, maxDpr: 1.5, ...options,
  }
  const bgFor = (style) => o.background || (LIGHT.has(style) ? '#f6f5fa' : '#0b0a12')
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' })
  if (!gl) {
    canvas.style.background = `linear-gradient(135deg, ${o.colors.join(', ')})`
    return { setStyle() {}, destroy() {} }
  }

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const programs = {}
  function program(style) {
    if (programs[style]) return programs[style]
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`brand-bg ${style}: ${gl.getShaderInfoLog(s)}`)
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, COMMON + FRAG[style]))
    gl.linkProgram(p)
    const u = (n) => gl.getUniformLocation(p, n)
    programs[style] = { p, loc: gl.getAttribLocation(p, 'p'),
      res: u('u_res'), time: u('u_time'), mouse: u('u_mouse'), bg: u('u_bg'),
      c0: u('u_c0'), c1: u('u_c1'), c2: u('u_c2'), intensity: u('u_intensity') }
    return programs[style]
  }

  let style = STYLES.includes(o.style) ? o.style : 'fluid'
  let mouse = (DEFAULT_MOUSE[style] || [0.5, 0.5]).slice()
  let target = mouse.slice()
  const [c0, c1, c2] = [o.colors[0], o.colors[1] || o.colors[0], o.colors[2] || o.colors[1] || o.colors[0]].map(rgb)

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
  }

  const t0 = performance.now()
  function draw(now) {
    resize()
    mouse[0] += (target[0] - mouse[0]) * 0.04
    mouse[1] += (target[1] - mouse[1]) * 0.04
    const P = program(style)
    gl.useProgram(P.p)
    gl.enableVertexAttribArray(P.loc)
    gl.vertexAttribPointer(P.loc, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(P.res, canvas.width, canvas.height)
    gl.uniform1f(P.time, ((now - t0) / 1000) * o.speed + 20)
    gl.uniform2f(P.mouse, mouse[0], mouse[1])
    gl.uniform3fv(P.bg, rgb(bgFor(style)))
    gl.uniform3fv(P.c0, c0); gl.uniform3fv(P.c1, c1); gl.uniform3fv(P.c2, c2)
    gl.uniform1f(P.intensity, o.intensity)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0, onScreen = true
  const loop = (now) => { draw(now); raf = requestAnimationFrame(loop) }
  const start = () => { if (!raf && !still && onScreen && !document.hidden) raf = requestAnimationFrame(loop) }
  const stop = () => { cancelAnimationFrame(raf); raf = 0 }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop() }) : null
  io && io.observe(canvas)
  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    target = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]
  }
  o.interactive && window.addEventListener('pointermove', onMove, { passive: true })
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => still && draw(performance.now())) : null
  ro && ro.observe(canvas)

  draw(performance.now())
  start()

  return {
    setStyle(next) {
      if (!FRAG[next]) return
      style = next
      mouse = (DEFAULT_MOUSE[style] || [0.5, 0.5]).slice()
      target = mouse.slice()
      draw(performance.now())
    },
    destroy() {
      stop()
      io && io.disconnect()
      ro && ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
    },
  }
}

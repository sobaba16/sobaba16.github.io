// ===== Neural Operator Motion Graphic =====
// Visualizes: Input Function u(x) → Neural Operator G → Output Function G(u)(y)
// Shows function-to-function mapping with flowing data particles

(function() {
    const canvas = document.getElementById('neuralOperatorCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, animId;
    let time = 0;

    function getAccentColor(alpha) {
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim();
        // Convert hex to rgba
        const r = parseInt(accent.slice(1,3), 16);
        const g = parseInt(accent.slice(3,5), 16);
        const b = parseInt(accent.slice(5,7), 16);
        return { r, g, b, rgba: `rgba(${r},${g},${b},${alpha})` };
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    // Layout zones
    function getLayout() {
        const cx = W / 2;
        const cy = H / 2;
        const zoneW = Math.min(W * 0.85, 900);
        const left = cx - zoneW / 2;
        const right = cx + zoneW / 2;
        const inputX = left + zoneW * 0.12;
        const outputX = right - zoneW * 0.12;
        const networkCx = cx;
        const funcH = Math.min(H * 0.22, 120);
        return { cx, cy, zoneW, left, right, inputX, outputX, networkCx, funcH };
    }

    // Draw a smooth animated function curve
    function drawFunction(x, cy, width, height, phase, color, label, isOutput) {
        const { r, g, b } = color;
        const points = [];
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x - width/2 + t * width;
            let py;
            if (isOutput) {
                // Output: smoother, transformed function
                py = cy + Math.sin(t * Math.PI * 2 + phase * 0.7) * height * 0.4
                       + Math.sin(t * Math.PI * 4 - phase * 0.3) * height * 0.15;
            } else {
                // Input: more complex function
                py = cy + Math.sin(t * Math.PI * 3 + phase) * height * 0.35
                       + Math.cos(t * Math.PI * 5 + phase * 0.5) * height * 0.18
                       + Math.sin(t * Math.PI * 1.5 - phase * 0.8) * height * 0.12;
            }
            points.push({ x: px, y: py });
        }

        // Glow
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.08)`;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Main line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},0.45)`;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, cy + height * 0.7 + 16);

        return points;
    }

    // Network nodes (Neural Operator block)
    const layers = [4, 6, 6, 4];
    function getNodes(cx, cy, spreadX, spreadY) {
        const nodes = [];
        const totalLayers = layers.length;
        for (let l = 0; l < totalLayers; l++) {
            const lx = cx + (l - (totalLayers-1)/2) * spreadX;
            const count = layers[l];
            for (let n = 0; n < count; n++) {
                const ny = cy + (n - (count-1)/2) * spreadY;
                nodes.push({ x: lx, y: ny, layer: l, index: n });
            }
        }
        return nodes;
    }

    // Flowing particles along connections
    const particles = [];
    const MAX_PARTICLES = 40;

    function spawnParticle(nodes) {
        if (particles.length >= MAX_PARTICLES) return;
        // Pick random connection: from a node in layer l to layer l+1
        const srcLayer = Math.floor(Math.random() * (layers.length - 1));
        const srcIdx = Math.floor(Math.random() * layers[srcLayer]);
        const dstIdx = Math.floor(Math.random() * layers[srcLayer + 1]);
        const src = nodes.find(n => n.layer === srcLayer && n.index === srcIdx);
        const dst = nodes.find(n => n.layer === srcLayer + 1 && n.index === dstIdx);
        if (src && dst) {
            particles.push({
                sx: src.x, sy: src.y,
                dx: dst.x, dy: dst.y,
                t: 0,
                speed: 0.008 + Math.random() * 0.012,
                size: 1.5 + Math.random() * 2
            });
        }
    }

    // Also particles from input function to network and network to output
    function spawnBridgeParticle(fromX, fromY, toX, toY) {
        if (particles.length >= MAX_PARTICLES) return;
        particles.push({
            sx: fromX + (Math.random()-0.5) * 20,
            sy: fromY + (Math.random()-0.5) * 40,
            dx: toX + (Math.random()-0.5) * 20,
            dy: toY + (Math.random()-0.5) * 40,
            t: 0,
            speed: 0.004 + Math.random() * 0.006,
            size: 2 + Math.random() * 2
        });
    }

    function draw() {
        time += 0.012;
        ctx.clearRect(0, 0, W, H);

        const color = getAccentColor(1);
        const { r, g, b } = color;
        const layout = getLayout();
        const { cx, cy, inputX, outputX, networkCx, funcH } = layout;

        const funcWidth = Math.min(W * 0.18, 140);
        const networkSpreadX = Math.min(W * 0.06, 50);
        const networkSpreadY = Math.min(H * 0.045, 28);

        // 1) Draw input function
        drawFunction(inputX, cy, funcWidth, funcH, time, color, 'u(x)', false);

        // 2) Draw output function
        drawFunction(outputX, cy, funcWidth, funcH, time, color, 'G(u)(y)', true);

        // 3) Draw Neural Operator network
        const nodes = getNodes(networkCx, cy, networkSpreadX, networkSpreadY);

        // Connections (faint lines between layers)
        for (let l = 0; l < layers.length - 1; l++) {
            const srcNodes = nodes.filter(n => n.layer === l);
            const dstNodes = nodes.filter(n => n.layer === l + 1);
            srcNodes.forEach(s => {
                dstNodes.forEach(d => {
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(d.x, d.y);
                    ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                });
            });
        }

        // Nodes
        nodes.forEach(node => {
            const pulse = 1 + Math.sin(time * 2 + node.layer * 0.8 + node.index * 0.5) * 0.15;
            const nodeR = (3 + (node.layer === 1 || node.layer === 2 ? 1 : 0)) * pulse;
            // Glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeR + 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
            ctx.fill();
            // Node
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + pulse * 0.1})`;
            ctx.fill();
        });

        // Neural Operator label
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.textAlign = 'center';
        ctx.fillText('Neural Operator', networkCx, cy + layers[1] * networkSpreadY / 2 + 28);

        // 4) Bridge lines (input → network, network → output)
        const firstLayerNodes = nodes.filter(n => n.layer === 0);
        const lastLayerNodes = nodes.filter(n => n.layer === layers.length - 1);

        // Input bridge
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        firstLayerNodes.forEach(n => {
            ctx.moveTo(inputX + funcWidth/2 + 10, cy);
            ctx.quadraticCurveTo((inputX + funcWidth/2 + n.x) / 2, (cy + n.y) / 2, n.x, n.y);
        });
        ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Output bridge
        ctx.beginPath();
        lastLayerNodes.forEach(n => {
            ctx.moveTo(n.x, n.y);
            ctx.quadraticCurveTo((outputX - funcWidth/2 + n.x) / 2, (cy + n.y) / 2, outputX - funcWidth/2 - 10, cy);
        });
        ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow labels
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
        ctx.textAlign = 'center';
        const arrowLeftX = (inputX + funcWidth/2 + firstLayerNodes[0].x) / 2;
        ctx.fillText('encode', arrowLeftX, cy - funcH * 0.45);
        const arrowRightX = (outputX - funcWidth/2 + lastLayerNodes[0].x) / 2;
        ctx.fillText('decode', arrowRightX, cy - funcH * 0.45);

        // 5) Particles
        // Spawn
        if (Math.random() < 0.3) spawnParticle(nodes);
        if (Math.random() < 0.08) {
            spawnBridgeParticle(inputX + funcWidth/2, cy, firstLayerNodes[0].x, firstLayerNodes[Math.floor(Math.random()*firstLayerNodes.length)].y);
        }
        if (Math.random() < 0.08) {
            const ln = lastLayerNodes[Math.floor(Math.random()*lastLayerNodes.length)];
            spawnBridgeParticle(ln.x, ln.y, outputX - funcWidth/2, cy);
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.t += p.speed;
            if (p.t > 1) {
                particles.splice(i, 1);
                continue;
            }
            const px = p.sx + (p.dx - p.sx) * p.t;
            const py = p.sy + (p.dy - p.sy) * p.t;
            const alpha = Math.sin(p.t * Math.PI) * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fill();
        }

        animId = requestAnimationFrame(draw);
    }

    // Only animate when hero is visible
    const heroSection = document.getElementById('home');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animId) draw();
            } else {
                if (animId) {
                    cancelAnimationFrame(animId);
                    animId = null;
                }
            }
        });
    }, { threshold: 0.1 });
    observer.observe(heroSection);
    draw();
})();

// ===== Venn Diagram: Domain + Methodology = Battery AI =====
(function() {
    const canvas = document.getElementById('convergenceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, animId;
    let time = 0;
    let mouseX = -1, mouseY = -1;
    let isHovering = false;
    let hoveredZone = null; // 'left', 'right', 'center'

    function getColor() {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        const r = parseInt(accent.slice(1,3), 16);
        const g = parseInt(accent.slice(3,5), 16);
        const b = parseInt(accent.slice(5,7), 16);
        return { r, g, b };
    }

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        isHovering = true;
    });
    canvas.addEventListener('mouseleave', () => {
        isHovering = false;
        hoveredZone = null;
    });

    // Floating particles in the intersection
    const particles = [];
    function spawnParticle(cx, cy, radius) {
        if (particles.length > 25) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.6;
        particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            life: 1,
            decay: 0.003 + Math.random() * 0.005,
            size: 2 + Math.random() * 3
        });
    }

    function draw() {
        time += 0.016;
        ctx.clearRect(0, 0, W, H);
        const { r, g, b } = getColor();

        const cx = W / 2;
        const cy = H / 2;
        const circleR = Math.min(W * 0.34, H * 0.4, 180);
        const overlap = circleR * 0.5;
        const leftCx = cx - overlap;
        const rightCx = cx + overlap;

        // Detect hovered zone
        if (isHovering) {
            const dLeft = Math.hypot(mouseX - leftCx, mouseY - cy);
            const dRight = Math.hypot(mouseX - rightCx, mouseY - cy);
            const inLeft = dLeft < circleR;
            const inRight = dRight < circleR;
            if (inLeft && inRight) hoveredZone = 'center';
            else if (inLeft) hoveredZone = 'left';
            else if (inRight) hoveredZone = 'right';
            else hoveredZone = null;
        }

        // Draw circles with clipping for distinct fills
        // Left circle (Domain)
        const leftAlpha = hoveredZone === 'left' ? 0.1 : 0.04;
        const leftStroke = hoveredZone === 'left' ? 0.35 : 0.12;
        ctx.beginPath();
        ctx.arc(leftCx, cy, circleR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${leftAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${leftStroke})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right circle (Methodology)
        const rightAlpha = hoveredZone === 'right' ? 0.1 : 0.04;
        const rightStroke = hoveredZone === 'right' ? 0.35 : 0.12;
        ctx.beginPath();
        ctx.arc(rightCx, cy, circleR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${rightAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${rightStroke})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Intersection highlight (clip to both circles)
        ctx.save();
        ctx.beginPath();
        ctx.arc(leftCx, cy, circleR, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(rightCx, cy, circleR, 0, Math.PI * 2);
        const centerAlpha = hoveredZone === 'center' ? 0.2 : 0.08;
        ctx.fillStyle = `rgba(${r},${g},${b},${centerAlpha})`;
        ctx.fill();
        ctx.restore();

        // Intersection glow pulse
        const pulse = 0.6 + Math.sin(time * 2) * 0.4;
        ctx.save();
        ctx.beginPath();
        ctx.arc(leftCx, cy, circleR, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(rightCx, cy, circleR, 0, Math.PI * 2);
        ctx.clip();
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, circleR * 0.5);
        glowGrad.addColorStop(0, `rgba(${r},${g},${b},${0.06 * pulse})`);
        glowGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        // === Labels ===
        // Left: Domain
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const leftLabelX = leftCx - circleR * 0.35;
        ctx.font = '800 18px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},${hoveredZone === 'left' ? 0.9 : 0.6})`;
        ctx.fillText('Domain', leftLabelX, cy - 40);

        ctx.font = '500 15px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},${hoveredZone === 'left' ? 0.75 : 0.45})`;
        ctx.fillText('Battery', leftLabelX, cy + 0);
        ctx.fillText('Electrochemistry', leftLabelX, cy + 26);

        ctx.font = '400 12px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.fillText('Chemical Eng.', leftLabelX, cy + 58);

        // Right: Methodology
        const rightLabelX = rightCx + circleR * 0.35;
        ctx.font = '800 18px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},${hoveredZone === 'right' ? 0.9 : 0.6})`;
        ctx.fillText('Methodology', rightLabelX, cy - 40);

        ctx.font = '500 15px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},${hoveredZone === 'right' ? 0.75 : 0.45})`;
        ctx.fillText('AI', rightLabelX, cy + 0);
        ctx.fillText('Numerical Analysis', rightLabelX, cy + 26);

        ctx.font = '400 12px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.fillText('Computational Sci.', rightLabelX, cy + 58);

        // Center: Battery AI Expert
        const centerPulse = hoveredZone === 'center' ? 1.12 : 1;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(centerPulse, centerPulse);

        ctx.font = '800 20px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},${hoveredZone === 'center' ? 1 : 0.8})`;
        ctx.fillText('Battery AI', 0, -10);
        ctx.font = '800 20px "Pretendard", sans-serif';
        ctx.fillText('Expert', 0, 16);

        ctx.restore();

        // Particles in intersection
        if (Math.random() < 0.15) {
            spawnParticle(cx, cy, circleR * 0.35);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) { particles.splice(i, 1); continue; }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${p.life * 0.25})`;
            ctx.fill();
        }

        // Bottom hint
        ctx.font = '400 10px "Pretendard", sans-serif';
        ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.textAlign = 'center';
        ctx.fillText('각 영역에 마우스를 올려보세요', cx, H - 14);

        animId = requestAnimationFrame(draw);
    }

    const aboutSection = document.getElementById('about');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animId) draw();
            } else {
                if (animId) { cancelAnimationFrame(animId); animId = null; }
            }
        });
    }, { threshold: 0.1 });
    observer.observe(aboutSection);
    draw();
})();

// ===== Theme Color Picker =====
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeColors = document.getElementById('themeColors');
const colorButtons = document.querySelectorAll('.theme-color');

const colorPresets = {
    '#0984e3': { light: '#74b9ff', bg: 'rgba(9,132,227,0.08)',   bgHover: 'rgba(9,132,227,0.14)',   glow: 'rgba(9,132,227,0.15)' },
    '#00b894': { light: '#55efc4', bg: 'rgba(0,184,148,0.08)',   bgHover: 'rgba(0,184,148,0.14)',   glow: 'rgba(0,184,148,0.15)' },
    '#6c5ce7': { light: '#a29bfe', bg: 'rgba(108,92,231,0.08)',  bgHover: 'rgba(108,92,231,0.14)',  glow: 'rgba(108,92,231,0.15)' },
    '#e17055': { light: '#fab1a0', bg: 'rgba(225,112,85,0.08)',  bgHover: 'rgba(225,112,85,0.14)',  glow: 'rgba(225,112,85,0.15)' },
    '#e84393': { light: '#fd79a8', bg: 'rgba(232,67,147,0.08)',  bgHover: 'rgba(232,67,147,0.14)',  glow: 'rgba(232,67,147,0.15)' },
    '#2d3436': { light: '#636e72', bg: 'rgba(45,52,54,0.08)',    bgHover: 'rgba(45,52,54,0.14)',    glow: 'rgba(45,52,54,0.15)' },
};

function applyTheme(color) {
    const preset = colorPresets[color];
    if (!preset) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-light', preset.light);
    root.style.setProperty('--accent-bg', preset.bg);
    root.style.setProperty('--accent-bg-hover', preset.bgHover);
    root.style.setProperty('--accent-glow', preset.glow);
    root.style.setProperty('--border-hover', `${color}59`);
    themeToggleBtn.style.background = color;
    colorButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
    localStorage.setItem('theme-color', color);
}

themeToggleBtn.addEventListener('click', () => {
    themeColors.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-picker')) {
        themeColors.classList.remove('open');
    }
});

colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        applyTheme(btn.dataset.color);
        themeColors.classList.remove('open');
    });
});

const savedColor = localStorage.getItem('theme-color');
if (savedColor && colorPresets[savedColor]) {
    applyTheme(savedColor);
} else {
    colorButtons[0].classList.add('active');
}

// ===== Navbar Scroll =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Mobile Nav Toggle =====
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// ===== Active Nav on Scroll =====
const sections = document.querySelectorAll('section[id]');
const navLinkElements = document.querySelectorAll('.nav-link');

function updateActiveNav() {
    const scrollPos = window.scrollY + 150;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollPos >= top && scrollPos < top + height) {
            navLinkElements.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + id) {
                    link.classList.add('active');
                }
            });
        }
    });
}
window.addEventListener('scroll', updateActiveNav);

// ===== Scroll Reveal =====
const revealTargets = '.about-grid, .research-card, .skill-category, .timeline-item, .pub-item, .edu-item, .contact-content';

document.querySelectorAll(revealTargets).forEach(el => {
    el.classList.add('reveal');
});

function reveal() {
    const windowHeight = window.innerHeight;
    document.querySelectorAll('.reveal').forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        if (top < windowHeight - 60) {
            setTimeout(() => el.classList.add('visible'), i * 60);
        }
    });
}

window.addEventListener('scroll', reveal);
reveal();

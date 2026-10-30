(() => {
  'use strict';

  const choicePanel = document.querySelector('#choice-panel');
  const choiceActions = document.querySelector('#choice-actions');
  const extraTime = document.querySelector('#extra-time');
  const countdown = document.querySelector('#countdown');
  const simpleScreen = document.querySelector('#simple-screen');
  const discoveryScreen = document.querySelector('#discovery-screen');
  const quietField = document.querySelector('#quiet-field');
  const canvas = document.querySelector('#simulation');
  const context = canvas.getContext('2d', { alpha: false });

  let firstQuestionTimer = 0;
  let extraTimeTimer = 0;
  let simulation = null;

  const revealQuestion = () => {
    choicePanel.hidden = false;
    choiceActions.hidden = false;
    extraTime.hidden = true;
    document.querySelector('#choose-yes').focus({ preventScroll: true });
  };

  firstQuestionTimer = window.setTimeout(revealQuestion, 16000);

  document.querySelector('#choose-no').addEventListener('click', () => {
    window.clearTimeout(extraTimeTimer);
    choiceActions.hidden = true;
    extraTime.hidden = false;
    let remaining = 45;
    countdown.textContent = remaining;
    extraTimeTimer = window.setInterval(() => {
      remaining -= 1;
      countdown.textContent = remaining;
      if (remaining <= 0) {
        window.clearInterval(extraTimeTimer);
        revealQuestion();
      }
    }, 1000);
  });

  document.querySelector('#choose-yes').addEventListener('click', () => {
    window.clearTimeout(firstQuestionTimer);
    window.clearInterval(extraTimeTimer);
    simpleScreen.classList.add('is-transforming');
    window.setTimeout(() => {
      simpleScreen.hidden = true;
      discoveryScreen.classList.add('is-visible');
      simulation = new Simulation(canvas, context);
      simulation.start();
    }, 1100);
  });

  const resetExperience = () => {
    if (simulation) {
      simulation.stop();
      simulation = null;
    }
    window.clearTimeout(firstQuestionTimer);
    window.clearInterval(extraTimeTimer);
    simpleScreen.hidden = false;
    simpleScreen.classList.remove('is-transforming');
    discoveryScreen.classList.remove('is-visible');
    choicePanel.hidden = true;
    choiceActions.hidden = false;
    extraTime.hidden = true;
    quietField.style.setProperty('--move-x', '0px');
    quietField.style.setProperty('--move-y', '0px');
    firstQuestionTimer = window.setTimeout(revealQuestion, 16000);
  };

  quietField.addEventListener('pointermove', (event) => {
    const bounds = quietField.getBoundingClientRect();
    const x = (event.clientX - (bounds.left + bounds.width / 2)) * -.08;
    const y = (event.clientY - (bounds.top + bounds.height / 2)) * -.08;
    quietField.style.setProperty('--move-x', `${x}px`);
    quietField.style.setProperty('--move-y', `${y}px`);
  });
  quietField.addEventListener('pointerdown', () => {
    quietField.classList.remove('is-awake');
    requestAnimationFrame(() => quietField.classList.add('is-awake'));
  });
  quietField.addEventListener('pointerleave', () => {
    quietField.style.setProperty('--move-x', '0px');
    quietField.style.setProperty('--move-y', '0px');
  });

  document.addEventListener('keydown', (event) => {
    if (!discoveryScreen.classList.contains('is-visible')) return;
    if (event.key === 'Escape') {
      resetExperience();
    } else if (event.code === 'Space' && simulation) {
      event.preventDefault();
      simulation.changePalette();
    } else if (event.key.toLowerCase() === 'm' && simulation) {
      simulation.changeMode();
    }
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const mix = (a, b, amount) => a + (b - a) * amount;
  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  });
  const rgba = (color, alpha) => `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;

  /* Paletas inspiradas en Pokémon Full Art EX & Referencias Visuales */
  const palettes = [
    { name: 'ULTRA SHINY RAYQUAZA', colors: ['#040a18', '#1a365d', '#38bdf8', '#ffd700', '#ec4899'], ink: '#f8fafc' },
    { name: 'MEGA CHARIZARD X', colors: ['#090d16', '#1e1b4b', '#2563eb', '#06b6d4', '#f43f5e'], ink: '#f8fafc' },
    { name: 'UMBREON TERA HOLO', colors: ['#0f051d', '#581c87', '#9333ea', '#34d399', '#facc15'], ink: '#fdf4ff' },
    { name: 'NINETALES FOREST GOLD', colors: ['#1c1408', '#451a03', '#d97706', '#fde047', '#10b981'], ink: '#fffbeb' },
    { name: 'NEON PSYCHEDELIC', colors: ['#051923', '#006466', '#ffd166', '#ef476f', '#118ab2'], ink: '#f8f9fa' }
  ];

  class Particle {
    constructor(width, height, colors, isAmbient = false) {
      this.x = random(0, width);
      this.y = random(0, height);
      this.vx = random(-.5, .5);
      this.vy = random(-.5, .5);
      this.radius = random(1.2, isAmbient ? 3.8 : 3.0);
      this.depth = random(.5, 1.8);
      this.phase = random(0, Math.PI * 2);
      this.color = Math.floor(random(0, colors.length));
      this.life = isAmbient ? random(3, 10) : random(3, 6);
      this.age = random(0, this.life);
      this.twinkleSpeed = random(.8, 2.2);
    }

    update(dt, width, height, pointer, mode, colors) {
      this.age += dt;
      this.phase += dt * this.twinkleSpeed;
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = 190 * this.depth;
      
      if (pointer.active && distance < reach) {
        const force = (1 - distance / reach) * (mode === 2 ? .065 : .032) * dt * 60;
        const direction = mode === 1 ? -1 : 1;
        this.vx += dx / distance * force * direction;
        this.vy += dy / distance * force * direction;
      }
      this.vx += Math.sin(this.phase + this.y * .005) * .0022 * dt * 60;
      this.vy += Math.cos(this.phase + this.x * .005) * .0022 * dt * 60;
      this.vx *= .992;
      this.vy *= .992;
      this.x += this.vx * dt * 60 * this.depth;
      this.y += this.vy * dt * 60 * this.depth;

      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      if (this.age >= this.life) {
        this.age = 0;
        this.life = random(4, 9);
        this.x = random(0, width);
        this.y = random(0, height);
        this.color = Math.floor(random(0, colors.length));
      }
    }

    draw(ctx, colors, time) {
      const fade = Math.min(1, this.age * 2, (this.life - this.age) * 1.5);
      const pulse = .6 + Math.sin(this.phase + time * 2) * .4;
      const color = colors[this.color % colors.length];
      
      ctx.beginPath();
      ctx.fillStyle = rgba(color, clamp(fade * pulse, 0, .95));
      ctx.shadowColor = rgba(color, .9);
      ctx.shadowBlur = this.radius * 6;
      ctx.arc(this.x, this.y, this.radius * (.8 + pulse * .35), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  class Wave {
    constructor(x, y, color, strength = 1) {
      this.x = x;
      this.y = y;
      this.radius = 4;
      this.speed = random(2.2, 4.0) * strength;
      this.life = 1;
      this.width = random(1.5, 3.5);
      this.color = color;
      this.strength = strength;
    }

    update(dt) {
      this.radius += this.speed * dt * 60;
      this.life -= dt * (this.strength > 1.2 ? .28 : .42);
    }

    draw(ctx) {
      if (this.life <= 0) return;
      ctx.strokeStyle = rgba(this.color, this.life * .85);
      ctx.lineWidth = this.width * this.life;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Anillo holográfico secundario
      ctx.strokeStyle = rgba(this.color, this.life * .35);
      ctx.lineWidth = Math.max(.8, this.width * .5);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * .75, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  class Shape {
    constructor(width, height, kind) {
      this.x = random(width * .25, width * .95);
      this.y = random(height * .1, height * .9);
      this.kind = kind || ['star', 'flower', 'ring', 'crystal'][Math.floor(random(0, 4))];
      this.size = random(12, 45);
      this.rotation = random(0, Math.PI * 2);
      this.spin = random(-.006, .006);
      this.phase = random(0, Math.PI * 2);
      this.drift = random(.15, .55);
      this.color = Math.floor(random(0, 5));
      this.opacity = random(.35, .85);
    }

    update(dt, time, pointer, mode) {
      this.rotation += this.spin * dt * 60;
      this.phase += dt * this.drift;
      this.y += Math.sin(this.phase) * .22 * dt * 60;
      
      if (pointer.active) {
        const dx = this.x - pointer.x;
        const dy = this.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 150 && mode === 1) {
          this.x += dx / (distance || 1) * (150 - distance) * .004 * dt * 60;
          this.y += dy / (distance || 1) * (150 - distance) * .004 * dt * 60;
        } else if (distance < 150 && mode === 0) {
          this.rotation += Math.sin(time + this.phase) * .02;
        } else if (distance < 150 && mode === 2) {
          this.x -= dx * .008 * dt * 60;
          this.y -= dy * .008 * dt * 60;
        }
      }
    }

    draw(ctx, colors, time) {
      const size = this.size * (1 + Math.sin(this.phase * 1.5) * .1);
      const color = colors[this.color % colors.length];
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.strokeStyle = rgba(color, this.opacity);
      ctx.fillStyle = rgba(color, this.opacity * .22);
      ctx.lineWidth = 1.8;
      ctx.shadowColor = rgba(color, .7);
      ctx.shadowBlur = 14;

      if (this.kind === 'star') {
        this.pathStar(ctx, size, size * .45, 5);
        ctx.fill();
        ctx.stroke();
      } else if (this.kind === 'flower') {
        for (let i = 0; i < 8; i += 1) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.ellipse(0, -size * .45, size * .22, size * .48, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, size * .18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (this.kind === 'ring') {
        ctx.beginPath();
        ctx.arc(0, 0, size * .65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size * .88, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, size * .2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cristal / joya Full Art
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * .7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * .7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    pathStar(ctx, outer, inner, points) {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i += 1) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = i * Math.PI / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }

  class Simulation {
    constructor(canvasElement, ctx) {
      this.canvas = canvasElement;
      this.ctx = ctx;
      this.width = 0;
      this.height = 0;
      this.ratio = 1;
      this.particles = [];
      this.waves = [];
      this.shapes = [];
      this.trails = [];
      this.paletteIndex = 0;
      this.fromPalette = 0;
      this.paletteStarted = performance.now();
      this.paletteDuration = 3400;
      this.mode = 0;
      this.time = 0;
      this.lastTime = 0;
      this.frame = 0;
      this.running = false;
      this.pointer = { x: -1000, y: -1000, active: false, down: false, lastWave: 0 };
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onCanvasDoubleClick = () => this.changePalette();
      
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('dblclick', this.onCanvasDoubleClick);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('resize', this.resize);
      this.resize();
      this.setComposition();
      this.paintPaletteLabel();
    }

    get palette() { return palettes[this.paletteIndex]; }

    getCurrentColors() {
      const elapsed = clamp((performance.now() - this.paletteStarted) / this.paletteDuration, 0, 1);
      const amount = elapsed * elapsed * (3 - 2 * elapsed);
      const previous = palettes[this.fromPalette];
      return this.palette.colors.map((hex, index) => {
        const start = hexToRgb(previous.colors[index % previous.colors.length]);
        const end = hexToRgb(hex);
        return { r: mix(start.r, end.r, amount), g: mix(start.g, end.g, amount), b: mix(start.b, end.b, amount) };
      });
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.ratio);
      this.canvas.height = Math.round(this.height * this.ratio);
      this.ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      const target = clamp(Math.round(this.width * this.height / 7500), 90, 260);
      while (this.particles.length < target) this.particles.push(new Particle(this.width, this.height, this.palette.colors, true));
      if (this.particles.length > target) this.particles.length = target;
      this.setComposition();
    }

    setComposition() {
      const desired = clamp(Math.round(this.width / 65), 12, 28);
      while (this.shapes.length < desired) this.shapes.push(new Shape(this.width, this.height));
      if (this.shapes.length > desired) this.shapes.length = desired;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.animate);
      this.paletteTimer = window.setInterval(() => this.changePalette(true), 35000);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.frame);
      window.clearInterval(this.paletteTimer);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('dblclick', this.onCanvasDoubleClick);
      window.removeEventListener('pointerup', this.onPointerUp);
      window.removeEventListener('resize', this.resize);
    }

    changePalette(automatic = false) {
      this.fromPalette = this.paletteIndex;
      this.paletteIndex = (this.paletteIndex + 1) % palettes.length;
      this.paletteStarted = performance.now();
      this.paintPaletteLabel();
      if (!automatic) this.burst(this.width * .65, this.height * .5, 1.4);
    }

    paintPaletteLabel() {
      const title = document.querySelector('.hud-sub');
      if (title) title.textContent = `${this.palette.name} • Full Art Engine`;
    }

    changeMode() {
      this.mode = (this.mode + 1) % 3;
    }

    onPointerMove(event) {
      const bounds = this.canvas.getBoundingClientRect();
      this.pointer.x = event.clientX - bounds.left;
      this.pointer.y = event.clientY - bounds.top;
      this.pointer.active = true;
      this.trails.push({ x: this.pointer.x, y: this.pointer.y, life: 1 });
      if (this.trails.length > 35) this.trails.shift();
      if (this.pointer.down && performance.now() - this.pointer.lastWave > 130) {
        this.addWave(this.pointer.x, this.pointer.y);
        this.pointer.lastWave = performance.now();
      }
    }

    onPointerDown(event) {
      if (event.target !== this.canvas) return;
      this.canvas.setPointerCapture(event.pointerId);
      this.pointer.down = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
      this.burst(this.pointer.x, this.pointer.y, 1.1);
      this.addWave(this.pointer.x, this.pointer.y);
      this.pointer.lastWave = performance.now();
    }

    onPointerUp() {
      this.pointer.down = false;
    }

    addWave(x, y, strength = 1) {
      const colors = this.getCurrentColors();
      this.waves.push(new Wave(x, y, colors[Math.floor(random(0, colors.length))], strength));
      if (this.waves.length > 50) this.waves.shift();
    }

    burst(x, y, strength = 1) {
      const colors = this.getCurrentColors();
      const total = Math.round(42 * strength);
      for (let i = 0; i < total && this.particles.length < 320; i += 1) {
        const particle = new Particle(this.width, this.height, this.palette.colors);
        const angle = random(0, Math.PI * 2);
        const speed = random(1.5, 6.0) * strength;
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.color = Math.floor(random(0, colors.length));
        particle.life = random(2.5, 5.0);
        this.particles.push(particle);
      }
      this.addWave(x, y, strength);
    }

    drawBackdrop(colors) {
      const ctx = this.ctx;
      const base = hexToRgb(this.palette.colors[0]);
      ctx.fillStyle = rgba(base, 1);
      ctx.fillRect(0, 0, this.width, this.height);

      // Gradiente radial central inspirado en cartas Pokémon Full Art (efecto aura legendaria)
      const glow = ctx.createRadialGradient(this.width * .68, this.height * .48, 0, this.width * .68, this.height * .48, this.width * .65);
      glow.addColorStop(0, rgba(colors[3], .38));
      glow.addColorStop(.45, rgba(colors[2], .18));
      glow.addColorStop(1, rgba(base, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, this.width, this.height);

      // Rayos de energía estelar (Rayos Full Art)
      const centerX = this.width * .68;
      const centerY = this.height * .48;
      const rayCount = 40;
      for (let i = 0; i < rayCount; i += 1) {
        const angle = i * Math.PI * 2 / rayCount + this.time * .05;
        const radius = (i % 2 === 0 ? 1.1 : .75) * Math.max(this.width, this.height);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.strokeStyle = rgba(colors[4], i % 2 === 0 ? .07 : .03);
        ctx.lineWidth = i % 2 === 0 ? 1.5 : .8;
        ctx.stroke();
      }

      // Patrón de puntos geométricos (Halftone / Dot matrix)
      const dotSpacing = 22;
      for (let x = 12; x < this.width; x += dotSpacing) {
        for (let y = 12; y < this.height; y += dotSpacing) {
          const offset = Math.sin(x * .015 + y * .018 + this.time * .2) * 1.2;
          ctx.beginPath();
          ctx.fillStyle = rgba(colors[2], .18 + (Math.sin(x * .022 + y * .015) + 1) * .05);
          ctx.arc(x, y, Math.max(.6, 1.2 + offset * .3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawConnections(colors) {
      const ctx = this.ctx;
      const maxDistance = 100;
      const visible = this.particles.slice(0, 110);
      for (let i = 0; i < visible.length; i += 1) {
        for (let j = i + 1; j < visible.length; j += 1) {
          const a = visible[i];
          const b = visible[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.strokeStyle = rgba(colors[(i + j) % colors.length], (1 - distance / maxDistance) * .18);
            ctx.lineWidth = .7;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    animate(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, .035);
      this.lastTime = now;
      this.time += this.reduceMotion ? dt * .2 : dt;
      const colors = this.getCurrentColors();

      this.drawBackdrop(colors);

      this.particles.forEach((particle) => {
        particle.update(dt, this.width, this.height, this.pointer, this.mode, colors);
        particle.draw(this.ctx, colors, this.time);
      });
      this.drawConnections(colors);

      this.shapes.forEach((shape) => {
        shape.update(dt, this.time, this.pointer, this.mode);
        shape.draw(this.ctx, colors, this.time);
      });

      this.waves.forEach((wave) => {
        wave.update(dt);
        wave.draw(this.ctx);
      });
      this.waves = this.waves.filter((wave) => wave.life > 0);

      // Estela holográfica del cursor tipo destello EX
      const ctx = this.ctx;
      this.trails.forEach((point) => {
        point.life -= dt * 1.6;
        if (point.life <= 0) return;
        ctx.beginPath();
        ctx.fillStyle = rgba(colors[3], point.life * .4);
        ctx.shadowColor = rgba(colors[3], point.life);
        ctx.shadowBlur = 18;
        ctx.arc(point.x, point.y, 1.5 + point.life * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      this.trails = this.trails.filter((point) => point.life > 0);

      this.frame = requestAnimationFrame(this.animate);
    }
  }
})();
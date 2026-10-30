(() => {
  'use strict';

  const shapeButtons = document.querySelectorAll('.geo-shape');
  const minimalOutput = document.querySelector('#minimal-output');
  const questionOverlay = document.querySelector('#question-overlay');
  const choiceActions = document.querySelector('#choice-actions');
  const extraTime = document.querySelector('#extra-time');
  const countdown = document.querySelector('#countdown');
  const chooseYes = document.querySelector('#choose-yes');
  const chooseNo = document.querySelector('#choose-no');
  const simpleScreen = document.querySelector('#simple-screen');
  const discoveryScreen = document.querySelector('#discovery-screen');
  const canvas = document.querySelector('#simulation');
  const ctx = canvas.getContext('2d', { alpha: false });

  let interactionsCount = 0;
  let questionTriggered = false;
  let extraTimeInterval = null;
  let simulation = null;

  const responses = {
    circle: "Forma circular procesada. Simetría básica obtenida.",
    square: "Estructura ortogonal registrada con éxito.",
    triangle: "Vértice triangular computado correctamente."
  };

  // Interacción con las figuras geométricas en fase 1
  shapeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-shape');
      minimalOutput.textContent = responses[type] || "Acción registrada.";
      interactionsCount++;

      if (!questionTriggered && interactionsCount >= 2) {
        triggerQuestion();
      }
    });
  });

  setTimeout(() => {
    if (!questionTriggered) triggerQuestion();
  }, 16000);

  function triggerQuestion() {
    questionTriggered = true;
    questionOverlay.hidden = false;
  }

  chooseNo.addEventListener('click', () => {
    choiceActions.hidden = true;
    extraTime.hidden = false;
    let remaining = 45;
    countdown.textContent = remaining;

    extraTimeInterval = setInterval(() => {
      remaining--;
      countdown.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(extraTimeInterval);
        extraTime.hidden = true;
        choiceActions.hidden = false;
      }
    }, 1000);
  });

  chooseYes.addEventListener('click', () => {
    if (extraTimeInterval) clearInterval(extraTimeInterval);
    simpleScreen.classList.add('is-transforming');

    setTimeout(() => {
      simpleScreen.hidden = true;
      discoveryScreen.classList.add('is-visible');
      simulation = new PhysicsSimulation(canvas, ctx);
      simulation.start();
    }, 950);
  });

  /* =========================================================
     SISTEMA DE SIMULACIÓN Y MORFOMETRÍA ABSTRACCIÓN (NOTAS / ANIMALES)
     ========================================================= */

  const PALETTES = [
    ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'],
    ['#2dd4bf', '#34d399', '#a3e635', '#facc15', '#fb923c'],
    ['#60a5fa', '#3b82f6', '#1d4ed8', '#93c5fd', '#f0f9ff'],
    ['#f43f5e', '#fb7185', '#fda4af', '#fef08a', '#a7f3d0']
  ];

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.ax = 0;
      this.ay = 0;
      this.radius = Math.random() * 2.5 + 1.2;
      this.color = color;
      this.mass = this.radius * 0.8;
      this.friction = 0.96;
      
      // Control de inactividad para formas abstractas
      this.idleTime = 0;
      this.targetX = null;
      this.targetY = null;
    }

    applyForce(fx, fy) {
      this.ax += fx / this.mass;
      this.ay += fy / this.mass;
    }

    update(dt, width, height, mouse, formTarget) {
      // Registrar inactividad si el mouse está lejos
      const dxMouse = mouse.x - this.x;
      const dyMouse = mouse.y - this.y;
      const distMouse = Math.hypot(dxMouse, dyMouse);

      if (distMouse < 140) {
        this.idleTime = 0;
        this.targetX = null;
        this.targetY = null;
        const force = (1 - distMouse / 140) * 2.2;
        if (mouse.down) {
          this.applyForce(-dxMouse / distMouse * force * 5, -dyMouse / distMouse * force * 5);
        } else {
          this.applyForce(dxMouse / distMouse * force * 0.4, dyMouse / distMouse * force * 0.4);
        }
      } else {
        this.idleTime += dt;
        // Si pasa inactivo más de 3.5 segundos, adopta suavemente una posición en la figura abstracta
        if (this.idleTime > 3.5 && formTarget) {
          if (!this.targetX) {
            this.targetX = formTarget.x;
            this.targetY = formTarget.y;
          }
          // Interpolación suave hacia la forma (sin bloquear movimiento libre brusco)
          const tx = this.targetX - this.x;
          const ty = this.targetY - this.y;
          this.applyForce(tx * 0.015, ty * 0.015);
        }
      }

      this.vx += this.ax;
      this.vy += this.ay;
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.x += this.vx;
      this.y += this.vy;
      this.ax = 0;
      this.ay = 0;

      if (this.x < 0) { this.x = 0; this.vx *= -1; }
      if (this.x > width) { this.x = width; this.vx *= -1; }
      if (this.y < 0) { this.y = 0; this.vy *= -1; }
      if (this.y > height) { this.y = height; this.vy *= -1; }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class PhysicsSimulation {
    constructor(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.width = 0;
      this.height = 0;
      this.particles = [];
      this.paletteIndex = 0;
      this.mouse = { x: -1000, y: -1000, active: false, down: false };
      this.interactionEnergy = 0; // Controla la vitalidad y velocidad de cambio de color
      this.running = false;
      this.lastTime = 0;
      this.abstractFormType = 0; // Alterna entre notas musicales y silueta abstracta de animal
      this.formTimer = 0;

      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);
      this.onMove = this.onMove.bind(this);
      this.onDown = this.onDown.bind(this);
      this.onUp = this.onUp.bind(this);

      window.addEventListener('resize', this.resize);
      this.canvas.addEventListener('pointermove', this.onMove);
      this.canvas.addEventListener('pointerdown', this.onDown);
      window.addEventListener('pointerup', this.onUp);

      this.resize();
      this.initParticles();
    }

    get currentPalette() {
      return PALETTES[this.paletteIndex];
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    initParticles() {
      const count = Math.min(Math.floor((this.width * this.height) / 5500), 180);
      this.particles = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        const color = this.currentPalette[Math.floor(Math.random() * this.currentPalette.length)];
        this.particles.push(new Particle(x, y, color));
      }
    }

    start() {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.animate);
    }

    stop() {
      this.running = false;
    }

    onMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
      this.interactionEnergy = Math.min(this.interactionEnergy + 0.15, 5);
    }

    onDown(e) {
      this.onMove(e);
      this.mouse.down = true;
      this.interactionEnergy = 5;

      // Cambiar paleta y forma abstracta al hacer clic con energía
      this.paletteIndex = (this.paletteIndex + 1) % PALETTES.length;
      this.abstractFormType = (this.abstractFormType + 1) % 2;

      const color = this.currentPalette[Math.floor(Math.random() * this.currentPalette.length)];
      for (let i = 0; i < 15; i++) {
        const p = new Particle(this.mouse.x, this.mouse.y, color);
        p.applyForce((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
        this.particles.push(p);
      }
    }

    onUp() {
      this.mouse.down = false;
    }

    // Genera puntos paramétricos para formas abstractas (Nota musical o Ave/Animal estilizado)
    getTargetFormPoint(index, total) {
      const cx = this.width / 2;
      const cy = this.height / 2;
      const scale = Math.min(this.width, this.height) * 0.28;
      const t = (index / total) * Math.PI * 2;

      if (this.abstractFormType === 0) {
        // Nota musical abstracta (Corchea / Doble corchea estilizada)
        const x = cx + (Math.sin(t) * scale * 0.6) + (index < total / 2 ? 0 : scale * 0.3);
        const y = cy + (Math.cos(t * 2) * scale * 0.4) - (index > total * 0.7 ? scale * 0.4 : 0);
        return { x, y };
      } else {
        // Silueta abstracta de animal (Ave en vuelo geométrica)
        const x = cx + Math.sin(t) * scale * (1.2 - Math.abs(Math.cos(t)));
        const y = cy + Math.cos(t * 2) * scale * 0.5;
        return { x, y };
      }
    }

    drawConnections() {
      const maxDist = 85;
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const p1 = this.particles[i];
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.3;
            this.ctx.beginPath();
            this.ctx.strokeStyle = p1.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.lineWidth = 0.8;
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
          }
        }
      }
    }

    animate(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.033);
      this.lastTime = now;

      // Desvanecimiento del fondo que cambia según la interacción del usuario
      this.interactionEnergy = Math.max(this.interactionEnergy - dt * 0.2, 0.5);
      const bgAlpha = 0.2 + (this.interactionEnergy * 0.05);
      this.ctx.fillStyle = `rgba(8, 9, 17, ${bgAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.drawConnections();

      const total = this.particles.length;
      this.particles.forEach((p, index) => {
        const target = this.getTargetFormPoint(index, total);
        p.update(dt, this.width, this.height, this.mouse, target);
        p.draw(this.ctx);
      });

      if (this.particles.length > 220) {
        this.particles.splice(0, this.particles.length - 220);
      }

      requestAnimationFrame(this.animate);
    }
  }
})();
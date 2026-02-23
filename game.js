(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 70;

  const state = {
    mode: "menu",
    score: 0,
    highScore: 0,
    lives: 3,
    spawnTimer: 0,
    spawnInterval: 0.9,
    elapsed: 0,
    keys: Object.create(null),
    player: {
      x: W / 2,
      y: GROUND_Y,
      vx: 0,
      speed: 460,
      width: 120,
      height: 42,
    },
    treats: [],
  };

  const treatKinds = [
    { name: "Bone", color: "#fef5de", stroke: "#8f6d3e", points: 10, radius: 16, speed: [190, 290] },
    { name: "Biscuit", color: "#f4b167", stroke: "#96531e", points: 15, radius: 14, speed: [220, 320] },
    { name: "Star Treat", color: "#ffe067", stroke: "#c29006", points: 25, radius: 13, speed: [250, 350] },
  ];

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function resetGame() {
    state.score = 0;
    state.lives = 3;
    state.spawnTimer = 0;
    state.spawnInterval = 0.9;
    state.elapsed = 0;
    state.treats.length = 0;
    state.player.x = W / 2;
    state.player.vx = 0;
    state.mode = "playing";
  }

  function spawnTreat() {
    const kind = treatKinds[(Math.random() * treatKinds.length) | 0];
    state.treats.push({
      id: crypto.randomUUID(),
      kind: kind.name,
      x: randomInRange(24, W - 24),
      y: -30,
      vy: randomInRange(kind.speed[0], kind.speed[1]),
      radius: kind.radius,
      color: kind.color,
      stroke: kind.stroke,
      points: kind.points,
    });
  }

  function collideTreatPlayer(treat) {
    const left = state.player.x - state.player.width / 2;
    const right = state.player.x + state.player.width / 2;
    const top = state.player.y - state.player.height / 2;
    const bottom = state.player.y + state.player.height / 2;

    const cx = Math.max(left, Math.min(treat.x, right));
    const cy = Math.max(top, Math.min(treat.y, bottom));
    const dx = treat.x - cx;
    const dy = treat.y - cy;
    return dx * dx + dy * dy <= treat.radius * treat.radius;
  }

  function handleInput() {
    const leftPressed = state.keys.ArrowLeft || state.keys.KeyA;
    const rightPressed = state.keys.ArrowRight || state.keys.KeyD;

    if (leftPressed && !rightPressed) {
      state.player.vx = -state.player.speed;
    } else if (rightPressed && !leftPressed) {
      state.player.vx = state.player.speed;
    } else {
      state.player.vx = 0;
    }
  }

  function update(dt) {
    if (state.mode !== "playing") {
      return;
    }

    state.elapsed += dt;
    state.spawnTimer += dt;
    state.spawnInterval = Math.max(0.35, 0.9 - state.elapsed * 0.015);

    handleInput();

    state.player.x += state.player.vx * dt;
    const halfW = state.player.width / 2;
    if (state.player.x < halfW) state.player.x = halfW;
    if (state.player.x > W - halfW) state.player.x = W - halfW;

    while (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer -= state.spawnInterval;
      spawnTreat();
    }

    for (let i = state.treats.length - 1; i >= 0; i -= 1) {
      const t = state.treats[i];
      t.y += t.vy * dt;

      if (collideTreatPlayer(t)) {
        state.score += t.points;
        state.highScore = Math.max(state.highScore, state.score);
        state.treats.splice(i, 1);
        continue;
      }

      if (t.y - t.radius > H) {
        state.lives -= 1;
        state.treats.splice(i, 1);
        if (state.lives <= 0) {
          state.mode = "gameover";
          state.treats.length = 0;
        }
      }
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8fd6ff");
    sky.addColorStop(1, "#e2f8ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#d9f2a8";
    ctx.fillRect(0, GROUND_Y + 8, W, H - (GROUND_Y + 8));

    ctx.fillStyle = "#9ecd6b";
    ctx.fillRect(0, GROUND_Y + 24, W, H - (GROUND_Y + 24));
  }

  function drawPlayer() {
    const x = state.player.x;
    const y = state.player.y;
    const w = state.player.width;
    const h = state.player.height;

    ctx.fillStyle = "#7a5327";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 20);
    ctx.fill();

    ctx.fillStyle = "#f2c48e";
    ctx.beginPath();
    ctx.roundRect(x - 26, y - h / 2 - 14, 52, 22, 10);
    ctx.fill();

    ctx.fillStyle = "#33210e";
    ctx.beginPath();
    ctx.arc(x - 10, y - h / 2 - 3, 3, 0, Math.PI * 2);
    ctx.arc(x + 10, y - h / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2f2010";
    ctx.fillRect(x - 44, y + h / 2 - 2, 18, 6);
    ctx.fillRect(x - 9, y + h / 2 - 2, 18, 6);
    ctx.fillRect(x + 26, y + h / 2 - 2, 18, 6);
  }

  function drawTreat(t) {
    ctx.fillStyle = t.color;
    ctx.strokeStyle = t.stroke;
    ctx.lineWidth = 3;

    if (t.kind === "Bone") {
      ctx.beginPath();
      ctx.roundRect(t.x - 18, t.y - 8, 36, 16, 8);
      ctx.fill();
      ctx.stroke();
    } else if (t.kind === "Biscuit") {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        const ox = t.x + Math.cos(angle) * t.radius;
        const oy = t.y + Math.sin(angle) * t.radius;
        const ix = t.x + Math.cos(angle + Math.PI / 5) * (t.radius * 0.45);
        const iy = t.y + Math.sin(angle + Math.PI / 5) * (t.radius * 0.45);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawHud() {
    ctx.fillStyle = "#2b1d0e";
    ctx.font = "bold 28px Trebuchet MS";
    ctx.fillText(`Score: ${state.score}`, 24, 40);
    ctx.fillText(`Lives: ${state.lives}`, 24, 74);
    ctx.fillText(`Best: ${state.highScore}`, W - 160, 40);
  }

  function drawCenteredPanel(lines, title) {
    const panelW = 620;
    const panelH = 260;
    const x = (W - panelW) / 2;
    const y = (H - panelH) / 2;

    ctx.fillStyle = "rgba(38, 21, 4, 0.74)";
    ctx.beginPath();
    ctx.roundRect(x, y, panelW, panelH, 18);
    ctx.fill();

    ctx.fillStyle = "#fff6dc";
    ctx.textAlign = "center";
    ctx.font = "bold 44px Trebuchet MS";
    ctx.fillText(title, W / 2, y + 64);

    ctx.font = "24px Trebuchet MS";
    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, y + 116 + idx * 36);
    });

    ctx.textAlign = "start";
  }

  function draw() {
    drawBackground();
    state.treats.forEach(drawTreat);
    drawPlayer();
    drawHud();

    if (state.mode === "menu") {
      drawCenteredPanel(
        ["Move: Arrow Keys or A/D", "Catch treats, don't miss 3", "Press Enter or Space to start"],
        "Milo Catching Treats"
      );
    }

    if (state.mode === "gameover") {
      drawCenteredPanel(
        [`Final Score: ${state.score}`, `High Score: ${state.highScore}`, "Press Enter or Space to play again"],
        "Game Over"
      );
    }
  }

  function loop(now) {
    if (!loop.last) loop.last = now;
    const dt = Math.min((now - loop.last) / 1000, 1 / 20);
    loop.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    canvas.requestFullscreen?.();
  }

  function resizeCanvasDisplay() {
    const rect = canvas.getBoundingClientRect();
    canvas.style.width = `${rect.width}px`;
  }

  window.addEventListener("resize", resizeCanvasDisplay);
  document.addEventListener("fullscreenchange", resizeCanvasDisplay);

  window.addEventListener("keydown", (e) => {
    state.keys[e.code] = true;

    if ((state.mode === "menu" || state.mode === "gameover") && (e.code === "Space" || e.code === "Enter")) {
      resetGame();
      e.preventDefault();
      return;
    }

    if (e.code === "KeyF") {
      toggleFullscreen();
    }
  });

  window.addEventListener("keyup", (e) => {
    state.keys[e.code] = false;
  });

  window.render_game_to_text = () => {
    const payload = {
      coordinateSystem: "origin top-left; +x right; +y down; pixels",
      mode: state.mode,
      score: state.score,
      highScore: state.highScore,
      lives: state.lives,
      player: {
        x: Number(state.player.x.toFixed(1)),
        y: Number(state.player.y.toFixed(1)),
        vx: Number(state.player.vx.toFixed(1)),
        width: state.player.width,
        height: state.player.height,
      },
      activeTreats: state.treats.map((t) => ({
        id: t.id,
        kind: t.kind,
        x: Number(t.x.toFixed(1)),
        y: Number(t.y.toFixed(1)),
        vy: Number(t.vy.toFixed(1)),
        radius: t.radius,
        points: t.points,
      })),
      pacing: {
        spawnIntervalSec: Number(state.spawnInterval.toFixed(3)),
        elapsedSec: Number(state.elapsed.toFixed(2)),
      },
      controls: {
        left: !!(state.keys.ArrowLeft || state.keys.KeyA),
        right: !!(state.keys.ArrowRight || state.keys.KeyD),
      },
    };
    return JSON.stringify(payload);
  };

  window.advanceTime = (ms) => {
    const step = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / step));
    const dt = 1 / 60;
    for (let i = 0; i < steps; i += 1) {
      update(dt);
    }
    draw();
  };

  resizeCanvasDisplay();
  draw();
  requestAnimationFrame(loop);
})();

const WIDTH = 360;
const HEIGHT = 640;
const STORAGE_KEY = "milo_treat_catch_best";
const DOG_NAME_KEY = "milo_treat_catch_dog_name";
const DOG_BREED_KEY = "milo_treat_catch_dog_breed";

class MiloTreatCatchScene extends Phaser.Scene {
  constructor() {
    super("milo-treat-catch");
    this.mode = "title";
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.bestScore = 0;
    this.spawnAccumulator = 0;
    this.nextSpawnDelay = 700;
    this.elapsedMs = 0;
    this.treats = [];
    this.cursors = null;
    this.dogName = "Puppy";
    this.dogBreed = "Golden Retriever";
    this.profilePanel = null;
    this.profileNameInput = null;
    this.profileBreedSelect = null;
    this.miloBody = null;
    this.miloFace = null;
  }

  create() {
    this.bestScore = Number(localStorage.getItem(STORAGE_KEY) || "0");
    this.loadDogProfile();
    this.bindProfilePanel();

    this.drawBackground();
    this.createUI();
    this.createMilo();
    this.createTitleCard();
    this.createGameOverCard();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("A,D,LEFT,RIGHT,ENTER,SPACE,F");

    this.input.on("pointerdown", (p) => {
      if (this.mode === "gameover") {
        this.startGame();
        return;
      }
      this.setMiloTargetX(p.x);
    });

    this.input.on("pointermove", (p) => {
      if (this.mode !== "playing") return;
      if (!p.isDown) return;
      this.setMiloTargetX(p.x);
    });

    this.input.keyboard.on("keydown-F", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    this.refreshUI();
    this.showTitle(true);
    this.showGameOver(false);

    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms) => this.advanceTime(ms);
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x8bdcff, 0x8bdcff, 0xdaf5ff, 0xdaf5ff, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    g.fillStyle(0x7dc76d, 1);
    g.fillRect(0, HEIGHT - 120, WIDTH, 120);

    g.fillStyle(0x66ad58, 1);
    g.fillRect(0, HEIGHT - 95, WIDTH, 95);

    this.groundY = HEIGHT - 28;
  }

  createUI() {
    const style = { fontFamily: "Verdana", fontSize: "20px", color: "#1b1b1b", fontStyle: "bold" };
    this.scoreText = this.add.text(12, 12, "Score: 0", style);
    this.comboText = this.add.text(12, 38, "Combo: x0", style);
    this.livesText = this.add.text(12, 64, "Lives: 3", style);
    this.dogText = this.add.text(12, 90, "", {
      fontFamily: "Verdana",
      fontSize: "15px",
      color: "#21314a",
      fontStyle: "bold",
    });

    this.popGroup = this.add.group();
  }

  createMilo() {
    this.milo = this.add.container(WIDTH / 2, HEIGHT - 68);

    const body = this.add.rectangle(0, 0, 104, 46, 0x7f532c);
    body.setStrokeStyle(3, 0x4e3015);
    const face = this.add.ellipse(0, -14, 52, 24, 0xe1b687);
    const earL = this.add.triangle(-38, -20, 0, 0, 16, -20, 16, 8, 0x523112);
    const earR = this.add.triangle(22, -20, 0, 0, 16, 8, 16, -20, 0x523112);
    const eyeL = this.add.circle(-10, -16, 3, 0x17120d);
    const eyeR = this.add.circle(10, -16, 3, 0x17120d);
    const nose = this.add.ellipse(0, -8, 8, 5, 0x2c1b12);

    this.milo.add([body, face, earL, earR, eyeL, eyeR, nose]);
    this.milo.setSize(104, 46);
    this.miloBody = body;
    this.miloFace = face;
    this.applyBreedVisuals();

    this.miloTargetX = this.milo.x;
    this.miloHalfW = 52;
  }

  createTitleCard() {
    this.titleCard = this.add.container(WIDTH / 2, HEIGHT / 2);
  }

  createGameOverCard() {
    this.gameOverCard = this.add.container(WIDTH / 2, HEIGHT / 2);
    const panel = this.add.rectangle(0, 0, WIDTH - 52, 220, 0x08131f, 0.84).setStrokeStyle(2, 0xe2c282, 1);
    this.gameOverTitle = this.add.text(0, -66, "Game Over", {
      fontFamily: "Verdana",
      fontSize: "34px",
      fontStyle: "bold",
      color: "#ffe7cf",
    }).setOrigin(0.5);
    this.gameOverScore = this.add.text(0, -14, "Score: 0", {
      fontFamily: "Verdana",
      fontSize: "22px",
      color: "#fff3dd",
    }).setOrigin(0.5);
    this.gameOverBest = this.add.text(0, 18, "Best: 0", {
      fontFamily: "Verdana",
      fontSize: "22px",
      color: "#fff3dd",
    }).setOrigin(0.5);
    this.gameOverDog = this.add.text(0, 44, "", {
      fontFamily: "Verdana",
      fontSize: "16px",
      color: "#ffdca2",
    }).setOrigin(0.5);
    this.gameOverRetry = this.add.text(0, 66, "Tap to Play Again", {
      fontFamily: "Verdana",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#ffda75",
    }).setOrigin(0.5);

    this.gameOverRetry.y = 76;
    this.gameOverCard.add([
      panel,
      this.gameOverTitle,
      this.gameOverScore,
      this.gameOverBest,
      this.gameOverDog,
      this.gameOverRetry,
    ]);
  }

  showTitle(show) {
    this.titleCard.setVisible(show);
    this.titleCard.setActive(show);
    this.syncProfilePanelVisibility();
  }

  showGameOver(show) {
    this.gameOverCard.setVisible(show);
    this.gameOverCard.setActive(show);
    this.syncProfilePanelVisibility();
  }

  startGame() {
    this.readProfileFromInputs();
    this.applyBreedVisuals();
    this.mode = "playing";
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.elapsedMs = 0;
    this.spawnAccumulator = 0;
    this.nextSpawnDelay = 700;
    this.milo.x = WIDTH / 2;
    this.miloTargetX = this.milo.x;

    this.clearTreats();
    this.showTitle(false);
    this.showGameOver(false);
    this.refreshUI();
  }

  setMiloTargetX(rawX) {
    this.miloTargetX = Phaser.Math.Clamp(rawX, this.miloHalfW, WIDTH - this.miloHalfW);
  }

  spawnTreat() {
    const x = Phaser.Math.Between(16, WIDTH - 16);
    const kindRoll = Math.random();
    let kind = "normal";
    let points = 10;
    let color = 0xf7c66d;
    let radius = 11;

    if (kindRoll > 0.9) {
      kind = "golden";
      points = 25;
      color = 0xffe07a;
      radius = 12;
    }

    const treat = this.add.circle(x, -14, radius, color).setStrokeStyle(2, 0x855f2a, 0.85);
    this.treats.push({
      sprite: treat,
      x,
      y: -14,
      radius,
      vy: Phaser.Math.Between(190, 320),
      kind,
      points,
    });
  }

  update(_time, delta) {
    if (this.mode === "title") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.startGame();
      }
      return;
    }

    if (this.mode === "gameover") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.startGame();
      }
      return;
    }

    this.stepGame(delta / 1000);
  }

  stepGame(dt) {
    const leftPressed = this.cursors.left.isDown || this.keys.LEFT.isDown || this.keys.A.isDown;
    const rightPressed = this.cursors.right.isDown || this.keys.RIGHT.isDown || this.keys.D.isDown;

    if (leftPressed && !rightPressed) this.setMiloTargetX(this.miloTargetX - 380 * dt);
    if (rightPressed && !leftPressed) this.setMiloTargetX(this.miloTargetX + 380 * dt);

    const lerpSpeed = 14;
    this.milo.x = Phaser.Math.Linear(this.milo.x, this.miloTargetX, Math.min(1, lerpSpeed * dt));

    this.elapsedMs += dt * 1000;
    this.spawnAccumulator += dt * 1000;
    this.nextSpawnDelay = Math.max(340, 700 - this.elapsedMs * 0.04);

    while (this.spawnAccumulator >= this.nextSpawnDelay) {
      this.spawnAccumulator -= this.nextSpawnDelay;
      this.spawnTreat();
    }

    const miloTop = this.milo.y - 28;
    const miloBottom = this.milo.y + 22;
    const miloLeft = this.milo.x - this.miloHalfW;
    const miloRight = this.milo.x + this.miloHalfW;

    for (let i = this.treats.length - 1; i >= 0; i -= 1) {
      const t = this.treats[i];
      t.y += t.vy * dt;
      t.sprite.y = t.y;

      const catchHit =
        t.x + t.radius >= miloLeft &&
        t.x - t.radius <= miloRight &&
        t.y + t.radius >= miloTop &&
        t.y - t.radius <= miloBottom;

      if (catchHit) {
        this.handleCatch(i);
        continue;
      }

      if (t.y - t.radius > this.groundY) {
        this.handleMiss(i);
      }
    }
  }

  handleCatch(index) {
    const t = this.treats[index];
    t.sprite.destroy();
    this.treats.splice(index, 1);

    this.combo += 1;
    const comboMult = Math.min(10, this.combo);
    this.score += t.points * comboMult;

    this.popText("CHOMP!", this.milo.x, this.milo.y - 54, "#fff8bf");
    this.tweens.add({
      targets: this.milo,
      y: this.milo.y - 12,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    this.refreshUI();
  }

  handleMiss(index) {
    const t = this.treats[index];
    t.sprite.destroy();
    this.treats.splice(index, 1);

    this.combo = 0;
    this.lives -= 1;
    this.popText("MISS", t.x, this.groundY - 26, "#ffcbc1");
    this.refreshUI();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  popText(label, x, y, color) {
    const text = this.add
      .text(x, y, label, { fontFamily: "Verdana", fontSize: "20px", color, fontStyle: "bold" })
      .setOrigin(0.5);
    this.popGroup.add(text);

    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 450,
      ease: "Sine.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  refreshUI() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.comboText.setText(`Combo: x${this.combo}`);
    this.livesText.setText(`Lives: ${this.lives}`);
    this.dogText.setText(`${this.dogName} (${this.dogBreed})`);
    this.gameOverDog.setText(`Dog: ${this.dogName} (${this.dogBreed})`);

    if (this.combo >= 2) {
      this.comboText.setColor("#7a1f1a");
    } else {
      this.comboText.setColor("#1b1b1b");
    }
  }

  endGame() {
    this.mode = "gameover";
    this.clearTreats();
    this.bestScore = Math.max(this.bestScore, this.score);
    localStorage.setItem(STORAGE_KEY, String(this.bestScore));

    this.gameOverScore.setText(`Score: ${this.score}`);
    this.gameOverBest.setText(`Best: ${this.bestScore}`);
    this.showGameOver(true);
  }

  clearTreats() {
    for (const t of this.treats) {
      if (t.sprite) t.sprite.destroy();
    }
    this.treats.length = 0;
  }

  renderGameToText() {
    const payload = {
      coordinateSystem: "origin top-left; +x right; +y down; pixels",
      mode: this.mode,
      score: this.score,
      combo: this.combo,
      lives: this.lives,
      bestScore: this.bestScore,
      dog: {
        name: this.dogName,
        breed: this.dogBreed,
      },
      player: {
        x: Number(this.milo.x.toFixed(1)),
        y: Number(this.milo.y.toFixed(1)),
        width: 104,
        height: 46,
        targetX: Number(this.miloTargetX.toFixed(1)),
      },
      treats: this.treats.map((t) => ({
        kind: t.kind,
        x: Number(t.x.toFixed(1)),
        y: Number(t.y.toFixed(1)),
        radius: t.radius,
        vy: Number(t.vy.toFixed(1)),
        points: t.points,
      })),
      pacing: {
        spawnDelayMs: Number(this.nextSpawnDelay.toFixed(1)),
        elapsedMs: Number(this.elapsedMs.toFixed(1)),
      },
    };
    return JSON.stringify(payload);
  }

  advanceTime(ms) {
    if (this.mode !== "playing") {
      if (this.mode === "title") this.startGame();
      return;
    }

    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      this.stepGame(1 / 60);
    }
  }

  loadDogProfile() {
    const storedName = (localStorage.getItem(DOG_NAME_KEY) || "").trim();
    const storedBreed = (localStorage.getItem(DOG_BREED_KEY) || "").trim();
    this.dogName = storedName || "Puppy";
    this.dogBreed = storedBreed || "Golden Retriever";
  }

  sanitizeDogName(name) {
    const clean = name.replace(/\s+/g, " ").trim();
    return clean.slice(0, 20) || "Puppy";
  }

  bindProfilePanel() {
    this.profilePanel = document.getElementById("dog-profile");
    this.profileNameInput = document.getElementById("dog-name");
    this.profileBreedSelect = document.getElementById("dog-breed");
    const saveButton = document.getElementById("save-dog-profile");
    if (!this.profilePanel || !this.profileNameInput || !this.profileBreedSelect || !saveButton) return;

    this.profileNameInput.value = this.dogName;
    this.profileBreedSelect.value = this.dogBreed;

    saveButton.addEventListener("click", () => {
      this.readProfileFromInputs();
      this.applyBreedVisuals();
      this.refreshUI();
      if (this.mode === "title") {
        this.startGame();
      }
    });
  }

  readProfileFromInputs() {
    if (!this.profileNameInput || !this.profileBreedSelect) return;
    this.dogName = this.sanitizeDogName(this.profileNameInput.value);
    this.dogBreed = this.profileBreedSelect.value || "Golden Retriever";
    this.profileNameInput.value = this.dogName;
    localStorage.setItem(DOG_NAME_KEY, this.dogName);
    localStorage.setItem(DOG_BREED_KEY, this.dogBreed);
  }

  applyBreedVisuals() {
    if (!this.miloBody || !this.miloFace) return;
    const palettes = {
      "Golden Retriever": { body: 0x9b6a33, face: 0xe7c28a },
      Labrador: { body: 0x6f4521, face: 0xd8b07d },
      Corgi: { body: 0xcc7a31, face: 0xf3d0a3 },
      Beagle: { body: 0x8a5a33, face: 0xebcb9f },
      "Shiba Inu": { body: 0xbc6830, face: 0xf0cca4 },
      "Mixed Breed": { body: 0x78603e, face: 0xddc19b },
    };
    const p = palettes[this.dogBreed] || palettes["Golden Retriever"];
    this.miloBody.setFillStyle(p.body);
    this.miloFace.setFillStyle(p.face);
  }

  syncProfilePanelVisibility() {
    if (!this.profilePanel) return;
    const show = this.mode === "title";
    this.profilePanel.style.display = show ? "block" : "none";
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-host",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#9bdfff",
  scene: [MiloTreatCatchScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

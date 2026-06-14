const WIDTH = 360;
const HEIGHT = 640;
const DATA_KEY = "milo_treat_rush_player_data";

const DOGS = ["Golden Retriever", "Labrador", "Corgi", "Beagle", "Shiba Inu", "Mixed Breed"];

const DOG_PALETTES = {
  "Golden Retriever": { body: 0xd99234, face: 0xffcf82, ear: 0xb96f27, collar: 0xc63c37 },
  Labrador: { body: 0x6d4528, face: 0xb87b45, ear: 0x4b2b1a, collar: 0x28a1d8 },
  Corgi: { body: 0xc86929, face: 0xffd4a0, ear: 0x9c431d, collar: 0x44b761 },
  Beagle: { body: 0x8d572d, face: 0xf2c792, ear: 0x4a2a17, collar: 0xd84f8c },
  "Shiba Inu": { body: 0xc57530, face: 0xffd9ad, ear: 0x8b3f1f, collar: 0x4b6bdc },
  "Mixed Breed": { body: 0x78613d, face: 0xd9bc8d, ear: 0x463624, collar: 0xf0aa21 },
};

const DEFAULT_DATA = {
  coins: 0,
  gems: 0,
  level: 1,
  xp: 0,
  highScore: 0,
  selectedDog: "Golden Retriever",
  unlockedDogs: ["Golden Retriever"],
  upgrades: {
    speed: 0,
    magnet: 0,
    extraLife: 0,
    scoreMultiplier: 0,
  },
  dailyChallenges: [
    { id: "bones", title: "Catch 50 Bones", progress: 0, goal: 50, reward: "100 Coins", claimed: false },
    { id: "combo", title: "Reach Combo x10", progress: 0, goal: 10, reward: "New Collar", claimed: false },
    { id: "perfect", title: "No Miss Run", progress: 0, goal: 1, reward: "Rare Skin", claimed: false },
  ],
  missions: [
    { id: "score", title: "Score 1,000", progress: 0, goal: 1000, reward: "50 Coins" },
    { id: "gold", title: "Catch 5 Golden Bones", progress: 0, goal: 5, reward: "2 Gems" },
  ],
  worlds: [
    { id: "backyard", title: "Backyard", unlocked: true },
    { id: "park", title: "Park", unlocked: false },
    { id: "city", title: "City", unlocked: false },
    { id: "space", title: "Space Station", unlocked: false },
  ],
};

const ITEM_TYPES = [
  { key: "bone", label: "Bone", points: 10, size: 30, weight: 46, color: 0xfff0c8, stroke: 0x9b6b32 },
  { key: "goldenBone", label: "Golden Bone", points: 50, size: 36, weight: 9, color: 0xffd229, stroke: 0xb86e00, rare: true },
  { key: "fish", label: "Rotten Fish", size: 34, weight: 13, color: 0x6abf94, stroke: 0x246346 },
  { key: "tennis", label: "Tennis Ball", size: 32, weight: 10, color: 0xc9f238, stroke: 0x688311 },
  { key: "toy", label: "Squeaky Toy", size: 34, weight: 8, color: 0xff72b1, stroke: 0xa22d68 },
  { key: "chocolate", label: "Chocolate", size: 36, weight: 6, color: 0x70401e, stroke: 0x321708 },
  { key: "coin", label: "Coin", size: 24, weight: 7, color: 0xffc329, stroke: 0xb86e00 },
  { key: "gem", label: "Gem", size: 28, weight: 1, color: 0xc846ff, stroke: 0x6c2194 },
];

const DOG_TEXTURES = {
  "Golden Retriever": "dog_golden",
  "Shiba Inu": "dog_shiba",
};

function cloneDefaultData() {
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function mergeData(saved) {
  const base = cloneDefaultData();
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    upgrades: { ...base.upgrades, ...(saved.upgrades || {}) },
    unlockedDogs: Array.isArray(saved.unlockedDogs) ? saved.unlockedDogs : base.unlockedDogs,
    dailyChallenges: Array.isArray(saved.dailyChallenges) ? saved.dailyChallenges : base.dailyChallenges,
    missions: Array.isArray(saved.missions) ? saved.missions : base.missions,
    worlds: Array.isArray(saved.worlds) ? saved.worlds : base.worlds,
  };
}

class MiloTreatRushScene extends Phaser.Scene {
  constructor() {
    super("milo-treat-rush");
    this.mode = "home";
    this.playerData = cloneDefaultData();
    this.score = 0;
    this.combo = 0;
    this.lives = 3;
    this.elapsedMs = 0;
    this.spawnAccumulator = 0;
    this.nextSpawnDelay = 720;
    this.treats = [];
    this.popTexts = null;
    this.screenRoot = null;
    this.worldRoot = null;
    this.hudRoot = null;
    this.milo = null;
    this.miloTargetX = WIDTH / 2;
    this.miloHalfW = 42;
    this.fever = 0;
    this.feverActiveMs = 0;
    this.speedBoostMs = 0;
    this.magnetMs = 0;
    this.runCoins = 0;
    this.runGems = 0;
  }

  preload() {
    this.load.image("bg_day", "asset/background1.png");
    this.load.image("bg_sunset", "asset/background_sunset.png");
    this.load.image("bg_night", "asset/background_night.png");
    this.load.image("dog_golden", "asset/processed/golden_retriever_cutout.png");
    this.load.image("dog_shiba", "asset/processed/shiba_inu_cutout.png");
    this.load.image("dog_selection_sheet", "asset/dog selection portrait.png");
  }

  create() {
    this.loadProgress();
    this.screenRoot = this.add.container(0, 0);
    this.worldRoot = this.add.container(0, 0);
    this.hudRoot = this.add.container(0, 0);
    this.popTexts = this.add.group();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("A,D,LEFT,RIGHT,ENTER,SPACE,F,ESC");

    this.input.keyboard.on("keydown-F", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.mode !== "home" && this.mode !== "playing") this.showHome();
    });

    this.input.on("pointerdown", (p) => {
      if (this.mode !== "playing") return;
      this.setMiloTargetX(p.x);
    });
    this.input.on("pointermove", (p) => {
      if (this.mode !== "playing" || !p.isDown) return;
      this.setMiloTargetX(p.x);
    });

    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms) => this.advanceTime(ms);
    this.installDebugStatus();
    this.installCanvasTapFallback();

    this.showHome();
  }

  installDebugStatus() {
    this.debugStatus = document.createElement("div");
    this.debugStatus.id = "game-status";
    this.debugStatus.style.display = "none";
    document.body.appendChild(this.debugStatus);
  }

  installCanvasTapFallback() {
    this.game.canvas.addEventListener("pointerup", (event) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
      this.handleCanvasTap(x, y);
    });
  }

  handleCanvasTap(x, y) {
    if (this.mode === "playing") {
      this.setMiloTargetX(x);
      return;
    }
    if (this.inRect(x, y, 28, 18, 44, 48) && this.mode !== "home") {
      this.showHome();
      return;
    }
    if (this.mode === "home") {
      if (this.inRect(x, y, 84, 470, 192, 64)) this.startGame();
      else if (this.inRect(x, y, 92, 542, 176, 42)) this.showMissions();
      else if (this.inRect(x, y, 28, 124, 64, 64)) this.showRewardPanel("dailyGift");
      else if (this.inRect(x, y, 28, 284, 64, 64)) this.showChooseDog();
      else if (this.inRect(x, y, 28, 364, 64, 64)) this.showShop();
      else if (this.inRect(x, y, 28, 444, 64, 64)) this.showRewardPanel("spinWheel");
      else if (this.inRect(x, y, 274, 146, 64, 64)) this.showMissions();
      else if (this.inRect(x, y, 94, 590, 74, 44)) this.showCollection();
      else if (this.inRect(x, y, 178, 590, 74, 44)) this.showWorld();
      else if (this.inRect(x, y, 262, 590, 74, 44)) this.showPlaceholder("Events", "Limited-time boss events and rewards.");
      return;
    }
    if (this.mode === "chooseDog") {
      DOGS.forEach((dog, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = 25 + col * 160;
        const cardY = 88 + row * 172;
        if (this.inRect(x, y, cardX + 16, cardY + 126, 118, 28) && this.playerData.unlockedDogs.includes(dog)) {
          this.playerData.selectedDog = dog;
          this.saveProgress();
          this.showHome();
        }
      });
      return;
    }
    if (this.mode === "gameover") {
      if (this.inRect(x, y, 70, 370, 220, 48)) this.startGame();
      else if (this.inRect(x, y, 114, 426, 132, 34)) this.showHome();
    }
  }

  inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
  }

  loadProgress() {
    try {
      this.playerData = mergeData(JSON.parse(localStorage.getItem(DATA_KEY) || "null"));
    } catch (_error) {
      this.playerData = cloneDefaultData();
    }
  }

  saveProgress() {
    localStorage.setItem(DATA_KEY, JSON.stringify(this.playerData));
  }

  clearLayer(layer) {
    layer.removeAll(true);
  }

  setMode(mode) {
    this.mode = mode;
    if (this.debugStatus) this.debugStatus.textContent = mode;
  }

  drawBackyard(target = this.screenRoot, textureKey = "bg_day") {
    if (this.textures.exists(textureKey)) {
      const bg = this.add.image(WIDTH / 2, HEIGHT / 2, textureKey);
      const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
      bg.setScale(scale);
      target.add(bg);
      return;
    }

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1d8fff, 0x0e7cee, 0x8be7ff, 0xdaf7ff, 1);
    sky.fillRect(0, 0, WIDTH, HEIGHT);
    target.add(sky);

    this.addCloud(target, 46, 92, 0.92);
    this.addCloud(target, 250, 115, 0.7);
    this.addCloud(target, 178, 208, 0.5);

    const hills = this.add.graphics();
    hills.fillStyle(0x6ec14e, 1);
    hills.fillCircle(62, 365, 92);
    hills.fillCircle(160, 360, 100);
    hills.fillCircle(290, 350, 115);
    hills.fillStyle(0x53a83e, 1);
    hills.fillCircle(22, 392, 70);
    hills.fillCircle(338, 388, 78);
    target.add(hills);

    const fence = this.add.graphics();
    fence.fillStyle(0xfff4d8, 1);
    for (let x = -8; x < WIDTH + 16; x += 22) {
      fence.fillTriangle(x, 390, x + 10, 374, x + 20, 390);
      fence.fillRect(x, 390, 20, 84);
    }
    fence.fillStyle(0xe8d4ad, 1);
    fence.fillRect(0, 408, WIDTH, 8);
    fence.fillRect(0, 448, WIDTH, 8);
    target.add(fence);

    const grass = this.add.graphics();
    grass.fillGradientStyle(0x85db44, 0x7bd63f, 0x3f9d32, 0x2c842b, 1);
    grass.fillRect(0, 418, WIDTH, 222);
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 47) % WIDTH;
      const y = 472 + ((i * 29) % 130);
      grass.fillStyle(i % 2 ? 0xffffff : 0xfff6a8, 0.9);
      grass.fillCircle(x, y, 2);
      grass.fillCircle(x + 4, y + 2, 2);
      grass.fillStyle(0xffcf3f, 1);
      grass.fillCircle(x + 2, y + 1, 1.2);
    }
    target.add(grass);
  }

  addCloud(target, x, y, scale) {
    const cloud = this.add.container(x, y);
    const pieces = [
      this.add.circle(0, 8, 18, 0xffffff, 0.78),
      this.add.circle(18, 0, 24, 0xffffff, 0.82),
      this.add.circle(42, 9, 18, 0xffffff, 0.78),
      this.add.ellipse(22, 18, 72, 24, 0xffffff, 0.7),
    ];
    cloud.add(pieces);
    cloud.setScale(scale);
    target.add(cloud);
    this.tweens.add({ targets: cloud, x: x + 10, duration: 3600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  showHome() {
    this.setMode("home");
    this.clearLayer(this.screenRoot);
    this.clearLayer(this.worldRoot);
    this.clearLayer(this.hudRoot);
    this.clearTreats();

    this.drawBackyard(this.screenRoot, "bg_day");
    this.addDogHouse(this.screenRoot, 276, 400, 0.78);
    this.addTreatBowl(this.screenRoot, 274, 500);
    this.addMenuMilo();
    this.addHomeTopBar();
    this.addHighScorePanel();
    this.addSideButtons();
    this.addHomeActions();
    this.addBottomNav("Home");
  }

  addHomeTopBar() {
    const profile = this.createPanel(12, 12, 145, 48, 0x132b4a, 16, 0x2f6ba0);
    this.screenRoot.add(profile);
    this.screenRoot.add(this.add.circle(37, 36, 29, 0xffcf82).setStrokeStyle(4, 0xf7a329));
    this.addDogPortrait(this.screenRoot, 37, 38, 0.38, this.playerData.selectedDog);
    this.addOutlinedText(this.screenRoot, 72, 17, "MILO", 17, "#ffffff", 0x0b2036).setOrigin(0, 0.5);
    this.screenRoot.add(this.add.star(76, 42, 5, 12, 18, 0xffd62f).setStrokeStyle(2, 0xb16c00));
    this.addOutlinedText(this.screenRoot, 76, 43, String(this.playerData.level), 13, "#ffffff", 0x8a4b00).setOrigin(0.5);
    this.addProgressBar(this.screenRoot, 100, 35, 48, 13, this.playerData.xp / 1500, 0x7cf037);

    this.addCurrencyPill(164, 18, 82, 32, "coin", this.playerData.coins);
    this.addCurrencyPill(260, 18, 74, 32, "gem", this.playerData.gems);
    const gear = this.createCircleButton(342, 34, 18, 0x263f5c, "⚙");
    gear.on("pointerup", () => this.showPlaceholder("Settings", "Sound, controls, and account options."));
    this.screenRoot.add(gear);
  }

  addCurrencyPill(x, y, w, h, type, amount) {
    this.screenRoot.add(this.createPanel(x, y, w, h, 0x173455, 14, 0x4b82ac));
    if (type === "coin") this.addCoinIcon(this.screenRoot, x + 16, y + 16, 12);
    else this.addGemIcon(this.screenRoot, x + 16, y + 16, 13);
    this.addOutlinedText(this.screenRoot, x + 33, y + 16, String(amount), 18, "#ffffff", 0x132133).setOrigin(0, 0.5);
    const plus = this.createCircleButton(x + w - 12, y + 16, 14, 0x65c82d, "+", 17);
    this.screenRoot.add(plus);
  }

  addHighScorePanel() {
    const panel = this.createPanel(92, 82, 176, 58, 0x5a3521, 14, 0xc0833b);
    this.screenRoot.add(panel);
    this.addOutlinedText(this.screenRoot, 180, 102, "HIGH SCORE", 16, "#ffdb3c", 0x4a210d).setOrigin(0.5);
    this.addTrophyIcon(this.screenRoot, 130, 126, 0.48);
    this.addOutlinedText(this.screenRoot, 184, 128, this.playerData.highScore.toLocaleString(), 26, "#ffffff", 0x2d1609).setOrigin(0.5);
  }

  addSideButtons() {
    const leftButtons = [
      ["Daily Gift", 60, 156, "gift", () => this.showRewardPanel("dailyGift")],
      ["Leaderboard", 60, 236, "trophy", () => this.showPlaceholder("Leaderboard", "Best runs and friend scores will live here.")],
      ["Dogs", 60, 316, "dog", () => this.showChooseDog()],
      ["Shop", 60, 396, "shop", () => this.showShop()],
      ["Spin", 60, 476, "spin", () => this.showRewardPanel("spinWheel")],
    ];
    const rightButtons = [
      ["Missions", 306, 178, "missions", () => this.showMissions()],
      ["Achievements", 306, 278, "medal", () => this.showPlaceholder("Achievements", "Badges for streaks, combos, and rare catches.")],
    ];
    for (const item of [...leftButtons, ...rightButtons]) this.addSideButton(...item);
  }

  addSideButton(label, x, y, icon, action) {
    const button = this.add.container(x, y).setSize(64, 64).setInteractive({ useHandCursor: true });
    const color = icon === "shop" || icon === "spin" ? 0x8f49e8 : 0x22a8ee;
    button.add(this.createPanel(-32, -32, 64, 64, color, 14, 0xabefff));
    this.addIcon(button, icon, 0, -8, 0.72);
    const labelBg = this.add.roundedRectangle ? null : this.add.rectangle(0, 23, 58, 20, 0x173455, 0.9);
    button.add(labelBg);
    button.add(this.add.text(0, 24, label.toUpperCase(), {
      fontFamily: "Verdana",
      fontSize: label.length > 10 ? "9px" : "10px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#132133",
      strokeThickness: 3,
    }).setOrigin(0.5));
    if (["Daily Gift", "Shop", "Spin", "Missions"].includes(label)) {
      button.add(this.add.circle(28, -28, 11, 0xf44345).setStrokeStyle(2, 0xffffff));
      button.add(this.add.text(28, -29, label === "Missions" ? "3" : "!", {
        fontFamily: "Verdana",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5));
    }
    button.on("pointerdown", () => this.tweens.add({ targets: button, scale: 0.92, duration: 70, yoyo: true }));
    button.on("pointerup", action);
    this.screenRoot.add(button);
  }

  addHomeActions() {
    const play = this.createBigButton(84, 470, 192, 64, "PLAY", 38, 0xffc928, 0xd27700);
    play.on("pointerup", () => this.startGame());
    this.screenRoot.add(play);

    const daily = this.createBigButton(92, 542, 176, 42, "DAILY CHALLENGE", 18, 0x178ee8, 0x0867ba);
    daily.on("pointerup", () => this.showMissions());
    this.screenRoot.add(daily);
  }

  addBottomNav(active) {
    this.screenRoot.add(this.createPanel(10, 590, 340, 50, 0x7a3f20, 14, 0xba6c2d));
    const tabs = [
      ["Home", "shield", () => this.showHome()],
      ["Collection", "collar", () => this.showCollection()],
      ["World", "map", () => this.showWorld()],
      ["Events", "trophy", () => this.showPlaceholder("Events", "Limited-time boss events and rewards.")],
    ];
    tabs.forEach(([label, icon, action], index) => {
      const x = 52 + index * 84;
      const tab = this.add.container(x, 616).setSize(74, 44).setInteractive({ useHandCursor: true });
      this.addIcon(tab, icon, 0, -10, 0.48);
      tab.add(this.add.text(0, 12, label.toUpperCase(), {
        fontFamily: "Verdana",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#32180a",
        strokeThickness: 3,
      }).setOrigin(0.5));
      if (label === active) tab.add(this.add.rectangle(0, 24, 48, 4, 0xffe04f).setOrigin(0.5));
      tab.on("pointerup", action);
      this.screenRoot.add(tab);
    });
  }

  addMenuMilo() {
    const milo = this.createDogContainer(180, 383, 1.38, this.playerData.selectedDog);
    this.screenRoot.add(milo);
    this.tweens.add({ targets: milo, y: 376, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  showChooseDog() {
    this.setMode("chooseDog");
    this.clearLayer(this.screenRoot);
    this.drawBackyard(this.screenRoot, "bg_sunset");
    const sheet = this.add.image(180, 335, "dog_selection_sheet");
    sheet.setDisplaySize(308, 462);
    sheet.setAlpha(0.16);
    this.screenRoot.add(sheet);
    this.addHeader("CHOOSE DOG", () => this.showHome());
    DOGS.forEach((dog, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.addDogCard(25 + col * 160, 88 + row * 172, dog);
    });
  }

  addDogCard(x, y, dog) {
    const unlocked = this.playerData.unlockedDogs.includes(dog);
    const selected = this.playerData.selectedDog === dog;
    const card = this.add.container(x, y);
    card.add(this.createPanel(0, 0, 150, 160, selected ? 0xffd65a : 0x1e9be0, 16, selected ? 0xfff1a1 : 0xbcecff));
    this.addDogPortrait(card, 75, 58, 0.72, dog);
    card.add(this.add.text(75, 112, dog, {
      fontFamily: "Verdana",
      fontSize: dog.length > 12 ? "13px" : "16px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#173455",
      strokeThickness: 4,
    }).setOrigin(0.5));
    const label = unlocked ? (selected ? "SELECTED" : "SELECT") : "LEVEL 5";
    const button = this.createSmallButton(16, 126, 118, 28, label, unlocked ? 0xffb928 : 0x62788f);
    if (unlocked) {
      button.on("pointerup", () => {
        this.playerData.selectedDog = dog;
        this.saveProgress();
        this.showHome();
      });
    }
    card.add(button);
    this.screenRoot.add(card);
  }

  showShop() {
    this.showInfoScreen("shop", "SHOP", [
      ["Faster Movement", `Level ${this.playerData.upgrades.speed}`, "120 Coins"],
      ["Magnet Pickup", `Level ${this.playerData.upgrades.magnet}`, "180 Coins"],
      ["Extra Life", `Level ${this.playerData.upgrades.extraLife}`, "220 Coins"],
      ["Double Score", `Level ${this.playerData.upgrades.scoreMultiplier}`, "300 Coins"],
      ["New Skins", "Coming Soon", "Gems"],
    ]);
  }

  showMissions() {
    const rows = this.playerData.dailyChallenges.map((c) => [c.title, `${c.progress}/${c.goal}`, c.reward]);
    this.showInfoScreen("missions", "MISSIONS", rows);
  }

  showCollection() {
    const rows = DOGS.map((dog) => [
      dog,
      this.playerData.unlockedDogs.includes(dog) ? "Unlocked" : "Locked",
      dog === this.playerData.selectedDog ? "Equipped" : "Dog",
    ]);
    this.showInfoScreen("collection", "COLLECTION", rows, "Collection");
  }

  showWorld() {
    const rows = this.playerData.worlds.map((world) => [
      world.title,
      world.unlocked ? "Open" : "Locked",
      world.unlocked ? "Play" : "Soon",
    ]);
    this.showInfoScreen("world", "WORLD", rows, "World");
  }

  showRewardPanel(mode) {
    const isSpin = mode === "spinWheel";
    this.setMode(mode);
    this.clearLayer(this.screenRoot);
    this.drawBackyard(this.screenRoot, isSpin ? "bg_night" : "bg_sunset");
    this.addHeader(isSpin ? "SPIN WHEEL" : "DAILY GIFT", () => this.showHome());
    this.screenRoot.add(this.createPanel(42, 144, 276, 310, 0x173455, 18, 0xffd16b));
    if (isSpin) {
      this.addSpinWheel(180, 280);
      this.screenRoot.add(this.createBigButton(100, 390, 160, 48, "SPIN", 24, 0xffc928, 0xd27700));
    } else {
      this.addIcon(this.screenRoot, "gift", 180, 260, 1.9);
      this.addOutlinedText(this.screenRoot, 180, 372, "CLAIM 100 COINS", 22, "#ffffff", 0x152034).setOrigin(0.5);
      const claim = this.createBigButton(100, 398, 160, 48, "CLAIM", 24, 0xffc928, 0xd27700);
      claim.on("pointerup", () => {
        this.playerData.coins += 100;
        this.saveProgress();
        this.showHome();
      });
      this.screenRoot.add(claim);
    }
  }

  showPlaceholder(title, body) {
    this.showInfoScreen(title.toLowerCase(), title.toUpperCase(), [[body, "Preview", "Soon"]]);
  }

  showInfoScreen(mode, title, rows, activeNav = null) {
    this.setMode(mode);
    this.clearLayer(this.screenRoot);
    const bgKey = mode === "world" ? "bg_sunset" : mode === "missions" ? "bg_day" : "bg_night";
    this.drawBackyard(this.screenRoot, bgKey);
    this.addHeader(title, () => this.showHome());
    this.screenRoot.add(this.createPanel(24, 92, 312, 430, 0x173455, 18, 0xffd16b));
    rows.forEach((row, index) => {
      const y = 122 + index * 72;
      this.screenRoot.add(this.createPanel(42, y, 276, 54, index % 2 ? 0x1d8ed8 : 0x22a8ee, 12, 0xbcecff));
      this.addOutlinedText(this.screenRoot, 58, y + 18, row[0], 15, "#ffffff", 0x173455).setOrigin(0, 0.5);
      this.addOutlinedText(this.screenRoot, 58, y + 38, row[1], 12, "#fff7bd", 0x173455).setOrigin(0, 0.5);
      this.addOutlinedText(this.screenRoot, 288, y + 28, row[2], 12, "#ffffff", 0x173455).setOrigin(1, 0.5);
    });
    if (activeNav) this.addBottomNav(activeNav);
  }

  addHeader(title, backAction) {
    this.screenRoot.add(this.createPanel(28, 18, 304, 48, 0x132b4a, 16, 0x5ca7db));
    this.addOutlinedText(this.screenRoot, 180, 42, title, 24, "#ffffff", 0x091b2e).setOrigin(0.5);
    const back = this.createCircleButton(50, 42, 17, 0xffc928, "‹", 26);
    back.on("pointerup", backAction);
    this.screenRoot.add(back);
  }

  startGame() {
    this.setMode("playing");
    this.clearLayer(this.screenRoot);
    this.clearLayer(this.worldRoot);
    this.clearLayer(this.hudRoot);
    this.clearTreats();

    this.score = 0;
    this.combo = 0;
    this.lives = 3 + Math.min(2, this.playerData.upgrades.extraLife);
    this.elapsedMs = 0;
    this.spawnAccumulator = 0;
    this.nextSpawnDelay = 720;
    this.fever = 0;
    this.feverActiveMs = 0;
    this.speedBoostMs = 0;
    this.magnetMs = 0;
    this.runCoins = 0;
    this.runGems = 0;

    this.drawGameplayWorld();
    this.createMiloPlayer();
    this.createGameplayHud();
    this.refreshGameplayHud();
  }

  drawGameplayWorld() {
    this.drawBackyard(this.worldRoot, "bg_day");
    this.addDogHouse(this.worldRoot, 296, 424, 0.58);
    this.addTreatBowl(this.worldRoot, 285, 526);
  }

  createGameplayHud() {
    this.scorePill = this.createPanel(12, 12, 110, 34, 0x173455, 13, 0x5ca7db);
    this.hudRoot.add(this.scorePill);
    this.scoreText = this.add.text(67, 29, "0", this.hudTextStyle(17)).setOrigin(0.5);
    this.hudRoot.add(this.scoreText);

    this.hudRoot.add(this.createPanel(128, 14, 90, 28, 0x173455, 12, 0x5ca7db));
    this.livesText = this.add.text(173, 28, "♥ ♥ ♥", this.hudTextStyle(15, "#ff595d")).setOrigin(0.5);
    this.hudRoot.add(this.livesText);

    this.hudRoot.add(this.createPanel(230, 12, 118, 34, 0x173455, 13, 0x5ca7db));
    this.comboText = this.add.text(289, 29, "x0", this.hudTextStyle(17, "#ffdf3f")).setOrigin(0.5);
    this.hudRoot.add(this.comboText);

    this.hudRoot.add(this.createPanel(28, 52, 304, 16, 0x0f253c, 8, 0x5ca7db));
    this.feverFill = this.add.rectangle(32, 56, 0, 8, 0xffd92d).setOrigin(0, 0);
    this.hudRoot.add(this.feverFill);

    const pause = this.createCircleButton(335, 67, 15, 0x263f5c, "Ⅱ", 14);
    pause.on("pointerup", () => this.showHome());
    this.hudRoot.add(pause);
  }

  createMiloPlayer() {
    this.milo = this.createDogContainer(WIDTH / 2, HEIGHT - 74, 0.74, this.playerData.selectedDog);
    this.worldRoot.add(this.milo);
    this.miloTargetX = this.milo.x;
    this.miloHalfW = 42;
  }

  update(_time, delta) {
    if (this.mode === "home" && (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE))) {
      this.startGame();
      return;
    }
    if (this.mode === "gameover" && (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE))) {
      this.startGame();
      return;
    }
    if (this.mode !== "playing") return;
    this.stepGame(delta / 1000);
  }

  stepGame(dt) {
    const leftPressed = this.cursors.left.isDown || this.keys.LEFT.isDown || this.keys.A.isDown;
    const rightPressed = this.cursors.right.isDown || this.keys.RIGHT.isDown || this.keys.D.isDown;
    const speed = 380 + this.playerData.upgrades.speed * 26 + (this.speedBoostMs > 0 ? 160 : 0);
    if (leftPressed && !rightPressed) this.setMiloTargetX(this.miloTargetX - speed * dt);
    if (rightPressed && !leftPressed) this.setMiloTargetX(this.miloTargetX + speed * dt);

    this.milo.x = Phaser.Math.Linear(this.milo.x, this.miloTargetX, Math.min(1, 14 * dt));
    this.milo.rotation = Phaser.Math.Clamp((this.miloTargetX - this.milo.x) * 0.002, -0.08, 0.08);

    this.elapsedMs += dt * 1000;
    this.spawnAccumulator += dt * 1000;
    this.nextSpawnDelay = Math.max(300, 720 - this.elapsedMs * 0.035);
    this.speedBoostMs = Math.max(0, this.speedBoostMs - dt * 1000);
    this.magnetMs = Math.max(0, this.magnetMs - dt * 1000);
    this.feverActiveMs = Math.max(0, this.feverActiveMs - dt * 1000);

    while (this.spawnAccumulator >= this.nextSpawnDelay) {
      this.spawnAccumulator -= this.nextSpawnDelay;
      this.spawnItem();
    }

    this.updateItems(dt);
    this.refreshGameplayHud();
  }

  setMiloTargetX(rawX) {
    this.miloTargetX = Phaser.Math.Clamp(rawX, this.miloHalfW, WIDTH - this.miloHalfW);
  }

  spawnItem(forcedType = null) {
    const type = forcedType || this.pickItemType();
    const x = Phaser.Math.Between(22, WIDTH - 22);
    const sprite = this.createItemSprite(x, -22, type);
    this.worldRoot.add(sprite);
    this.treats.push({
      sprite,
      type,
      x,
      y: -22,
      radius: type.size / 2,
      vy: Phaser.Math.Between(190, 318) + Math.min(90, this.elapsedMs / 1500),
    });
  }

  pickItemType() {
    const total = ITEM_TYPES.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of ITEM_TYPES) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return ITEM_TYPES[0];
  }

  updateItems(dt) {
    const miloTop = this.milo.y - 48;
    const miloBottom = this.milo.y + 26;
    const miloLeft = this.milo.x - this.miloHalfW;
    const miloRight = this.milo.x + this.miloHalfW;

    for (let i = this.treats.length - 1; i >= 0; i -= 1) {
      const t = this.treats[i];
      if (this.magnetMs > 0 && ["bone", "goldenBone", "coin", "gem"].includes(t.type.key)) {
        const dx = this.milo.x - t.x;
        const dy = this.milo.y - t.y;
        if (Math.hypot(dx, dy) < 125) {
          t.x += dx * 3.5 * dt;
          t.y += dy * 2.5 * dt;
        }
      }
      t.y += t.vy * dt;
      t.sprite.x = t.x;
      t.sprite.y = t.y;
      t.sprite.rotation += dt * 1.4;

      const hit =
        t.x + t.radius >= miloLeft &&
        t.x - t.radius <= miloRight &&
        t.y + t.radius >= miloTop &&
        t.y - t.radius <= miloBottom;
      if (hit) {
        this.handleCatch(i);
        continue;
      }
      if (t.y - t.radius > HEIGHT - 18) this.handleMiss(i);
    }
  }

  handleCatch(index) {
    const item = this.treats[index];
    item.sprite.destroy();
    this.treats.splice(index, 1);

    if (item.type.key === "chocolate") {
      this.popText("NO CHOCOLATE!", this.milo.x, this.milo.y - 62, "#ffb7a8");
      this.endGame("Chocolate is dangerous for dogs!");
      return;
    }

    if (item.type.key === "fish") {
      this.combo = 0;
      this.lives -= 1;
      this.popText("-1 LIFE", this.milo.x, this.milo.y - 62, "#ffb7a8");
      this.cameras.main.shake(120, 0.009);
      if (this.lives <= 0) this.endGame("Rotten fish ended the run.");
      return;
    }

    this.combo += 1;
    this.fever = Math.min(100, this.fever + 8 + Math.min(this.combo, 15));
    if (this.combo >= 5 && this.fever >= 100) this.feverActiveMs = 6500;
    if (this.combo === 15) this.goldenRain();

    let label = item.type.label;
    if (item.type.points) {
      const multiplier = (this.feverActiveMs > 0 ? 2 : 1) + this.playerData.upgrades.scoreMultiplier * 0.15;
      const points = Math.round(item.type.points * multiplier);
      this.score += points;
      label = `+${points}`;
    } else if (item.type.key === "tennis") {
      this.speedBoostMs = 5200;
      label = "SPEED!";
    } else if (item.type.key === "toy") {
      this.magnetMs = 6200 + this.playerData.upgrades.magnet * 600;
      label = "MAGNET!";
    } else if (item.type.key === "coin") {
      this.runCoins += 1;
      label = "+1 COIN";
    } else if (item.type.key === "gem") {
      this.runGems += 1;
      label = "+1 GEM";
    }

    this.popText(label, item.x, item.y, item.type.rare ? "#fff06a" : "#ffffff");
    this.barkEffect();
    this.emitSparkles(item.x, item.y, item.type.rare ? 0xffe04f : 0xffffff);
    if (item.type.rare || this.combo % 5 === 0) this.cameras.main.shake(80, 0.004);
  }

  handleMiss(index) {
    const item = this.treats[index];
    item.sprite.destroy();
    this.treats.splice(index, 1);
    if (["fish", "chocolate"].includes(item.type.key)) return;
    this.combo = 0;
    this.fever = Math.max(0, this.fever - 20);
    this.lives -= 1;
    this.popText("MISS", item.x, HEIGHT - 48, "#ffcbc1");
    if (this.lives <= 0) this.endGame("Milo missed too many treats.");
  }

  goldenRain() {
    for (let i = 0; i < 5; i += 1) {
      this.time.delayedCall(i * 90, () => this.spawnItem(ITEM_TYPES.find((item) => item.key === "goldenBone")));
    }
    this.popText("GOLDEN RAIN!", WIDTH / 2, 112, "#fff06a", 24);
  }

  barkEffect() {
    this.tweens.add({ targets: this.milo, y: this.milo.y - 10, duration: 80, yoyo: true, ease: "Quad.easeOut" });
    const bark = this.add.text(this.milo.x + 28, this.milo.y - 58, "BARK!", {
      fontFamily: "Verdana",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#173455",
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.worldRoot.add(bark);
    this.tweens.add({ targets: bark, y: bark.y - 18, alpha: 0, duration: 360, onComplete: () => bark.destroy() });
  }

  emitSparkles(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.9);
      this.worldRoot.add(dot);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-28, 28),
        y: y + Phaser.Math.Between(-34, 18),
        alpha: 0,
        duration: 420,
        ease: "Sine.easeOut",
        onComplete: () => dot.destroy(),
      });
    }
  }

  popText(label, x, y, color, size = 18) {
    const text = this.add.text(x, y, label, {
      fontFamily: "Verdana",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#173455",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.worldRoot.add(text);
    this.tweens.add({
      targets: text,
      y: y - 34,
      scale: 1.25,
      alpha: 0,
      duration: 520,
      ease: "Back.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  refreshGameplayHud() {
    if (!this.scoreText) return;
    this.scoreText.setText(String(this.score));
    this.comboText.setText(this.feverActiveMs > 0 ? `FEVER x${this.combo}` : `x${this.combo}`);
    this.livesText.setText("♥ ".repeat(Math.max(0, this.lives)).trim());
    this.feverFill.width = Math.max(0, Math.min(296, (this.fever / 100) * 296));
    this.feverFill.fillColor = this.feverActiveMs > 0 ? 0xff8f2d : 0xffd92d;
  }

  endGame(reason) {
    this.setMode("gameover");
    this.clearTreats();
    const earnedCoins = Math.max(this.runCoins, Math.floor(this.score / 100));
    const earnedXp = Math.max(10, Math.floor(this.score / 12));
    this.playerData.coins += earnedCoins;
    this.playerData.gems += this.runGems;
    this.playerData.xp += earnedXp;
    while (this.playerData.xp >= 1500) {
      this.playerData.xp -= 1500;
      this.playerData.level += 1;
      if (this.playerData.level >= 5 && !this.playerData.unlockedDogs.includes("Labrador")) {
        this.playerData.unlockedDogs.push("Labrador");
      }
      if (this.playerData.level >= 10 && !this.playerData.unlockedDogs.includes("Shiba Inu")) {
        this.playerData.unlockedDogs.push("Shiba Inu");
      }
    }
    this.playerData.highScore = Math.max(this.playerData.highScore, this.score);
    this.saveProgress();

    this.clearLayer(this.hudRoot);
    this.clearLayer(this.screenRoot);
    this.screenRoot.add(this.createPanel(34, 146, 292, 330, 0x173455, 18, 0xffd16b));
    this.addOutlinedText(this.screenRoot, 180, 188, "GAME OVER", 30, "#ffffff", 0x091b2e).setOrigin(0.5);
    this.addOutlinedText(this.screenRoot, 180, 232, reason || "Treat storm complete.", 14, "#ffe9b5", 0x091b2e).setOrigin(0.5);
    this.addOutlinedText(this.screenRoot, 180, 282, this.score.toLocaleString(), 44, "#ffffff", 0x091b2e).setOrigin(0.5);
    this.addOutlinedText(this.screenRoot, 180, 326, `+${earnedCoins} coins   +${earnedXp} xp`, 18, "#ffdf3f", 0x091b2e).setOrigin(0.5);
    const retry = this.createBigButton(70, 370, 220, 48, "PLAY AGAIN", 22, 0xffc928, 0xd27700);
    retry.on("pointerup", () => this.startGame());
    this.screenRoot.add(retry);
    const home = this.createSmallButton(114, 426, 132, 34, "HOME", 0x22a8ee);
    home.on("pointerup", () => this.showHome());
    this.screenRoot.add(home);
  }

  createPanel(x, y, w, h, color, radius, stroke = 0xffffff) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(x + 3, y + 5, w, h, radius);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(2, stroke, 0.85);
    g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, radius);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(x + 6, y + 5, Math.max(0, w - 12), Math.max(6, h * 0.26), Math.max(4, radius - 5));
    return g;
  }

  createBigButton(x, y, w, h, label, size, color, stroke) {
    const button = this.add
      .container(x + w / 2, y + h / 2)
      .setSize(w, h)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = "pointer";
    button.add(this.createPanel(-w / 2, -h / 2, w, h, color, 18, stroke));
    button.add(this.add.text(0, 1, label, {
      fontFamily: "Verdana",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#8a3b00",
      strokeThickness: 5,
    }).setOrigin(0.5));
    button.on("pointerdown", () => this.tweens.add({ targets: button, scale: 0.94, duration: 70, yoyo: true }));
    return button;
  }

  createSmallButton(x, y, w, h, label, color) {
    const button = this.add
      .container(x + w / 2, y + h / 2)
      .setSize(w, h)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = "pointer";
    button.add(this.createPanel(-w / 2, -h / 2, w, h, color, 12, 0xffffff));
    button.add(this.add.text(0, 0, label, {
      fontFamily: "Verdana",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#173455",
      strokeThickness: 3,
    }).setOrigin(0.5));
    return button;
  }

  createCircleButton(x, y, radius, color, label, size = 20) {
    const button = this.add.container(x, y).setSize(radius * 2, radius * 2).setInteractive({ useHandCursor: true });
    button.add(this.add.circle(3, 4, radius, 0x000000, 0.16));
    button.add(this.add.circle(0, 0, radius, color).setStrokeStyle(2, 0xffffff, 0.75));
    button.add(this.add.text(0, -1, label, {
      fontFamily: "Verdana",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#132133",
      strokeThickness: 3,
    }).setOrigin(0.5));
    return button;
  }

  createDogContainer(x, y, scale, breed) {
    const textureKey = DOG_TEXTURES[breed];
    if (textureKey && this.textures.exists(textureKey)) {
      const dog = this.add.container(x, y);
      const shadow = this.add.ellipse(0, 50 * scale, 112 * scale, 24 * scale, 0x000000, 0.18);
      const image = this.add.image(0, 0, textureKey);
      image.setDisplaySize(image.width * ((142 * scale) / image.height), 142 * scale);
      image.setOrigin(0.5, 0.62);
      dog.add([shadow, image]);
      dog.setData("assetDog", true);
      return dog;
    }

    const p = DOG_PALETTES[breed] || DOG_PALETTES["Golden Retriever"];
    const dog = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 54, 116, 24, 0x000000, 0.18);
    const body = this.add.ellipse(0, 22, 92, 104, p.body);
    const chest = this.add.ellipse(0, 34, 44, 64, p.face, 0.58);
    const head = this.add.circle(0, -42, 48, p.face);
    const earL = this.add.ellipse(-38, -44, 26, 64, p.ear).setRotation(-0.28);
    const earR = this.add.ellipse(38, -44, 26, 64, p.ear).setRotation(0.28);
    const muzzle = this.add.ellipse(0, -26, 36, 24, 0xffdeb0);
    const eyeL = this.add.circle(-15, -48, 8, 0xffffff);
    const eyeR = this.add.circle(15, -48, 8, 0xffffff);
    const pupilL = this.add.circle(-13, -47, 4, 0x1b120d);
    const pupilR = this.add.circle(13, -47, 4, 0x1b120d);
    const nose = this.add.ellipse(0, -31, 12, 8, 0x2a1710);
    const tongue = this.add.ellipse(0, -14, 16, 24, 0xff697a);
    const collar = this.add.rectangle(0, 3, 60, 9, p.collar);
    const tag = this.add.circle(0, 11, 8, 0xffd33b).setStrokeStyle(2, 0x9a6200);
    dog.add([shadow, body, chest, earL, earR, head, muzzle, eyeL, eyeR, pupilL, pupilR, nose, tongue, collar, tag]);
    dog.setScale(scale);
    return dog;
  }

  addDogPortrait(target, x, y, scale, breed) {
    const portrait = this.createDogContainer(x, y + 18, scale, breed);
    target.add(portrait);
    return portrait;
  }

  addDogHouse(target, x, y, scale) {
    const house = this.add.container(x, y).setScale(scale);
    house.add(this.add.rectangle(0, 28, 82, 70, 0x75b646).setStrokeStyle(3, 0x3b7228));
    house.add(this.add.triangle(0, -18, -50, 20, 50, 20, 0xc8462d).setStrokeStyle(3, 0x8d2b20));
    house.add(this.add.ellipse(0, 44, 36, 48, 0x3b2215));
    house.add(this.add.circle(0, 5, 12, 0x6a3a20));
    target.add(house);
  }

  addTreatBowl(target, x, y) {
    const bowl = this.add.container(x, y);
    bowl.add(this.add.ellipse(0, 14, 78, 26, 0x9d241f));
    bowl.add(this.add.rectangle(0, 0, 72, 24, 0xe44532));
    bowl.add(this.add.ellipse(0, -12, 72, 24, 0xff6a3a));
    bowl.add(this.add.circle(-16, -15, 8, 0xd79b47));
    bowl.add(this.add.circle(6, -16, 7, 0xd79b47));
    bowl.add(this.add.circle(22, -13, 8, 0xd79b47));
    target.add(bowl);
  }

  createItemSprite(x, y, type) {
    const c = this.add.container(x, y);
    const s = type.size;
    if (type.rare) {
      c.add(this.add.circle(0, 0, s * 0.75, 0xfff36a, 0.25));
      this.tweens.add({ targets: c, scale: 1.12, duration: 360, yoyo: true, repeat: -1 });
    }
    if (type.key.includes("Bone")) this.addBoneShape(c, 0, 0, s, type.color, type.stroke);
    else if (type.key === "fish") this.addFishShape(c, 0, 0, s, type.color, type.stroke);
    else if (type.key === "tennis") this.addBallShape(c, 0, 0, s, type.color, type.stroke);
    else if (type.key === "toy") this.addToyShape(c, 0, 0, s, type.color, type.stroke);
    else if (type.key === "chocolate") this.addChocolateShape(c, 0, 0, s, type.color, type.stroke);
    else if (type.key === "coin") this.addCoinIcon(c, 0, 0, s / 2);
    else this.addGemIcon(c, 0, 0, s / 2);
    return c;
  }

  addBoneShape(target, x, y, s, color, stroke) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.lineStyle(2, stroke, 1);
    g.fillRoundedRect(x - s * 0.42, y - s * 0.16, s * 0.84, s * 0.32, s * 0.16);
    g.strokeRoundedRect(x - s * 0.42, y - s * 0.16, s * 0.84, s * 0.32, s * 0.16);
    [[-0.45, -0.22], [-0.45, 0.22], [0.45, -0.22], [0.45, 0.22]].forEach(([dx, dy]) => {
      g.fillCircle(x + dx * s, y + dy * s, s * 0.18);
      g.strokeCircle(x + dx * s, y + dy * s, s * 0.18);
    });
    target.add(g);
  }

  addBallShape(target, x, y, s, color, stroke) {
    target.add(this.add.circle(x, y, s / 2, color).setStrokeStyle(2, stroke));
    const line = this.add.graphics();
    line.lineStyle(2, 0xffffff, 0.9);
    line.beginPath();
    line.arc(x - s * 0.1, y, s * 0.33, -1.2, 1.2);
    line.strokePath();
    target.add(line);
  }

  addFishShape(target, x, y, s, color, stroke) {
    target.add(this.add.ellipse(x, y, s * 0.75, s * 0.42, color).setStrokeStyle(2, stroke));
    target.add(this.add.triangle(x + s * 0.38, y, 0, 0, s * 0.32, -s * 0.24, s * 0.32, s * 0.24, color).setStrokeStyle(2, stroke));
    target.add(this.add.circle(x - s * 0.2, y - 2, 2, 0x132133));
  }

  addToyShape(target, x, y, s, color, stroke) {
    target.add(this.add.rectangle(x, y, s * 0.72, s * 0.48, color).setStrokeStyle(2, stroke));
    target.add(this.add.circle(x - s * 0.36, y, s * 0.2, 0xffe066).setStrokeStyle(2, stroke));
    target.add(this.add.circle(x + s * 0.36, y, s * 0.2, 0xffe066).setStrokeStyle(2, stroke));
  }

  addChocolateShape(target, x, y, s, color, stroke) {
    target.add(this.add.rectangle(x, y, s * 0.7, s * 0.56, color).setStrokeStyle(2, stroke));
    for (let ix = -1; ix <= 1; ix += 2) {
      for (let iy = -1; iy <= 1; iy += 2) target.add(this.add.rectangle(x + ix * s * 0.15, y + iy * s * 0.12, s * 0.18, s * 0.14, 0x8b5733));
    }
  }

  addCoinIcon(target, x, y, r) {
    target.add(this.add.circle(x, y, r, 0xffc329).setStrokeStyle(2, 0xb86e00));
    target.add(this.add.star(x, y, 5, r * 0.32, r * 0.62, 0xfff07d));
  }

  addGemIcon(target, x, y, r) {
    target.add(this.add.polygon(x, y, [[0, -r], [r, -r * 0.2], [r * 0.55, r], [-r * 0.55, r], [-r, -r * 0.2]], 0xc846ff).setStrokeStyle(2, 0x6c2194));
  }

  addTrophyIcon(target, x, y, scale) {
    const trophy = this.add.container(x, y).setScale(scale);
    trophy.add(this.add.rectangle(0, 0, 34, 26, 0xffc329).setStrokeStyle(3, 0xb86e00));
    trophy.add(this.add.rectangle(0, 22, 10, 18, 0xffc329).setStrokeStyle(2, 0xb86e00));
    trophy.add(this.add.rectangle(0, 36, 34, 8, 0xffc329).setStrokeStyle(2, 0xb86e00));
    trophy.add(this.add.circle(-22, 2, 12, 0xffc329, 0.75).setStrokeStyle(3, 0xb86e00));
    trophy.add(this.add.circle(22, 2, 12, 0xffc329, 0.75).setStrokeStyle(3, 0xb86e00));
    target.add(trophy);
  }

  addSpinWheel(x, y) {
    const wheel = this.add.container(x, y);
    const colors = [0xffd331, 0x22a8ee, 0xf44345, 0x75ca38, 0x9a5cff, 0xff8c2d];
    for (let i = 0; i < 6; i += 1) {
      const slice = this.add.triangle(0, 0, 0, 0, 65, -18, 65, 18, colors[i]).setRotation((Math.PI * 2 * i) / 6);
      wheel.add(slice);
    }
    wheel.add(this.add.circle(0, 0, 68, 0xffffff, 0).setStrokeStyle(5, 0xffdf63));
    wheel.add(this.add.circle(0, 0, 12, 0xffffff).setStrokeStyle(3, 0x173455));
    this.screenRoot.add(wheel);
    this.tweens.add({ targets: wheel, rotation: Math.PI * 2, duration: 6000, repeat: -1 });
  }

  addIcon(target, icon, x, y, scale) {
    const holder = this.add.container(x, y).setScale(scale);
    if (icon === "gift") {
      holder.add(this.add.rectangle(0, 8, 42, 34, 0xf3319e).setStrokeStyle(3, 0xffdf63));
      holder.add(this.add.rectangle(0, 8, 8, 38, 0xffdf63));
      holder.add(this.add.rectangle(0, -8, 48, 10, 0xffdf63));
    } else if (icon === "trophy") this.addTrophyIcon(holder, 0, 0, 0.8);
    else if (icon === "dog") this.addDogPortrait(holder, 0, 4, 0.32, this.playerData.selectedDog);
    else if (icon === "shop") {
      holder.add(this.add.rectangle(0, 8, 44, 30, 0x189ce4).setStrokeStyle(3, 0x084f91));
      holder.add(this.add.rectangle(0, -10, 50, 16, 0xf04b45).setStrokeStyle(3, 0x98271e));
    } else if (icon === "spin") {
      holder.add(this.add.circle(0, 0, 26, 0xffdf63).setStrokeStyle(3, 0x173455));
      holder.add(this.add.circle(0, 0, 8, 0xffffff).setStrokeStyle(2, 0x173455));
    } else if (icon === "missions") {
      holder.add(this.add.rectangle(0, 3, 34, 44, 0xffffff).setStrokeStyle(3, 0x5e5e5e));
      holder.add(this.add.rectangle(0, -20, 20, 8, 0xb6b6b6).setStrokeStyle(2, 0x5e5e5e));
    } else if (icon === "medal") {
      holder.add(this.add.circle(0, 0, 24, 0xffc329).setStrokeStyle(3, 0xb86e00));
      holder.add(this.add.star(0, 0, 5, 8, 15, 0xfff07d));
    } else if (icon === "shield") {
      holder.add(this.add.polygon(0, 0, [[0, -25], [24, -12], [18, 22], [0, 32], [-18, 22], [-24, -12]], 0x44b761).setStrokeStyle(3, 0xffffff));
    } else if (icon === "collar") {
      holder.add(this.add.ellipse(0, 0, 48, 28, 0xe95837).setStrokeStyle(4, 0x6c2b1d));
      holder.add(this.add.rectangle(8, -8, 14, 12, 0xffd331).setStrokeStyle(2, 0x6c2b1d));
    } else if (icon === "map") {
      holder.add(this.add.rectangle(0, 0, 48, 34, 0xdff3db).setStrokeStyle(3, 0xffffff));
      holder.add(this.add.circle(8, -4, 10, 0xf44345).setStrokeStyle(2, 0x173455));
    }
    target.add(holder);
  }

  addOutlinedText(target, x, y, text, size, color, stroke) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Verdana",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: Phaser.Display.Color.IntegerToColor(stroke).rgba,
      strokeThickness: Math.max(3, Math.floor(size / 5)),
      shadow: { offsetX: 1, offsetY: 2, color: "#000000", blur: 0, fill: true },
    });
    target.add(label);
    return label;
  }

  addProgressBar(target, x, y, w, h, percent, color) {
    target.add(this.add.rectangle(x, y, w, h, 0x0c1e32).setOrigin(0, 0).setStrokeStyle(2, 0x8d5c2a));
    target.add(this.add.rectangle(x + 2, y + 2, Math.max(0, (w - 4) * Phaser.Math.Clamp(percent, 0, 1)), h - 4, color).setOrigin(0, 0));
  }

  hudTextStyle(size, color = "#ffffff") {
    return {
      fontFamily: "Verdana",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#091b2e",
      strokeThickness: 3,
    };
  }

  clearTreats() {
    for (const t of this.treats) if (t.sprite) t.sprite.destroy();
    this.treats.length = 0;
  }

  renderGameToText() {
    return JSON.stringify({
      coordinateSystem: "origin top-left; +x right; +y down; pixels",
      mode: this.mode,
      score: this.score,
      combo: this.combo,
      lives: this.lives,
      fever: Number(this.fever.toFixed(1)),
      feverActiveMs: Number(this.feverActiveMs.toFixed(1)),
      speedBoostMs: Number(this.speedBoostMs.toFixed(1)),
      magnetMs: Number(this.magnetMs.toFixed(1)),
      playerData: {
        coins: this.playerData.coins,
        gems: this.playerData.gems,
        level: this.playerData.level,
        xp: this.playerData.xp,
        highScore: this.playerData.highScore,
        selectedDog: this.playerData.selectedDog,
        unlockedDogs: this.playerData.unlockedDogs,
        upgrades: this.playerData.upgrades,
      },
      player: this.milo
        ? {
            x: Number(this.milo.x.toFixed(1)),
            y: Number(this.milo.y.toFixed(1)),
            targetX: Number(this.miloTargetX.toFixed(1)),
            width: this.miloHalfW * 2,
          }
        : null,
      treats: this.treats.map((t) => ({
        kind: t.type.key,
        label: t.type.label,
        x: Number(t.x.toFixed(1)),
        y: Number(t.y.toFixed(1)),
        radius: t.radius,
        vy: Number(t.vy.toFixed(1)),
        points: t.type.points || 0,
      })),
      pacing: {
        spawnDelayMs: Number(this.nextSpawnDelay.toFixed(1)),
        elapsedMs: Number(this.elapsedMs.toFixed(1)),
      },
    });
  }

  advanceTime(ms) {
    if (this.mode !== "playing") {
      if (this.mode === "home" || this.mode === "gameover") this.startGame();
      return;
    }
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) this.stepGame(1 / 60);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-host",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#9bdfff",
  scene: [MiloTreatRushScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

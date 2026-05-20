import * as Phaser from 'phaser';
import { state } from '../utils/StateManager.js';
import { audioManager } from './AudioManager.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data) {
    this.chapterId = data.chapterId;
    this.character = data.character || 'male';
    this.control = data.control || 'keyboard';
    this.isPracticeTutorial = data.isPracticeTutorial || false;
    this.isInfMode = data.isEndless || data.isInfMode || false;
    this.elapsed = 0;
  }

  create() {
    const { width, height } = this.scale;

    // ========== PRACTICE TUTORIAL: Simplified layout ==========
    if (this.isPracticeTutorial) {
      this._createPracticeTutorialLayout(width, height);
      return;
    }

    // ========== REGULAR GAME: Full layout with side panel ==========
    const settings = state.get('settings');
    this.panelPosition = settings?.display?.panelPosition || 'left';
    this.isPanelRight = this.panelPosition === 'right';

    const panelWidth = Math.max(width < 768 ? 160 : 250, Math.min(450, width * 0.28));
    this.panelWidth = panelWidth;

    // Calculate positions based on panel side
    const panelX = this.isPanelRight ? width - panelWidth : 0;
    const panelEdgeX = this.isPanelRight ? width - panelWidth : panelWidth;
    const gameAreaX = this.isPanelRight ? 0 : panelWidth;

    // ========== SIDE PANEL BACKGROUND ==========
    this.panelBg = this.add.image(panelX, 0, 'left_panel_bg');
    this.panelBg.setOrigin(0, 0);
    this.panelBg.setDisplaySize(panelWidth, height);
    this.panelBg.setDepth(0);

    // Panel divider line (keep for visual separation)
    this.panelDivider = this.add.graphics();
    this.panelDivider.lineStyle(4, 0x201c11, 1);
    this.panelDivider.beginPath();
    this.panelDivider.moveTo(panelEdgeX, 0);
    this.panelDivider.lineTo(panelEdgeX, height);
    this.panelDivider.strokePath();

    // Panel position indicator (small label at bottom corner)
    const positionLabelX = this.isPanelRight ? width - 8 : 8;
    this.panelPositionLabel = this.add.text(positionLabelX, height - 20, `PANEL: ${this.panelPosition.toUpperCase()}`, {
      fontFamily: 'VCR', fontSize: '10px', color: '#666'
    }).setOrigin(this.isPanelRight ? 1 : 0, 0.5).setDepth(1);

    // ========== TOP BAR (moved to top of Grid panel) ==========
    const topBarX = gameAreaX + 40;
    const topBarY = 28;

    // Scale top-bar text based on available width
    const isSmall = width < 600;
    const pauseFontSize = isSmall ? '16px' : '24px';
    const labelFontSize = isSmall ? '11px' : '16px';
    const valueFontSize = isSmall ? '18px' : '26px';
    const heartScale   = isSmall ? 1.8 : 3.0;
    const heartSpacing = isSmall ? 24 : 36;

    // In INF mode squeeze 4 columns into the top bar; in normal mode keep 2
    const gameAreaW = width - panelWidth;
    // Hearts occupy ~(heartSpacing*3 + margin) on the right
    const heartsW = heartSpacing * 3 + (isSmall ? 20 : 60);
    const usableW = gameAreaW - heartsW - (isSmall ? 80 : 120); // space after topBarX offset
    const cols = this.isInfMode ? 4 : 2;
    const colStep = Math.floor(usableW / cols);
    const timeOffsetX  = isSmall ? 60 : 80;
    const scoreOffsetX = timeOffsetX + colStep;
    const waveOffsetX  = scoreOffsetX + colStep;
    const speedOffsetX = waveOffsetX + colStep;

    // TIME
    this.add.text(topBarX + timeOffsetX, topBarY - 12, 'TIME:', {
      fontFamily: 'VCR', fontSize: labelFontSize, color: '#a89b8c'
    }).setDepth(20);
    this.timerText = this.add.text(topBarX + timeOffsetX, topBarY + 6, '00:00', {
      fontFamily: 'VCR', fontSize: valueFontSize, color: '#f0e6d3'
    }).setDepth(20);

    // Score
    this.add.text(topBarX + scoreOffsetX, topBarY - 12, 'SCORE:', {
      fontFamily: 'VCR', fontSize: labelFontSize, color: '#a89b8c'
    }).setDepth(20);
    this.scoreText = this.add.text(topBarX + scoreOffsetX, topBarY + 6, '0', {
      fontFamily: 'VCR', fontSize: valueFontSize, color: '#ffd700'
    }).setDepth(20);

    // WAVE + COMBO — INF/Endless mode only, in top bar
    if (this.isInfMode) {
      this.add.text(topBarX + waveOffsetX, topBarY - 12, 'WAVE:', {
        fontFamily: 'VCR', fontSize: labelFontSize, color: '#a89b8c'
      }).setDepth(20);
      this.infWaveText = this.add.text(topBarX + waveOffsetX, topBarY + 6, '0', {
        fontFamily: 'VCR', fontSize: valueFontSize, color: '#00cfff'
      }).setDepth(20);

      this.add.text(topBarX + speedOffsetX, topBarY - 12, 'COMBO:', {
        fontFamily: 'VCR', fontSize: labelFontSize, color: '#a89b8c'
      }).setDepth(20);
      this.infComboText = this.add.text(topBarX + speedOffsetX, topBarY + 6, '1.0x', {
        fontFamily: 'VCR', fontSize: valueFontSize, color: '#ff9900'
      }).setDepth(20);
    }

    // Hearts (top-right of game area, consistent regardless of panel position)
    this.hearts = [];
    const heartStartX = gameAreaX + gameAreaW - (isSmall ? 20 : 60) - (2 * heartSpacing);
    for (let i = 0; i < 3; i++) {
      const heart = this.add.sprite(heartStartX + (i * heartSpacing), topBarY + 6, 'ui_buttons', 147);
      heart.setScale(heartScale).setOrigin(0.5, 0.5).setDepth(20);
      this.hearts.push(heart);
    }

    // ========== BOSS DISPLAY BOX ==========
    const boxPadX = 24;
    const bossBoxW = panelWidth - boxPadX * 2;
    // When panel is on right, we need to adjust the X position
    const bossBoxBaseX = this.isPanelRight ? panelX + boxPadX : boxPadX;

    // Chapter Title and description headers
    let bossName = `CHAPTER ${this.chapterId}`;
    let bossTitle = "";

    if (this.isInfMode) {
      // Endless mode: show chapter-specific endless title
      const chapterBossName = this.chapterId === 1 ? 'MANANANGGAL' : this.chapterId === 2 ? 'BUNGISNGIS' : 'KATAW';
      bossName = `CHAPTER ${this.chapterId}`;
      bossTitle = `${chapterBossName} ENDLESS MODE`;
    } else if (this.chapterId == 1) {
      bossName = "SI IMELDA";
      bossTitle = "ANG UNANG MANANANGGAL";
    } else if (this.chapterId == 2) {
      bossName = "BUNGISNGIS";
      bossTitle = "ANG HIGANTENG SIKLOP";
    } else if (this.chapterId == 3) {
      bossName = "KATAW";
      bossTitle = "ABYSSAL SIREN";
    }

    // Scale boss name/subtitle to fit bossBoxW (actual usable text width) - BIGGER sizes
    const bossNamePx    = bossBoxW < 160 ? 18 : bossBoxW < 200 ? 24 : bossBoxW < 250 ? 28 : 34;
    const bossTitlePx   = bossBoxW < 160 ? 12 : bossBoxW < 200 ? 14 : bossBoxW < 250 ? 16 : 18;
    const bossNameSize  = `${bossNamePx}px`;
    const bossTitleSize = `${bossTitlePx}px`;

    // Stack from top bar: name → subtitle → hp bar → boss box (with padding)
    const textGap   = 8;
    const bossNameY = topBarY + 35;                              // just below top bar
    const bossTitleY = bossNameY + bossNamePx + textGap;
    const hpBarY     = bossTitleY + bossTitlePx + textGap + 8;  // +8 extra gap before HP bar
    const bossBoxY   = hpBarY + 28 + 12;                       // 28 = hp bar height, 12 = gap before frame

    const remainingHeight = height - bossBoxY;
    // On small screens give the boss box less room so camera/dpad fits
    const bossBoxRatio = height < 500 ? 0.28 : height < 650 ? 0.32 : 0.38;
    const bossBoxH = Math.floor(remainingHeight * bossBoxRatio);

    // Border only (background is now the panel image)
    const bossBoxBorder = this.add.graphics();
    bossBoxBorder.lineStyle(3, 0x100c04, 1);
    bossBoxBorder.strokeRect(bossBoxBaseX, bossBoxY, bossBoxW, bossBoxH);

    // Main Title (Giga Saturn) - CENTERED
    this.add.text(bossBoxBaseX + bossBoxW / 2, bossNameY, bossName, {
      fontFamily: 'GigaSaturn', fontSize: bossNameSize, color: '#ffd700', align: 'center',
      wordWrap: { width: bossBoxW, useAdvancedWrap: true }
    }).setOrigin(0.5, 0);

    // Subtitle - CENTERED
    this.add.text(bossBoxBaseX + bossBoxW / 2, bossTitleY, bossTitle, {
      fontFamily: 'VCR', fontSize: bossTitleSize, color: '#f0e6d3', align: 'center',
      wordWrap: { width: bossBoxW, useAdvancedWrap: true }
    }).setOrigin(0.5, 0);

    // *** BOSS ANIMATED SPRITE — rendered HERE in HUDScene so it's visible ***
    // The boss_idle and boss_ult_attack spritesheets were loaded by GameScene.
    const bossCenterX = bossBoxBaseX + bossBoxW / 2;
    const bossCenterY = bossBoxY + bossBoxH / 2;

    // Chapter checks
    const isCh1 = this.chapterId === 1;
    const isCh2 = this.chapterId === 2;
    const isCh3 = this.chapterId === 3;

    // Create boss animations + sprite + HP bar (shown in all modes)
    if (!this.anims.exists('anim_boss_idle')) {
      this.anims.create({
        key: 'anim_boss_idle',
        frames: isCh1 ? this.anims.generateFrameNumbers('boss_idle', { start: 0, end: 54 })
                      : isCh2 ? this.anims.generateFrameNumbers('boss_idle', { start: 0, end: 24 })
                      : isCh3 ? this.anims.generateFrameNumbers('boss_idle', { start: 0, end: 33 })
                      : this.anims.generateFrameNumbers('boss_idle'),
        frameRate: 24,
        repeat: -1
      });
      if (!isCh1 && !isCh2 && !isCh3) {
        this.anims.create({
          key: 'anim_boss_attack',
          frames: this.anims.generateFrameNumbers('boss_cast'),
          frameRate: 10,
          repeat: 0
        });
      }
    }
    // Create chapter-specific ult attack animations (check individually)
    if (isCh1 && !this.anims.exists('anim_boss_ult_attack')) {
      this.anims.create({
        key: 'anim_boss_ult_attack',
        frames: this.anims.generateFrameNumbers('boss_ult_attack', { start: 0, end: 56 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (isCh2 && !this.anims.exists('anim_boss_ch2_ult_attack')) {
      this.anims.create({
        key: 'anim_boss_ch2_ult_attack',
        frames: this.anims.generateFrameNumbers('boss_ch2_ult_attack', { start: 0, end: 35 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (isCh3 && !this.anims.exists('anim_boss_ch3_ult_attack')) {
      this.anims.create({
        key: 'anim_boss_ch3_ult_attack',
        frames: this.anims.generateFrameNumbers('boss_ch3_ult_attack', { start: 0, end: 29 }),
        frameRate: 12,
        repeat: 0
      });
    }

    // Create boss sprite with fallback if texture fails to load
    let hasBossTexture = this.textures.exists('boss_idle');
    if (hasBossTexture) {
      this.bossSprite = this.add.sprite(bossCenterX, bossCenterY, 'boss_idle');
    } else {
      console.warn('[HUDScene] boss_idle texture not found, creating placeholder');
      this.bossSprite = this.add.rectangle(bossCenterX, bossCenterY, bossBoxW - 20, bossBoxH - 20, 0x444444);

      // Listen for texture load to replace placeholder
      this.textures.on('add', (key) => {
        if (key === 'boss_idle' && this.bossSprite && this.bossSprite.type === 'Rectangle') {
          this.bossSprite.destroy();
          this.bossSprite = this.add.sprite(bossCenterX, bossCenterY, 'boss_idle');
          this.bossSprite.setOrigin(0.5, 0.5);
          updateBossScale();
          if (this.anims.exists('anim_boss_idle')) {
            this.bossSprite.play('anim_boss_idle');
          }
        }
      });
    }
    this.bossSprite.setOrigin(0.5, 0.5);

    const updateBossScale = () => {
      if (!this.bossSprite || !this.bossSprite.setScale) return;
      const w = this.bossSprite.width || 122;
      const h = this.bossSprite.height || 110;
      const fitScale = Math.min((bossBoxW - 10) / w, (bossBoxH - 10) / h);
      this.bossSprite.setScale(fitScale);
    };

    updateBossScale();

    // Only register animation events if bossSprite supports them (not a placeholder)
    if (hasBossTexture && this.bossSprite.on) {
      // Revert to idle after attacking (ch2+)
      this.bossSprite.on('animationcomplete-anim_boss_attack', () => {
        if (hasBossTexture && this.bossSprite.setTexture) this.bossSprite.setTexture('boss_idle');
        updateBossScale();
        if (hasBossTexture && this.anims.exists('anim_boss_idle') && this.bossSprite.play) this.bossSprite.play('anim_boss_idle');
      });

      // Revert to idle after ult attack (ch1)
      this.bossSprite.on('animationcomplete-anim_boss_ult_attack', () => {
        if (hasBossTexture && this.bossSprite.setTexture) this.bossSprite.setTexture('boss_idle');
        updateBossScale();
        if (hasBossTexture && this.anims.exists('anim_boss_idle') && this.bossSprite.play) this.bossSprite.play('anim_boss_idle');
      });

      // Revert to idle after ult attack (ch2)
      this.bossSprite.on('animationcomplete-anim_boss_ch2_ult_attack', () => {
        if (hasBossTexture && this.bossSprite.setTexture) this.bossSprite.setTexture('boss_idle');
        updateBossScale();
        if (hasBossTexture && this.anims.exists('anim_boss_idle') && this.bossSprite.play) this.bossSprite.play('anim_boss_idle');
      });

      // Revert to idle after ult attack (ch3)
      this.bossSprite.on('animationcomplete-anim_boss_ch3_ult_attack', () => {
        if (hasBossTexture && this.bossSprite.setTexture) this.bossSprite.setTexture('boss_idle');
        updateBossScale();
        if (hasBossTexture && this.anims.exists('anim_boss_idle') && this.bossSprite.play) this.bossSprite.play('anim_boss_idle');
      });
    }

    // Play animation only if it exists and sprite supports it
    if (hasBossTexture && this.anims.exists('anim_boss_idle') && this.bossSprite.play) {
      this.bossSprite.play('anim_boss_idle');
    }

    // DEBUG ATTACK BUTTONS — admin accounts only (verified via /admin/check)
    fetch('/admin/check', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { isAdmin: false })
      .then(data => { if (data && data.isAdmin) this._buildAdminDebugButtons(); })
      .catch(() => {});

    // TEMPORARY DEBUG BUTTON FOR CHAPTER 2 SEQUENTIAL ATTACKS
    const gameSceneRef = this.scene.get('GameScene');
    if (false && this.chapterId === 2 && gameSceneRef && gameSceneRef._isAdminTest) {
      const debugBtn = this.add.text(this.scale.width / 2, 20, 'DEBUG: RUN ALL CH2 ATTACKS', {
        backgroundColor: '#f00',
        color: '#fff',
        fontFamily: 'VCR',
        fontSize: '20px',
        padding: { x: 10, y: 10 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      debugBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;

        // Stop standard looping
        if (boss.attackTimer) boss.attackTimer.remove();

        const attacks = [
          () => boss.ch2AttackBeeswarm(),
          () => boss.ch2AttackHibiscus(),
          () => boss.ch2AttackVines(),
          () => boss.ch2AttackCarrotRain(),
          () => boss.ch2AttackExplodingEggs(),
          () => boss.ch2AttackSnappingFlora(),
          () => boss.ch2AttackAcidSpitter(),
          () => boss.ch2AttackGolemQuakeNotes(),
          () => boss.ch2AttackNoteBurstUltimate(),
          () => boss.ch2AttackBunnyStampedeUltimate()
        ];

        const runNext = (idx) => {
          if (idx >= attacks.length) return;
          if (boss.hp <= 0 || gameScene.isGameOver) return;
          // Change text to show current attack
          debugBtn.setText(`RUNNING CH2 ATTACK ${idx + 1}/${attacks.length}`);
          const duration = attacks[idx]();
          this.time.delayedCall(duration + 1500, () => runNext(idx + 1));
        };

        runNext(0);
      });
    }
    
    // DEBUG BUTTONS FOR CHAPTER 3 INDIVIDUAL ATTACKS
    if (false && this.chapterId === 3 && gameSceneRef && gameSceneRef._isAdminTest) {
      const attackConfigs = [
        { id: 0, name: '#0 Kataw', color: '#00ccff', bossFn: 'ch3KatawExplosionPattern1' },
        { id: 1, name: '#1 Fish', color: '#00ccff', bossFn: 'ch3FishKingMultiSpell' },
        { id: 2, name: '#2 Shark', color: '#00ccff', bossFn: 'ch3SharkLanes' },
        { id: 3, name: '#3 Bat', color: '#00ccff', bossFn: 'ch3BatDiveBomb' },
        { id: 4, name: '#4 Siren', color: '#00ccff', bossFn: 'ch3SirensLure' },
        { id: 5, name: '#5 Storm', color: '#00ccff', bossFn: 'ch3DiamondStormPattern1' },
        { id: 6, name: '#6 Monster', color: '#ffdd00', bossFn: 'ch3MonsterAmbush' },
        { id: 7, name: '#7 Prismatic', color: '#ff66cc', bossFn: 'ch3PrismaticBeamStorm' },
        { id: 8, name: '#8 Spiral', color: '#ff00ff', bossFn: 'ch3AbyssalSpiral' }
      ];

      const btnWidth = 85;
      const spacing = 6;
      const totalWidth = attackConfigs.length * btnWidth + (attackConfigs.length - 1) * spacing;
      const startX = (this.scale.width - totalWidth) / 2 + btnWidth / 2;

      attackConfigs.forEach((cfg, i) => {
        const btn = this.add.text(startX + i * (btnWidth + spacing), 10, cfg.name, {
          backgroundColor: cfg.color,
          color: '#000',
          fontFamily: 'VCR',
          fontSize: '12px',
          padding: { x: 6, y: 4 }
        }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

        btn.on('pointerdown', () => {
          const gameScene = this.scene.get('GameScene');
          if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
          const boss = gameScene.boss;

          // Stop standard looping
          if (boss.attackTimer) boss.attackTimer.remove();

          // Run the specific attack
          if (boss[cfg.bossFn]) {
            boss[cfg.bossFn]();
          }
        });
      });

      // Control buttons row (below attack buttons)
      const controlY = 45;
      const smallBtnWidth = 80;

      // ULTIMATE button (left - red)
      const ultimateBtn = this.add.text(this.scale.width / 2 - smallBtnWidth * 1.8, controlY, 'ULTIMATE', {
        backgroundColor: '#ff0000',
        color: '#fff',
        fontFamily: 'VCR',
        fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      ultimateBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        boss.ch3UltimateRotatingBarrage();
        ultimateBtn.setText('ULT ACTIVE');
        setTimeout(() => ultimateBtn.setText('ULTIMATE'), 12000);
      });

      // STOP ATTACKS button
      const stopBtn = this.add.text(this.scale.width / 2 - smallBtnWidth * 0.6, controlY, 'STOP ATTACKS', {
        backgroundColor: '#ff4444',
        color: '#fff',
        fontFamily: 'VCR',
        fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      stopBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.boss) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        stopBtn.setText('ATTACKS STOPPED');
        setTimeout(() => stopBtn.setText('STOP ATTACKS'), 1500);
      });

      // START NORMAL button
      const startBtn = this.add.text(this.scale.width / 2 + smallBtnWidth * 0.6, controlY, 'START NORMAL', {
        backgroundColor: '#44ff44',
        color: '#000',
        fontFamily: 'VCR',
        fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      startBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        boss.lastAttackId = -1;
        boss.executeAttack();
        startBtn.setText('NORMAL ACTIVE');
        setTimeout(() => startBtn.setText('START NORMAL'), 1500);
      });

      // LIVES UP button (right)
      const livesBtn = this.add.text(this.scale.width / 2 + smallBtnWidth * 1.8, controlY, '+1 LIFE', {
        backgroundColor: '#ff00ff',
        color: '#fff',
        fontFamily: 'VCR',
        fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      livesBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (!gameScene || !gameScene.player) return;
        const player = gameScene.player;
        if (player.lives < 5) {
          player.lives++;
          gameScene.events.emit('player:livesChanged', player.lives);
          livesBtn.setText(`LIVES: ${player.lives}`);
          setTimeout(() => livesBtn.setText('+1 LIFE'), 1000);
        } else {
          livesBtn.setText('MAX LIVES');
          setTimeout(() => livesBtn.setText('+1 LIFE'), 1000);
        }
      });
    }

    // Boss Frame Overlay
    this.bossFrameOverlay = this.add.image(bossBoxBaseX + bossBoxW / 2, bossBoxY + bossBoxH / 2, 'boss_frame');
    this.bossFrameOverlay.setOrigin(0.5, 0.5);
    this.bossFrameOverlay.setDisplaySize(bossBoxW, bossBoxH);
    this.bossFrameOverlay.setDepth(15);
    this.playBossAttack = () => {
      if (this.chapterId === 1 || this.chapterId === 2 || this.chapterId === 3) return;
      if (!this.bossSprite || !this.bossSprite.play) return;
      if (hasBossTexture && this.textures.exists('boss_cast')) this.bossSprite.setTexture('boss_cast');
      if (updateBossScale) updateBossScale();
      if (this.anims.exists('anim_boss_attack')) this.bossSprite.play('anim_boss_attack');
    };

    this.playBossUltAttack = () => {
      // Guard: skip if bossSprite is a placeholder (no animation support)
      if (!this.bossSprite || !this.bossSprite.play) return;

      if (this.chapterId === 1) {
        if (hasBossTexture && this.textures.exists('boss_ult_attack')) this.bossSprite.setTexture('boss_ult_attack');
        updateBossScale();
        if (this.anims.exists('anim_boss_ult_attack')) this.bossSprite.play('anim_boss_ult_attack');
      } else if (this.chapterId === 2) {
        if (hasBossTexture && this.textures.exists('boss_ch2_ult_attack')) this.bossSprite.setTexture('boss_ch2_ult_attack');
        updateBossScale();
        if (this.anims.exists('anim_boss_ch2_ult_attack')) this.bossSprite.play('anim_boss_ch2_ult_attack');
      } else if (this.chapterId === 3) {
        if (hasBossTexture && this.textures.exists('boss_ch3_ult_attack')) this.bossSprite.setTexture('boss_ch3_ult_attack');
        updateBossScale();
        if (this.anims.exists('anim_boss_ch3_ult_attack')) this.bossSprite.play('anim_boss_ch3_ult_attack');
      }
    };



    // ========== HP BAR ==========
    {
    const HP_BAR_FRAMES = 50;
    const hpBarScaleY = 2.2;
    const hpBarScaleX = Math.min(3, (bossBoxW - 8) / 64);
    // In endless mode, center the HP bar; otherwise left-align it
    const hpBarX = (this.chapterId === 4 || this.isInfMode)
      ? bossBoxBaseX + bossBoxW / 2 - (64 * hpBarScaleX) / 2  // centered
      : bossBoxBaseX;  // left-aligned
    this.hpBarSprite = this.add.sprite(hpBarX, hpBarY + 8, 'boss_hp_bar', 0);
    this.hpBarSprite.setOrigin(0, 0.5);
    this.hpBarSprite.setScale(hpBarScaleX, hpBarScaleY);
    this.hpBarSprite.setDepth(10);
    this.hpBarSprite.setFrame(0);
    this._hpBarFrames = HP_BAR_FRAMES;
    this._hpBarMaxHp = 1;
    this._hpBarCurrent = 1;
    this._hpBarState = 0;
    const hpTextSize = bossBoxW < 200 ? '11px' : '13px';
    
    if (this.chapterId === 4 || this.isInfMode) {
      // In endless mode, hide the HP text completely (boss is immortal)
      this.bossHpText = null;
    } else {
      // Initial placeholder text — actual HP will update from boss data (in thousands format)
      this.bossHpText = this.add.text(bossBoxBaseX + (64 * hpBarScaleX) + 8, hpBarY + 8, '5,000/5,000', {
        fontFamily: 'VCR', fontSize: hpTextSize, color: '#f0e6d3', align: 'left'
      }).setOrigin(0, 0.5).setDepth(11);
    }
    }

    // ========== CAMERA BOX or D-PAD — based on control method ==========
    const camStartY = bossBoxY + bossBoxH + 8;
    const availCamH = height - camStartY - 8;
    const targetCamH = Math.floor(bossBoxW * 0.75);
    const camBoxH = Math.min(targetCamH, availCamH);
    const camBoxY = camStartY + Math.floor((availCamH - camBoxH) / 2);

    if (this.control === 'keyboard') {
      // ── D-PAD (on-screen arrow buttons) ──────────────────────────────────
      const dpadW = bossBoxW - 8;
      const dpadH = Math.min(Math.floor(dpadW * 2 / 3), availCamH);
      const dpadX = bossBoxBaseX + 4;
      const dpadY = camStartY + Math.floor((availCamH - dpadH) / 2);
      this._buildDpad(dpadX, dpadY, dpadW, dpadH);
    } else {
      // ── CAMERA PiP (gesture mode) ────────────────────────────────
      // Background is now the side panel image

      // Position the live camera PiP to fill the reserved camera box area
      const pip = document.getElementById('game-camera-pip');
      if (pip) {
        pip.style.left = `${bossBoxBaseX + 2}px`;
        pip.style.top = `${camBoxY + 2}px`;
        pip.style.width = `${bossBoxW - 4}px`;
        pip.style.height = `${camBoxH - 4}px`;
        pip.style.bottom = 'auto';
        pip.style.borderRadius = '0px';
        pip.style.border = 'none';
        pip.style.boxShadow = 'none';
        pip.style.opacity = '1';

        let overlay = document.getElementById('cam-eye-overlay');
        if (!overlay) {
          overlay = document.createElement('img');
          overlay.id = 'cam-eye-overlay';
          overlay.src = '/assets/ui/game-ui/eye-camera.png';
          overlay.style.position = 'absolute';
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = '51';
          pip.parentNode.appendChild(overlay);
        }
        overlay.style.left = pip.style.left;
        overlay.style.top = pip.style.top;
        overlay.style.width = pip.style.width;
        overlay.style.height = pip.style.height;
        overlay.style.display = pip.style.display;
      }
    }

    // Hide duplicate DOM timer (we use Phaser text)
    const domTimer = document.getElementById('game-timer-dom');
    if (domTimer) domTimer.style.display = 'none';

    // Listen for boss attack events from GameScene
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('boss:attack', () => this.playBossAttack());
      gameScene.events.on('boss:damaged', (current, max) => {
        this.updateBossHp(current, max);
        this.playBossDamageVfx();
      });
      gameScene.events.on('boss:died', () => this.onBossDied());
      gameScene.events.on('boss:timestop', (isStopped) => {
        if (!this.bossSprite) return;
        if (isStopped) {
          if (this.bossSprite.setTint) this.bossSprite.setTint(0x00aaff); // Freeze frosty blue
          if (this.bossSprite.anims) this.bossSprite.anims.pause();
        } else {
          if (this.bossSprite.clearTint) this.bossSprite.clearTint();
          if (this.bossSprite.anims) this.bossSprite.anims.resume();
        }
      });
      gameScene.events.on('player:health_changed', (hp) => this.updateLives(hp));
    }

    // ========== BLOOD SCREEN OVERLAY (game area) ==========
    // Semi-transparent so grid/projectiles/player remain visible beneath it.
    // Depth 5 keeps it above the grid background but below all HUD controls (depth 20).
    this.bloodOverlay = this.add.image(gameAreaX, 0, 'blood_screen_2left');
    this.bloodOverlay.setOrigin(0, 0);
    this.bloodOverlay.setDisplaySize(width - panelWidth, height);
    this.bloodOverlay.setDepth(5);
    this.bloodOverlay.setAlpha(0); // hidden until needed

    // Keep DOM overlays (d-pad, camera-pip) aligned when the canvas resizes
    // (window resize, fullscreen toggle, orientation change).
    this._repositionDomOverlays = (gameSize) => {
      const w = gameSize ? gameSize.width  : this.scale.width;
      const h = gameSize ? gameSize.height : this.scale.height;
      const pw  = Math.max(w < 768 ? 160 : 250, Math.min(450, w * 0.28));
      const isPanelRight = this.isPanelRight;
      const panelX = isPanelRight ? w - pw : 0;
      const gameAreaX = isPanelRight ? 0 : pw;
      const bbW = pw - 24 * 2;
      const bbBaseX = isPanelRight ? panelX + 24 : 24;

      // Mirror the same dynamic layout as create()
      const bossNamePx  = bbW < 160 ? 14 : bbW < 200 ? 18 : bbW < 250 ? 22 : 28;
      const bossTitlePx = bbW < 160 ? 9  : bbW < 200 ? 10 : bbW < 250 ? 12 : 14;
      const bossNameY   = 28 + 35; // 28 is topBarY approx
      const bossTitleY  = bossNameY + bossNamePx + 8;
      const hpBarY      = bossTitleY + bossTitlePx + 8 + 8;
      const bbY         = hpBarY + 28 + 12;
      const remH        = h - bbY;
      const bbRatio     = h < 500 ? 0.28 : h < 650 ? 0.32 : 0.38;
      const bbH         = Math.floor(remH * bbRatio);

      const camStartY  = bbY + bbH + 8;
      const availCamH  = h - camStartY - 8;
      const targetCamH = Math.floor(bbW * 0.75);
      const camBoxH    = Math.min(targetCamH, availCamH);
      const camBoxY    = camStartY + Math.floor((availCamH - camBoxH) / 2);

      // Resize panel background
      if (this.panelBg) {
        this.panelBg.setPosition(panelX, 0);
        this.panelBg.setDisplaySize(pw, h);
      }

      // Resize panel divider
      if (this.panelDivider) {
        const panelEdgeX = isPanelRight ? w - pw : pw;
        this.panelDivider.clear();
        this.panelDivider.lineStyle(4, 0x201c11, 1);
        this.panelDivider.beginPath();
        this.panelDivider.moveTo(panelEdgeX, 0);
        this.panelDivider.lineTo(panelEdgeX, h);
        this.panelDivider.strokePath();
      }

      // Reposition panel position label
      if (this.panelPositionLabel) {
        const newLabelX = isPanelRight ? w - 8 : 8;
        this.panelPositionLabel.setPosition(newLabelX, h - 20);
        this.panelPositionLabel.setOrigin(isPanelRight ? 1 : 0, 0.5);
      }

      // Resize blood overlay
      if (this.bloodOverlay) {
        this.bloodOverlay.setPosition(gameAreaX, 0);
        this.bloodOverlay.setDisplaySize(w - pw, h);
      }

      // Reposition hpBarSprite (centered in endless mode, left-aligned otherwise)
      const hpBarScaleX = Math.min(3, (bbW - 8) / 64);
      if (this.hpBarSprite) {
        const isEndless = this.chapterId === 4 || this.isInfMode;
        const hpBarX = isEndless
          ? bbBaseX + bbW / 2 - (64 * hpBarScaleX) / 2  // centered
          : bbBaseX;  // left-aligned
        this.hpBarSprite.setPosition(hpBarX, hpBarY + 8);
        this.hpBarSprite.setScale(hpBarScaleX, 2.2);
      }

      // Reposition boss HP text directly next to health bar
      if (this.bossHpText) {
        const hpTextSize = bbW < 200 ? '11px' : '13px';
        this.bossHpText.setPosition(bbBaseX + (64 * hpBarScaleX) + 8, hpBarY + 8);
        this.bossHpText.setFontSize(hpTextSize);
      }

      if (this.control === 'keyboard') {
        const dpad = document.getElementById('game-dpad');
        if (dpad) {
          const dpadW = bbW - 8;
          const dpadH = Math.min(Math.floor(dpadW * 2 / 3), availCamH);
          const dpadX = bbBaseX + Math.floor((bbW - dpadW) / 2);
          const dpadY = camStartY + Math.floor((availCamH - dpadH) / 2);
          dpad.style.left   = `${dpadX}px`;
          dpad.style.top    = `${dpadY}px`;
          dpad.style.width  = `${dpadW}px`;
          dpad.style.height = `${dpadH}px`;
        }
      } else {
        const pip = document.getElementById('game-camera-pip');
        if (pip) {
          pip.style.left   = `${bbBaseX + 2}px`;
          pip.style.top    = `${camBoxY + 2}px`;
          pip.style.width  = `${bbW - 4}px`;
          pip.style.height = `${camBoxH - 4}px`;
        }
        const overlay = document.getElementById('cam-eye-overlay');
        if (overlay && pip) {
          overlay.style.left   = pip.style.left;
          overlay.style.top    = pip.style.top;
          overlay.style.width  = pip.style.width;
          overlay.style.height = pip.style.height;
        }
      }
    };
    this.scale.on('resize', this._repositionDomOverlays);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this._repositionDomOverlays);
    });
  }

  _buildDpad(boxX, boxY, boxW, boxH) {
    // Remove any pre-existing d-pad
    const existing = document.getElementById('game-dpad');
    if (existing) existing.remove();

    const dpad = document.createElement('div');
    dpad.id = 'game-dpad';
    dpad.className = 'game-dpad';
    dpad.style.left = `${boxX}px`;
    dpad.style.top = `${boxY}px`;
    dpad.style.width = `${boxW}px`;
    dpad.style.height = `${boxH}px`;

    const arrows = [
      { dir: 'up',    cls: 'dpad-up'    },
      { dir: 'left',  cls: 'dpad-left'  },
      { dir: 'right', cls: 'dpad-right' },
      { dir: 'down',  cls: 'dpad-down'  },
    ];

    arrows.forEach(({ dir, cls }) => {
      const btn = document.createElement('button');
      btn.className = `dpad-btn ${cls}`;
      btn.setAttribute('aria-label', dir);

      const img = document.createElement('img');
      img.className = 'dpad-arrow-icon';
      img.src = `/assets/ui/dpad/arrow-${dir}.png`;
      img.draggable = false;
      btn.appendChild(img);

      const fire = () => {
        const gs = this.scene.get('GameScene');
        if (gs && !gs.isGameOver) gs.player.move(dir);
      };

      let holdInitialTimer = null;
      let holdRepeatTimer = null;

      const stopHold = () => {
        clearTimeout(holdInitialTimer);
        clearInterval(holdRepeatTimer);
        holdInitialTimer = null;
        holdRepeatTimer = null;
        img.src = `/assets/ui/dpad/arrow-${dir}.png`;
      };

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        img.src = `/assets/ui/dpad/arrow-${dir}-pressed.png`;
        audioManager.play('sfx_dpad_click', { volume: 0.5 });
        fire();
        // After initial delay, start repeating
        holdInitialTimer = setTimeout(() => {
          holdRepeatTimer = setInterval(() => { fire(); }, 160);
        }, 300);
      });
      btn.addEventListener('pointerup',    stopHold);
      btn.addEventListener('pointerleave', stopHold);

      dpad.appendChild(btn);
    });

    const gameContainer = document.querySelector('.game-screen');
    if (gameContainer) gameContainer.appendChild(dpad);
  }

  playBossAttack() {
    if (!this.bossSprite || !this.bossSprite.play) return;
    if (this.chapterId === 1 || this.chapterId === 2 || this.chapterId === 3 || this.isInfMode) return;
    this.bossSprite.play('anim_boss_attack');
    this.bossSprite.once('animationcomplete', () => {
      if (this.bossSprite && this.bossSprite.play) this.bossSprite.play('anim_boss_idle');
    });
  }

  playBossDamageVfx() {
    if (!this.bossSprite) return;

    if (this.chapterId === 1) {
      // Chapter 1 specific boss damage VFX
      const explosion = this.add.sprite(this.bossSprite.x, this.bossSprite.y, 'eye_explosion');
      explosion.setScale(3.0).setDepth(200);
      explosion.play('anim_eye_explosion');
      explosion.once('animationcomplete', () => explosion.destroy());
    } else {
      // Universal fallback for Chapter 2+
      if (!this.anims.exists('anim_generic_damage')) {
        this.anims.create({
          key: 'anim_generic_damage',
          frames: this.anims.generateFrameNumbers('fx_damage'),
          frameRate: 20,
          repeat: 0
        });
      }
      const splat = this.add.sprite(this.bossSprite.x, this.bossSprite.y, 'fx_damage');
      splat.setScale(3.0).setDepth(200);
      splat.play('anim_generic_damage');
      splat.once('animationcomplete', () => splat.destroy());
    }

    // ── White-flash hit indicator ──────────────────────────────────────
    // Cancel any in-flight tint timer so rapid hits never stack/get stuck.
    if (this._tintTimer) {
      this._tintTimer.remove(false);
      this._tintTimer = null;
    }

    // Immediately flash the villain portrait white (if sprite supports tint)
    if (this.bossSprite.setTint) this.bossSprite.setTint(0xffffff);

    // Clear after a short 150ms — quick, snappy, never lingers
    this._tintTimer = this.time.delayedCall(150, () => {
      if (this.bossSprite && this.bossSprite.clearTint) this.bossSprite.clearTint();
      this._tintTimer = null;
    });
  }

  onBossDied() {
    if (!this.bossSprite) return;
    if (this.bossSprite.setTint) this.bossSprite.setTint(0xff0000);
    this.tweens.add({
      targets: this.bossSprite,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 500
    });
  }

  updateScore(score) {
    if (this.scoreText) this.scoreText.setText(`${score}`);
  }

  updateInfWave(waveNum, combo, speed) {
    if (this.infWaveText) this.infWaveText.setText(`${waveNum}`);
    // Update combo + speed display
    if (this.infComboText) {
      const comboStr = combo !== undefined ? `${combo.toFixed(1)}x` : '1.0x';
      const speedStr = speed !== undefined ? ` [${speed.toFixed(2)}x spd]` : '';
      this.infComboText.setText(`${comboStr}${speedStr}`);
      const comboColor = (combo || 1) >= 4.0 ? '#ff2200' : (combo || 1) >= 3.0 ? '#ff6600' : (combo || 1) >= 2.0 ? '#ffcc00' : '#ff9900';
      this.infComboText.setColor(comboColor);
      this.tweens.add({
        targets: this.infComboText,
        scaleX: 1.3, scaleY: 1.3,
        duration: 100, yoyo: true, ease: 'Back.easeOut'
      });
    }
    // Subtle pop on the wave counter
    if (this.infWaveText) {
      this.tweens.add({
        targets: this.infWaveText,
        scaleX: 1.15, scaleY: 1.15,
        duration: 80, yoyo: true, ease: 'Power2'
      });
    }
  }

  updateLives(lives) {
    if (!this.hearts) return;
    for (let i = 0; i < 3; i++) {
      // Frame indexes: 147 (full), 146 (half), 145 (empty)
      let frame = 145;
      let isHalf = false;
      if (lives >= (i + 1) * 2) {
        frame = 147;
      } else if (lives === (i * 2) + 1) {
        frame = 146;
        isHalf = true;
      }
      if (this.hearts[i]) {
        this.hearts[i].setFrame(frame);
        // Flip half-heart horizontally to fix inverted appearance
        this.hearts[i].setFlipX(isHalf);
      }
    }

    // Blood screen overlay: show the correct image based on remaining HP
    if (this.bloodOverlay) {
      if (lives <= 1) {
        // half heart left
        this.bloodOverlay.setTexture('blood_screen_halfleft').setAlpha(0.55);
      } else if (lives === 2) {
        // 1 full heart left
        this.bloodOverlay.setTexture('blood_screen_1left').setAlpha(0.5);
      } else if (lives === 3) {
        // 1.5 hearts left
        this.bloodOverlay.setTexture('blood_screen_1_5left').setAlpha(0.45);
      } else if (lives === 4) {
        // 2 hearts left
        this.bloodOverlay.setTexture('blood_screen_2left').setAlpha(0.4);
      } else {
        // > 4 HP — hide overlay
        this.bloodOverlay.setAlpha(0);
      }
    }
  }

  updateBossHp(current, max) {
    if (!this.hpBarSprite) return;

    const tookDamage = current < this._hpBarCurrent;
    this._hpBarMaxHp = max;
    this._hpBarCurrent = current;

    const ratio = Math.max(0, current / max);

    // 8 damage states (each 6 frames), plus state 0 (base full HP, 2 frames)
    const maxStates = 8;
    // ratio 1.0 -> 0, ratio 0.0 -> 8
    const newState = Math.min(maxStates, Math.floor((1 - ratio) * (maxStates + 1)));
    // Wait, let's map ratio precisely: 
    // If ratio > 0.875 -> state 0, ratio 0.75-0.875 -> state 1...
    // Actually Math.round((1 - ratio) * maxStates) maps evenly.
    const mappedState = Math.round((1 - ratio) * maxStates);

    if (this._hpBarState !== mappedState || tookDamage) {
      if (mappedState === 0) {
        // Base state (frames 0 and 1)
        if (tookDamage) {
          const animKey = 'anim_hp_state_0';
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers('boss_hp_bar', { start: 0, end: 1 }),
              frameRate: 10,
              repeat: 0
            });
          }
          this.hpBarSprite.play(animKey);
        } else {
          this.hpBarSprite.setFrame(0);
        }
      } else {
        // Decrement states 1 to 8
        // State 1 = frames 2 to 7. State 8 = frames 44 to 49.
        const startFrame = (mappedState - 1) * 6 + 2;
        const endFrame = startFrame + 5;
        const animKey = 'anim_hp_state_' + mappedState;

        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers('boss_hp_bar', { start: startFrame, end: endFrame }),
            frameRate: 15,
            repeat: 0
          });
        }
        this.hpBarSprite.play(animKey);
      }
      this._hpBarState = mappedState;
    }

    if (this.bossHpText) {
      // Show boss HP in thousands format (5 HP = 5000)
      const currentHp = Math.ceil(current) * 1000;
      const maxHp = Math.ceil(max) * 1000;
      this.bossHpText.setText(`${currentHp.toLocaleString()}/${maxHp.toLocaleString()}`);
    }
  }

  update(time, delta) {
    this.elapsed += delta;
    const seconds = Math.floor(this.elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySecs = seconds % 60;
    if (this.timerText) {
      this.timerText.setText(`${minutes.toString().padStart(2, '0')}:${displaySecs.toString().padStart(2, '0')}`);
    }

  }

  /**
   * Creates a simplified layout for practice tutorial
   * - Full screen background (chapter select bg)
   * - No left panel (no boss display, no camera/dpad)
   * - Grid centered
   * - Minimal UI
   */
  _createPracticeTutorialLayout(width, height) {
    // ========== FULL SCREEN BACKGROUND ==========
    // Use chapter select background (neutral, no spoilers)
    const bg = this.add.image(width / 2, height / 2, 'left_panel_bg');
    bg.setDisplaySize(width, height);
    bg.setDepth(0);

    // Dark overlay for better contrast with grid
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a, 0.4);
    overlay.setDepth(1);

    // ========== TOP BAR (centered, minimal) ==========
    // Practice mode label at top center
    this.add.text(width / 2, 15, 'PRACTICE MODE', {
      fontFamily: 'VCR', fontSize: '12px', color: '#a89b8c', letterSpacing: 2
    }).setOrigin(0.5, 0).setDepth(20);

    // Hide DOM elements
    const domTimer = document.getElementById('game-timer-dom');
    if (domTimer) domTimer.style.display = 'none';

    // Hide camera PiP (not needed for practice, gesture indicators are in dialogue)
    const pip = document.getElementById('game-camera-pip');
    if (pip) {
      pip.style.display = 'none';
    }

    // Listen for boss events from GameScene
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('boss:damaged', (current, max) => {
        if (gameScene.isTutorial || gameScene.isPracticeTutorial) {
          state.emit('tutorial:bossDamaged');
        }
      });
    }
  }

  _buildAdminDebugButtons() {
    if (!this.scene || !this.scene.isActive()) return;
    const gameScene = this.scene.get('GameScene');

    // ── Chapter 1 ──────────────────────────────────────────────────────────
    if (this.chapterId === 1) {
      const debugBtn = this.add.text(this.scale.width / 2, 20, 'DEBUG: RUN ALL CH1 ATTACKS', {
        backgroundColor: '#880000', color: '#fff', fontFamily: 'VCR', fontSize: '16px',
        padding: { x: 10, y: 8 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      debugBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();

        const attacks = [
          () => boss.ch1AttackCrimsonSplatter(),
          () => boss.ch1AttackBleedingEye(),
          () => boss.ch1AttackBloodVolley(),
        ];

        const runNext = (idx) => {
          if (idx >= attacks.length) { debugBtn.setText('DEBUG: RUN ALL CH1 ATTACKS'); return; }
          if (boss.hp <= 0 || gameScene.isGameOver) return;
          debugBtn.setText(`RUNNING CH1 ATTACK ${idx + 1}/${attacks.length}`);
          const duration = attacks[idx]();
          this.time.delayedCall((duration || 2000) + 1500, () => runNext(idx + 1));
        };
        runNext(0);
      });
    }

    // ── Chapter 2 ──────────────────────────────────────────────────────────
    if (this.chapterId === 2) {
      const debugBtn = this.add.text(this.scale.width / 2, 20, 'DEBUG: RUN ALL CH2 ATTACKS', {
        backgroundColor: '#f00', color: '#fff', fontFamily: 'VCR', fontSize: '16px',
        padding: { x: 10, y: 8 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

      debugBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();

        const attacks = [
          () => boss.ch2AttackBeeswarm(),
          () => boss.ch2AttackHibiscus(),
          () => boss.ch2AttackVines(),
          () => boss.ch2AttackCarrotRain(),
          () => boss.ch2AttackExplodingEggs(),
          () => boss.ch2AttackSnappingFlora(),
          () => boss.ch2AttackAcidSpitter(),
          () => boss.ch2AttackGolemQuakeNotes(),
          () => boss.ch2AttackNoteBurstUltimate(),
          () => boss.ch2AttackBunnyStampedeUltimate(),
        ];

        const runNext = (idx) => {
          if (idx >= attacks.length) { debugBtn.setText('DEBUG: RUN ALL CH2 ATTACKS'); return; }
          if (boss.hp <= 0 || gameScene.isGameOver) return;
          debugBtn.setText(`RUNNING CH2 ATTACK ${idx + 1}/${attacks.length}`);
          const duration = attacks[idx]();
          this.time.delayedCall((duration || 2000) + 1500, () => runNext(idx + 1));
        };
        runNext(0);
      });
    }

    // ── Chapter 3 ──────────────────────────────────────────────────────────
    if (this.chapterId === 3) {
      const attackConfigs = [
        { name: '#0 Kataw',     color: '#00ccff', bossFn: 'ch3KatawExplosionPattern1' },
        { name: '#1 Fish',      color: '#00ccff', bossFn: 'ch3FishKingMultiSpell' },
        { name: '#2 Shark',     color: '#00ccff', bossFn: 'ch3SharkLanes' },
        { name: '#3 Bat',       color: '#00ccff', bossFn: 'ch3BatDiveBomb' },
        { name: '#4 Siren',     color: '#00ccff', bossFn: 'ch3SirensLure' },
        { name: '#5 Storm',     color: '#00ccff', bossFn: 'ch3DiamondStormPattern1' },
        { name: '#6 Monster',   color: '#ffdd00', bossFn: 'ch3MonsterAmbush' },
        { name: '#7 Prismatic', color: '#ff66cc', bossFn: 'ch3PrismaticBeamStorm' },
        { name: '#8 Spiral',    color: '#ff00ff', bossFn: 'ch3AbyssalSpiral' },
      ];

      const btnWidth = 85;
      const spacing = 6;
      const totalWidth = attackConfigs.length * btnWidth + (attackConfigs.length - 1) * spacing;
      const startX = (this.scale.width - totalWidth) / 2 + btnWidth / 2;

      attackConfigs.forEach((cfg, i) => {
        const btn = this.add.text(startX + i * (btnWidth + spacing), 10, cfg.name, {
          backgroundColor: cfg.color, color: '#000', fontFamily: 'VCR', fontSize: '12px',
          padding: { x: 6, y: 4 }
        }).setOrigin(0.5, 0).setDepth(9999).setInteractive();

        btn.on('pointerdown', () => {
          if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
          const boss = gameScene.boss;
          if (boss.attackTimer) boss.attackTimer.remove();
          if (boss[cfg.bossFn]) boss[cfg.bossFn]();
        });
      });

      const controlY = 45;
      const smallBtnWidth = 80;

      const ultimateBtn = this.add.text(this.scale.width / 2 - smallBtnWidth * 1.8, controlY, 'ULTIMATE', {
        backgroundColor: '#ff0000', color: '#fff', fontFamily: 'VCR', fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();
      ultimateBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        boss.ch3UltimateRotatingBarrage();
        ultimateBtn.setText('ULT ACTIVE');
        setTimeout(() => ultimateBtn.setText('ULTIMATE'), 12000);
      });

      const stopBtn = this.add.text(this.scale.width / 2 - smallBtnWidth * 0.6, controlY, 'STOP ATTACKS', {
        backgroundColor: '#ff4444', color: '#fff', fontFamily: 'VCR', fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();
      stopBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.boss) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        stopBtn.setText('ATTACKS STOPPED');
        setTimeout(() => stopBtn.setText('STOP ATTACKS'), 1500);
      });

      const startBtn = this.add.text(this.scale.width / 2 + smallBtnWidth * 0.6, controlY, 'START NORMAL', {
        backgroundColor: '#44ff44', color: '#000', fontFamily: 'VCR', fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();
      startBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.boss || gameScene.boss.hp <= 0) return;
        const boss = gameScene.boss;
        if (boss.attackTimer) boss.attackTimer.remove();
        boss.lastAttackId = -1;
        boss.executeAttack();
        startBtn.setText('NORMAL ACTIVE');
        setTimeout(() => startBtn.setText('START NORMAL'), 1500);
      });

      const livesBtn = this.add.text(this.scale.width / 2 + smallBtnWidth * 1.8, controlY, '+1 LIFE', {
        backgroundColor: '#ff00ff', color: '#fff', fontFamily: 'VCR', fontSize: '10px',
        padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 0).setDepth(9999).setInteractive();
      livesBtn.on('pointerdown', () => {
        if (!gameScene || !gameScene.player) return;
        const player = gameScene.player;
        if (player.lives < 5) {
          player.lives++;
          gameScene.events.emit('player:livesChanged', player.lives);
          livesBtn.setText(`LIVES: ${player.lives}`);
          setTimeout(() => livesBtn.setText('+1 LIFE'), 1000);
        } else {
          livesBtn.setText('MAX LIVES');
          setTimeout(() => livesBtn.setText('+1 LIFE'), 1000);
        }
      });
    }
  }

  shutdown() {
    const dpad = document.getElementById('game-dpad');
    if (dpad) dpad.remove();
  }
}

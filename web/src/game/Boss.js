import * as Phaser from 'phaser';
import { Projectile } from './Projectile.js';
import { state } from '../utils/StateManager.js';
import { audioManager } from './AudioManager.js';

export class Boss {
  /**
   * @param {Phaser.Scene} scene 
   * @param {import('./Grid.js').Grid} grid 
   */
  constructor(scene, grid, isTutorial = false) {
    this.scene = scene;
    this.grid = grid;
    this.isTutorial = isTutorial;
    
    // In tutorial mode, we want a lot of HP so it doesn't die.
    if (this.isTutorial) {
      this.maxHp = 9999;
    } else if (scene.isEndless) {
      this.maxHp = Infinity;
    } else if (scene.chapterId === 1) {
      this.maxHp = 5;
    } else if (scene.chapterId === 2) {
      this.maxHp = 7;
    } else if (scene.chapterId === 3) {
      this.maxHp = 10;
    } else {
      this.maxHp = 5; // Default fallback
    }
    this.hp = this.maxHp;
    this.lastAttackId = -1;
    this.secondLastAttackId = -1; // Track two back to prevent problematic pairs
    this.waveCount = 0;
    this.isInfMode = scene.isEndless || false;
    this.infSpeedMultiplier = 1.0;
    this.infPerfectWave = true;

    // Progressive difficulty: attacks get faster as waves progress
    // Scales from 1.0 (normal) to 1.5 (50% faster) over 20 waves
    this.difficultyMultiplier = 1.0;

    // Boss sprite is rendered by HUDScene (since HUD covers the left panel).
    // Projectiles originate from the top-center of the grid area.
    const gridCenterX = grid.offsetX + (grid.tileSize * grid.cols) / 2;
    this.projectileOriginX = gridCenterX;
    this.projectileOriginY = grid.offsetY - 30;
    // Chapter 2 ultimate attack tracking
    this._ch2UltimateActive = false;
    this._ch2UltimateCount = 0;
    this._ch2BeeswarmCounter = 0;
    this._ch2BeeswarmThreshold = Phaser.Math.Between(4, 6);
    
    if (this.isTutorial) {
      // In tutorial, don't start the normal attack loop.
      // We will listen for specific tutorial events to trigger simple attacks.
      this.unsubTutorialAttack = state.on('tutorial:triggerAttack', (stepIndex) => {
        this.tutorialAttack(stepIndex);
      });
      this.unsubTutorialDamageTile = state.on('tutorial:spawnDamageTile', () => {
        this.spawnDamageTile();
      });
      this.scene.events.once('shutdown', () => {
        if (this.unsubTutorialAttack) this.unsubTutorialAttack();
        if (this.unsubTutorialDamageTile) this.unsubTutorialDamageTile();
      });
    } else {
      this.startAttackLoop();
    }
  }

  startAttackLoop() {
    this.attackCycleCount = 0;
    this.lastAttackId = -1;

    // Wait for admin token verification before the first attack fires
    // so _adminTestAttackId is guaranteed to be set beforehand
    const delay = 3000;
    Promise.resolve(this.scene._adminCheckReady).then(() => {
      if (!this.scene || this.scene.isGameOver) return;
      this.attackTimer = this.scene.time.delayedCall(delay, this.executeAttack, [], this);
    });

    // Phase 4: Time Stop buff listener
    this.scene.events.on('boss:timestop', (isStopped) => {
      if (this.attackTimer) {
        this.attackTimer.paused = isStopped;
      }
    });
  }

  tutorialAttack(stepIndex) {
    this.scene.events.emit('boss:attack');

    // All 3 tutorial attack steps use the Crimson Splatter so the player
    // sees the real Chapter 1 blood mechanic and learns to dodge it.
    const duration = this.ch1AttackCrimsonSplatter();

    // Notify TutorialScreen once the attack animation finishes
    this.scene.time.delayedCall(duration, () => {
      state.emit('tutorial:attackComplete');
    });
  }

  _tutorialSimpleAttack(tiles) {
    const WARNING_MS = 2000; // 2s red tile telegraph — longer so player can react

    // 1. Show red telegraph tiles
    tiles.forEach(pos => {
      this.grid.telegraph(pos.c, pos.r, WARNING_MS);
    });

    // 2. After warning, trigger explosions
    this.scene.time.delayedCall(WARNING_MS, () => {
      tiles.forEach(pos => {
        const gPos = this.grid.getPixelPosition(pos.c, pos.r);

        // Explosion sprite
        const exp = this.scene.add.sprite(gPos.x, gPos.y, 'eye_explosion')
          .setOrigin(0.5, 0.6).setDepth(30).setScale(1.5);
        if (this.scene.anims.exists('anim_eye_explosion')) {
          exp.play('anim_eye_explosion');
          exp.once('animationcomplete', () => exp.destroy());
        } else {
          this.scene.time.delayedCall(400, () => exp.destroy());
        }

        // Player hit check
        if (this.scene.player.col === pos.c && this.scene.player.row === pos.r
            && !this.scene.player.isDashing) {
          this.scene.player.takeDamage();
        }
      });
    });

    return WARNING_MS + 600; // total duration before next step
  }

  executeAttack() {
    // Check if time freeze power-up is active - delay attack
    if (this.scene._timeFreezeActive) {
      this.attackTimer = this.scene.time.delayedCall(500, this.executeAttack, [], this);
      return;
    }

    this.waveCount++;
    if (this.isInfMode) {
      this.infSpeedMultiplier = Math.min(1.0 + (this.waveCount * 0.015), 2.5);
      this.infPerfectWave = true;
      this.scene.events.emit('inf:wave', this.waveCount, this.infSpeedMultiplier);

      // Infinite Mode: Ultimate every 10 waves
      if (this.waveCount % 10 === 0) {
        if (this.attackTimer) this.attackTimer.remove();
        let ultimateDuration = 0;

        if (this.scene.chapterId === 1) {
          ultimateDuration = this.ch1AttackBloodVortexPull();
        } else if (this.scene.chapterId === 2) {
          // Alternate between the two Chapter 2 ultimates
          this._ch2UltimateCount = (this._ch2UltimateCount || 0) + 1;
          ultimateDuration = this._ch2UltimateCount % 2 === 0
            ? this.ch2AttackBunnyStampedeUltimate()
            : this.ch2AttackNoteBurstUltimate();
        } else if (this.scene.chapterId === 3) {
          ultimateDuration = this.ch3UltimateRotatingBarrage();
        }

        if (ultimateDuration > 0) {
          this.attackTimer = this.scene.time.delayedCall(ultimateDuration + 3000, this.executeAttack, [], this);
          return; // Skip normal attack this wave
        }
      }
    } else {
      // Progressive difficulty for regular chapters
      // Scales from 1.0 (wave 1) to 1.5 (wave 20+) - attacks become 50% faster
      this.difficultyMultiplier = Math.min(1.0 + ((this.waveCount - 1) * 0.025), 1.5);
    }

    let currentAttackDuration = 2000; // Baseline fallback

    // Every 4th wave, spawn the Golden Damage Tile
    if (this.waveCount % 4 === 0) {
      this.spawnDamageTile();
      currentAttackDuration = 4000;
    } else {
      const targets = [];
      this.attackCycleCount++;

      // Every 5th attack cycle, spawn a bawang (lives up) loot
      if (this.attackCycleCount % 5 === 0) {
        this._spawnBawangLoot();
      }

      // Every 8th attack cycle, spawn a chest (power-up) loot
      if (this.attackCycleCount % 8 === 0) {
        this._spawnChestLoot();
      }

      // DISABLED: Boss Phase 4 Loot Logistics - chests removed for rework
      // if (this.attackCycleCount % 5 === 0 && this.grid.spawnChest) {
      //   const gt = this.scene.goldenTile;
      //   const freeSpots = [];
      //   for (let r = 0; r < this.grid.rows; r++) {
      //     for (let c = 0; c < this.grid.cols; c++) {
      //       if (this.grid.cells[r][c].status === 'safe' &&
      //         (c !== this.scene.player.col || r !== this.scene.player.row) &&
      //         !(gt && gt.col === c && gt.row === r) &&
      //         !this.grid.hasChestAt(c, r)) {
      //         freeSpots.push({ c, r });
      //       }
      //     }
      //   }
      //   if (freeSpots.length > 0) {
      //     const spot = Phaser.Math.RND.pick(freeSpots);
      //     const roll = Math.random();
      //     if (roll > 0.85) {
      //       this.grid.spawnRuby(spot.c, spot.r);
      //     } else if (roll > 0.70) {
      //       this.grid.spawnDiamond(spot.c, spot.r);
      //     } else {
      //       let rarity = 0;
      //       if (roll > 0.50) rarity = 8;
      //       else if (roll > 0.40) rarity = 2;
      //       else if (roll > 0.20) rarity = 1;
      //       this.grid.spawnChest(spot.c, spot.r, rarity);
      //     }
      //   }
      // }

      // Chapter 1 Specific Attack Routing
      if (this.scene.chapterId === 1) {
        this.scene.events.emit('boss:attack');

        // Fairness Rule #5: Pure randomization WITH History Blocking (Anti-Repeat Logic)
        let patternId;
        do {
          patternId = Phaser.Math.Between(0, 2);
        } while (patternId === this.lastAttackId);
        this.lastAttackId = patternId;

        if (patternId === 0) currentAttackDuration = this.ch1AttackCrimsonSplatter();
        else if (patternId === 1) currentAttackDuration = this.ch1AttackBleedingEye();
        else currentAttackDuration = this.ch1AttackBloodVolley();

      } else if (this.scene.chapterId === 2) {
        this.scene.events.emit('boss:attack');

        // 7 unique attack patterns with anti-repeat logic
        // Beeswarm is now a background overlay distraction, NOT a pattern slot
        let pattern;

        // Admin test mode: lock to specific attack ID
        if (this.scene._adminTestAttackId !== undefined) {
          pattern = this.scene._adminTestAttackId;
        } else {
          let safetyCounter = 0;
          do {
            pattern = Phaser.Math.Between(0, 6);
            safetyCounter++;
          } while (safetyCounter < 20 && pattern === this.lastAttackId);
          this.secondLastAttackId = this.lastAttackId;
          this.lastAttackId = pattern;
        }

        if (pattern === 0) currentAttackDuration = this.ch2AttackHibiscus();
        else if (pattern === 1) currentAttackDuration = this.ch2AttackVines();
        else if (pattern === 2) currentAttackDuration = this.ch2AttackCarrotRain();
        else if (pattern === 3) currentAttackDuration = this.ch2AttackExplodingEggs();
        else if (pattern === 4) currentAttackDuration = this.ch2AttackSnappingFlora();
        else if (pattern === 5) currentAttackDuration = this.ch2AttackAcidSpitter();
        else currentAttackDuration = this.ch2AttackGolemQuakeNotes();

        // Beeswarm overlay: fire as a background distraction every 4-6 attacks
        if (!this._ch2BeeswarmCounter) this._ch2BeeswarmCounter = 0;
        this._ch2BeeswarmCounter++;
        if (this._ch2BeeswarmCounter >= this._ch2BeeswarmThreshold) {
          this._ch2BeeswarmCounter = 0;
          this._ch2BeeswarmThreshold = Phaser.Math.Between(4, 6);
          this._ch2BeeswarmOverlay();
        }
      } else if (this.scene.chapterId === 3) {
        this.scene.events.emit('boss:attack');
        // 9 Unique attacks with anti-repeat
        let pattern;
        
        // Admin test mode: lock to specific attack ID
        if (this.scene._adminTestAttackId !== undefined) {
          pattern = this.scene._adminTestAttackId;
        } else {
          do {
            pattern = Phaser.Math.Between(0, 8);
          } while (pattern === this.lastAttackId);
          this.secondLastAttackId = this.lastAttackId;
          this.lastAttackId = pattern;
        }

        // Route to the completely randomized Kataw attacks
        switch (pattern) {
          case 0: currentAttackDuration = this.ch3KatawExplosionPattern1(); break;
          case 1: currentAttackDuration = this.ch3FishKingMultiSpell(); break;
          case 2: currentAttackDuration = this.ch3SharkLanes(); break;
          case 3: currentAttackDuration = this.ch3BatDiveBomb(); break;
          case 4: currentAttackDuration = this.ch3SirensLure(); break;
          case 5: currentAttackDuration = this.ch3DiamondStormPattern1(); break;
          case 6: currentAttackDuration = this.ch3MonsterAmbush(); break;
          case 7: currentAttackDuration = this.ch3PrismaticBeamStorm(); break;
          case 8: currentAttackDuration = this.ch3AbyssalSpiral(); break;
          default: currentAttackDuration = 2000;
        }
      } else {
        // Fallback/Legacy for other chapters until implemented
        targets.push({
          c: Phaser.Math.Between(0, this.grid.cols - 1),
          r: Phaser.Math.Between(0, this.grid.rows - 1)
        });
      }
      if (targets.length > 0) {
        // Tell HUDScene to play boss attack animation for legacy projectile attacks.
        this.scene.events.emit('boss:attack');

        const telegraphTime = Phaser.Math.Between(1500, 2000);
        currentAttackDuration = telegraphTime + 500;

        targets.forEach(t => {
          this.grid.telegraph(t.c, t.r, telegraphTime);
          this.scene.time.delayedCall(telegraphTime, () => {
            if (this.hp > 0) {
              new Projectile(this.scene, this.grid, t.c, t.r);
            }
          });
        });
      }
    }

    // Dynamic Cascading Pause Scheduler setup
    // This strictly ensures the game rests for precisely 3.0 seconds AFTER the active attack phase completely clears!
    // Progressive difficulty: breather time gets shorter as waves progress (from 3.0s down to 1.5s)
    if (this.hp > 0) {
      if (this.attackTimer) this.attackTimer.remove(); // Safely clear old references
      const baseBreather = this.isInfMode ? 2000 : 3000;
      // Scale breather: at 1.5x difficulty, breather is 1/1.5 = 0.67 of base (2s -> 1.33s or 3s -> 2s)
      const difficulty = this.isInfMode ? this.infSpeedMultiplier : this.difficultyMultiplier;
      const scaledBreather = Math.max(1000, baseBreather / difficulty); // Min 1s breather
      this.attackTimer = this.scene.time.delayedCall(currentAttackDuration + scaledBreather, this.executeAttack, [], this);
    }
  }

  /**
   * Get current difficulty multiplier (for INF mode or regular chapters)
   */
  getDifficultyMultiplier() {
    return this.isInfMode ? this.infSpeedMultiplier : this.difficultyMultiplier;
  }

  /**
   * Scale warning/telegraph time based on difficulty
   * As difficulty increases, warning time decreases (harder to react)
   * @param {number} baseTime - Base warning time in ms
   * @param {number} minTime - Minimum warning time (default 800ms)
   * @returns {number} Scaled warning time
   */
  scaleWarningTime(baseTime, minTime = 800) {
    const difficulty = this.getDifficultyMultiplier();
    // At 1.5x difficulty, warning is 1/1.5 = 67% of base time
    return Math.max(minTime, Math.floor(baseTime / difficulty));
  }

  /** Linger damage check over an area to punish players who walk into active effect sprites */
  createDamageZone(tiles, duration) {
    this.scene.time.addEvent({
      delay: 100,
      repeat: Math.floor(duration / 100) - 1,
      callback: () => {
        if (this.scene.isGameOver) return;
        const p = this.scene.player;
        if (tiles.some(t => t.c === p.col && t.r === p.row)) {
          p.takeDamage();
        }
      }
    });
  }

  // ================= CHAPTER 1 BLOOD MECHANICS =================

  ch1AttackCrimsonSplatter() {
    const numAttacks = Phaser.Math.Between(3, 4);
    const warningTime = this.scaleWarningTime(1500);
    for (let i = 0; i < numAttacks; i++) {
      const c = Phaser.Math.Between(0, this.grid.cols - 1);
      const r = Phaser.Math.Between(0, this.grid.rows - 1);
      this.grid.telegraph(c, r, warningTime);

      this.scene.time.delayedCall(warningTime, () => {
        const dest = this.grid.getPixelPosition(c, r);
        const startY = dest.y - 450; // Drop from sky high

        audioManager.play('ch1_splatter_drop', { volume: 0.8 });

        // Force angle downwards naturally, scale up the 16px beam to be 6x larger
        const blood = this.scene.add.sprite(dest.x, startY, 'blood_chem', 6);
        blood.setDisplaySize(80, 20).setRotation(Math.PI / 2).setDepth(30);

        this.scene.tweens.add({
          targets: blood, y: dest.y, duration: 400, ease: 'Power2',
          onComplete: () => {
            blood.destroy();
            // Scale up the 32px splat to 5x
            const splat = this.scene.add.sprite(dest.x, dest.y, 'blood_splat_000').setScale(5.0).setDepth(20);
            splat.play('anim_blood_splat').once('animationcomplete', () => splat.destroy());
            audioManager.play('ch1_splatter_burst', { volume: 0.9 });

            // Native Area Damage Check
            if (this.scene.player.col === c && this.scene.player.row === r) {
              this.scene.player.takeDamage();
            }
          }
        });
      });
    }
    // Execution duration is precisely 1500ms warning + 400ms physical impact
    return 1900;
  }

  ch1AttackBleedingEye() {
    // Lock onto player immediately but do not adjust!
    const c = this.scene.player.col;
    const r = this.scene.player.row;
    const warningTime = this.scaleWarningTime(1500);
    this.grid.telegraph(c, r, warningTime);

    // Spawn eye off-screen (top-left or top-right)
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -50 : this.scene.scale.width + 50;
    const startY = -100;

    const dest = this.grid.getPixelPosition(c, r);

    // Rotate to face travel direction — sprite natively faces UP so offset by +90°
    const angle = Math.atan2(dest.y - startY, dest.x - startX) + Math.PI / 2;

    const eye = this.scene.add.sprite(startX, startY, 'ch1_eye')
      .setScale(1.5).setDepth(40).setRotation(angle);
    eye.play('anim_ch1_eye');
    audioManager.play('ch1_eye_whoosh', { volume: 0.85 });

    // Animate to target over 1.5s warning period (giving the dripping trail time to render continuously)
    this.scene.tweens.add({
      targets: eye, x: dest.x, y: dest.y, duration: 1500, ease: 'Cubic.easeIn',
      onComplete: () => {
        eye.destroy();
        // Eye explosion FX
        const splat = this.scene.add.sprite(dest.x, dest.y, 'eye_explosion').setScale(2.0).setDepth(22);
        splat.play('anim_eye_explosion').once('animationcomplete', () => splat.destroy());
        audioManager.play('ch1_eye_land', { volume: 1.0 });
        // Exact Area Damage Check
        if (this.scene.player.col === c && this.scene.player.row === r) {
          this.scene.player.takeDamage();
        }
      }
    });

    // Dripping Trail loop - stamps a dark frame every 50 ms in its wake
    const dripCount = Math.floor(1500 / 50);
    const dripTimer = this.scene.time.addEvent({
      delay: 50, repeat: dripCount - 1,
      callback: () => {
        // Dark blood is 16px native. Scale up 7x for a wide, heavy trail
        const drip = this.scene.add.sprite(eye.x, eye.y, 'dark_blood_0').setScale(7.0).setDepth(35);
        drip.play('anim_dark_blood');
        this.scene.tweens.add({
          targets: drip, alpha: 0, scale: 2.0, y: drip.y + 60, duration: 800, onComplete: () => drip.destroy()
        });
      }
    });

    // Execution physically takes 1500ms to arrive directly at the target, and splat clears itself organically
    return 1500;
  }

  ch1AttackBloodVolley() {
    // Rhythm Combo: 3 to 5 rapid burst beats
    const numShots = Phaser.Math.Between(3, 5);
    let sequenceDelay = 0;

    for (let i = 0; i < numShots; i++) {
      this.scene.time.delayedCall(sequenceDelay, () => {
        const roll = Math.random();
        let handImg = 'ch1_hand1';
        let startLoc = { x: 0, y: 0 };

        // Recompute target on the player at the start of each individual beat to force them to react constantly
        const targetCol = Phaser.Math.Clamp(this.scene.player.col, 0, this.grid.cols - 1);
        const targetRow = Phaser.Math.Clamp(this.scene.player.row, 0, this.grid.rows - 1);
        const dest = this.grid.getPixelPosition(targetCol, targetRow);

        let scaleOverride = 1.0;

        // Tether spawns VISIBLY ON the border of the physical grid so it plays nice with tight camera zooms.
        const gridRight = this.grid.offsetX + (this.grid.cols * this.grid.tileSize);
        const gridTop = this.grid.offsetY;
        const gridBottom = this.grid.offsetY + (this.grid.rows * this.grid.tileSize);

        if (roll < 0.33) {
          handImg = 'ch1_hand1'; // Native: 1080x1663 -> Scale down heavily
          startLoc = { x: dest.x, y: gridBottom - 10 }; // Just barely hugging the bottom tile line
          scaleOverride = 0.09;
        } else if (roll < 0.66) {
          handImg = 'ch1_hand2'; // Native: 344x240 -> Mid scale
          startLoc = { x: gridRight - 40, y: gridTop + 20 }; // Pushed significantly IN to the grid top-right
          scaleOverride = 0.35;
        } else {
          handImg = 'ch1_hand3'; // Native: 181x322 -> Less scaled down
          startLoc = { x: gridRight - 40, y: gridBottom - 40 }; // Pushed significantly IN to the grid bottom-right
          scaleOverride = 0.5;
        }

        // Hand flashes into view
        const hand = this.scene.add.sprite(startLoc.x, startLoc.y, handImg).setScale(scaleOverride).setDepth(50);

        // Calculate angle once to point hand toward target
        const targetAngle = Math.atan2(dest.y - startLoc.y, dest.x - startLoc.x);

        // Adjust base rotations so fingers point correctly
        // ch1_hand1 points UP by default ( -Math.PI/2 )
        // ch1_hand2 faces top-right
        // ch1_hand3 faces bottom-right
        if (handImg === 'ch1_hand1') hand.setRotation(targetAngle + Math.PI / 2);
        else hand.setRotation(targetAngle);

        const warningMs = this.scaleWarningTime(1000, 600);
        this.grid.telegraph(targetCol, targetRow, warningMs);

        this.scene.time.delayedCall(warningMs, () => {
          hand.destroy();
          audioManager.play('ch1_volley_shoot', { volume: 0.85 });
          const blood = this.scene.add.sprite(startLoc.x, startLoc.y, 'blood_chem', 6).setDisplaySize(80, 20).setDepth(45);

          // Calculates precise geometry projection angle to face the target exactly
          const angle = Math.atan2(dest.y - startLoc.y, dest.x - startLoc.x);
          blood.setRotation(angle);

          // Blood trail: stamp blood_chem images along the path
          const trailTimer = this.scene.time.addEvent({
            delay: 30, repeat: Math.floor(200 / 30) - 1,
            callback: () => {
              if (!blood || !blood.active) return;
              const trail = this.scene.add.sprite(blood.x, blood.y, 'blood_chem', 6)
                .setDisplaySize(60, 15).setDepth(40).setAlpha(0.7).setRotation(angle);
              this.scene.tweens.add({ targets: trail, alpha: 0, scale: 0.02, duration: 300, onComplete: () => trail.destroy() });
            }
          });

          // High-speed beam connection
          this.scene.tweens.add({
            targets: blood, x: dest.x, y: dest.y, duration: 200,
            onComplete: () => {
              blood.destroy();
              trailTimer.remove();
              const splat = this.scene.add.sprite(dest.x, dest.y, 'blood_splat_000').setScale(5.0).setDepth(20);
              splat.play('anim_blood_splat').once('animationcomplete', () => splat.destroy());
              audioManager.play('ch1_volley_burst', { volume: 0.9 });
              audioManager.playBloodHit();

              if (this.scene.player.col === targetCol && this.scene.player.row === targetRow) {
                this.scene.player.takeDamage();
              }
            }
          });
        });
      });
      sequenceDelay += 1300; // Perfect Rhythm interval space
    }
    // Execution physically encompasses the staggered looping timing until the final beam lands
    return (numShots - 1) * 1300 + 1200;
  }

  /** Chapter 1 Ultimate: Blood Vortex - Pulls player to center grid but deals NO damage */
  ch1AttackBloodVortexPull() {
    const centerCol = Math.floor(this.grid.cols / 2);
    const centerRow = Math.floor(this.grid.rows / 2);
    const centerPos = this.grid.getPixelPosition(centerCol, centerRow);
    
    // Visual: Blood vortex forms at center
    const vortex = this.scene.add.sprite(centerPos.x, centerPos.y, 'ult_start')
      .setScale(0.5)
      .setDepth(50)
      .play('anim_ult_start');
    audioManager.play('ch1_vortex_spawn', { volume: 1.0 });
    
    // Shake camera during vortex formation
    this.scene.cameras.main.shake(1000, 0.02);
    
    // Loop the vortex animation
    vortex.once('animationcomplete', () => {
      vortex.play('anim_ult_loop');
    });
    
    // Pull effect: Step the player one tile at a time toward center
    const pullDuration = 1500;
    const player = this.scene.player;

    // Compute step sequence (one tile per step toward center)
    const steps = [];
    let curCol = player.col;
    let curRow = player.row;
    while (curCol !== centerCol || curRow !== centerRow) {
      const dCol = curCol < centerCol ? 1 : (curCol > centerCol ? -1 : 0);
      const dRow = curRow < centerRow ? 1 : (curRow > centerRow ? -1 : 0);
      steps.push({ dCol, dRow });
      curCol += dCol;
      curRow += dRow;
      if (steps.length > 20) break; // safety
    }

    const stepDelay = steps.length > 0 ? pullDuration / steps.length : pullDuration;

    steps.forEach((s, i) => {
      this.scene.time.delayedCall((i + 1) * stepDelay, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;

        // Use Player.forceMove which exists and handles tweening correctly
        player.forceMove(s.dCol, s.dRow, Math.min(180, stepDelay));
        audioManager.play('ch1_vortex_pull', { volume: 0.7 });

        // Visual trail effect at player's new tile
        const trailPos = this.grid.getPixelPosition(player.col, player.row);
        const trail = this.scene.add.sprite(trailPos.x, trailPos.y, 'dark_blood_0')
          .setDisplaySize(this.grid.tileSize * 0.8, this.grid.tileSize * 0.8)
          .setDepth(30)
          .setAlpha(0.5);

        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.5,
          duration: 500,
          onComplete: () => trail.destroy()
        });
      });
    });
    
    // End vortex after pull completes
    this.scene.time.delayedCall(pullDuration + 200, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      vortex.play('anim_ult_end');
      vortex.once('animationcomplete', () => vortex.destroy());
    });
    
    // Return total duration (NO damage dealt - just positioning change)
    return pullDuration + 1000;
  }

  // ================= CHAPTER 2: BUNGISNGIS MECHANICS =================

  /** Beeswarm Overlay — fires on top of real attacks as a visual distraction */
  _ch2BeeswarmOverlay() {
    // Play bee swarm spawn sound
    const swarmVariant = Phaser.Math.Between(1, 3);
    audioManager.play(`ch2_bee_swarm${swarmVariant === 1 ? '' : '_' + swarmVariant}`, { volume: 0.7 });

    const scale = this.grid.tileSize * 1.8;
    const travelTime = 3500; // Slow sweep across full board

    const executeSwarm = (fromLeft) => {
      // Full board cloud sweep: bees spawn across entire grid area and sweep across
      const gridLeft = this.grid.offsetX;
      const gridRight = this.grid.offsetX + this.grid.cols * this.grid.tileSize;
      const gridTop = this.grid.offsetY;
      const gridBottom = this.grid.offsetY + this.grid.rows * this.grid.tileSize;
      const gridWidth = this.grid.cols * this.grid.tileSize;
      const gridHeight = this.grid.rows * this.grid.tileSize;
      
      // Spawn bees across the entire grid area (full board coverage)
      for (let i = 0; i < 100; i++) {
        // Random position within the entire grid (full board spread)
        const offsetX = Phaser.Math.Between(-100, gridWidth + 100);
        const offsetY = Phaser.Math.Between(-50, gridHeight + 50);
        
        const startX = fromLeft ? gridLeft + offsetX - 200 : gridRight - offsetX + 200;
        const startY = gridTop + offsetY;
        
        const beeScale = scale * Phaser.Math.FloatBetween(0.5, 1.1);
        
        const bee = this.scene.add.sprite(startX, startY, 'ch2_beeswarm')
          .setDisplaySize(beeScale, beeScale)
          .setDepth(50 + i)
          .setFlipX(!fromLeft);
          
        bee.setTint(i % 4 === 0 ? 0xbbbbbb : (i % 3 === 0 ? 0xdddddd : 0xffffff));
        bee.setAlpha(Phaser.Math.FloatBetween(0.6, 0.9));
          
        bee.play('anim_ch2_beeswarm_in').once('animationcomplete', () => bee.play('anim_ch2_beeswarm_loop'));

        // Horizontal sweep with slight vertical drift
        const endX = fromLeft ? startX + gridWidth + 400 : startX - gridWidth - 400;
        this.scene.tweens.add({
          targets: bee,
          x: endX,
          y: startY + Phaser.Math.Between(-80, 80),
          duration: travelTime + Phaser.Math.Between(-400, 400), 
          ease: 'Linear',
          onComplete: () => {
            if (bee.active) {
              bee.play('anim_ch2_beeswarm_out').once('animationcomplete', () => bee.destroy());
            }
          }
        });
      }
      // NO damage - purely visual distraction
    };

    // Two swarms traversing simultaneously from both sides
    executeSwarm(true);   // Left to right
    executeSwarm(false);  // Right to left
    // No return value — this is a background overlay, not an attack turn
  }

  /** Attack 2: Hibiscus Pollen Burst — Concentric Rings Sequence */
  ch2AttackHibiscus() {
    const mc = Math.floor(this.grid.cols / 2);
    const mr = Math.floor(this.grid.rows / 2);
    const centerPos = this.grid.getPixelPosition(mc, mr);

    // Telegraph center
    this.grid.telegraph(mc, mr, 800);

    // Play nature summon sound for hibiscus appearance
    audioManager.play('ch2_nature_summon', { volume: 0.75 });

    // SCALE: Hibiscus landing sprite — change tileSize multiplier to resize
    const hibiscusScale = this.grid.tileSize * 2.0;
    const hibiscus = this.scene.add.sprite(centerPos.x, centerPos.y - 200, 'ch2_hibiscus')
      .setDisplaySize(hibiscusScale, hibiscusScale)
      .setDepth(35)
      .setAlpha(0);

    // Drop the hibiscus onto the center tile
    this.scene.tweens.add({
      targets: hibiscus,
      y: centerPos.y, alpha: 1,
      duration: 800, ease: 'Bounce.easeOut',
      onComplete: () => {
        hibiscus.play('anim_ch2_hibiscus');
        // Play plant growth/pop sound on land
        audioManager.play('ch2_plant_pop', { volume: 0.8 });
        
        // Delay before beginning the burst sequence
        this.scene.time.delayedCall(1200, () => {
          if (this.hp <= 0) return;

          // Visual wobble for anticipation
          this.scene.tweens.add({
            targets: hibiscus,
            scaleX: hibiscusScale * 1.15,
            scaleY: hibiscusScale * 0.85,
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              if (this.hp <= 0) return;
              
              const burstScale = this.grid.tileSize * 1.5;

              // Sequence 0: burst Center tile
              const b = this.scene.add.sprite(centerPos.x, centerPos.y, 'ch2_hibiscus_burst')
                .setDisplaySize(burstScale, burstScale).setDepth(36);
              b.play('anim_ch2_hibiscus_burst');
              b.once('animationcomplete', () => b.destroy());
              this.createDamageZone([{c: mc, r: mr}], 1500);

              // Play pollen burst sound for center
              const pollenVariant = Phaser.Math.Between(1, 2);
              audioManager.play(`ch2_pollen_burst${pollenVariant === 1 ? '' : '_' + pollenVariant}`, { volume: 0.85 });
              // Play spore release sound
              audioManager.play('ch2_spore_release', { volume: 0.6 });

              // Destroy plant with a nice fade-out so it doesn't just vanish
              this.scene.tweens.add({
                targets: hibiscus, alpha: 0, scale: hibiscus.scale * 1.5,
                duration: 600, onComplete: () => hibiscus.destroy()
              });

              // True chain reaction: each ring only fires AFTER previous ring's animation ends
              const maxDist = Math.max(mc, this.grid.cols - 1 - mc, mr, this.grid.rows - 1 - mr);
              
              const fireRing = (d) => {
                if (d > maxDist || this.hp <= 0) return;
                
                const ringTiles = [];
                for (let c = 0; c < this.grid.cols; c++) {
                  for (let r = 0; r < this.grid.rows; r++) {
                    if (Math.max(Math.abs(c - mc), Math.abs(r - mr)) === d) ringTiles.push({ c, r });
                  }
                }

                // Telegraph this ring
                ringTiles.forEach(t => this.grid.telegraph(t.c, t.r, 500));

                this.scene.time.delayedCall(500, () => {
                  if (this.hp <= 0) return;

                  // Play pollen burst sound for ring expansion
                  const ringPollenVariant = Phaser.Math.Between(1, 2);
                  audioManager.play(`ch2_pollen_burst${ringPollenVariant === 1 ? '' : '_' + ringPollenVariant}`, { volume: 0.7 - (d * 0.05) }); // Slightly quieter for outer rings

                  let animsComplete = 0;
                  ringTiles.forEach(t => {
                    const dest = this.grid.getPixelPosition(t.c, t.r);
                    const ringBurst = this.scene.add.sprite(dest.x, dest.y, 'ch2_hibiscus_burst')
                      .setDisplaySize(burstScale, burstScale).setDepth(36);
                    ringBurst.play('anim_ch2_hibiscus_burst');
                    ringBurst.once('animationcomplete', () => {
                      ringBurst.destroy();
                      animsComplete++;
                      // When ALL tiles in this ring finish animating, fire the next ring
                      if (animsComplete >= ringTiles.length) {
                        fireRing(d + 1);
                      }
                    });
                  });

                  // Damage only while animation is playing
                  this.createDamageZone(ringTiles, 1800);
                });
              };

              fireRing(1);
            }
          });
        });
      }
    });

    return 6000; // Generous duration to allow full chain to complete
  }

  /** Attack 3: Strangling Vines — Immobilization + Gesture QTE */
  ch2AttackVines() {
    const pCol = this.scene.player.col;
    const pRow = this.scene.player.row;

    // Play vine swish sound at start
    const vineVariant = Phaser.Math.Between(1, 4);
    audioManager.play(`ch2_vine_swish${vineVariant === 1 ? '' : '_' + vineVariant}`, { volume: 0.75 });

    // Telegraph a 3x3 area centered on player
    const vineTiles = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const c = Phaser.Math.Clamp(pCol + dx, 0, this.grid.cols - 1);
        const r = Phaser.Math.Clamp(pRow + dy, 0, this.grid.rows - 1);
        vineTiles.push({ c, r });
        this.grid.telegraph(c, r, 1200);
      }
    }

    // After warning, spawn vines and check if player is caught
    this.scene.time.delayedCall(1200, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;

      // Play plant growth sound when vines spawn
      const growVariant = Phaser.Math.Between(1, 2);
      audioManager.play(`ch2_plant_grow${growVariant === 1 ? '' : '_' + growVariant}`, { volume: 0.8 });

      // Spawn vine animations on EVERY tile in the 3x3 regardless of escape
      const vineSprites = [];
      const vineScale = this.grid.tileSize * 1.6;
      vineTiles.forEach(t => {
        const dest = this.grid.getPixelPosition(t.c, t.r);
        const vine = this.scene.add.sprite(dest.x, dest.y, 'ch2_vines')
          .setDisplaySize(vineScale, vineScale) // 1 to 1 instead of 1.2 height
          .setDepth(25);
        vine.play('anim_ch2_vines_grow');
        vine.once('animationcomplete', () => vine.play('anim_ch2_vines_idle'));
        vineSprites.push(vine);
      });

      // Check if player is ACTUALLY in the zone to be frozen
      const caught = vineTiles.some(t => t.c === this.scene.player.col && t.r === this.scene.player.row);
      if (!caught) {
        // Player escaped! Just let the vines despawn automatically after 2s
        this.scene.time.delayedCall(2000, () => {
          vineSprites.forEach(v => {
            v.play('anim_ch2_vines_shrink');
            v.once('animationcomplete', () => v.destroy());
          });
        });
        return; 
      }

      // Freeze the player
      this.scene.player.isFrozen = true;
      this.scene.player.sprite.setTint(0x44aa44);
      const playerPos = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);



      // QTE: Show 5 random arrow prompts
      const directions = ['up', 'down', 'left', 'right'];
      const arrows = { up: '⬆', down: '⬇', left: '⬅', right: '➡' };
      const QTE_COUNT = 5;
      const sequence = [];
      for (let i = 0; i < QTE_COUNT; i++) sequence.push(Phaser.Math.RND.pick(directions));

      let qteIndex = 0;
      const qteTexts = [];

      // Render all 5 arrows above the player
      const arrowSpacing = 36;
      const arrowStartX = playerPos.x - ((QTE_COUNT - 1) / 2) * arrowSpacing;
      for (let i = 0; i < QTE_COUNT; i++) {
        const txt = this.scene.add.text(
          arrowStartX + i * arrowSpacing, playerPos.y - 70,
          arrows[sequence[i]],
          { fontFamily: 'VCR', fontSize: '26px', color: i === 0 ? '#ffff00' : '#888888', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(600);
        qteTexts.push(txt);
      }

      const titleTxt = this.scene.add.text(playerPos.x, playerPos.y - 100, 'BREAK FREE!', {
        fontFamily: 'GigaSaturn', fontSize: '16px', color: '#ff4444', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(600);

      // Listen for correct gestures/keys
      const onGesture = (direction) => {
        if (this.scene.isGameOver || qteIndex >= QTE_COUNT) return;
        if (direction.toLowerCase() === sequence[qteIndex]) {
          // Correct! Highlight completed arrow green
          qteTexts[qteIndex].setColor('#00ff00');
          qteIndex++;
          if (qteIndex < QTE_COUNT) {
            qteTexts[qteIndex].setColor('#ffff00'); // Highlight next
          }
          if (qteIndex >= QTE_COUNT) {
            // QTE complete! Free the player
            cleanupQte(true);
          }
        }
      };

      // Keyboard handler so arrow keys / D-pad also work
      const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const onKeyDown = (e) => {
        if (keyMap[e.key]) {
          e.preventDefault();
          onGesture(keyMap[e.key]);
        }
      };
      window.addEventListener('keydown', onKeyDown);

      const cleanupQte = (escaped) => {
        // Unsub gesture + keyboard
        window.removeEventListener('keydown', onKeyDown);
        if (this.scene._vineQteUnsub) {
          this.scene._vineQteUnsub();
          this.scene._vineQteUnsub = null;
        }
        // Remove arrows
        qteTexts.forEach(t => t.destroy());
        titleTxt.destroy();
        // Unfreeze player
        this.scene.player.isFrozen = false;
        this.scene.player.sprite.clearTint();
        // Shrink vines
        vineSprites.forEach(v => {
          if (v.active) {
            v.play('anim_ch2_vines_shrink');
            v.once('animationcomplete', () => v.destroy());
          }
        });

        if (escaped) {
          const txt = this.scene.add.text(playerPos.x, playerPos.y - 60, 'ESCAPED!', {
            fontFamily: 'VCR', fontSize: '20px', color: '#00ff00', stroke: '#000', strokeThickness: 5
          }).setOrigin(0.5).setDepth(600);
          this.scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
        }
      };

      // Subscribe to gesture events
      this.scene._vineQteUnsub = state.on('gesture:detected', onGesture);

      // 10 second window to escape — deal damage only if they completely failed
      this.scene.time.delayedCall(10000, () => {
        if (qteIndex < QTE_COUNT && this.scene.player.isFrozen) {
          // Failed to escape in time — deal real damage
          this.scene.player.takeDamage();
          cleanupQte(false);
        }
      });
    });

    return 4000;
  }

  /** Attack 4: Carrot Rain — Line Attack */
  _ch2AttackCarrotRainLegacy() {
    // Pick 1 to 3 distinct rows OR distinct columns (NO diagonals)
    const isRow = Math.random() > 0.5;
    const numLines = Phaser.Math.Between(1, 3);
    const chosenLines = [];

    while (chosenLines.length < numLines) {
      const idx = Phaser.Math.Between(0, (isRow ? this.grid.rows : this.grid.cols) - 1);
      if (!chosenLines.includes(idx)) chosenLines.push(idx);
    }

    const tiles = [];
    chosenLines.forEach(idx => {
      if (isRow) {
        for (let c = 0; c < this.grid.cols; c++) tiles.push({ c, r: idx });
      } else {
        for (let r = 0; r < this.grid.rows; r++) tiles.push({ c: idx, r });
      }
    });

    // Telegraph all tiles
    tiles.forEach(t => this.grid.telegraph(t.c, t.r, 1500));

    // Stagger carrot drops
    tiles.forEach((t, i) => {
      this.scene.time.delayedCall(1500 + i * 150, () => {
        if (this.hp <= 0) return;
        const dest = this.grid.getPixelPosition(t.c, t.r);
        // Carrots fall from top-right
        const startX = dest.x + 200;
        const startY = dest.y - 350;

        // SCALE: Carrot sprite — change tileSize multiplier to resize
        const carrotScale = this.grid.tileSize * 1.5;
        const carrot = this.scene.add.sprite(startX, startY, 'ch2_carrot')
          .setDisplaySize(carrotScale, carrotScale) // ← SCALE CONTROL
          .setDepth(40)
          .setRotation(-0.5); // Slight angle for falling from top-right

        this.scene.tweens.add({
          targets: carrot,
          x: dest.x, y: dest.y,
          rotation: 0,
          duration: 350, ease: 'Power2',
          onComplete: () => {
            carrot.play('anim_ch2_carrot');
            carrot.once('animationcomplete', () => carrot.destroy());
            // Damage check on impact - lingers for the duration of the animation
            this.createDamageZone([{ c: t.c, r: t.r }], 1200);
          }
        });
      });
    });

    return 1500 + tiles.length * 150 + 500;
  }

  /** Attack 5: Exploding Eggs — Spot Hazard */
  /** Attack 4: Carrot Rain - staged meteor barrage with safe gaps */
  ch2AttackCarrotRain() {
    // Play nature magic sound at start of carrot rain
    audioManager.play('ch2_nature_magic_2', { volume: 0.7 });

    const carrotScale = this.grid.tileSize * 1.45;
    const telegraphMs = 850;
    const impactDamageMs = 900;

    const pickUnique = (max, count) => {
      const values = Array.from({ length: max }, (_, i) => i);
      Phaser.Utils.Array.Shuffle(values);
      return values.slice(0, count);
    };

    const makeHorizontalLane = (row) => {
      const gap = Phaser.Math.Clamp(this.scene.player.col + Phaser.Math.Between(-1, 1), 0, this.grid.cols - 1);
      const tiles = [];
      for (let c = 0; c < this.grid.cols; c++) {
        if (c !== gap) tiles.push({ c, r: row });
      }
      return tiles;
    };

    const makeVerticalLane = (col) => {
      const gap = Phaser.Math.Clamp(this.scene.player.row + Phaser.Math.Between(-1, 1), 0, this.grid.rows - 1);
      const tiles = [];
      for (let r = 0; r < this.grid.rows; r++) {
        if (r !== gap) tiles.push({ c: col, r });
      }
      return tiles;
    };

    const dropCarrot = (tile, index, fromRight = true) => {
      const dest = this.grid.getPixelPosition(tile.c, tile.r);
      const startX = dest.x + (fromRight ? 260 : -260) + Phaser.Math.Between(-35, 35);
      const startY = dest.y - 390 - Phaser.Math.Between(0, 80);
      const carrot = this.scene.add.sprite(startX, startY, 'ch2_carrot')
        .setDisplaySize(carrotScale, carrotScale)
        .setDepth(40 + (index % 5))
        .setRotation(fromRight ? -0.75 : 0.75);

      const ring = this.scene.add.graphics().setDepth(39);
      ring.lineStyle(3, 0xff7a18, 0.9);
      ring.strokeCircle(dest.x, dest.y, this.grid.tileSize * 0.42);
      this.scene.tweens.add({
        targets: ring,
        alpha: 0,
        scaleX: 1.7,
        scaleY: 1.7,
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy()
      });

      this.scene.tweens.add({
        targets: carrot,
        x: dest.x,
        y: dest.y,
        rotation: 0,
        duration: 310,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          carrot.play('anim_ch2_carrot');
          carrot.once('animationcomplete', () => carrot.destroy());
          this.scene.cameras.main.shake(80, 0.006);
          // Play nature burst sound on impact
          const burstVariant = Phaser.Math.Between(1, 3);
          audioManager.play(`ch2_nature_burst${burstVariant === 1 ? '' : '_' + burstVariant}`, { volume: 0.75 });
          this.createDamageZone([{ c: tile.c, r: tile.r }], impactDamageMs);
        }
      });
    };

    const scheduleWave = (tiles, waveDelay, staggerMs, fromRight = true) => {
      this.scene.time.delayedCall(waveDelay, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;
        tiles.forEach(tile => this.grid.telegraph(tile.c, tile.r, telegraphMs));
      });

      tiles.forEach((tile, i) => {
        this.scene.time.delayedCall(waveDelay + telegraphMs + i * staggerMs, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          dropCarrot(tile, i, fromRight);
        });
      });
    };

    const rowTiles = pickUnique(this.grid.rows, 2).flatMap(makeHorizontalLane);
    const colTiles = pickUnique(this.grid.cols, 2).flatMap(makeVerticalLane);

    scheduleWave(rowTiles, 0, 75, true);
    scheduleWave(colTiles, 1450, 65, false);

    this.scene.time.delayedCall(2850, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const pc = this.scene.player.col;
      const pr = this.scene.player.row;
      const finaleTiles = [];

      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const c = pc + dc;
          const r = pr + dr;
          if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) continue;
          if (c === pc && r === pr) continue;
          finaleTiles.push({ c, r });
        }
      }

      scheduleWave(finaleTiles, 0, 55, Math.random() > 0.5);
    });

    return 5200;
  }

  ch2AttackExplodingEggs() {
    // Play plant summon sound for egg spawn
    audioManager.play('ch2_nature_summon_2', { volume: 0.75 });

    const numEggs = Phaser.Math.Between(5, 10);
    const chosen = [];

    for (let i = 0; i < numEggs; i++) {
      let c, r, attempts = 0;
      do {
        c = Phaser.Math.Between(0, this.grid.cols - 1);
        r = Phaser.Math.Between(0, this.grid.rows - 1);
        attempts++;
      } while (attempts < 15 && chosen.some(t => t.c === c && t.r === r));
      chosen.push({ c, r });
    }

    // Telegraph
    chosen.forEach(t => this.grid.telegraph(t.c, t.r, 1500));

    // Drop eggs after warning
    chosen.forEach(t => {
      this.scene.time.delayedCall(1500, () => {
        if (this.hp <= 0) return;
        const dest = this.grid.getPixelPosition(t.c, t.r);

        // SCALE: Egg sprite — change tileSize multiplier to resize
        const eggScale = this.grid.tileSize * 1.4;
        const egg = this.scene.add.sprite(dest.x, dest.y - 150, 'ch2_eggs')
          .setDisplaySize(eggScale, eggScale * 1.2) // ← SCALE CONTROL (w, h)
          .setDepth(40);

        this.scene.tweens.add({
          targets: egg,
          y: dest.y,
          duration: 400, ease: 'Bounce.easeOut',
          onComplete: () => {
            egg.play('anim_ch2_eggs');
            egg.once('animationcomplete', () => egg.destroy());
            this.scene.cameras.main.shake(150, 0.01);
            // Play egg crack/explosion sound
            const crackVariant = Phaser.Math.Between(1, 2);
            audioManager.play(`ch2_egg_crack${crackVariant === 1 ? '' : '_' + crackVariant}`, { volume: 0.85 });
            // Play nature burst sound for extra impact
            audioManager.play('ch2_nature_burst', { volume: 0.7 });
            // Persistent damage zone while it explodes
            this.createDamageZone([{c: t.c, r: t.r}], 1800);
          }
        });
      });
    });

    return 1600;
  }

  /** Attack 6: Snapping Flora — Melee Trap (Persistent, fire-and-forget) */
  ch2AttackSnappingFlora() {
    // Play plant pop sound at start of snapping flora spawn
    audioManager.play('ch2_plant_pop', { volume: 0.7 });

    for (let i = 0; i < 3; i++) {
      // Find a safe tile ≥2 tiles from the player
      let pc, pr, attempts = 0;
      do {
        pc = Phaser.Math.Between(0, this.grid.cols - 1);
        pr = Phaser.Math.Between(0, this.grid.rows - 1);
        attempts++;
      } while (attempts < 20 && (
        Math.abs(pc - this.scene.player.col) + Math.abs(pr - this.scene.player.row) < 2 ||
        this.grid.hasChestAt(pc, pr) ||
        this.grid.cells[pr][pc].status !== 'safe' ||
        this.scene.persistentEntities.some(e => e.col === pc && e.row === pr)
      ));

      // If we couldn't find a spot after 20 tries (unlikely unless grid is packed), skip
      if (attempts >= 20) continue;

      const pos = this.grid.getPixelPosition(pc, pr);
      this.grid.setCellStatus(pc, pr, 'locked', 0x336633);

      // SCALE: Melee plant sprite — change multiplier to resize
      const plantScale = this.grid.tileSize / 64 * 1.8;
      const plant = this.scene.add.sprite(pos.x, pos.y, 'ch2_plant_melee', 0)
        .setScale(plantScale) // ← SCALE CONTROL
        .setDepth(18)
        .setAlpha(0);

      // Add a persistent light red danger cross indicating its melee range (up, down, left, right)
      // Clamp each arm so it stays strictly within the board edges
      const size = this.grid.tileSize;
      const gridLeft   = this.grid.offsetX;
      const gridRight  = this.grid.offsetX + this.grid.cols * this.grid.tileSize;
      const gridTop    = this.grid.offsetY;
      const gridBottom = this.grid.offsetY + this.grid.rows * this.grid.tileSize;

      const dangerZone = this.scene.add.graphics();

      dangerZone.setDepth(15);
      dangerZone.setAlpha(0);

      // Pop-in animation
      this.scene.tweens.add({
        targets: [plant, dangerZone], alpha: 1, duration: 300, ease: 'Back.easeOut'
      });

      // Play plant grow sound for each snapping flora that successfully spawns
      const growVariant = Phaser.Math.Between(1, 2);
      this.scene.time.delayedCall(100, () => {
        audioManager.play(`ch2_plant_grow${growVariant === 1 ? '' : '_' + growVariant}`, { volume: 0.65 });
      });

      const entity = { type: 'melee', col: pc, row: pr, sprite: plant, danger: dangerZone, active: true, _attackCooldown: false };
      this.scene.persistentEntities.push(entity);

      // Remove after 8 seconds
      entity.timer = this.scene.time.delayedCall(8000, () => {
        if (!entity.active) return;
        entity.active = false;
        this.grid.setCellStatus(pc, pr, 'safe');
        this.scene.tweens.add({
          targets: [plant, dangerZone], alpha: 0, scale: 0, duration: 300,
          onComplete: () => {
            plant.destroy();
            dangerZone.destroy();
            const idx = this.scene.persistentEntities.indexOf(entity);
            if (idx !== -1) this.scene.persistentEntities.splice(idx, 1);
          }
        });
      });

      entity.onAttackComplete = () => {
        entity.active = false;
        if (entity.timer) entity.timer.remove();
        this.grid.setCellStatus(entity.col, entity.row, 'safe');
        this.scene.tweens.add({
          targets: [plant, dangerZone], alpha: 0, scale: 0, quantity: 0, duration: 300,
          onComplete: () => {
            plant.destroy();
            dangerZone.destroy();
            const idx = this.scene.persistentEntities.indexOf(entity);
            if (idx !== -1) this.scene.persistentEntities.splice(idx, 1);
          }
        });
      };
    }

    return 1000;
  }

  /** Attack 7: Acid Spitter — 1 plant per line (7 plants total), 1 shot with 3 acid projectiles, more escapable with clear telegraphs */
  ch2AttackAcidSpitter() {
    // Play nature summon sound for acid spitter appearance
    audioManager.play('ch2_nature_summon', { volume: 0.7 });

    const SHOTS_PER_PLANT = 1; // Only 1 shot per plant (but 3 acid projectiles per shot)
    const SHOT_DELAY = 1500; // Delay before the single shot
    const PLANT_SCALE = this.grid.tileSize / 64 * 2.0;
    const PROJ_SCALE  = this.grid.tileSize / 32 * 0.5;
    const SPLAT_SCALE = this.grid.tileSize / 32 * 0.8;

    const gridLeft  = this.grid.offsetX;
    const gridRight = this.grid.offsetX + this.grid.cols * this.grid.tileSize;
    const offscreenPad = 80;

    // 1 plant per row (all 7 rows get a plant)
    const allRows = Array.from({ length: this.grid.rows }, (_, i) => i);
    // Alternate sides: even rows on right, odd rows on left
    const rightRows = allRows.filter(r => r % 2 === 0);
    const leftRows  = allRows.filter(r => r % 2 === 1);

    const totalDuration = SHOTS_PER_PLANT * SHOT_DELAY + 3000;

    const spawnPlantAndFire = (plantRow, side) => {
      const isRight = side === 'right';
      const pixelY  = this.grid.getPixelPosition(0, plantRow).y;
      const pixelX  = isRight ? gridRight + offscreenPad : gridLeft - offscreenPad;

      // Row 3 (frames 14) = left, Row 4 (frames 21) = right  — correct per sprite sheet
      const idleFrame = isRight ? 14 : 21; // left-facing for right-side, right-facing for left-side
      const plant = this.scene.add.sprite(pixelX, pixelY, 'ch2_plant_ranged', idleFrame)
        .setScale(PLANT_SCALE).setDepth(18).setAlpha(0);

      this.scene.tweens.add({ targets: plant, alpha: 1, duration: 400, ease: 'Back.easeOut' });

      // Play plant growth sound when ranged plant spawns
      const growVariant = Phaser.Math.Between(1, 2);
      this.scene.time.delayedCall(100, () => {
        audioManager.play(`ch2_plant_grow${growVariant === 1 ? '' : '_' + growVariant}`, { volume: 0.6 });
      });

      for (let shot = 0; shot < SHOTS_PER_PLANT; shot++) {
        this.scene.time.delayedCall(400 + shot * SHOT_DELAY, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;

          // Pick 3 random UNIQUE columns on THIS plant's own row
          // Always leave at least 1 escape column free for player to dodge
          const targetTiles = [];
          const usedCols = new Set();
          const maxShots = Math.min(3, this.grid.cols - 1); // ensure 1 safe col
          let safety = 0;
          while (targetTiles.length < maxShots && safety++ < 30) {
            const tc = Phaser.Math.Between(0, this.grid.cols - 1);
            if (!usedCols.has(tc)) {
              usedCols.add(tc);
              targetTiles.push({ c: tc, r: plantRow });
            }
          }

          // Telegraph + charge animation: ~833ms for 10 frames @12fps
          const CHARGE_MS = Math.floor(10 / 12 * 1000);
          targetTiles.forEach(({ c, r }) => this.grid.telegraph(c, r, CHARGE_MS + 600));

          // Play attack animation — fire acid exactly when it completes
          plant.play(isRight ? 'anim_ch2_plant_ranged_left' : 'anim_ch2_plant_ranged_right');
          plant.once('animationcomplete', () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;

            targetTiles.forEach(({ c, r }) => {
              const targetPos = this.grid.getPixelPosition(c, r);
              const startX = isRight ? gridRight + 10 : gridLeft - 10;

              // Step 1: Charge at the plant mouth
              const charge = this.scene.add.sprite(pixelX, pixelY, 'ch2_acid_charge', 0)
                .setScale(PROJ_SCALE).setDepth(41);
              charge.play('anim_ch2_acid_charge');

              // Play acid spit sound when charge starts
              const acidVariant = Phaser.Math.Between(1, 3);
              audioManager.play(`ch2_acid_spit${acidVariant === 1 ? '' : '_' + acidVariant}`, { volume: 0.75 });

              charge.once('animationcomplete', () => {
                charge.destroy();

                // Step 2: Travel (Acid-02Repeatable) from edge toward target tile
                const angle = Math.atan2(targetPos.y - pixelY, targetPos.x - pixelX);
                const travel = this.scene.add.sprite(startX, pixelY, 'ch2_acid_travel', 0)
                  .setScale(PROJ_SCALE).setDepth(42).setRotation(angle);
                travel.play('anim_ch2_acid_travel');

                const dist = Math.sqrt((targetPos.x - startX) ** 2 + (targetPos.y - pixelY) ** 2);
                const travelDuration = Math.max(400, dist * 0.8);

                // Pre-spawn splat ONE FRAME before travel ends — no gap!
                const ONE_FRAME = 16;

                this.scene.time.delayedCall(travelDuration - ONE_FRAME, () => {
                  if (this.hp <= 0 || this.scene.isGameOver) return;
                  // Step 3: Splat — last 6 frames of Acid-01.png (frames 10-15)
                  const splat = this.scene.add.sprite(targetPos.x, targetPos.y, 'ch2_acid_charge', 10)
                    .setScale(SPLAT_SCALE).setDepth(20);
                  splat.play('anim_ch2_acid_burst');
                  splat.once('animationcomplete', () => splat.destroy());
                  // Play acid splat sound on impact
                  const splatVariant = Phaser.Math.Between(1, 2);
                  audioManager.play(`ch2_acid_splat${splatVariant === 1 ? '' : '_' + splatVariant}`, { volume: 0.8 });
                  this.createDamageZone([{ c, r }], 1000); // Slightly shorter damage duration
                });

                this.scene.tweens.add({
                  targets: travel,
                  x: targetPos.x, y: targetPos.y,
                  duration: travelDuration, ease: 'Linear',
                  onComplete: () => travel.destroy()
                });
              });
            });
          });
        });
      }

      // Fade plant out after all shots done
      this.scene.time.delayedCall(totalDuration, () => {
        if (plant.active) {
          this.scene.tweens.add({
            targets: plant, alpha: 0, duration: 400,
            onComplete: () => plant.destroy()
          });
        }
      });
    };

    rightRows.forEach(r => spawnPlantAndFire(r, 'right'));
    leftRows.forEach(r  => spawnPlantAndFire(r, 'left'));

    return totalDuration + 500;
  }

  /** Attack 8: Golem Quake Notes - side golems shake note bursts across full rows */
  ch2AttackGolemQuakeNotes() {
    // Play earth rumble sound at start
    audioManager.play('ch2_earth_rumble', { volume: 0.7 });

    const TELEGRAPH_MS = 1000;
    const STEP_MS = 180;
    const NOTE_DAMAGE_MS = 420;
    const noteSize = this.grid.tileSize * 1.45;
    const golemScale = this.grid.tileSize / 90 * 1.05;

    const lanes = [];
    const targetCount = Phaser.Math.Between(2, 3);
    while (lanes.length < targetCount) {
      const row = Phaser.Math.Between(0, this.grid.rows - 1);
      if (!lanes.some(lane => lane.row === row)) {
        lanes.push({ row, fromLeft: lanes.length % 2 === 0 });
      }
    }

    const golems = [];
    const spawnGolem = (lane) => {
      const { row, fromLeft } = lane;
      const sideCol = fromLeft ? 0 : this.grid.cols - 1;
      const pos = this.grid.getPixelPosition(sideCol, row);
      const golem = this.scene.add.sprite(pos.x, pos.y, 'ch2_golem_attack')
        .setScale(0)
        .setDepth(43)
        .setAlpha(1)
        .setFlipX(!fromLeft)
        .play('anim_ch2_golem_attack');

      this.scene.tweens.add({
        targets: golem,
        scale: golemScale,
        duration: 240,
        ease: 'Back.easeOut'
      });

      // Play golem step/thud sound when golem spawns
      const golemVariant = Phaser.Math.Between(1, 2);
      audioManager.play(`ch2_golem_step${golemVariant === 1 ? '' : '_' + golemVariant}`, { volume: 0.8 });

      golems.push(golem);
    };

    lanes.forEach(spawnGolem);

    lanes.forEach(({ row, fromLeft }) => {
      for (let step = 0; step < this.grid.cols - 1; step++) {
        const c = fromLeft ? step + 1 : this.grid.cols - 2 - step;
        this.grid.telegraph(c, row, TELEGRAPH_MS + step * STEP_MS);
      }
    });

    this.scene.time.delayedCall(TELEGRAPH_MS, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      this.scene.cameras.main.shake(600, 0.02);
      // Play golem quake sound when notes start firing
      audioManager.play('ch2_golem_quake', { volume: 0.85 });

      lanes.forEach(({ row, fromLeft }, laneIndex) => {
        for (let step = 0; step < this.grid.cols - 1; step++) {
          const c = fromLeft ? step + 1 : this.grid.cols - 2 - step;
          this.scene.time.delayedCall(laneIndex * 120 + step * STEP_MS, () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;

            const pos = this.grid.getPixelPosition(c, row);
            const notes = this.scene.add.sprite(pos.x, pos.y, 'ch2_notes')
              .setDisplaySize(noteSize, noteSize)
              .setDepth(44)
              .setFlipX(!fromLeft)
              .play('anim_ch2_notes');

            notes.once('animationcomplete', () => notes.destroy());
            // Play note hit sound (randomized)
            const noteVariant = Phaser.Math.Between(1, 2);
            audioManager.play(`ch2_note_hit${noteVariant === 1 ? '' : '_' + noteVariant}`, { volume: 0.6 });
            this.createDamageZone([{ c, r: row }], NOTE_DAMAGE_MS);
          });
        }
      });
    });

    const totalDuration = TELEGRAPH_MS + (this.grid.cols - 1) * STEP_MS + lanes.length * 120 + 900;
    this.scene.time.delayedCall(totalDuration - 500, () => {
      golems.forEach(golem => {
        if (!golem.active) return;
        golem.setTexture('ch2_golem_die');
        golem.play('anim_ch2_golem_die');
        golem.once('animationcomplete', () => golem.destroy());
      });
    });

    return totalDuration;
  }

  /** Chapter 2 ultimate: Note Burst Spiral — edge tiles collapse inward to the center */
  ch2AttackNoteBurstUltimate() {
    if (this.scene.isGameOver || this.hp <= 0 || this._ch2UltimateActive) return 0;

    this._ch2UltimateActive = true;
    this.scene.events.emit('boss:attack');
    this.scene.events.emit('boss:ch2_ult');
    this.scene.cameras.main.shake(350, 0.012);

    // Play ultimate SFX and ultimate start sounds
    audioManager.play('ch2_ultimate', { volume: 0.9 });
    audioManager.play('ch2_wind_gust', { volume: 0.8 });
    audioManager.play('ch2_nature_magic', { volume: 0.9 });

    const spiralTiles = this._buildInwardSpiralTiles();
    const START_DELAY = 450;
    const STEP_MS = 115;
    const TELEGRAPH_MS = 650;
    const BURST_DAMAGE_MS = 420;
    const burstSize = this.grid.tileSize * 1.55;

    spiralTiles.forEach((tile, index) => {
      const warnDelay = START_DELAY + index * STEP_MS;
      const hitDelay = warnDelay + TELEGRAPH_MS;

      this.scene.time.delayedCall(warnDelay, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;
        this.grid.telegraph(tile.c, tile.r, TELEGRAPH_MS);
      });

      this.scene.time.delayedCall(hitDelay, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;

        const pos = this.grid.getPixelPosition(tile.c, tile.r);
        const burst = this.scene.add.sprite(pos.x, pos.y, 'ch2_note_burst')
          .setDisplaySize(burstSize, burstSize)
          .setDepth(45)
          .setAngle(index * 24);

        burst.play('anim_ch2_note_burst');
        burst.once('animationcomplete', () => burst.destroy());
        // Play note burst sound (with rate limiting for performance)
        if (index % 3 === 0) {
          audioManager.play('ch2_note_burst', { volume: 0.7 });
        }
        // Mini screen shake on each burst
        this.scene.cameras.main.shake(80, 0.008);
        this.createDamageZone([{ c: tile.c, r: tile.r }], BURST_DAMAGE_MS);
      });
    });

    const totalDuration = START_DELAY + spiralTiles.length * STEP_MS + TELEGRAPH_MS + BURST_DAMAGE_MS + 300;
    this.scene.time.delayedCall(totalDuration, () => {
      this._ch2UltimateActive = false;
    });

    return totalDuration;
  }

  /** Chapter 2 ultimate: Bunny Stampede — Bouncing bunny arcs from both edges */
  ch2AttackBunnyStampedeUltimate() {
    if (this.scene.isGameOver || this.hp <= 0 || this._ch2UltimateActive) return 0;

    this._ch2UltimateActive = true;
    this.scene.events.emit('boss:attack');
    this.scene.events.emit('boss:ch2_ult');
    this.scene.cameras.main.shake(450, 0.018);

    // Play ultimate SFX and ultimate start sound
    audioManager.play('ch2_ultimate', { volume: 0.9 });
    audioManager.play('ch2_nature_magic_2', { volume: 0.85 });

    const WAVE_COUNT = 4;
    const WAVE_GAP_MS = 900;
    const TELEGRAPH_MS = 700;
    const BOUNCE_DURATION = 700;
    const BUNNY_SCALE = this.grid.tileSize / 64 * 0.5;
    const gridLeft = this.grid.offsetX;
    const gridRight = this.grid.offsetX + this.grid.cols * this.grid.tileSize;

    const spawnBunnyArc = (delay, fromLeft, startRow) => {
      this.scene.time.delayedCall(delay, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;

        // Screen shake when bunny wave starts
        this.scene.cameras.main.shake(120, 0.015);

        // Pick landing spots: 3 bounces across the grid
        const bounces = [];
        let currentCol = fromLeft ? 0 : this.grid.cols - 1;
        let currentRow = startRow;
        
        for (let i = 0; i < 3; i++) {
          const hopCols = Phaser.Math.Between(2, 3);
          const nextCol = fromLeft 
            ? Math.min(this.grid.cols - 1, currentCol + hopCols)
            : Math.max(0, currentCol - hopCols);
          const nextRow = Phaser.Math.Clamp(
            currentRow + Phaser.Math.Between(-1, 1),
            0, this.grid.rows - 1
          );
          bounces.push({ c: nextCol, r: nextRow });
          currentCol = nextCol;
          currentRow = nextRow;
        }

        // Telegraph all landing spots
        bounces.forEach((bounce, i) => {
          this.scene.time.delayedCall(i * 200, () => {
            this.grid.telegraph(bounce.c, bounce.r, TELEGRAPH_MS);
          });
        });

        // Create bunny offscreen
        const startPos = this.grid.getPixelPosition(
          fromLeft ? 0 : this.grid.cols - 1, 
          startRow
        );
        const startX = fromLeft ? gridLeft - 150 : gridRight + 150;
        const startY = startPos.y - 100;

        const bunny = this.scene.add.sprite(startX, startY, 'ch2_bunnies', 0)
          .setScale(BUNNY_SCALE)
          .setDepth(50)
          .setFlipX(!fromLeft)
          .play('anim_ch2_bunnies');

        // Play bunny hop sound when bunny spawns
        const hopVariant = Phaser.Math.Between(1, 2);
        audioManager.play(`ch2_bunny_hop${hopVariant === 1 ? '' : '_' + hopVariant}`, { volume: 0.7 });

        // Animate through bounces
        let bounceIndex = 0;
        const doBounce = () => {
          if (bounceIndex >= bounces.length || this.hp <= 0 || this.scene.isGameOver) {
            // Hop offscreen
            const exitX = fromLeft ? gridRight + 200 : gridLeft - 200;
            this.scene.tweens.add({
              targets: bunny,
              x: exitX,
              y: startY,
              alpha: 0,
              duration: 400,
              ease: 'Power2',
              onComplete: () => bunny.destroy()
            });
            return;
          }

          const target = bounces[bounceIndex];
          const targetPos = this.grid.getPixelPosition(target.c, target.r);

          // Damage on landing
          this.createDamageZone([{ c: target.c, r: target.r }], 300);

          // Play bunny land sound on each bounce
          const landVariant = Phaser.Math.Between(1, 2);
          audioManager.play(`ch2_bunny_land${landVariant === 1 ? '' : '_' + landVariant}`, { volume: 0.75 });

          // Arc bounce tween
          const midX = (bunny.x + targetPos.x) / 2;
          const midY = Math.min(bunny.y, targetPos.y) - 140;

          this.scene.tweens.add({
            targets: bunny,
            x: targetPos.x,
            y: targetPos.y,
            duration: BOUNCE_DURATION,
            ease: 'Sine.easeInOut',
            onUpdate: (tween, target) => {
              const progress = tween.progress;
              const arcHeight = 140 * Math.sin(progress * Math.PI);
              target.y = targetPos.y - arcHeight + (bunny.y - targetPos.y) * (1 - progress);
            },
            onComplete: () => {
              bounceIndex++;
              // Play bunny hop sound for next bounce
              if (bounceIndex < bounces.length) {
                const nextHopVariant = Phaser.Math.Between(1, 2);
                audioManager.play(`ch2_bunny_hop${nextHopVariant === 1 ? '' : '_' + nextHopVariant}`, { volume: 0.6 });
              }
              this.scene.time.delayedCall(150, doBounce);
            }
          });
        };

        // Start bouncing after telegraphs
        this.scene.time.delayedCall(TELEGRAPH_MS, doBounce);
      });
    };

    // Spawn waves from alternating sides
    for (let wave = 0; wave < WAVE_COUNT; wave++) {
      const fromLeft = wave % 2 === 0;
      const rows = this._pickUniqueRows(2);
      rows.forEach((row, i) => {
        spawnBunnyArc(wave * WAVE_GAP_MS + i * 350, fromLeft, row);
      });
    }

    const totalDuration = WAVE_COUNT * WAVE_GAP_MS + 3000;
    this.scene.time.delayedCall(totalDuration, () => {
      this._ch2UltimateActive = false;
    });

    return totalDuration;
  }

  _pickUniqueRows(count) {
    const rows = Array.from({ length: this.grid.rows }, (_, r) => r);
    Phaser.Utils.Array.Shuffle(rows);
    return rows.slice(0, Math.min(count, rows.length));
  }

  _buildInwardSpiralTiles() {
    const tiles = [];
    let left = 0;
    let right = this.grid.cols - 1;
    let top = 0;
    let bottom = this.grid.rows - 1;

    while (left <= right && top <= bottom) {
      for (let c = left; c <= right; c++) tiles.push({ c, r: top });
      for (let r = top + 1; r <= bottom; r++) tiles.push({ c: right, r });

      if (top < bottom) {
        for (let c = right - 1; c >= left; c--) tiles.push({ c, r: bottom });
      }

      if (left < right) {
        for (let r = bottom - 1; r > top; r--) tiles.push({ c: left, r });
      }

      left++;
      right--;
      top++;
      bottom--;
    }

    return tiles;
  }

  spawnDamageTile() {
    // Fairness Rule #3: Spawn relatively close to player (within 2-3 tiles)
    // Retry up to 10 times to avoid landing on a cell that already has a chest
    let tC, tR;
    let attempts = 0;
    do {
      tC = Phaser.Math.Clamp(
        this.scene.player.col + Phaser.Math.Between(-2, 2),
        0, this.grid.cols - 1
      );
      tR = Phaser.Math.Clamp(
        this.scene.player.row + Phaser.Math.Between(-2, 2),
        0, this.grid.rows - 1
      );
      attempts++;
    } while (
      attempts < 10 &&
      ((tC === this.scene.player.col && tR === this.scene.player.row) ||
        this.grid.hasChestAt(tC, tR))
    );

    this.scene.events.emit('damageTile:spawned', tC, tR);

    // Player has 10 seconds to reach the golden tile before it despawns.
    this.scene.time.delayedCall(10000, () => {
      this.scene.events.emit('damageTile:despawned', tC, tR);
      this.grid.render();
    });
  }

  /**
   * Spawn a bawang (garlic/lives up) loot item
   * Spawns relatively close to player but not on their tile
   */
  _spawnBawangLoot() {
    if (this.scene.isGameOver || this.hp <= 0) return;

    // Find a valid spawn spot (near player but not on them)
    let tC, tR;
    let attempts = 0;
    do {
      tC = Phaser.Math.Clamp(
        this.scene.player.col + Phaser.Math.Between(-2, 2),
        0, this.grid.cols - 1
      );
      tR = Phaser.Math.Clamp(
        this.scene.player.row + Phaser.Math.Between(-2, 2),
        0, this.grid.rows - 1
      );
      attempts++;
    } while (
      attempts < 10 &&
      ((tC === this.scene.player.col && tR === this.scene.player.row) ||
        this.grid.hasChestAt(tC, tR) ||
        this.grid.hasRubyAt(tC, tR) ||
        this.grid.hasDiamondAt(tC, tR) ||
        this.grid.hasBawangAt(tC, tR))
    );

    // Spawn the bawang
    this.grid.spawnBawang(tC, tR);
  }

  /**
   * Spawn a chest (power-up) loot item
   * Spawns relatively close to player but not on their tile
   */
  _spawnChestLoot() {
    if (this.scene.isGameOver || this.hp <= 0) return;

    // Find a valid spawn spot (near player but not on them)
    let tC, tR;
    let attempts = 0;
    do {
      tC = Phaser.Math.Clamp(
        this.scene.player.col + Phaser.Math.Between(-2, 2),
        0, this.grid.cols - 1
      );
      tR = Phaser.Math.Clamp(
        this.scene.player.row + Phaser.Math.Between(-2, 2),
        0, this.grid.rows - 1
      );
      attempts++;
    } while (
      attempts < 10 &&
      ((tC === this.scene.player.col && tR === this.scene.player.row) ||
        this.grid.hasChestAt(tC, tR) ||
        this.grid.hasRubyAt(tC, tR) ||
        this.grid.hasDiamondAt(tC, tR) ||
        this.grid.hasBawangAt(tC, tR))
    );

    // Spawn the chest
    this.grid.spawnChest(tC, tR);
  }

  takeDamage() {
    // Admin one-hit kill mode
    if (this.oneHitKill) {
      this.hp = 0;
      this.scene.events.emit('boss:damaged', 0, this.maxHp);
      this.die();
      return;
    }
    if (!this.isInfMode) {
      // Deal 1 damage per hit (decrement HP)
      this.hp--;
      this.scene.events.emit('boss:damaged', this.hp, this.maxHp);
    }
    
    this.scene.cameras.main.shake(200, 0.02);

    if (this.isTutorial) {
      state.emit('tutorial:bossDamaged');
    }

    if (!this.isInfMode && this.hp <= 0) {
      this.die();
    } else if (!this.isTutorial && this.scene.chapterId === 2) {
      if (this.attackTimer) this.attackTimer.remove();
      this._ch2UltimateCount = (this._ch2UltimateCount || 0) + 1;
      const ultimateDuration = this._ch2UltimateCount % 2 === 0
        ? this.ch2AttackBunnyStampedeUltimate()
        : this.ch2AttackNoteBurstUltimate();
      this.attackTimer = this.scene.time.delayedCall(ultimateDuration + 3000, this.executeAttack, [], this);
    } else if (!this.isTutorial && this.scene.chapterId === 3) {
      // Chapter 3 Ultimate: Rotating Asterisk Fire
      if (this.attackTimer) this.attackTimer.remove();
      const ultimateDuration = this.ch3UltimateRotatingBarrage();
      this.attackTimer = this.scene.time.delayedCall(ultimateDuration + 3000, this.executeAttack, [], this);
    }
  }

  heal(amount = 1) {
    if (this.hp <= 0) return; // Don't heal if dead
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.events.emit('boss:damaged', this.hp, this.maxHp);
  }

  die() {
    if (this.attackTimer) this.attackTimer.remove();
    this.scene.events.emit('boss:died');
  }
  // ======== CHAPTER 3: KATAW — 14 ATTACKS ========

  // Helper: reduce sprite multipliers on mobile (< 500px wide) to 70%
  _mobileScale(multiplier) {
    return this.scene.scale.width < 500 ? multiplier * 0.7 : multiplier;
  }

  // Helper: true when running on a narrow/mobile screen
  _isMobile() {
    return this.scene.scale.width < 500;
  }

  // Helper: play smoke at pixel pos, callback when done.
  // Pass skipOnMobile=true to skip the visual entirely on mobile (just fires callback).
  _spawnSmoke(x, y, onDone, skipOnMobile = false) {
    if (skipOnMobile && this._isMobile()) {
      if (onDone) onDone();
      return;
    }
    const smoke = this.scene.add.sprite(x, y, 'ch3_smoke_spawn')
      .setDepth(120).setScale(this._mobileScale(2)).play('anim_ch3_smoke');
    smoke.once('animationcomplete', () => { smoke.destroy(); if (onDone) onDone(); });
  }

  // ─── ATTACK: Kataw Explosion Pattern 1 (attack-1_1) ──────────────────────
  ch3KatawExplosionPattern1() {
    const grid = this._decodeGridPattern(`
R0: Y Y Y Y Y Y Y Y Y
R1: Y R R R R R R R Y
R2: Y R P P P P P R Y
R3: Y R P . . . P R Y
R4: Y R P . . . P R Y
R5: Y R P . . . P R Y
R6: Y R P P P P P R Y
R7: Y R R R R R R R Y
R8: Y Y Y Y Y Y Y Y Y
    `);
    const steps = [
      { type: '1', duration: 866, tiles: grid['Y'] },
      { type: '2', duration: 533, tiles: grid['R'] },
      { type: '3', duration: 466, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1': 1.5, '2': 1.2, '3': 1.2 });
  }
  
  // ─── ATTACK: Kataw Explosion Pattern 2 (attack-1_2) ──────────────────────
  ch3KatawExplosionPattern2() {
    const grid = this._decodeGridPattern(`
R0: P P P P P P P P P
R1: P R R R R R R R P
R2: P R . . . . . R P
R3: P R . Y Y Y . R P
R4: P R . Y Y Y . R P
R5: P R . Y Y Y . R P
R6: P R . . . . . R P
R7: P R R R R R R R P
R8: P P P P P P P P P
    `);
    const steps = [
      { type: '3', duration: 466, tiles: grid['P'] },
      { type: '2', duration: 533, tiles: grid['R'] },
      { type: '1', duration: 866, tiles: grid['Y'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1': 1.5, '2': 1.2, '3': 1.2 });
  }
  
  // ─── ATTACK: Kataw Explosion Pattern 3 (attack-1_3) ──────────────────────
  ch3KatawExplosionPattern3() {
    const grid = this._decodeGridPattern(`
R0: P P P P P P P P P
R1: P . . . . . . . P
R2: P . R R R R R . P
R3: P . R . . . R . P
R4: P . R . Y . R . P
R5: P . R . . . R . P
R6: P . R R R R R . P
R7: P . . . . . . . P
R8: P P P P P P P P P
    `);
    const steps = [
      { type: '3', duration: 466, tiles: grid['P'] },
      { type: '2', duration: 533, tiles: grid['R'] },
      { type: '1', duration: 866, tiles: grid['Y'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1': 2.0, '2': 1.2, '3': 1.2 });
  }

  _decodeGridPattern(gridStr) {
    const rows = gridStr.trim().split('\n').filter(r => r.trim() !== '');
    const tilesByColor = { 'O': [], 'R': [], 'P': [], 'Y': [] };
    rows.forEach((row, r) => {
      const cells = row.trim().split(/\s+/);
      let startIndex = 0;
      if (cells.length > 0 && cells[0].startsWith('R')) startIndex = 1;
      for (let i = startIndex; i < cells.length; i++) {
        const cell = cells[i];
        const c = i - startIndex;
        if (cell === '🟠' || cell === 'O') tilesByColor['O'].push({ c, r });
        else if (cell === '🔴' || cell === 'R') tilesByColor['R'].push({ c, r });
        else if (cell === '🟣' || cell === 'P') tilesByColor['P'].push({ c, r });
        else if (cell === '🟡' || cell === 'Y') tilesByColor['Y'].push({ c, r });
      }
    });
    return tilesByColor;
  }

  _executeSpecificExplosionSequence(steps, scaleOverrides) {
    const ts = this.grid.tileSize;
    const maxSpritesPerBurst = this._isMobile() ? 20 : 50;
    const visualBatchSize = this._isMobile() ? 4 : 6;
    const visualBatchDelay = this._isMobile() ? 60 : 45;
    let currentSpawnTime = 1100;
    let maxAttackDuration = currentSpawnTime;

    // Play water splash sound at start of explosion sequence
    const splashVariant = Phaser.Math.Between(1, 3);
    audioManager.play(`ch3_water_splash${splashVariant === 1 ? '' : '_' + splashVariant}`, { volume: 0.75 });

    steps.forEach((step) => {
      let telegraphTime = currentSpawnTime - 1100;
      if (telegraphTime < 0) telegraphTime = 0;

      let animKey = 'anim_ch3_explosion_' + step.type;
      let duration = step.duration;
      let scaleMultiplier = scaleOverrides[step.type] || 1.2;

      const tiles = step.tiles.filter(t =>
        t.c >= 0 && t.c < this.grid.cols && t.r >= 0 && t.r < this.grid.rows
      );

      this.scene.time.delayedCall(telegraphTime, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;
        tiles.forEach(t => {
          this.grid.telegraph(t.c, t.r, 1100);
        });
      });

      this.scene.time.delayedCall(currentSpawnTime, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;

        const playerOnDangerTile = tiles.some(t =>
          this.scene.player.col === t.c && this.scene.player.row === t.r
        );
        if (playerOnDangerTile) {
          this.scene.player.takeDamage();
        }

        const visualTiles = this._pickExplosionVisualTiles(tiles, maxSpritesPerBurst);
        visualTiles.forEach((t, index) => {
          this.scene.time.delayedCall(Math.floor(index / visualBatchSize) * visualBatchDelay, () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;
            const pix = this.grid.getPixelPosition(t.c, t.r);
            const exp = this.scene.add.sprite(pix.x, pix.y, animKey.replace('anim_', ''))
              .setDepth(60).setDisplaySize(ts * this._mobileScale(scaleMultiplier), ts * this._mobileScale(scaleMultiplier)).play(animKey);
            exp.once('animationcomplete', () => exp.destroy());
            // Play voltaic blast sound for each explosion visual
            if (index % 4 === 0) {
              const blastVariant = Phaser.Math.Between(1, 2);
              audioManager.play(`ch3_voltaic_blast${blastVariant === 1 ? '' : '_' + blastVariant}`, { volume: 0.7 });
            }
          });
        });
      });

      maxAttackDuration = Math.max(maxAttackDuration, currentSpawnTime + duration);
      currentSpawnTime += 100; // 100ms rapid cascade overlap
    });

    return maxAttackDuration + 500;
  }

  _pickExplosionVisualTiles(tiles, maxSprites) {
    if (tiles.length <= maxSprites) return tiles;

    const selected = [];
    const seen = new Set();
    const playerTileIndex = tiles.findIndex(t =>
      this.scene.player.col === t.c && this.scene.player.row === t.r
    );

    if (playerTileIndex >= 0) {
      const playerTile = tiles[playerTileIndex];
      selected.push(playerTile);
      seen.add(`${playerTile.c},${playerTile.r}`);
    }

    const stride = tiles.length / maxSprites;
    for (let i = 0; selected.length < maxSprites && i < maxSprites; i++) {
      const tile = tiles[Math.floor(i * stride)];
      const key = `${tile.c},${tile.r}`;
      if (!seen.has(key)) {
        selected.push(tile);
        seen.add(key);
      }
    }

    for (let i = 0; selected.length < maxSprites && i < tiles.length; i++) {
      const tile = tiles[i];
      const key = `${tile.c},${tile.r}`;
      if (!seen.has(key)) {
        selected.push(tile);
        seen.add(key);
      }
    }

    return selected;
  }

  // ─── ABYSSAL CROSS ───────────────────────────
  ch3AbyssalCrossPattern1() {
    const grid = this._decodeGridPattern(`
R0: Y Y R . P . R Y Y
R1: Y . R . P . R . Y
R2: R R . . P . . R R
R3: . . . . P . . . .
R4: Y P P P P P P P P
R5: . . . . P . . . .
R6: R R . . P . . R R
R7: Y . R . P . R . Y
R8: Y Y R . P . R Y Y
    `);
    const steps = [
      { type: '4a', duration: 2666, tiles: grid['Y'] || grid['O'] },
      { type: '2a', duration: 2666, tiles: grid['R'] },
      { type: '3a', duration: 2666, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '4a': 1.8, '2a': 1.8, '3a': 1.8 });
  }

  ch3AbyssalCrossPattern2() {
    const grid = this._decodeGridPattern(`
R0: . Y . Y P Y . Y .
R1: R R R R P R R R R
R2: . Y . Y P Y . Y .
R3: R R R R P R R R R
R4: P P P P P P P P P
R5: R R R R P R R R R
R6: . Y . Y P Y . Y .
R7: R R R R P R R R R
R8: . Y . Y P Y . Y .
    `);
    const steps = [
      { type: '4a', duration: 2666, tiles: grid['Y'] || grid['O'] },
      { type: '2a', duration: 2666, tiles: grid['R'] },
      { type: '3a', duration: 2666, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '4a': 1.8, '2a': 1.8, '3a': 1.8 });
  }

  ch3AbyssalCrossPattern3() {
    const grid = this._decodeGridPattern(`
R0: R Y Y Y P Y Y Y R
R1: R . . . P . . . R
R2: R R R R P R R R R
R3: R . . . P . . . R
R4: P P P P P P P P P
R5: R . . . P . . . R
R6: R R R R P R R R R
R7: R . . . P . . . R
R8: R Y Y Y P Y Y Y R
    `);
    const steps = [
      { type: '4a', duration: 2666, tiles: grid['Y'] || grid['O'] },
      { type: '2a', duration: 2666, tiles: grid['R'] },
      { type: '3a', duration: 2666, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '4a': 1.8, '2a': 1.8, '3a': 1.8 });
  }

  ch3AbyssalCrossPattern4() {
    const grid = this._decodeGridPattern(`
R0: Y Y R Y P Y R Y Y
R1: Y . R . P . R . Y
R2: R R R R P R R R R
R3: Y . R . P . R . Y
R4: P P P P P P P P P
R5: Y . R . P . R . Y
R6: R R R R P R R R R
R7: Y . R . P . R . Y
R8: Y Y R Y P Y R Y Y
    `);
    const steps = [
      { type: '4a', duration: 2666, tiles: grid['Y'] || grid['O'] },
      { type: '2a', duration: 2666, tiles: grid['R'] },
      { type: '3a', duration: 2666, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '4a': 1.8, '2a': 1.8, '3a': 1.8 });
  }

  // ─── DIAMOND STORM ───────────────────────────
  ch3DiamondStormPattern1() {
    const grid = this._decodeGridPattern(`
R0: . . . . . . . . .
R1: . Y . . Y . . Y .
R2: . . R . . . R . .
R3: . . . P P P . . .
R4: . Y . P P P . Y .
R5: . . . P P P . . .
R6: . . R . . . R . .
R7: . Y . . Y . . Y .
R8: . . . . . . . . .
    `);
    const steps = [
      { type: '1d', duration: 533, tiles: grid['Y'] || grid['O'] },
      { type: '2d', duration: 666, tiles: grid['R'] },
      { type: '3d', duration: 1466, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1d': 1.5, '2d': 1.5, '3d': 1.5 });
  }

  ch3DiamondStormPattern2() {
    const grid = this._decodeGridPattern(`
R0: R . . . P . . . R
R1: . R . Y P Y . R .
R2: . . R . P . R . .
R3: . Y . R P R . Y .
R4: P P P P P P P P P
R5: . Y . R P R . Y .
R6: . . R . P . R . .
R7: . R . Y P Y . R .
R8: R . . . P . . . R
    `);
    const steps = [
      { type: '1d', duration: 533, tiles: grid['Y'] || grid['O'] },
      { type: '2d', duration: 666, tiles: grid['R'] },
      { type: '3d', duration: 1466, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1d': 1.5, '2d': 1.5, '3d': 1.5 });
  }

  ch3DiamondStormPattern3() {
    const grid = this._decodeGridPattern(`
R0: Y . . . R . . . Y
R1: . Y . . R . . Y .
R2: . . P P P P P . .
R3: . . P Y R Y P . .
R4: R R P R R R P R R
R5: . . P Y R Y P . .
R6: . . P P P P P . .
R7: . Y . . R . . Y .
R8: Y . . . R . . . Y
    `);
    const steps = [
      { type: '1d', duration: 533, tiles: grid['Y'] || grid['O'] },
      { type: '2d', duration: 666, tiles: grid['R'] },
      { type: '3d', duration: 1466, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1d': 1.5, '2d': 1.5, '3d': 1.5 });
  }

  ch3DiamondStormPattern4() {
    const grid = this._decodeGridPattern(`
R0: . . . . Y . . . .
R1: . . . . R . . . .
R2: . . R . . . R . .
R3: . . . P P P . . .
R4: Y R . P . P . R Y
R5: . . . P P P . . .
R6: . . R . . . R . .
R7: . . . . R . . . .
R8: . . . . Y . . . .
    `);
    const steps = [
      { type: '1d', duration: 533, tiles: grid['Y'] || grid['O'] },
      { type: '2d', duration: 666, tiles: grid['R'] },
      { type: '3d', duration: 1466, tiles: grid['P'] }
    ];
    return this._executeSpecificExplosionSequence(steps, { '1d': 1.5, '2d': 1.5, '3d': 1.5 });
  }

  // ─── ATTACK 1.5: Fish King Summoner Wave ───────────────────────────
  ch3FishKingSummonerWave() {
    const ts   = this.grid.tileSize;
    const edgeX = this.grid.getPixelPosition(this.grid.cols - 1, 0).x + ts * 3;
    const midY  = this.grid.getPixelPosition(0, Math.floor(this.grid.rows / 2)).y;

    // Make Fish King exactly 5x5 tiles in display size
    const fkSize = ts * this._mobileScale(5);

    this._spawnSmoke(edgeX, midY, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const king = this.scene.add.sprite(edgeX, midY, 'ch3_fishking_idle')
        .setDepth(100).setFlipX(true).setDisplaySize(fkSize, fkSize).play('anim_ch3_fishking_idle');

      let wavesDone = 0;
      const doWave = () => {
        if (this.hp <= 0 || this.scene.isGameOver) { king.destroy(); return; }
        king.play('anim_ch3_fishking_wand');
        king.once('animationcomplete', () => {
          if (this.hp <= 0 || this.scene.isGameOver) { king.destroy(); return; }
          king.play('anim_ch3_fishking_idle');

          const sharkCount = 5;
          const jellyCount = 5;

          // Get unique rows for sharks
          const availableRows = Array.from({length: this.grid.rows}, (_, i) => i);
          Phaser.Utils.Array.Shuffle(availableRows);
          const sharkRows = availableRows.slice(0, sharkCount);

          // Get unique columns for jellyfish
          const availableCols = Array.from({length: this.grid.cols}, (_, i) => i);
          Phaser.Utils.Array.Shuffle(availableCols);
          const jellyCols = availableCols.slice(0, jellyCount);

          sharkRows.forEach((r, idx) => {
            this.scene.time.delayedCall(idx * 150, () => {
              const startPix = this.grid.getPixelPosition(this.grid.cols, r);
              const endPix   = this.grid.getPixelPosition(-1, r);
              
              // Telegraph the row
              this.grid.telegraphRow(r, 600);
              
              this.scene.time.delayedCall(600, () => {
                if (this.hp <= 0 || this.scene.isGameOver) return;
                const shark = this.scene.add.sprite(startPix.x, startPix.y, 'ch3_shark_walk')
                  .setDepth(35).setFlipX(true).setDisplaySize(ts * this._mobileScale(2), ts * this._mobileScale(2)).play('anim_ch3_shark_walk');
                
                this.scene.tweens.add({
                  targets: shark, x: endPix.x, duration: 2500,
                  onUpdate: () => {
                    if (!shark.active || !this.scene.player) return;
                    // Only check collision every 2nd frame (approx)
                    if (Math.floor(shark.x / 10) % 2 !== 0) return;
                    const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                    if (this.scene.player.row === r && Math.abs(shark.x - pPix.x) < ts * 0.75) {
                      shark.play('anim_ch3_shark_attack', true);
                      this.scene.player.takeDamage();
                    }
                  },
                  onComplete: () => shark.destroy()
                });
              });
            });
          });

          jellyCols.forEach((c, idx) => {
            this.scene.time.delayedCall(idx * 400, () => {
              if (this.hp <= 0 || this.scene.isGameOver) return;
              const startPix = this.grid.getPixelPosition(c, this.grid.rows);
              const endPix   = this.grid.getPixelPosition(c, -4);
              
              this.grid.telegraphCol(c, 600);
              
              this.scene.time.delayedCall(600, () => {
                if (this.hp <= 0 || this.scene.isGameOver) return;
                const jelly = this.scene.add.sprite(startPix.x, startPix.y, 'ch3_jelly_walk')
                  .setDepth(35).setDisplaySize(ts * this._mobileScale(1.5), ts * this._mobileScale(1.5)).play('anim_ch3_jelly_walk'); // bigger jellyfish
                this.scene.tweens.add({
                  targets: jelly, y: endPix.y, duration: 1400,
                  onUpdate: () => {
                    if (!jelly.active || !this.scene.player) return;
                    // Only check collision every 2nd frame (approx)
                    if (Math.floor(jelly.y / 10) % 2 !== 0) return;
                    const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                    if (this.scene.player.col === c && Math.abs(jelly.y - pPix.y) < ts * 0.75) {
                      jelly.play('anim_ch3_jelly_attack', true);
                      this.scene.player.takeDamage();
                    }
                  },
                  onComplete: () => {
                    jelly.play('anim_ch3_jelly_death');
                    jelly.once('animationcomplete', () => jelly.destroy());
                  }
                });
              });
            });
          })

          wavesDone++;
          if (wavesDone < 3) {
            this.scene.time.delayedCall(2000, () => doWave());
          } else {
            this.scene.time.delayedCall(1500, () => {
              this._spawnSmoke(edgeX, midY, null);
              king.destroy();
            });
          }
        });
      };
      doWave();
    });
    return 10000;
  }

  // ─── ATTACK 2: Fish King Multi Spell ─────────────────────────────
  ch3FishKingMultiSpell() {
    const ts     = this.grid.tileSize;
    const edgeX  = this.grid.getPixelPosition(this.grid.cols - 1, 0).x + ts * 3;
    const midY   = this.grid.getPixelPosition(0, Math.floor(this.grid.rows / 2)).y;
    const fkSize = ts * this._mobileScale(5);

    // Play underwater ambiance at start
    audioManager.play('ch3_underwater', { volume: 0.7 });

    this._spawnSmoke(edgeX, midY, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const king = this.scene.add.sprite(edgeX, midY, 'ch3_fishking_idle')
        .setDepth(100).setFlipX(true).setDisplaySize(fkSize, fkSize).play('anim_ch3_fishking_idle');

      let spellIndex = 0;
      const doNextSpell = () => {
        if (spellIndex >= 4 || this.hp <= 0 || this.scene.isGameOver) {
           this._spawnSmoke(edgeX, midY, null);
           king.destroy();
           return;
        }

        king.play('anim_ch3_fishking_spell');
        king.once('animationcomplete', () => {
          if (this.hp <= 0 || this.scene.isGameOver) { king.destroy(); return; }
          king.play('anim_ch3_fishking_idle');

          if (spellIndex === 0) {
            // Dark Bolt: 15-20 random tiles, now with clear telegraphs
            // Play spell cast sound for dark bolt phase
            audioManager.play('ch3_spell_cast', { volume: 0.75 });
            const count = Phaser.Math.Between(15, 20);
            for (let i = 0; i < count; i++) {
              this.scene.time.delayedCall(i * 200, () => {
                if (this.hp <= 0 || this.scene.isGameOver) return;
                const c = Phaser.Math.Between(0, this.grid.cols - 1);
                const r = Phaser.Math.Between(0, this.grid.rows - 1);
                this.grid.telegraph(c, r, 600);
                this.scene.time.delayedCall(600, () => {
                  if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
                  const p = this.grid.getPixelPosition(c, r);
                  const spr = this.scene.add.sprite(p.x, p.y, 'ch3_darkbolt').setDepth(50).setScale(1.5).play('anim_ch3_darkbolt');
                  // Play electric hit sound on each dark bolt
                  if (i % 3 === 0) {
                    const electricVariant = Phaser.Math.Between(1, 2);
                    audioManager.play(`ch3_electric_hit${electricVariant === 1 ? '' : '_' + electricVariant}`, { volume: 0.6 });
                  }
                  if (this.scene.player.col === c && this.scene.player.row === r) {
                    this.scene.player.takeDamage();
                  }
                  this.scene.time.delayedCall(400, () => this.scene.tweens.add({ targets: spr, alpha: 0, duration: 200, onComplete: () => spr.destroy() }));
                });
              });
            }

          } else if (spellIndex === 1) {
            // Fire Bomb: 4 bombs each hitting 3x3 area (non-overlapping)
            // Play energy noise for fire bomb phase
            audioManager.play('ch3_energy_noise', { volume: 0.8 });
            const bombCenters = [];
            let attempts = 0;
            while (bombCenters.length < 4 && attempts < 100) {
              attempts++;
              const cc = Phaser.Math.Between(1, this.grid.cols - 2);
              const cr = Phaser.Math.Between(1, this.grid.rows - 2);
              // Ensure at least 3 tiles apart to prevent 3x3 overlap
              let tooClose = false;
              for (const existing of bombCenters) {
                if (Math.abs(existing.c - cc) <= 3 && Math.abs(existing.r - cr) <= 3) {
                  tooClose = true;
                  break;
                }
              }
              if (!tooClose) bombCenters.push({c: cc, r: cr});
            }
            bombCenters.forEach((center, i) => {
              const cc = center.c;
              const cr = center.r;
              this.scene.time.delayedCall(i * 700, () => {
                if (this.hp <= 0 || this.scene.isGameOver) return;
                
                const cells = [];
                for (let dc = -1; dc <= 1; dc++)
                  for (let dr = -1; dr <= 1; dr++)
                    cells.push({ c: cc + dc, r: cr + dr });
                    
                cells.forEach(cell => this.grid.telegraph(cell.c, cell.r, 800));
                
                this.scene.time.delayedCall(800, () => {
                  if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
                  const p = this.grid.getPixelPosition(cc, cr);
                  const spr = this.scene.add.sprite(p.x, p.y, 'ch3_firebomb')
                    .setDepth(55).setDisplaySize(ts * this._mobileScale(3), ts * this._mobileScale(3)).play('anim_ch3_firebomb');
                  this.scene.cameras.main.shake(150, 0.018);
                  // Play pyro burst sound for fire bomb explosion
                  const pyroVariant = Phaser.Math.Between(1, 2);
                  audioManager.play(`ch3_pyro_burst${pyroVariant === 1 ? '' : '_' + pyroVariant}`, { volume: 0.85 });
                  
                  // Damage player if in 3x3
                  const pRow = this.scene.player.row;
                  const pCol = this.scene.player.col;
                  if (Math.abs(pCol - cc) <= 1 && Math.abs(pRow - cr) <= 1) {
                     this.scene.player.takeDamage();
                  }
                  
                  this.scene.time.delayedCall(600, () => this.scene.tweens.add({ targets: spr, alpha: 0, duration: 200, onComplete: () => spr.destroy() }));
                });
              });
            });
            
          } else if (spellIndex === 2) {
            // Lightning: checkerboard half board with telegraphs
            // Play wet electricity sound for lightning phase
            audioManager.play('ch3_wet_electricity', { volume: 0.8 });
            const startC = Phaser.Math.Between(0, Math.floor(this.grid.cols / 2));
            const startR = Phaser.Math.Between(0, Math.floor(this.grid.rows / 2));
            const cells = [];
            for (let r = startR; r < this.grid.rows; r++) {
              for (let c = startC; c < this.grid.cols; c++) {
                if ((c + r) % 2 === 0) continue;
                cells.push({c,r});
                this.grid.telegraph(c, r, 1200);
              }
            }
            this.scene.time.delayedCall(1200, () => {
               if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
               // Play shimmer electric sound for lightning strike
               const shimmerVariant = Phaser.Math.Between(1, 2);
               audioManager.play(`ch3_shimmer_electric${shimmerVariant === 1 ? '' : '_' + shimmerVariant}`, { volume: 0.9 });
               cells.forEach(({c,r}) => {
                  const p = this.grid.getPixelPosition(c, r);
                  const spr = this.scene.add.sprite(p.x, p.y, 'ch3_lightning').setDepth(50).setScale(ts / 64).play('anim_ch3_lightning');
                  if (this.scene.player.col === c && this.scene.player.row === r) {
                     this.scene.player.takeDamage();
                  }
                  this.scene.time.delayedCall(800, () => spr.destroy());
               });
            });

          } else if (spellIndex === 3) {
            // Spark: ball rolling left→right on 3 random rows, 3x3 in size (FASTER)
            // Play skill release sound for spark phase
            audioManager.play('ch3_skill_release', { volume: 0.75 });
            const rows = [];
            while (rows.length < 3) {
              const r = Phaser.Math.Between(1, this.grid.rows - 2);
              if (!rows.includes(r)) rows.push(r);
            }
            rows.forEach((r, idx) => {
              this.scene.time.delayedCall(idx * 300, () => {
                const startX = this.grid.getPixelPosition(-2, r).x; // start way offscreen
                const endX   = this.grid.getPixelPosition(this.grid.cols + 2, r).x;
                const y      = this.grid.getPixelPosition(0, r).y;
                
                // telegraph the 3 rows initially to warn player (faster)
                this.grid.telegraphRow(r-1, 600);
                this.grid.telegraphRow(r, 1000);
                this.grid.telegraphRow(r+1, 600);
                
                this.scene.time.delayedCall(600, () => {
                  if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
                  const ball = this.scene.add.sprite(startX, y, 'ch3_spark')
                    .setDepth(55).setDisplaySize(ts * this._mobileScale(3), ts * this._mobileScale(3)).play('anim_ch3_spark');
                  
                  this.scene.tweens.add({
                    targets: ball, x: endX, duration: 1500,
                    onUpdate: () => {
                      if (!ball.active || !this.scene.player) return;
                      const pC = this.scene.player.col;
                      const pR = this.scene.player.row;
                      const pPix = this.grid.getPixelPosition(pC, pR);
                      // if within 1 row of center and hit horizontally
                      if (Math.abs(pR - r) <= 1 && Math.abs(ball.x - pPix.x) < ts * 1.5) {
                        this.scene.player.takeDamage();
                      }
                    },
                    onComplete: () => ball.destroy()
                  });
                });
              });
            });
          }

          const totalDur = spellIndex === 0 ? 20 * 200 + 1200
                         : spellIndex === 1 ? 4 * 700 + 1800
                         : spellIndex === 2 ? 2000
                         : 2500;
          this.scene.time.delayedCall(totalDur, () => {
            spellIndex++;
            doNextSpell();
          });
        });
      };
      
      doNextSpell();
    });
    
    return 18000;
  }

  // ─── ATTACK 3: Shark Lanes ────────────────────────────────────────
  ch3SharkLanes() {
    const ts = this.grid.tileSize;
    const rows = this.grid.rows;

    // Play water splash sound at start
    audioManager.play('ch3_water_splash_2', { volume: 0.8 });

    // Leave 2 safe rows for player to dodge
    const safeRows = new Set();
    while (safeRows.size < 2) {
      safeRows.add(Phaser.Math.Between(0, rows - 1));
    }

    // Telegraph only rows that will have sharks
    for (let r = 0; r < rows; r++) {
      if (!safeRows.has(r)) this.grid.telegraphRow(r, 1200);
    }

    // Spawn 1 shark per row (except safe rows)
    for (let row = 0; row < rows; row++) {
      if (safeRows.has(row)) continue; // Skip safe rows
      const idleX = this.grid.getPixelPosition(this.grid.cols, row).x + ts * 1.5;
      const idleY = this.grid.getPixelPosition(0, row).y;
      
      this.scene.time.delayedCall(1200 + row * 100, () => {
        this._spawnSmoke(idleX, idleY, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          // Play fish swish sound when shark spawns
          const swishVariant = Phaser.Math.Between(1, 2);
          audioManager.play(`ch3_fish_swish${swishVariant === 1 ? '' : '_' + swishVariant}`, { volume: 0.7 });
          const shark = this.scene.add.sprite(idleX, idleY, 'ch3_shark_walk')
            .setDepth(40)
            .setFlipX(true)
            .setDisplaySize(ts * this._mobileScale(2.5), ts * this._mobileScale(2.5))
            .play('anim_ch3_shark_walk');

          const destX = this.grid.getPixelPosition(-2, row).x;
          this.scene.tweens.add({
            targets: shark, x: destX, duration: 800,
            onUpdate: () => {
              if (!shark.active || !this.scene.player) return;
              // Check collision with player on same row
              if (this.scene.player.row === row) {
                const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                if (Math.abs(shark.x - pPix.x) < ts * 0.6) {
                  shark.play('anim_ch3_shark_attack', true);
                  this.scene.player.takeDamage();
                }
              }
            },
            onComplete: () => {
              if (shark && shark.active) {
                this._spawnSmoke(shark.x, shark.y, null);
                shark.destroy();
              }
            }
          });
        });
      });
    }
    return 3500;
  }

  // ─── ATTACK 4: Jellyfish Curtain ─────────────────────────────────
  ch3JellyfishCurtain() {
    const ts = this.grid.tileSize;

    // Play bubble pop sound at start
    audioManager.play('ch3_bubble_pop', { volume: 0.75 });

    // 2 jellyfish, each covers a 3-column section
    const usedStarts = new Set();
    const laneStarts = [];
    while (laneStarts.length < 2) {
      const s = Phaser.Math.Between(0, this.grid.cols - 3);
      if (!usedStarts.has(s) && !usedStarts.has(s-1) && !usedStarts.has(s+1)) { 
        usedStarts.add(s); laneStarts.push(s); 
      }
    }

    laneStarts.forEach(startCol => {
      const laneCols = [startCol, startCol + 1, startCol + 2];
      const midCol   = startCol + 1;

      laneCols.forEach(c => this.grid.telegraphCol(c, 1200));

      const startX = this.grid.getPixelPosition(midCol, 0).x;
      const startY = this.grid.getPixelPosition(0, this.grid.rows).y + ts * 2;
      const endY   = this.grid.getPixelPosition(0, -4).y;

      this.scene.time.delayedCall(1200, () => {
        this._spawnSmoke(startX, startY, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          // Play bubbly passby sound when jellyfish appears
          audioManager.play('ch3_bubbly_passby', { volume: 0.7 });
          const jelly = this.scene.add.sprite(startX, startY, 'ch3_jelly_walk')
            .setDepth(35).setDisplaySize(ts * 3, ts * 3).play('anim_ch3_jelly_walk'); // 3 columns wide

          this.scene.tweens.add({
            targets: jelly, y: endY, duration: 1400,
            onUpdate: () => {
              if (!jelly.active || !this.scene.player) return;
              // Only check collision every 2nd frame (approx)
              if (Math.floor(jelly.y / 10) % 2 !== 0) return;
              const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
              if (laneCols.includes(this.scene.player.col) && Math.abs(jelly.y - pPix.y) < ts * 1.5) {
                jelly.play('anim_ch3_jelly_attack', true);
                this.scene.player.takeDamage();
              }
            },
            onComplete: () => {
              this._spawnSmoke(jelly.x, jelly.y, null);
              jelly.play('anim_ch3_jelly_death');
              jelly.once('animationcomplete', () => jelly.destroy());
            }
          });
        });
      });
    });
    return 5500;
  }

  // ─── ATTACK 5: Nemo Swarm ─────────────────────────────────────────
  ch3NemoSwarm() {
    const ts = this.grid.tileSize;
    const nemoSize = ts * 1.5;

    // Play bubbly resonance sound at start
    audioManager.play('ch3_bubbly_resonance', { volume: 0.7 });

    const availableRows = Array.from({length: this.grid.rows}, (_, i) => i);
    Phaser.Utils.Array.Shuffle(availableRows);

    for (let i = 0; i < 5; i++) {
        const sR = availableRows.pop();
        const startY = this.grid.getPixelPosition(0, sR).y;
          const startX = this.grid.getPixelPosition(this.grid.cols + 2, sR).x; // start way offscreen 

          this.grid.telegraphRow(sR, 1200);

          this.scene.time.delayedCall(1200 + i * 800, () => {
             if (this.hp <= 0 || this.scene.isGameOver) return;

             // Play fish swish sound for each nemo spawn
             const swishVariant = Phaser.Math.Between(1, 2);
             audioManager.play(`ch3_fish_swish${swishVariant === 1 ? '' : '_' + swishVariant}`, { volume: 0.6 });

             const nemo = this.scene.add.sprite(startX, startY, 'ch3_nemo_swim')
               .setDepth(45).setDisplaySize(nemoSize, nemoSize).play('anim_ch3_nemo');

             let currentR = sR;
             let currentCol = this.grid.cols + 2;

             const stepNemo = () => {
                if (this.hp <= 0 || this.scene.isGameOver || !nemo.active) return;
                
                let targetR = currentR;
                let animKey = 'anim_ch3_nemo';
                
                if (currentCol < this.grid.cols && currentCol > 0) {
                    if (Math.random() < 0.35) {
                        const up = Math.random() > 0.5;
                        if (up && currentR > 0) { targetR--; animKey = 'anim_ch3_nemo_diagup'; }
                        else if (!up && currentR < this.grid.rows - 1) { targetR++; animKey = 'anim_ch3_nemo_diagdn'; }
                        else if (currentR === 0) { targetR++; animKey = 'anim_ch3_nemo_diagdn'; }
                        else if (currentR === this.grid.rows - 1) { targetR--; animKey = 'anim_ch3_nemo_diagup'; }
                    }
                }
                
                currentCol--;
                const targetPix = this.grid.getPixelPosition(currentCol, targetR);
                
                nemo.play(animKey, true);
                
                if (currentCol >= -1 && currentCol <= this.grid.cols) {
                   this.grid.telegraph(currentCol, targetR, 350);
                }

                this.scene.tweens.add({
                    targets: nemo, x: targetPix.x, y: targetPix.y, duration: 350,
                    onUpdate: () => {
                       if (!nemo.active || !this.scene.player) return;
                       // Only check collision every 2nd frame (approx)
                       if (Math.floor(nemo.x / 10) % 2 !== 0) return;
                       const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                       if (Math.abs(nemo.x - pPix.x) < ts * 0.75 && Math.abs(nemo.y - pPix.y) < ts * 0.75) {
                           nemo.play('anim_ch3_nemo_chomp', true);
                           this.scene.player.takeDamage();
                       }
                    },
                    onComplete: () => {
                        currentR = targetR;
                        if (currentCol <= -1) {
                            nemo.setVisible(false);
                            this._spawnSmoke(nemo.x, nemo.y, () => nemo.destroy());
                        } else {
                            stepNemo();
                        }
                    }
                });
             };
             stepNemo();
          });
        }
    return 9500;
  }

  // ─── ATTACK 6: Bat Swarm Assault ──────────────────────────────────────
  ch3BatDiveBomb() {
    const ts = this.grid.tileSize;
    const batSize = ts * this._mobileScale(2.5);

    // Play electric hit sound at start
    audioManager.play('ch3_electric_hit', { volume: 0.8 });

    // Entrance flash only - reduced shake
    this.scene.cameras.main.flash(400, 80, 0, 120);
    this.scene.cameras.main.shake(100, 0.01);
    
    // 4 WAVES of bats - more waves
    let waveCount = 0;
    const maxWaves = 4;
    
    const spawnWave = () => {
      if (waveCount >= maxWaves || this.hp <= 0 || this.scene.isGameOver) return;
      
      // Wave flash only
      this.scene.cameras.main.flash(200, 60, 0, 100, 0.4);
      
      // Pick 10 random unique points per wave - MORE BATS
      const centers = [];
      let attempts = 0;
      while(centers.length < 10 && attempts < 200) {
        attempts++;
        const c = Phaser.Math.Between(0, this.grid.cols - 1);
        const r = Phaser.Math.Between(0, this.grid.rows - 1);
        // Check if too close to existing centers
        let tooClose = false;
        for (const existing of centers) {
          if (Math.abs(existing.c - c) <= 1 && Math.abs(existing.r - r) <= 1) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) centers.push({c, r});
      }
      
      // Spawn bats with faster staggered timing
      centers.forEach((pt, idx) => {
        this.scene.time.delayedCall(idx * 180, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          const pix = this.grid.getPixelPosition(pt.c, pt.r);
          
          // ONLY 1 red tile per bat (not 3x3)
          this.grid.telegraph(pt.c, pt.r, 500);
          
          this.scene.time.delayedCall(500, () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;
            
            // Lightning burst FX at dive start (no smoke)
            const lightning = this.scene.add.sprite(pix.x, pix.y - 300, 'lightning_burst')
              .setDepth(68).setScale(this._mobileScale(2)).play('anim_lightning_burst');
            this.scene.time.delayedCall(400, () => lightning.destroy());
            // Play laser electric zap for bat dive
            const zapVariant = Phaser.Math.Between(1, 2);
            audioManager.play(`ch3_laser_electric_zap${zapVariant === 1 ? '' : '_' + zapVariant}`, { volume: 0.7 });

            const bat = this.scene.add.sprite(pix.x, pix.y - 500, 'ch3_bat_fly')
              .setDepth(70).setDisplaySize(batSize, batSize).play('anim_ch3_bat_fly');

            this.scene.tweens.add({
              targets: bat, 
              y: pix.y, 
              duration: 550, 
              ease: 'Quad.easeIn',
              onComplete: () => {
                bat.play('anim_ch3_bat_hit');
                // Reduced shake
                this.scene.cameras.main.shake(80, 0.01);
                // Play hit sound on bat impact
                const hitVariant = Phaser.Math.Between(1, 2);
                audioManager.play(`ch3_hit_fleeting${hitVariant === 1 ? '' : '_' + hitVariant}`, { volume: 0.75 });

                // Impact FX - lightning only (no smoke)
                const impactLightning = this.scene.add.sprite(pix.x, pix.y, 'lightning_burst')
                  .setDepth(72).setScale(this._mobileScale(1.5)).play('anim_lightning_burst');
                this.scene.time.delayedCall(400, () => impactLightning.destroy());

                // Damage only on exact tile (not 3x3 area)
                if (this.scene.player && this.scene.player.col === pt.c && this.scene.player.row === pt.r) {
                    this.scene.player.takeDamage();
                    // Eye explosion on player damage
                    const eyeExplosion = this.scene.add.sprite(
                      this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row).x,
                      this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row).y,
                      'eye_explosion'
                    ).setDepth(200).setScale(1.5).play('anim_eye_explosion');
                    this.scene.time.delayedCall(600, () => eyeExplosion.destroy());
                }

                bat.once('animationcomplete', () => {
                  bat.play('anim_ch3_bat_fly');
                  this.scene.tweens.add({ 
                    targets: bat, 
                    y: pix.y - 600, 
                    alpha: 0, 
                    duration: 500, 
                    onComplete: () => bat.destroy() 
                  });
                });
              }
            });
          });
        });
      });
      
      waveCount++;
      // Next wave after delay
      this.scene.time.delayedCall(2200, spawnWave);
    };
    
    // Start first wave
    spawnWave();
    
    return 10000; // Longer duration for 4 waves
  }

  // ─── ATTACK 7: Prismatic Beam Storm ─────────────────────────────
  ch3PrismaticBeamStorm() {
    const ts = this.grid.tileSize;

    // Play beam charge sound at start
    audioManager.play('ch3_beam_charge', { volume: 0.8 });

    // Entrance flash
    this.scene.cameras.main.flash(400, 100, 0, 150);
    this.scene.cameras.main.shake(80, 0.008);
    
    // 4 waves of multi-directional beams
    let waveCount = 0;
    const maxWaves = 4;
    
    const spawnWave = () => {
      if (waveCount >= maxWaves || this.hp <= 0 || this.scene.isGameOver) return;
      
      // Wave flash
      this.scene.cameras.main.flash(150, 80, 0, 120, 0.3);
      
      // Pick fewer beam origins on mobile
      const maxBeams = this._isMobile() ? 3 : 6;
      const beamOrigins = [];
      let attempts = 0;
      while(beamOrigins.length < maxBeams && attempts < 100) {
        attempts++;
        const c = Phaser.Math.Between(0, this.grid.cols - 1);
        const r = Phaser.Math.Between(0, this.grid.rows - 1);
        let tooClose = false;
        for (const existing of beamOrigins) {
          if (Math.abs(existing.c - c) <= 1 && Math.abs(existing.r - r) <= 1) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) beamOrigins.push({c, r});
      }
      
      // For each origin, shoot in a direction (horizontal, vertical, or diagonal)
      beamOrigins.forEach((pt, idx) => {
        this.scene.time.delayedCall(idx * 200, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          const pix = this.grid.getPixelPosition(pt.c, pt.r);
          
          // Choose direction: 0=horizontal, 1=vertical, 2=diagonal-down, 3=diagonal-up
          const direction = Phaser.Math.Between(0, 3);
          
          // Telegraph single tile
          this.grid.telegraph(pt.c, pt.r, 500);
          
          this.scene.time.delayedCall(500, () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;

            // Play laser shot sound when beam fires
            const laserVariant = Phaser.Math.Between(1, 2);
            audioManager.play(`ch3_laser_shot${laserVariant === 1 ? '' : '_' + laserVariant}`, { volume: 0.75 });

            // Spawn beam based on direction
            let beam, startX, startY, endX, endY, angle;
            const speed = 1400; // Beam travel duration
            
            switch(direction) {
              case 0: // Horizontal - left to right
                startX = this.grid.getPixelPosition(-2, pt.r).x;
                endX = this.grid.getPixelPosition(this.grid.cols + 2, pt.r).x;
                startY = pix.y;
                endY = pix.y;
                angle = 0;
                break;
              case 1: // Vertical - top to bottom
                startX = pix.x;
                endX = pix.x;
                startY = this.grid.getPixelPosition(pt.c, -2).y;
                endY = this.grid.getPixelPosition(pt.c, this.grid.rows + 2).y;
                angle = 90;
                break;
              case 2: // Diagonal down-right
                startX = this.grid.getPixelPosition(-2, -2).x;
                startY = this.grid.getPixelPosition(-2, -2).y;
                endX = this.grid.getPixelPosition(this.grid.cols + 2, this.grid.rows + 2).x;
                endY = this.grid.getPixelPosition(this.grid.cols + 2, this.grid.rows + 2).y;
                // Adjust based on origin position
                startX = pix.x - (this.grid.cols * ts);
                startY = pix.y - (this.grid.rows * ts);
                endX = pix.x + (this.grid.cols * ts);
                endY = pix.y + (this.grid.rows * ts);
                angle = 45;
                break;
              case 3: // Diagonal up-right
                startX = pix.x - (this.grid.cols * ts);
                startY = pix.y + (this.grid.rows * ts);
                endX = pix.x + (this.grid.cols * ts);
                endY = pix.y - (this.grid.rows * ts);
                angle = -45;
                break;
            }
            
            beam = this.scene.add.sprite(startX, startY, 'ch3_beam_multidir')
              .setDepth(15).setDisplaySize(ts * this._mobileScale(2), ts * this._mobileScale(2)).setAngle(angle).play('anim_ch3_beam_multidir');
            
            // Light showers explosion at origin
            const explosion = this.scene.add.sprite(pix.x, pix.y, 'ch3_light_showers')
              .setDepth(16).setScale(this._mobileScale(1.5)).play('anim_ch3_light_showers');
            this.scene.time.delayedCall(800, () => explosion.destroy());

            // Play skill impact sound on explosion
            const impactVariant = Phaser.Math.Between(1, 2);
            audioManager.play(`ch3_skill_impact${impactVariant === 1 ? '' : '_' + impactVariant}`, { volume: 0.7 });

            // Camera shake on explosion
            this.scene.cameras.main.shake(60, 0.005);
            
            // Move beam
            this.scene.tweens.add({
              targets: beam,
              x: endX,
              y: endY,
              duration: speed,
              ease: 'Linear',
              onUpdate: () => {
                if (!beam.active) return;
                // Check collision with player based on direction
                let hit = false;
                const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                
                switch(direction) {
                  case 0: // Horizontal - check if same row and beam passing through
                    if (this.scene.player.row === pt.r && Math.abs(beam.x - pPix.x) < ts * 0.8) hit = true;
                    break;
                  case 1: // Vertical - check if same col
                    if (this.scene.player.col === pt.c && Math.abs(beam.y - pPix.y) < ts * 0.8) hit = true;
                    break;
                  case 2: // Diagonal down - distance check
                  case 3: // Diagonal up
                    const dist = Phaser.Math.Distance.Between(beam.x, beam.y, pPix.x, pPix.y);
                    if (dist < ts * 0.8) hit = true;
                    break;
                }
                
                if (hit && !this.scene.player.isInvulnerable) {
                  this.scene.player.takeDamage();
                  // Eye explosion on damage
                  const eyeExplosion = this.scene.add.sprite(pPix.x, pPix.y, 'eye_explosion')
                    .setDepth(200).setScale(1.5).play('anim_eye_explosion');
                  this.scene.time.delayedCall(600, () => eyeExplosion.destroy());
                }
              },
              onComplete: () => {
                beam.destroy();
              }
            });
          });
        });
      });
      
      waveCount++;
      this.scene.time.delayedCall(2800, spawnWave);
    };
    
    spawnWave();
    return 12000; // Duration for 4 waves
  }

  // ─── ATTACK 8: Bioluminescent Blackout ───────────────────────────
  ch3BioluminescentBlackout() {
    const ts = this.grid.tileSize;
    const cx = this.grid.offsetX + (this.grid.cols * ts) / 2;
    const cy = this.grid.offsetY + (this.grid.rows * ts) / 2;

    // Check if angler texture exists (asset might be missing)
    const hasAnglerTexture = this.scene.textures.exists('ch3_angler');

    const dark = this.scene.add.rectangle(cx, cy,
      this.grid.cols * ts + 80, this.grid.rows * ts + 80, 0x000011, 0.85).setDepth(20);

    // 3 anglers with clear circles
    const anglerData = [];
    for (let i = 0; i < 3; i++) {
      const ac = Phaser.Math.Between(1, this.grid.cols - 2);
      const ar = Phaser.Math.Between(1, this.grid.rows - 2);
      const ap = this.grid.getPixelPosition(ac, ar);

      const halo = this.scene.add.circle(ap.x, ap.y, ts * 1.5, 0xddeeff, 0.35).setDepth(21);
      const halo2 = this.scene.add.circle(ap.x, ap.y, ts * 1.0, 0xffffff, 0.45).setDepth(21);

      let angler = null;
      if (hasAnglerTexture) {
        angler = this.scene.add.sprite(ap.x, ap.y, 'ch3_angler')
          .setDepth(22).setScale(ts / 48 * 1.5).play('anim_ch3_angler');
        this.scene.tweens.add({ targets: [angler, halo, halo2], x: ap.x + Phaser.Math.Between(-ts, ts), y: ap.y + Phaser.Math.Between(-ts, ts), duration: 2500, yoyo: true, repeat: 1 });
      } else {
        // Fallback: just animate the halos without the angler sprite
        this.scene.tweens.add({ targets: [halo, halo2], x: ap.x + Phaser.Math.Between(-ts, ts), y: ap.y + Phaser.Math.Between(-ts, ts), duration: 2500, yoyo: true, repeat: 1 });
      }

      anglerData.push({ angler, halo, halo2, ac, ar });
    }

    // Flashlight effect: bring player above dark if near light
    const baselinePlayerDepth = this.scene.player.sprite.depth || 10;
    const lightCheckTimer = this.scene.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        if (!this.scene || !this.scene.player || !this.scene.player.sprite.active) return;
        let inLight = false;
        const px = this.scene.player.sprite.x;
        const py = this.scene.player.sprite.y;
        anglerData.forEach(a => {
           const lightX = a.angler ? a.angler.x : a.halo.x;
           const lightY = a.angler ? a.angler.y : a.halo.y;
           if (Math.abs(lightX - px) <= ts * 1.5 && Math.abs(lightY - py) <= ts * 1.5) {
              inLight = true;
           }
        });
        if (inLight) this.scene.player.sprite.setDepth(25);
        else this.scene.player.sprite.setDepth(baselinePlayerDepth);
      }
    });

    for (let i = 0; i < 15; i++) {
      this.scene.time.delayedCall(i * 350, () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;
        const c = Phaser.Math.Between(0, this.grid.cols - 1);
        const r = Phaser.Math.Between(0, this.grid.rows - 1);
        
        const nearSafe = anglerData.some(a => Math.abs(a.ac - c) <= 1 && Math.abs(a.ar - r) <= 1);
        if (nearSafe) return;
        
        this.grid.telegraph(c, r, 500);
        this.scene.time.delayedCall(500, () => {
           if (this.hp <= 0 || this.scene.isGameOver) return;
           const p = this.grid.getPixelPosition(c, r);
           const bolt = this.scene.add.sprite(p.x, p.y, 'ch3_darkbolt').setDepth(28).setScale(1.5).play('anim_ch3_darkbolt');
           if (this.scene.player.col === c && this.scene.player.row === r) {
              this.scene.player.takeDamage();
           }
           this.scene.time.delayedCall(600, () => bolt.destroy());
        });
      });
    }

    this.scene.time.delayedCall(6500, () => {
      lightCheckTimer.remove();
      if (this.scene.player && this.scene.player.sprite.active) {
         this.scene.player.sprite.setDepth(baselinePlayerDepth);
      }
      this.scene.tweens.add({ targets: dark, alpha: 0, duration: 800, onComplete: () => dark.destroy() });
      anglerData.forEach(a => {
        const targets = a.angler ? [a.angler, a.halo, a.halo2] : [a.halo, a.halo2];
        this.scene.tweens.add({ targets, alpha: 0, duration: 500, onComplete: () => { if (a.angler) a.angler.destroy(); a.halo.destroy(); a.halo2.destroy(); } });
      });
    });

    return 8000;
  }

  // ─── ATTACK 8: Whirlpool Hashtag ─────────────────────────────────
  ch3WhirlpoolMaze() {
    const ts = this.grid.tileSize;
    // user asks: "hashtag but 4 rows 4 columns" -> 1, 3, 5, 7 on 9x9 grid
    const hashCols = [1, 3, 5, 7];
    const hashRows = [1, 3, 5, 7];

    // Telegraph all rows and cols 
    hashRows.forEach(r => this.grid.telegraphRow(r, 1500));
    hashCols.forEach(c => this.grid.telegraphCol(c, 1500));

    this.scene.time.delayedCall(1500, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const spirals = [];
      const damageTiles = new Set();
      
      // Collect all tiles
      hashRows.forEach(r => {
        for (let c = 0; c < this.grid.cols; c++) {
           damageTiles.add(`${c},${r}`);
           const p = this.grid.getPixelPosition(c, r);
           const spr = this.scene.add.sprite(p.x, p.y, 'ch3_waterspiral')
             .setDepth(40).setDisplaySize(ts, ts).play('anim_ch3_waterspiral');
           spirals.push(spr);
        }
      });
      hashCols.forEach(c => {
        for (let r = 0; r < this.grid.rows; r++) {
           damageTiles.add(`${c},${r}`);
           const p = this.grid.getPixelPosition(c, r);
           const spr = this.scene.add.sprite(p.x, p.y, 'ch3_waterspiral')
             .setDepth(40).setDisplaySize(ts, ts).setAngle(90).play('anim_ch3_waterspiral'); // Top to bottom facing
           spirals.push(spr);
        }
      });
      
      this.scene.cameras.main.shake(200, 0.015);

      const checkDmg = this.scene.time.addEvent({
         delay: 150, loop: true,
         callback: () => {
            if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
            const playerKey = `${this.scene.player.col},${this.scene.player.row}`;
            if (damageTiles.has(playerKey)) {
                this.scene.player.takeDamage();
                if (!this.scene.player.isCharmed) {
                  this.scene.player.isCharmed = true;
                  this.scene.time.delayedCall(2000, () => { if (this.scene.player) this.scene.player.isCharmed = false; });
                }
            }
         }
      });
      
      this.scene.time.delayedCall(2500, () => {
         checkDmg.remove();
         spirals.forEach(s => s.destroy());
      });
    });

    return 6000;
  }

  // ─── ATTACK 9: Siren's Lure ──────────────────────────────────────
  ch3SirensLure() {
    const ts = this.grid.tileSize;
    const mc = Math.floor(this.grid.cols / 2);
    // Spawn ON the first row, not off grid
    const pix = this.grid.getPixelPosition(mc, 0);

    // Play shimmer tone sound at start
    audioManager.play('ch3_shimmer_tone', { volume: 0.85 });

    this._spawnSmoke(pix.x, pix.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      
      // Create siren with new Walk/Attack sprites - positioned at TOP of grid
      // Position siren at row 0 (top of grid) for maximum visibility
      const sirenRow = 0;
      const sirenY = this.grid.getPixelPosition(0, sirenRow).y - (this.grid.tileSize * 0.3); // Slightly above row 0
      const leftPos = this.grid.getPixelPosition(1, sirenRow);
      const rightPos = this.grid.getPixelPosition(this.grid.cols - 2, sirenRow);
      
      // Position container at sirenY for both X and Y consistency
      const sirenContainer = this.scene.add.container(leftPos.x, sirenY).setDepth(100);
      
      // Main siren sprite - using Walk animation (13x1 frames), visible scale
      const sirenSize = this.grid.tileSize * this._mobileScale(2.0);
      const siren = this.scene.add.sprite(0, 0, 'ch3_siren1_walk')
        .setDepth(100).setDisplaySize(sirenSize, sirenSize).play('anim_ch3_siren1_walk');
      sirenContainer.add(siren);
      
      // HORIZONTAL WALKING - Siren paces back and forth like a boss
      const walkDuration = 3000;
      let walkDirection = 1; // 1 = right, -1 = left
      
      const sirenWalkTween = this.scene.tweens.add({
        targets: sirenContainer,
        x: rightPos.x,
        duration: walkDuration,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
        onYoyo: () => {
          walkDirection = -1;
          siren.setFlipX(true); // Face left when walking left
        },
        onRepeat: () => {
          walkDirection = 1;
          siren.setFlipX(false); // Face right when walking right
        }
      });
      
      // Function to play attack animation during beam attacks
      const playAttackAnim = () => {
        siren.play('anim_ch3_siren1_attack');
        // Play critical strike sound on attack
        const critVariant = Phaser.Math.Between(1, 2);
        audioManager.play(`ch3_critical_strike${critVariant === 1 ? '' : '_' + critVariant}`, { volume: 0.75 });
        siren.once('animationcomplete', () => {
          siren.play('anim_ch3_siren1_walk');
        });
      };

      // Flashy entrance effects
      this.scene.cameras.main.flash(500, 255, 0, 200);
      this.scene.cameras.main.shake(300, 0.02);

      // Play spell cast sound for entrance
      audioManager.play('ch3_spell_cast', { volume: 0.8 });
      
      // BIG TEXT: "SIREN'S KISS" with subtext that fades out with giga saturn font
      const centerX = this.grid.getPixelPosition(Math.floor(this.grid.cols / 2), Math.floor(this.grid.rows / 2)).x;
      const centerY = this.grid.getPixelPosition(Math.floor(this.grid.cols / 2), Math.floor(this.grid.rows / 2)).y;
      
      const sirenText = this.scene.add.text(
        centerX,
        centerY - 20,
        "SIREN'S KISS", 
        { fontFamily: 'GigaSaturn', fontSize: '72px', color: '#ff00aa', fontStyle: 'bold', stroke: '#000', strokeThickness: 10 }
      ).setOrigin(0.5).setDepth(300).setAlpha(0).setScale(0.5);
      
      // Subtext: "inverted controllers"
      const subText = this.scene.add.text(
        centerX,
        centerY + 40,
        "inverted controllers", 
        { fontFamily: 'GigaSaturn', fontSize: '28px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }
      ).setOrigin(0.5).setDepth(300).setAlpha(0);
      
      // Pop in and fade out animation for both texts
      this.scene.tweens.add({
        targets: sirenText,
        alpha: 1,
        scale: 1.2,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: sirenText,
            alpha: 0,
            y: sirenText.y - 50,
            duration: 800,
            delay: 600,
            ease: 'Power2',
            onComplete: () => sirenText.destroy()
          });
        }
      });
      
      this.scene.tweens.add({
        targets: subText,
        alpha: 0.9,
        duration: 400,
        delay: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: subText,
            alpha: 0,
            y: subText.y - 50,
            duration: 800,
            delay: 400,
            ease: 'Power2',
            onComplete: () => subText.destroy()
          });
        }
      });

      this.scene.player.isCharmed = true;
      
      // TELEPORT player to bottom row (last row of 9x9 grid)
      const bottomRow = this.grid.rows - 1;
      const targetCol = Math.floor(this.grid.cols / 2); // Center column
      
      // Force teleport to bottom row
      this.scene.player.col = targetCol;
      this.scene.player.row = bottomRow;
      const bottomPos = this.grid.getPixelPosition(targetCol, bottomRow);
      
      this.scene.tweens.add({
        targets: this.scene.player.sprite,
        x: bottomPos.x,
        y: bottomPos.y,
        duration: 300,
        ease: 'Power2'
      });
      
      // RESTRICT movement: player can ONLY walk on bottom row during attack
      const originalMove = this.scene.player.move.bind(this.scene.player);
      this.scene.player.move = function(direction) {
        // Siren's Lure: reverse controls
        let actDir = direction;
        if (this.isCharmed) {
            if (direction === 'up') actDir = 'down';
            else if (direction === 'down') actDir = 'up';
            else if (direction === 'left') actDir = 'right';
            else if (direction === 'right') actDir = 'left';
        }
        
        // Only allow left/right movement on bottom row
        if (actDir === 'up' || actDir === 'down') {
          // Block vertical movement - flash red to indicate blocked
          this.scene.cameras.main.flash(100, 255, 0, 0, 0.3);
          return;
        }
        
        let dCol = 0, dRow = 0;
        if (actDir === 'left') dCol = -1;
        else if (actDir === 'right') dCol = 1;
        else return;
        
        const dist = this.hasDash ? 3 : 1;
        let targetCol = this.col + (dCol * dist);
        
        // Clamp to grid bounds
        if (targetCol < 0) targetCol = 0;
        if (targetCol >= this.grid.cols) targetCol = this.grid.cols - 1;
        
        // Must stay on bottom row
        let targetRow = bottomRow;
        
        if (this.isMoving || this.isFrozen || this.isPetrified) return;
        if (targetCol < 0 || targetCol >= this.grid.cols) return;
        
        // Check Chapter 2 Obstacles
        if (this.grid.cells[targetRow][targetCol].status === 'locked') return;
        
        // Track history
        this.history.push({ col: this.col, row: this.row });
        if (this.history.length > 10) this.history.shift();
        
        this.isMoving = true;
        this.facing = actDir;
        this.col = targetCol;
        this.row = targetRow;
        
        const targetPos = this.grid.getPixelPosition(this.col, this.row);
        
        // Play directional dash animation
        this.sprite.play(`dash_${direction}`);
        
        let duration = this.isSpeedBoosted ? 75 : 150;
        if (this.hasDash) duration = 200;
        
        if (this.hasDash) {
            this.hasDash = false;
        }
        
        this.scene.tweens.add({
          targets: this.sprite,
          x: targetPos.x,
          y: targetPos.y,
          duration: duration,
          ease: 'Power2',
          onComplete: () => {
            this.isMoving = false;
            this.sprite.play(`idle_${this.facing}`);
            this.scene.events.emit('player:moved', this.col, this.row);
          }
        });
      };

      // 5 waves of beams (easier difficulty)
      let wave = 0;
      const doWave = () => {
         if (wave >= 5 || this.hp <= 0 || this.scene.isGameOver) return;
         
         // Siren attacks at start of each wave
         playAttackAnim();
         
         // Subtle flash at start of each wave
         if (wave > 0) {
           this.scene.cameras.main.flash(80, 0, 100, 255, 0.2);
         }
         
         // Cycle through different beam types for visual variety
         const beamType = wave % 3; // 0 = spark, 1 = tide lightning, 2 = spark
         
         const isGiant = Math.random() < 0.25; // 25% chance for giant beams (easier)
         
         // Add cross-beam pattern - every 3rd wave
         const isCrossPattern = wave % 3 === 2 && wave > 0;

         if (isCrossPattern) {
           // CROSS PATTERN: 3 beams with spark and tide lightning only
           const crossCols = [2, 4, 6];
           const beamAssets = ['ch3_spark', 'ch3_tide_lightning', 'ch3_spark'];
           const beamAnims = ['anim_ch3_spark', 'anim_ch3_tide_lightning', 'anim_ch3_spark'];
           
           crossCols.forEach((mgC, idx) => {
             this.scene.time.delayedCall(idx * 200, () => {
               if (this.hp <= 0 || this.scene.isGameOver) return;
               
               this.grid.telegraphCol(mgC - 1, 600);
               this.grid.telegraphCol(mgC, 600);
               this.grid.telegraphCol(mgC + 1, 600);
               
               this.scene.time.delayedCall(600, () => {
                  if (this.hp <= 0 || this.scene.isGameOver) return;
                  const beamX = this.grid.getPixelPosition(mgC, 0).x;
                  const beamStartY = this.grid.getPixelPosition(mgC, -3).y;
                  const beamEndY   = this.grid.getPixelPosition(mgC, this.grid.rows + 3).y;

                  // Use different asset for each beam in cross pattern (no tint)
                  const assetIdx = idx % 3;
                  const beam = this.scene.add.sprite(beamX, beamStartY, beamAssets[assetIdx])
                    .setDepth(15).setDisplaySize(ts * this._mobileScale(3), ts * this._mobileScale(3)).play(beamAnims[assetIdx]);
                  
                  // Spark particle trail
                  const trailTimer = this.scene.time.addEvent({
                    delay: 80,
                    repeat: 12,
                    callback: () => {
                      if (!beam.active) return;
                      const trail = this.scene.add.sprite(beam.x + Phaser.Math.Between(-15, 15), beam.y + Phaser.Math.Between(-20, 20), 'ch3_spark')
                        .setDepth(14).setScale(1.2).setAlpha(0.7).play('anim_ch3_spark');
                      this.scene.time.delayedCall(400, () => trail.destroy());
                    }
                  });

                  // SLOWER duration for easier difficulty (1000ms instead of 600)
                  this.scene.tweens.add({
                    targets: beam, 
                    y: beamEndY, 
                    duration: 1000,
                    ease: 'Power2',
                    onUpdate: () => {
                      if (!beam.active) return;
                      if (Math.abs(this.scene.player.col - mgC) <= 1) {
                        const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                        if (Math.abs(beam.y - pPix.y) < ts * 1.5) {
                          this.scene.player.takeDamage();
                          // Eye explosion effect on damage
                          const eyeExplosion = this.scene.add.sprite(pPix.x, pPix.y, 'eye_explosion')
                            .setDepth(200).setScale(1.5).play('anim_eye_explosion');
                          this.scene.time.delayedCall(600, () => eyeExplosion.destroy());
                        }
                      }
                    },
                    onComplete: () => {
                      trailTimer.remove();
                      beam.destroy();
                    }
                  });
               });
             });
           });
         } else if (isGiant) {
            const mgC = Phaser.Math.Between(1, this.grid.cols - 2);
            this.grid.telegraphCol(mgC - 1, 700);
            this.grid.telegraphCol(mgC, 700);
            this.grid.telegraphCol(mgC + 1, 700);
            
            this.scene.time.delayedCall(700, () => {
               if (this.hp <= 0 || this.scene.isGameOver) return;
               const beamX = this.grid.getPixelPosition(mgC, 0).x;
               const beamStartY = this.grid.getPixelPosition(mgC, -3).y;
               const beamEndY   = this.grid.getPixelPosition(mgC, this.grid.rows + 3).y;

               // Randomly choose between tide lightning and spark for variety
               const useTideLightning = Math.random() > 0.5;
               const beamAsset = useTideLightning ? 'ch3_tide_lightning' : 'ch3_spark';
               const beamAnim = useTideLightning ? 'anim_ch3_tide_lightning' : 'anim_ch3_spark';

               const beam = this.scene.add.sprite(beamX, beamStartY, beamAsset)
                 .setDepth(15).setDisplaySize(ts * this._mobileScale(2.5), ts * this._mobileScale(2.5)).play(beamAnim);

               // Add spark effects around the beam
               const sparkTimer = this.scene.time.addEvent({
                 delay: 100,
                 repeat: 10,
                 callback: () => {
                   if (!beam.active) return;
                   const spark = this.scene.add.sprite(
                     beam.x + Phaser.Math.Between(-30, 30), 
                     beam.y + Phaser.Math.Between(-40, 40), 
                     'ch3_spark'
                   ).setDepth(16).setScale(0.8).setAlpha(0.8).play('anim_ch3_spark');
                   this.scene.time.delayedCall(300, () => spark.destroy());
                 }
               });

               // SLOWER duration (1100ms instead of 600)
               this.scene.tweens.add({
                 targets: beam, y: beamEndY, duration: 1100,
                 ease: 'Power2',
                 onUpdate: () => {
                   if (!beam.active) return;
                   if (Math.abs(this.scene.player.col - mgC) <= 1) {
                     const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                     if (Math.abs(beam.y - pPix.y) < ts * 1.5) {
                       this.scene.player.takeDamage();
                       // Eye explosion effect on damage
                       const eyeExplosion = this.scene.add.sprite(pPix.x, pPix.y, 'eye_explosion')
                         .setDepth(200).setScale(1.5).play('anim_eye_explosion');
                       this.scene.time.delayedCall(600, () => eyeExplosion.destroy());
                     }
                   }
                 },
                 onComplete: () => {
                   sparkTimer.remove();
                   beam.destroy();
                 }
               });
            });
         } else {
            // Regular beams - 3 columns (easier than 4)
            const colsToHit = [];
            while (colsToHit.length < 3) {
               const rc = Phaser.Math.Between(0, this.grid.cols - 1);
               if (!colsToHit.includes(rc)) colsToHit.push(rc);
            }
            
            // Choose beam style based on wave type - spark and tide lightning only
            const beamStyles = [
              { asset: 'ch3_spark', anim: 'anim_ch3_spark', scaleX: 1.0, scaleY: 1.0 },
              { asset: 'ch3_tide_lightning', anim: 'anim_ch3_tide_lightning', scaleX: 1.0, scaleY: 1.2 },
              { asset: 'ch3_spark', anim: 'anim_ch3_spark', scaleX: 1.2, scaleY: 1.0 }
            ];
            const style = beamStyles[beamType];
            
            colsToHit.forEach((c, idx) => {
               this.scene.time.delayedCall(idx * 150, () => {
                 this.grid.telegraphCol(c, 700);
                 this.scene.time.delayedCall(700, () => {
                    if (this.hp <= 0 || this.scene.isGameOver) return;
                    const beamX = this.grid.getPixelPosition(c, 0).x;
                    const beamStartY = this.grid.getPixelPosition(c, -3).y;
                    const beamEndY   = this.grid.getPixelPosition(c, this.grid.rows + 3).y;

                    const beam = this.scene.add.sprite(beamX, beamStartY, style.asset)
                      .setDepth(15).setDisplaySize(ts * this._mobileScale(style.scaleX), ts * this._mobileScale(style.scaleY)).play(style.anim);

                    // Add occasional spark
                    if (Math.random() > 0.5) {
                      const spark = this.scene.add.sprite(beamX, beamStartY + 50, 'ch3_spark')
                        .setDepth(16).setScale(0.6).play('anim_ch3_spark');
                      this.scene.time.delayedCall(400, () => spark.destroy());
                    }

                    // SLOWER duration (1600ms - easier than 1200 but still challenging)
                    this.scene.tweens.add({
                      targets: beam, y: beamEndY, duration: 1600,
                      ease: 'Power2',
                      onUpdate: () => {
                        if (!beam.active) return;
                        if (this.scene.player.col === c) {
                          const pPix = this.grid.getPixelPosition(c, this.scene.player.row);
                          if (Math.abs(beam.y - pPix.y) < ts * 0.5) {
                            this.scene.player.takeDamage();
                            // Eye explosion effect on damage
                            const eyeExplosion = this.scene.add.sprite(pPix.x, pPix.y, 'eye_explosion')
                              .setDepth(200).setScale(1.5).play('anim_eye_explosion');
                            this.scene.time.delayedCall(600, () => eyeExplosion.destroy());
                          }
                        }
                      },
                      onComplete: () => beam.destroy()
                    });
                 });
               });
            });
         }
         
         wave++;
         // Normal wave interval (2200ms - easier than 1800)
         this.scene.time.delayedCall(2200, doWave);
      };
      
      this.scene.time.delayedCall(600, doWave);

      // Cleanup after 13 seconds (5 waves at 2200ms each + buffer)
      this.scene.time.delayedCall(13000, () => {
        if (this.scene.player) {
          this.scene.player.isCharmed = false;
          // Restore original move function
          this.scene.player.move = originalMove;
        }
        
        // Stop siren walking
        if (sirenWalkTween) sirenWalkTween.stop();
        
        // Flashy exit
        this.scene.cameras.main.flash(400, 255, 255, 255);
        if (sirenContainer && sirenContainer.active) {
          this._spawnSmoke(sirenContainer.x, sirenContainer.y, null);
          sirenContainer.destroy();
        }
      });
    });

    return 13500; // Return duration for 5 waves
  }



  // ─── ATTACK 11: Medusa Gaze ───────────────────────────────────────
  ch3MedusaGaze() {
    const ts = this.grid.tileSize;
    const mc = Math.floor(this.grid.cols / 2);
    const pix = this.grid.getPixelPosition(mc, 0); // Spawn on first row

    this._spawnSmoke(pix.x, pix.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const siren = this.scene.add.sprite(pix.x, pix.y, 'ch3_siren2')
        .setDepth(100).setScale(1.3).play('anim_ch3_siren2');

      const warn = this.scene.add.text(
        this.grid.getPixelPosition(mc, 4).x, this.grid.getPixelPosition(mc, 4).y,
        "FREEZE!", { fontSize: '28px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }
      ).setOrigin(0.5).setDepth(200);
      this.scene.tweens.add({ targets: warn, alpha: 0.4, yoyo: true, repeat: 3, duration: 300, onComplete: () => warn.destroy() });

      // Immediately root player - they cannot move while siren is present
      const wasPetrified = this.scene.player.isPetrified;
      this.scene.player.isPetrified = true;
      
      let gazeActive = true;
      let hasDamaged = false;
      
      const onPlayerMove = () => {
        if (!gazeActive || hasDamaged) return;
        hasDamaged = true;
        this.scene.player.takeDamage();
        
        // Visual feedback
        const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
        const bubble = this.scene.add.sprite(pPix.x, pPix.y, 'ch3_fx_bubble').setDepth(120).setScale(3).play('anim_ch3_fx_bubble');
        this.scene.time.delayedCall(500, () => {
          this.scene.tweens.add({ targets: bubble, alpha: 0, scale: 0, duration: 200, onComplete: () => bubble.destroy() });
        });
        
        // Siren disappears immediately after damage
        gazeActive = false;
        this.scene.player.isPetrified = wasPetrified; // Restore previous state
        this.scene.events.off('player:moved', onPlayerMove);
        if (siren && siren.active) this._spawnSmoke(siren.x, siren.y, null);
        if (siren && siren.active) siren.destroy();
      };

      this.scene.events.on('player:moved', onPlayerMove);

      // Auto-remove after 2 seconds if player didn't move
      this.scene.time.delayedCall(2000, () => {
        if (!hasDamaged && gazeActive) {
          gazeActive = false;
          this.scene.player.isPetrified = wasPetrified; // Restore previous state
          this.scene.events.off('player:moved', onPlayerMove);
          if (siren && siren.active) this._spawnSmoke(siren.x, siren.y, null);
          if (siren && siren.active) siren.destroy();
        }
      });
    });

    return 3000;
  }

  // ─── ATTACK 12: Cthulhu Rifts ─────────────────────────────────────
  ch3CthulhuRifts() {
    const ts = this.grid.tileSize;
    const spawnC = Phaser.Math.Between(2, this.grid.cols - 3);
    const spawnR = Phaser.Math.Between(2, this.grid.rows - 3);
    const spawnPix = this.grid.getPixelPosition(spawnC, spawnR);

    this._spawnSmoke(spawnPix.x, spawnPix.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;

      const cthulhu = this.scene.add.sprite(spawnPix.x, spawnPix.y, 'ch3_cthulhu')
        .setDepth(80).setScale(3).play('anim_ch3_cthulhu_idle');

      const ringSize = ts * 3;
      const ring = this.scene.add.sprite(spawnPix.x, spawnPix.y, 'ch3_fx_ring')
        .setDepth(79).setDisplaySize(ringSize, ringSize).play('anim_ch3_fx_ring');

      const ringDmgTimer = this.scene.time.addEvent({
        delay: 300, loop: true,
        callback: () => {
          if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player || !ring.active) return;
          const pPix = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
          if (Math.abs(ring.x - pPix.x) < ts * 1.2 && Math.abs(ring.y - pPix.y) < ts * 1.2
            && !(Math.abs(ring.x - pPix.x) < ts * 0.3 && Math.abs(ring.y - pPix.y) < ts * 0.3)) {
            this.scene.player.takeDamage();
          }
        }
      });

      let wanderC = spawnC, wanderR = spawnR;
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      let facing = 1;

      const wander = () => {
        if (this.hp <= 0 || this.scene.isGameOver) return;
        cthulhu.play('anim_ch3_cthulhu_fly', true);
        const [dc, dr] = dirs[Phaser.Math.Between(0, 3)];
        // Clamp heavily so it doesn't leave board
        wanderC = Phaser.Math.Clamp(wanderC + dc, 1, this.grid.cols - 2);
        wanderR = Phaser.Math.Clamp(wanderR + dr, 1, this.grid.rows - 2);
        if (dc < 0) { cthulhu.setFlipX(true); facing = 0; }
        else if (dc > 0) { cthulhu.setFlipX(false); facing = 1; }
        const wp = this.grid.getPixelPosition(wanderC, wanderR);
        this.scene.tweens.add({
          targets: [cthulhu, ring], x: wp.x, y: wp.y, duration: 600,
          onComplete: () => cthulhu.play('anim_ch3_cthulhu_idle', true)
        });
      };
      const wanderTimer = this.scene.time.addEvent({ delay: 700, repeat: 4, callback: wander });

      this.scene.time.delayedCall(3800, () => {
        const performCthulhuSequence = () => {
          // Attack 1: Whirlpool Cast
          cthulhu.play('anim_ch3_cthulhu_cast');
          let wc = Phaser.Math.Between(1, this.grid.cols - 2);
          let wr = Phaser.Math.Between(1, this.grid.rows - 2);
          
          for(let dc=-1; dc<=1; dc++) for(let dr=-1; dr<=1; dr++) this.grid.telegraph(wc+dc, wr+dr, 1000);
          
          this.scene.time.delayedCall(1000, () => {
             if (this.hp <= 0 || this.scene.isGameOver) return;
             const wp2 = this.grid.getPixelPosition(wc, wr);
             const whirl = this.scene.add.sprite(wp2.x, wp2.y, 'ch3_fx_whirl')
               .setDepth(55).setDisplaySize(ts * 3, ts * 3).play('anim_ch3_fx_whirl');

             const whirlDmg = this.scene.time.addEvent({
               delay: 200, repeat: 10,
               callback: () => {
                 if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player || !whirl.active) return;
                 const pC = this.scene.player.col, pR = this.scene.player.row;
                 if (Math.abs(pC - wc) <= 1 && Math.abs(pR - wr) <= 1) this.scene.player.takeDamage();
               }
             });

             const driftDir = dirs[Phaser.Math.Between(0, 3)];
             const newWC = Phaser.Math.Clamp(wc + driftDir[0] * 2, 0, this.grid.cols - 1);
             const newWR = Phaser.Math.Clamp(wr + driftDir[1] * 2, 0, this.grid.rows - 1);
             const newPix = this.grid.getPixelPosition(newWC, newWR);
             this.scene.tweens.add({ targets: whirl, x: newPix.x, y: newPix.y, duration: 2000, onComplete: () => { whirlDmg.remove(); whirl.destroy(); } });
          });

          // Attack 2: Fireblade Slash natively queued afterwards
          this.scene.time.delayedCall(2500, () => {
            if (this.hp <= 0 || this.scene.isGameOver) return;
            cthulhu.play('anim_ch3_cthulhu_slash');
            cthulhu.once('animationcomplete', () => {
                if (cthulhu.active) cthulhu.play('anim_ch3_cthulhu_idle');
            });
            
            const pC = this.scene.player.col;
            const pR = this.scene.player.row;
            let dc = 0, dr = 0;
            if (pC > wanderC) dc = 1; else if (pC < wanderC) dc = -1;
            if (pR > wanderR) dr = 1; else if (pR < wanderR) dr = -1;
            
            if (dc === 0 && dr === 0) dc = 1;
            
            const pathTiles = [];
            let sc = wanderC, sr = wanderR;
            while (sc >= -2 && sc <= this.grid.cols + 1 && sr >= -2 && sr <= this.grid.rows + 1) {
                sc += dc; sr += dr;
                pathTiles.push({c: sc, r: sr});
            }
            
            pathTiles.forEach(pt => {
                for (let dd = -1; dd <= 1; dd++) {
                    for (let ddd = -1; ddd <= 1; ddd++) {
                        this.grid.telegraph(pt.c + dd, pt.r + ddd, 800); // Faster telegraph
                    }
                }
            });
            
            this.scene.time.delayedCall(800, () => {
                if (this.hp <= 0 || this.scene.isGameOver) return;
                const startPix = this.grid.getPixelPosition(wanderC, wanderR);
                const destC = wanderC + dc * 12;
                const destR = wanderR + dr * 12;
                const destPix = this.grid.getPixelPosition(destC, destR);
                
                let bladeAngle = 0; // Default LEFT
                if (dc === 1 && dr === 0) bladeAngle = 180;
                else if (dc === 0 && dr === -1) bladeAngle = 90;
                else if (dc === 0 && dr === 1) bladeAngle = 270;
                else if (dc === -1 && dr === -1) bladeAngle = 45;
                else if (dc === 1 && dr === -1) bladeAngle = 135;
                else if (dc === 1 && dr === 1) bladeAngle = 225;
                else if (dc === -1 && dr === 1) bladeAngle = 315;
                
                const blade = this.scene.add.sprite(startPix.x, startPix.y, 'ch3_fx_fireblade')
                   .setDepth(85).setDisplaySize(ts * 3, ts * 3).setAngle(bladeAngle).play('anim_ch3_fx_fireblade');
                   
                this.scene.tweens.add({
                   targets: blade, x: destPix.x, y: destPix.y, duration: 1200, // much faster
                   onUpdate: () => {
                       if (!blade.active) return;
                       const pcx = this.grid.getPixelPosition(this.scene.player.col, this.scene.player.row);
                       if (Math.abs(blade.x - pcx.x) < ts * 1.5 && Math.abs(blade.y - pcx.y) < ts * 1.5) {
                           this.scene.player.takeDamage();
                       }
                   },
                   onComplete: () => blade.destroy()
                });
            });
          });

          this.scene.time.delayedCall(7500, () => {
            wanderTimer.remove(); ringDmgTimer.remove();
            cthulhu.setVisible(false);
            ring.setVisible(false);
            this._spawnSmoke(cthulhu.x, cthulhu.y, () => {
                ring.destroy(); cthulhu.destroy();
            });
          });
        };
        performCthulhuSequence();
      });
    });

    return 12500;
  }



  // ─── ATTACK 14: Siren Snake Chase ────────────────────────────────
  ch3SirenSnakeChase() {
    const ts = this.grid.tileSize;
    const mc = Math.floor(this.grid.cols / 2);
    const spawnPix = this.grid.getPixelPosition(mc, 0); // Spawns on board

    this._spawnSmoke(spawnPix.x, spawnPix.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;
      const siren = this.scene.add.sprite(spawnPix.x, spawnPix.y, 'ch3_siren3_idle')
        .setDepth(100).setScale(1.2).play('anim_ch3_siren3_idle');

      siren.play('anim_ch3_siren3_special');
      this.scene.cameras.main.shake(300, 0.015);

      const snakeSize = ts * 1.5;

      for (let i = 0; i < 4; i++) {
        this.scene.time.delayedCall(i * 1200, () => {
          if (this.hp <= 0 || this.scene.isGameOver) return;
          let sC = mc + (i % 2 === 0 ? -1 : 1);
          let sR = 1;
          sC = Phaser.Math.Clamp(sC, 0, this.grid.cols - 1);

          const np = this.grid.getPixelPosition(sC, sR);
          const snake = this.scene.add.sprite(np.x, np.y, 'ch3_snake')
            .setDepth(45).setDisplaySize(snakeSize, snakeSize).play('anim_ch3_snake');

          const tick = this.scene.time.addEvent({
            delay: 600, repeat: 12,
            callback: () => {
              if (this.hp <= 0 || this.scene.isGameOver) return;
              const pC = this.scene.player.col, pR = this.scene.player.row;
              let dc = 0, dr = 0;
              if (sC < pC) dc = 1; else if (sC > pC) dc = -1;
              if (sR < pR) dr = 1; else if (sR > pR) dr = -1;
              if (dc !== 0 && dr !== 0) { Math.random() > 0.5 ? (dr = 0) : (dc = 0); }

              sC = Phaser.Math.Clamp(sC + dc, 0, this.grid.cols - 1);
              sR = Phaser.Math.Clamp(sR + dr, 0, this.grid.rows - 1);

              snake.setFlipX(dc > 0);
              
              // Red telegraph for next tile
              this.grid.telegraph(sC, sR, 550);

              const snp = this.grid.getPixelPosition(sC, sR);
              this.scene.tweens.add({ targets: snake, x: snp.x, y: snp.y, duration: 580 });

              // Check if player is on the newly moved tile
              this.scene.time.delayedCall(580, () => {
                 if (this.hp <= 0 || this.scene.isGameOver || !this.scene.player) return;
                 if (this.scene.player.col === sC && this.scene.player.row === sR) {
                    this.scene.player.takeDamage();
                 }
              });
            }
          });

          this.scene.time.delayedCall(7800, () => {
            tick.remove();
            if (snake.active) this.scene.tweens.add({ targets: snake, alpha: 0, scale: 0, duration: 300, onComplete: () => snake.destroy() });
          });
        });
      }

      this.scene.time.delayedCall(5000, () => {
        if (siren && siren.active) this._spawnSmoke(siren.x, siren.y, null);
        if (siren && siren.active) siren.destroy();
      });
    });

    return 11000;
  }

  // ─── ATTACK 7: Monster Ambush ────────────────────────────────────────
  ch3MonsterAmbush() {
    const ts = this.grid.tileSize;
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const scene = this.scene;

    // Play monster summon sound at start
    audioManager.play('ch3_monster_summon', { volume: 0.85 });

    // Flashy intro - screen shake and flash
    scene.cameras.main.shake(600, 0.025);
    scene.cameras.main.flash(600, 50, 0, 100, true);

    const centerC = Math.floor(cols / 2);
    const centerR = Math.floor(rows / 2);

    // Bigger flower pattern: organized in waves for sequential spawn
    // Wave 0: Center
    const wave0 = [{ c: centerC, r: centerR }];
    // Wave 1: Cardinal directions (close)
    const wave1 = [
      { c: centerC, r: centerR - 1 }, { c: centerC, r: centerR + 1 },
      { c: centerC - 1, r: centerR }, { c: centerC + 1, r: centerR }
    ];
    // Wave 2: Cardinal directions (far)
    const wave2 = [
      { c: centerC, r: centerR - 2 }, { c: centerC, r: centerR - 3 }, { c: centerC, r: centerR - 4 },
      { c: centerC, r: centerR + 2 }, { c: centerC, r: centerR + 3 }, { c: centerC, r: centerR + 4 },
      { c: centerC - 2, r: centerR }, { c: centerC - 3, r: centerR }, { c: centerC - 4, r: centerR },
      { c: centerC + 2, r: centerR }, { c: centerC + 3, r: centerR }, { c: centerC + 4, r: centerR }
    ];
    // Wave 3: Diagonals (all)
    const wave3 = [
      { c: centerC - 1, r: centerR - 1 }, { c: centerC - 2, r: centerR - 2 }, { c: centerC - 3, r: centerR - 3 },
      { c: centerC + 1, r: centerR - 1 }, { c: centerC + 2, r: centerR - 2 }, { c: centerC + 3, r: centerR - 3 },
      { c: centerC - 1, r: centerR + 1 }, { c: centerC - 2, r: centerR + 2 }, { c: centerC - 3, r: centerR + 3 },
      { c: centerC + 1, r: centerR + 1 }, { c: centerC + 2, r: centerR + 2 }, { c: centerC + 3, r: centerR + 3 }
    ];

    const waves = [wave0, wave1, wave2, wave3];
    const waveDelay = 500; // ms between waves
    const telegraphDuration = 400;

    // Process each wave in sequence
    waves.forEach((wave, waveIndex) => {
      // Filter valid positions
      const validWave = wave.filter(pos => 
        pos.c >= 0 && pos.c < cols && pos.r >= 0 && pos.r < rows
      );

      if (validWave.length === 0) return;

      // Telegraph this wave
      scene.time.delayedCall(waveIndex * waveDelay, () => {
        validWave.forEach(pos => this.grid.telegraph(pos.c, pos.r, telegraphDuration));
      });

      // Spawn this wave after telegraph
      scene.time.delayedCall(waveIndex * waveDelay + telegraphDuration, () => {
        scene.cameras.main.shake(150 + waveIndex * 50, 0.015 + waveIndex * 0.005);
        // Play monster step sound for each wave
        const stepVariant = Phaser.Math.Between(1, 2);
        audioManager.play(`ch3_monster_step${stepVariant === 1 ? '' : '_' + stepVariant}`, { volume: 0.75 });
        validWave.forEach(pos => {
          this._spawnBigMonsterOnGrid(pos.c, pos.r, ts);
        });
      });
    });

    return waves.length * waveDelay + 2000;
  }

  // Helper for Monster Ambush - spawns BIG monster that fills the grid tile
  _spawnBigMonsterOnGrid(c, r, ts) {
    const pos = this.grid.getPixelPosition(c, r);

    // Smoke spawn effect
    this._spawnSmoke(pos.x, pos.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;

      // Create the monster BIG - proper aspect ratio (64x32 = 2:1)
      // Width: 2 tiles, Height: 1 tile, bottom-aligned to grid tile
      const monster = this.scene.add.sprite(pos.x, pos.y + ts * 0.5, 'ch3_monster2')
        .setDepth(70)
        .setOrigin(0.5, 1) // Bottom-center anchor
        .setDisplaySize(ts * 2, ts * 1) // 2:1 aspect ratio, fills tile
        .play('anim_ch3_monster2');

      // Damage player if on same tile
      if (this.scene.player.col === c && this.scene.player.row === r) {
        this.scene.player.takeDamage();
      }

      // Despawn after animation
      this.scene.time.delayedCall(2000, () => {
        if (monster.active) {
          if (!this._isMobile()) this._spawnSmoke(monster.x, monster.y, null);
          monster.destroy();
        }
      });
    });
  }

  // ─── ATTACK 8: Abyssal Spiral ────────────────────────────────────────
  ch3AbyssalSpiral() {
    const ts = this.grid.tileSize;
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const scene = this.scene;

    // Play teleport sound at start
    audioManager.play('ch3_teleport', { volume: 0.8 });

    // Beautiful intro - slow dramatic build (minimal shake)
    scene.cameras.main.shake(400, 0.008);
    scene.cameras.main.flash(500, 255, 255, 255, true);

    const centerC = Math.floor(cols / 2);
    const centerR = Math.floor(rows / 2);

    // Create a beautiful spiral pattern - expanding rings with rotation
    const spiralRings = [];
    const maxRadius = Math.min(centerC, centerR);

    for (let radius = 0; radius <= maxRadius; radius++) {
      const ring = [];
      if (radius === 0) {
        ring.push({ c: centerC, r: centerR });
      } else {
        // Create ring positions at this radius
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const c = Math.round(centerC + radius * Math.cos(rad));
          const r = Math.round(centerR + radius * Math.sin(rad));
          // Only add unique positions within bounds
          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            if (!ring.some(pos => pos.c === c && pos.r === r)) {
              ring.push({ c, r });
            }
          }
        }
      }
      if (ring.length > 0) spiralRings.push(ring);
    }

    // Create wave pairs - alternating clockwise/counter-clockwise
    const waves = [];
    for (let i = 0; i < spiralRings.length; i++) {
      const ring = spiralRings[i];
      // Split ring into two waves for spiral effect
      const wave1 = ring.filter((_, idx) => idx % 2 === 0);
      const wave2 = ring.filter((_, idx) => idx % 2 === 1);
      if (wave1.length > 0) waves.push(wave1);
      if (wave2.length > 0) waves.push(wave2);
    }

    // Beautiful color sequence for each wave
    const waveColors = [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff];

    const waveDelay = 400;
    const telegraphDuration = 350;

    // Spawn waves in beautiful sequence
    waves.forEach((wave, waveIndex) => {
      // Telegraph this wave with color
      scene.time.delayedCall(waveIndex * waveDelay, () => {
        wave.forEach(pos => {
          this.grid.telegraph(pos.c, pos.r, telegraphDuration);
          // Skip glow sprites on mobile — too many simultaneous sprites
          if (!this._isMobile()) {
            const glow = scene.add.sprite(
              this.grid.getPixelPosition(pos.c, pos.r).x,
              this.grid.getPixelPosition(pos.c, pos.r).y,
              'ch3_fx_ring'
            ).setDepth(60).setTint(waveColors[waveIndex % waveColors.length]).setAlpha(0.6);
            scene.time.delayedCall(telegraphDuration, () => glow.destroy());
          }
        });
      });

      // Spawn this wave's monsters (gentle shake)
      scene.time.delayedCall(waveIndex * waveDelay + telegraphDuration, () => {
        scene.cameras.main.shake(80, 0.006);
        // Play shimmer tone for each wave spawn
        if (waveIndex % 2 === 0) {
          const shimmerVariant = Phaser.Math.Between(1, 2);
          audioManager.play(`ch3_shimmer_tone${shimmerVariant === 1 ? '' : '_' + shimmerVariant}`, { volume: 0.6 });
        }
        wave.forEach((pos, idx) => {
          scene.time.delayedCall(idx * 80, () => {
            this._spawnAbyssalMonster(pos.c, pos.r, ts, waveColors[waveIndex % waveColors.length]);
          });
        });
      });
    });

    // Grand finale - all remaining edge positions (cap on mobile)
    const finaleDelay = waves.length * waveDelay + 1000;
    let edgePositions = [];
    for (let c = 0; c < cols; c++) {
      edgePositions.push({ c, r: 0 }, { c, r: rows - 1 });
    }
    for (let r = 1; r < rows - 1; r++) {
      edgePositions.push({ c: 0, r }, { c: cols - 1, r });
    }
    if (this._isMobile()) {
      Phaser.Utils.Array.Shuffle(edgePositions);
      edgePositions = edgePositions.slice(0, 12);
    }

    scene.time.delayedCall(finaleDelay, () => {
      scene.cameras.main.shake(200, 0.012);
      scene.cameras.main.flash(300, 255, 255, 255, true);
      edgePositions.forEach(pos => this.grid.telegraph(pos.c, pos.r, 400));
    });

    scene.time.delayedCall(finaleDelay + 500, () => {
      // Play monster summon for finale
      audioManager.play('ch3_monster_summon_2', { volume: 0.8 });
      edgePositions.forEach(pos => {
        this._spawnAbyssalMonster(pos.c, pos.r, ts, 0xffffff);
      });
    });

    return finaleDelay + 2500;
  }

  // Helper for Abyssal Spiral - spawns colored abyssal monster
  _spawnAbyssalMonster(c, r, ts, tintColor) {
    const pos = this.grid.getPixelPosition(c, r);

    this._spawnSmoke(pos.x, pos.y, () => {
      if (this.hp <= 0 || this.scene.isGameOver) return;

      // Create the monster (96x64 = 3:2 aspect ratio)
      const monster = this.scene.add.sprite(pos.x, pos.y + ts * 0.3, 'ch3_monster6')
        .setDepth(70)
        .setOrigin(0.5, 1)
        .setDisplaySize(ts * 2, ts * 1.3) // Wider monster
        .setTint(tintColor)
        .play('anim_ch3_monster6');

      // Damage player if on same tile
      if (this.scene.player.col === c && this.scene.player.row === r) {
        this.scene.player.takeDamage();
      }

      // Despawn after animation
      this.scene.time.delayedCall(2200, () => {
        if (monster.active) {
          if (!this._isMobile()) this._spawnSmoke(monster.x, monster.y, null);
          monster.destroy();
        }
      });
    });
  }

  // ─── CHAPTER 3 ULTIMATE: Abyssal Trail ─────────────────────────────
  ch3UltimateRotatingBarrage() {
    const ts = this.grid.tileSize;
    const scene = this.scene;
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const duration = 15000; // 15 seconds

    // Play eruption sound for ultimate intro
    audioManager.play('ch3_eruption', { volume: 0.9 });

    // ── BIG dramatic intro ──
    scene.cameras.main.shake(800, 0.035);
    scene.cameras.main.flash(1000, 0, 80, 200, true);

    // Boss attack animation
    scene.events.emit('boss:attack');

    const active = { value: true };
    const fireMap = new Map();
    let fireCount = 0;

    // Place a permanent fire on a grid cell with flashy FX
    const placeFireAt = (col, row) => {
      const key = `${col},${row}`;
      if (fireMap.has(key)) return;
      if (col < 0 || col >= cols || row < 0 || row >= rows) return;

      const pos = this.grid.getPixelPosition(col, row);
      fireCount++;

      // Spawn smoke puff on ignition (skip on mobile)
      if (!this._isMobile()) {
        const smoke = scene.add.sprite(pos.x, pos.y, 'ch3_smoke_spawn')
          .setDepth(160).setDisplaySize(ts * this._mobileScale(1.8), ts * this._mobileScale(1.8)).setAlpha(0.7).play('anim_ch3_smoke');
        smoke.once('animationcomplete', () => smoke.destroy());
      }

      // Blue FX ring burst (skip on mobile)
      if (!this._isMobile()) {
        const ring = scene.add.sprite(pos.x, pos.y, 'ch3_fx_ring')
          .setDepth(155).setDisplaySize(ts * 0.5, ts * 0.5).setAlpha(0.9).play('anim_ch3_fx_ring');
        scene.tweens.add({
          targets: ring, displayWidth: ts * 2.5, displayHeight: ts * 2.5, alpha: 0,
          duration: 350, onComplete: () => ring.destroy()
        });
      }

      // The fire itself
      const fire = scene.add.sprite(pos.x, pos.y, 'ch3_water_beam')
        .setDepth(150)
        .setDisplaySize(ts * 1.6, ts * 1.6)
        .setAlpha(0)
        .play('anim_ch3_water_beam');

      // Play beam fire sound (rate limited)
      if (fireCount % 3 === 0) {
        const beamVariant = Phaser.Math.Between(1, 2);
        audioManager.play(`ch3_beam_fire${beamVariant === 1 ? '' : '_' + beamVariant}`, { volume: 0.6 });
      }

      // Fade in + subtle pulsing glow
      scene.tweens.add({ targets: fire, alpha: 0.9, duration: 150 });
      scene.tweens.add({
        targets: fire, alpha: 0.6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });

      // Mini shake on each fire placement (skip on mobile to reduce overhead)
      if (!this._isMobile()) scene.cameras.main.shake(60, 0.005);

      fireMap.set(key, { sprite: fire, col, row });

      // Every 5 fires, do a bigger screen shake + flash (every 10 on mobile)
      const shakeInterval = this._isMobile() ? 10 : 5;
      if (fireCount % shakeInterval === 0) {
        scene.cameras.main.shake(150, 0.012);
        scene.cameras.main.flash(150, 0, 120, 200, true);
      }
    };

    // Clear all fires with explosion FX
    const clearAllFires = () => {
      // Play energy dissipate sound when clearing fires
      audioManager.play('ch3_energy_dissipate', { volume: 0.8 });
      fireMap.forEach(entry => {
        if (entry.sprite.active) {
          const pos = { x: entry.sprite.x, y: entry.sprite.y };
          // Explosion on each fire tile as it clears
          const exp = scene.add.sprite(pos.x, pos.y, 'ch3_fx_bubble')
            .setDepth(170).setDisplaySize(ts * 1.5, ts * 1.5).play('anim_ch3_fx_bubble');
          scene.time.delayedCall(400, () => exp.destroy());

          scene.tweens.add({
            targets: entry.sprite, alpha: 0, scaleX: 0.2, scaleY: 0.2,
            duration: 300, onComplete: () => entry.sprite.destroy()
          });
        }
      });
      fireMap.clear();
    };

    // Track the player's last known position
    let lastPlayerCol = scene.player.col;
    let lastPlayerRow = scene.player.row;

    // Idle timer — fire catches standing players
    let idleTimer = 0;
    const idleThreshold = 800;

    // Movement tracker + idle punisher
    const moveTracker = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!active.value || this.hp <= 0 || scene.isGameOver) { moveTracker.remove(); return; }

        const pc = scene.player.col;
        const pr = scene.player.row;

        if (pc !== lastPlayerCol || pr !== lastPlayerRow) {
          const prevC = lastPlayerCol;
          const prevR = lastPlayerRow;
          scene.time.delayedCall(70, () => {
            if (!active.value) return;
            placeFireAt(prevC, prevR);
          });
          lastPlayerCol = pc;
          lastPlayerRow = pr;
          idleTimer = 0;
        } else {
          idleTimer += 50;
          if (idleTimer >= idleThreshold) {
            placeFireAt(pc, pr);
            idleTimer = 0;
          }
        }
      }
    });

    // ── Periodic intensity pulses — lightning + shakes throughout ──
    const pulseTimer = scene.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (!active.value || this.hp <= 0 || scene.isGameOver) { pulseTimer.remove(); return; }

        // Big shake + flash pulse
        scene.cameras.main.shake(300, 0.02);
        scene.cameras.main.flash(200, 0, 100, 220, true);

        // Skip decorative bolt/whirl sprites on mobile
        if (!this._isMobile()) {
          const randC = Phaser.Math.Between(0, cols - 1);
          const randR = Phaser.Math.Between(0, rows - 1);
          const lpos = this.grid.getPixelPosition(randC, randR);
          const bolt = scene.add.sprite(lpos.x, lpos.y, 'ch3_fx_thunder')
            .setDepth(180).setDisplaySize(ts * 2, ts * 3).setAlpha(0.8).play('anim_ch3_fx_thunder');
          scene.tweens.add({
            targets: bolt, alpha: 0, duration: 500, onComplete: () => bolt.destroy()
          });

          const randC2 = Phaser.Math.Between(0, cols - 1);
          const randR2 = Phaser.Math.Between(0, rows - 1);
          const wpos = this.grid.getPixelPosition(randC2, randR2);
          const whirl = scene.add.sprite(wpos.x, wpos.y, 'ch3_fx_whirl')
            .setDepth(175).setDisplaySize(ts * 2, ts * 2).setAlpha(0.7).play('anim_ch3_fx_whirl');
          scene.tweens.add({
            targets: whirl, alpha: 0, rotation: Math.PI * 2, duration: 800,
            onComplete: () => whirl.destroy()
          });
        }
      }
    });

    // ── Distraction attack: Lightning strikes on random tiles ──
    // Telegraphs with alert symbol, then lightning burst deals damage
    const strikeTimer = scene.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        if (!active.value || this.hp <= 0 || scene.isGameOver) { strikeTimer.remove(); return; }

        // Pick 2-3 random non-burning tiles to strike
        const strikeCount = Phaser.Math.Between(2, 3);
        const targets = [];
        let attempts = 0;
        while (targets.length < strikeCount && attempts < 30) {
          const c = Phaser.Math.Between(0, cols - 1);
          const r = Phaser.Math.Between(0, rows - 1);
          const key = `${c},${r}`;
          if (!fireMap.has(key) && !targets.some(t => t.c === c && t.r === r)) {
            targets.push({ c, r });
          }
          attempts++;
        }

        targets.forEach((t, idx) => {
          const pos = this.grid.getPixelPosition(t.c, t.r);

          // Telegraph with alert symbol
          this.grid.telegraph(t.c, t.r, 800);
          const alert = scene.add.sprite(pos.x, pos.y - ts * 0.4, 'symbol_alert')
            .setDepth(200).setScale(0.8).play('anim_symbol_alert');
          audioManager.play('sfx_telegraph', { volume: 0.4 });
          alert.once('animationcomplete', () => alert.destroy());

          // After telegraph, lightning strikes
          scene.time.delayedCall(800, () => {
            if (!active.value || this.hp <= 0 || scene.isGameOver) return;

            // Lightning burst FX
            const burst = scene.add.sprite(pos.x, pos.y, 'lightning_burst')
              .setDepth(190).setScale(this._mobileScale(1.8)).play('anim_lightning_burst');
            burst.once('animationcomplete', () => burst.destroy());

            // Frozen splash FX for visual chaos
            const ice = scene.add.sprite(pos.x, pos.y, 'frozen')
              .setDepth(185).setScale(0.8).play('anim_frozen');
            ice.once('animationcomplete', () => ice.destroy());

            scene.cameras.main.shake(120, 0.01);

            // Damage if player is on the struck tile
            if (scene.player.col === t.c && scene.player.row === t.r) {
              if (!scene.player.isInvulnerable) {
                scene.player.takeDamage();
              }
            }
          });
        });
      }
    });

    // ── Distraction attack: Sweeping row/column warnings ──
    // Every few seconds, telegraph an entire row or column then blast it
    const sweepTimer = scene.time.addEvent({
      delay: 3500,
      startAt: 1500,
      loop: true,
      callback: () => {
        if (!active.value || this.hp <= 0 || scene.isGameOver) { sweepTimer.remove(); return; }

        const isRow = Math.random() > 0.5;
        if (isRow) {
          const r = Phaser.Math.Between(0, rows - 1);
          this.grid.telegraphRow(r, 700);

          // Alert symbol at the edge
          const edgePos = this.grid.getPixelPosition(0, r);
          const alert2 = scene.add.sprite(edgePos.x - ts, edgePos.y, 'symbol_alert2')
            .setDepth(200).setScale(0.8).play('anim_symbol_alert2');
          audioManager.play('sfx_telegraph', { volume: 0.4 });
          alert2.once('animationcomplete', () => alert2.destroy());

          scene.time.delayedCall(700, () => {
            if (!active.value || this.hp <= 0 || scene.isGameOver) return;
            scene.cameras.main.shake(150, 0.012);

            // Lightning burst across the row
            for (let c = 0; c < cols; c++) {
              const p = this.grid.getPixelPosition(c, r);
              const lb = scene.add.sprite(p.x, p.y, 'lightning_burst')
                .setDepth(190).setScale(this._mobileScale(1.2)).play('anim_lightning_burst');
              lb.once('animationcomplete', () => lb.destroy());
            }

            // Damage if player is on this row
            if (scene.player.row === r && !scene.player.isInvulnerable) {
              scene.player.takeDamage();
            }
          });
        } else {
          const c = Phaser.Math.Between(0, cols - 1);
          this.grid.telegraphCol(c, 700);

          // Alert symbol at the top
          const edgePos = this.grid.getPixelPosition(c, 0);
          const alert2 = scene.add.sprite(edgePos.x, edgePos.y - ts, 'symbol_alert2')
            .setDepth(200).setScale(0.8).play('anim_symbol_alert2');
          audioManager.play('sfx_telegraph', { volume: 0.4 });
          alert2.once('animationcomplete', () => alert2.destroy());

          scene.time.delayedCall(700, () => {
            if (!active.value || this.hp <= 0 || scene.isGameOver) return;
            scene.cameras.main.shake(150, 0.012);

            // Lightning burst down the column
            for (let r = 0; r < rows; r++) {
              const p = this.grid.getPixelPosition(c, r);
              const lb = scene.add.sprite(p.x, p.y, 'lightning_burst')
                .setDepth(190).setScale(this._mobileScale(1.2)).play('anim_lightning_burst');
              lb.once('animationcomplete', () => lb.destroy());
            }

            // Damage if player is on this column
            if (scene.player.col === c && !scene.player.isInvulnerable) {
              scene.player.takeDamage();
            }
          });
        }
      }
    });

    // Damage checker (fire trail)
    let lastDamageTime = 0;
    const damageInterval = 600;

    const damageTimer = scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!active.value || this.hp <= 0 || scene.isGameOver) { damageTimer.remove(); return; }

        const now = Date.now();
        if (now - lastDamageTime < damageInterval) return;

        const key = `${scene.player.col},${scene.player.row}`;
        if (fireMap.has(key)) {
          if (!scene.player.isInvulnerable) {
            scene.player.takeDamage();
            lastDamageTime = now;
            scene.cameras.main.shake(100, 0.015);

            const pPix = this.grid.getPixelPosition(scene.player.col, scene.player.row);
            const fx = scene.add.sprite(pPix.x, pPix.y, 'eye_explosion')
              .setDepth(200).setScale(1.5).play('anim_eye_explosion');
            scene.time.delayedCall(600, () => fx.destroy());
          }
        }
      }
    });

    // ── Grand finale cleanup ──
    scene.time.delayedCall(duration, () => {
      active.value = false;
      if (moveTracker) moveTracker.remove();
      if (damageTimer) damageTimer.remove();
      if (pulseTimer) pulseTimer.remove();
      if (strikeTimer) strikeTimer.remove();
      if (sweepTimer) sweepTimer.remove();

      // Big finale explosion
      scene.cameras.main.shake(500, 0.03);
      scene.cameras.main.flash(600, 255, 255, 255, true);
      clearAllFires();
    });

    return duration;
  }
}

import * as Phaser from 'phaser';
import { state } from '../utils/StateManager.js';
import { audioManager } from './AudioManager.js';

export class Player {
  /**
   * @param {Phaser.Scene} scene 
   * @param {import('./Grid.js').Grid} grid 
   */
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;

    // Start at bottom center
    this.col = Math.floor(grid.cols / 2);
    this.row = grid.rows - 1;
    this.isMoving = false;
    this.facing = 'down';
    
    this.hp = 6;
    this.maxHp = 6;
    this.isInvulnerable = false;
    this.isFrozen = false;
    
    // Chapter 3 Mechanics
    this.isCharmed = false; // Reverses controls
    this.isPetrified = false; // Blocks movement
    this.isSlid = false;
    this.history = []; // Array of last 10 {col, row}

    const startPos = this.grid.getPixelPosition(this.col, this.row);
    
    // Sprite strips are 384x64 = 8 frames of 48x64 each
    this.sprite = this.scene.add.sprite(startPos.x, startPos.y, 'player_idle_down');
    
    // Scale to fit within a tile (use tileSize relative to the 48px frame width)
    const scale = (grid.tileSize * 1.4) / 48;
    this.sprite.setScale(scale);
    this.sprite.setOrigin(0.5, 0.55); // Bottom-center anchor
    this.sprite.setDepth(10); // Ensure player is rendered above background/indicators

    // Create directional animations — 8 frames each (0 to 7)
    if (!this.scene.anims.exists('idle_down')) {
      // Idle animations
      this.scene.anims.create({ key: 'idle_down', frames: this.scene.anims.generateFrameNumbers('player_idle_down', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
      this.scene.anims.create({ key: 'idle_up', frames: this.scene.anims.generateFrameNumbers('player_idle_up', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
      this.scene.anims.create({ key: 'idle_left', frames: this.scene.anims.generateFrameNumbers('player_idle_left', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
      this.scene.anims.create({ key: 'idle_right', frames: this.scene.anims.generateFrameNumbers('player_idle_right', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
      
      // Dash animations
      this.scene.anims.create({ key: 'dash_down', frames: this.scene.anims.generateFrameNumbers('player_dash_down', { start: 0, end: 7 }), frameRate: 20, repeat: 0 });
      this.scene.anims.create({ key: 'dash_up', frames: this.scene.anims.generateFrameNumbers('player_dash_up', { start: 0, end: 7 }), frameRate: 20, repeat: 0 });
      this.scene.anims.create({ key: 'dash_left', frames: this.scene.anims.generateFrameNumbers('player_dash_left', { start: 0, end: 7 }), frameRate: 20, repeat: 0 });
      this.scene.anims.create({ key: 'dash_right', frames: this.scene.anims.generateFrameNumbers('player_dash_right', { start: 0, end: 7 }), frameRate: 20, repeat: 0 });
    }

    this.sprite.play('idle_down');
  }

  move(direction) {
    if (this.isMoving || this.isFrozen || this.isPetrified) return;

    // Siren's Lure: reverse controls
    let actDir = direction;
    if (this.isCharmed) {
        if (direction === 'up') actDir = 'down';
        else if (direction === 'down') actDir = 'up';
        else if (direction === 'left') actDir = 'right';
        else if (direction === 'right') actDir = 'left';
    }

    let dCol = 0, dRow = 0;
    if (actDir === 'up') dRow = -1;
    else if (actDir === 'down') dRow = 1;
    else if (actDir === 'left') dCol = -1;
    else if (actDir === 'right') dCol = 1;
    else return;

    const dist = this.hasDash ? 3 : 1;
    let targetCol = this.col + (dCol * dist);
    let targetRow = this.row + (dRow * dist);

    // Clamp dash within grid bounds
    if (targetCol < 0) targetCol = 0;
    if (targetCol >= this.grid.cols) targetCol = this.grid.cols - 1;
    if (targetRow < 0) targetRow = 0;
    if (targetRow >= this.grid.rows) targetRow = this.grid.rows - 1;

    // Check Chapter 2 Obstacles
    if (this.grid.cells[targetRow][targetCol].status === 'locked') return;

    // Track history before changing col/row
    this.history.push({ col: this.col, row: this.row });
    if (this.history.length > 10) this.history.shift();

    this.isMoving = true;
    this.facing = actDir;
    this.col = targetCol;
    this.row = targetRow;

    // Play footstep SFX (random variant for variety)
    const stepVariant = Math.floor(Math.random() * 6) + 1;
    audioManager.play(`sfx_step_${stepVariant}`, { volume: 0.6 });

    const targetPos = this.grid.getPixelPosition(this.col, this.row);

    // Play directional dash animation
    this.sprite.play(`dash_${direction}`);

    // Calculate duration: overclock = 40ms, speed boost = 75ms, dash = 200ms, normal = 150ms
    let duration = this.isOverclocked ? 40 : this.isSpeedBoosted ? 75 : 150;
    if (this.hasDash) duration = 200;

    // Decrement dash charges; clear flag when exhausted
    if (this.hasDash) {
      this.dashCharges = (this.dashCharges || 1) - 1;
      if (this.dashCharges <= 0) {
        this.hasDash = false;
        this.dashCharges = 0;
        this.scene.player?.sprite?.clearTint();
      }
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
        state.emit('player:moved', direction);

        // Grid Hazard Effects
        if (this.grid.cells[this.row][this.col].status === 'mud') {
          // Slide in the same direction!
          // Note: Because isMoving is false, if this hits a wall, move() softly fails.
          if (!this.isAnchored) {
            this.move(this.facing);
          }
        }
      }
    });
  }

  // Force move the player across the board (used by Cthulhu Wing Gust, Octopus sweeps)
  forceMove(dCol, dRow, durationMs = 200) {
    if (this.isMoving) return;
    
    let targetCol = this.col + dCol;
    let targetRow = this.row + dRow;

    if (targetCol < 0) targetCol = 0;
    if (targetCol >= this.grid.cols) targetCol = this.grid.cols - 1;
    if (targetRow < 0) targetRow = 0;
    if (targetRow >= this.grid.rows) targetRow = this.grid.rows - 1;
    
    if (targetCol === this.col && targetRow === this.row) return;

    this.isMoving = true;
    this.col = targetCol;
    this.row = targetRow;

    const targetPos = this.grid.getPixelPosition(this.col, this.row);
    
    this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y,
      duration: durationMs,
      ease: 'Power2',
      onComplete: () => {
        this.isMoving = false;
        this.scene.events.emit('player:moved', this.col, this.row);
      }
    });
  }

  takeDamage() {
    if (this.isInvulnerable || this.isInvincible || this.isInvisible || this.isGhost || this.hp <= 0) return;

    // COUNTER: absorb exactly one hit
    if (this.hasCounter) {
      this.hasCounter = false;
      this.scene.player?.sprite?.clearTint();
      if (this.scene._counterRing && this.scene._counterRing.active) {
        this.scene.tweens.add({ targets: this.scene._counterRing, alpha: 0, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => this.scene._counterRing.destroy() });
      }
      this.scene.cameras.main.flash(120, 255, 100, 0);
      return;
    }
    
    this.hp--;
    this.scene.events.emit('player:health_changed', this.hp);

    // Play damage SFX
    audioManager.play('sfx_damage');

    // 15% chance to play player VO on damage (pain reaction)
    if (Math.random() < 0.15) {
      audioManager.playRandomPlayerVO(this.scene.chapterId, { volume: 0.85, forceGeneric: true });
    }

    const fx = this.scene.add.sprite(this.sprite.x, this.sprite.y, 'lives_decreased');
    fx.setDepth(300).setScale(6.0).play('anim_lives_decreased');
    fx.once('animationcomplete', () => fx.destroy());
    
    // Screen shake and red flash on hit
    this.scene.cameras.main.shake(200, 0.015);
    this.scene.cameras.main.flash(150, 255, 0, 0);
    
    if (this.hp <= 0) {
      this.die();
      return;
    }
    this.toggleInvulnerability();
  }

  toggleInvulnerability() {
    this.isInvulnerable = true;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      yoyo: true,
      repeat: 5,
      duration: 150,
      onComplete: () => {
        this.sprite.alpha = 1;
        this.isInvulnerable = false;
      }
    });
  }

  die() {
    // Play death VO line (bypass cooldown for important moment)
    audioManager.playRandomPlayerVO(this.scene.chapterId, { volume: 0.95, forceGeneric: true, bypassCooldown: true });

    this.sprite.setTint(0xff0000);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 90,
      alpha: 0,
      y: '+=20',
      duration: 500,
      onComplete: () => {
        this.scene.events.emit('player:died');
      }
    });
  }
}

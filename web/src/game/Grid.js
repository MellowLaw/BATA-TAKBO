import * as Phaser from 'phaser';
import { audioManager } from './AudioManager.js';

export class Grid {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} cols 
   * @param {number} rows 
   * @param {boolean} useFullScreen
   * @param {boolean} isPanelRight - Whether the side panel is on the right (default false = left)
   */
  constructor(scene, cols = 7, rows = 9, useFullScreen = false, isPanelRight = false) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.useFullScreen = useFullScreen;
    this.isPanelRight = isPanelRight;
    
    // Will hold graphic backgrounds or tile sprites
    this.cells = [];
    this.tileSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.calculateGrid();
    this.drawBackground();
  }

  calculateGrid() {
    const { width, height } = this.scene.scale;
    
    // For practice tutorial, use full screen (no left panel)
    if (this.useFullScreen) {
      const paddingX = width * 0.15;
      const paddingY = height * 0.15;
      const availableWidth = width - paddingX * 2;
      const availableHeight = height - paddingY * 2;

      const rawWidth = availableWidth / this.cols;
      const rawHeight = availableHeight / this.rows;
      
      this.tileSize = Math.floor(Math.min(rawWidth, rawHeight));
      
      const gridWidth = this.tileSize * this.cols;
      const gridHeight = this.tileSize * this.rows;

      this.boardWidth = gridWidth;
      this.boardHeight = gridHeight;

      // Center on full screen
      this.offsetX = Math.floor((width - gridWidth) / 2);
      this.offsetY = Math.floor((height - gridHeight) / 2);
      
      this.panelRect = {
        x: 0,
        y: 0,
        w: width,
        h: height
      };
      return;
    }
    
    // For regular game, use game area layout (with side panel for boss/camera)
    const panelWidth = Math.max(width < 768 ? 160 : 250, Math.min(450, width * 0.28));
    const gameAreaW = width - panelWidth;
    const gameAreaH = height;
    const panelX = this.isPanelRight ? width - panelWidth : 0;
    const gameAreaX = this.isPanelRight ? 0 : panelWidth;

    this.panelRect = {
      x: gameAreaX,
      y: 0,
      w: gameAreaW,
      h: gameAreaH
    };

    // Calculate maximum STRICTLY SQUARE tileSize to fit within the game area with significant padding
    const paddingX = gameAreaW * 0.12;
    const paddingY = gameAreaH * 0.12;
    const availableWidth = gameAreaW - paddingX * 2;
    const availableHeight = gameAreaH - paddingY * 2;

    const rawWidth = availableWidth / this.cols;
    const rawHeight = availableHeight / this.rows;

    // STRICT SQUARE preserves projectile/highlight integrity
    this.tileSize = Math.floor(Math.min(rawWidth, rawHeight));

    // The exact size of the grid itself inside the panel
    const gridWidth = this.tileSize * this.cols;
    const gridHeight = this.tileSize * this.rows;

    // Expose board dimensions for external layout
    this.boardWidth = gridWidth;
    this.boardHeight = gridHeight;

    // Perfectly center the grid INSIDE the game area avoiding any bleed.
    this.offsetX = gameAreaX + Math.floor((gameAreaW - gridWidth) / 2);
    this.offsetY = Math.floor((gameAreaH - gridHeight) / 2);
  }

  drawBackground() {
    // Add full panel background
    const panelImg = this.scene.add.image(this.panelRect.x + this.panelRect.w / 2, this.panelRect.y + this.panelRect.h / 2, 'grid_panel_bg');
    panelImg.displayHeight = this.panelRect.h;
    panelImg.scaleX = panelImg.scaleY;

    this.bgGraphics = this.scene.add.graphics();
    
    // Add grid background image spanning the identical gameplay space
    const gridW = this.tileSize * this.cols;
    const gridH = this.tileSize * this.rows;
    this.bgImage = this.scene.add.image(this.offsetX + gridW / 2, this.offsetY + gridH / 2, 'grid_bg');
    this.bgImage.setDisplaySize(gridW, gridH);

    this.graphics = this.scene.add.graphics();

    this.render();
  }

  render() {
    this.bgGraphics.clear();
    this.graphics.clear();

    const lineStyle = { width: 2, color: 0x4a4e69, alpha: 0 };
    const fillLight = 0x22223b;
    const fillDark = 0x1a1a2e;

    // Drop Shadow for the gameplay grid
    const gridW = this.tileSize * this.cols;
    const gridH = this.tileSize * this.rows;
    this.bgGraphics.fillStyle(0x000000, 0.4);
    this.bgGraphics.fillRect(this.offsetX + 8, this.offsetY + 12, gridW, gridH);
    this.bgGraphics.fillStyle(0x000000, 0.2);
    this.bgGraphics.fillRect(this.offsetX - 2, this.offsetY + 4, gridW + 16, gridH + 20);

    // 1. Fill the ENTIRE right panel explicitly (Disabled to show image)
    // this.bgGraphics.fillStyle(panelBg, 1);
    // this.bgGraphics.fillRect(this.panelRect.x, this.panelRect.y, this.panelRect.w, this.panelRect.h);
    
    // 2. Thick Outer frame shadow around the complete right panel edges (Disabled entirely to make transparent)
    // this.bgGraphics.lineStyle(20, 0x000000, 0.5);
    // this.bgGraphics.strokeRect(this.panelRect.x + 10, this.panelRect.y + 10, this.panelRect.w - 20, this.panelRect.h - 20);

    // 3. Crisp frame directly outlining the centered inner game grid (Disabled)
    // this.graphics.lineStyle(6, 0x4a4e69, 1);
    // this.graphics.strokeRect(this.offsetX - 3, this.offsetY - 3, gridW + 6, gridH + 6);

    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const x = this.offsetX + c * this.tileSize;
        const y = this.offsetY + r * this.tileSize;

        // Checkerboard pattern (now transparent to see bg)
        const isDark = (r + c) % 2 === 0;
        this.graphics.fillStyle(isDark ? fillDark : fillLight, 0);
        this.graphics.fillRect(x, y, this.tileSize, this.tileSize);

        // Grid border
        this.graphics.lineStyle(lineStyle.width, lineStyle.color, lineStyle.alpha);
        this.graphics.strokeRect(x, y, this.tileSize, this.tileSize);

        this.cells[r][c] = { x, y, cx: x + this.tileSize / 2, cy: y + this.tileSize / 2, status: 'safe' };
      }
    }
  }

  // Gets the exact screen pixel coordinate (center of the tile) for an entity
  getPixelPosition(col, row) {
    if(row < 0) row = 0;
    if(row >= this.rows) row = this.rows - 1;
    if(col < 0) col = 0;
    if(col >= this.cols) col = this.cols - 1;

    return { 
      x: this.cells[row][col].cx, 
      y: this.cells[row][col].cy 
    };
  }

  /**
   * Draw a permanently highlighted tile (used for golden damage tiles or hazards).
   * For temporary highlights, use telegraph() instead.
   */
  highlightTile(col, row, colorHex = 0xff0000, alpha = 0.5) {
    const x = this.offsetX + col * this.tileSize;
    const y = this.offsetY + row * this.tileSize;
    this.graphics.fillStyle(colorHex, alpha);
    this.graphics.fillRect(x, y, this.tileSize, this.tileSize);
  }

  /**
   * Modify the physical state of a cell for hazards (Ch 2+)
   */
  setCellStatus(col, row, status, colorHex = 0x000000) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.cells[row][col].status = status;
      if (status !== 'safe') {
        this.highlightTile(col, row, colorHex, 0.4);
      } else {
        this.render(); // Clear overlay
      }
    }
  }

  /**
   * Ruby Logistics
   */
  spawnRuby(col, row) {
     if (!this.rubies) this.rubies = {};
     const key = `${col}_${row}`;
     if (this.rubies[key] || this.hasChestAt(col, row)) return;

     const pos = this.getPixelPosition(col, row);

     const rubySpr = this.scene.add.sprite(pos.x, pos.y, 'ruby_loot')
       .setScale(0).setDepth(20);

     const shadow = this.scene.add.ellipse(pos.x, pos.y + 16, 26, 12, 0x000000).setDepth(19).setAlpha(0);

     // Pop in
     this.scene.tweens.add({
         targets: rubySpr,
         scale: 2.0,
         duration: 300,
         ease: 'Back.easeOut',
         onComplete: () => {
             if (!rubySpr.active) return;
             const floatTween = this.scene.tweens.add({
                 targets: rubySpr,
                 y: rubySpr.y - 15,
                 duration: 800,
                 ease: 'Sine.easeInOut',
                 yoyo: true,
                 repeat: -1
             });
             const shadowTween = this.scene.tweens.add({
                 targets: shadow,
                 scaleX: 0.6, scaleY: 0.6, alpha: 0.15,
                 duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
             });
             if (this.rubies && this.rubies[key]) {
                 this.rubies[key].floatTween = floatTween;
                 this.rubies[key].shadowTween = shadowTween;
             }
         }
     });
     this.scene.tweens.add({ targets: shadow, alpha: 0.35, duration: 300 });

     this.rubies[key] = { sprite: rubySpr, shadow: shadow };

     // Despawn after 4 seconds
     this.scene.time.delayedCall(4000, () => {
         if (this.rubies && this.rubies[key]) {
             const data = this.rubies[key];
             delete this.rubies[key];
             if (data.floatTween) data.floatTween.stop();
             if (data.shadowTween) data.shadowTween.stop();
             data.sprite.scene.tweens.add({
                 targets: [data.sprite, data.shadow],
                 alpha: 0, scale: 0, duration: 300,
                 onComplete: () => { data.sprite.destroy(); data.shadow.destroy(); }
             });
         }
     });
  }

  hasRubyAt(col, row) {
      if (!this.rubies) return false;
      return !!this.rubies[`${col}_${row}`];
  }

  removeRubyAt(col, row) {
      const key = `${col}_${row}`;
      if (this.rubies && this.rubies[key]) {
          const data = this.rubies[key];
          delete this.rubies[key];
          if (data.floatTween) data.floatTween.stop();
          if (data.shadowTween) data.shadowTween.stop();
          data.shadow.destroy();
          
          // Flash effect
          data.sprite.scene.tweens.add({
              targets: data.sprite,
              alpha: 0,
              scale: 3,
              duration: 200,
              onComplete: () => data.sprite.destroy()
          });
          return true;
      }
      return false;
  }

  /**
   * Diamond Logistics (Trap)
   */
  spawnDiamond(col, row) {
     if (!this.diamonds) this.diamonds = {};
     const key = `${col}_${row}`;
     if (this.diamonds[key] || this.hasChestAt(col, row) || this.hasRubyAt(col, row)) return;

     const pos = this.getPixelPosition(col, row);

     const diamondSpr = this.scene.add.sprite(pos.x, pos.y, 'diamond_loot')
       .setScale(0).setDepth(20);

     const shadow = this.scene.add.ellipse(pos.x, pos.y + 16, 26, 12, 0x000000).setDepth(19).setAlpha(0);

     this.scene.tweens.add({
         targets: diamondSpr,
         scale: 2.0,
         duration: 300,
         ease: 'Back.easeOut',
         onComplete: () => {
             if (!diamondSpr.active) return;
             const floatTween = this.scene.tweens.add({
                 targets: diamondSpr,
                 y: diamondSpr.y - 15,
                 duration: 800,
                 ease: 'Sine.easeInOut',
                 yoyo: true,
                 repeat: -1
             });
             const shadowTween = this.scene.tweens.add({
                 targets: shadow,
                 scaleX: 0.6, scaleY: 0.6, alpha: 0.15,
                 duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
             });
             if (this.diamonds && this.diamonds[key]) {
                 this.diamonds[key].floatTween = floatTween;
                 this.diamonds[key].shadowTween = shadowTween;
             }
         }
     });
     this.scene.tweens.add({ targets: shadow, alpha: 0.35, duration: 300 });

     this.diamonds[key] = { sprite: diamondSpr, shadow: shadow };

     // Despawn after 4 seconds
     this.scene.time.delayedCall(4000, () => {
         if (this.diamonds && this.diamonds[key]) {
             const data = this.diamonds[key];
             delete this.diamonds[key];
             if (data.floatTween) data.floatTween.stop();
             if (data.shadowTween) data.shadowTween.stop();
             data.sprite.scene.tweens.add({
                 targets: [data.sprite, data.shadow],
                 alpha: 0, scale: 0, duration: 300,
                 onComplete: () => { data.sprite.destroy(); data.shadow.destroy(); }
             });
         }
     });
  }

  hasDiamondAt(col, row) {
      if (!this.diamonds) return false;
      return !!this.diamonds[`${col}_${row}`];
  }

  removeDiamondAt(col, row) {
      const key = `${col}_${row}`;
      if (this.diamonds && this.diamonds[key]) {
          const data = this.diamonds[key];
          delete this.diamonds[key];
          if (data.floatTween) data.floatTween.stop();
          if (data.shadowTween) data.shadowTween.stop();
          data.shadow.destroy();
          
          data.sprite.scene.tweens.add({
              targets: data.sprite,
              alpha: 0,
              scale: 3,
              duration: 200,
              onComplete: () => data.sprite.destroy()
          });
          return true;
      }
      return false;
  }

  /**
   * Bawang (Garlic/Lives Up) Logistics
   */
  spawnBawang(col, row) {
     if (!this.bawangs) this.bawangs = {};
     const key = `${col}_${row}`;
     if (this.bawangs[key] || this.hasChestAt(col, row) || this.hasRubyAt(col, row) || this.hasDiamondAt(col, row)) return;

     const pos = this.getPixelPosition(col, row);

     // Play spawn sound effect
     if (this.scene && this.scene.audioManager) {
       this.scene.audioManager.play('bawang_spawn', { volume: 0.8 });
     }

     // Spawn effect animation (bawang_effects spritesheet)
     const effect = this.scene.add.sprite(pos.x, pos.y, 'bawang_effects')
       .setScale(1.5)
       .setDepth(25)
       .setAlpha(1);
     effect.play('anim_bawang_effects');
     effect.once('animationcomplete', () => effect.destroy());

     const bawangSpr = this.scene.add.sprite(pos.x, pos.y, 'bawang_loot')
       .setScale(0)
       .setDepth(20);

     const shadow = this.scene.add.ellipse(pos.x, pos.y + 16, 26, 12, 0x000000).setDepth(19).setAlpha(0);

     // Pop in animation
     this.scene.tweens.add({
         targets: bawangSpr,
         scale: 1.8,
         duration: 300,
         ease: 'Back.easeOut',
         onComplete: () => {
             if (!bawangSpr.active) return;
             const floatTween = this.scene.tweens.add({
                 targets: bawangSpr,
                 y: bawangSpr.y - 12,
                 duration: 700,
                 ease: 'Sine.easeInOut',
                 yoyo: true,
                 repeat: -1
             });
             const shadowTween = this.scene.tweens.add({
                 targets: shadow,
                 scaleX: 0.6, scaleY: 0.6, alpha: 0.15,
                 duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
             });
             if (this.bawangs && this.bawangs[key]) {
                 this.bawangs[key].floatTween = floatTween;
                 this.bawangs[key].shadowTween = shadowTween;
             }
         }
     });
     this.scene.tweens.add({ targets: shadow, alpha: 0.35, duration: 300 });

     this.bawangs[key] = { sprite: bawangSpr, shadow: shadow, col: col, row: row };

     // Despawn after 5 seconds (disappear if not picked up)
     this.scene.time.delayedCall(5000, () => {
         if (this.bawangs && this.bawangs[key]) {
             const data = this.bawangs[key];
             delete this.bawangs[key];
             if (data.floatTween) data.floatTween.stop();
             if (data.shadowTween) data.shadowTween.stop();
             data.sprite.scene.tweens.add({
                 targets: [data.sprite, data.shadow],
                 alpha: 0, scale: 0, duration: 300,
                 onComplete: () => { data.sprite.destroy(); data.shadow.destroy(); }
             });
         }
     });
  }

  hasBawangAt(col, row) {
      if (!this.bawangs) return false;
      return !!this.bawangs[`${col}_${row}`];
  }

  removeBawangAt(col, row) {
      const key = `${col}_${row}`;
      if (this.bawangs && this.bawangs[key]) {
          const data = this.bawangs[key];
          delete this.bawangs[key];
          if (data.floatTween) data.floatTween.stop();
          if (data.shadowTween) data.shadowTween.stop();
          data.shadow.destroy();
          
          // Play pickup sound effect
          if (this.scene && this.scene.audioManager) {
            this.scene.audioManager.play('bawang_pickup', { volume: 0.9 });
          }

          // Flash and scale up effect when picked up
          data.sprite.scene.tweens.add({
              targets: data.sprite,
              alpha: 0,
              scale: 2.5,
              duration: 200,
              onComplete: () => data.sprite.destroy()
          });
          return true;
      }
      return false;
  }

  /**
   * Chest Loot (Power-ups) Logistics
   * 5 different chest images: chest1_loot through chest5_loot
   */
  spawnChest(col, row) {
     if (!this.chests) this.chests = {};
     const key = `${col}_${row}`;
     if (this.chests[key] || this.hasBawangAt(col, row) || this.hasRubyAt(col, row) || this.hasDiamondAt(col, row)) return;

     const pos = this.getPixelPosition(col, row);

     // Play spawn sound effect
     if (this.scene && this.scene.audioManager) {
       this.scene.audioManager.play('chest_spawn', { volume: 0.8 });
     }

     // Chest sprites are 32x32, scale to match grid tile size
     const chestScale = this.tileSize / 32;

     // Spawn effect animation (chest_effects spritesheet)
     const effect = this.scene.add.sprite(pos.x, pos.y, 'chest_effects')
       .setScale(chestScale)
       .setDepth(25)
       .setAlpha(1);
     effect.play('anim_chest_effects');
     effect.once('animationcomplete', () => effect.destroy());

     // Pick a random chest from 1-5
     const chestNum = Phaser.Math.Between(1, 5);
     const chestKey = `chest${chestNum}_loot`;

     const chestSpr = this.scene.add.sprite(pos.x, pos.y, chestKey)
       .setScale(0)
       .setDepth(20);

     const shadow = this.scene.add.ellipse(pos.x, pos.y + this.tileSize * 0.3, this.tileSize * 0.6, this.tileSize * 0.25, 0x000000).setDepth(19).setAlpha(0);

     // Pop in animation
     this.scene.tweens.add({
         targets: chestSpr,
         scale: chestScale,
         duration: 300,
         ease: 'Back.easeOut',
         onComplete: () => {
             if (!chestSpr.active) return;
             const floatTween = this.scene.tweens.add({
                 targets: chestSpr,
                 y: chestSpr.y - 10,
                 duration: 800,
                 ease: 'Sine.easeInOut',
                 yoyo: true,
                 repeat: -1
             });
             const shadowTween = this.scene.tweens.add({
                 targets: shadow,
                 scaleX: 0.6, scaleY: 0.6, alpha: 0.15,
                 duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
             });
             if (this.chests && this.chests[key]) {
                 this.chests[key].floatTween = floatTween;
                 this.chests[key].shadowTween = shadowTween;
             }
         }
     });
     this.scene.tweens.add({ targets: shadow, alpha: 0.35, duration: 300 });

     this.chests[key] = { sprite: chestSpr, shadow: shadow, col: col, row: row, chestType: chestNum };

     // Animate through the 4 rows of the chest spritesheet (idle/glow animation)
     // Assuming 4 rows x N columns, we'll cycle through frames 0-3 (first frame of each row)
     let currentFrame = 0;
     const frameAnim = this.scene.time.addEvent({
         delay: 200,
         repeat: -1,
         callback: () => {
             if (!chestSpr.active) return;
             // Cycle through row start frames (0, 1, 2, 3 for 4 rows)
             chestSpr.setFrame(currentFrame);
             currentFrame = (currentFrame + 1) % 4;
         }
     });
     this.chests[key].frameAnim = frameAnim;

     // Despawn after 4 seconds (disappear if not picked up)
     this.scene.time.delayedCall(4000, () => {
         if (this.chests && this.chests[key]) {
             const data = this.chests[key];
             delete this.chests[key];
             if (data.floatTween) data.floatTween.stop();
             if (data.shadowTween) data.shadowTween.stop();
             if (data.frameAnim) data.frameAnim.remove();
             data.sprite.scene.tweens.add({
                 targets: [data.sprite, data.shadow],
                 alpha: 0, scale: 0, duration: 300,
                 onComplete: () => { data.sprite.destroy(); data.shadow.destroy(); }
             });
         }
     });
  }

  hasChestAt(col, row) {
      if (!this.chests) return false;
      return !!this.chests[`${col}_${row}`];
  }

  removeChestAt(col, row) {
      const key = `${col}_${row}`;
      if (this.chests && this.chests[key]) {
          const data = this.chests[key];
          delete this.chests[key];
          if (data.floatTween) data.floatTween.stop();
          if (data.shadowTween) data.shadowTween.stop();
          if (data.frameAnim) data.frameAnim.remove();
          data.shadow.destroy();

          // Play pickup sound effect
          if (this.scene && this.scene.audioManager) {
            this.scene.audioManager.play('chest_pickup', { volume: 0.9 });
          }

          // Flash and scale up effect when picked up
          data.sprite.scene.tweens.add({
              targets: data.sprite,
              alpha: 0,
              scale: 2,
              duration: 200,
              onComplete: () => data.sprite.destroy()
          });
          return true;
      }
      return false;
  }

  /**
   * Show a temporary red warning tile that auto-disappears after durationMs.
   * Uses a separate graphics object so it doesn't pollute the base grid.
   */
  telegraph(col, row, durationMs = 1500) {
    const x = this.offsetX + col * this.tileSize;
    const y = this.offsetY + row * this.tileSize;
    const cx = x + this.tileSize / 2;
    const cy = y + this.tileSize / 2;

    const hasSight = this.scene.player && this.scene.player.hasSight;

    // SIGHT powerup: show an early yellow pre-warning for the first 40% of the telegraph window
    if (hasSight) {
      const preWarn = this.scene.add.rectangle(cx, cy, this.tileSize, this.tileSize, 0xffff00, 0)
        .setDepth(5).setStrokeStyle(3, 0xffff00, 0.9);
      this.scene.tweens.add({ targets: preWarn, fillAlpha: 0.25, duration: 120 });
      this.scene.time.delayedCall(durationMs * 0.4, () => {
        if (preWarn && preWarn.active) {
          this.scene.tweens.add({ targets: preWarn, fillAlpha: 0, strokeAlpha: 0, duration: 200, onComplete: () => preWarn.destroy() });
        }
      });
    }

    const tempTile = this.scene.add.image(cx, cy, 'red_tile');
    tempTile.setDisplaySize(this.tileSize, this.tileSize);
    tempTile.setDepth(5);
    // With sight: delay the red tile so player sees yellow first, then red
    const redDelay = hasSight ? durationMs * 0.35 : 0;
    tempTile.setAlpha(0);
    this.scene.time.delayedCall(redDelay, () => {
      if (!tempTile.active) return;
      tempTile.setAlpha(0.85);
      // Stay solid for most of the remaining duration, then fade out quickly at the end
      const remaining = durationMs - redDelay;
      this.scene.tweens.add({
        targets: tempTile,
        alpha: 0,
        delay: remaining * 0.75,
        duration: remaining * 0.25,
        ease: 'Linear',
        onComplete: () => { if (tempTile && tempTile.active) tempTile.destroy(); }
      });
    });
  }

  telegraphRow(row, durationMs = 1500) {
    for (let c = 0; c < this.cols; c++) {
      this.telegraph(c, row, durationMs);
    }
  }

  telegraphCol(col, durationMs = 1500) {
    for (let r = 0; r < this.rows; r++) {
      this.telegraph(col, r, durationMs);
    }
  }

}

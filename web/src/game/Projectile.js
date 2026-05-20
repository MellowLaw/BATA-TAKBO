import * as Phaser from 'phaser';
import { audioManager } from './AudioManager.js';

export class Projectile {
  constructor(scene, grid, targetCol, targetRow) {
    this.scene = scene;
    this.grid = grid;
    this.targetCol = targetCol;
    this.targetRow = targetRow;

    // The pixel center of the target tile
    const targetPos = this.grid.getPixelPosition(targetCol, targetRow);

    // Pick a random projectile key
    const types = ['projectile_1', 'projectile_2', 'projectile_3'];
    const chosen = types[Phaser.Math.Between(0, 2)];

    // Spawn directly above target tile
    const startX = targetPos.x;
    const startY = grid.offsetY - 50;

    this.sprite = scene.add.sprite(startX, startY, chosen);
    this.sprite.setScale(2.0); // Scaled up!
    audioManager.play('sfx_warning');

    // Animate Y dropping straight down
    scene.tweens.add({
      targets: this.sprite,
      y: targetPos.y,
      duration: 600,
      ease: 'Linear',
      onComplete: () => {
        this.land();
      }
    });

    // Add some spin
    scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: 400,
      repeat: -1
    });
  }

  land() {
    // Flash impact visual on the grid using Lightning Burst
    const targetPos = this.grid.getPixelPosition(this.targetCol, this.targetRow);
    const impact = this.scene.add.sprite(targetPos.x, targetPos.y, 'lightning_burst');
    
    // Scale the burst to cover the tile nicely
    impact.setScale(1.8).setDepth(150);
    impact.play('anim_lightning_burst');
    impact.on('animationcomplete', () => {
      impact.destroy();
    });

    // Notify GameScene to check for player collision
    this.scene.events.emit('projectile:landed', this.targetCol, this.targetRow);

    // Remove projectile
    this.sprite.destroy();
  }
}

import { Vector3 } from 'three';

export const CAPTAIN = Object.freeze({
  stretch: 0.16, spring: 200, damping: 3.50,
  limit: 1.65, radius: 0.72, bounce: 0.36, launch: 1.2, sway: 0.16,
});

export class JellyState {
  constructor() {
    this.grab = new Vector3(0, 1.5, 0.3);
    this.pull = new Vector3();
    this.velocity = new Vector3();
    this.desired = new Vector3();
    this.sway = new Vector3();
    this.swayVelocity = new Vector3();
    this.reset();
  }

  reset() {
    for (const vector of [this.pull, this.velocity, this.desired, this.sway, this.swayVelocity]) vector.set(0, 0, 0);
    this.held = false;
    this.hop = this.hopSpeed = this.squash = this.squashSpeed = this.ripple = this.elapsed = 0;
  }

  release() {
    this.held = false;
    const strength = Math.min(this.pull.length(), 2.5);
    this.hopSpeed = Math.min(strength * CAPTAIN.launch, 4.3);
    this.ripple = Math.min(strength * 0.14, 0.24);
    this.swayVelocity.set(-this.pull.x * CAPTAIN.sway * 6, this.pull.y * CAPTAIN.sway * 2, -this.pull.z * CAPTAIN.sway * 5);
    this.velocity.clampLength(0, 8);
    this.elapsed = 0;
  }

  boop() {
    this.reset();
    this.grab.set(0.1, 1.75, 0.45);
    this.pull.set(0.5, 0.25, 0.13).multiplyScalar(CAPTAIN.stretch);
    this.velocity.set(-1.8, 0, 0.4).multiplyScalar(CAPTAIN.stretch);
    this.hopSpeed = CAPTAIN.launch * 0.65;
    this.swayVelocity.set(CAPTAIN.sway * 2, 0, CAPTAIN.sway);
    this.ripple = 0.08 * CAPTAIN.stretch;
  }

  step(dt) {
    const damping = this.held ? 20 : CAPTAIN.damping;
    for (const axis of ['x', 'y', 'z']) {
      const goal = this.held ? this.desired[axis] : 0;
      const spring = this.held ? 170 : CAPTAIN.spring;
      this.velocity[axis] += ((goal - this.pull[axis]) * spring - this.velocity[axis] * damping) * dt;
      this.pull[axis] += this.velocity[axis] * dt;
      const stiffness = axis === 'x' ? 37 : axis === 'y' ? 53 : 29;
      this.swayVelocity[axis] += (-this.sway[axis] * stiffness - this.swayVelocity[axis] * CAPTAIN.damping * 0.7) * dt;
      this.sway[axis] += this.swayVelocity[axis] * dt;
    }
    if (this.hop > 0 || this.hopSpeed > 0) {
      this.hopSpeed -= 9 * dt;
      this.hop += this.hopSpeed * dt;
      if (this.hop < 0) {
        this.hop = 0;
        this.squashSpeed -= Math.min(2.4, Math.abs(this.hopSpeed) * 0.5);
        this.hopSpeed = -this.hopSpeed * CAPTAIN.bounce;
        if (this.hopSpeed < 0.15) this.hopSpeed = 0;
      }
    }
    this.squashSpeed += (-this.squash * 140 - this.squashSpeed * 7) * dt;
    this.squash += this.squashSpeed * dt;
    this.ripple *= Math.exp(-dt * 2.8);
    this.elapsed += dt;
  }
}

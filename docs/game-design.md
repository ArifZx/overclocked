````md id="n8q3vd"
# 📱⚡ OVERCLOCK PANIC: MOTION MODE

> Don’t just play it. Handle it.

---

## 🎯 Overview

**Genre:** Arcade / Panic Management  
**Platform:** HTML5 (Mobile-first, gyro-enabled)  
**Session Length:** 30–90 seconds

**Core Fantasy:**  
You are physically handling an unstable overclocked machine.  
The only way to survive is by shaking, tilting, and flipping your device.

---

## 🔥 Unique Hook

This game uses **real device motion (gyro & accelerometer)** as the primary input:

- 📳 Shake your phone to cool the system
- 📐 Tilt your phone to control voltage
- 🔄 Flip your phone for emergency actions

**The player doesn’t just control the machine — they physically interact with it.**

---

## 🔁 Core Gameplay Loop

1. Start run
2. Machine begins generating heat, pressure, and score
3. Player uses motion controls to stabilize the system
4. Random chaos events disrupt control
5. System overloads → Game Over
6. Score is shown → instant retry

---

## 🧩 Core Systems

### 🔥 Heat

- Constantly increases over time
- Strongly affected by voltage
- Reduced by shaking (fan boost)
- If maxed → MELTDOWN (Game Over)

---

### ⚡ Voltage

- Controlled via device tilt
- Directly increases score multiplier
- Higher voltage = faster heat gain

---

### 💨 Pressure

- Builds up randomly
- Must be released (via action or flip)
- If maxed → EXPLOSION (Game Over)

---

## 🎮 Controls (Motion-Based)

### 📐 Tilt (Primary Control)

- Tilt right → increase voltage
- Tilt left → decrease voltage

---

### 📳 Shake (Cooling System)

- Shake device → activate fan boost
- Rapid heat reduction

**Risk:**

- Excessive shaking may trigger instability

---

### 🔄 Flip (Emergency Action)

- Flip device (face down / upside down)

**Effect (randomized):**

- Reset pressure
- Cancel active chaos event
- OR trigger negative effect

---

### ⏺ Tap (Fallback)

- Optional tap button for:
  - coolant
  - accessibility fallback

---

## ⚙️ Core Formula

```ts
heat += voltage * 0.06;
pressure += random(0.02, 0.08);
score += voltage * dt;
```
````

Cooling:

```ts id="2m1lzt"
heat -= shakePower;
heat -= passiveCooling;
```

---

## 🎲 Chaos Event System

Every 10–15 seconds, a random event occurs:

### Events List

- 🔧 Fan Jam
  → disables shake effect temporarily

- ⚡ Voltage Spike
  → sudden uncontrollable increase

- 🔄 Control Inversion
  → tilt direction reversed

- 🧭 Sensor Drift
  → tilt becomes inaccurate

- 📳 Phantom Shake
  → fake shake triggers

- 🧱 Orientation Lock
  → tilt freezes for a short time

---

## 🧠 Machine Personality System

Each run starts with a random machine type:

### 😡 Aggressive

- Faster heat gain
- Higher score multiplier

---

### 😴 Stable

- Slower heat increase
- Lower score

---

### 🤪 Chaotic

- More frequent events
- Unpredictable behavior

---

## 💥 Failure Conditions

- 🔥 Heat reaches maximum → MELTDOWN
- 💨 Pressure reaches maximum → EXPLOSION

---

## 🎯 Objective

- Survive as long as possible
- Achieve the highest score

---

## 🎨 UI Layout

```id="t8m8r1"
[ SCORE ]

[ HEAT 🔥 BAR ]
[ VOLTAGE ⚡ BAR ]
[ PRESSURE 💨 BAR ]

[ TILT INDICATOR ← → ]
[ SHAKE ICON ]
[ WARNING TEXT ]

[ ENABLE MOTION BUTTON ]
```

---

## 💥 Juice & Feedback

### Visual

- Screen shake during critical states
- Red flashing UI
- Tilt direction indicator
- Glitch effects during chaos

---

### Audio

- Machine hum loop
- Increasing warning beeps
- Distortion during overload
- Explosion SFX

---

### Haptics (if supported)

- Vibration on:
  - shake detection
  - critical heat
  - explosion

---

## ⚠️ UX Considerations

### Motion Permission (iOS)

- Must request permission on user interaction

```ts id="lqv59h"
await DeviceMotionEvent.requestPermission();
```

---

### Fallback Support

- Provide touch controls if:
  - device doesn’t support motion
  - permission denied

---

### Calibration

- Optional: neutral tilt center at start

---

## 🧪 Input Detection (Simplified)

```ts
if (acceleration > threshold) triggerShake();
if (tilt > X) voltageUp();
if (tilt < -X) voltageDown();
if (deviceFlipped) triggerFlip();
```

---

## ⏱️ Difficulty Scaling

- Events occur more frequently over time
- Heat gain increases gradually
- Pressure spikes become stronger

---

## 🧱 MVP Scope (Game Jam)

### MUST HAVE:

- Motion controls (tilt + shake)
- Heat / Voltage / Pressure system
- Basic UI
- Game loop + game over
- 2–3 chaos events

---

### NICE TO HAVE:

- Flip mechanic
- Machine personality
- Sound & vibration polish

---

## 💡 Design Pillars

### 1. PHYSICAL INTERACTION

The player uses real-world movement

### 2. CHAOS

The system becomes increasingly unstable

### 3. UNPREDICTABILITY

Every run feels different

### 4. SHORT & ADDICTIVE

Quick failure → instant retry

---

## 🚀 Tagline

> "You don’t control the machine. You survive it."
>
> "Don’t just play it. Handle it."

# Puppy

A simple, mobile-friendly arcade game where your dog catches falling treats.

## What the player sees
- A clean start screen with one front profile card
- Dog profile setup: choose name and breed
- Fast arcade gameplay with score, combo, and 3 lives
- Game Over screen with best score saved locally

## Core gameplay
- Move left/right by dragging on touch devices
- Keyboard fallback: `A` / `D` or arrow keys
- Catch treats to build combo and score
- Missing treats resets combo and removes a life
- Press/tap retry on Game Over

## Dog profile
- Name and breed can be chosen before starting
- Profile is saved in browser local storage
- Breed selection changes the dog color palette

## Tech
- HTML/CSS
- Phaser 3 (loaded from CDN)
- JavaScript
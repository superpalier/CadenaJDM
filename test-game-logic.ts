// Test script to simulate game logic manually
import { createDeck, isValidMove, playCard, initializeGame } from './src/logic/gameEngine';
import type { Card } from './src/types';

console.log('=== CADENA GAME SIMULATION ===\n');

// Initialize game
const gameState = initializeGame("Test Player");
console.log('Game initialized');
console.log(`Player hand:`, gameState.players[0].hand.map(c => `${c.type} ${c.value}`));
console.log(`AI hand:`, gameState.players[1].hand.map(c => `${c.type} ${c.value}`));
console.log(`Current turn: ${gameState.players[gameState.currentPlayerIndex].name}\n`);

// Test validation rules
console.log('=== VALIDATION TESTS ===');

const chain: Card[] = [];

// Test 1: Empty chain
const startCard: Card = { id: '1', type: 'START', value: 1 };
console.log(`Test 1: Can play START(1) on empty chain? ${isValidMove(chain, startCard)} (should be true)`);

const extensionCard: Card = { id: '2', type: 'EXTENSION', value: 1 };
console.log(`Test 2: Can play EXTENSION(1) on empty chain? ${isValidMove(chain, extensionCard)} (should be false)`);

// Add START to chain
chain.push(startCard);

// Test 3: Can't play START on non-empty chain
const anotherStart: Card = { id: '3', type: 'START', value: 2 };
console.log(`Test 3: Can play START(2) after START(1)? ${isValidMove(chain, anotherStart)} (should be false)`);

// Test 4: Value must be >= last card
const lowExtension: Card = { id: '4', type: 'EXTENSION', value: 1 };
console.log(`Test 4: Can play EXTENSION(1) after START(1)? ${isValidMove(chain, lowExtension)} (should be true - equal value)`);

const highExtension: Card = { id: '5', type: 'EXTENSION', value: 2 };
console.log(`Test 5: Can play EXTENSION(2) after START(1)? ${isValidMove(chain, highExtension)} (should be true - higher value)`);

const veryLowExtension: Card = { id: '6', type: 'EXTENSION', value: 1 };
chain.push(highExtension); // Now chain is [START(1), EXTENSION(2)]
console.log(`Test 6: Can play EXTENSION(1) after EXTENSION(2)? ${isValidMove(chain, veryLowExtension)} (should be false - lower value)`);

// Test 7: END card can close
const endCard1: Card = { id: '7', type: 'END', value: 1 };
console.log(`Test 7: Can play END(1) after EXTENSION(2)? ${isValidMove(chain, endCard1)} (should be false - lower value)`);

const endCard2: Card = { id: '8', type: 'END', value: 2 };
console.log(`Test 8: Can play END(2) after EXTENSION(2)? ${isValidMove(chain, endCard2)} (should be true - equal value)`);

const endCard3: Card = { id: '9', type: 'END', value: 3 };
console.log(`Test 9: Can play END(3) after EXTENSION(2)? ${isValidMove(chain, endCard3)} (should be true - higher value)`);

console.log('\n=== CRITICAL BUG CHECK ===');
console.log('If all tests show correct results, then the game LOGIC is fine.');
console.log('The problem might be in the VISUAL FEEDBACK (card highlighting) in the UI.');

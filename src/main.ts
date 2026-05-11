import { Game } from './game';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Missing #app mount point.');
}

try {
  const game = new Game();
  game.mount(root);
  game.start();
} catch (error) {
  console.error(error);
  root.textContent = 'Failed to start Master of Music.';
}

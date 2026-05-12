import { Game } from './game';

async function main(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');

  if (root === null) {
    throw new Error('Missing #app mount point.');
  }

  try {
    const game = new Game();
    game.mount(root);
    await game.init();
    game.start();
  } catch (error) {
    console.error(error);
    root.textContent = 'Failed to start Master of Music.';
  }
}

void main();

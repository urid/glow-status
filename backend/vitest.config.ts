import { defineConfig, Plugin } from 'vitest/config';

function nodeProtocolPlugin(): Plugin {
  return {
    name: 'node-protocol-fix',
    resolveId(id) {
      if (id.startsWith('node:')) {
        return { id, external: true };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [nodeProtocolPlugin()],
  test: {
    environment: 'node',
    pool: 'forks',
  },
});

// Stub for Ink's optional `react-devtools-core` import. Ink only calls into it
// when the DEV env flag is set (for debugging Ink itself), which we never do.
// Aliased here via tsconfig "paths" so `bun build --compile` doesn't pull the
// real ~3 MB package into the binary.
export default {
  connectToDevTools() {},
};

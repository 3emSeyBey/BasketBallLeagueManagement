# Dependency Resolution Fix

## Problem
`react-brackets@0.4.7` has a peer dependency requirement of `react@^17.0.0`, but the project uses `react@19.2.4`.

## Solution Applied

### Quick Fix (✅ Applied)
Added `.npmrc` file with `legacy-peer-deps=true` to allow npm to proceed with installation despite the peer dependency mismatch.

Run:
```bash
npm install
```

React 19 is backward compatible with React 17, so `react-brackets` should work fine in this mode.

---

## Long-Term Recommendation

### Consider Replacing `react-brackets`
`react-brackets` (v0.4.7) is outdated and doesn't officially support React 19. Consider one of these modern alternatives:

#### Option 1: **Mantine** (Recommended)
- Modern, well-maintained UI library with bracket components
- Full React 19 support
```bash
npm install @mantine/core @mantine/hooks @emotion/react @emotion/styled
```

#### Option 2: **react-bracket-component** 
- More actively maintained
- Better React 19 compatibility
```bash
npm install react-bracket-component
```

#### Option 3: **Custom Component**
Given your project structure with TypeScript and shadcn/ui, building a custom bracket component would:
- Eliminate the dependency
- Give you full control
- Integrate seamlessly with your existing design system

### Action Items
1. ✅ Quick install now: `npm install` (uses .npmrc)
2. Check where `react-brackets` is used in your codebase
3. Plan migration to alternative if bracket component becomes a bottleneck

---

## Files Modified
- `.npmrc` - Added legacy-peer-deps configuration

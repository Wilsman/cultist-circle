# Agent Rules

## UI/UX Guidelines

### Visual Element Positioning

**Rule: Prevent Element Clipping with Contained Effects**

When positioning decorative elements (badges, pulse dots, indicators) that extend beyond container bounds, while also having contained effects (shimmers, animations):

1. **Wrap contained effects in their own overflow-hidden container**
   - Keep animations like shimmers inside a dedicated wrapper with `overflow-hidden` and matching border radius
   - Position the wrapper absolutely within the parent: `absolute inset-0 rounded-full overflow-hidden`

2. **Position external elements with z-index layering**
   - Position dots/badges outside using negative values: `-top-0.5 -right-0.5`
   - Add visual separation with ring: `ring-2 ring-slate-900`
   - Use `z-10` on external elements, `z-0` on internal content

3. **Maintain proper stacking context**
   - Parent: `relative` (creates positioning context)
   - Shimmer wrapper: `absolute inset-0 overflow-hidden` (clips animation)
   - External dot: `absolute -top-0.5 -right-0.5 z-10` (appears above)
   - Content: `relative z-0` (appears above shimmer, below dot)

**Example - Correct Approach:**
```tsx
<motion.div className="relative flex ... rounded-full">
  {/* Shimmer stays contained */}
  <div className="absolute inset-0 rounded-full overflow-hidden">
    <motion.div className="absolute inset-0 bg-gradient-to-r ..." />
  </div>

  {/* Dot extends outside, appears above */}
  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-slate-900 z-10" />

  {/* Content */}
  <span className="relative z-0">Try Stash Scanner</span>
</motion.div>
```

**Anti-patterns:**
```tsx
// BAD: overflow-hidden clips the dot
<div className="... overflow-hidden">
  <span className="absolute top-1 right-1 ..." /> {/* Clipped! */}
</div>

// BAD: overflow-visible lets shimmer escape
<div className="... overflow-visible">
  <motion.div className="absolute inset-0 ..." /> {/* Shimmer visible outside! */}
</div>
```

## Code Quality

- Run `bun run lint` before committing changes
- Ensure TypeScript types are properly defined
- Use proper React hooks and avoid unnecessary re-renders

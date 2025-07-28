# DaisyUI 5 Conversion Design Document

## Project Overview
The OpenRouter API Watcher (orw) is a Deno Fresh 2 application that tracks changes to the public OpenRouter model list. It currently uses custom CSS styling and needs to be converted to use DaisyUI 5 with Tailwind CSS 4.

## Current Architecture Analysis

### Current Styling Approach
- **Custom CSS**: Extensive custom styling in `static/app.css` (~220 lines)
- **Layout**: Grid and flexbox-based responsive design
- **Color Scheme**: Dark theme with custom color variables
- **Components**: Custom-styled navigation, tables, cards, and lists

### Current UI Components
1. **Navigation Bar** (`NavBar.tsx`)
   - Top navigation with links
   - Filter input in the middle
   - Status information on the right
   - Responsive behavior for mobile

2. **Model List** (`ModelList.tsx`)
   - Large responsive table view
   - Sortable columns
   - Client-side filtering
   - Pagination support

3. **Change List** (`ChangeList.tsx`)
   - Paginated list of changes
   - Card-based layout for changes

4. **Data Display**
   - Model details with pricing information
   - Status indicators
   - Timestamps and durations

## DaisyUI 5 Conversion Strategy

### Phase 1: Foundation Setup ✅
- [x] DaisyUI 5 and Tailwind CSS 4 are already installed
- [x] CSS imports configured in `app.css`

### Phase 2: Core CSS Conversion
Convert the main CSS file to use DaisyUI semantic colors and remove custom styling.

#### 2.1 Color System Migration
**Current Custom Colors** → **DaisyUI Semantic Colors**
- `#444` (body bg) → `bg-base-200`
- `#fff` (text) → `text-base-content`
- `#333` (nav bg) → `bg-base-300`
- `lightskyblue` (links) → `text-primary`
- `coral` (active nav) → `text-accent`
- `burlywood` (timestamps) → `text-warning`
- `lightgreen` (success) → `text-success`
- `red` (errors) → `text-error`

#### 2.2 Layout Components Migration
- **Navigation** → `navbar` component
- **Content Container** → DaisyUI container utilities
- **Cards** → `card` component
- **Tables** → `table` component
- **Buttons** → `btn` component

### Phase 3: Component-by-Component Conversion

#### 3.1 Navigation Bar (`NavBar.tsx`)
**Current Structure:**
```html
<nav>
  <ul>
    <li>Links</li>
    <li class="dynamic-element">Filter Input</li>
    <li class="info-container">Status Info</li>
  </ul>
</nav>
```

**DaisyUI Target:**
```html
<div class="navbar bg-base-300">
  <div class="navbar-start">
    <ul class="menu menu-horizontal">
      <li><a class="btn btn-ghost">Models</a></li>
      <li><a class="btn btn-ghost">Changes</a></li>
      <li><a class="btn btn-ghost">Removed</a></li>
    </ul>
  </div>
  <div class="navbar-center">
    <input type="text" class="input input-bordered" placeholder="Filter models...">
  </div>
  <div class="navbar-end">
    <div class="stats stats-horizontal">
      <div class="stat">
        <div class="stat-desc">Last Check</div>
        <div class="stat-value text-sm">timestamp</div>
      </div>
    </div>
  </div>
</div>
```

#### 3.2 Model List (`ModelList.tsx`)
**Current Structure:** Custom table with complex styling

**DaisyUI Target:**
```html
<div class="overflow-x-auto">
  <table class="table table-zebra table-pin-rows">
    <thead>
      <tr>
        <th class="cursor-pointer">Model ID</th>
        <th class="cursor-pointer">Name</th>
        <th class="cursor-pointer">Added</th>
        <!-- ... other columns -->
      </tr>
    </thead>
    <tbody>
      <tr class="hover">
        <td><span class="badge badge-primary">model-id</span></td>
        <td>Model Name</td>
        <td><span class="text-warning">timestamp</span></td>
        <!-- ... other data -->
      </tr>
    </tbody>
  </table>
</div>
```

#### 3.3 Change List (`ChangeList.tsx`)
**Current Structure:** Custom card layout

**DaisyUI Target:**
```html
<div class="space-y-4">
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">
        <span class="badge badge-info">ADDED</span>
        Model Name
      </h2>
      <p>Change details...</p>
      <div class="card-actions justify-end">
        <span class="text-sm text-base-content/70">timestamp</span>
      </div>
    </div>
  </div>
</div>
```

### Phase 4: Responsive Design
- Utilize DaisyUI's responsive utilities
- Replace custom media queries with Tailwind responsive prefixes
- Implement `sm:`, `md:`, `lg:` breakpoint variations

### Phase 5: Interactive Elements
- **Filter Input** → `input input-bordered` with search functionality
- **Sort Buttons** → `btn btn-ghost` with icons
- **Status Indicators** → `badge` components with appropriate colors
- **Loading States** → `loading` component

## Implementation Roadmap

### Week 1: Foundation and Navigation
1. **Day 1-2**: Convert main CSS file structure
   - Remove custom color variables
   - Set up DaisyUI theme configuration
   - Convert body and basic typography

2. **Day 3-4**: Convert Navigation Bar
   - Implement `navbar` component structure
   - Convert navigation links to DaisyUI menu
   - Style filter input with DaisyUI classes

3. **Day 5**: Convert layout containers
   - Replace custom grid/flex with DaisyUI utilities
   - Implement responsive container classes

### Week 2: Core Components
1. **Day 1-3**: Convert Model List Table
   - Implement `table` component
   - Convert sorting functionality
   - Style data cells with appropriate badges/text colors

2. **Day 4-5**: Convert Change List
   - Implement `card` components
   - Style change entries with badges and typography
   - Implement pagination with DaisyUI

### Week 3: Polish and Optimization
1. **Day 1-2**: Fine-tune responsive behavior
   - Test mobile layouts
   - Optimize breakpoint behavior
   - Ensure accessibility

2. **Day 3-4**: Theme and customization
   - Configure custom DaisyUI theme if needed
   - Optimize color scheme
   - Add any missing interactive states

3. **Day 5**: Testing and cleanup
   - Remove unused CSS
   - Test all functionality
   - Performance optimization

## Technical Considerations

### DaisyUI Configuration
```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: dark --default, light;
  logs: false;
}
```

### Custom Theme Requirements
Given the current dark theme, we may need a custom DaisyUI theme:
```css
@plugin "daisyui/theme" {
  name: "orw-dark";
  default: true;
  color-scheme: dark;
  --color-base-100: oklch(25% 0.02 240);
  --color-base-200: oklch(22% 0.02 240);
  --color-base-300: oklch(19% 0.02 240);
  --color-base-content: oklch(90% 0.02 240);
  --color-primary: oklch(70% 0.15 200);
  --color-accent: oklch(75% 0.2 30);
  /* ... other colors */
}
```

### Migration Strategy
1. **Incremental conversion**: Convert one component at a time
2. **Parallel styling**: Keep old CSS until new styling is verified
3. **Feature parity**: Ensure all current functionality is preserved
4. **Performance monitoring**: Track bundle size and runtime performance

## Benefits of DaisyUI Conversion

### Development Benefits
- **Reduced CSS maintenance**: ~80% reduction in custom CSS
- **Consistent design system**: Built-in design tokens and spacing
- **Better accessibility**: DaisyUI components include ARIA attributes
- **Theme support**: Easy light/dark theme switching

### User Experience Benefits
- **Improved mobile experience**: Better responsive components
- **Faster loading**: Optimized CSS delivery
- **Better accessibility**: Screen reader support
- **Consistent interactions**: Standardized hover/focus states

### Maintenance Benefits
- **Future-proof**: Regular DaisyUI updates
- **Documentation**: Comprehensive component documentation
- **Community support**: Large DaisyUI community
- **Easier onboarding**: Standard component patterns

## Risk Mitigation

### Potential Issues
1. **Visual regression**: Components may look different
2. **Functionality loss**: Some custom behaviors may be lost
3. **Bundle size**: Initial increase in CSS size
4. **Learning curve**: Team familiarity with DaisyUI patterns

### Mitigation Strategies
1. **Side-by-side comparison**: Document visual changes
2. **Feature testing**: Comprehensive testing plan
3. **Progressive enhancement**: Gradual rollout
4. **Training**: Team education on DaisyUI patterns

## Success Metrics

### Technical Metrics
- CSS size reduction: Target 70%+ reduction
- Component reusability: 90%+ components using DaisyUI
- Accessibility score: Improved Lighthouse accessibility rating

### User Experience Metrics
- Mobile usability score improvement
- Loading time maintenance or improvement
- Feature parity: 100% of current features preserved

## Conclusion

The conversion to DaisyUI 5 will significantly improve the maintainability, accessibility, and consistency of the OpenRouter API Watcher interface while preserving all current functionality. The phased approach ensures minimal disruption to the development process and user experience.

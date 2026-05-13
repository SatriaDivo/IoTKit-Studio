# IoTKit Studio - Design System

## 🎨 Color Palette: "Stormy Morning"

Skema warna ini menampilkan nuansa biru keabu-abuan yang mengingatkan pada kabut dan uap air yang terlihat di udara saat pagi hari yang berhadap. Biru keabu-abuan (dan variasinya) dikaitkan dengan kesejukan, ketenangan, dan profesionalisme - cocok untuk platform IoT industrial.

### Primary Colors

```css
/* Slate Blue - Primary */
--primary: #6a89a7;
--primary-hover: #5a7997;
--primary-light: #8aa3bd;

/* Light Blue - Accent */
--accent: #bdddfc;
--accent-hover: #a8d0f7;
--accent-light: #d4e9fd;

/* Sky Blue - Highlight */
--highlight: #88bdf2;
--highlight-hover: #6faee8;
--highlight-light: #a8cef5;

/* Dark Slate - Secondary */
--secondary: #384959;
--secondary-hover: #2d3a47;
--secondary-light: #4a5d6f;
```

### Neutral Colors

```css
/* Background & Surface */
--bg-primary: #f5f7fa;
--bg-secondary: #ffffff;
--bg-tertiary: #e8edf2;

/* Text Colors */
--text-primary: #2c3e50;
--text-secondary: #5a6c7d;
--text-tertiary: #8b9aa8;
--text-inverse: #ffffff;

/* Border Colors */
--border-light: #d1dbe5;
--border-medium: #b4c4d4;
--border-dark: #8b9aa8;
```

### Semantic Colors

```css
/* Status Colors */
--success: #4caf50;
--warning: #ff9800;
--error: #f44336;
--info: #2196f3;

/* Status Backgrounds */
--success-bg: #e8f5e9;
--warning-bg: #fff3e0;
--error-bg: #ffebee;
--info-bg: #e3f2fd;
```

## 🎯 Design Philosophy

### 1. Industrial & Professional

- **Bukan AI Chatbot**: Hindari bubble chat, avatar bot, atau elemen conversational
- **Industrial IoT**: Fokus pada data, metrics, dan control panels
- **Professional**: Clean, structured, dan business-oriented

### 2. Visual Hierarchy

```
Primary (Slate Blue #6A89A7)
  ↓ Navigation, Headers, Primary Actions

Accent (Light Blue #BDDDFC)
  ↓ Highlights, Hover States, Active Elements

Highlight (Sky Blue #88BDF2)
  ↓ Important Data, Status Indicators, Charts

Secondary (Dark Slate #384959)
  ↓ Sidebar, Footer, Secondary Actions
```

### 3. Component Styling

#### Cards

```css
.card {
  background: #ffffff;
  border: 1px solid #d1dbe5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(106, 137, 167, 0.08);
}

.card-header {
  background: linear-gradient(135deg, #6a89a7 0%, #5a7997 100%);
  color: #ffffff;
  padding: 16px 20px;
  border-radius: 8px 8px 0 0;
}
```

#### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #6a89a7;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
}

.btn-primary:hover {
  background: #5a7997;
  box-shadow: 0 4px 8px rgba(106, 137, 167, 0.2);
}

/* Secondary Button */
.btn-secondary {
  background: #bdddfc;
  color: #384959;
  border: 1px solid #88bdf2;
}

/* Outline Button */
.btn-outline {
  background: transparent;
  color: #6a89a7;
  border: 2px solid #6a89a7;
}
```

#### Sidebar

```css
.sidebar {
  background: #384959;
  color: #ffffff;
  width: 260px;
  border-right: 1px solid #2d3a47;
}

.sidebar-item {
  color: #b4c4d4;
  padding: 12px 20px;
  transition: all 0.2s;
}

.sidebar-item:hover {
  background: rgba(189, 221, 252, 0.1);
  color: #bdddfc;
}

.sidebar-item.active {
  background: rgba(136, 189, 242, 0.15);
  color: #88bdf2;
  border-left: 3px solid #88bdf2;
}
```

#### Tables & Data Display

```css
.table {
  background: #ffffff;
  border: 1px solid #d1dbe5;
}

.table-header {
  background: #e8edf2;
  color: #384959;
  font-weight: 600;
  padding: 12px 16px;
}

.table-row:hover {
  background: #f5f7fa;
}

.table-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #e8edf2;
  color: #5a6c7d;
}
```

#### Status Badges

```css
.badge-active {
  background: #4caf50;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-inactive {
  background: #8b9aa8;
  color: #ffffff;
}

.badge-warning {
  background: #ff9800;
  color: #ffffff;
}

.badge-error {
  background: #f44336;
  color: #ffffff;
}
```

## 📐 Layout Guidelines

### Grid System

```
Container: max-width 1400px
Columns: 12-column grid
Gutter: 24px
Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
```

### Spacing Scale

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

### Typography

```css
/* Font Family */
--font-primary:
  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;

/* Font Sizes */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
--text-4xl: 36px;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

## 🎭 Component Examples

### Dashboard Card

```jsx
<div className="bg-white border border-[#D1DBE5] rounded-lg shadow-sm">
  <div className="bg-gradient-to-r from-[#6A89A7] to-[#5a7997] text-white px-5 py-4 rounded-t-lg">
    <h3 className="text-lg font-semibold">Active Simulations</h3>
  </div>
  <div className="p-5">
    <div className="text-3xl font-bold text-[#384959]">24</div>
    <p className="text-sm text-[#8B9AA8] mt-1">Running projects</p>
  </div>
</div>
```

### Data Table

```jsx
<table className="w-full bg-white border border-[#D1DBE5] rounded-lg">
  <thead className="bg-[#E8EDF2]">
    <tr>
      <th className="px-4 py-3 text-left text-[#384959] font-semibold">
        Project
      </th>
      <th className="px-4 py-3 text-left text-[#384959] font-semibold">
        Status
      </th>
      <th className="px-4 py-3 text-left text-[#384959] font-semibold">
        Protocol
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="hover:bg-[#F5F7FA] border-b border-[#E8EDF2]">
      <td className="px-4 py-3 text-[#5A6C7D]">Temperature Monitor</td>
      <td className="px-4 py-3">
        <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full text-xs">
          Active
        </span>
      </td>
      <td className="px-4 py-3 text-[#5A6C7D]">MQTT</td>
    </tr>
  </tbody>
</table>
```

### Button Group

```jsx
<div className="flex gap-3">
  <button className="bg-[#6A89A7] hover:bg-[#5a7997] text-white px-5 py-2.5 rounded-lg font-medium transition-all">
    Start Simulation
  </button>
  <button className="bg-[#BDDDFC] hover:bg-[#a8d0f7] text-[#384959] px-5 py-2.5 rounded-lg font-medium border border-[#88BDF2] transition-all">
    Configure
  </button>
  <button className="bg-transparent hover:bg-[#F5F7FA] text-[#6A89A7] px-5 py-2.5 rounded-lg font-medium border-2 border-[#6A89A7] transition-all">
    Cancel
  </button>
</div>
```

## 🚫 What to Avoid (AI-like Design)

### ❌ Don't Use:

- Chat bubbles with rounded corners on one side
- Bot avatars or profile pictures
- Conversational UI patterns
- "Typing..." indicators with dots
- Message timestamps on every line
- User/Assistant labels
- Gradient backgrounds on messages
- Emoji reactions
- "Send" icon buttons

### ✅ Instead Use:

- Structured forms and inputs
- Data tables and grids
- Control panels and dashboards
- Status indicators and metrics
- Action buttons with clear labels
- Timeline views for logs
- Chart visualizations
- Configuration panels

## 📱 Responsive Design

### Mobile (< 768px)

- Sidebar collapses to hamburger menu
- Cards stack vertically
- Tables scroll horizontally
- Font sizes scale down 10%

### Tablet (768px - 1024px)

- Sidebar remains visible but narrower (220px)
- 2-column grid for cards
- Tables remain full width

### Desktop (> 1024px)

- Full sidebar (260px)
- 3-4 column grid for cards
- Maximum content width: 1400px

## 🎨 Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6A89A7",
          hover: "#5a7997",
          light: "#8aa3bd",
        },
        accent: {
          DEFAULT: "#BDDDFC",
          hover: "#a8d0f7",
          light: "#d4e9fd",
        },
        highlight: {
          DEFAULT: "#88BDF2",
          hover: "#6faee8",
          light: "#a8cef5",
        },
        secondary: {
          DEFAULT: "#384959",
          hover: "#2d3a47",
          light: "#4a5d6f",
        },
        slate: {
          50: "#F5F7FA",
          100: "#E8EDF2",
          200: "#D1DBE5",
          300: "#B4C4D4",
          400: "#8B9AA8",
          500: "#5A6C7D",
          600: "#384959",
          700: "#2C3E50",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
};
```

## 🎯 Implementation Priority

### Phase 1: Core Components

1. Update color variables in globals.css
2. Redesign Sidebar with new colors
3. Update Header component
4. Redesign Cards and Buttons

### Phase 2: Pages

1. Dashboard - Focus on metrics and charts
2. Projects - Table-based layout
3. Simulations - Control panel style
4. Logs - Timeline/table view

### Phase 3: AI Agent Redesign

1. Remove chat bubble design
2. Implement form-based interface
3. Add structured output display
4. Use data tables for results
5. Add progress indicators (not chat-like)

---

**Design Goal**: Create a professional industrial IoT platform that feels like a control center, not a chatbot interface.

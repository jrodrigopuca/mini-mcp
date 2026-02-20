# Component Documentation Templates

Ready-to-use templates for documenting UI components.

## Contents

- [Complete Component Template](#complete-component-template)
- [Props Table Template](#props-table-template)
- [Architecture Diagram Templates](#architecture-diagram-templates)
- [Known Issues Template](#known-issues-template)
- [Changelog Template](#changelog-template)

---

## Complete Component Template

Copy and adapt this template for any component:

````markdown
# ComponentName

Brief description of what the component does and when to use it.

## Installation

​`bash
npm install @your-package/component-name
​`

## Props

| Prop       | Type                 | Default | Required | Description                 |
| ---------- | -------------------- | ------- | -------- | --------------------------- |
| `prop1`    | `string`             | -       | Yes      | Description of prop1        |
| `prop2`    | `number`             | `0`     | No       | Description of prop2        |
| `prop3`    | `boolean`            | `false` | No       | Description of prop3        |
| `onChange` | `(value: T) => void` | -       | No       | Callback when value changes |
| `children` | `ReactNode`          | -       | No       | Content to render inside    |

## Events

| Event      | Payload                    | Description                  |
| ---------- | -------------------------- | ---------------------------- |
| `onChange` | `{ value, previousValue }` | Emitted when value changes   |
| `onError`  | `Error`                    | Emitted when an error occurs |

## Slots / Children

| Slot      | Purpose                   |
| --------- | ------------------------- |
| `default` | Main content area         |
| `header`  | Header section (optional) |
| `footer`  | Footer section (optional) |

## Examples

### Basic Usage

​```tsx
import { ComponentName } from '@your-package/component-name';

function Example() {
return <ComponentName prop1="value" />;
}
​```

### With All Props

​```tsx
<ComponentName
prop1="value"
prop2={42}
prop3={true}
onChange={(value) => console.log(value)}

> Content here
> </ComponentName>
> ​```

### Controlled vs Uncontrolled

​```tsx
// Controlled
const [value, setValue] = useState('');
<ComponentName value={value} onChange={setValue} />

// Uncontrolled
<ComponentName defaultValue="initial" />
​```

## Architecture

​`mermaid
graph TD
    A[ComponentName] --> B[InternalPartA]
    A --> C[InternalPartB]
    B --> D[SharedUtility]
    C --> D
​`

## State Flow

​`mermaid
stateDiagram-v2
    [*] --> Initial
    Initial --> Active: user interaction
    Active --> Loading: async operation
    Loading --> Success: resolved
    Loading --> Error: rejected
    Success --> Initial: reset
    Error --> Initial: dismiss
​`

## Dependencies

| Dependency        | Purpose            | Required |
| ----------------- | ------------------ | -------- |
| `dependency-name` | What it's used for | Yes/No   |

## Known Issues

| Issue                | Severity | Workaround         | Status             |
| -------------------- | -------- | ------------------ | ------------------ |
| Description of issue | 🔴/🟡/🟢 | How to work around | Open/Fixed/Planned |

## Changelog

### v1.1.0

- Added `prop3` for new feature
- Fixed issue with edge case

### v1.0.0

- Initial release
````

---

## Props Table Template

### Basic Props Table

```markdown
| Prop     | Type      | Default | Required | Description  |
| -------- | --------- | ------- | -------- | ------------ |
| `name`   | `string`  | -       | Yes      | The name     |
| `count`  | `number`  | `0`     | No       | Item count   |
| `active` | `boolean` | `false` | No       | Active state |
```

### Props with Complex Types

```markdown
| Prop      | Type                                          | Default    | Description            |
| --------- | --------------------------------------------- | ---------- | ---------------------- |
| `variant` | `'small' \| 'medium' \| 'large'`              | `'medium'` | Size variant           |
| `status`  | `'idle' \| 'loading' \| 'error' \| 'success'` | `'idle'`   | Current status         |
| `items`   | `Array<{ id: string; label: string }>`        | `[]`       | List of items          |
| `config`  | `Partial<ConfigOptions>`                      | `{}`       | Configuration object   |
| `render`  | `(item: T) => ReactNode`                      | -          | Custom render function |
```

### Props with TypeScript Reference

````markdown
## Props

This component accepts `ButtonProps`:

​`typescript
interface ButtonProps {
  /** Visual style variant */
  variant: 'primary' | 'secondary' | 'ghost';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - disables button and shows spinner */
  loading?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: React.ReactNode;
}
​`

See [types/button.ts](../types/button.ts) for complete definition.
````

---

## Architecture Diagram Templates

### Component Hierarchy

````markdown
​`mermaid
graph TD
    A[ParentComponent] --> B[ChildA]
    A --> C[ChildB]
    A --> D[ChildC]
    B --> E[GrandchildA]
    C --> F[GrandchildB]
​`
````

### Data Flow

````markdown
​`mermaid
flowchart LR
    A[User Input] --> B[Component]
    B --> C{Validation}
    C -->|Valid| D[Update State]
    C -->|Invalid| E[Show Error]
    D --> F[Emit Event]
    F --> G[Parent Handler]
​`
````

### State Machine

````markdown
​```mermaid
stateDiagram-v2
[*] --> Idle

    Idle --> Loading: fetch()
    Loading --> Success: resolve
    Loading --> Error: reject

    Success --> Idle: reset()
    Error --> Loading: retry()
    Error --> Idle: dismiss()

    Success --> [*]

​```
````

### Sequence Diagram (Component Interaction)

````markdown
​```mermaid
sequenceDiagram
participant U as User
participant C as Component
participant S as Store
participant A as API

    U->>C: Click submit
    C->>C: Validate form
    C->>S: dispatch(submit)
    S->>A: POST /data
    A-->>S: Response
    S-->>C: State update
    C-->>U: Show result

​```
````

---

## Known Issues Template

### Standard Format

```markdown
## Known Issues

| Issue                       | Severity  | Workaround         | Status       |
| --------------------------- | --------- | ------------------ | ------------ |
| Flickering on rapid updates | 🟡 Medium | Wrap with `memo()` | Open         |
| No RTL support              | 🟢 Low    | Apply manual CSS   | Planned v2.0 |
| Memory leak with 10k+ items | 🔴 High   | Virtualize list    | In Progress  |
```

### Detailed Format

````markdown
## Known Issues

### 🔴 Memory leak with large datasets

**Description:** When rendering more than 10,000 items, memory usage grows unbounded.

**Affected versions:** v1.0.0 - v1.2.3

**Workaround:**
​```tsx
// Use virtualization
import { VirtualList } from 'react-window';

<VirtualList itemCount={items.length} itemSize={50}>
  {({ index }) => <Item data={items[index]} />}
</VirtualList>
​```

**Status:** Fix planned for v1.3.0 ([#123](https://github.com/org/repo/issues/123))

---

### 🟡 Accessibility: Missing aria-live

**Description:** Screen readers don't announce dynamic content changes.

**Workaround:** Add `aria-live="polite"` to parent container.

**Status:** Open
````

---

## Changelog Template

```markdown
## Changelog

All notable changes to this component.

### [Unreleased]

- Nothing yet

### [2.0.0] - 2026-02-15

#### Breaking Changes

- Renamed `onSelect` to `onChange` for consistency
- Removed deprecated `legacyMode` prop

#### Added

- New `size` prop with 'sm', 'md', 'lg' options
- Support for controlled and uncontrolled modes

#### Fixed

- Memory leak when unmounting rapidly (#123)

### [1.2.0] - 2026-01-10

#### Added

- `loading` prop for async states
- `disabled` styling improvements

#### Deprecated

- `legacyMode` prop - will be removed in v2.0.0

### [1.1.0] - 2025-12-01

#### Added

- Initial TypeScript support

### [1.0.0] - 2025-11-15

- Initial release
```

---

## External Resources

- [Mermaid Live Editor](https://mermaid.live/) — Test diagrams before adding to docs
- [Keep a Changelog](https://keepachangelog.com/) — Changelog format standard
- [Semantic Versioning](https://semver.org/) — Version numbering guide
- [README Template](https://www.makeareadme.com/) — General README structure

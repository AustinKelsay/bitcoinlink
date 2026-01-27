# Components Documentation

## Overview

BitcoinLink uses React components organized by functionality. The component library is built on PrimeReact for UI primitives.

## Component Structure

```
src/components/
├── AlbyButton.tsx           # Alby wallet integration button
├── LinkModal.tsx            # Generated links display modal
├── Footer.tsx               # Page footer
├── ImagePreview.jsx         # Image preview component
├── mutiny/
│   ├── MutinyButton.tsx     # Mutiny wallet button
│   ├── MutinyModal.tsx      # Mutiny NWA connection modal
│   └── MutinyInstructions.tsx # Claiming instructions for Mutiny
├── strike/
│   ├── StrikeButton.tsx     # Strike wallet button
│   └── StrikeInstructions.tsx # Claiming instructions for Strike
└── cashapp/
    ├── CashAppButton.tsx    # CashApp button
    └── CashAppInstructions.tsx # Claiming instructions for CashApp
```

---

## Core Components

### LinkModal

Displays generated payment links with copy functionality.

**Location:** `src/components/LinkModal.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `generatedLinks` | `string[] \| null` | Array of generated link URLs |
| `linkModalVisible` | `boolean` | Controls modal visibility |
| `setLinkModalVisible` | `(visible: boolean) => void` | Visibility setter |

**Features:**
- Display all generated links
- Copy individual links
- Copy all links at once
- Links open in new tab

**Usage:**
```tsx
<LinkModal
  generatedLinks={generatedLinks}
  linkModalVisible={linkModalVisible}
  setLinkModalVisible={setLinkModalVisible}
/>
```

---

### MutinyModal

Modal for Mutiny wallet connection via Nostr Wallet Auth (NWA) protocol.

**Location:** `src/components/mutiny/MutinyModal.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `mutinyModalVisible` | `boolean` | Controls modal visibility |
| `setMutinyModalVisible` | `(visible: boolean) => void` | Visibility setter |
| `satsPerLink` | `number` | Satoshis per link |
| `numberOfLinks` | `number` | Number of links to generate |
| `setLinkModalVisible` | `(visible: boolean) => void` | Link modal visibility |
| `setGeneratedLinks` | `(links: string[]) => void` | Generated links setter |
| `generatingLinks` | `boolean` | Loading state |
| `setGeneratingLinks` | `(generating: boolean) => void` | Loading setter |

**Features:**
- QR code for NWA URI (mobile scanning)
- Browser popup for Mutiny web app
- Nostr event subscription for wallet auth response
- NIP-04 encrypted communication
- Automatic link generation on successful auth

**NWA Flow:**
```
1. Generate keypair and NWA URI with budget
2. Display QR code for mobile or open browser popup
3. Subscribe to kind 33194 events on Nostr relays
4. Decrypt NIP-04 response and extract NWC URL
5. Generate gift-wrapped links
6. Publish to relays and display URLs
```

---

### AlbyButton

Styled button for Alby wallet actions.

**Location:** `src/components/AlbyButton.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Button label text |
| `handleSubmit` | `() => void` | Click handler callback |

**Usage:**
```tsx
<AlbyButton text="Generate with Alby" handleSubmit={handleAlbySubmit} />
```

---

### MutinyButton

Styled button for Mutiny wallet actions.

**Location:** `src/components/mutiny/MutinyButton.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | `string` | Button label |
| `handleSubmit` | `() => void` | Click handler |
| `disabled` | `boolean` | Disabled state |

---

### Instruction Components

These components guide users through the claiming process for wallets without WebLN support.

#### MutinyInstructions

**Location:** `src/components/mutiny/MutinyInstructions.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | `boolean` | Controls visibility |
| `onHide` | `() => void` | Close handler |
| `input` | `string` | Lightning address input value |
| `setInput` | `(value: string) => void` | Input setter |
| `onSubmit` | `(e: FormEvent) => void` | Submit handler |
| `amount` | `number \| undefined` | Sats amount to claim |

#### StrikeInstructions

**Location:** `src/components/strike/StrikeInstructions.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | `boolean` | Controls visibility |
| `onHide` | `() => void` | Close handler |
| `input` | `string` | Lightning address input value |
| `setInput` | `(value: string) => void` | Input setter |
| `onSubmit` | `(e: FormEvent) => void` | Submit handler |

#### CashAppInstructions

**Location:** `src/components/cashapp/CashAppInstructions.tsx`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | `boolean` | Controls visibility |
| `onHide` | `() => void` | Close handler |
| `input` | `string` | Lightning address input value |
| `setInput` | `(value: string) => void` | Input setter |
| `onSubmit` | `(e: FormEvent) => void` | Submit handler |
| `amount` | `number \| undefined` | Sats amount to claim |

---

## PrimeReact Components Used

| Component | Source | Usage |
|-----------|--------|-------|
| `Dialog` | primereact/dialog | Modal dialogs |
| `Button` | primereact/button | Action buttons |
| `InputText` | primereact/inputtext | Text inputs |
| `InputNumber` | primereact/inputnumber | Numeric inputs |
| `ProgressSpinner` | primereact/progressspinner | Loading states |
| `Toast` | primereact/toast | Notifications |

---

## Component Patterns

### Toast Notifications

All components use the `useToast` hook for notifications:

```tsx
const { showToast } = useToast();
showToast('success', 'Title', 'Description message');
```

Severity levels: `success`, `info`, `warn`, `error`

### Copy to Clipboard

Standard pattern used across components:

```tsx
const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text)
    .then(() => showToast('success', 'Copied', 'Link copied'))
    .catch((error) => showToast('error', 'Error', 'Copy failed'));
};
```

### Modal Visibility

Modals follow controlled component pattern:

```tsx
const [visible, setVisible] = useState(false);

<Dialog visible={visible} onHide={() => setVisible(false)}>
  {/* Content */}
</Dialog>
```

---

## Usage in Pages

### index.tsx (Link Generation)

```tsx
<AlbyButton text="Generate with Alby" handleSubmit={handleAlbySubmit} />
<MutinyButton
  text="Generate with Mutiny"
  disabled={false}
  handleSubmit={() => setMutinyModalVisible(true)}
/>
<MutinyModal
  mutinyModalVisible={mutinyModalVisible}
  setMutinyModalVisible={setMutinyModalVisible}
  // ... other props
/>
<LinkModal
  generatedLinks={generatedLinks}
  linkModalVisible={linkModalVisible}
  setLinkModalVisible={setLinkModalVisible}
/>
```

### claim/[slug].tsx (Claiming)

```tsx
<AlbyButton text="Claim with Alby" handleSubmit={handleAlbySubmit} />
<StrikeButton text="Claim with Strike" handleSubmit={() => setIsStrikeVisible(true)} />
<MutinyButton text="Claim with Mutiny" handleSubmit={() => setIsMutinyVisible(true)} />
<CashAppButton text="Claim with CashApp" handleSubmit={() => setIsCashAppVisible(true)} />

<StrikeInstructions isVisible={isStrikeVisible} onHide={() => setIsStrikeVisible(false)} ... />
<CashAppInstructions isVisible={isCashAppVisible} onHide={() => setIsCashAppVisible(false)} ... />
<MutinyInstructions isVisible={isMutinyVisible} onHide={() => setIsMutinyVisible(false)} ... />
```

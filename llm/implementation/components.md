# Components Documentation

## Overview

BitcoinLink uses React components organized by functionality. The component library is built on PrimeReact for UI primitives.

## Component Structure

```
src/components/
├── AlbyButton.js           # Alby wallet integration button
├── LinkModal.js            # Generated links display modal
├── Footer.js               # Page footer
├── ImagePreview.jsx        # Image preview component
├── mutiny/
│   ├── MutinyButton.js     # Mutiny wallet button
│   ├── MutinyModal.js      # Mutiny NWA connection modal
│   └── MutinyInstructions.js # Claiming instructions for Mutiny
├── strike/
│   ├── StrikeButton.js     # Strike wallet button
│   └── StrikeInstructions.js # Claiming instructions for Strike
└── cashapp/
    ├── CashAppButton.js    # CashApp button
    └── CashAppInstructions.js # Claiming instructions for CashApp
```

## Core Components

### AlbyButton

Branded button for Alby wallet integration.

**Location:** `src/components/AlbyButton.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | string | Button label text |
| `handleSubmit` | function | Click handler callback |

**Usage:**
```jsx
<AlbyButton
  text="Generate with Alby"
  handleSubmit={handleAlbySubmit}
/>
```

---

### LinkModal

Modal dialog displaying generated payment links with copy functionality and API integration details.

**Location:** `src/components/LinkModal.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `generatedLinks` | string[] | Array of generated link URLs |
| `linkModalVisible` | boolean | Controls modal visibility |
| `setLinkModalVisible` | function | Visibility state setter |
| `secret` | string | Encryption secret (for display) |
| `oneToManyNwcId` | string | NWC ID for API integration |
| `oneToManySecret` | string | Secret for API integration |

**Features:**
- Tab view with "Links" and "API Integration" tabs
- Copy-to-clipboard functionality
- API endpoint and secret display
- Links open in new tab

**Usage:**
```jsx
<LinkModal
  generatedLinks={generatedLinks}
  linkModalVisible={linkModalVisible}
  setLinkModalVisible={setLinkModalVisible}
  secret={secret}
  oneToManyNwcId={oneToManyNwcId}
  oneToManySecret={oneToManySecret}
/>
```

---

### MutinyModal

Modal for Mutiny wallet connection via Nostr Wallet Auth (NWA) protocol.

**Location:** `src/components/mutiny/MutinyModal.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `mutinyModalVisible` | boolean | Controls modal visibility |
| `setMutinyModalVisible` | function | Visibility state setter |
| `satsPerLink` | number | Satoshis per link |
| `numberOfLinks` | number | Number of links to generate |
| `setLinkModalVisible` | function | Link modal visibility setter |
| `setGeneratedLinks` | function | Generated links state setter |
| `generatingLinks` | boolean | Loading state |
| `setGeneratingLinks` | function | Loading state setter |

**Features:**
- QR code for NWA URI (mobile scanning)
- Browser popup for Mutiny web app
- Nostr event subscription for wallet auth response
- NIP-04 encrypted communication
- Automatic link generation on successful auth

**NWA Flow:**
1. Generates keypair and NWA URI with budget
2. Displays QR code for mobile or opens browser popup
3. Subscribes to kind 33194 events on Nostr relays
4. Decrypts response and extracts NWC URL
5. Generates encrypted links

---

### MutinyButton

Styled button for Mutiny wallet actions.

**Location:** `src/components/mutiny/MutinyButton.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | string | Button label |
| `handleSubmit` | function | Click handler |
| `disabled` | boolean | Disabled state |

---

### MutinyInstructions

Step-by-step instructions for claiming links with Mutiny wallet.

**Location:** `src/components/mutiny/MutinyInstructions.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | boolean | Controls visibility |
| `onHide` | function | Close handler |
| `input` | string | Lightning address input value |
| `setInput` | function | Input state setter |
| `onSubmit` | function | Submit handler |
| `amount` | number | Sats amount to claim |

---

### StrikeButton

Styled button for Strike wallet actions.

**Location:** `src/components/strike/StrikeButton.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | string | Button label |
| `handleSubmit` | function | Click handler |

---

### StrikeInstructions

Step-by-step instructions for claiming links with Strike wallet.

**Location:** `src/components/strike/StrikeInstructions.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | boolean | Controls visibility |
| `onHide` | function | Close handler |
| `input` | string | Lightning address input value |
| `setInput` | function | Input state setter |
| `onSubmit` | function | Submit handler |

---

### CashAppButton

Styled button for CashApp actions.

**Location:** `src/components/cashapp/CashAppButton.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `text` | string | Button label |
| `handleSubmit` | function | Click handler |

---

### CashAppInstructions

Step-by-step instructions for claiming links with CashApp.

**Location:** `src/components/cashapp/CashAppInstructions.js`

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isVisible` | boolean | Controls visibility |
| `onHide` | function | Close handler |
| `input` | string | Lightning address input value |
| `setInput` | function | Input state setter |
| `onSubmit` | function | Submit handler |
| `amount` | number | Sats amount to claim |

---

### Footer

Simple footer component for page layout.

**Location:** `src/components/Footer.js`

---

### ImagePreview

Image preview component for displaying images.

**Location:** `src/components/ImagePreview.jsx`

## PrimeReact Components Used

| Component | Source | Usage |
|-----------|--------|-------|
| `Dialog` | primereact/dialog | Modal dialogs |
| `Button` | primereact/button | Action buttons |
| `InputText` | primereact/inputtext | Text inputs |
| `InputNumber` | primereact/inputnumber | Numeric inputs |
| `TabView`, `TabPanel` | primereact/tabview | Tabbed interfaces |
| `ProgressSpinner` | primereact/progressspinner | Loading states |
| `Toast` | primereact/toast | Notifications |

## Component Patterns

### Toast Notifications

All components use the `useToast` hook for notifications:

```jsx
const { showToast } = useToast();
showToast('success', 'Title', 'Description message');
```

Severity levels: `success`, `info`, `warn`, `error`

### Copy to Clipboard

Standard pattern used across components:

```jsx
const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
    .then(() => showToast('success', 'Copied', 'Link copied'))
    .catch((error) => showToast('error', 'Error', 'Copy failed'));
};
```

### Modal Visibility

Modals follow controlled component pattern:

```jsx
const [visible, setVisible] = useState(false);

<Dialog visible={visible} onHide={() => setVisible(false)}>
  {/* Content */}
</Dialog>
```

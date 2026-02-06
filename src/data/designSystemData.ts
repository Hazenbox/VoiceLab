/**
 * Static Design System Data
 * 
 * Comprehensive data for all components, tokens, and icons from Jio Design System
 * This eliminates dependency on MCP runtime calls for previews
 */

// =============================================================================
// Types
// =============================================================================

export interface PropInfo {
  type: string;
  default?: string;
  required?: boolean;
  description?: string;
}

export interface ComponentData {
  name: string;
  description: string;
  category: ComponentCategory;
  props: Record<string, PropInfo>;
  code: string;
  hasLivePreview: boolean;
}

export type ComponentCategory = 
  | 'form' 
  | 'display' 
  | 'typography' 
  | 'navigation' 
  | 'layout' 
  | 'feedback' 
  | 'other';

export interface TokenData {
  name: string;
  description: string;
  cssVariable?: string;
}

// =============================================================================
// All 30 Available Components
// =============================================================================

export const COMPONENTS = [
  'Avatar',
  'Badge', 
  'Button',
  'Card',
  'Checkbox',
  'Chip',
  'Display',
  'Divider',
  'HeaderNavigation',
  'Headline',
  'Icon',
  'Image',
  'Input',
  'Label',
  'ListItem',
  'Logo',
  'Radio',
  'SearchField',
  'Stepper',
  'Switch',
  'Tabs',
  'Text',
  'TextArea',
  'Title',
  'Toast',
  'BottomNavigation',
  'CarouselIndicator',
  'StructuredList',
  'SegmentedControl',
  'AccountsRail',
] as const;

export type ComponentName = typeof COMPONENTS[number];

// =============================================================================
// Component Information
// =============================================================================

export const COMPONENT_INFO: Record<ComponentName, ComponentData> = {
  Avatar: {
    name: 'Avatar',
    description: 'Displays user profile pictures or initials with various sizes',
    category: 'display',
    props: {
      size: { type: '"S" | "M" | "L"', default: '"M"', description: 'Size of the avatar' },
      name: { type: 'string', description: 'Name to generate initials from' },
      src: { type: 'string', description: 'Image URL for the avatar' },
    },
    code: `import { Avatar } from '@marcelinodzn/ds-react';

<Avatar size="M" name="John Doe" />
<Avatar size="L" src="https://example.com/photo.jpg" />`,
    hasLivePreview: true,
  },

  Badge: {
    name: 'Badge',
    description: 'Small status indicator or count display',
    category: 'display',
    props: {
      variant: { type: '"default" | "success" | "warning" | "error"', default: '"default"' },
      size: { type: '"S" | "M"', default: '"M"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Badge } from '@marcelinodzn/ds-react';

<Badge variant="success">Active</Badge>
<Badge variant="error">3</Badge>`,
    hasLivePreview: true,
  },

  Button: {
    name: 'Button',
    description: 'Interactive button with multiple appearances and sizes',
    category: 'form',
    props: {
      appearance: { type: '"primary" | "secondary" | "ghost" | "link"', default: '"primary"' },
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      isDisabled: { type: 'boolean', default: 'false' },
      isLoading: { type: 'boolean', default: 'false' },
      onPress: { type: '() => void', required: true },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Button } from '@marcelinodzn/ds-react';

<Button appearance="primary" size="M" onPress={() => console.log('clicked')}>
  Click Me
</Button>`,
    hasLivePreview: true,
  },

  Card: {
    name: 'Card',
    description: 'Container component for grouping related content',
    category: 'display',
    props: {
      variant: { type: '"elevated" | "outlined" | "filled"', default: '"elevated"' },
      padding: { type: '"none" | "S" | "M" | "L"', default: '"M"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Card, Text } from '@marcelinodzn/ds-react';

<Card variant="elevated" padding="M">
  <Text>Card content goes here</Text>
</Card>`,
    hasLivePreview: true,
  },

  Checkbox: {
    name: 'Checkbox',
    description: 'Toggle control for boolean values',
    category: 'form',
    props: {
      isSelected: { type: 'boolean', default: 'false' },
      onChange: { type: '(isSelected: boolean) => void', required: true },
      isDisabled: { type: 'boolean', default: 'false' },
      label: { type: 'string' },
    },
    code: `import { Checkbox } from '@marcelinodzn/ds-react';

<Checkbox 
  isSelected={checked} 
  onChange={setChecked}
  label="I agree to terms"
/>`,
    hasLivePreview: true,
  },

  Chip: {
    name: 'Chip',
    description: 'Compact element for tags, filters, or selections',
    category: 'display',
    props: {
      variant: { type: '"filled" | "outlined"', default: '"filled"' },
      size: { type: '"S" | "M"', default: '"M"' },
      onClose: { type: '() => void', description: 'Makes chip dismissible' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Chip } from '@marcelinodzn/ds-react';

<Chip variant="filled">Tag</Chip>
<Chip variant="outlined" onClose={() => {}}>Removable</Chip>`,
    hasLivePreview: true,
  },

  Display: {
    name: 'Display',
    description: 'Large display text for hero sections and major headings',
    category: 'typography',
    props: {
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Display } from '@marcelinodzn/ds-react';

<Display size="L">Welcome</Display>`,
    hasLivePreview: true,
  },

  Divider: {
    name: 'Divider',
    description: 'Visual separator between content sections',
    category: 'layout',
    props: {
      orientation: { type: '"horizontal" | "vertical"', default: '"horizontal"' },
      variant: { type: '"full" | "inset"', default: '"full"' },
    },
    code: `import { Divider } from '@marcelinodzn/ds-react';

<Divider orientation="horizontal" />`,
    hasLivePreview: true,
  },

  HeaderNavigation: {
    name: 'HeaderNavigation',
    description: 'Top navigation bar with logo, title, and actions',
    category: 'navigation',
    props: {
      title: { type: 'string' },
      leftAction: { type: 'ReactNode' },
      rightAction: { type: 'ReactNode' },
    },
    code: `import { HeaderNavigation, Icon } from '@marcelinodzn/ds-react';

<HeaderNavigation 
  title="Page Title"
  leftAction={<Icon name="IcArrowLeft" />}
  rightAction={<Icon name="IcSettings" />}
/>`,
    hasLivePreview: false,
  },

  Headline: {
    name: 'Headline',
    description: 'Section headline text with emphasis',
    category: 'typography',
    props: {
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Headline } from '@marcelinodzn/ds-react';

<Headline size="M">Section Headline</Headline>`,
    hasLivePreview: true,
  },

  Icon: {
    name: 'Icon',
    description: 'SVG icon component with extensive icon library. Icons are available from the Jio Design System icon library. Use the icon browser in the Design System Library to explore all available icons.',
    category: 'other',
    props: {
      name: { type: 'string', required: true, description: 'Icon name from the icon library (e.g., "IcHome", "IcSearch", "IcUser"). Browse icons in the Design System Library to see all available options.' },
      size: { type: '"S" | "M" | "L"', default: '"M"', description: 'Size of the icon' },
      color: { type: 'string', description: 'Optional custom color for the icon. If not provided, uses the default theme color.' },
    },
    code: `import { Icon } from '@marcelinodzn/ds-react';

// Basic usage
<Icon name="IcHome" size="M" />

// Different sizes
<Icon name="IcSearch" size="S" />
<Icon name="IcUser" size="L" />

// With custom color
<Icon name="IcSettings" size="M" color="#f97316" />

// Common icons
<Icon name="IcArrowLeft" size="M" />
<Icon name="IcCheck" size="M" />
<Icon name="IcClose" size="M" />`,
    hasLivePreview: true,
  },

  Image: {
    name: 'Image',
    description: 'Responsive image component with loading states',
    category: 'display',
    props: {
      src: { type: 'string', required: true },
      alt: { type: 'string', required: true },
      aspectRatio: { type: '"1:1" | "4:3" | "16:9"' },
      fit: { type: '"cover" | "contain"', default: '"cover"' },
    },
    code: `import { Image } from '@marcelinodzn/ds-react';

<Image 
  src="https://example.com/photo.jpg" 
  alt="Description"
  aspectRatio="16:9"
/>`,
    hasLivePreview: false,
  },

  Input: {
    name: 'Input',
    description: 'Single-line text input field',
    category: 'form',
    props: {
      value: { type: 'string', required: true },
      onChange: { type: '(value: string) => void', required: true },
      placeholder: { type: 'string' },
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      isDisabled: { type: 'boolean', default: 'false' },
      type: { type: '"text" | "email" | "password" | "number"', default: '"text"' },
    },
    code: `import { Input } from '@marcelinodzn/ds-react';

<Input 
  value={text}
  onChange={setText}
  placeholder="Enter text..."
  size="M"
/>`,
    hasLivePreview: true,
  },

  Label: {
    name: 'Label',
    description: 'Form field label text',
    category: 'typography',
    props: {
      size: { type: '"S" | "M"', default: '"M"' },
      isRequired: { type: 'boolean', default: 'false' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Label } from '@marcelinodzn/ds-react';

<Label size="M" isRequired>Email Address</Label>`,
    hasLivePreview: true,
  },

  ListItem: {
    name: 'ListItem',
    description: 'Single item in a list with optional icons and actions',
    category: 'layout',
    props: {
      title: { type: 'string', required: true },
      subtitle: { type: 'string' },
      leftElement: { type: 'ReactNode' },
      rightElement: { type: 'ReactNode' },
      onPress: { type: '() => void' },
    },
    code: `import { ListItem, Icon } from '@marcelinodzn/ds-react';

<ListItem 
  title="List Item"
  subtitle="Description text"
  leftElement={<Icon name="IcUser" />}
  onPress={() => {}}
/>`,
    hasLivePreview: true,
  },

  Logo: {
    name: 'Logo',
    description: 'Brand logo component with different variants',
    category: 'display',
    props: {
      variant: { type: '"full" | "icon"', default: '"full"' },
      size: { type: '"S" | "M" | "L"', default: '"M"' },
    },
    code: `import { Logo } from '@marcelinodzn/ds-react';

<Logo variant="full" size="M" />`,
    hasLivePreview: false,
  },

  Radio: {
    name: 'Radio',
    description: 'Radio button for single selection from options',
    category: 'form',
    props: {
      value: { type: 'string', required: true },
      label: { type: 'string' },
      isDisabled: { type: 'boolean', default: 'false' },
    },
    code: `import { RadioGroup, Radio } from '@marcelinodzn/ds-react';

<RadioGroup value={selected} onChange={setSelected}>
  <Radio value="option1" label="Option 1" />
  <Radio value="option2" label="Option 2" />
</RadioGroup>`,
    hasLivePreview: true,
  },

  SearchField: {
    name: 'SearchField',
    description: 'Search input with icon and clear button',
    category: 'form',
    props: {
      value: { type: 'string', required: true },
      onChange: { type: '(value: string) => void', required: true },
      placeholder: { type: 'string', default: '"Search..."' },
      onClear: { type: '() => void' },
    },
    code: `import { SearchField } from '@marcelinodzn/ds-react';

<SearchField 
  value={query}
  onChange={setQuery}
  placeholder="Search..."
  onClear={() => setQuery('')}
/>`,
    hasLivePreview: true,
  },

  Stepper: {
    name: 'Stepper',
    description: 'Step indicator for multi-step processes',
    category: 'navigation',
    props: {
      steps: { type: 'number', required: true },
      currentStep: { type: 'number', required: true },
      orientation: { type: '"horizontal" | "vertical"', default: '"horizontal"' },
    },
    code: `import { Stepper } from '@marcelinodzn/ds-react';

<Stepper steps={4} currentStep={2} orientation="horizontal" />`,
    hasLivePreview: true,
  },

  Switch: {
    name: 'Switch',
    description: 'Toggle switch for on/off states',
    category: 'form',
    props: {
      isSelected: { type: 'boolean', required: true },
      onChange: { type: '(isSelected: boolean) => void', required: true },
      isDisabled: { type: 'boolean', default: 'false' },
      label: { type: 'string' },
    },
    code: `import { Switch } from '@marcelinodzn/ds-react';

<Switch 
  isSelected={enabled}
  onChange={setEnabled}
  label="Enable notifications"
/>`,
    hasLivePreview: true,
  },

  Tabs: {
    name: 'Tabs',
    description: 'Tab navigation for switching between views',
    category: 'navigation',
    props: {
      selectedKey: { type: 'string', required: true },
      onSelectionChange: { type: '(key: string) => void', required: true },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Tabs, Tab } from '@marcelinodzn/ds-react';

<Tabs selectedKey={tab} onSelectionChange={setTab}>
  <Tab key="tab1" title="Tab 1">Content 1</Tab>
  <Tab key="tab2" title="Tab 2">Content 2</Tab>
</Tabs>`,
    hasLivePreview: true,
  },

  Text: {
    name: 'Text',
    description: 'Body text component with size variants',
    category: 'typography',
    props: {
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      weight: { type: '"regular" | "medium" | "semibold"', default: '"regular"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Text } from '@marcelinodzn/ds-react';

<Text size="M" weight="regular">
  Body text content goes here.
</Text>`,
    hasLivePreview: true,
  },

  TextArea: {
    name: 'TextArea',
    description: 'Multi-line text input field',
    category: 'form',
    props: {
      value: { type: 'string', required: true },
      onChange: { type: '(value: string) => void', required: true },
      placeholder: { type: 'string' },
      rows: { type: 'number', default: '3' },
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      isDisabled: { type: 'boolean', default: 'false' },
    },
    code: `import { TextArea } from '@marcelinodzn/ds-react';

<TextArea 
  value={text}
  onChange={setText}
  placeholder="Enter description..."
  rows={4}
  size="M"
/>`,
    hasLivePreview: true,
  },

  Title: {
    name: 'Title',
    description: 'Title text for cards and sections',
    category: 'typography',
    props: {
      size: { type: '"S" | "M" | "L"', default: '"M"' },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { Title } from '@marcelinodzn/ds-react';

<Title size="M">Card Title</Title>`,
    hasLivePreview: true,
  },

  Toast: {
    name: 'Toast',
    description: 'Temporary notification message',
    category: 'feedback',
    props: {
      variant: { type: '"info" | "success" | "warning" | "error"', default: '"info"' },
      message: { type: 'string', required: true },
      isVisible: { type: 'boolean', required: true },
      onDismiss: { type: '() => void' },
    },
    code: `import { Toast } from '@marcelinodzn/ds-react';

<Toast 
  variant="success"
  message="Action completed successfully"
  isVisible={showToast}
  onDismiss={() => setShowToast(false)}
/>`,
    hasLivePreview: false,
  },

  BottomNavigation: {
    name: 'BottomNavigation',
    description: 'Bottom tab bar for mobile navigation',
    category: 'navigation',
    props: {
      selectedKey: { type: 'string', required: true },
      onSelectionChange: { type: '(key: string) => void', required: true },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { BottomNavigation, BottomNavigationItem } from '@marcelinodzn/ds-react';

<BottomNavigation selectedKey={tab} onSelectionChange={setTab}>
  <BottomNavigationItem key="home" icon="IcHome" label="Home" />
  <BottomNavigationItem key="search" icon="IcSearch" label="Search" />
</BottomNavigation>`,
    hasLivePreview: false,
  },

  CarouselIndicator: {
    name: 'CarouselIndicator',
    description: 'Dot indicators for carousel/slider position',
    category: 'feedback',
    props: {
      total: { type: 'number', required: true },
      current: { type: 'number', required: true },
      size: { type: '"S" | "M"', default: '"M"' },
    },
    code: `import { CarouselIndicator } from '@marcelinodzn/ds-react';

<CarouselIndicator total={5} current={2} size="M" />`,
    hasLivePreview: true,
  },

  StructuredList: {
    name: 'StructuredList',
    description: 'Organized list with consistent structure',
    category: 'layout',
    props: {
      children: { type: 'ReactNode', required: true },
      dividers: { type: 'boolean', default: 'true' },
    },
    code: `import { StructuredList, ListItem } from '@marcelinodzn/ds-react';

<StructuredList>
  <ListItem title="Item 1" />
  <ListItem title="Item 2" />
</StructuredList>`,
    hasLivePreview: true,
  },

  SegmentedControl: {
    name: 'SegmentedControl',
    description: 'Segmented button group for view switching',
    category: 'layout',
    props: {
      selectedKey: { type: 'string', required: true },
      onSelectionChange: { type: '(key: string) => void', required: true },
      children: { type: 'ReactNode', required: true },
    },
    code: `import { SegmentedControl, Segment } from '@marcelinodzn/ds-react';

<SegmentedControl selectedKey={view} onSelectionChange={setView}>
  <Segment key="list">List</Segment>
  <Segment key="grid">Grid</Segment>
</SegmentedControl>`,
    hasLivePreview: true,
  },

  AccountsRail: {
    name: 'AccountsRail',
    description: 'Account switcher rail for multi-account apps',
    category: 'other',
    props: {
      accounts: { type: 'Account[]', required: true },
      selectedAccountId: { type: 'string', required: true },
      onSelectAccount: { type: '(id: string) => void', required: true },
    },
    code: `import { AccountsRail } from '@marcelinodzn/ds-react';

<AccountsRail 
  accounts={accounts}
  selectedAccountId={currentId}
  onSelectAccount={handleSelect}
/>`,
    hasLivePreview: false,
  },
};

// =============================================================================
// Component Categories
// =============================================================================

export const COMPONENT_CATEGORIES: Record<ComponentCategory, { label: string; components: ComponentName[] }> = {
  form: {
    label: 'Form',
    components: ['Button', 'Input', 'TextArea', 'Checkbox', 'Radio', 'Switch', 'SearchField'],
  },
  display: {
    label: 'Display',
    components: ['Avatar', 'Badge', 'Card', 'Chip', 'Image', 'Logo'],
  },
  typography: {
    label: 'Typography',
    components: ['Display', 'Headline', 'Title', 'Text', 'Label'],
  },
  navigation: {
    label: 'Navigation',
    components: ['HeaderNavigation', 'Tabs', 'BottomNavigation', 'Stepper'],
  },
  layout: {
    label: 'Layout',
    components: ['Divider', 'ListItem', 'StructuredList', 'SegmentedControl'],
  },
  feedback: {
    label: 'Feedback',
    components: ['Toast', 'CarouselIndicator'],
  },
  other: {
    label: 'Other',
    components: ['Icon', 'AccountsRail'],
  },
};

// =============================================================================
// Design Tokens
// =============================================================================

export const TOKEN_CATEGORIES = {
  colors: {
    label: 'Colors',
    description: 'Color tokens for backgrounds, text, and borders',
    tokens: [
      { id: 'background-ghost', name: 'Background Ghost', description: 'Lightest background, page level' },
      { id: 'background-subtle', name: 'Background Subtle', description: 'Medium background, cards' },
      { id: 'background-bold', name: 'Background Bold', description: 'Strongest background, emphasis' },
      { id: 'text-high', name: 'Text High', description: 'Primary text, headings' },
      { id: 'text-medium', name: 'Text Medium', description: 'Secondary text, body' },
      { id: 'text-low', name: 'Text Low', description: 'Tertiary text, hints' },
      { id: 'stroke-high', name: 'Stroke High', description: 'High emphasis borders' },
      { id: 'stroke-medium', name: 'Stroke Medium', description: 'Medium borders' },
      { id: 'stroke-low', name: 'Stroke Low', description: 'Subtle borders' },
      { id: 'accent', name: 'Accent', description: 'Brand/accent color' },
    ],
  },
  spacing: {
    label: 'Spacing',
    description: 'Spacing tokens for margins and padding',
    tokens: [
      { id: 'spacing-xs', name: 'XS', value: '4px', description: 'Extra small spacing' },
      { id: 'spacing-s', name: 'S', value: '8px', description: 'Small spacing' },
      { id: 'spacing-m', name: 'M', value: '16px', description: 'Medium spacing' },
      { id: 'spacing-l', name: 'L', value: '24px', description: 'Large spacing' },
      { id: 'spacing-xl', name: 'XL', value: '32px', description: 'Extra large spacing' },
    ],
  },
  borderRadius: {
    label: 'Border Radius',
    description: 'Corner radius tokens',
    tokens: [
      { id: 'radius-xs', name: 'XS', value: '4px', description: 'Extra small radius' },
      { id: 'radius-s', name: 'S', value: '8px', description: 'Small radius' },
      { id: 'radius-m', name: 'M', value: '12px', description: 'Medium radius' },
      { id: 'radius-l', name: 'L', value: '16px', description: 'Large radius' },
      { id: 'radius-full', name: 'Full', value: '9999px', description: 'Fully rounded' },
    ],
  },
  typography: {
    label: 'Typography',
    description: 'Typography size and weight tokens',
    tokens: [
      { id: 'font-size-xs', name: 'Font Size XS', value: '12px', description: 'Extra small text' },
      { id: 'font-size-s', name: 'Font Size S', value: '14px', description: 'Small text' },
      { id: 'font-size-m', name: 'Font Size M', value: '16px', description: 'Medium/body text' },
      { id: 'font-size-l', name: 'Font Size L', value: '20px', description: 'Large text' },
      { id: 'font-size-xl', name: 'Font Size XL', value: '24px', description: 'Extra large text' },
      { id: 'font-weight-regular', name: 'Weight Regular', value: '400', description: 'Regular weight' },
      { id: 'font-weight-medium', name: 'Weight Medium', value: '500', description: 'Medium weight' },
      { id: 'font-weight-semibold', name: 'Weight Semibold', value: '600', description: 'Semibold weight' },
    ],
  },
};

// =============================================================================
// Icon Library
// =============================================================================
// Comprehensive list of available icons from Jio Design System
// Browse icons in the Design System Library to see all available options

export const COMMON_ICONS = [
  // Navigation
  'IcHome', 'IcSearch', 'IcMenu', 'IcArrowLeft', 'IcArrowRight', 'IcArrowUp', 'IcArrowDown',
  'IcChevronLeft', 'IcChevronRight', 'IcChevronUp', 'IcChevronDown',
  'IcBack', 'IcForward', 'IcNext', 'IcPrevious',
  
  // Actions
  'IcPlus', 'IcMinus', 'IcClose', 'IcCheck', 'IcEdit', 'IcDelete', 'IcRefresh',
  'IcDownload', 'IcUpload', 'IcShare', 'IcCopy', 'IcSave', 'IcFilter',
  'IcMore', 'IcMoreVertical', 'IcMoreHorizontal', 'IcAdd', 'IcRemove',
  
  // User & Account
  'IcUser', 'IcUsers', 'IcSettings', 'IcProfile', 'IcLogout', 'IcLogin',
  'IcAccount', 'IcAvatar',
  
  // Communication
  'IcMail', 'IcPhone', 'IcChat', 'IcNotification', 'IcBell', 'IcMessage',
  'IcSend', 'IcReply', 'IcForward',
  
  // Media
  'IcPlay', 'IcPause', 'IcStop', 'IcMicrophone', 'IcSpeaker', 'IcVolume',
  'IcCamera', 'IcImage', 'IcVideo', 'IcMusic', 'IcHeadphones',
  
  // Status
  'IcInfo', 'IcWarning', 'IcError', 'IcSuccess', 'IcQuestion', 'IcAlert',
  'IcCheckCircle', 'IcXCircle', 'IcInfoCircle',
  
  // Objects
  'IcCalendar', 'IcClock', 'IcLocation', 'IcStar', 'IcHeart', 'IcBookmark',
  'IcDocument', 'IcFolder', 'IcLink', 'IcLock', 'IcUnlock', 'IcKey',
  'IcTag', 'IcLabel', 'IcFlag', 'IcPin',
  
  // Finance
  'IcWallet', 'IcCard', 'IcMoney', 'IcCurrency', 'IcBank', 'IcCurrencyRupee',
  'IcPayment', 'IcTransaction', 'IcReceipt',
  
  // Shopping & Commerce
  'IcCart', 'IcShoppingBag', 'IcShoppingCart', 'IcStore', 'IcGift',
  
  // Technology
  'IcWifi', 'IcBluetooth', 'IcBattery', 'IcSignal', 'IcCloud', 'IcCloudUpload',
  'IcCloudDownload', 'IcDatabase', 'IcServer',
  
  // Files & Documents
  'IcFile', 'IcFiles', 'IcArchive', 'IcZip', 'IcPdf', 'IcExcel', 'IcWord',
  
  // Social & Sharing
  'IcFacebook', 'IcTwitter', 'IcInstagram', 'IcLinkedIn', 'IcWhatsApp',
  'IcTelegram', 'IcYoutube',
  
  // UI Elements
  'IcGrid', 'IcList', 'IcLayout', 'IcColumns', 'IcRows', 'IcDrag',
  'IcResize', 'IcFullscreen', 'IcMinimize', 'IcMaximize',
  
  // Time & Date
  'IcTime', 'IcDate', 'IcSchedule', 'IcHistory', 'IcRecent',
  
  // Security
  'IcShield', 'IcSecurity', 'IcVerified', 'IcFingerprint', 'IcEye',
  'IcEyeOff', 'IcHide', 'IcShow',
  
  // Miscellaneous
  'IcHelp', 'IcSupport', 'IcFeedback', 'IcBug', 'IcCode', 'IcTerminal',
  'IcGlobe', 'IcLanguage', 'IcTranslate', 'IcAward', 'IcTrophy',
  'IcFire', 'IcTrending', 'IcChart', 'IcGraph', 'IcAnalytics',
];

// =============================================================================
// Patterns
// =============================================================================

export const PATTERNS = {
  forms: {
    label: 'Form Layouts',
    description: 'Common form patterns and layouts',
    examples: [
      { id: 'login-form', name: 'Login Form', description: 'Email/password login' },
      { id: 'signup-form', name: 'Signup Form', description: 'Registration form' },
      { id: 'search-filter', name: 'Search with Filters', description: 'Search bar with filter options' },
      { id: 'settings-form', name: 'Settings Form', description: 'App settings layout' },
    ],
  },
  cards: {
    label: 'Card Patterns',
    description: 'Common card layouts',
    examples: [
      { id: 'profile-card', name: 'Profile Card', description: 'User profile display' },
      { id: 'product-card', name: 'Product Card', description: 'E-commerce product' },
      { id: 'stats-card', name: 'Stats Card', description: 'Metrics display' },
      { id: 'action-card', name: 'Action Card', description: 'Card with CTA' },
    ],
  },
  navigation: {
    label: 'Navigation Patterns',
    description: 'Navigation and routing patterns',
    examples: [
      { id: 'tab-navigation', name: 'Tab Navigation', description: 'Horizontal tabs' },
      { id: 'sidebar', name: 'Sidebar Navigation', description: 'Vertical nav menu' },
      { id: 'breadcrumb', name: 'Breadcrumb', description: 'Path navigation' },
      { id: 'pagination', name: 'Pagination', description: 'Page navigation' },
    ],
  },
  lists: {
    label: 'List Patterns',
    description: 'Common list layouts',
    examples: [
      { id: 'settings-list', name: 'Settings List', description: 'Settings menu items' },
      { id: 'chat-list', name: 'Chat List', description: 'Conversation list' },
      { id: 'transaction-list', name: 'Transaction List', description: 'Financial history' },
      { id: 'notification-list', name: 'Notification List', description: 'Notification items' },
    ],
  },
};

// =============================================================================
// Density Options
// =============================================================================

export const DENSITY_OPTIONS = [
  { id: 'compact', name: 'Compact', description: 'Reduced spacing for dense UIs', multiplier: 0.75 },
  { id: 'default', name: 'Default', description: 'Standard spacing', multiplier: 1 },
  { id: 'open', name: 'Open', description: 'Increased spacing for readability', multiplier: 1.25 },
];

// =============================================================================
// Platform Options
// =============================================================================

export const PLATFORM_OPTIONS = [
  { id: 'desktop-1440', name: 'Desktop (1440)', width: 1440 },
  { id: 'desktop-1280', name: 'Desktop (1280)', width: 1280 },
  { id: 'tablet-768', name: 'Tablet (768)', width: 768 },
  { id: 'mobile-360', name: 'Mobile (360)', width: 360 },
  { id: 'mobile-320', name: 'Mobile (320)', width: 320 },
];

// =============================================================================
// External Links
// =============================================================================

export const EXTERNAL_LINKS = {
  storybook: 'https://jio-design-system.chromatic.com/',
  npm: 'https://www.npmjs.com/package/@marcelinodzn/ds-react',
  npmTokens: 'https://www.npmjs.com/package/@marcelinodzn/ds-tokens',
};

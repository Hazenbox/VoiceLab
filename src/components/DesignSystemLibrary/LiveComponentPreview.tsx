/**
 * Live Component Preview
 * 
 * Renders actual components from @marcelinodzn/ds-react with interactive examples
 */

import React, { useState } from 'react';
import { Button, TextArea, RadioGroup, Radio } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../../theme';
import type { ComponentName } from '../../data/designSystemData';

interface LiveComponentPreviewProps {
  componentName: ComponentName;
}

/**
 * Main component that renders live previews for all supported components
 */
export const LiveComponentPreview: React.FC<LiveComponentPreviewProps> = ({ componentName }) => {
  const theme = useThemeColors();
  const PreviewComponent = LIVE_PREVIEWS[componentName];

  if (!PreviewComponent) {
    return (
      <div
        className="p-6 rounded-lg text-center"
        style={{
          backgroundColor: theme.background.subtle,
          border: `2px dashed ${theme.stroke.low}`,
        }}
      >
        <p style={{ color: theme.text.medium }}>
          Live preview not available for {componentName}
        </p>
        <p className="text-sm mt-2" style={{ color: theme.text.low }}>
          Check the code example below for usage
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-lg"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <PreviewComponent />
    </div>
  );
};

// =============================================================================
// Individual Preview Components
// =============================================================================

const ButtonPreview: React.FC = () => {
  const theme = useThemeColors();
  
  return (
    <div className="space-y-6">
      {/* Sizes */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          Sizes
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="S" onPress={() => {}}>Small</Button>
          <Button size="M" onPress={() => {}}>Medium</Button>
          <Button size="L" onPress={() => {}}>Large</Button>
        </div>
      </div>

      {/* Appearances */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          Appearances
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <Button appearance="primary" size="M" onPress={() => {}}>Primary</Button>
          <Button appearance="secondary" size="M" onPress={() => {}}>Secondary</Button>
          <Button appearance="secondary" size="M" onPress={() => {}}>Ghost</Button>
        </div>
      </div>

      {/* States */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          States
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="M" onPress={() => {}}>Normal</Button>
          <Button size="M" isDisabled onPress={() => {}}>Disabled</Button>
        </div>
      </div>
    </div>
  );
};

const TextAreaPreview: React.FC = () => {
  const theme = useThemeColors();
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('This is pre-filled content that demonstrates how the TextArea handles existing text.');

  return (
    <div className="space-y-6">
      {/* Sizes */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          Sizes
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: theme.text.low }}>Small</p>
            <TextArea
              value={value1}
              onChange={setValue1}
              placeholder="Enter text..."
              rows={2}
              size="S"
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: theme.text.low }}>Medium</p>
            <TextArea
              value={value2}
              onChange={setValue2}
              placeholder="Enter text..."
              rows={3}
              size="M"
            />
          </div>
        </div>
      </div>

      {/* States */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          States
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: theme.text.low }}>Normal</p>
            <TextArea
              value=""
              onChange={() => {}}
              placeholder="Editable textarea..."
              rows={2}
              size="M"
            />
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: theme.text.low }}>Disabled</p>
            <TextArea
              value="Disabled content"
              onChange={() => {}}
              rows={2}
              size="M"
              isDisabled
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const RadioPreview: React.FC = () => {
  const theme = useThemeColors();
  const [selected, setSelected] = useState('option1');

  return (
    <div className="space-y-6">
      {/* Horizontal */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          Horizontal Layout
        </p>
        <RadioGroup
          name="demo-horizontal"
          value={selected}
          onChange={setSelected}
          orientation="horizontal"
          size="M"
          appearance="secondary"
        >
          <Radio value="option1" label="Option 1" />
          <Radio value="option2" label="Option 2" />
          <Radio value="option3" label="Option 3" />
        </RadioGroup>
      </div>

      {/* Vertical */}
      <div>
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
          Vertical Layout
        </p>
        <RadioGroup
          name="demo-vertical"
          value={selected}
          onChange={setSelected}
          orientation="vertical"
          size="M"
          appearance="secondary"
        >
          <Radio value="option1" label="First choice" />
          <Radio value="option2" label="Second choice" />
          <Radio value="option3" label="Third choice" />
        </RadioGroup>
      </div>
    </div>
  );
};

// Placeholder previews for components that need more complex setup
const PlaceholderPreview: React.FC<{ name: string; description: string }> = ({ name, description }) => {
  const theme = useThemeColors();
  
  return (
    <div className="text-center py-8">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <span className="text-2xl">📦</span>
      </div>
      <p className="font-medium" style={{ color: theme.text.high }}>{name}</p>
      <p className="text-sm mt-1" style={{ color: theme.text.low }}>{description}</p>
    </div>
  );
};

const AvatarPreview: React.FC = () => (
  <PlaceholderPreview 
    name="Avatar" 
    description="Displays user initials or profile image" 
  />
);

const BadgePreview: React.FC = () => (
  <PlaceholderPreview 
    name="Badge" 
    description="Status indicator or count display" 
  />
);

const CardPreview: React.FC = () => (
  <PlaceholderPreview 
    name="Card" 
    description="Container for grouping content" 
  />
);

const CheckboxPreview: React.FC = () => (
  <PlaceholderPreview 
    name="Checkbox" 
    description="Toggle control for boolean values" 
  />
);

const ChipPreview: React.FC = () => (
  <PlaceholderPreview 
    name="Chip" 
    description="Compact element for tags or filters" 
  />
);

const DisplayPreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Large</p>
        <p className="text-4xl font-bold" style={{ color: theme.text.high }}>Display Large</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Medium</p>
        <p className="text-3xl font-bold" style={{ color: theme.text.high }}>Display Medium</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Small</p>
        <p className="text-2xl font-bold" style={{ color: theme.text.high }}>Display Small</p>
      </div>
    </div>
  );
};

const DividerPreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <p style={{ color: theme.text.medium }}>Content above divider</p>
      <hr style={{ borderColor: theme.stroke.low }} />
      <p style={{ color: theme.text.medium }}>Content below divider</p>
    </div>
  );
};

const HeadlinePreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Large</p>
        <p className="text-2xl font-semibold" style={{ color: theme.text.high }}>Headline Large</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Medium</p>
        <p className="text-xl font-semibold" style={{ color: theme.text.high }}>Headline Medium</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Small</p>
        <p className="text-lg font-semibold" style={{ color: theme.text.high }}>Headline Small</p>
      </div>
    </div>
  );
};

const IconPreview: React.FC = () => {
  const theme = useThemeColors();
  const icons = ['🏠', '🔍', '⚙️', '👤', '📧', '📱', '🔔', '❤️', '⭐', '📁'];
  
  return (
    <div>
      <p className="text-sm font-medium mb-3" style={{ color: theme.text.medium }}>
        Icon Examples (placeholder icons)
      </p>
      <div className="flex flex-wrap gap-4">
        {icons.map((icon, i) => (
          <div
            key={i}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: theme.background.ghost }}
          >
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
};

const InputPreview: React.FC = () => {
  const theme = useThemeColors();
  const [value, setValue] = useState('');

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Normal</p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter text..."
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
            color: theme.text.high,
          }}
        />
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Disabled</p>
        <input
          type="text"
          value="Disabled input"
          disabled
          className="w-full px-3 py-2 rounded-lg text-sm opacity-50"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.low}`,
            color: theme.text.medium,
          }}
        />
      </div>
    </div>
  );
};

const LabelPreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium" style={{ color: theme.text.high }}>
          Regular Label
        </label>
      </div>
      <div>
        <label className="text-sm font-medium" style={{ color: theme.text.high }}>
          Required Label <span style={{ color: theme.accent }}>*</span>
        </label>
      </div>
    </div>
  );
};

const ListItemPreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-2">
      {['Settings', 'Profile', 'Notifications'].map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
          style={{ backgroundColor: theme.background.ghost }}
        >
          <span className="text-lg">📄</span>
          <div className="flex-1">
            <p className="font-medium" style={{ color: theme.text.high }}>{item}</p>
            <p className="text-xs" style={{ color: theme.text.low }}>Description text</p>
          </div>
          <span style={{ color: theme.text.low }}>›</span>
        </div>
      ))}
    </div>
  );
};

const SearchFieldPreview: React.FC = () => {
  const theme = useThemeColors();
  const [value, setValue] = useState('');

  return (
    <div className="max-w-md">
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: theme.text.low }}
        >
          🔍
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search..."
          className="w-full pl-10 pr-10 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
            color: theme.text.high,
          }}
        />
        {value && (
          <button
            onClick={() => setValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: theme.text.low }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

const StepperPreview: React.FC = () => {
  const theme = useThemeColors();
  const currentStep = 2;
  const totalSteps = 4;

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
            style={{
              backgroundColor: i < currentStep ? theme.accent : theme.background.ghost,
              color: i < currentStep ? '#fff' : theme.text.medium,
              border: `2px solid ${i <= currentStep ? theme.accent : theme.stroke.low}`,
            }}
          >
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div
              className="flex-1 h-1 rounded"
              style={{
                backgroundColor: i < currentStep - 1 ? theme.accent : theme.stroke.low,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const SwitchPreview: React.FC = () => {
  const theme = useThemeColors();
  const [enabled1, setEnabled1] = useState(true);
  const [enabled2, setEnabled2] = useState(false);

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className="w-12 h-6 rounded-full transition-colors relative"
      style={{
        backgroundColor: enabled ? theme.accent : theme.stroke.medium,
      }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
        style={{
          left: enabled ? '28px' : '4px',
        }}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span style={{ color: theme.text.high }}>Notifications</span>
        <ToggleSwitch enabled={enabled1} onChange={setEnabled1} />
      </div>
      <div className="flex items-center justify-between">
        <span style={{ color: theme.text.high }}>Dark Mode</span>
        <ToggleSwitch enabled={enabled2} onChange={setEnabled2} />
      </div>
    </div>
  );
};

const TabsPreview: React.FC = () => {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState('tab1');
  const tabs = [
    { id: 'tab1', label: 'Overview' },
    { id: 'tab2', label: 'Details' },
    { id: 'tab3', label: 'Settings' },
  ];

  return (
    <div>
      <div className="flex border-b" style={{ borderColor: theme.stroke.low }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.id ? theme.accent : theme.text.medium,
              borderBottom: activeTab === tab.id ? `2px solid ${theme.accent}` : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4" style={{ color: theme.text.medium }}>
        Content for {tabs.find(t => t.id === activeTab)?.label}
      </div>
    </div>
  );
};

const TextPreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Large</p>
        <p className="text-lg" style={{ color: theme.text.high }}>
          This is large body text for important content.
        </p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Medium</p>
        <p className="text-base" style={{ color: theme.text.high }}>
          This is medium body text for regular content.
        </p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Small</p>
        <p className="text-sm" style={{ color: theme.text.high }}>
          This is small body text for secondary content.
        </p>
      </div>
    </div>
  );
};

const TitlePreview: React.FC = () => {
  const theme = useThemeColors();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Large</p>
        <p className="text-xl font-semibold" style={{ color: theme.text.high }}>Title Large</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Medium</p>
        <p className="text-lg font-semibold" style={{ color: theme.text.high }}>Title Medium</p>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: theme.text.low }}>Small</p>
        <p className="text-base font-semibold" style={{ color: theme.text.high }}>Title Small</p>
      </div>
    </div>
  );
};

const CarouselIndicatorPreview: React.FC = () => {
  const theme = useThemeColors();
  const [current, setCurrent] = useState(2);
  const total = 5;

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: i === current ? theme.accent : theme.stroke.medium,
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm" style={{ color: theme.text.low }}>
        {current + 1} of {total}
      </p>
    </div>
  );
};

const StructuredListPreview: React.FC = () => {
  const theme = useThemeColors();
  const items = [
    { title: 'Account', value: 'john@example.com' },
    { title: 'Plan', value: 'Premium' },
    { title: 'Status', value: 'Active' },
  ];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${theme.stroke.low}` }}
    >
      {items.map((item, i) => (
        <div
          key={item.title}
          className="flex justify-between px-4 py-3"
          style={{
            backgroundColor: theme.background.ghost,
            borderTop: i > 0 ? `1px solid ${theme.stroke.low}` : undefined,
          }}
        >
          <span style={{ color: theme.text.medium }}>{item.title}</span>
          <span style={{ color: theme.text.high }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const SegmentedControlPreview: React.FC = () => {
  const theme = useThemeColors();
  const [selected, setSelected] = useState('list');
  const options = ['list', 'grid', 'card'];

  return (
    <div
      className="inline-flex rounded-lg p-1"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => setSelected(option)}
          className="px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize"
          style={{
            backgroundColor: selected === option ? theme.background.subtle : 'transparent',
            color: selected === option ? theme.text.high : theme.text.medium,
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// Preview Registry
// =============================================================================

const LIVE_PREVIEWS: Partial<Record<ComponentName, React.FC>> = {
  Avatar: AvatarPreview,
  Badge: BadgePreview,
  Button: ButtonPreview,
  Card: CardPreview,
  Checkbox: CheckboxPreview,
  Chip: ChipPreview,
  Display: DisplayPreview,
  Divider: DividerPreview,
  Headline: HeadlinePreview,
  Icon: IconPreview,
  Input: InputPreview,
  Label: LabelPreview,
  ListItem: ListItemPreview,
  Radio: RadioPreview,
  SearchField: SearchFieldPreview,
  Stepper: StepperPreview,
  Switch: SwitchPreview,
  Tabs: TabsPreview,
  Text: TextPreview,
  TextArea: TextAreaPreview,
  Title: TitlePreview,
  CarouselIndicator: CarouselIndicatorPreview,
  StructuredList: StructuredListPreview,
  SegmentedControl: SegmentedControlPreview,
};

export default LiveComponentPreview;

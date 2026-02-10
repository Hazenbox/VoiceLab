# Icon Migration Mapping

This document tracks the migration from inline SVG icons to Jio Design System (DS) icons using the `DSIcon` wrapper component.

## Migration Status: COMPLETE

**Total Components Migrated**: 35+ components
**Remaining SVGs**: 2 (intentionally kept - diagram elements, not icons)

## DSIcon Wrapper

All DS icons are now accessed through the `DSIcon` wrapper component located at `src/components/DSIcon.tsx`. This provides a consistent interface for icon usage across the application.

```tsx
import { DSIcon } from './DSIcon';

// Usage
<DSIcon name="IcArrowBack" size="S" attention="medium" />
```

### Props
- `name`: Icon name from the DS library (e.g., "IcArrowBack", "IcSearch")
- `size`: "XS" | "S" | "M" | "L" | "XL" (default: "S")
- `attention`: "high" | "medium" | "low" (default: "medium")

## Migrated Components

### Navigation & Layout
| Component | Icons Replaced |
|-----------|----------------|
| `ProjectSidebar.tsx` | IcMoreVertical, IcEdit, IcLayout, IcMoonFull, IcSunnyClear, IcAdd, IcLightbulb, IcArrowBack, IcLogout |
| `AdminSidebar.tsx` | IcHome, IcAnalytics, IcDatabase, IcLibrary, IcUser, IcSettings, IcArrowBack, IcLogout |
| `ModeToggle.tsx` | IcDocument, IcMic, IcChevronDown |
| `ConfigPanel.tsx` | IcChevronLeft, IcChevronRight |
| `DesignSystemLibrary.tsx` | IcArrowBack |
| `DesignSystemLibrary/Sidebar.tsx` | IcChevronRight, IcSearch |

### Form Components
| Component | Icons Replaced |
|-----------|----------------|
| `Toggle.tsx` | IcInfo |
| `VoiceSelector.tsx` | IcInfo |
| `Slider.tsx` | IcInfo |
| `LabeledSlider.tsx` | IcInfo |
| `CustomSelect.tsx` | IcChevronDown |
| `Dropdown.tsx` | IcChevronDown |
| `SearchableDropdown.tsx` | IcChevronDown, IcSearch, IcClose, IcCheck |
| `SearchableCombobox.tsx` | IcChevronDown |
| `ModelSelector.tsx` | IcChevronDown, IcCheck |

### Chat & Communication
| Component | Icons Replaced |
|-----------|----------------|
| `ChatPanel.tsx` | IcMic, IcStop, IcArrowUp |
| `MessageFeedback.tsx` | IcThumbUp, IcThumbDown, IcEdit, IcChat, IcBookmark, IcCheck, IcClose |
| `StatusIndicator.tsx` | IcCircle, IcRefresh, IcMic, IcVolumeUp, IcWarning |

### Audio & Media
| Component | Icons Replaced |
|-----------|----------------|
| `AudioPlayer.tsx` | IcPlayArrow, IcPause, IcRefresh |
| `AudioBubble.tsx` | IcPlayArrow, IcPause, IcRefresh, IcWarning, IcSave |

### Documentation & Settings
| Component | Icons Replaced |
|-----------|----------------|
| `DocumentationPanel.tsx` | IcArrowBack, IcSearch |
| `AdvancedSettingsPanel.tsx` | IcMic, IcFolder, IcShield, IcChat, IcClose |
| `OnboardingModal.tsx` | IcClose |
| `HowItWorksPage.tsx` | 22+ icons including IcUser, IcApartment, IcSettings, IcDocument, IcChat, etc. |

### Selectors
| Component | Icons Replaced |
|-----------|----------------|
| `TTSProviderSelector.tsx` | IcVolumeUp, IcChevronDown |
| `PlatformSelector.tsx` | IcNotification, IcImage, IcVolumeUp, IcChevronDown |
| `ChannelSelector.tsx` | IcChat, IcWhatsapp, IcMail, IcChevronDown |

### Content Trust
| Component | Icons Replaced |
|-----------|----------------|
| `TrustBadge.tsx` | IcShield, IcCopy, IcCheck |
| `TrustContextPanel.tsx` | IcInfo, IcWarning, IcSearch, IcShield, IcCheck, IcCircle, IcClose, IcStar |
| `ContentContextSelector.tsx` | IcWarmth, IcDocument |

### Code & Documentation
| Component | Icons Replaced |
|-----------|----------------|
| `CodeBlock.tsx` | IcCheck, IcCopy |
| `Accordion.tsx` | IcChevronDown |
| `TooltipIcon.tsx` | IcInfo |

### Usage Dashboard
| Component | Icons Replaced |
|-----------|----------------|
| `UsageDashboard.tsx` | IcMoneyRupee, IcChat, IcBolt, IcCheckCircle, IcInfo |

### Error Handling
| Component | Icons Replaced |
|-----------|----------------|
| `ErrorBoundary.tsx` | IcWarning, IcInfo |

### Design System Library Patterns
| Component | Icons Replaced |
|-----------|----------------|
| `PatternPreview.tsx` | IcRocket, IcUser, IcNotification, IcLock, IcPalette |
| `Preview.tsx` | IcLibrary |

### Tailwind Components
| Component | Icons Replaced |
|-----------|----------------|
| `TwConfigPanel.tsx` | IcChevronLeft, IcChevronRight, IcLayout, IcMoonFull, IcSunnyClear |
| `TwDocumentationPanel.tsx` | IcArrowBack, IcSearch |
| `TwCustomSelect.tsx` | IcChevronDown |
| `TwAudioPlayer.tsx` | IcPlayArrow, IcPause, IcRefresh |
| `TwChatPanel.tsx` | IcMic, IcArrowUp |

## Intentionally Kept SVGs

The following SVG elements are NOT icons and should remain as inline SVGs:

1. **`HowItWorksPage.tsx`** - Contains a large SVG diagram showing the trust score calculation flow with agent nodes, arrows, and decorative elements. This is a visualization, not an icon.

2. **`FlowDiagram/index.tsx`** - Contains the `FlowCanvas` component which is an SVG container for drawing flow diagrams programmatically.

## Common Icon Mappings

| Use Case | DS Icon Name |
|----------|--------------|
| Back navigation | IcArrowBack |
| Close/Dismiss | IcClose |
| Search | IcSearch |
| Dropdown arrow | IcChevronDown |
| Expand arrow | IcChevronRight |
| Play button | IcPlayArrow |
| Pause button | IcPause |
| Refresh/Restart | IcRefresh |
| Settings/Config | IcSettings |
| Info tooltip | IcInfo |
| Warning/Error | IcWarning |
| Success/Check | IcCheck, IcCheckCircle |
| Edit | IcEdit |
| Copy | IcCopy |
| Save | IcSave |
| Home | IcHome |
| User/Profile | IcUser |
| Microphone | IcMic |
| Volume/Audio | IcVolumeUp |
| Theme (light) | IcSunnyClear |
| Theme (dark) | IcMoonFull |

## Migration Complete

All functional UI icons have been migrated to the Jio Design System. The migration maintains:
- Consistent icon styling across the application
- Proper attention levels for different contexts
- Responsive sizing through the size prop
- Accessibility through proper ARIA labels on parent buttons/elements

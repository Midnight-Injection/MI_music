# Settings System Documentation

## Overview

The Jiyu Music settings system provides a comprehensive configuration interface for all application settings. It includes a tabbed UI, search functionality, import/export capabilities, and persistent storage.

## Architecture

### Components

#### 1. SettingItem.vue
Individual setting control component that supports various input types:
- **checkbox**: Boolean toggles
- **select**: Dropdown selections
- **range**: Numeric sliders with min/max/step
- **text**: Text input fields
- **number**: Numeric input fields
- **color**: Color picker with hex input
- **color-palette**: Predefined color swatches
- **path**: File/folder path selection with browse button

**Props:**
- `label`: Setting label text
- `description`: Optional help text
- `type`: Input type (see above)
- `modelValue`: Current value (v-model)
- `disabled`: Disable the control
- `options`: Options for select/palette types
- `placeholder`: Input placeholder text
- `min/max/step`: Range constraints
- `suffix`: Display suffix for range values
- `visible`: Show/hide the setting

#### 2. SettingGroup.vue
Groups related settings together with a title and description.

**Props:**
- `title`: Group title
- `description`: Optional group description
- `visible`: Show/hide the group
- `searchQuery`: Filter group visibility by search

#### 3. SettingSection.vue
Wraps settings for a specific tab/section with search filtering.

**Props:**
- `searchQuery`: Search filter text
- `sectionKeywords`: Keywords for search matching

### Store

#### Settings Store (`src/store/settings.ts`)

**State:**
- `settings`: Current settings object

**Actions:**
- `updateSetting(key, value)`: Update a single setting
- `updateSettings(updates)`: Update multiple settings
- `resetSettings()`: Reset all to defaults
- `loadSettings(saved)`: Load saved settings

**Default Settings:**
```typescript
{
  // General
  language: 'zh-CN',
  windowSize: 'medium',
  fontSize: 14,
  animation: true,
  controlPosition: 'left',

  // Player
  startupAutoPlay: false,
  defaultPlayMode: 'loop',
  audioQuality: 'standard',
  volume: 0.8,
  autoSkipOnError: true,

  // Lyrics
  lyricShow: true,
  showTranslation: false,
  showRomanization: false,
  lyricFontSize: 16,
  lyricPosition: 'center',

  // Download
  downloadEnabled: true,
  downloadPath: '',
  fileNaming: '{artist} - {title}',
  maxDownloads: 3,
  downloadLyrics: true,

  // Theme
  themeType: 'green',
  theme: 'auto',
  customColor: '#1db954',

  // Network
  proxyEnabled: false,
  proxyHost: '',
  proxyPort: 8080,

  // Sync
  syncMode: 'disabled',
  syncPort: 9527,
  syncHost: 'localhost'
}
```

## Usage

### Adding a New Setting

1. **Update Type Definition** (`src/types/settings.ts`):
```typescript
export interface Settings {
  // Add your new setting
  myNewSetting: string
}
```

2. **Update Default Value** (`src/store/settings.ts`):
```typescript
const DEFAULT_SETTINGS: Settings = {
  // ...existing settings
  myNewSetting: 'default-value'
}
```

3. **Add to UI** (`src/views/Setting.vue`):
```vue
<SettingItem
  label="My New Setting"
  type="text"
  v-model="settingsStore.settings.myNewSetting"
  description="Description of what this does"
/>
```

### Creating a New Settings Tab

1. **Add Tab Definition** in `Setting.vue`:
```typescript
const tabs = [
  // ...existing tabs
  { key: 'mytab', label: 'My Tab', icon: 'MyIcon' }
]
```

2. **Add Section** in template:
```vue
<SettingSection v-show="activeTab === 'mytab'" :search-query="searchQuery">
  <SettingGroup title="My Group">
    <!-- Your settings here -->
  </SettingGroup>
</SettingSection>
```

## Features

### Search/Filter
- Real-time search across all settings
- Matches against labels, descriptions, and keywords
- Section-level filtering for quick navigation

### Import/Export
- **Export**: Save all settings to JSON file with timestamp
- **Import**: Load settings from JSON file
- Validation ensures only valid settings are imported

### Auto-Save
- Settings automatically saved to localStorage on change
- Persistent across application restarts
- No manual save required

### Theme System
- **Theme Type**: Predefined color schemes (green, blue, black, purple, orange, pink)
- **Theme Mode**: Light, dark, or auto (follows system preference)
- **Custom Color**: User-defined primary color
- Changes applied immediately via CSS variables

### Tauri Integration
- **Path Selection**: Native file/folder picker for download paths
- **File I/O**: Read/write settings files using Tauri FS plugin
- **Dialogs**: Native dialogs for import/export operations

## Testing

Run settings tests:
```bash
npm test tests/unit/settings.spec.ts
```

## Browser Compatibility

- Modern browsers with CSS variable support
- Tauri desktop integration
- Responsive design (mobile/tablet/desktop)

## Future Enhancements

- [ ] Settings sync via Tauri backend
- [ ] Cloud backup integration
- [ ] Settings profiles (work, home, etc.)
- [ ] Keyboard shortcuts configuration
- [ ] Advanced user customization

import { useEffect } from 'react';
import { Switch } from 'react-aria-components';
import { Contrast, Eye, MousePointer2 } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import './AccessibilitySettings.css';

interface AccessibilitySettingsState {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettingsState = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
};

export function AccessibilitySettings() {
  const [settings, setSettings] = useLocalStorage<AccessibilitySettingsState>(
    'otrd_accessibility_settings_v1',
    DEFAULT_SETTINGS
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.a11yContrast = settings.highContrast ? 'high' : 'default';
    root.dataset.a11yText = settings.largeText ? 'large' : 'default';
    root.dataset.a11yMotion = settings.reduceMotion ? 'reduced' : 'default';
  }, [settings]);

  function updateSetting(key: keyof AccessibilitySettingsState, value: boolean) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return (
    <section className="a11y-settings" aria-labelledby="a11y-settings-title">
      <div className="a11y-settings-title" id="a11y-settings-title">
        <Eye aria-hidden="true" />
        Accessibility
      </div>
      <div className="a11y-settings-list">
        <Switch
          className="a11y-switch"
          isSelected={settings.highContrast}
          onChange={value => updateSetting('highContrast', value)}
        >
          <span className="a11y-switch-copy">
            <span className="a11y-switch-label"><Contrast aria-hidden="true" /> High contrast</span>
            <span className="a11y-switch-help">Strengthens borders, foreground text, and selected states.</span>
          </span>
          <span className="a11y-switch-control" aria-hidden="true">
            <span className="a11y-switch-thumb" />
          </span>
        </Switch>

        <Switch
          className="a11y-switch"
          isSelected={settings.largeText}
          onChange={value => updateSetting('largeText', value)}
        >
          <span className="a11y-switch-copy">
            <span className="a11y-switch-label"><Eye aria-hidden="true" /> Larger text</span>
            <span className="a11y-switch-help">Increases base reading and control text size.</span>
          </span>
          <span className="a11y-switch-control" aria-hidden="true">
            <span className="a11y-switch-thumb" />
          </span>
        </Switch>

        <Switch
          className="a11y-switch"
          isSelected={settings.reduceMotion}
          onChange={value => updateSetting('reduceMotion', value)}
        >
          <span className="a11y-switch-copy">
            <span className="a11y-switch-label"><MousePointer2 aria-hidden="true" /> Reduce motion</span>
            <span className="a11y-switch-help">Minimizes movement even when the system setting is off.</span>
          </span>
          <span className="a11y-switch-control" aria-hidden="true">
            <span className="a11y-switch-thumb" />
          </span>
        </Switch>
      </div>
    </section>
  );
}

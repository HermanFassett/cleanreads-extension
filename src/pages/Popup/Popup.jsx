import React from 'react';
import './Popup.css';
import 'react-toggle/style.css';
import Toggle from 'react-toggle';
import { useSettings } from '../Common/cleanreads';

const Popup = () => {
  const [settings, setSettings] = useSettings();

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cleanreads</h1>
        <Toggle
            defaultChecked={settings.ENABLED}
            icons={false}
            checked={settings.ENABLED}
            onChange={(e) => setSettings({...settings, 'ENABLED': e.target.checked })} />
        <p>Runs on goodreads.com</p>
        <a className="App-link" href="#" onClick={() => chrome.runtime.openOptionsPage()}>Cleanreads Settings</a>
      </header>
    </div>
  );
};

export default Popup;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { createMediaPipeRecognition } from './services/mediaPipeRecognition';
import { BrowserTrainingEngine } from './services/browserTrainingEngine';
import { installRuntime } from './services/runtime';
import './theme/tokens.css';
import './theme/global.css';

const mediaPipe = createMediaPipeRecognition();
installRuntime({
  recognition: mediaPipe.recognition,
  createEngine: onComplete => new BrowserTrainingEngine(mediaPipe.recognition, onComplete),
  subscribeAura: mediaPipe.subscribeAura,
  preparationPolicy: { calibrationStableMs: 600, poseStableMs: 2000 },
});

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

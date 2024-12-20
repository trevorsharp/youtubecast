import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Counter from './Counter';

createRoot(document.getElementById('root') ?? document.createElement('div')).render(
  <StrictMode>
    <div>Hello World!</div>
    <Counter />
  </StrictMode>
);

// Dev server only (npm run dev): mounts the demo the same way a host page would.
import { mount } from './embed';

mount(document.getElementById('root')!, { intSmsFactor: 3, demo: true });

import { main as adaptMain } from './adapt-resume.mjs';

await adaptMain(process.argv.slice(2));
console.log('Version build complete. Run npm run resume:pdf after Task 5 adds PDF rendering.');

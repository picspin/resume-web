import { main as adaptMain } from './adapt-resume.mjs';

await adaptMain(process.argv.slice(2));
console.log('Version build complete. Run npm run resume:pdf -- --slug <slug> to render the printable PDF.');

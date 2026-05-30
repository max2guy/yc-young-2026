import { readFileSync, writeFileSync } from 'node:fs';

const sourceSports = '/Users/kimwoojung/Downloads/체육대회_회의자료.html';
const sourceCamp = '/Users/kimwoojung/Downloads/2026_camp_comparison.html';

const firebaseScripts = `
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js"></script>
<script src="sync-config.js"></script>
<script src="sports-sync.js"></script>
`;

let sports = readFileSync(sourceSports, 'utf8');
if (!sports.includes('sports-sync.js')) {
  sports = sports.replace('</body>', `${firebaseScripts}</body>`);
}

writeFileSync(new URL('./sports-meeting.html', import.meta.url), sports);
writeFileSync(new URL('./camp-comparison.html', import.meta.url), readFileSync(sourceCamp, 'utf8'));

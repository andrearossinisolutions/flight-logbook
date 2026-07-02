const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../lib/changelog.json');

try {
  // 1. Get all commits: hash, date, subject
  const commitsRaw = execSync('git log --pretty=format:"%H|%as|%s" --no-merges', { encoding: 'utf8' });
  const commits = commitsRaw.split('\n').filter(Boolean).map(line => {
    const [hash, date, subject] = line.split('|');
    return { hash, date, subject };
  }).reverse(); // chronologically: oldest first

  // 2. Get version changes from package.json
  const diffRaw = execSync('git log -U0 -p package.json', { encoding: 'utf8' });
  const versionChanges = {}; // hash -> version

  const diffLines = diffRaw.split('\n');
  let currentCommit = null;
  for (const line of diffLines) {
    if (line.startsWith('commit ')) {
      currentCommit = line.split(' ')[1].trim();
    } else if (line.startsWith('+') && line.includes('"version":')) {
      const match = line.match(/"version":\s*"([^"]+)"/);
      if (match && currentCommit) {
        versionChanges[currentCommit] = match[1];
      }
    }
  }

  // 3. Map commits to versions
  const changelog = {};
  let currentVersion = '0.1.0';

  for (const commit of commits) {
    if (versionChanges[commit.hash]) {
      currentVersion = versionChanges[commit.hash];
    }
    
    if (!changelog[currentVersion]) {
      changelog[currentVersion] = {
        version: currentVersion,
        date: commit.date,
        commits: []
      };
    }
    
    changelog[currentVersion].date = commit.date;
    
    const lowerSubject = commit.subject.toLowerCase();
    const isVersionBumpMsg = lowerSubject.includes('incremented version') || 
                             lowerSubject.includes('increased version') || 
                             lowerSubject.includes('fixed version') || 
                             lowerSubject.includes('version bump') ||
                             lowerSubject.includes('bump version') ||
                             lowerSubject.startsWith('publish') ||
                             lowerSubject === 'init' ||
                             lowerSubject === 'release';
                             
    if (!isVersionBumpMsg) {
      changelog[currentVersion].commits.push({
        hash: commit.hash.substring(0, 7),
        date: commit.date,
        subject: commit.subject
      });
    }
  }

  // Convert to array and reverse to have newest version first
  const result = Object.values(changelog)
    .filter(v => v.commits.length > 0)
    .reverse();

  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2));
  console.log('Changelog generated successfully at ' + targetPath + '! Total versions:', result.length);
} catch (error) {
  console.error('Error generating changelog:', error);
  process.exit(1);
}

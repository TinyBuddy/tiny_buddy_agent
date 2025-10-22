const fs = require('fs');
const content = fs.readFileSync('/Users/harold/webdev/tmp-test/tiny_buddy_agent/file_server/index.html', 'utf8');
const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if (scriptMatch) {
  try {
    new Function(scriptMatch[1]);
    console.log('JavaScript syntax is valid');
  } catch (e) {
    console.error('JavaScript syntax error:', e.message);
    process.exit(1);
  }
} else {
  console.log('No script tag found');
}
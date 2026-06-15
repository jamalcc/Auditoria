const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Background and borders of panels
  content = content.replace(/className="([^"]*\bbg-white\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:bg-slate-800') && !classes.includes('dark:bg-slate-900')) {
      return `className="${classes.replace('bg-white', 'bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700')}"`;
    }
    return match;
  });

  // Slate-50 background bars -> slate-800/50
  content = content.replace(/className="([^"]*\bbg-slate-50\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:bg-slate-900')) {
      return `className="${classes.replace('bg-slate-50', 'bg-slate-50 dark:bg-slate-900/50')}"`;
    }
    return match;
  });
  
  content = content.replace(/className="([^"]*\bbg-slate-50\/50\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:bg-slate-900/50')) {
      return `className="${classes.replace('bg-slate-50/50', 'bg-slate-50/50 dark:bg-slate-900/50')}"`;
    }
    return match;
  });

  // text-slate-800 -> dark:text-white
  content = content.replace(/className="([^"]*\btext-slate-800\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:text-white')) {
      return `className="${classes.replace('text-slate-800', 'text-slate-800 dark:text-white')}"`;
    }
    return match;
  });

  // text-slate-700 -> dark:text-slate-300
  content = content.replace(/className="([^"]*\btext-slate-700\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:text-slate-300')) {
      return `className="${classes.replace('text-slate-700', 'text-slate-700 dark:text-slate-300')}"`;
    }
    return match;
  });

  content = content.replace(/className="([^"]*\btext-slate-600\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:text-slate-400')) {
      return `className="${classes.replace('text-slate-600', 'text-slate-600 dark:text-slate-400')}"`;
    }
    return match;
  });

  // text-slate-500 -> dark:text-slate-400
  content = content.replace(/className="([^"]*\btext-slate-500\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:text-slate-400')) {
      return `className="${classes.replace('text-slate-500', 'text-slate-500 dark:text-slate-400')}"`;
    }
    return match;
  });

  // border-slate-100 -> dark:border-slate-700
  content = content.replace(/className="([^"]*\bborder-slate-100\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:border-slate-700')) {
      return `className="${classes.replace('border-slate-100', 'border-slate-100 dark:border-slate-700')}"`;
    }
    return match;
  });
  
  // border-slate-200 -> dark:border-slate-700
  content = content.replace(/className="([^"]*\bborder-slate-200\b[^"]*)"/g, (match, classes) => {
    if (!classes.includes('dark:border-slate-700')) {
      return `className="${classes.replace('border-slate-200', 'border-slate-200 dark:border-slate-700')}"`;
    }
    return match;
  });

  fs.writeFileSync(filePath, content, 'utf-8');
}

processFile('./src/components/AdminPanel.tsx');
processFile('./src/components/ClientWizard.tsx');
processFile('./src/components/LegalReport.tsx');
processFile('./src/App.tsx');
console.log('Processed dark mode classes');

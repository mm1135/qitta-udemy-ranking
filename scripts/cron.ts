import cron from 'node-cron';
import { exec } from 'child_process';

// 毎日午前3時に実行
cron.schedule('0 3 * * *', () => {
  console.log('Running data collection...');
  
  exec('npm run collect-data', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
  });
});

console.log('Cron job scheduled. Press Ctrl+C to exit.'); 
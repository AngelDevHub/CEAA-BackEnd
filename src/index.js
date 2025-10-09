import app from './app.js';
import { PORT } from './config.js';
import chalk from 'chalk';

app.listen(PORT, () => {
  console.log(chalk.blueBright('==========================================='));
  console.log(chalk.greenBright('🚀  Server is running!'));
  console.log(chalk.yellowBright(`📌  Listening on port: ${PORT}`));
  console.log(chalk.cyanBright(`🌐  http://localhost:${PORT}`));
  console.log(chalk.blueBright('==========================================='));
});

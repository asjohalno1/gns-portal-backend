const cron = require("node-cron");


function scheduleDailyReminder(callback) {
  // "0 10 * * *" means every day at 10:00 AM UTC
  cron.schedule("0 10 * * *", () => {
    console.log(`[Reminder] Triggered at ${new Date().toISOString()}`);
    callback();
  });

  console.log("✅ Daily reminder scheduled at 10:00 AM UTC");
}

module.exports = scheduleDailyReminder;



function createCronExpression(time, days) {
    const [hourStr, minuteStr] = time.split(":");
    const minute = parseInt(minuteStr, 10);
    const hour = parseInt(hourStr, 10);

    const dayMap = {
        "Sun": 0,
        "Mon": 1,
        "Tue": 2,
        "Wed": 3,
        "Thu": 4,
        "Fri": 5,
        "Sat": 6
    };

    const cronDays = days.map(day => {
        if (typeof day === 'string') {
            const normalizedDay = day.slice(0, 3); // handle "Tuesday" -> "Tue"
            return dayMap[normalizedDay] ?? '';
        }
        if (typeof day === 'number' && day >= 0 && day <= 6) {
            return day;
        }
        return '';
    }).filter(day => day !== '').sort(); // Clean and sort

    if (isNaN(minute) || isNaN(hour) || cronDays.length === 0) {
        throw new Error("Invalid time or days input");
    }

    return `${minute} ${hour} * * ${cronDays.join(',')}`;
}

// Example usage
// const time = "15:25";
// const days = ["Tue", 1, "Wed"];
// const cronExpression = createCronExpression(time, days);
// console.log("Generated Cron Expression:", cronExpression); 

module.exports = createCronExpression;



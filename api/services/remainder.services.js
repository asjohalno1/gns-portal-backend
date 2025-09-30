

function createCronExpression(time, days = [], frequency = "Daily") {
    const [hourStr, minuteStr] = time.split(":");
    const minute = parseInt(minuteStr, 10);
    const hour = parseInt(hourStr, 10);

    if (isNaN(minute) || isNaN(hour)) {
        throw new Error("Invalid time format");
    }


    if (frequency === "Daily") {
        return `${minute} ${hour} * * *`;
    }


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
            const normalizedDay = day.slice(0, 3);
            return dayMap[normalizedDay] ?? '';
        }
        if (typeof day === 'number' && day >= 0 && day <= 6) {
            return day;
        }
        return '';
    }).filter(day => day !== '').sort();

    if (frequency === "Weekly" && cronDays.length === 0) {
        throw new Error("At least one valid day is required for Weekly frequency");
    }

    return `${minute} ${hour} * * ${cronDays.join(',')}`;
}


module.exports = createCronExpression;



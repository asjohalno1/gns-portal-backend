

function createCronExpression(time, days = [], frequency = "Daily") {
    const [hourStr, minuteStr] = time.split(":");
    const minute = parseInt(minuteStr, 10);
    const hour = parseInt(hourStr, 10);

    if (isNaN(minute) || isNaN(hour)) {
        throw new Error("Invalid time format. Expected HH:mm");
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

    const cronDays = days
        .map(day => {
            if (typeof day === "string") {
                const normalizedDay = day.slice(0, 3); // normalize "Wednesday" → "Wed"
                return dayMap[normalizedDay] ?? "";
            }
            if (typeof day === "number" && day >= 0 && day <= 6) {
                return day;
            }
            return "";
        })
        .filter(day => day !== "")
        .sort((a, b) => a - b); // ensure order

    // Daily frequency
    if (frequency === "Daily") {
        if (cronDays.length > 0) {
            // Run at given time but only on selected days
            return `${minute} ${hour} * * ${cronDays.join(",")}`;
        }
        // Run at given time every day
        return `${minute} ${hour} * * *`;
    }

    // Weekly frequency
    if (frequency === "Weekly") {
        if (cronDays.length === 0) {
            throw new Error("At least one valid day is required for Weekly frequency");
        }
        return `${minute} ${hour} * * ${cronDays.join(",")}`;
    }

    throw new Error("Unsupported frequency. Use 'Daily' or 'Weekly'.");
}



module.exports = createCronExpression;



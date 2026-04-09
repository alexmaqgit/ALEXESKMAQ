const fetchPeriods = async () => {
    try {
        const response = await fetch('your_api_endpoint_here');
        const data = await response.json();
        return formatPeriods(data);
    } catch (error) {
        console.error('Error fetching periods:', error);
    }
};

const formatPeriods = (data) => {
    return data.map(period => ({
        id: period.id,
        startDate: new Date(period.startDate).toLocaleDateString(),
        endDate: new Date(period.endDate).toLocaleDateString(),
        description: period.description
    }));
};

const displayPeriods = async () => {
    const periods = await fetchPeriods();
    const periodsContainer = document.getElementById('periods-container');
    periodsContainer.innerHTML = periods.map(period => `
        <div>
            <h3>${period.description}</h3>
            <p>From: ${period.startDate} To: ${period.endDate}</p>
        </div>
    `).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    displayPeriods();
});
// Fetch throttle and timestamp data from the backend API
const fetchThrottleData = async () => {
    try {
        const response = await fetch('/api/throttle-data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching throttle data:', error);
        return [];
    }
};

// Prepare data for Chart.js
const prepareChartData = (data) => {
    const labels = data.map(item => new Date(item.timestamp * 1000).toLocaleTimeString()); // Convert UNIX timestamp
    const values = data.map(item => item.throttle);
    return { labels, values };
};

// Render the graph
const renderGraph = (labels, values) => {
    const ctx = document.getElementById('graphCanvas').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Throttle',
                data: values,
                borderColor: 'blue',
                borderWidth: 2,
                stepped: true // Step-like transitions
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Throttle Value'
                    }
                }
            }
        }
    });
};

// Main function
(async () => {
    const data = await fetchThrottleData();
    const { labels, values } = prepareChartData(data);
    renderGraph(labels, values);
})();

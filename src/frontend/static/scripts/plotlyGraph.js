let graphData = {};
let selectedFields = [];

const preprocessStepData = (timestamps, values) => {
    const newTimestamps = [];
    const newValues = [];

    for (let i = 0; i < timestamps.length; i++) {
        if (i > 0) {
            // Add the previous timestamp with the current value (horizontal line)
            newTimestamps.push(timestamps[i - 1]);
            newValues.push(values[i]);
        }
        // Add the current timestamp with the current value
        newTimestamps.push(timestamps[i]);
        newValues.push(values[i]);
    }

    return { timestamps: newTimestamps, values: newValues };
};


// Fetch available fields from the backend
const fetchFields = async () => {
    try {
        const response = await fetch('/api/motorcommands-fields');
        const fields = await response.json();
        return fields;
    } catch (error) {
        console.error('Error fetching fields:', error);
        return [];
    }
};

// Fetch data for specific fields with downsampling
const fetchFieldData = async (fields) => {
    try {
        const response = await fetch(`/api/motorcommands-data?fields=${fields.join(',')}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data for fields:', error);
        return [];
    }
};

// Render the graph using Plotly with step function
const renderPlotlyGraph = (timestamps, datasets) => {
    const traces = datasets.map((dataset) => ({
        x: timestamps,
        y: dataset.data,
        mode: 'lines',
        line: {
            shape: 'hv'
        },
        name: dataset.label
    }));

    const layout = {
        title: {
            text: 'MotorCommands Visualization',
            font: {
                size: 24,
                color: '#2c3e50'
            }
        },
        xaxis: { 
            title: 'Timestamp (Unix)',
            showgrid: true,
            type: 'linear',
            gridcolor: '#f0f0f0'
        },
        yaxis: { 
            title: 'Values',
            showgrid: true,
            gridcolor: '#f0f0f0'
        },
        showlegend: true,
        margin: { t: 50, l: 50, r: 20, b: 50 },
        autosize: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        font: {
            family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('graphCanvas', traces, layout, config);
};

const renderEmptyGraph = () => {
    const layout = {
        title: {
            text: 'MotorCommands Visualization',
            font: {
                size: 24,
                color: '#2c3e50'
            }
        },
        xaxis: { 
            title: 'Timestamp (Unix)',
            showgrid: true,
            type: 'linear',
            gridcolor: '#f0f0f0'
        },
        yaxis: { 
            title: 'Values',
            showgrid: true,
            gridcolor: '#f0f0f0',
            range: [-1, 1]  // Default range for empty graph
        },
        showlegend: true,
        margin: { t: 50, l: 50, r: 20, b: 50 },
        autosize: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        annotations: [{
            text: 'Select fields from the control panel to visualize data',
            showarrow: false,
            font: {
                size: 16,
                color: '#666'
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5
        }]
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('graphCanvas', [], layout, config);
};

// Debounce function to prevent too many rapid updates
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Modify the updateGraph function to be debounced
const updateGraphDebounced = debounce(async () => {
    selectedFields = Array.from(document.querySelectorAll('#field-selector input:checked'))
        .map((checkbox) => checkbox.value);

    if (selectedFields.length === 0) {
        renderEmptyGraph();
        return;
    }

    const data = await fetchFieldData(selectedFields);

    if (!data || data.error) {
        console.error('Error: No data received');
        return;
    }

    const traces = selectedFields.map((field) => {
        const rawTimestamps = data.map((row) => row.timestamp);
        const rawValues = data.map((row) => row[field] || null);
        const { timestamps, values } = preprocessStepData(rawTimestamps, rawValues);

        return {
            x: timestamps,
            y: values,
            mode: 'lines',
            name: field,
            line: {
                shape: 'hv'
            }
        };
    });

    // Calculate the time range using reduce instead of spread operator
    const allTimestamps = data.map(row => row.timestamp);
    const minTime = allTimestamps.reduce((min, curr) => Math.min(min, curr), allTimestamps[0]);
    const maxTime = allTimestamps.reduce((max, curr) => Math.max(max, curr), allTimestamps[0]);
    const timeRange = maxTime - minTime;
    
    // Add some padding to the range (5% on each side)
    const padding = timeRange * 0.05;

    const layout = {
        title: {
            text: 'MotorCommands Visualization',
            font: {
                size: 24,
                color: '#2c3e50'
            }
        },
        xaxis: { 
            title: 'Timestamp (Unix)',
            showgrid: true,
            type: 'linear',
            gridcolor: '#f0f0f0',
            range: [minTime - padding, maxTime + padding],  // Set the range with padding
            automargin: true  // Ensure labels are visible
        },
        yaxis: { 
            title: 'Values',
            showgrid: true,
            gridcolor: '#f0f0f0',
            automargin: true
        },
        showlegend: true,
        margin: { t: 50, l: 50, r: 20, b: 50 },
        autosize: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('graphCanvas', traces, layout, config);
}, 250); // 250ms debounce time

// Modify the populateFieldSelector function
const populateFieldSelector = async () => {
    const fieldSelector = document.getElementById('field-selector');
    const fields = await fetchFields();

    fields.forEach((field) => {
        const checkboxWrapper = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = field;
        checkbox.id = `checkbox-${field}`;
        const label = document.createElement('label');
        label.htmlFor = `checkbox-${field}`;
        label.textContent = field;

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(label);
        fieldSelector.appendChild(checkboxWrapper);

        // Use the debounced version for the event listener
        checkbox.addEventListener('change', updateGraphDebounced);
    });
};

// Initialize the controls and graph
const initialize = async () => {
    await populateFieldSelector();
};

// Initialize with empty graph
document.addEventListener('DOMContentLoaded', () => {
    renderEmptyGraph();
    initialize();
});

// Add window resize handler
window.addEventListener('resize', () => {
    Plotly.Plots.resize('graphCanvas');
});
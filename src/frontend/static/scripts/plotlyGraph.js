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
        x: timestamps, // Use Unix timestamps directly
        y: dataset.data,
        mode: 'lines',
        line: {
            shape: 'hv' // Horizontal-vertical step function
        },
        name: dataset.label
    }));

    const layout = {
        title: 'MotorCommands Visualization',
        xaxis: { 
            title: 'Timestamp (Unix)',
            showgrid: true,
            type: 'linear' // Treat timestamps as linear numbers
        },
        yaxis: { 
            title: 'Values',
            showgrid: true
        },
        showlegend: true,
        margin: { t: 50, l: 50, r: 50, b: 50 },
        width: window.innerWidth * 0.95,
        height: window.innerHeight * 0.8
    };

    Plotly.newPlot('graphCanvas', traces, layout);
};

const updateGraph = async () => {
    selectedFields = Array.from(document.querySelectorAll('#field-selector input:checked'))
        .map((checkbox) => checkbox.value);

    if (selectedFields.length === 0) {
        Plotly.purge('graphCanvas');
        return;
    }

    const data = await fetchFieldData(selectedFields);

    if (!data || data.error) {
        console.error('Error: No data received');
        return;
    }

    const traces = selectedFields.map((field) => {
        // Get raw timestamps and values
        const rawTimestamps = data.map((row) => row.timestamp);
        const rawValues = data.map((row) => row[field] || null);

        // Preprocess for step function
        const { timestamps, values } = preprocessStepData(rawTimestamps, rawValues);

        return {
            x: timestamps,
            y: values,
            mode: 'lines',
            name: field,
            line: {
                shape: 'hv' // Horizontal-Vertical Step Function
            }
        };
    });

    const layout = {
        title: 'MotorCommands Visualization',
        xaxis: { 
            title: 'Timestamp (Unix)',
            showgrid: true,
            type: 'linear'
        },
        yaxis: { 
            title: 'Values',
            showgrid: true
        },
        showlegend: true,
        connectgaps: true,
        margin: { t: 50, l: 50, r: 50, b: 50 },
        width: window.innerWidth * 0.95,
        height: window.innerHeight * 0.8
    };

    Plotly.newPlot('graphCanvas', traces, layout);
};


// Populate field selector with checkboxes
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

        checkbox.addEventListener('change', updateGraph);
    });
};

// Initialize the controls and graph
const initialize = async () => {
    await populateFieldSelector();
};

initialize();

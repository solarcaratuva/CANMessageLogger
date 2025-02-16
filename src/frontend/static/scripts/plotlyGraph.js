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
        const url = `/api/motorcommands-data?fields=${fields.join(',')}`;
        console.log('Fetching data for fields:', fields); // Debug log
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data); // Debug log
        
        if (!data || data.length === 0) {
            console.log('No data received from API');
            return [];
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching field data:', error);
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
    
    console.log('Selected fields:', selectedFields);

    if (selectedFields.length === 0) {
        renderEmptyGraph();
        return;
    }

    const data = await fetchFieldData(selectedFields);
    
    if (!data || data.length === 0) {
        console.log('No data to plot');
        return;
    }

    const traces = selectedFields.map((field) => {
        console.log(`Creating trace for field: ${field}`);
        const fieldData = data.map(row => ({
            timestamp: row.timestamp, // Use raw timestamp
            value: row[field]
        }));
        
        console.log(`Field data for ${field}:`, fieldData);

        return {
            x: fieldData.map(d => d.timestamp),
            y: fieldData.map(d => d.value),
            mode: 'lines',
            name: field,
            line: { shape: 'hv' }
        };
    });

    const layout = {
        title: 'MotorCommands Visualization',
        xaxis: {
            title: 'Timestamp',
            type: 'linear', // Changed from 'date' to 'linear'
            gridcolor: '#f0f0f0'
        },
        yaxis: {
            title: 'Value',
            gridcolor: '#f0f0f0'
        },
        showlegend: true,
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
    };

    console.log('Plotting traces:', traces);
    
    Plotly.newPlot('graphCanvas', traces, layout);
}, 250);

// Update the populateFieldSelector function
const populateFieldSelector = async () => {
    const fieldSelector = document.getElementById('field-selector');
    const fields = await fetchFields();
    
    // Remove any existing headers
    const existingHeaders = document.querySelectorAll('.control-header, .text-container h5');
    existingHeaders.forEach(header => header.remove());
    
    // Create single header
    const header = document.createElement('h5');
    header.textContent = 'Controls';
    header.style.marginBottom = '1rem';
    
    // Get the small-container
    const container = document.querySelector('.small-container');
    
    // Clear the container
    container.innerHTML = '';
    
    // Add elements in the correct order
    container.appendChild(header);
    container.appendChild(fieldSelector);
    
    // Populate fields
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

        checkbox.addEventListener('change', updateGraphDebounced);
    });
    
    // Add search box at the bottom
    addSearchBox();
};

const addSearchBox = () => {
    const container = document.querySelector('.small-container');
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search fields...';
    searchInput.className = 'search-input';
    
    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);
    
    // Add search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const checkboxes = document.querySelectorAll('#field-selector div');
        
        checkboxes.forEach(div => {
            const label = div.querySelector('label');
            if (label) {
                const text = label.textContent.toLowerCase();
                div.style.display = text.includes(searchTerm) ? 'block' : 'none';
            }
        });
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
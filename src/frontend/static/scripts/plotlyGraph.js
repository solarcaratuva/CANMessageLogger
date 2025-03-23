let graphData = {};
let selectedFields = [];
let socket = null;
let isLiveUpdating = false;
const maxDataPoints = 50; // Maximum number of points to show

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
            text: 'CAN Message Visualization',
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
            text: 'CAN Message Visualization',
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

const initializeWebSocket = () => {
    // Use the same host and port as the current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socket = io(`${protocol}//${host}`);
    
    socket.on('connect', () => {
        console.log('WebSocket connected successfully');
    });
    
    socket.on('motor_data_update', (data) => {
        console.log('Received data:', data); // Debug log
        if (isLiveUpdating) {
            updateGraphWithLiveData(data);
        }
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
};

const updateGraphWithLiveData = (newData) => {
    console.log('Updating graph with:', newData); // Debug log
    const graphDiv = document.getElementById('graphCanvas');
    if (!graphDiv.data) {
        console.log('No graph data found, reinitializing...'); // Debug log
        initializeGraph();
        return;
    }

    try {
        // Extract all values from the data object
        const values = Object.entries(newData.data).map(([field, value]) => {
            // Find the index of this field in our data
            const traceIndex = graphDiv.data.findIndex(trace => trace.name === field);
            if (traceIndex >= 0) {
                // If field is already being tracked, update it
                Plotly.extendTraces('graphCanvas', {
                    x: [[newData.timestamp]],
                    y: [[value]]
                }, [traceIndex]);
                
                return { field, value, updated: true };
            }
            return { field, value, updated: false };
        });
        
        // Keep only last maxDataPoints for each trace
        graphDiv.data.forEach((trace, traceIndex) => {
            if (trace.x.length > maxDataPoints) {
                const updateRange = {
                    x: [trace.x.slice(-maxDataPoints)],
                    y: [trace.y.slice(-maxDataPoints)]
                };
                Plotly.update('graphCanvas', updateRange, {}, [traceIndex]);
            }
        });
        
        // Auto-scroll x-axis if we have data
        if (graphDiv.data.length > 0 && graphDiv.data[0].x.length > 0) {
            const xRange = graphDiv.data[0].x;
            const minX = Math.min(...xRange.slice(-maxDataPoints));
            const maxX = Math.max(...xRange);
            
            Plotly.relayout('graphCanvas', {
                'xaxis.range': [minX, maxX]
            });
        }
    } catch (error) {
        console.error('Error in updateGraphWithLiveData:', error);
    }
};

const initializeGraph = () => {
    console.log('Initializing graph...'); // Debug log
    const trace = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: 'CAN Data'
    };

    const layout = {
        title: {
            text: 'Real-time CAN Data',
            font: {
                size: 24,
                color: '#2c3e50'
            }
        },
        xaxis: {
            title: 'Time',
            showgrid: true,
            gridcolor: '#f0f0f0'
        },
        yaxis: {
            title: 'Value',
            showgrid: true,
            gridcolor: '#f0f0f0'
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
        displaylogo: false
    };

    Plotly.newPlot('graphCanvas', [trace], layout, config);
};

const populateFieldSelector = async () => {
    const fieldSelector = document.getElementById('field-selector');
    if (!fieldSelector) {
        console.error('Field selector element not found');
        return;
    }

    // Clear existing content
    fieldSelector.innerHTML = '';
    
    // Add search box
    addSearchBox();

    try {
        const fields = await fetchFields();
        
        if (!fields || fields.length === 0) {
            fieldSelector.innerHTML = '<p>No fields available</p>';
            return;
        }

        // Group fields by prefix (assumes naming convention like "prefix_fieldname")
        const groupedFields = {};
        fields.forEach(field => {
            const parts = field.split('_');
            const prefix = parts.length > 1 ? parts[0] : 'Other';
            
            if (!groupedFields[prefix]) {
                groupedFields[prefix] = [];
            }
            groupedFields[prefix].push(field);
        });

        // Display grouped fields
        Object.entries(groupedFields).forEach(([group, groupFields]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'field-group';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'field-group-title';
            groupTitle.textContent = group;
            groupDiv.appendChild(groupTitle);
            
            groupFields.forEach(field => {
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'checkbox-container';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `field-${field}`;
                checkbox.className = 'field-checkbox';
                checkbox.value = field;
                checkbox.dataset.group = group;
                
                // Add event listener for selection
                checkbox.addEventListener('change', handleFieldSelection);
                
                const label = document.createElement('label');
                label.htmlFor = `field-${field}`;
                label.textContent = field.replace(`${group}_`, '');
                
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                groupDiv.appendChild(checkboxContainer);
            });
            
            fieldSelector.appendChild(groupDiv);
        });
    } catch (error) {
        console.error('Error populating field selector:', error);
        fieldSelector.innerHTML = `<p>Error loading fields: ${error.message}</p>`;
    }
};

const handleFieldSelection = debounce(async (event) => {
    const checkbox = event.target;
    const field = checkbox.value;
    
    if (checkbox.checked) {
        if (!selectedFields.includes(field)) {
            selectedFields.push(field);
        }
    } else {
        selectedFields = selectedFields.filter(f => f !== field);
    }
    
    if (selectedFields.length > 0) {
        try {
            const data = await fetchFieldData(selectedFields);
            processAndDisplayData(data);
        } catch (error) {
            console.error('Error fetching selected field data:', error);
        }
    } else {
        renderEmptyGraph();
    }
}, 300);

const processAndDisplayData = (data) => {
    if (!data || data.length === 0) {
        renderEmptyGraph();
        return;
    }
    
    // Extract timestamps
    const timestamps = data.map(item => item.timestamp);
    
    // Create datasets for each selected field
    const datasets = selectedFields.map(field => {
        const values = data.map(item => item[field] || 0);
        
        // Apply step function preprocessing
        const processed = preprocessStepData(timestamps, values);
        
        return {
            label: field,
            data: processed.values,
            processed_timestamps: processed.timestamps
        };
    });
    
    // Use the first dataset's processed timestamps (they should all be the same)
    const processedTimestamps = datasets[0].processed_timestamps;
    
    renderPlotlyGraph(processedTimestamps, datasets);
};

const addSearchBox = () => {
    const fieldSelector = document.getElementById('field-selector');
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'fieldSearch';
    searchInput.placeholder = 'Search fields...';
    searchInput.addEventListener('input', filterFields);
    
    searchContainer.appendChild(searchInput);
    fieldSelector.appendChild(searchContainer);
};

const filterFields = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const checkboxes = document.querySelectorAll('.field-checkbox');
    const groups = document.querySelectorAll('.field-group');
    
    groups.forEach(group => {
        let hasVisibleFields = false;
        const groupFields = group.querySelectorAll('.checkbox-container');
        
        groupFields.forEach(container => {
            const checkbox = container.querySelector('input');
            const label = container.querySelector('label');
            const fieldName = checkbox.value.toLowerCase();
            
            if (fieldName.includes(searchTerm)) {
                container.style.display = 'flex';
                hasVisibleFields = true;
            } else {
                container.style.display = 'none';
            }
        });
        
        // Show/hide the group based on whether it has visible fields
        group.style.display = hasVisibleFields ? 'block' : 'none';
    });
};

const toggleLiveUpdates = () => {
    const toggleButton = document.getElementById('toggleLiveUpdate');
    
    isLiveUpdating = !isLiveUpdating;
    
    if (isLiveUpdating) {
        toggleButton.textContent = 'Stop Live Updates';
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-danger');
        
        // Subscribe to motor data
        socket.emit('subscribe_motor_data');
        
        // Initialize the graph if not already
        initializeGraph();
    } else {
        toggleButton.textContent = 'Start Live Updates';
        toggleButton.classList.remove('btn-danger');
        toggleButton.classList.add('btn-primary');
    }
};

const initialize = async () => {
    // Initialize the WebSocket connection
    initializeWebSocket();
    
    // Populate the field selector with available fields
    await populateFieldSelector();
    
    // Set up the toggle button
    const toggleButton = document.getElementById('toggleLiveUpdate');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleLiveUpdates);
    }
    
    // Render empty graph initially
    renderEmptyGraph();
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Add window resize handler
window.addEventListener('resize', () => {
    Plotly.Plots.resize('graphCanvas');
});

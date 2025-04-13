let graphData = {};
let selectedFields = [];
let availableTables = [];
let selectedTable = '';
let socket = null;
let isLiveUpdating = false;
let updateInterval = null;
const maxDataPoints = 100; // Maximum number of points to show
const updateFrequency = 500; // How often to check for updates (in ms)

// Keep track of the last timestamp we've seen for each table
let lastTimestamps = {};

// Variables to hold zoom state
let isZoomed = false;
let zoomStartValue = null;
let zoomEndValue = null;

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

// Fetch available tables from the backend
const fetchTables = async () => {
    try {
        const response = await fetch('/api/available-tables');
        const tables = await response.json();
        return tables;
    } catch (error) {
        console.error('Error fetching tables:', error);
        return [];
    }
};

// Fetch available fields for a specific table
const fetchFields = async (table) => {
    try {
        const response = await fetch(`/api/table-fields?table=${table}`);
        const fields = await response.json();
        return fields;
    } catch (error) {
        console.error(`Error fetching fields for table ${table}:`, error);
        return [];
    }
};

// Fetch data for specific fields from a specific table
const fetchFieldData = async (table, fields) => {
    try {
        const url = `/api/table-data?table=${table}&fields=${fields.join(',')}`;
        console.log('Fetching data for table:', table, 'fields:', fields); // Debug log
        
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

// Fetch the latest messages from all tables
const fetchLatestMessages = async () => {
    try {
        const response = await fetch('/get_latest_message');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Latest messages:', data);
        
        if (data.messages && data.messages.length > 0) {
            processLatestMessages(data.messages);
        }
    } catch (error) {
        console.error('Error fetching latest messages:', error);
    }
};

// Process the latest messages and update the graph
const processLatestMessages = (messages) => {
    messages.forEach(message => {
        const tableName = message.table_name;
        const timestamp = message.timestamp;
        const data = message.data;
        
        // Skip if we already processed this timestamp for this table
        if (lastTimestamps[tableName] && lastTimestamps[tableName] >= timestamp) {
            return;
        }
        
        // Update the last seen timestamp
        lastTimestamps[tableName] = timestamp;
        
        // Only update if we're looking at this table or no table is selected
        if (!selectedTable || selectedTable === tableName) {
            // Format the data for graph update
            const dataForUpdate = {
                timestamp: timestamp,
                data: {},  // We'll add fields below
                table: tableName
            };
            
            // Add fields with table prefix to avoid collisions
            Object.entries(data).forEach(([key, value]) => {
                dataForUpdate.data[`${tableName}.${key}`] = value;
            });
            
            updateGraphWithLiveData(dataForUpdate);
        }
    });
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

    // Get all checked checkboxes to create a meaningful title
    const checkedCheckboxes = Array.from(document.querySelectorAll('.field-checkbox:checked'));
    let titleText;
    
    if (checkedCheckboxes.length === 0) {
        titleText = 'CAN Message Visualization';
    } else if (checkedCheckboxes.length === 1) {
        titleText = checkedCheckboxes[0].dataset.fullField + ' Real-time Data';
    } else {
        titleText = `${checkedCheckboxes.length} Fields Selected`;
    }

    const layout = {
        title: {
            text: titleText,
            font: {
                size: 24,
                color: '#2c3e50'
            }
        },
        xaxis: { 
            title: 'Timestamp',
            showgrid: true,
            type: 'linear',
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
            title: 'Timestamp',
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
            text: 'Select one or more fields from the list to visualize data',
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

const updateGraphWithLiveData = (newData) => {
    console.log('Updating graph with:', newData); // Debug log
    const graphDiv = document.getElementById('graphCanvas');
    if (!graphDiv.data) {
        console.log('No graph data found, initializing...'); // Debug log
        initializeGraph();
    }

    try {
        const timestamp = newData.timestamp;
        const dataTable = newData.table;
        
        // Extract all values from the data object
        Object.entries(newData.data).forEach(([field, value]) => {
            // Get the field name without table prefix (it will be something like "MotorCommands.throttle")
            const parts = field.split('.');
            const fieldName = parts[parts.length - 1];
            const tableName = dataTable;
            
            // Create the standardized full field name (table.field)
            const fullFieldName = `${tableName}.${fieldName}`;
            
            // Check if this field is selected by searching the checkbox with this data attribute
            const matchingCheckbox = document.querySelector(`input[data-full-field="${fullFieldName}"]`);
            
            if (matchingCheckbox && matchingCheckbox.checked) {
                // Find or create the trace for this field
                const traceIndex = findOrCreateTrace(graphDiv, fullFieldName, value);
                
                if (traceIndex >= 0) {
                    // Update the trace with new data
                    Plotly.extendTraces('graphCanvas', {
                        x: [[timestamp]],
                        y: [[value]]
                    }, [traceIndex]);
                }
            }
        });
        
        // Keep only last maxDataPoints for each trace
        if (graphDiv.data) {
            graphDiv.data.forEach((trace, traceIndex) => {
                if (trace.x && trace.x.length > maxDataPoints) {
                    const updateRange = {
                        x: [trace.x.slice(-maxDataPoints)],
                        y: [trace.y.slice(-maxDataPoints)]
                    };
                    Plotly.update('graphCanvas', updateRange, {}, [traceIndex]);
                }
            });
            
            // Auto-scroll x-axis to show only the most recent data - this ensures we see updates in real-time
            if (graphDiv.data.length > 0 && graphDiv.data[0].x && graphDiv.data[0].x.length > 0) {
                const timeValues = [];
                graphDiv.data.forEach(trace => {
                    if (trace.x && trace.x.length > 0) {
                        timeValues.push(...trace.x);
                    }
                });
                
                if (timeValues.length > 0) {
                    // Calculate visible window (show only recent data)
                    const maxX = Math.max(...timeValues);
                    // Show the last 5 seconds of data (or less if we don't have that much)
                    const minX = Math.max(maxX - 5000, Math.min(...timeValues));
                    
                    Plotly.relayout('graphCanvas', {
                        'xaxis.range': [minX, maxX],
                        'xaxis.autorange': false
                    });
                }
            }
        }

        // Ensure that the x-axis range is preserved if zoomed in
        if (isZoomed) {
            Plotly.relayout('graphCanvas', {
                'xaxis.range': [zoomStartValue, zoomEndValue]
            });
        }
    } catch (error) {
        console.error('Error in updateGraphWithLiveData:', error);
    }
};

// Function to find an existing trace or create a new one for a field
const findOrCreateTrace = (graphDiv, field, value) => {
    if (!graphDiv.data) {
        return -1;
    }
    
    // Try to find the field in existing traces by exact name match
    let traceIndex = graphDiv.data.findIndex(trace => trace.name === field);
    
    if (traceIndex >= 0) {
        return traceIndex;
    }
    
    // If field is not found, check if the checkbox for this field is checked
    const matchingCheckbox = document.querySelector(`input[data-full-field="${field}"]`);
    if (!matchingCheckbox || !matchingCheckbox.checked) {
        return -1;
    }
    
    // If field is not found but checkbox is checked, create a new trace
    const newTrace = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: field
    };
    
    // Add the new trace to the plot
    Plotly.addTraces('graphCanvas', newTrace);
    
    // Return the index of the newly added trace
    return graphDiv.data.length - 1;
};

const initializeGraph = () => {
    console.log('Initializing graph...'); // Debug log
    
    // Get all checked checkboxes to determine initial traces
    const checkedCheckboxes = Array.from(document.querySelectorAll('.field-checkbox:checked'));
    
    // Default trace if no checkbox is selected
    const traces = checkedCheckboxes.length === 0 ? [
        {
            x: [],
            y: [],
            mode: 'lines',
            line: { shape: 'hv' },
            name: 'No data selected'
        }
    ] : checkedCheckboxes.map(checkbox => ({
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: checkbox.dataset.fullField
    }));

    // Title based on selection
    let titleText;
    if (checkedCheckboxes.length === 0) {
        titleText = 'CAN Message Visualization';
    } else if (checkedCheckboxes.length === 1) {
        titleText = checkedCheckboxes[0].dataset.fullField + ' Real-time Data';
    } else {
        titleText = `${checkedCheckboxes.length} Fields Selected`;
    }

    const layout = {
        title: {
            text: titleText,
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

    Plotly.newPlot('graphCanvas', traces, layout, config);
};

const populateAllFields = async () => {
    const fieldSelector = document.getElementById('field-selector');
    if (!fieldSelector) {
        console.error('Field selector element not found');
        return;
    }

    // Clear existing content
    fieldSelector.innerHTML = '';
    
    try {
        // Fetch available tables
        const tables = await fetchTables();
        availableTables = tables;
        
        if (!tables || tables.length === 0) {
            fieldSelector.innerHTML = '<p>No tables available</p>';
            return;
        }
        
        // Create a header for the fields section
        const fieldsHeader = document.createElement('h5');
        fieldsHeader.textContent = 'Select Fields to Display:';
        fieldsHeader.className = 'mb-3';
        fieldSelector.appendChild(fieldsHeader);
        
        // Add search box
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container mb-3';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'fieldSearch';
        searchInput.className = 'form-control';
        searchInput.placeholder = 'Search fields...';
        
        searchContainer.appendChild(searchInput);
        fieldSelector.appendChild(searchContainer);
        
        // Create container for all checkboxes
        const checkboxesContainer = document.createElement('div');
        checkboxesContainer.className = 'all-fields-container';
        checkboxesContainer.style.maxHeight = '400px';
        checkboxesContainer.style.overflowY = 'auto';
        
        // Fetch all fields from all tables and populate them
        let allFields = [];
        
        for (const table of tables) {
            const fields = await fetchFields(table);
            
            // Add table name to each field
            fields.forEach(field => {
                allFields.push({
                    table: table,
                    field: field,
                    fullName: `${table}.${field}`
                });
            });
        }
        
        // Sort fields alphabetically
        allFields.sort((a, b) => a.fullName.localeCompare(b.fullName));
        
        // Create checkboxes for each field
        allFields.forEach(fieldInfo => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-container';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `field-${fieldInfo.table}-${fieldInfo.field}`;
            checkbox.className = 'field-checkbox';
            checkbox.value = fieldInfo.field;
            checkbox.dataset.table = fieldInfo.table;
            checkbox.dataset.fullField = fieldInfo.fullName;
            
            // Check if this is the throttle field from MotorCommands to select by default
            if (fieldInfo.table === 'MotorCommands' && fieldInfo.field === 'throttle') {
                checkbox.checked = true;
                selectedTable = 'MotorCommands';
                selectedFields = ['throttle'];
            }
            
            // Add event listener for selection
            checkbox.addEventListener('change', handleFieldSelection);
            
            const label = document.createElement('label');
            label.htmlFor = `field-${fieldInfo.table}-${fieldInfo.field}`;
            label.textContent = fieldInfo.fullName;
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxesContainer.appendChild(checkboxContainer);
        });
        
        fieldSelector.appendChild(checkboxesContainer);
        
        // Add event listener for search
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const checkboxContainers = checkboxesContainer.querySelectorAll('.checkbox-container');
            
            checkboxContainers.forEach(container => {
                const label = container.querySelector('label');
                const fieldName = label.textContent.toLowerCase();
                
                if (fieldName.includes(searchTerm)) {
                    container.style.display = 'flex';
                } else {
                    container.style.display = 'none';
                }
            });
        });
        
        // If throttle is selected by default, initialize the graph
        if (selectedFields.includes('throttle') && selectedTable === 'MotorCommands') {
            initializeGraph();
            toggleLiveUpdates();
        }
        
    } catch (error) {
        console.error('Error populating fields:', error);
        fieldSelector.innerHTML = `<p>Error loading fields: ${error.message}</p>`;
    }
};

// Modified field selection handler
const handleFieldSelection = debounce(async (event) => {
    const checkbox = event.target;
    const field = checkbox.value;
    const table = checkbox.dataset.table;
    const fullField = checkbox.dataset.fullField;
    
    if (checkbox.checked) {
        // Add this field's checkbox data to our tracking
        if (!selectedFields.includes(field)) {
            // Set selected table if this is the first field selected
            if (selectedFields.length === 0) {
                selectedTable = table;
            }
            
            // If this field is from the current selected table, add it
            if (table === selectedTable) {
                selectedFields.push(field);
            } else {
                // If field is from a different table and we have fields
                // already selected, uncheck it and alert the user
                if (selectedFields.length > 0) {
                    checkbox.checked = false;
                    alert('Please select fields from only one table at a time.');
                    return;
                } else {
                    // If no fields yet selected, set this as the selected table
                    selectedTable = table;
                    selectedFields.push(field);
                }
            }
        }
    } else {
        // Remove this field if it's in the array
        selectedFields = selectedFields.filter(f => f !== field);
        
        // If no fields left, clear selected table
        if (selectedFields.length === 0) {
            selectedTable = '';
        }
    }
    
    console.log('Selected table:', selectedTable, 'Selected fields:', selectedFields);
    
    // Only update the graph if we have selected fields from a table
    if (selectedFields.length > 0 && selectedTable) {
        try {
            // Fetch new data for the currently selected fields
            const data = await fetchFieldData(selectedTable, selectedFields);
            processAndDisplayData(data);
        } catch (error) {
            console.error('Error fetching selected field data:', error);
        }
    } else {
        // If no fields selected, show empty graph
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
        
        // Use consistent field naming with table prefix
        const fieldLabel = `${selectedTable}.${field}`;
        
        return {
            label: fieldLabel,
            data: processed.values,
            processed_timestamps: processed.timestamps
        };
    });
    
    // Use the first dataset's processed timestamps (they should all be the same)
    const processedTimestamps = datasets[0].processed_timestamps;
    
    // Create a completely new plot (this avoids issues with Plotly's update mechanism)
    renderPlotlyGraph(processedTimestamps, datasets);
};

const toggleLiveUpdates = () => {
    const toggleButton = document.getElementById('toggleLiveUpdate');
    const statusIndicator = document.getElementById('updateStatus');
    const statusText = document.getElementById('updateStatusText');
    
    // If already in the desired state, don't toggle
    if ((toggleButton.textContent === 'Stop Auto Updates' && !isLiveUpdating) ||
        (toggleButton.textContent === 'Start Auto Updates' && isLiveUpdating)) {
        // Just set the correct state
        isLiveUpdating = toggleButton.textContent === 'Stop Auto Updates';
    } else {
        // Otherwise, toggle the state
        isLiveUpdating = !isLiveUpdating;
    }
    
    if (isLiveUpdating) {
        toggleButton.textContent = 'Stop Auto Updates';
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-danger');
        
        // Update status indicator
        statusIndicator.classList.remove('status-inactive');
        statusIndicator.classList.add('status-active');
        statusText.textContent = 'Active';
        
        // Initialize the graph if not already
        if (!document.getElementById('graphCanvas').data || 
            document.getElementById('graphCanvas').data.length === 0) {
            initializeGraph();
        }
        
        // Start auto-updates
        if (!updateInterval) {
            updateInterval = setInterval(fetchLatestMessages, updateFrequency);
            // Fetch immediately
            fetchLatestMessages();
        }
    } else {
        toggleButton.textContent = 'Start Auto Updates';
        toggleButton.classList.remove('btn-danger');
        toggleButton.classList.add('btn-primary');
        
        // Update status indicator
        statusIndicator.classList.remove('status-active');
        statusIndicator.classList.add('status-inactive');
        statusText.textContent = 'Inactive';
        
        // Stop auto-updates
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }
};

const initialize = async () => {
    // Clear any previous data structures
    lastTimestamps = {};
    selectedFields = [];
    selectedTable = '';
    
    // Set initial state for auto-updates
    isLiveUpdating = true;
    
    // Set up the toggle button
    const toggleButton = document.getElementById('toggleLiveUpdate');
    const statusIndicator = document.getElementById('updateStatus');
    const statusText = document.getElementById('updateStatusText');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleLiveUpdates);
        toggleButton.textContent = 'Stop Auto Updates';
        toggleButton.classList.remove('btn-primary');
        toggleButton.classList.add('btn-danger');
    }
    
    if (statusIndicator && statusText) {
        statusIndicator.classList.remove('status-inactive');
        statusIndicator.classList.add('status-active');
        statusText.textContent = 'Active';
    }
    
    // Populate all fields from all tables
    await populateAllFields();
    
    // Start auto-updates
    updateInterval = setInterval(fetchLatestMessages, updateFrequency);
    fetchLatestMessages(); // Immediate first fetch
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Add window resize handler
window.addEventListener('resize', () => {
    Plotly.Plots.resize('graphCanvas');
});

// Event listener for the Apply Zoom button
document.getElementById('applyZoom').addEventListener('click', () => {
    zoomStartValue = parseFloat(document.getElementById('zoomStart').value);
    zoomEndValue = parseFloat(document.getElementById('zoomEnd').value);

    // Check that the inputs are valid numbers and that start is less than end
    if (!isNaN(zoomStartValue) && !isNaN(zoomEndValue) && zoomStartValue < zoomEndValue) {
        Plotly.relayout('graphCanvas', {
            'xaxis.range': [zoomStartValue, zoomEndValue],
            'xaxis.autorange': false
        });
        isZoomed = true; // Set zoom state to true
        console.log(`Zoom applied from ${zoomStartValue} to ${zoomEndValue}`);
    } else {
        alert("Please enter valid start and end times where the start is less than the end.");
    }
});

// Event listener for the Reset Zoom button
document.getElementById('resetZoom').addEventListener('click', () => {
    // Reset x-axis to auto range so new data will be visible
    Plotly.relayout('graphCanvas', {'xaxis.autorange': true});
    isZoomed = false; // Reset zoom state
    zoomStartValue = null; // Clear stored values
    zoomEndValue = null;
    document.getElementById('zoomStart').value = "";
    document.getElementById('zoomEnd').value = "";
    console.log("Zoom reset");
});

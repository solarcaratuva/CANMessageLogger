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

    // Create a more appropriate title based on the selected fields
    let titleText;
    if (selectedFields.length === 1) {
        titleText = `MotorCommands.${selectedFields[0]} Real-time Data`;
    } else {
        titleText = `MotorCommands - ${selectedFields.length} Fields Selected`;
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
            text: '1. Select a table from the dropdown menu',
            showarrow: false,
            font: {
                size: 16,
                color: '#666'
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.6
        }, {
            text: '2. Choose one or more fields to visualize',
            showarrow: false,
            font: {
                size: 16,
                color: '#666'
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.5
        }, {
            text: '3. Optionally enable auto-updates to see real-time data',
            showarrow: false,
            font: {
                size: 16,
                color: '#666'
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.4
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
        
        // Only process data from MotorCommands table
        if (dataTable !== 'MotorCommands') {
            return;
        }
        
        // Extract all values from the data object
        Object.entries(newData.data).forEach(([field, value]) => {
            // Get the field name without table prefix
            const fieldName = field.split('.').pop();
            
            // Process any field that's in our selectedFields array
            if (selectedFields.includes(fieldName)) {
                // Create/use a standardized field name
                const standardizedField = `MotorCommands.${fieldName}`;
                
                // Find the index of this field in our data
                const traceIndex = findOrCreateTrace(graphDiv, standardizedField, value);
                
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
    } catch (error) {
        console.error('Error in updateGraphWithLiveData:', error);
    }
};

// Function to find an existing trace or create a new one for a field
const findOrCreateTrace = (graphDiv, field, value) => {
    if (!graphDiv.data) {
        return -1;
    }
    
    // Standardize field name to always use the full "MotorCommands.throttle" format
    const standardizedField = field.includes('.') ? field : `MotorCommands.${field}`;
    
    // Try to find the field in existing traces - check both formats
    let traceIndex = graphDiv.data.findIndex(trace => 
        trace.name === standardizedField || 
        (trace.name === 'throttle' && standardizedField === 'MotorCommands.throttle') ||
        (trace.name === 'MotorCommands.throttle' && standardizedField === 'throttle')
    );
    
    if (traceIndex >= 0) {
        // If we found a trace with the non-standardized name, update it
        if (graphDiv.data[traceIndex].name !== standardizedField) {
            Plotly.restyle('graphCanvas', {
                name: [standardizedField]
            }, [traceIndex]);
        }
        return traceIndex;
    }
    
    // Only create new traces if we specifically want this field
    // Check if this is a selected field
    const fieldNameWithoutTable = field.split('.').pop();
    if (!selectedFields.includes(fieldNameWithoutTable) && !isLiveUpdating) {
        return -1;
    }
    
    // If field is not found, create a new trace
    const newTrace = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: standardizedField
    };
    
    // Add the new trace to the plot
    Plotly.addTraces('graphCanvas', newTrace);
    
    // Return the index of the newly added trace
    return graphDiv.data.length - 1;
};

const initializeGraph = () => {
    console.log('Initializing graph...'); // Debug log
    const trace = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: 'MotorCommands.throttle'  // Use consistent naming
    };

    const layout = {
        title: {
            text: 'MotorCommands.throttle Real-time Data',
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
            title: 'Throttle Value',
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

const populateTableSelector = async () => {
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
        
        // Create table selection dropdown
        const tableSelector = document.createElement('div');
        tableSelector.className = 'table-selector';
        
        const tableLabel = document.createElement('label');
        tableLabel.textContent = 'Select Table:';
        tableLabel.htmlFor = 'table-select';
        
        const tableSelect = document.createElement('select');
        tableSelect.id = 'table-select';
        tableSelect.className = 'form-control mb-3';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select a Table --';
        tableSelect.appendChild(defaultOption);
        
        // Add options for each table
        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table;
            option.textContent = table;
            tableSelect.appendChild(option);
        });
        
        // Add change event listener
        tableSelect.addEventListener('change', async (event) => {
            selectedTable = event.target.value;
            if (selectedTable) {
                await populateFieldsForTable(selectedTable);
            } else {
                // Clear fields if no table is selected
                const fieldsContainer = document.getElementById('fields-container');
                if (fieldsContainer) {
                    fieldsContainer.innerHTML = '';
                }
                selectedFields = [];
            }
        });
        
        tableSelector.appendChild(tableLabel);
        tableSelector.appendChild(tableSelect);
        
        // Create container for fields
        const fieldsContainer = document.createElement('div');
        fieldsContainer.id = 'fields-container';
        
        // Append to field selector
        fieldSelector.appendChild(tableSelector);
        fieldSelector.appendChild(fieldsContainer);
        
    } catch (error) {
        console.error('Error populating table selector:', error);
        fieldSelector.innerHTML = `<p>Error loading tables: ${error.message}</p>`;
    }
};

const populateFieldsForTable = async (tableName) => {
    const fieldsContainer = document.getElementById('fields-container');
    if (!fieldsContainer) {
        console.error('Fields container not found');
        return;
    }
    
    // Clear existing fields
    fieldsContainer.innerHTML = '';
    selectedFields = [];
    
    try {
        // Fetch fields for the selected table
        const fields = await fetchFields(tableName);
        
        if (!fields || fields.length === 0) {
            fieldsContainer.innerHTML = '<p>No fields available for this table</p>';
            return;
        }
        
        // Add search box
        addSearchBox(fieldsContainer);
        
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
        
        // Create a container for the checkboxes
        const checkboxesContainer = document.createElement('div');
        checkboxesContainer.className = 'field-checkboxes';
        
        // Display grouped fields
        Object.entries(groupedFields).forEach(([group, groupFields]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'field-group';
            
            const groupTitle = document.createElement('div');
            groupTitle.className = 'field-group-title';
            groupTitle.textContent = group;
            groupDiv.appendChild(groupTitle);
            
            // Create label for "Select All" in this group
            const selectAllContainer = document.createElement('div');
            selectAllContainer.className = 'checkbox-container select-all-container';
            
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.id = `select-all-${group}`;
            selectAllCheckbox.className = 'select-all-checkbox';
            
            const selectAllLabel = document.createElement('label');
            selectAllLabel.htmlFor = `select-all-${group}`;
            selectAllLabel.textContent = 'Select All';
            
            selectAllContainer.appendChild(selectAllCheckbox);
            selectAllContainer.appendChild(selectAllLabel);
            groupDiv.appendChild(selectAllContainer);
            
            // Add event listener for select all checkbox
            selectAllCheckbox.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                const checkboxes = groupDiv.querySelectorAll('.field-checkbox');
                
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    
                    // Manually trigger change event for each checkbox
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                });
            });
            
            groupFields.forEach(field => {
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'checkbox-container';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `field-${tableName}-${field}`;
                checkbox.className = 'field-checkbox';
                checkbox.value = field;
                checkbox.dataset.group = group;
                checkbox.dataset.fullField = `${tableName}.${field}`;
                
                // Add event listener for selection
                checkbox.addEventListener('change', handleFieldSelection);
                
                const label = document.createElement('label');
                label.htmlFor = `field-${tableName}-${field}`;
                label.textContent = field.replace(`${group}_`, '');
                
                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                groupDiv.appendChild(checkboxContainer);
            });
            
            checkboxesContainer.appendChild(groupDiv);
        });
        
        fieldsContainer.appendChild(checkboxesContainer);
        
    } catch (error) {
        console.error('Error populating fields for table:', error);
        fieldsContainer.innerHTML = `<p>Error loading fields: ${error.message}</p>`;
    }
};

const handleFieldSelection = debounce(async (event) => {
    const checkbox = event.target;
    const field = checkbox.value;
    const fullField = checkbox.dataset.fullField || `${selectedTable}.${field}`;
    
    if (checkbox.checked) {
        if (!selectedFields.includes(field)) {
            selectedFields.push(field);
        }
    } else {
        selectedFields = selectedFields.filter(f => f !== field);
    }
    
    if (selectedFields.length > 0 && selectedTable) {
        try {
            const data = await fetchFieldData(selectedTable, selectedFields);
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
    
    renderPlotlyGraph(processedTimestamps, datasets);
};

const addSearchBox = (container) => {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'fieldSearch';
    searchInput.className = 'form-control mb-3';
    searchInput.placeholder = 'Search fields...';
    searchInput.addEventListener('input', filterFields);
    
    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);
};

const filterFields = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const checkboxes = document.querySelectorAll('.field-checkbox');
    const groups = document.querySelectorAll('.field-group');
    
    groups.forEach(group => {
        let hasVisibleFields = false;
        const groupFields = group.querySelectorAll('.checkbox-container:not(.select-all-container)');
        
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
    
    // Populate the table and field selectors
    await populateTableSelector();
    
    // Default to MotorCommands table and throttle field
    try {
        // Get the dropdown element
        const tableSelect = document.getElementById('table-select');
        if (tableSelect) {
            // Find the MotorCommands option and select it
            for (let i = 0; i < tableSelect.options.length; i++) {
                if (tableSelect.options[i].value === 'MotorCommands') {
                    tableSelect.selectedIndex = i;
                    selectedTable = 'MotorCommands';
                    
                    // Populate fields for the selected table
                    await populateFieldsForTable('MotorCommands');
                    
                    // After fields are populated, select the throttle field
                    setTimeout(() => {
                        const throttleCheckbox = document.getElementById('field-MotorCommands-throttle');
                        if (throttleCheckbox) {
                            throttleCheckbox.checked = true;
                            
                            // Add throttle to selected fields
                            selectedFields = ['throttle'];
                            
                            // Initialize the graph with the proper layout
                            initializeGraph();
                            
                            // Start auto-updates immediately (this will fetch data)
                            toggleLiveUpdates();
                        } else {
                            console.log('Throttle field checkbox not found');
                        }
                    }, 500); // Give the fields time to populate
                    
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error setting default selection:', error);
        renderEmptyGraph();
    }
    
    // Set up the toggle button - set to active state initially since we'll turn it on automatically
    const toggleButton = document.getElementById('toggleLiveUpdate');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleLiveUpdates);
    }
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Add window resize handler
window.addEventListener('resize', () => {
    Plotly.Plots.resize('graphCanvas');
});

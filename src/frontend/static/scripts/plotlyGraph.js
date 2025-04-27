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

// Flag to indicate we're showing full historical data without compression
let showingFullHistory = false;
let initialHistoricalDataCount = 0; // Store initial data count when loading history
let currentMaxTimestamp = 0; // Track the most recent timestamp seen so far

// Variables to hold zoom state
let isZoomed = false;
let zoomStartValue = null;
let zoomEndValue = null;
// New variables for zoom with scroll feature
let isZoomScrollActive = false;
let zoomWindowSize = null; // Size of the zoom window in ms
let scrollStepSize = 500; // How much to move the window on each update (ms - 0.5 seconds)

// Function to convert milliseconds to seconds for display
const msToSeconds = (ms) => ms / 1000;

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

// Fetch data for specific fields from a specific table with an option to get all data
const fetchFieldData = async (table, fields, getFullHistory = false) => {
    try {
        let url = `/api/table-data?table=${table}&fields=${fields.join(',')}`;
        
        // If requesting full history, add a parameter to indicate no limit
        if (getFullHistory) {
            url += '&full=true';
        }
        
        console.log('Fetching data for table:', table, 'fields:', fields, 'full history:', getFullHistory); // Debug log
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Received ${data.length} data points`); // Debug log
        
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
        x: timestamps.map(msToSeconds),  // Convert ms to seconds for display
        y: dataset.data,
        mode: 'lines',
        line: {
            shape: 'hv'
        },
        name: dataset.label,
        connectgaps: false // Don't connect gaps in the data
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
            title: 'Time (seconds)',  // Changed unit label to seconds
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
            title: 'Time (seconds)',  // Changed to seconds
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
        
        // Only update if the timestamp is newer than what we've seen
        // This prevents older data from being added after we've already seen newer data
        if (timestamp < currentMaxTimestamp && showingFullHistory) {
            console.log(`Skipping older data point (${timestamp} < ${currentMaxTimestamp})`);
            return;
        }
        
        // Update our current max timestamp if this is newer
        if (timestamp > currentMaxTimestamp) {
            currentMaxTimestamp = timestamp;
        }
        
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
                    // Update the trace with new data (convert to seconds for display)
                    Plotly.extendTraces('graphCanvas', {
                        x: [[msToSeconds(timestamp)]],
                        y: [[value]]
                    }, [traceIndex]);
                }
            }
        });
        
        // Always limit new points regardless of full history mode
        // This prevents the graph from getting too large with live data
        if (graphDiv.data) {
            const MAX_LIVE_POINTS = 100; // Maximum points to add after initial load
            
            graphDiv.data.forEach((trace, traceIndex) => {
                // If we're in full history mode, check if we've exceeded the maximum 
                // number of points since loading the full history
                if (showingFullHistory) {
                    // Get the current number of points
                    const totalPoints = trace.x.length;
                    
                    // If we've added too many new points, start trimming
                    if (totalPoints > initialHistoricalDataCount + MAX_LIVE_POINTS) {
                        // Keep all the historical points plus the most recent MAX_LIVE_POINTS
                        const updateRange = {
                            x: [trace.x.slice(0, initialHistoricalDataCount).concat(trace.x.slice(-(MAX_LIVE_POINTS)))],
                            y: [trace.y.slice(0, initialHistoricalDataCount).concat(trace.y.slice(-(MAX_LIVE_POINTS)))]
                        };
                        Plotly.update('graphCanvas', updateRange, {}, [traceIndex]);
                    }
                }
                // If not in full history mode, just limit to maxDataPoints
                else if (trace.x && trace.x.length > maxDataPoints) {
                    const updateRange = {
                        x: [trace.x.slice(-maxDataPoints)],
                        y: [trace.y.slice(-maxDataPoints)]
                    };
                    Plotly.update('graphCanvas', updateRange, {}, [traceIndex]);
                }
            });
        }
        
        // Auto-scroll x-axis to show only the most recent data - this ensures we see updates in real-time
        // Only do this if zoom scroll is not active and the graph is not manually zoomed
        if (!isZoomScrollActive && !isZoomed) {
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
                    
                    // If showing full history, keep the entire graph visible initially
                    if (showingFullHistory) {
                        const minX = Math.min(...timeValues);
                        Plotly.relayout('graphCanvas', {
                            'xaxis.range': [minX, maxX],
                            'xaxis.autorange': false
                        });
                    } else {
                        // Show the last 5 seconds of data (or less if we don't have that much)
                        const minX = Math.max(maxX - 5, Math.min(...timeValues));  // 5 seconds window
                        
                        Plotly.relayout('graphCanvas', {
                            'xaxis.range': [minX, maxX],
                            'xaxis.autorange': false
                        });
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error updating graph with live data:', error);
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
    
    // Extract table and field name from the full field name
    const [tableName, fieldName] = field.split('.');
    
    // Create an empty trace as a placeholder with connect gaps disabled
    const newTrace = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: field,
        connectgaps: false // Don't connect gaps in the data
    };
    
    // Add the new trace to the plot
    Plotly.addTraces('graphCanvas', newTrace);
    const newTraceIndex = graphDiv.data.length - 1;
    
    // Fetch historical data for this field if possible and if not already showing full history
    if (tableName && fieldName && !showingFullHistory) {
        console.log(`Fetching historical data for ${tableName}.${fieldName}`);
        
        // Use a setTimeout to not block the UI
        setTimeout(async () => {
            try {
                const historyData = await fetchFieldData(tableName, [fieldName]);
                
                if (historyData && historyData.length > 0) {
                    console.log(`Adding ${historyData.length} historical points for ${field}`);
                    
                    // Extract timestamps and values
                    const timestamps = historyData.map(item => msToSeconds(item.timestamp));  // Convert to seconds
                    const values = historyData.map(item => item[fieldName] || 0);
                    
                    // Add historical data to the trace
                    Plotly.extendTraces('graphCanvas', {
                        x: [timestamps],
                        y: [values]
                    }, [newTraceIndex]);
                    
                    // Preserve zoom if needed
                    if (isZoomed) {
                        Plotly.relayout('graphCanvas', {
                            'xaxis.range': [zoomStartValue, zoomEndValue],
                            'xaxis.autorange': false
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching historical data for ${field}:`, error);
            }
        }, 10);
    }
    
    // Return the index of the newly added trace
    return newTraceIndex;
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
            name: 'No data selected',
            connectgaps: false
        }
    ] : checkedCheckboxes.map(checkbox => ({
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'hv' },
        name: checkbox.dataset.fullField,
        connectgaps: false
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
            title: 'Time (seconds)',  // Changed to seconds
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
                
                // If we now have 2 fields, reset and show full history
                if (selectedFields.length === 2) {
                    await resetAndShowFullHistory();
                    return; // Skip the normal graph update since resetAndShowFullHistory does it
                }
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
        
        // If we're in full history mode but now have less than 2 fields, exit that mode
        if (showingFullHistory && selectedFields.length < 2) {
            showingFullHistory = false;
        }
        
        // If no fields left, clear selected table
        if (selectedFields.length === 0) {
            selectedTable = '';
            showingFullHistory = false;
        }
    }
    
    console.log('Selected table:', selectedTable, 'Selected fields:', selectedFields, 'Full history:', showingFullHistory);
    
    // Only update the graph if we have selected fields from a table
    if (selectedFields.length > 0 && selectedTable) {
        try {
            // If we're in full history mode or if we've just selected a new field in full history mode,
            // keep showing full history
            if (showingFullHistory) {
                await resetAndShowFullHistory();
            } else {
                // Regular graph update with normal data
                const data = await fetchFieldData(selectedTable, selectedFields);
                processAndDisplayData(data);
            }
        } catch (error) {
            console.error('Error fetching selected field data:', error);
        }
    } else {
        // If no fields selected, show empty graph
        renderEmptyGraph();
    }
}, 300);

// Function to thin out dense datasets to improve visualization performance
const thinOutData = (data, maxPoints = 500) => {
    if (!data || data.length <= maxPoints) return data;
    
    console.log(`Thinning data from ${data.length} points to ~${maxPoints} points`);
    
    // Calculate the step size to get approximately maxPoints
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    
    // Create a new array with thinned data
    // Always keep the first and last points
    const thinnedData = [data[0]];
    
    // Add points at regular intervals
    for (let i = step; i < data.length - step; i += step) {
        thinnedData.push(data[i]);
    }
    
    // Always add the last point
    thinnedData.push(data[data.length - 1]);
    
    console.log(`Thinned to ${thinnedData.length} points`);
    return thinnedData;
};

// Function to reset and display all historical data when multiple fields are selected
const resetAndShowFullHistory = async () => {
    if (!selectedTable || selectedFields.length < 2) {
        return; // Only proceed if we have multiple fields from the same table
    }
    
    console.log('Resetting graph and showing full historical data for:', selectedFields);
    
    try {
        showingFullHistory = true;
        
        // Find the current maximum timestamp to know how far to load history
        // We'll use this to filter the data to only show points up to now
        currentMaxTimestamp = 0;
        
        // Try to get the latest timestamp from the database as our boundary
        try {
            const latestResponse = await fetch('/get_latest_message');
            const latestData = await latestResponse.json();
            
            if (latestData.messages && latestData.messages.length > 0) {
                // Find the latest timestamp for our selected table
                const tableMessage = latestData.messages.find(msg => msg.table_name === selectedTable);
                if (tableMessage) {
                    currentMaxTimestamp = tableMessage.timestamp;
                    console.log(`Using latest timestamp as boundary: ${currentMaxTimestamp} (${new Date(currentMaxTimestamp).toISOString()})`);
                }
            }
        } catch (error) {
            console.error('Error getting latest timestamp:', error);
            // If we can't get the latest timestamp, we'll use the current time
            currentMaxTimestamp = Date.now();
        }
        
        // Fetch all historical data without limits
        const data = await fetchFieldData(selectedTable, selectedFields, true);
        
        if (!data || data.length === 0) {
            console.log('No historical data available');
            showingFullHistory = false;
            return;
        }
        
        // Filter data to only include points up to our current max timestamp
        const filteredData = data.filter(point => point.timestamp <= currentMaxTimestamp);
        
        // Thin out the data to improve visualization performance
        const thinnedData = thinOutData(filteredData, 1000);
        
        console.log(`Plotting ${thinnedData.length} historical data points out of ${data.length} total points (up to timestamp ${currentMaxTimestamp})`);
        initialHistoricalDataCount = thinnedData.length; // Store the count for reference
        
        // Create a fresh plot with the filtered historical data
        processAndDisplayData(thinnedData);
        
        // After loading all historical data, we'll continue to get live updates
        // but we'll limit the new points to avoid overwhelming the browser
    } catch (error) {
        console.error('Error showing full historical data:', error);
        showingFullHistory = false;
    }
};

const processAndDisplayData = (data) => {
    if (!data || data.length === 0) {
        renderEmptyGraph();
        return;
    }
    
    // Thin out the data if it's too dense (only for non-live data)
    let processedData = data;
    if (data.length > 1000 && showingFullHistory) {
        processedData = thinOutData(data, 1000);
    }
    
    // Extract timestamps
    const timestamps = processedData.map(item => item.timestamp);
    
    // Create datasets for each selected field
    const datasets = selectedFields.map(field => {
        const values = processedData.map(item => item[field] || 0);
        
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
    // Convert the millisecond input values to seconds for the graph
    zoomStartValue = parseFloat(document.getElementById('zoomStart').value) / 1000;
    zoomEndValue = parseFloat(document.getElementById('zoomEnd').value) / 1000;

    // Check that the inputs are valid numbers and that start is less than end
    if (!isNaN(zoomStartValue) && !isNaN(zoomEndValue) && zoomStartValue < zoomEndValue) {
        Plotly.relayout('graphCanvas', {
            'xaxis.range': [zoomStartValue, zoomEndValue],
            'xaxis.autorange': false
        });
        isZoomed = true; // Set zoom state to true
        // Make sure zoom scroll is turned off when manually zooming
        isZoomScrollActive = false;
        // Update button state
        updateZoomScrollButtonState();
        console.log(`Zoom applied from ${zoomStartValue} to ${zoomEndValue} seconds`);
    } else {
        alert("Please enter valid start and end times where the start is less than the end.");
    }
});

// Event listener for the Reset Zoom button
document.getElementById('resetZoom').addEventListener('click', () => {
    // Reset x-axis to auto range so new data will be visible
    Plotly.relayout('graphCanvas', {'xaxis.autorange': true});
    isZoomed = false; // Reset zoom state
    isZoomScrollActive = false; // Turn off zoom scroll
    zoomStartValue = null; // Clear stored values
    zoomEndValue = null;
    zoomWindowSize = null;
    document.getElementById('zoomStart').value = "";
    document.getElementById('zoomEnd').value = "";
    
    // Reset the full history mode if appropriate
    if (selectedFields.length < 2) {
        showingFullHistory = false;
    }
    
    // Update button state
    updateZoomScrollButtonState();
    console.log("Zoom reset");
});

// Function to toggle zoom with scroll feature
const toggleZoomScroll = () => {
    // Get current start and end values from input fields
    const startInput = document.getElementById('zoomStart');
    const endInput = document.getElementById('zoomEnd');
    
    // Toggle zoom scroll state
    isZoomScrollActive = !isZoomScrollActive;
    
    if (isZoomScrollActive) {
        // Get start and end values from inputs (and convert to seconds)
        zoomStartValue = parseFloat(startInput.value) / 1000;
        zoomEndValue = parseFloat(endInput.value) / 1000;
        
        // Validate inputs
        if (isNaN(zoomStartValue) || isNaN(zoomEndValue) || zoomStartValue >= zoomEndValue) {
            alert("Please enter valid start and end times where the start is less than the end.");
            isZoomScrollActive = false;
            updateZoomScrollButtonState();
            return;
        }
        
        // Calculate window size for scrolling (in seconds)
        zoomWindowSize = zoomEndValue - zoomStartValue;
        
        // Set zoom state
        isZoomed = true;
        
        // Create an interval to gradually scroll the window
        if (!updateInterval) {
            // If no update interval exists, we need to create one
            updateInterval = setInterval(() => {
                fetchLatestMessages();
            }, updateFrequency);
        }
        
        console.log(`Zoom with scroll activated with window size: ${zoomWindowSize} seconds, step size: ${scrollStepSize/1000} seconds`);
    } else {
        console.log("Zoom with scroll deactivated");
        
        // Keep the current viewport when turning off scroll
        if (zoomStartValue !== null && zoomEndValue !== null) {
            Plotly.relayout('graphCanvas', {
                'xaxis.range': [zoomStartValue, zoomEndValue],
                'xaxis.autorange': false
            });
        }
    }
    
    // Update button state
    updateZoomScrollButtonState();
};

// Function to update the zoom scroll button text based on state
const updateZoomScrollButtonState = () => {
    const button = document.getElementById('zoomScrollButton');
    if (isZoomScrollActive) {
        button.textContent = "Stop Zoom Scroll";
        button.classList.remove('btn-primary');
        button.classList.add('btn-danger');
    } else {
        button.textContent = "Zoom With Scroll";
        button.classList.remove('btn-danger');
        button.classList.add('btn-primary');
    }
};

// Event listener for the Zoom With Scroll button
document.getElementById('zoomScrollButton').addEventListener('click', toggleZoomScroll);

// Add a scroll step size control to the UI
document.addEventListener('DOMContentLoaded', () => {
    // Add to initialize function
    const oldInitialize = initialize;
    initialize = async () => {
        await oldInitialize();
        
        // Add step size control after the existing zoom controls
        const zoomCard = document.getElementById('applyZoom').closest('.card-body');
        if (zoomCard) {
            const stepSizeGroup = document.createElement('div');
            stepSizeGroup.className = 'form-group mt-2';
            stepSizeGroup.innerHTML = `
                <label for="scrollStepSize">Scroll Step Size (ms):</label>
                <input type="number" id="scrollStepSize" class="form-control" value="${scrollStepSize}" min="10" max="1000">
            `;
            zoomCard.insertBefore(stepSizeGroup, document.getElementById('resetZoom'));
            
            // Add event listener for step size change
            document.getElementById('scrollStepSize').addEventListener('change', (e) => {
                const newStepSize = parseInt(e.target.value, 10);
                if (!isNaN(newStepSize) && newStepSize >= 10) {
                    scrollStepSize = newStepSize;
                    console.log(`Scroll step size updated to ${scrollStepSize}ms`);
                }
            });
        }
    };
});

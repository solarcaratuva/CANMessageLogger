// Initialize socket connection
const socket = io();

// Store active signals and their data
const activeSignals = new Map();

// Initialize Plotly graph
const graphDiv = document.getElementById('graph');
const layout = {
    title: 'CAN Signal Data',
    xaxis: {
        title: 'Time',
        type: 'date',
        rangeslider: {},
    },
    yaxis: {
        title: 'Value',
    },
    showlegend: true,
};

Plotly.newPlot(graphDiv, [], layout);

// Handle zoom and pan events
graphDiv.on('plotly_relayout', function(eventdata) {
    if (eventdata['xaxis.range[0]'] && eventdata['xaxis.range[1]']) {
        const startTime = new Date(eventdata['xaxis.range[0]']).getTime();
        const endTime = new Date(eventdata['xaxis.range[1]']).getTime();
        
        // Calculate zoom level based on time range
        const timeRange = endTime - startTime;
        const zoomLevel = Math.max(1, Math.min(10, Math.floor(1000000 / timeRange)));
        
        // Request new data for each active signal
        activeSignals.forEach((signalData, signalId) => {
            requestDataRange(signalId, startTime, endTime, zoomLevel);
        });
    }
});

// Function to request data for a specific range
function requestDataRange(signalId, startTime, endTime, zoomLevel) {
    socket.emit('request_data_range', {
        signal_id: signalId,
        start_time: startTime,
        end_time: endTime,
        zoom_level: zoomLevel
    });
}

// Handle data updates from server
socket.on('data_range_update', function(data) {
    const signalId = data.signal_id;
    const signalData = activeSignals.get(signalId);
    
    if (!signalData) return;
    
    // Update the trace with new data
    const trace = {
        x: data.data.map(d => new Date(d.timestamp)),
        y: data.data.map(d => d.value),
        type: 'scatter',
        mode: 'lines',
        name: signalData.name,
        line: { color: signalData.color }
    };
    
    // Update the plot
    Plotly.update(graphDiv, {
        x: [trace.x],
        y: [trace.y]
    }, {}, [signalData.traceIndex]);
});

// Handle errors
socket.on('data_range_error', function(data) {
    console.error('Error fetching data:', data.message);
});

// Function to add a new signal to the graph
function addSignal(signalId, signalName, color) {
    if (activeSignals.has(signalId)) return;
    
    // Add empty trace
    const trace = {
        x: [],
        y: [],
        type: 'scatter',
        mode: 'lines',
        name: signalName,
        line: { color: color }
    };
    
    Plotly.addTraces(graphDiv, trace);
    const traceIndex = graphDiv.data.length - 1;
    
    // Store signal info
    activeSignals.set(signalId, {
        name: signalName,
        color: color,
        traceIndex: traceIndex
    });
    
    // Get initial data
    const currentRange = graphDiv.layout.xaxis.range;
    if (currentRange) {
        const startTime = new Date(currentRange[0]).getTime();
        const endTime = new Date(currentRange[1]).getTime();
        requestDataRange(signalId, startTime, endTime, 1);
    }
}

// Function to remove a signal from the graph
function removeSignal(signalId) {
    const signalData = activeSignals.get(signalId);
    if (!signalData) return;
    
    Plotly.deleteTraces(graphDiv, signalData.traceIndex);
    activeSignals.delete(signalId);
}

// Export functions for use in other files
window.graphView = {
    addSignal,
    removeSignal
}; 
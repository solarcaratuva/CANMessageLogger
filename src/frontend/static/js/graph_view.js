// Initialize socket connection
const socket = io();

// Store active signals and their data
const activeSignals = new Map();
let globalRequestCounter = 0;

// Initialize Plotly graph
const graphDiv = document.getElementById('graph');
const layout = {
    title: 'CAN Signal Data',
    xaxis: {
        title: 'Time',
        type: 'date',
        rangeslider: { visible: false },
    },
    yaxis: {
        title: 'Value',
    },
    showlegend: true,
};

Plotly.newPlot(graphDiv, [], layout);

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle zoom and pan events (debounced)
graphDiv.on('plotly_relayout', debounce(function(eventdata) {
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
}, 200));

// Function to request data for a specific range with coalescing and requestId
function requestDataRange(signalId, startTime, endTime, zoomLevel) {
    const viewportWidth = Math.floor(graphDiv.clientWidth || graphDiv.getBoundingClientRect().width || 1200);
    const info = activeSignals.get(signalId);
    if (!info) return;

    const params = { startTime, endTime, zoomLevel, viewportWidth };

    if (info.inFlight) {
        info.pending = params; // coalesce to the latest
        return;
    }

    info.inFlight = true;
    const requestId = ++globalRequestCounter;
    info.lastRequestId = requestId;

    socket.emit('request_data_range', {
        signal_id: signalId,
        start_time: startTime,
        end_time: endTime,
        zoom_level: zoomLevel,
        viewport_width: viewportWidth,
        request_id: requestId
    });
}

function rebuildPlot() {
    const data = [];
    activeSignals.forEach((info) => {
        data.push({
            x: info.x || [],
            y: info.y || [],
            type: 'scattergl',
            mode: 'lines',
            name: info.name,
            line: { color: info.color }
        });
    });
    Plotly.react(graphDiv, data, layout);
}

// Handle data updates from server
socket.on('data_range_update', function(data) {
    const signalId = data.signal_id;
    const info = activeSignals.get(signalId);
    if (!info) return;

    // Drop stale responses
    if (typeof data.request_id === 'number' && typeof info.lastRequestId === 'number' && data.request_id < info.lastRequestId) {
        return;
    }

    // Expect compact arrays: x (timestamps as numbers), y (values)
    const x = Array.isArray(data.x) ? data.x : [];
    const y = Array.isArray(data.y) ? data.y : [];

    info.x = x;
    info.y = y;

    rebuildPlot();

    // Mark request complete and send any pending
    info.inFlight = false;
    if (info.pending) {
        const { startTime, endTime, zoomLevel, viewportWidth } = info.pending;
        info.pending = null;
        // Immediately send the latest pending request
        const requestId = ++globalRequestCounter;
        info.lastRequestId = requestId;
        socket.emit('request_data_range', {
            signal_id: signalId,
            start_time: startTime,
            end_time: endTime,
            zoom_level: zoomLevel,
            viewport_width: viewportWidth,
            request_id: requestId
        });
        info.inFlight = true;
    }
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
        type: 'scattergl',
        mode: 'lines',
        name: signalName,
        line: { color: color }
    };
    
    // Store signal info
    activeSignals.set(signalId, {
        name: signalName,
        color: color,
        x: [],
        y: [],
        inFlight: false,
        pending: null,
        lastRequestId: 0
    });

    // Build or update the plot using react
    rebuildPlot();
    
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
    
    activeSignals.delete(signalId);
    rebuildPlot();
}

// Export functions for use in other files
window.graphView = {
    addSignal,
    removeSignal
}; 